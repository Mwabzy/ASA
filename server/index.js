/* Admitting Rights Registry — API + static host.
   Serves the built client and the /api the client talks to. */
import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { query, withTransaction, pool } from './db.js';
import { fromRow, toRow, toUpdateParams, INSERT_SQL } from './record.js';
import { migrate } from './migrate.js';
import {
  hashPassword, verifyPassword, createSession, destroySession, pruneSessions,
  readCookie, setSessionCookie, clearSessionCookie, SESSION_COOKIE,
  attachUser, requireUser, requireActiveUser, throttleCheck, throttleFail, throttleReset, sessionTokenHash
} from './auth.js';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');
const PORT = process.env.PORT || 3001;

const app = express();
app.set('trust proxy', 1);   /* Render terminates TLS at its proxy. */
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '2mb' }));

/* ---------- helpers ---------- */

const SELECT_ALL = 'SELECT * FROM doctors';

function fail(res, status, message){
  return res.status(status).json({ error: message });
}

/* An import or registration must carry at least an id and a registration
   number; everything else is defaulted by the schema. */
function assertRecord(rec){
  if(!rec || typeof rec !== 'object') return 'Expected a doctor record.';
  if(!rec.regNo) return 'A registration number is required.';
  return null;
}

const wrap = (fn) => (req, res) => fn(req, res).catch(err => {
  console.error(req.method+' '+req.path+' failed:', err);
  if(err && err.code === '23505') return fail(res, 409, 'A doctor with that registration number already exists.');
  fail(res, 500, 'The registry service hit an unexpected error.');
});

/* ---------- routes ---------- */

app.get('/api/health', wrap(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
}));

/* ---------- authentication ----------
   Everything below /api except health and login needs a session. */

const publicUser = (u) => ({
  name: u.name,
  email: u.email,
  role: u.role,
  initials: String(u.name||'?').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase(),
  mustChangePassword: !!u.must_change_password
});

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if(!email || !password) return fail(res, 400, 'Enter your email and password.');

  const gate = throttleCheck(email);
  if(!gate.ok){
    return fail(res, 429, 'Too many failed attempts. Try again in '+gate.mins+' minute'+(gate.mins===1?'':'s')+'.');
  }

  const { rows } = await query(
    'SELECT id, email, name, role, password_hash, must_change_password FROM users WHERE lower(email) = $1',
    [email]
  );

  /* One message for a bad email and a bad password alike, so the response
     cannot be used to enumerate who has an account. */
  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.password_hash) : false;
  if(!ok){
    throttleFail(email);
    return fail(res, 401, 'That email and password do not match.');
  }

  throttleReset(email);
  const { token, expires } = await createSession(user.id);
  setSessionCookie(req, res, token, expires);
  await query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  res.json({ user: publicUser(user) });
}));

app.post('/api/auth/logout', wrap(async (req, res) => {
  await destroySession(readCookie(req, SESSION_COOKIE));
  clearSessionCookie(req, res);
  res.status(204).end();
}));

app.use('/api', attachUser);

app.get('/api/auth/me', (req, res) => {
  if(!req.user) return fail(res, 401, 'Not signed in.');
  res.json({ user: publicUser(req.user) });
});

app.post('/api/auth/password', requireUser, wrap(async (req, res) => {
  const current = String((req.body && req.body.currentPassword) || '');
  const next = String((req.body && req.body.newPassword) || '');
  if(next.length < 12) return fail(res, 400, 'Choose a password of at least 12 characters.');

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if(!rows.length || !(await verifyPassword(current, rows[0].password_hash))){
    return fail(res, 401, 'Your current password is not correct.');
  }

  await query(
    'UPDATE users SET password_hash = $2, must_change_password = FALSE WHERE id = $1',
    [req.user.id, await hashPassword(next)]
  );
  /* Changing a password ends every other session for that user. */
  await query(
    'DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2',
    [req.user.id, sessionTokenHash(readCookie(req, SESSION_COOKIE) || '')]
  );
  res.json({ ok: true });
}));

/* From here on a session is required. The one exception is POST /api/doctors,
   the public application form, so /api/doctors is gated per-route rather than
   with a blanket mount. */
app.use('/api/meta', requireActiveUser);

