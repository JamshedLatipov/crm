# create_cert.sh

**Purpose:** Helper script to generate TLS certificates used by Asterisk (`keys/`).

**Notes / Recommendations:**
- Use this for local/dev cert generation; use a proper CA or managed certs in production.
- Ensure generated private keys are protected and not committed to VCS.