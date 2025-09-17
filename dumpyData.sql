-- ===========================
-- Extended Dump Data for RFID System
-- ===========================

-- Cluster Occupancy (ensure clusters exist)
INSERT INTO cluster_occupancy (cluster_code, current_count, as_of_time)
VALUES
 ('Cluster1', 0, NOW()),
 ('Cluster2', 0, NOW()),
 ('Cluster3', 0, NOW()),
 ('Cluster4', 0, NOW());

-- Registration table
INSERT INTO registration (portal, province, district, school, university, age_range, sex, lang, group_size)
VALUES
 ('PortalA', 'ProvinceX', 'DistrictY', 'SchoolAlpha', 'UniBeta', '18-25', 'M', 'EN', 1),
 ('PortalB', 'ProvinceX', 'DistrictZ', 'SchoolGamma', 'UniDelta', '26-35', 'F', 'EN', 3),
 ('PortalC', 'ProvinceY', 'DistrictW', 'SchoolTheta', 'UniEpsilon', '18-25', 'F', 'EN', 2),
 ('PortalA', 'ProvinceX', 'DistrictY', 'SchoolAlpha', 'UniBeta', '36-45', 'M', 'EN', 1),
 ('PortalB', 'ProvinceZ', 'DistrictQ', 'SchoolSigma', 'UniGamma', '26-35', 'M', 'FR', 1),
 ('PortalC', 'ProvinceY', 'DistrictW', 'SchoolTheta', 'UniEpsilon', '18-25', 'F', 'EN', 1),
 ('PortalA', 'ProvinceX', 'DistrictY', 'SchoolAlpha', 'UniBeta', '18-25', 'F', 'EN', 4),
 ('PortalB', 'ProvinceX', 'DistrictZ', 'SchoolGamma', 'UniDelta', '26-35', 'M', 'EN', 2),
 ('PortalC', 'ProvinceY', 'DistrictW', 'SchoolTheta', 'UniEpsilon', '36-45', 'F', 'EN', 1),
 ('PortalA', 'ProvinceX', 'DistrictY', 'SchoolAlpha', 'UniBeta', '18-25', 'M', 'EN', 1);

-- RFID cards table
INSERT INTO rfid_cards (rfid_card_id, status, portal)
VALUES
 ('CARD001', 'assigned', 'PortalA'),
 ('CARD002', 'assigned', 'PortalB'),
 ('CARD003', 'assigned', 'PortalB'),
 ('CARD004', 'assigned', 'PortalB'),
 ('CARD005', 'assigned', 'PortalC'),
 ('CARD006', 'assigned', 'PortalC'),
 ('CARD007', 'available', NULL),
 ('CARD008', 'available', NULL),
 ('CARD009', 'assigned', 'PortalA'),
 ('CARD010', 'assigned', 'PortalB');

-- Members table
INSERT INTO members (registration_id, rfid_card_id, role, portal)
VALUES
 (1, 'CARD001', 'INDIVIDUAL', 'PortalA'),
 (2, 'CARD002', 'LEADER', 'PortalB'),
 (2, 'CARD003', 'MEMBER', 'PortalB'),
 (2, 'CARD004', 'MEMBER', 'PortalB'),
 (3, 'CARD005', 'LEADER', 'PortalC'),
 (3, 'CARD006', 'MEMBER', 'PortalC'),
 (4, 'CARD009', 'INDIVIDUAL', 'PortalA'),
 (5, 'CARD010', 'INDIVIDUAL', 'PortalB');

-- Logs table
INSERT INTO logs (rfid_card_id, portal, label)
VALUES
 ('CARD001', 'PortalA', 'REGISTER'),
 ('CARD002', 'PortalB', 'REGISTER'),
 ('CARD003', 'PortalB', 'REGISTER'),
 ('CARD004', 'PortalB', 'REGISTER'),
 ('CARD005', 'PortalC', 'REGISTER'),
 ('CARD006', 'PortalC', 'REGISTER'),
 ('CARD001', 'PortalA', 'Cluster1'),
 ('CARD002', 'PortalB', 'Cluster2'),
 ('CARD003', 'PortalB', 'Cluster1'),
 ('CARD004', 'PortalB', 'EXITOUT'),
 ('CARD005', 'PortalC', 'Cluster3'),
 ('CARD006', 'PortalC', 'Cluster3'),
 ('CARD001', 'PortalA', 'Cluster2'),
 ('CARD002', 'PortalB', 'Cluster2'),
 ('CARD003', 'PortalB', 'Cluster1'),
 ('CARD005', 'PortalC', 'EXITOUT'),
 ('CARD006', 'PortalC', 'Cluster4'),
 ('CARD009', 'PortalA', 'REGISTER'),
 ('CARD009', 'PortalA', 'Cluster1'),
 ('CARD010', 'PortalB', 'REGISTER'),
 ('CARD010', 'PortalB', 'Cluster2'),
 ('CARD010', 'PortalB', 'EXITOUT'),
 ('CARD001', 'PortalA', 'Cluster3'),
 ('CARD002', 'PortalB', 'EXITOUT'),
 ('CARD003', 'PortalB', 'Cluster2'),
 ('CARD004', 'PortalB', 'Cluster1'),
 ('CARD005', 'PortalC', 'Cluster3'),
 ('CARD006', 'PortalC', 'EXITOUT'),
 ('CARD009', 'PortalA', 'Cluster2'),
 ('CARD010', 'PortalB', 'Cluster1');