app.get('/api/meta', wrap(async (_req, res) => {
  const { rows } = await query(`SELECT value FROM registry_meta WHERE key = 'last_synced_kmpdc'`);
  res.json({
    lastSyncedKmpdc: rows.length ? rows[0].value : null,
    user: null
  });
}));

app.get('/api/doctors', requireActiveUser, wrap(async (_req, res) => {
  /* Sorting into expiry order is the client's job — the rule is computed,
     not stored, so it cannot be expressed as an ORDER BY here. */
  const { rows } = await query(SELECT_ALL+' ORDER BY created_at DESC');
  res.json(rows.map(fromRow));
}));

/* Public. This is the admitting-rights application the doctor fills in
   themselves; it is the only write on the registry that does not need a
   session. Reading the register still does. */
app.post('/api/doctors', wrap(async (req, res) => {
  const bad = assertRecord(req.body);
  if(bad) return fail(res, 400, bad);

  const rec = { ...req.body, createdAt: req.body.createdAt || Date.now() };
  const { rows } = await query(INSERT_SQL.insert, toRow(rec));
  res.status(201).json(fromRow(rows[0]));
}));

app.put('/api/doctors/:id', requireActiveUser, wrap(async (req, res) => {
  const bad = assertRecord(req.body);
  if(bad) return fail(res, 400, bad);

  const { rows } = await query(INSERT_SQL.update, toUpdateParams(req.params.id, req.body));
  if(!rows.length) return fail(res, 404, 'No doctor with that id is on the registry.');
  res.json(fromRow(rows[0]));
}));

/* Bulk import. Each row carries the caller's duplicate decision; a row marked
   "skip" that already exists is left alone, "overwrite" replaces it in place.
   The whole batch commits or none of it does. */
app.post('/api/doctors/bulk', requireActiveUser, wrap(async (req, res) => {
  const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : null;
  if(!rows) return fail(res, 400, 'Expected a rows array.');
  if(rows.length > 5000) return fail(res, 413, 'That file is too large to import in one go.');

  for(const r of rows){
    const bad = assertRecord(r && r.rec);
    if(bad) return fail(res, 400, bad);
  }

  const summary = await withTransaction(async (client) => {
    let imported = 0, overwritten = 0, skipped = 0;
    const ids = [];

    for(const row of rows){
      const choice = row.choice || 'skip';

      if(row.dup){
        if(choice === 'skip'){ skipped++; continue; }
        const existing = await client.query('SELECT id, created_at FROM doctors WHERE reg_no = $1', [row.rec.regNo]);
        if(existing.rows.length){
          const id = existing.rows[0].id;
          await client.query(INSERT_SQL.update, toUpdateParams(id, { ...row.rec, id }));
          ids.push(id);
          overwritten++;
          continue;
        }
      }

      const id = 'd'+Math.random().toString(36).slice(2,9);
      const rec = { ...row.rec, id, createdAt: Date.now() };
      const inserted = await client.query(INSERT_SQL.upsertByRegNo, toRow(rec));
      ids.push(inserted.rows[0].id);
      imported++;
    }

    return { imported, overwritten, skipped, ids };
  });

  const { rows: all } = await query(SELECT_ALL+' ORDER BY created_at DESC');
  res.json({ summary, doctors: all.map(fromRow) });
}));

app.use('/api', (_req, res) => fail(res, 404, 'No such endpoint.'));

/* ---------- static client ---------- */

if(existsSync(dist)){
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/.*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
} else {
  app.get(/.*/, (_req, res) =>
    res.status(503).send('The client has not been built yet. Run `npm run build`.'));
}

/* ---------- boot ---------- */

migrate()
  .then(() => pruneSessions())
  .then(() => {
    /* Expired sessions are dead weight; clear them out daily. */
    setInterval(() => pruneSessions().catch(e => console.error('Session prune failed:', e)), 864e5).unref();
    app.listen(PORT, () => console.log('Admitting Rights Registry listening on :'+PORT));
  })
  .catch(err => {
    console.error('Migration failed — refusing to start:', err);
    process.exit(1);
  });

for(const sig of ['SIGTERM','SIGINT']){
  process.on(sig, () => { pool.end().finally(() => process.exit(0)); });
}
