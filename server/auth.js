/* Authentication: scrypt password hashing, server-side sessions, and the
   middleware that gates the registry API.

   Sessions are opaque random tokens. Only their SHA-256 is stored, so a leaked
   database cannot be replayed as a live session, and signing out actually
   revokes rather than just dropping a cookie. */
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { query } from './db.js';

const scrypt = promisify(_scrypt);

const KEYLEN = 64;
const COST = 16384;          /* scrypt N */
const SESSION_DAYS = 7;
const COOKIE = 'asa_session';

/* ---------- passwords ---------- */

export async function hashPassword(plain){
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(plain, salt, KEYLEN, { N: COST, r: 8, p: 1 });
  return 'scrypt$'+COST+'$'+salt+'$'+key.toString('hex');
}

export async function verifyPassword(plain, stored){
  try {
    const [scheme, cost, salt, hex] = String(stored).split('$');
    if(scheme !== 'scrypt') return false;
    const key = await scrypt(plain, salt, KEYLEN, { N: Number(cost), r: 8, p: 1 });
    const expected = Buffer.from(hex, 'hex');
    if(expected.length !== key.length) return false;
    return timingSafeEqual(key, expected);
  } catch (e) {
    return false;
  }
}

/* A readable but genuinely random bootstrap password. */
export function generatePassword(){
  const words = ['harbour','lantern','meridian','compass','thicket','quarry','beacon','aspen',
                 'cobalt','ember','fjord','granite','ivory','juniper','kestrel','larch'];
  const pick = () => words[randomBytes(1)[0] % words.length];
  const digits = String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4,'0');
  return pick()+'-'+pick()+'-'+digits;
}

/* ---------- sessions ---------- */

const sha = (t) => createHash('sha256').update(t).digest('hex');

/* Exposed so callers can address a specific session row without handling
   the raw token themselves. */
export const sessionTokenHash = sha;

export async function createSession(userId){
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS*864e5);
  await query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [sha(token), userId, expires]
  );
  return { token, expires };
}

export async function destroySession(token){
  if(!token) return;
  await query('DELETE FROM sessions WHERE token_hash = $1', [sha(token)]);
}

export async function userForToken(token){
  if(!token) return null;
  const { rows } = await query(
    `SELECT u.id, u.email, u.name, u.role, u.must_change_password
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha(token)]
  );
  return rows.length ? rows[0] : null;
}

/* Housekeeping — expired rows are dead weight, not a security hole. */
export async function pruneSessions(){
  await query('DELETE FROM sessions WHERE expires_at <= now()');
}

/* ---------- cookies ---------- */

export function readCookie(req, name){
  const raw = req.headers.cookie;
  if(!raw) return null;
  for(const part of raw.split(';')){
    const i = part.indexOf('=');
    if(i < 0) continue;
    if(part.slice(0,i).trim() === name) return decodeURIComponent(part.slice(i+1).trim());
  }
  return null;
}

/* Secure is taken from the request rather than NODE_ENV, so the flag is set
   whenever the connection actually is HTTPS — behind Render's TLS proxy this
   reads x-forwarded-proto — and left off for plain http on localhost, where a
   Secure cookie would simply be dropped. */
const isSecure = (req) => !!(req && req.secure);

export function setSessionCookie(req, res, token, expires){
  res.append('Set-Cookie',
    COOKIE+'='+encodeURIComponent(token)+
    '; Path=/; HttpOnly; SameSite=Lax; Expires='+expires.toUTCString()+
    (isSecure(req) ? '; Secure' : ''));
}

export function clearSessionCookie(req, res){
  res.append('Set-Cookie',
    COOKIE+'=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+
    (isSecure(req) ? '; Secure' : ''));
}

export const SESSION_COOKIE = COOKIE;

/* ---------- middleware ---------- */

export function attachUser(req, _res, next){
  userForToken(readCookie(req, COOKIE))
    .then(u => { req.user = u; next(); })
    .catch(next);
}

export function requireUser(req, res, next){
  if(!req.user) return res.status(401).json({ error: 'Sign in to use the registry.' });
  next();
}

/* Registry data additionally requires an account that is no longer on the
   password it was issued with. Without this the forced change would be a
   client-side screen only, and the bootstrap password on its own would read
   the whole registry straight off the API. */
export function requireActiveUser(req, res, next){
  if(!req.user) return res.status(401).json({ error: 'Sign in to use the registry.' });
  if(req.user.must_change_password){
    return res.status(403).json({ error: 'Set a new password before using the registry.' });
  }
  next();
}

/* ---------- brute-force damping ----------
   Per-identifier backoff held in memory. One instance, one registry — this is
   proportionate; move it to the database if the service is ever scaled out. */
const attempts = new Map();
const WINDOW = 15*60*1000;
const MAX_ATTEMPTS = 8;

export function throttleCheck(key){
  const rec = attempts.get(key);
  if(!rec) return { ok: true };
  if(Date.now() - rec.first > WINDOW){ attempts.delete(key); return { ok: true }; }
  if(rec.count >= MAX_ATTEMPTS){
    const mins = Math.ceil((WINDOW - (Date.now() - rec.first))/60000);
    return { ok: false, mins };
  }
  return { ok: true };
}

export function throttleFail(key){
  const rec = attempts.get(key);
  if(!rec || Date.now() - rec.first > WINDOW) attempts.set(key, { first: Date.now(), count: 1 });
  else rec.count++;
}

export function throttleReset(key){ attempts.delete(key); }
