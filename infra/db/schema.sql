-- =====================================================================
-- RFID SYSTEM SCHEMA (single file, psql-friendly, idempotent)
-- =====================================================================

-- 0) Create database if missing (psql-only; runs outside a transaction)
\set dbname rfid
SELECT 'CREATE DATABASE ' || quote_ident(:'dbname')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'dbname') \gexec

\connect :dbname
SET search_path TO public;

-- =====================================================================
-- 1) TABLES (full current definitions; columns in CREATE statements)
-- =====================================================================

-- Members (each assigned RFID card; leader or regular member)
-- (Created first to allow registration.member_id FK to resolve)
CREATE TABLE IF NOT EXISTS members (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  -- profile / demographics (optional)
  name             TEXT,
  email            TEXT,
  phone            TEXT,
  school_name      TEXT,
  school_type      TEXT,
  province         TEXT,
  district         TEXT,
  -- assignment & role tracking
  registration_id  BIGINT,          -- FK added after registration is created
  rfid_card_id     TEXT,
  role             TEXT,            -- 'LEADER' | 'MEMBER'
  portal           TEXT
);

-- Registrations (team/group or individual leader record)
CREATE TABLE IF NOT EXISTS registration (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  -- link to leader (nullable); enforced to members.id
  member_id     BIGINT REFERENCES members(id),
  team_name     TEXT,
  is_individual BOOLEAN DEFAULT false,
  -- extended fields used by application logic
  portal        TEXT,
  group_size    INT DEFAULT 1,
  school        TEXT,
  university    TEXT,
  province      TEXT,
  district      TEXT,
  age_range     TEXT,
  sex           TEXT,
  lang          TEXT
);

-- Activity logs from hardware readers
CREATE TABLE IF NOT EXISTS logs (
  id            BIGSERIAL PRIMARY KEY,
  log_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rfid_card_id  TEXT NOT NULL,
  portal        TEXT NOT NULL,
  label         TEXT NOT NULL
);

-- Reader static configuration
CREATE TABLE IF NOT EXISTS reader_config (
  r_index   INT PRIMARY KEY,
  reader_id TEXT NOT NULL,
  portal    TEXT NOT NULL
);

-- Physical RFID cards inventory / state
CREATE TABLE IF NOT EXISTS rfid_cards (
  rfid_card_id        TEXT PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  registration_id     BIGINT REFERENCES registration(id),
  is_active           BOOLEAN DEFAULT true,
  status              TEXT DEFAULT 'available',  -- available | assigned | released
  portal              TEXT,                      -- last known associated portal
  last_assigned_time  TIMESTAMPTZ
);

-- Venue aggregate state (counters, etc.)
CREATE TABLE IF NOT EXISTS venue_state (
  key        TEXT PRIMARY KEY,
  value      BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live cluster occupancy (presence tracking)
CREATE TABLE IF NOT EXISTS cluster_occupancy_live (
  id             BIGSERIAL PRIMARY KEY,
  member_id      BIGINT NOT NULL REFERENCES members(id),
  cluster_label  TEXT NOT NULL,
  entered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, cluster_label)
);

-- Game Lite: team total score tracker
CREATE TABLE IF NOT EXISTS team_scores_lite (
  id             BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  team_name       TEXT NOT NULL,
  total_points    BIGINT NOT NULL DEFAULT 0,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registration_id)
);

-- Game Lite: member/team visits to clusters
CREATE TABLE IF NOT EXISTS member_cluster_visits_lite (
  id              BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  cluster_label   TEXT NOT NULL,
  points_awarded  BIGINT NOT NULL DEFAULT 0,
  visited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registration_id, cluster_label)
);

-- Game Lite: redemption events
CREATE TABLE IF NOT EXISTS redemptions_lite (
  id              BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  cluster_label   TEXT NOT NULL,
  points_redeemed BIGINT NOT NULL DEFAULT 0,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2) INDEXES (idempotent)
-- =====================================================================

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_time   ON logs(log_time DESC);
CREATE INDEX IF NOT EXISTS idx_logs_portal ON logs(portal);
CREATE INDEX IF NOT EXISTS idx_logs_card   ON logs(rfid_card_id);

-- RFID cards indexes
CREATE INDEX IF NOT EXISTS idx_rfid_cards_status ON rfid_cards(status);
CREATE INDEX IF NOT EXISTS idx_rfid_cards_portal ON rfid_cards(portal);

-- Registration & members indexes
CREATE INDEX IF NOT EXISTS idx_registration_portal   ON registration(portal);
CREATE INDEX IF NOT EXISTS idx_members_registration  ON members(registration_id);
CREATE INDEX IF NOT EXISTS idx_members_rfid          ON members(rfid_card_id);

-- =====================================================================
-- 3) SEED DATA (idempotent)
-- =====================================================================

INSERT INTO venue_state (key, value)
VALUES ('total_crowd', 0)
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- 4) FK to resolve circular dependency (members → registration)
--    Kept as a single ALTER after both tables exist.
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'members_registration_id_fkey'
  ) THEN
    ALTER TABLE members
      ADD CONSTRAINT members_registration_id_fkey
      FOREIGN KEY (registration_id) REFERENCES registration(id);
  END IF;
END$$;

-- =====================================================================
-- END
-- =====================================================================

-- =====================================================================
-- 5) GAME LITE COMPATIBILITY PATCHES (idempotent)
--    Ensures columns exist that service code expects after refactor.
-- =====================================================================
DO $$ BEGIN
  -- team_scores_lite.team_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='team_scores_lite' AND column_name='team_name'
  ) THEN
    ALTER TABLE team_scores_lite ADD COLUMN team_name TEXT;
  END IF;
  -- member_cluster_visits_lite.member_id column (for per-member tracking)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='member_cluster_visits_lite' AND column_name='member_id'
  ) THEN
    ALTER TABLE member_cluster_visits_lite ADD COLUMN member_id BIGINT REFERENCES members(id);
  END IF;
  -- Adjust unique constraint if old one only on registration_id
  BEGIN
    ALTER TABLE member_cluster_visits_lite DROP CONSTRAINT IF EXISTS member_cluster_visits_lite_registration_id_cluster_label_key;
  EXCEPTION WHEN undefined_object THEN NULL; END;
  -- Add composite unique for member first visit rule
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename='member_cluster_visits_lite' AND indexname='uniq_member_cluster_visit'
  ) THEN
    CREATE UNIQUE INDEX uniq_member_cluster_visit ON member_cluster_visits_lite(member_id, cluster_label);
  END IF;
  -- redemptions_lite.points_spent rename compatibility: if only points_redeemed exists keep it.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='redemptions_lite' AND column_name='points_spent'
  ) THEN
    -- Some code may expect points_spent; create a view alias if not present
    BEGIN
      CREATE OR REPLACE VIEW v_redemptions_lite AS SELECT *, points_redeemed AS points_spent FROM redemptions_lite;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

-- 6) JSONB CLUSTER VISITS (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name='members' AND column_name='cluster_visits'
  ) THEN
    ALTER TABLE members ADD COLUMN cluster_visits JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

