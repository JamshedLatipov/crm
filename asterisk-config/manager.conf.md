# manager.conf

**Purpose:** Asterisk Manager Interface (AMI) configuration for event/action access.

**Key sections:**
- `general` for AMI listener settings
- `user` blocks defining credentials and permissions for AMI clients

**Notes / Recommendations:**
- Restrict AMI user privileges to only necessary actions.
- Rotate AMI credentials and avoid exposing AMI to untrusted networks.
- Backend uses AMI for some telephony controls — coordinate with ops for credentials.