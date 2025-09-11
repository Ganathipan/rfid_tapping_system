-- ================================
-- Exhibition RFID Gamification DB
-- ================================

-- Drop (dev only)
-- DROP TABLE IF EXISTS logs, members, stalls, groups CASCADE;

-- 1) Core tables
CREATE TABLE IF NOT EXISTS groups (
    grp_id         SERIAL PRIMARY KEY,
    grp_name       TEXT NOT NULL,
    total_members  INTEGER NOT NULL DEFAULT 0 CHECK (total_members >= 0),
    balance_points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
    id      SERIAL PRIMARY KEY,
    grp_id  INT NOT NULL REFERENCES groups(grp_id) ON DELETE CASCADE,
    tag_id  VARCHAR(32) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS stalls (
    id          SERIAL PRIMARY KEY,
    stall_name  TEXT NOT NULL,
    base_points INTEGER NOT NULL CHECK (base_points >= 0)
);

CREATE TABLE IF NOT EXISTS logs (
    id            SERIAL PRIMARY KEY,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reader_id     TEXT NOT NULL,
    tag_id        VARCHAR(32) NOT NULL,
    grp_id        INT REFERENCES groups(grp_id) ON DELETE SET NULL,
    points_earned INTEGER NOT NULL  -- positive for award, negative for redeem
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_members_tag_id ON members(tag_id);
CREATE INDEX IF NOT EXISTS idx_logs_grp_id    ON logs(grp_id);
CREATE INDEX IF NOT EXISTS idx_logs_tag_id    ON logs(tag_id);
CREATE INDEX IF NOT EXISTS idx_logs_time      ON logs(timestamp DESC);

-- 2) Keep groups.total_members in sync via triggers
CREATE OR REPLACE FUNCTION sync_group_member_count() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET total_members = total_members + 1 WHERE grp_id = NEW.grp_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET total_members = total_members - 1 WHERE grp_id = OLD.grp_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.grp_id <> OLD.grp_id THEN
    UPDATE groups SET total_members = total_members - 1 WHERE grp_id = OLD.grp_id;
    UPDATE groups SET total_members = total_members + 1 WHERE grp_id = NEW.grp_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_members_count_ins ON members;
DROP TRIGGER IF EXISTS trg_members_count_del ON members;
DROP TRIGGER IF EXISTS trg_members_count_upd ON members;

CREATE TRIGGER trg_members_count_ins AFTER INSERT ON members
FOR EACH ROW EXECUTE FUNCTION sync_group_member_count();

CREATE TRIGGER trg_members_count_del AFTER DELETE ON members
FOR EACH ROW EXECUTE FUNCTION sync_group_member_count();

CREATE TRIGGER trg_members_count_upd AFTER UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION sync_group_member_count();

-- 3) Award/Redeem functions (your rules)

-- Award: FullTens = floor(N / 10); PointsAwarded = base_points * FullTens
CREATE OR REPLACE FUNCTION award_points(
    p_tag_id    VARCHAR(32),
    p_stall_id  INT,
    p_reader_id TEXT DEFAULT NULL,
    p_debounce_seconds INT DEFAULT 2  -- ignore re-taps within this window
)
RETURNS TABLE(
    log_id         INT,
    grp_id         INT,
    group_size     INT,
    base_points    INT,
    full_tens      INT,
    points_awarded INT,
    new_balance    INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_grp_id        INT;
    v_group_size    INT;
    v_base_points   INT;
    v_full_tens     INT;
    v_award_points  INT;
    v_balance       INT;
    v_reader        TEXT;
    v_recent        INT;
BEGIN
    -- Resolve member → group
    SELECT m.grp_id INTO v_grp_id FROM members m WHERE m.tag_id = p_tag_id;
    IF v_grp_id IS NULL THEN
        RAISE EXCEPTION 'Unknown RFID tag: %', p_tag_id
          USING HINT = 'Insert the tag into members(tag_id, grp_id) first.';
    END IF;

    -- Debounce: recent identical tap on same reader?
    v_reader := COALESCE(p_reader_id, 'STALL-' || p_stall_id::TEXT);
    SELECT COUNT(*) INTO v_recent
      FROM logs
     WHERE tag_id = p_tag_id
       AND reader_id = v_reader
       AND timestamp >= NOW() - make_interval(secs => p_debounce_seconds);
    IF v_recent > 0 THEN
        RAISE EXCEPTION 'Repeated tap ignored (debounce %s)', p_debounce_seconds;
    END IF;

    -- Lock group (avoid race on balance updates)
    SELECT g.total_members, g.balance_points
      INTO v_group_size, v_balance
      FROM groups g
     WHERE g.grp_id = v_grp_id
     FOR UPDATE;

    -- Stall base points
    SELECT s.base_points INTO v_base_points FROM stalls s WHERE s.id = p_stall_id;
    IF v_base_points IS NULL THEN
        RAISE EXCEPTION 'Stall % not found', p_stall_id;
    END IF;

    -- Compute
    v_full_tens    := v_group_size / 10;
    v_award_points := v_base_points * v_full_tens;

    -- Update balance
    UPDATE groups
       SET balance_points = balance_points + v_award_points
     WHERE grp_id = v_grp_id
     RETURNING balance_points INTO v_balance;

    -- Log
    INSERT INTO logs(reader_id, tag_id, grp_id, points_earned)
         VALUES (v_reader, p_tag_id, v_grp_id, v_award_points)
      RETURNING id INTO log_id;

    grp_id         := v_grp_id;
    group_size     := v_group_size;
    base_points    := v_base_points;
    full_tens      := v_full_tens;
    points_awarded := v_award_points;
    new_balance    := v_balance;
    RETURN NEXT;
END;
$$;

-- Redeem: deduct from group via any member
CREATE OR REPLACE FUNCTION redeem_points(
    p_tag_id    VARCHAR(32),
    p_cost      INT,
    p_reader_id TEXT DEFAULT 'REDEEM'
)
RETURNS TABLE(
    log_id      INT,
    grp_id      INT,
    cost        INT,
    new_balance INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_grp_id  INT;
    v_balance INT;
BEGIN
    IF p_cost <= 0 THEN
        RAISE EXCEPTION 'Redemption cost must be positive. Given %', p_cost;
    END IF;

    SELECT m.grp_id INTO v_grp_id FROM members m WHERE m.tag_id = p_tag_id;
    IF v_grp_id IS NULL THEN
        RAISE EXCEPTION 'Unknown RFID tag: %', p_tag_id;
    END IF;

    SELECT g.balance_points INTO v_balance
      FROM groups g
     WHERE g.grp_id = v_grp_id
     FOR UPDATE;

    IF v_balance < p_cost THEN
        RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, p_cost;
    END IF;

    UPDATE groups
       SET balance_points = balance_points - p_cost
     WHERE grp_id = v_grp_id
     RETURNING balance_points INTO v_balance;

    INSERT INTO logs(reader_id, tag_id, grp_id, points_earned)
      VALUES (p_reader_id, p_tag_id, v_grp_id, -p_cost)
      RETURNING id INTO log_id;

    grp_id      := v_grp_id;
    cost        := p_cost;
    new_balance := v_balance;
    RETURN NEXT;
END;
$$;