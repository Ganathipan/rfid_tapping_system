-- Test data for RFID Tapping System
-- Setup: Multiple readers per cluster, but only one display per cluster

-- ===========================================
-- 1. System configuration is now handled in schema.sql
-- ===========================================
-- Cluster configurations are stored in system_config table
-- with keys: cluster1_points, cluster2_points, etc.

-- ===========================================
-- 2. Insert sample registrations (teams)
-- ===========================================
INSERT INTO registration (id, portal, province, district, school, university, age_range, sex, lang, group_size) VALUES 
(1, 'Cluster1_Display', 'Western', 'Colombo', 'Royal College', NULL, '16-18', 'Male', 'English', 4),
(2, 'Cluster2_Display', 'Central', 'Kandy', 'Trinity College', NULL, '17-19', 'Male', 'English', 3),
(3, 'Cluster1_Display', 'Western', 'Gampaha', 'Ananda College', NULL, '16-18', 'Mixed', 'Sinhala', 5),
(4, 'Cluster3_Display', 'Southern', 'Galle', 'Richmond College', NULL, '15-17', 'Female', 'English', 2),
(5, 'Cluster2_Display', 'Central', 'Matale', 'St. Anthony\'s College', NULL, '16-18', 'Male', 'English', 4)
ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- 3. Insert sample RFID cards
-- ===========================================
INSERT INTO rfid_cards (rfid_card_id, status, portal) VALUES 
-- Cluster 1 team cards
('RFID001', 'assigned', 'Cluster1_Display'),
('RFID002', 'assigned', 'Cluster1_Display'),
('RFID003', 'assigned', 'Cluster1_Display'),
('RFID004', 'assigned', 'Cluster1_Display'),
('RFID008', 'assigned', 'Cluster1_Display'),
('RFID009', 'assigned', 'Cluster1_Display'),

-- Cluster 2 team cards
('RFID005', 'assigned', 'Cluster2_Display'),
('RFID006', 'assigned', 'Cluster2_Display'),
('RFID007', 'assigned', 'Cluster2_Display'),
('RFID012', 'assigned', 'Cluster2_Display'),
('RFID013', 'assigned', 'Cluster2_Display'),
('RFID014', 'assigned', 'Cluster2_Display'),
('RFID015', 'assigned', 'Cluster2_Display'),

-- Cluster 3 team cards
('RFID010', 'assigned', 'Cluster3_Display'),
('RFID011', 'assigned', 'Cluster3_Display')
ON CONFLICT (rfid_card_id) DO NOTHING;

-- ===========================================
-- 4. Insert sample team members
-- ===========================================
INSERT INTO members (registration_id, rfid_card_id, role, portal) VALUES 
-- Team 1 (Royal College - Cluster 1)
(1, 'RFID001', 'LEADER', 'Cluster1_Display'),
(1, 'RFID002', 'MEMBER', 'Cluster1_Display'),
(1, 'RFID003', 'MEMBER', 'Cluster1_Display'),
(1, 'RFID004', 'MEMBER', 'Cluster1_Display'),

-- Team 2 (Trinity College - Cluster 2)
(2, 'RFID005', 'LEADER', 'Cluster2_Display'),
(2, 'RFID006', 'MEMBER', 'Cluster2_Display'),
(2, 'RFID007', 'MEMBER', 'Cluster2_Display'),

-- Team 3 (Ananda College - Cluster 1)
(3, 'RFID008', 'LEADER', 'Cluster1_Display'),
(3, 'RFID009', 'MEMBER', 'Cluster1_Display'),

-- Team 4 (Richmond College - Cluster 3)
(4, 'RFID010', 'LEADER', 'Cluster3_Display'),
(4, 'RFID011', 'MEMBER', 'Cluster3_Display'),

