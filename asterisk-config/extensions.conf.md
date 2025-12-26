# extensions.conf

**Purpose:** Dialplan definitions — how calls are routed, IVR flows and call handling logic.

**Key sections:**
- `contexts` grouping extensions and routing rules
- `include` statements to compose dialplans

**Notes / Recommendations:**
- Keep heavy logic minimal in the core dialplan; call out to AGI/ARI for complex handling.
- Test dialplan changes in a staging environment; malformed dialplan can break call routing.
- Use comments and versioning for maintainability.