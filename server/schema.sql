-- The Nairobi Hospital — Admitting Rights Registry
--
-- The data model is a direct carry-over from the original registry record.
-- Dates are held as ISO 'YYYY-MM-DD' TEXT exactly as the application holds
-- them, because a blank date is meaningful: it reads as "Not recorded"
-- rather than as an absent or zero date.
--
-- Status is NEVER stored. KMPDC and indemnity status are computed from these
-- dates on every read, so a stale row cannot report a lapsed doctor as active.

CREATE TABLE IF NOT EXISTS doctors (
  id                   TEXT PRIMARY KEY,
  applicant_type       TEXT    NOT NULL DEFAULT 'existing',

  salutation           TEXT    NOT NULL DEFAULT '',
  surname              TEXT    NOT NULL DEFAULT '',
  forenames            TEXT    NOT NULL DEFAULT '',
  full_names           TEXT    NOT NULL DEFAULT '',
  dob                  TEXT    NOT NULL DEFAULT '',
  place_of_birth       TEXT    NOT NULL DEFAULT '',
  nationality          TEXT    NOT NULL DEFAULT '',

  telephone            TEXT    NOT NULL DEFAULT '',
  contact              TEXT    NOT NULL DEFAULT '',
  alt_mobile           TEXT    NOT NULL DEFAULT '',
  email                TEXT    NOT NULL DEFAULT '',

  po_box               TEXT    NOT NULL DEFAULT '',
  town                 TEXT    NOT NULL DEFAULT '',
  address              TEXT    NOT NULL DEFAULT '',

  reg_no               TEXT    NOT NULL,
  quals                JSONB   NOT NULL DEFAULT '[]'::jsonb,
  category             TEXT    NOT NULL DEFAULT '',
  category_other       TEXT    NOT NULL DEFAULT '',
  speciality           TEXT    NOT NULL DEFAULT '',
  sub_speciality       TEXT    NOT NULL DEFAULT '',

  year_mbchb           TEXT    NOT NULL DEFAULT '',
  year_mmed            TEXT    NOT NULL DEFAULT '',
  year_registration    TEXT    NOT NULL DEFAULT '',
  year_recognition     TEXT    NOT NULL DEFAULT '',

  indemnity_details    TEXT    NOT NULL DEFAULT '',
  practice_licence_no  TEXT    NOT NULL DEFAULT '',
  insurance_from       TEXT    NOT NULL DEFAULT '',   -- blank = Not recorded
  kmpdc_issue          TEXT    NOT NULL DEFAULT '',   -- blank = Not recorded

  ref1                 TEXT    NOT NULL DEFAULT '',
  ref2                 TEXT    NOT NULL DEFAULT '',
  ref3                 TEXT    NOT NULL DEFAULT '',
  hosp1                TEXT    NOT NULL DEFAULT '',
  hosp2                TEXT    NOT NULL DEFAULT '',
  hosp3                TEXT    NOT NULL DEFAULT '',
  hosp4                TEXT    NOT NULL DEFAULT '',

  assoc_category       TEXT    NOT NULL DEFAULT '',
  admission_year       TEXT    NOT NULL DEFAULT '',
  kha_ack              BOOLEAN NOT NULL DEFAULT FALSE,

  doc_insurance        JSONB   NOT NULL DEFAULT '[]'::jsonb,
  doc_licence          JSONB   NOT NULL DEFAULT '[]'::jsonb,
  doc_courses          JSONB   NOT NULL DEFAULT '[]'::jsonb,
  doc_cv               JSONB   NOT NULL DEFAULT '[]'::jsonb,

  signed_by            TEXT    NOT NULL DEFAULT '',
  signed_date          TEXT    NOT NULL DEFAULT '',

  created_at           BIGINT  NOT NULL,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One registration number, one doctor.
CREATE UNIQUE INDEX IF NOT EXISTS doctors_reg_no_key ON doctors (reg_no);

-- The registry is read filtered by division and category far more than anything else.
CREATE INDEX IF NOT EXISTS doctors_speciality_idx ON doctors (speciality);
CREATE INDEX IF NOT EXISTS doctors_category_idx   ON doctors (category);

-- Small single-row store for service-level facts such as the KMPDC sync time.
CREATE TABLE IF NOT EXISTS registry_meta (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
