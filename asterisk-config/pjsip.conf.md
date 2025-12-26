# pjsip.conf

**Purpose:** SIP channel driver configuration for PJSIP (endpoints, transports, aors, auths).

**Key sections:**
- `transport` definitions (UDP/TCP/TLS)
- `endpoint` and `aor` settings for peers and users
- `auth` blocks for credential storage

**Notes / Recommendations:**
- Keep credentials out of repo; use env or extconfigs for production secrets.
- Tune `rtp_engine` and codecs to match `rtp.conf` and TURN settings.
- Use `pjsip.d/` for per-endpoint dynamic fragments when provisioned programmatically.