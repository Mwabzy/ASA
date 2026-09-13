/* Applies the schema and, on an empty registry, loads the 14 seeded doctors.
   Safe to run on every boot: the schema is CREATE IF NOT EXISTS and the seed
   only fires when the table is empty. */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, withTransaction } from './db.js';
import { toRow, INSERT_SQL } from './record.js';
import { seed } from '../src/lib/seed.js';

const here = dirname(fileURLToPath(import.meta.url));

export async function migrate(){
  const sql = await readFile(join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);

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
