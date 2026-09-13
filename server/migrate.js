/* Applies the schema and, on an empty registry, loads the 14 seeded doctors.
   Safe to run on every boot: the schema is CREATE IF NOT EXISTS and the seed
   only fires when the table is empty. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from './db.js';
import { toRow, INSERT_SQL } from './record.js';
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

export async function migrate(){
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await seedAdmin();

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
