CREATE TABLE IF NOT EXISTS logs (
  id BIGSERIAL PRIMARY KEY,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rfid_card_id TEXT NOT NULL,
  portal TEXT NOT NULL,
  label TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logs_time ON logs(log_time DESC);
CREATE INDEX IF NOT EXISTS idx_logs_portal ON logs(portal);
CREATE INDEX IF NOT EXISTS idx_logs_card ON logs(rfid_card_id);

CREATE TABLE IF NOT EXISTS reader_config (
  r_index INT PRIMARY KEY,
  reader_id TEXT NOT NULL,
  portal TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  school_name TEXT,
  school_type TEXT,
  province TEXT,
  district TEXT
);

CREATE TABLE IF NOT EXISTS registration (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  member_id BIGINT REFERENCES members(id),
  team_name TEXT,
  is_individual BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS rfid_cards (
  rfid_card_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  registration_id BIGINT REFERENCES registration(id),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS venue_state (
  key TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO venue_state (key, value) VALUES ('total_crowd', 0) ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS cluster_occupancy_live (
  id BIGSERIAL PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id),
  cluster_label TEXT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, cluster_label)
);

-- Game Lite tables
CREATE TABLE IF NOT EXISTS team_scores_lite (
  id BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  team_name TEXT NOT NULL,
  total_points BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registration_id)
);

CREATE TABLE IF NOT EXISTS member_cluster_visits_lite (
  id BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  cluster_label TEXT NOT NULL,
  points_awarded BIGINT NOT NULL DEFAULT 0,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(registration_id, cluster_label)
);

CREATE TABLE IF NOT EXISTS redemptions_lite (
  id BIGSERIAL PRIMARY KEY,
  registration_id BIGINT NOT NULL REFERENCES registration(id),
  cluster_label TEXT NOT NULL,
  points_redeemed BIGINT NOT NULL DEFAULT 0,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);