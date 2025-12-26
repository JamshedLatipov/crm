# Module: AMI

**Purpose:** Interfaces with Asterisk Manager Interface for telephony events and control operations.

**Key responsibilities:**
- Subscribe to AMI events and translate them to domain events
- Execute AMI actions (originate calls, hangup, get channel info)

**Notes:** Requires AMI credentials in config; prefer retry/backoff for unstable connections.
