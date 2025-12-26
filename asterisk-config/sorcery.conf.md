# sorcery.conf

**Purpose:** Sorcery config controls how Asterisk loads realtime resources (e.g., pjsip endpoints) from backends.

**Notes:**
- Often paired with database-backed provisioning; ensure mappings match `pjsip.d` or DB schemas.
- Useful for dynamic reconfiguration without full reloads.