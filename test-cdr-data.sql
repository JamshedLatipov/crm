-- Test data for CDR (Call Detail Records) table
-- This script adds sample call records for testing the softphone call history component

-- Clear existing test data (optional - uncomment if needed)
-- DELETE FROM cdr WHERE accountcode = 'TEST_DATA';

-- Insert test call records for today
INSERT INTO cdr (id, calldate, clid, src, dst, dcontext, channel, dstchannel, lastapp, lastdata, duration, billsec, disposition, amaflags, accountcode, uniqueid, userfield, sequence) VALUES
(gen_random_uuid(), NOW() - INTERVAL '30 minutes', '"Customer Support" <+79991234567>', '+79991234567', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 125, 120, 'ANSWERED', 3, 'TEST_DATA', 'call-001-' || substr(md5(random()::text), 1, 8), 'Обсудили условия сотрудничества', 1),
(gen_random_uuid(), NOW() - INTERVAL '2 hours', '"Sales Inquiry" <+79999876543>', '+79999876543', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 45, 42, 'ANSWERED', 3, 'TEST_DATA', 'call-002-' || substr(md5(random()::text), 1, 8), 'Вопрос по доставке', 2),
(gen_random_uuid(), NOW() - INTERVAL '4 hours', '"New Lead" <+79995551234>', '+79995551234', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'NO ANSWER', 3, 'TEST_DATA', 'call-003-' || substr(md5(random()::text), 1, 8), '', 3),
(gen_random_uuid(), NOW() - INTERVAL '6 hours', '"Operator Call" <1001>', '1001', '+79997778899', 'from-internal', 'SIP/trunk-001', 'SIP/operator-001', 'Dial', 'SIP/operator-001,20,Tt', 89, 85, 'ANSWERED', 3, 'TEST_DATA', 'call-004-' || substr(md5(random()::text), 1, 8), 'Исходящий звонок по заявке', 4),
(gen_random_uuid(), NOW() - INTERVAL '8 hours', '"Busy Line" <+79991112233>', '+79991112233', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'BUSY', 3, 'TEST_DATA', 'call-005-' || substr(md5(random()::text), 1, 8), '', 5),
(gen_random_uuid(), NOW() - INTERVAL '10 hours', '"Project Discussion" <+79994445566>', '+79994445566', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 156, 150, 'ANSWERED', 3, 'TEST_DATA', 'call-006-' || substr(md5(random()::text), 1, 8), 'Длинный разговор о проекте', 6),
(gen_random_uuid(), NOW() - INTERVAL '12 hours', '"Quick Call" <+79992223344>', '+79992223344', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 23, 20, 'ANSWERED', 3, 'TEST_DATA', 'call-007-' || substr(md5(random()::text), 1, 8), '', 7),
(gen_random_uuid(), NOW() - INTERVAL '14 hours', '"Follow-up" <1001>', '1001', '+79996667788', 'from-internal', 'SIP/trunk-001', 'SIP/operator-001', 'Dial', 'SIP/operator-001,20,Tt', 67, 63, 'ANSWERED', 3, 'TEST_DATA', 'call-008-' || substr(md5(random()::text), 1, 8), 'Перезвонить завтра', 8),
(gen_random_uuid(), NOW() - INTERVAL '1 day 2 hours', '"Yesterday Call 1" <+79990001111>', '+79990001111', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 78, 75, 'ANSWERED', 3, 'TEST_DATA', 'call-009-' || substr(md5(random()::text), 1, 8), 'Вчерашний звонок', 9),
(gen_random_uuid(), NOW() - INTERVAL '1 day 6 hours', '"Yesterday Call 2" <+79998887777>', '+79998887777', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'FAILED', 3, 'TEST_DATA', 'call-010-' || substr(md5(random()::text), 1, 8), '', 10),
(gen_random_uuid(), NOW() - INTERVAL '16 hours', '"Failed Call" <+79993334455>', '+79993334455', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'FAILED', 3, 'TEST_DATA', 'call-011-' || substr(md5(random()::text), 1, 8), '', 11),
(gen_random_uuid(), NOW() - INTERVAL '18 hours', '"Short Call" <+79995556677>', '+79995556677', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 5, 3, 'ANSWERED', 3, 'TEST_DATA', 'call-012-' || substr(md5(random()::text), 1, 8), 'Короткий разговор', 12);

