# cdr.conf / cdr_pgsql.conf / cel_pgsql.conf

**Purpose:** Call Detail Record (CDR) and CEL (Channel Event Logging) configuration and storage backends.

**Key notes:**
- `cdr.conf` configures CDR modules used; `cdr_pgsql.conf` and `cel_pgsql.conf` target PostgreSQL backends used in this repo.
- Ensure DB credentials are provided securely (see `res_pgsql.conf` / `odbc.ini`).

**Recommendations:**
- Use idempotent writes and monitor failed inserts to avoid data loss.
- Coordinate schema (`pjsip_postgresql.sql`) with the database migration process.