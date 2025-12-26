# asterisk.conf

**Purpose:** Global Asterisk configuration file. Controls core settings, file locations, logging, and module loading order.

**Key sections:**
- `directories`: paths for recordings, logs, spool files
- `options`: general runtime options and security-related flags

**Notes / Recommendations:**
- Keep file paths consistent with container/host mounts (see Dockerfile).
- Do not enable debugging logging in production; use rotated logs.
- Changes usually require Asterisk restart.