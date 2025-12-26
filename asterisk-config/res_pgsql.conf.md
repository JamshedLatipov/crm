# res_pgsql.conf / res_odbc.conf / odbc.ini

**Purpose:** Database connector configurations for Asterisk (PostgreSQL/ODBC) used by CDR, CEL, and realtime modules.

**Key notes:**
- `res_pgsql.conf` configures PostgreSQL backend; `res_odbc.conf` and `odbc.ini` configure ODBC sources.
- `odbcinst.ini` contains driver definitions.

**Recommendations:**
- Keep DB credentials out of repo; use env or external secret stores.
- Test connectivity from container to DB; watch DNS and network timeouts.