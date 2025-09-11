-- ===========================
-- RFID Registration Database
-- ===========================

-- Log of every tap from all desks
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP NOT NULL,
    rfid_card_id VARCHAR(32) NOT NULL,
    desk TEXT NOT NULL,                     -- which desk saw the tap
    label VARCHAR(50) NOT NULL              -- REGISTER, EXITOUT, Z1, etc.
);

-- Registration table (leaders + individuals)
CREATE TABLE registration (
    id SERIAL PRIMARY KEY,
    desk TEXT NOT NULL,
    name TEXT,                     -- desk where registration happened
    province TEXT,
    district TEXT,
    school TEXT,
    university TEXT,
    age_range TEXT,
    sex TEXT,
    lang TEXT,
    group_size INTEGER DEFAULT 1,           -- 1 = individual, >1 = group
    rfid_card_id VARCHAR(32),      -- leader/individual RFID
    CONSTRAINT uniq_registration_rfid_per_desk UNIQUE (desk, rfid_card_id)
);

-- Members table: children under a leader
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    desk TEXT NOT NULL,                     -- must match leader’s desk
    leader_id INTEGER NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
    rfid_card_id VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'assigned',
    CONSTRAINT chk_status CHECK (LOWER(status) IN ('available','assigned')),
    CONSTRAINT uniq_member_rfid_per_desk UNIQUE (desk, rfid_card_id)
);

-- RFID card pool (optional)
CREATE TABLE rfid_cards (
  rfid_card_id VARCHAR(32) PRIMARY KEY,
  status VARCHAR(16) NOT NULL DEFAULT 'available',
  desk TEXT,                                -- desk where card was first assigned
  CONSTRAINT rfid_cards_status_chk CHECK (LOWER(status) IN ('available','assigned'))
);

-- Indexes
CREATE INDEX idx_registration_desk ON registration(desk);
CREATE INDEX idx_members_desk_leader ON members(desk, leader_id);
CREATE INDEX idx_logs_desk_card_time ON logs (desk, rfid_card_id, log_time);
