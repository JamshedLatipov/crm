# keys/

**Purpose:** Directory holding TLS certificates and private keys for Asterisk HTTP/WS/TLS endpoints.

**Notes / Recommendations:**
- Do not commit private keys to VCS. Use mount points for production certs.
- Rotate keys periodically and use secure permissions on filesystem.