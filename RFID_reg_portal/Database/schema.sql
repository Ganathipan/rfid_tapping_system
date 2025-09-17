\set ON_ERROR_STOP on
\echo === Ensuring database "rfidn" exists ===

-- Create the DB only if missing (psql \gexec trick)
SELECT 'CREATE DATABASE rfidn'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'rfidn');
\gexec

\echo === Connecting to rfidn ===
\connect rfidn

-- (Optional) make sure public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- ===========================
-- RFID Registration Database
-- ===========================

-- Log of every tap from all portals
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP NOT NULL DEFAULT NOW(),
    rfid_card_id VARCHAR(32) NOT NULL,
    portal TEXT NOT NULL,                     -- which portal saw the tap
    label VARCHAR(50) NOT NULL                -- REGISTER, EXITOUT, Z1, etc.
);

-- ---------------------------
-- Registration Table
-- ---------------------------
CREATE TABLE IF NOT EXISTS registration (
    id SERIAL PRIMARY KEY,
    portal TEXT NOT NULL,                     -- portal where registration happened
    province TEXT,
    district TEXT,
    school TEXT,
    university TEXT,
    age_range TEXT,
    sex TEXT,
    lang TEXT,
    group_size INTEGER DEFAULT 1              -- 1 = individual, >1 = group
);

-- ---------------------------
-- Members Table
-- ---------------------------
-- Note: the CHECK constraint is named so we can manage it later if needed.
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    rfid_card_id VARCHAR(32) UNIQUE NOT NULL,
    role TEXT NOT NULL,
    portal TEXT,
    CONSTRAINT members_role_chk CHECK (role IN ('LEADER','MEMBER','INDIVIDUAL'))
);

-- RFID card pool (optional)
CREATE TABLE IF NOT EXISTS rfid_cards (
    rfid_card_id VARCHAR(32) PRIMARY KEY,
    status VARCHAR(16) NOT NULL DEFAULT 'available',
    portal TEXT,                                -- portal where card was first assigned
    last_assigned_time TIMESTAMP,
    CONSTRAINT rfid_cards_status_chk CHECK (LOWER(status) IN ('available','assigned','released'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_registration_portal
    ON registration(portal);

CREATE INDEX IF NOT EXISTS idx_members_portal_leader
    ON members(portal, registration_id);

CREATE INDEX IF NOT EXISTS idx_logs_portal_card_time
    ON logs (portal, rfid_card_id, log_time);

\echo === All done. ===
