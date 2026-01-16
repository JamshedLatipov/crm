-- ========================================
-- Add External Trunk Provider (109.68.238.170)
-- Для устранения ошибки "No matching endpoint found"
-- ========================================

-- 1. Создать endpoint для внешнего trunk провайдера
INSERT INTO ps_endpoints (
  id, transport, aors, auth, context, disallow, allow, 
  direct_media, dtmf_mode, ice_support, media_encryption, 
  rewrite_contact, webrtc, force_rport, rtp_symmetric, from_domain
)
VALUES (
  'trunk-provider',
  'transport-udp',
  'trunk-provider',
  'trunk-provider-auth',
  'from-trunk',
  'all',
  'ulaw,alaw,g729',
  'no',
  'rfc4733',
  'no',
  'no',
  'yes',
  'no',
  'yes',
  'yes',
  '109.68.238.170'
)
ON CONFLICT (id) DO UPDATE SET
  transport = EXCLUDED.transport,
  auth = EXCLUDED.auth,
  context = EXCLUDED.context,
  allow = EXCLUDED.allow,
  from_domain = EXCLUDED.from_domain;

-- 2. Создать AOR для trunk провайдера со статическим contact
INSERT INTO ps_aors (id, contact, qualify_frequency, max_contacts)
VALUES ('trunk-provider', 'sip:418001011@109.68.238.170', 60, 1)
ON CONFLICT (id) DO UPDATE SET
  contact = EXCLUDED.contact,
  qualify_frequency = EXCLUDED.qualify_frequency,
  max_contacts = EXCLUDED.max_contacts;

-- 2.1. Создать auth для trunk провайдера (для входящих звонков с авторизацией)
INSERT INTO ps_auths (id, auth_type, username, password)
VALUES ('trunk-provider-auth', 'userpass', '418001011', '418001011')
ON CONFLICT (id) DO UPDATE SET
  auth_type = EXCLUDED.auth_type,
  username = EXCLUDED.username,
  password = EXCLUDED.password;

-- 3. Создать IP identify для привязки входящих запросов от провайдера
-- ЭТО КРИТИЧНО: без этой записи Asterisk не найдет endpoint!
INSERT INTO ps_endpoint_id_ips (id, endpoint, match)
VALUES ('trunk-provider-ip', 'trunk-provider', '109.68.238.170')
ON CONFLICT (id) DO UPDATE SET
  endpoint = EXCLUDED.endpoint,
  match = EXCLUDED.match;

-- Проверка результата
SELECT 'Endpoint created:' as status, id, transport, context, allow 
FROM ps_endpoints WHERE id = 'trunk-provider';

SELECT 'AOR created:' as status, id, contact, qualify_frequency 
FROM ps_aors WHERE id = 'trunk-provider';

SELECT 'IP Identify created:' as status, id, endpoint, match 
FROM ps_endpoint_id_ips WHERE id = 'trunk-provider-ip';
