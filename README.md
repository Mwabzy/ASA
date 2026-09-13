# Admitting Rights Registry — The Nairobi Hospital

Internal system for the Admitting Office. Holds the admitting-rights record for
every admitting specialist, and reports KMPDC licence and indemnity insurance
status against the two rules below.

React + Vite + Tailwind on the front, Express + Postgres behind it, both served
from one Node process.

```
npm install
cp .env.example .env      # point DATABASE_URL at a Postgres
npm run dev               # client on :5173, API on :3001
```

`npm run dev` runs the Vite dev server and the API together; Vite proxies
`/api` through to the API. For a production-shaped run: `npm run build && npm start`.

---

## The two status rules

These are the whole point of the registry, and they are **computed on every
read, never stored**:

| | Rule | Active while |
|---|---|---|
| **KMPDC licence** | expires 31 Dec of the year *after* issue | today ≤ 31 Dec (issue year + 1) |
| **Indemnity insurance** | runs 12 months from the start date | today < start + 12 months |

A blank date reads **Not recorded** rather than Inactive. A status inside 60
days of expiry shows amber and breathes. The edge cases are held to
deliberately: the insurance anniversary day itself is already lapsed, and a
29 Feb start clamps to 28 Feb.

Because status is derived, a stale spreadsheet cannot mark a lapsed doctor as
active — see Import below.

---

## Screens

**Apply** — the admitting-rights questionnaire as a guided wizard. The first
question splits the flow: a **new applicant** walks 15 steps (particulars,
consulting rooms, training years, referees, hospitals, declaration); an
**existing doctor** walks 7 (identity, office, practice, compliance,
membership, documents, review). Every step validates before it lets you past,
and the review screen has an *Edit* link per section that jumps back to the
right field.

- Type `0712345678` in Contact, tab out → reformats to `+254 712 345 678`.
- Type `a7392` in Registration number → uppercases to `A7392` as you type.
- Enter a KMPDC issue date → the expiry is computed and shown inline, and a
  status card appears with the mascot reacting to whether the doctor is compliant.

**Registry** — every doctor on the register, sorted by soonest expiry. Search
by name or registration number, then stack the filters (status lens × category
× division). Cards paginate. Hovering a card reveals View and Edit; clicking
anywhere on it opens the detail drawer, which carries a timeline per status
showing where today sits between issue and expiry. `Esc` closes it.

**Import** — a four-stage CSV pipeline: drop → map → validate → commit.
**Load sample data** gives a six-row file that exercises everything:

- columns are auto-matched by fuzzy header name (16 of 17 in the sample),
- two rows are deliberately broken and land in *needs attention*, editable inline,
- one row duplicates a doctor already on the registry, so you choose skip or overwrite,
- the file's own `Status` column is **ignored** — status is always recomputed
  from the dates.

Result: 4 ready, 2 attention, 1 duplicate → 3 imported, 1 overwritten, 2 skipped.
The whole batch commits in one transaction, or none of it does.

---

## Data

Doctors live in Postgres. `server/schema.sql` is the schema; it is applied on
every boot (`CREATE ... IF NOT EXISTS`), and the 14 seed records load only when
the table is empty.

Dates are stored as ISO `YYYY-MM-DD` **text**, matching how the application
holds them, because a blank date is meaningful — it reads as *Not recorded*
rather than as an absent or zero date.

Attachments are listed by name and size only; the files themselves are held in
the browser for the session and are not uploaded anywhere.

### API

| | |
|---|---|
| `GET /api/health` | liveness, used by the Render health check |
| `GET /api/meta` | last KMPDC sync time |
| `GET /api/doctors` | every record |
| `POST /api/doctors` | register one |
| `PUT /api/doctors/:id` | update one |
| `POST /api/doctors/bulk` | commit an import batch, transactionally |

Expiry sorting is done client-side: the rule is computed rather than stored, so
it cannot be expressed as an `ORDER BY`.

---

## Divisions

A doctor belongs to one of five ASA divisions — Surgery, Medicine, Paediatrics,
Obs & Gynae, Anaesthesia. Category narrows the list (a Surgeon sees Surgery and
Obs & Gynae). Sub-speciality is free text with suggestions per division.
Imported rows whose division is not one of the five are rejected with a clear reason.

---

## Deploying

`render.yaml` is a Render Blueprint covering both the database and the web
service, with `DATABASE_URL` linked from the managed Postgres rather than
pasted in. Pushes to `main` auto-deploy.

## Brand

| | |
|---|---|
| Primary | red-900 `#7F1D1D` |
| Accent | yellow-600 `#CA8A04` (text: yellow-700 `#A16207`) |
| Headings | navy `#0A0A23` |
| Active | green `#16A34A` |
| Inactive | red `#DC2626` |
| Expiring | amber `#CA8A04` |

Green and red carry status and are used for nothing else. Tokens live in
`src/index.css` under `@theme`.