-- Verify the data was inserted
SELECT COUNT(*) as total_test_records FROM cdr WHERE accountcode = 'TEST_DATA';

(gen_random_uuid(), NOW() - INTERVAL '2 hours', '"Sales Inquiry" <+79999876543>', '+79999876543', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 45, 42, 'ANSWERED', 3, 'TEST_DATA', 'call-002-' || substr(gen_random_uuid()::text, 1, 8), 'Вопрос по доставке', 2),

(gen_random_uuid(), NOW() - INTERVAL '4 hours', '"New Lead" <+79995551234>', '+79995551234', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'NO ANSWER', 3, 'TEST_DATA', 'call-003-' || substr(gen_random_uuid()::text, 1, 8), '', 3),

-- Outgoing calls
(gen_random_uuid(), NOW() - INTERVAL '6 hours', '"Operator Call" <1001>', '1001', '+79997778899', 'from-internal', 'SIP/trunk-001', 'SIP/operator-001', 'Dial', 'SIP/operator-001,20,Tt', 89, 85, 'ANSWERED', 3, 'TEST_DATA', 'call-004-' || substr(gen_random_uuid()::text, 1, 8), 'Исходящий звонок по заявке', 4),

(gen_random_uuid(), NOW() - INTERVAL '8 hours', '"Busy Line" <+79991112233>', '+79991112233', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'BUSY', 3, 'TEST_DATA', 'call-005-' || substr(gen_random_uuid()::text, 1, 8), '', 5),

-- Longer calls
(gen_random_uuid(), NOW() - INTERVAL '10 hours', '"Project Discussion" <+79994445566>', '+79994445566', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 156, 150, 'ANSWERED', 3, 'TEST_DATA', 'call-006-' || substr(gen_random_uuid()::text, 1, 8), 'Длинный разговор о проекте', 6),

(gen_random_uuid(), NOW() - INTERVAL '12 hours', '"Quick Call" <+79992223344>', '+79992223344', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 23, 20, 'ANSWERED', 3, 'TEST_DATA', 'call-007-' || substr(gen_random_uuid()::text, 1, 8), '', 7),

-- More outgoing calls
(gen_random_uuid(), NOW() - INTERVAL '14 hours', '"Follow-up" <1001>', '1001', '+79996667788', 'from-internal', 'SIP/trunk-001', 'SIP/operator-001', 'Dial', 'SIP/operator-001,20,Tt', 67, 63, 'ANSWERED', 3, 'TEST_DATA', 'call-008-' || substr(gen_random_uuid()::text, 1, 8), 'Перезвонить завтра', 8),

-- Yesterday's calls
(gen_random_uuid(), NOW() - INTERVAL '1 day 2 hours', '"Yesterday Call 1" <+79990001111>', '+79990001111', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 78, 75, 'ANSWERED', 3, 'TEST_DATA', 'call-009-' || substr(gen_random_uuid()::text, 1, 8), 'Вчерашний звонок', 9),

(gen_random_uuid(), NOW() - INTERVAL '1 day 6 hours', '"Yesterday Call 2" <+79998887777>', '+79998887777', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'FAILED', 3, 'TEST_DATA', 'call-010-' || substr(gen_random_uuid()::text, 1, 8), '', 10),

-- Failed calls
(gen_random_uuid(), NOW() - INTERVAL '16 hours', '"Failed Call" <+79993334455>', '+79993334455', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 0, 0, 'FAILED', 3, 'TEST_DATA', 'call-011-' || substr(gen_random_uuid()::text, 1, 8), '', 11),

-- Very short calls
(gen_random_uuid(), NOW() - INTERVAL '18 hours', '"Short Call" <+79995556677>', '+79995556677', '1001', 'from-internal', 'SIP/operator-001', 'SIP/trunk-001', 'Dial', 'SIP/trunk-001,20,Tt', 5, 3, 'ANSWERED', 3, 'TEST_DATA', 'call-012-' || substr(gen_random_uuid()::text, 1, 8), 'Короткий разговор', 12);

-- Verify the data was inserted
SELECT COUNT(*) as total_test_records FROM cdr WHERE accountcode = 'TEST_DATA';