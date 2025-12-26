# http.conf

**Purpose:** HTTP server configuration for Asterisk (needed for ARI, static files, and WebSocket interfaces).

**Key settings:**
- `enabled`, `bindaddr`, `bindport`
- TLS settings when serving secure endpoints

**Notes:**
- ARI and WebSocket connectivity depend on this service; ensure ports are open between Asterisk and backend/softphone.
- Use TLS for public-facing endpoints; manage certs with `keys/` and `create_cert.sh`.