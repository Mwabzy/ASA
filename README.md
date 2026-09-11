# ASA — Doctor Registry (showcase demo)

Open `index.html` in a browser. No build, no server, no install.

Three files: `index.html`, `styles.css`, `app.js`.

---

## What to show

**Apply** — the admitting-rights questionnaire as a guided wizard.
The first question splits the flow: a **new applicant** walks 15 steps (particulars,
consulting rooms, training years, referees, hospitals, declaration); an **existing
doctor** walks 7 (identity, office, practice, compliance, membership, documents,
review). Every step validates before it lets you past, and the review screen has an
*Edit* link per section that jumps back to the right field.

Nice beats to demo:
- Type `0712345678` in Contact, tab out → reformats to `+254 712 345 678`.
- Type `a7392` in Registration number → uppercases to `A7392` as you type.
- Enter a KMPDC issue date → the expiry is computed and shown inline, and a status
  card appears with the mascot reacting to whether the doctor is compliant.
- Attach a file → it lists with a working **View** link.

**Registry** — 14 seeded doctors plus anything you register.
KPIs count up, the list sorts by soonest expiry, and the filters stack
(status lens × category × division). Click a row for the detail sheet: a timeline
per status showing where today sits between issue and expiry. `Esc` closes it,
or drag the handle down.

**Import** — a four-stage CSV pipeline: drop → map → validate → commit.
Click **Load sample data** for a six-row file that exercises everything:
- columns are auto-matched by fuzzy header name (16 of 17 in the sample),
- two rows are deliberately broken and land in *needs attention*, editable inline,
- one row duplicates a doctor already on the registry, so you choose skip or overwrite,
- the file's own `Status` column is **ignored** — status is always recomputed from
  the dates, so a stale spreadsheet cannot mark a lapsed doctor as active.

Result: 4 ready, 2 attention, 1 duplicate → 3 imported, 1 overwritten, 2 skipped.

---

## The two status rules

These are the whole point of the registry, and they are computed, never stored:

| | Rule | Active while |
|---|---|---|
| **KMPDC licence** | expires 31 Dec of the year *after* issue | today ≤ 31 Dec (issue year + 1) |
| **Indemnity insurance** | runs 12 months from the start date | today < start + 12 months |

A blank date reads **Not recorded** rather than Inactive. A status inside 60 days of
expiry shows amber and breathes. Both rules are verified against the source workbook
formulas, including the edge cases (the insurance anniversary day itself is already
lapsed; a 29 Feb start clamps to 28 Feb).

---

## Data

Doctors persist to `localStorage` under `asa.doctors.v1`, seeded with 14 records on
first run. **Reset demo** on the Registry screen restores the seed — use it between
runs so the demo always starts from the same place.

Attachments live in memory for the session only (the *View* links stop working after
a reload); nothing is uploaded anywhere.

---

## Divisions

A doctor belongs to one of five ASA divisions — Surgery, Medicine, Paediatrics,
Obs & Gynae, Anaesthesia. Category narrows the list (a Surgeon sees Surgery and
Obs & Gynae). Sub-speciality is free text with suggestions per division.
Imported rows whose division is not one of the five are rejected with a clear reason.
