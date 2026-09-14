/* Applies the schema and, on an empty registry, loads the 14 seeded doctors.
   Safe to run on every boot: the schema is CREATE IF NOT EXISTS and the seed
   only fires when the table is empty. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from './db.js';
import { toRow, INSERT_SQL } from './record.js';
import { createHash } from 'node:crypto';
import { hashPassword, generatePassword } from './auth.js';
import { seed } from '../src/lib/seed.js';

const here = dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admitting@nairobihospital.org';
const ADMIN_NAME  = process.env.SEED_ADMIN_NAME  || 'Registry Admin';

/* Creates the bootstrap account only when there are no users at all. The
   password comes from SEED_ADMIN_PASSWORD; without one a random password is
   generated and printed once to the service log. Either way the account is
   flagged to force a change at first sign-in. */
async function seedAdmin(){
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if(rows[0].n > 0){
    console.log('Registry already has '+rows[0].n+' user(s) — skipping admin seed.');
    return;
  }

  const supplied = process.env.SEED_ADMIN_PASSWORD;
  const password = supplied || generatePassword();

  await pool.query(
    `INSERT INTO users (id, email, name, role, password_hash, must_change_password)
     VALUES ($1, $2, $3, $4, $5, TRUE)`,
    ['u'+Math.random().toString(36).slice(2,9), ADMIN_EMAIL, ADMIN_NAME,
     'Admitting Office · Medical Administration', await hashPassword(password)]
  );

  console.log('Created the bootstrap account: '+ADMIN_EMAIL);
  if(supplied) console.log('Password taken from SEED_ADMIN_PASSWORD. It must be changed at first sign-in.');
  else console.log('Generated one-time password: '+password+'  — change it at first sign-in.');
}

/* Recovery hatch for a bootstrap password that was never captured. The seed
   above only fires on an empty users table, so once the registry is live there
   is otherwise no way back in without database access — and on a free plan the
   database may not accept external connections at all.

   Set ADMIN_PASSWORD_RESET=true together with SEED_ADMIN_PASSWORD and the
   account is put back to a known password on the next boot.

   It fires ONCE per distinct password. An earlier version reset on every boot
   for as long as the flag was set, which quietly undid the password the user
   then chose: a free instance sleeps and cold-starts on the next request, so
   migrate() runs far more often than a deploy and every run wound the account
   back. A marker in registry_meta records which password has been applied, so
   a restart is now a no-op. Changing SEED_ADMIN_PASSWORD to a new value arms
   it again, which is the one case where repeating is what was asked for.

   Remove both variables once you are in regardless — a live password should
   not sit in the service environment. */
async function resetAdmin(){
  if(process.env.ADMIN_PASSWORD_RESET !== 'true') return;

  const password = process.env.SEED_ADMIN_PASSWORD;
  if(!password){
    console.warn('ADMIN_PASSWORD_RESET is set but SEED_ADMIN_PASSWORD is empty — nothing to reset.');
    return;
  }

  /* Keyed on the password, never storing it: a marker that changes when the
     variable changes, and reveals nothing if the table is read. */
  const marker = createHash('sha256').update('admin-reset:'+password).digest('hex');
  const seen = await pool.query(`SELECT value FROM registry_meta WHERE key = 'admin_password_reset'`);
  if(seen.rows.length && seen.rows[0].value === marker){
    console.log('ADMIN_PASSWORD_RESET: this password has already been applied — skipping.');
    console.log('Remove ADMIN_PASSWORD_RESET and SEED_ADMIN_PASSWORD from the environment.');
    return;
  }

  const { rows } = await pool.query('SELECT id, email FROM users ORDER BY created_at');
  if(!rows.length){
    console.warn('ADMIN_PASSWORD_RESET is set but there are no users — the seed above handles a fresh registry.');
    return;
  }

  /* With a single account the address is unambiguous, so SEED_ADMIN_EMAIL can
     also correct it — that is the case where the sign-in address itself has
     been lost. With several, guessing which one to take over would be wrong:
     SEED_ADMIN_EMAIL must name an existing row and only the password moves. */
  let target;
  if(rows.length === 1){
    target = rows[0];
    const wanted = process.env.SEED_ADMIN_EMAIL;
    if(wanted && wanted.toLowerCase() !== target.email.toLowerCase()){
      await pool.query('UPDATE users SET email = $2 WHERE id = $1', [target.id, wanted]);
      console.log('Reset: moved the account from '+target.email+' to '+wanted+'.');
      target = { ...target, email: wanted };
    }
  } else {
    const wanted = String(process.env.SEED_ADMIN_EMAIL || '').toLowerCase();
    target = rows.find(r => r.email.toLowerCase() === wanted);
    if(!target){
      console.warn('ADMIN_PASSWORD_RESET is set but SEED_ADMIN_EMAIL does not match any of the '+
                   rows.length+' accounts — refusing to guess. No password was changed.');
      return;
    }
  }

  await pool.query(
    'UPDATE users SET password_hash = $2, must_change_password = TRUE WHERE id = $1',
    [target.id, await hashPassword(password)]
  );
  /* Matches what a normal password change does: every existing session ends. */
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [target.id]);

  /* Written only after the reset succeeds, so a failure part-way leaves it
     armed rather than marking work that never happened. */
  await pool.query(
    `INSERT INTO registry_meta (key, value) VALUES ('admin_password_reset', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [marker]
  );

  console.log('Reset the password for '+target.email+'. It must be changed at first sign-in.');
  console.log('This will not repeat on restart. Remove ADMIN_PASSWORD_RESET and SEED_ADMIN_PASSWORD now.');
}

export async function migrate(){
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await seedAdmin();
  await resetAdmin();

  const { rows } = await pool.query('SELECT count(*)::int AS n FROM doctors');
  if(rows[0].n > 0){
    console.log('Registry already holds '+rows[0].n+' doctors — skipping seed.');
    return { seeded: 0, existing: rows[0].n };
  }

  const records = seed();
  await withTransaction(async (client) => {
    for(const rec of records){
      await client.query(INSERT_SQL.insert, toRow(rec));
    }
    await client.query(
      `INSERT INTO registry_meta (key, value) VALUES ('last_synced_kmpdc', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [new Date().toISOString()]
    );
  });

  console.log('Seeded '+records.length+' doctors.');
  return { seeded: records.length, existing: 0 };
}

/* `npm run migrate` runs this file directly. */
if(process.argv[1] && process.argv[1].endsWith('migrate.js')){
  migrate()
    .then(() => pool.end())
    .catch(e => { console.error(e); process.exit(1); });
}
