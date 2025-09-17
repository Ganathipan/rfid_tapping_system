-- ===========================
-- RFID Registration Database
-- ===========================

-- Create the database if it doesn't exist
-- Note: CREATE DATABASE IF NOT EXISTS is not supported in PostgreSQL,
-- so we must use DO block or create manually.
-- DO
-- $$
-- BEGIN
--    IF NOT EXISTS (
--       SELECT FROM pg_database WHERE datname = 'rfidn'
--    ) THEN
--       PERFORM dblink_exec('dbname=' || current_database(), 'CREATE DATABASE rfidn');
--    END IF;
-- END
-- $$ LANGUAGE plpgsql;

CREATE DATABASE rfidn;

-- Connect to the database
\c rfidn;

-- ---------------------------
-- Logs Table
-- ---------------------------
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP NOT NULL DEFAULT NOW(),
    rfid_card_id VARCHAR(32) NOT NULL,
    portal TEXT NOT NULL,                     -- which portal saw the tap
    label VARCHAR(50) NOT NULL                -- REGISTER, EXITOUT, Z1, etc.
);

-- ---------------------------
-- Cluster Occupancy Table
-- ---------------------------
CREATE TABLE IF NOT EXISTS cluster_occupancy (
    cluster_code VARCHAR(50) PRIMARY KEY, -- e.g. 'Cluster1', 'Cluster2'
    current_count INTEGER NOT NULL DEFAULT 0,
    as_of_time TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------
-- Derive Movements Procedure
-- ---------------------------
CREATE OR REPLACE PROCEDURE derive_movements()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Reset all cluster counts
    UPDATE cluster_occupancy SET current_count = 0, as_of_time = NOW();

    -- For each cluster, count tags whose last event is entry to that cluster and not EXITOUT
    WITH latest_events AS (
        SELECT l.rfid_card_id, l.label AS cluster_code, l.log_time,
               ROW_NUMBER() OVER (PARTITION BY l.rfid_card_id ORDER BY l.log_time DESC) AS rn,
               l.label
        FROM logs l
        WHERE l.label LIKE 'Cluster%'
           OR l.label = 'EXITOUT'
    )
    , present_tags AS (
        SELECT rfid_card_id, cluster_code
        FROM latest_events
        WHERE rn = 1 AND cluster_code LIKE 'Cluster%'
    )
    UPDATE cluster_occupancy c
    SET current_count = sub.cnt,
        as_of_time = NOW()
    FROM (
        SELECT cluster_code, COUNT(DISTINCT rfid_card_id) AS cnt
        FROM present_tags
        GROUP BY cluster_code
    ) sub
    WHERE c.cluster_code = sub.cluster_code;
END;
$$;

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
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    rfid_card_id VARCHAR(32) UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('LEADER','MEMBER','INDIVIDUAL')) NOT NULL,
    portal TEXT
);

-- ---------------------------
-- RFID Cards Table
-- ---------------------------
CREATE TABLE IF NOT EXISTS rfid_cards (
  rfid_card_id VARCHAR(32) PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'available',
  portal TEXT,                                -- portal where card was first assigned
  CONSTRAINT rfid_cards_status_chk CHECK (LOWER(status) IN ('available','assigned'))
);

-- ---------------------------
-- Indexes (with IF NOT EXISTS)
-- ---------------------------
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_registration_portal') THEN
      CREATE INDEX idx_registration_portal ON registration(portal);
   END IF;

   IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_members_portal_leader') THEN
      CREATE INDEX idx_members_portal_leader ON members(portal, registration_id);
   END IF;

   IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_logs_portal_card_time') THEN
      CREATE INDEX idx_logs_portal_card_time ON logs (portal, rfid_card_id, log_time);
   END IF;
END $$;

-- ===========================
-- Cluster Config Table
-- ===========================
CREATE TABLE IF NOT EXISTS cluster_config (
     id SERIAL PRIMARY KEY,
     cluster_code VARCHAR(50) NOT NULL,
     min_team_size INTEGER NOT NULL DEFAULT 1,
     max_team_size INTEGER NOT NULL DEFAULT 10,
     points INTEGER NOT NULL DEFAULT 1,
     device_id VARCHAR(50),
     UNIQUE(cluster_code)
);

-- ===========================
-- Group Points Log Table
-- ===========================
CREATE TABLE IF NOT EXISTS group_points_log (
     id SERIAL PRIMARY KEY,
     event_time TIMESTAMP NOT NULL DEFAULT NOW(),
     cluster_code VARCHAR(50) NOT NULL,
     device_id VARCHAR(50),
     team_id INTEGER NOT NULL,
     points_awarded INTEGER NOT NULL,
     member_ids TEXT NOT NULL -- comma-separated list of rfid_card_ids
);
