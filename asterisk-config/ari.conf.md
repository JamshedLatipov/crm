# ari.conf

**Purpose:** Configuration for Asterisk REST Interface (ARI) — application-level control over channels, bridges and media.

**Key settings:**
- `enabled`, `bindaddr`, `port` and credential blocks for ARI apps

**Notes:**
- ARI is used by the backend (`apps/back`) for advanced call control; keep ARI credentials secure.
- Ensure network binding is restricted to trusted hosts or use firewall rules.