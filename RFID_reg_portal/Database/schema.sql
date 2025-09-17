-- ===========================
-- RFID Registration Database
-- ===========================

-- Log of every tap from all portals
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP NOT NULL DEFAULT NOW(),
    rfid_card_id VARCHAR(32) NOT NULL,
    portal TEXT NOT NULL,                     -- which portal saw the tap
    label VARCHAR(50) NOT NULL              -- REGISTER, EXITOUT, Z1, etc.
);

-- ---------------------------
-- Registration Table
-- ---------------------------
CREATE TABLE registration (
    id SERIAL PRIMARY KEY,
    portal TEXT NOT NULL,                     -- portal where registration happened
    province TEXT,
    district TEXT,
    school TEXT,
    university TEXT,
    age_range TEXT,
    sex TEXT,
    lang TEXT,
    group_size INTEGER DEFAULT 1            -- 1 = individual, >1 = group
);

-- ---------------------------
-- Members Table
-- ---------------------------
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    registration_id INT NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    rfid_card_id VARCHAR(32) UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('LEADER','MEMBER','INDIVIDUAL')) NOT NULL,
    portal TEXT
);


-- ---------------------------
-- Team Score (materialized scoreboard)
-- ---------------------------
-- Maintains current total points per registration (team)
-- last_update tracks the latest contributing tap
CREATE TABLE IF NOT EXISTS teamscore (
    registration_id INT PRIMARY KEY REFERENCES registration(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    last_update TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teamscore_last_update ON teamscore(last_update DESC);

-- ---------------------------
-- System Configuration
-- ---------------------------
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    cluster VARCHAR(20) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    threshold INTEGER NOT NULL DEFAULT 0,
    teamsize INTEGER NOT NULL DEFAULT 0
);

-- Insert default system configuration
INSERT INTO system_config (cluster, points, threshold, teamsize) VALUES 
('cluster1', 10, 50, 10),
('cluster2', 20, 50, 10),
('cluster3', 15, 50, 10),
('cluster4', 25, 50, 10);

-- RFID card pool (optional)
CREATE TABLE rfid_cards (
  rfid_card_id VARCHAR(32) PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'available',
  portal TEXT,                                -- portal where card was first assigned
  CONSTRAINT rfid_cards_status_chk CHECK (LOWER(status) IN ('available','assigned'))
);

-- Indexes
CREATE INDEX idx_registration_portal ON registration(portal);
CREATE INDEX idx_members_portal_leader ON members(portal, registration_id);
CREATE INDEX idx_logs_portal_card_time ON logs (portal, rfid_card_id, log_time);