-- Team 5 (St. Anthony's College - Cluster 2)
(5, 'RFID012', 'LEADER', 'Cluster2_Display'),
(5, 'RFID013', 'MEMBER', 'Cluster2_Display'),
(5, 'RFID014', 'MEMBER', 'Cluster2_Display'),
(5, 'RFID015', 'MEMBER', 'Cluster2_Display')
ON CONFLICT DO NOTHING;

-- ===========================================
-- 5. Insert sample logs (taps from various readers)
-- ===========================================
INSERT INTO logs (rfid_card_id, portal, label, log_time) VALUES 
-- Cluster 1 taps (from reader1, reader1a, reader1b)
('RFID001', 'reader1', 'cluster1', NOW() - INTERVAL '2 hours'),
('RFID002', 'reader1a', 'cluster1', NOW() - INTERVAL '1 hour 30 minutes'),
('RFID003', 'reader1b', 'cluster1', NOW() - INTERVAL '1 hour'),
('RFID008', 'reader1', 'cluster1', NOW() - INTERVAL '45 minutes'),
('RFID009', 'reader1a', 'cluster1', NOW() - INTERVAL '30 minutes'),

-- Cluster 2 taps (from reader2, reader2a, reader2b)
('RFID005', 'reader2', 'cluster2', NOW() - INTERVAL '3 hours'),
('RFID006', 'reader2a', 'cluster2', NOW() - INTERVAL '2 hours 30 minutes'),
('RFID007', 'reader2b', 'cluster2', NOW() - INTERVAL '2 hours'),
('RFID012', 'reader2', 'cluster2', NOW() - INTERVAL '1 hour 15 minutes'),
('RFID013', 'reader2a', 'cluster2', NOW() - INTERVAL '1 hour'),
('RFID014', 'reader2b', 'cluster2', NOW() - INTERVAL '45 minutes'),
('RFID015', 'reader2', 'cluster2', NOW() - INTERVAL '30 minutes'),

-- Cluster 3 taps (from reader3, reader3a)
('RFID010', 'reader3', 'cluster3', NOW() - INTERVAL '1 hour 45 minutes'),
('RFID011', 'reader3a', 'cluster3', NOW() - INTERVAL '1 hour 15 minutes')
ON CONFLICT DO NOTHING;

-- ===========================================
-- 6. Insert initial team scores
-- ===========================================
INSERT INTO teamscore (registration_id, points, last_update) VALUES 
(1, 20, NOW() - INTERVAL '30 minutes'),  -- Team 1: 2 cluster1 taps = 20 points
(2, 60, NOW() - INTERVAL '30 minutes'),  -- Team 2: 3 cluster2 taps = 60 points  
(3, 20, NOW() - INTERVAL '30 minutes'),  -- Team 3: 2 cluster1 taps = 20 points
(4, 30, NOW() - INTERVAL '1 hour 15 minutes'), -- Team 4: 2 cluster3 taps = 30 points
(5, 60, NOW() - INTERVAL '30 minutes')   -- Team 5: 3 cluster2 taps = 60 points
ON CONFLICT (registration_id) DO NOTHING;

-- ===========================================
-- 7. Verify the data
-- ===========================================
-- Check cluster configurations
SELECT 'Cluster Configurations:' as info;
SELECT config_key, config_value, description 
FROM system_config 
WHERE config_key LIKE '%_points' 
ORDER BY config_key;

-- Check teams and their scores by cluster
SELECT 'Teams by Cluster:' as info;
SELECT 
    r.portal as cluster_display,
    r.id as team_id,
    r.school,
    COALESCE(ts.points, 0) as total_points,
    COUNT(m.id) as member_count
FROM registration r
LEFT JOIN teamscore ts ON r.id = ts.registration_id
LEFT JOIN members m ON r.id = m.registration_id
GROUP BY r.portal, r.id, r.school, ts.points
ORDER BY r.portal, COALESCE(ts.points, 0) DESC;

-- Check recent taps by cluster
SELECT 'Recent Taps by Cluster:' as info;
SELECT 
    l.label as cluster,
    l.portal as reader,
    l.rfid_card_id,
    l.log_time,
    r.school
FROM logs l
LEFT JOIN members m ON l.rfid_card_id = m.rfid_card_id
LEFT JOIN registration r ON m.registration_id = r.id
WHERE l.label LIKE 'cluster%'
ORDER BY l.label, l.log_time DESC;

-- ===========================================
-- 7. System configuration is now handled in schema.sql
-- ===========================================
-- Default configuration values are inserted automatically
-- when the schema is created
