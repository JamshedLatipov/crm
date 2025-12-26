# modules.conf

**Purpose:** Controls which Asterisk modules are loaded at startup.

**Notes:**
- Disable unused modules to reduce attack surface and memory usage.
- Be careful changing module order; missing modules can break features (e.g., ARI, chan_pjsip).