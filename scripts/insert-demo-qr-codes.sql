-- Insert demo QR codes for testing
INSERT INTO qr_codes (zone, token, "expiresAt", "isActive", "displayId") 
VALUES 
  ('reception', 'demo-zone-a', NOW() + INTERVAL '1 year', true, 'demo-display-1'),
  ('workshop', 'demo-zone-b', NOW() + INTERVAL '1 year', true, 'demo-display-2'),
  ('diagnostic', 'demo-zone-c', NOW() + INTERVAL '1 year', true, 'demo-display-3')
ON CONFLICT (token) DO NOTHING;
