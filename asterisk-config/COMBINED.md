# Asterisk config — consolidated documentation

This file concatenates all individual Asterisk-related markdown files from this directory into a single reference document.

---

## ari.conf.md

```markdown
# ari.conf

**Purpose:** Configuration for Asterisk REST Interface (ARI) — application-level control over channels, bridges and media.

**Key settings:**
- `enabled`, `bindaddr`, `port` and credential blocks for ARI apps

**Notes:**
- ARI is used by the backend (`apps/back`) for advanced call control; keep ARI credentials secure.
- Ensure network binding is restricted to trusted hosts or use firewall rules.
```

---

## asterisk.conf.md

```markdown
# asterisk.conf

**Purpose:** Global Asterisk configuration file. Controls core settings, file locations, logging, and module loading order.

**Key sections:**
- `directories`: paths for recordings, logs, spool files
- `options`: general runtime options and security-related flags

**Notes / Recommendations:**
- Keep file paths consistent with container/host mounts (see Dockerfile).
- Do not enable debugging logging in production; use rotated logs.
- Changes usually require Asterisk restart.
```

---

## cdr.conf.md

```markdown
# cdr.conf / cdr_pgsql.conf / cel_pgsql.conf

**Purpose:** Call Detail Record (CDR) and CEL (Channel Event Logging) configuration and storage backends.

**Key notes:**
- `cdr.conf` configures CDR modules used; `cdr_pgsql.conf` and `cel_pgsql.conf` target PostgreSQL backends used in this repo.
- Ensure DB credentials are provided securely (see `res_pgsql.conf` / `odbc.ini`).

**Recommendations:**
- Use idempotent writes and monitor failed inserts to avoid data loss.
- Coordinate schema (`pjsip_postgresql.sql`) with the database migration process.
```

---

## create_cert.sh.md

```markdown
# create_cert.sh

**Purpose:** Helper script to generate TLS certificates used by Asterisk (`keys/`).

**Notes / Recommendations:**
- Use this for local/dev cert generation; use a proper CA or managed certs in production.
- Ensure generated private keys are protected and not committed to VCS.
```

---

## extconfig.conf.md

```markdown
# extconfig.conf

**Purpose:** External configuration mapping — allows Asterisk to read certain config from external sources (ODBC, CSV, etc.).

**Notes:**
- Useful to store dynamic data (peers, voicemail) in DB instead of flat files.
- Ensure mapping matches expected table schemas and migrations.
```

---

## extensions.conf.md

```markdown
# extensions.conf

**Purpose:** Dialplan definitions — how calls are routed, IVR flows and call handling logic.

**Key sections:**
- `contexts` grouping extensions and routing rules
- `include` statements to compose dialplans

**Notes / Recommendations:**
- Keep heavy logic minimal in the core dialplan; call out to AGI/ARI for complex handling.
- Test dialplan changes in a staging environment; malformed dialplan can break call routing.
- Use comments and versioning for maintainability.
```

---

## http.conf.md

```markdown
# http.conf

**Purpose:** HTTP server configuration for Asterisk (needed for ARI, static files, and WebSocket interfaces).

**Key settings:**
- `enabled`, `bindaddr`, `bindport`
- TLS settings when serving secure endpoints

**Notes:**
- ARI and WebSocket connectivity depend on this service; ensure ports are open between Asterisk and backend/softphone.
- Use TLS for public-facing endpoints; manage certs with `keys/` and `create_cert.sh`.
```

---

## IVR_STATE_MANAGEMENT.md

````markdown
````markdown
# IVR State Management - Улучшения управления состоянием

## Обзор проблемы

До исправления при выполнении операций (создание, редактирование, удаление) происходил полный `reload()` всего дерева, что приводило к:
- ❌ Сбросу выбранного элемента
- ❌ Закрытию всех развернутых веток
- ❌ Потере позиции прокрутки
- ❌ Лишним запросам к API
- ❌ Плохому UX

## Решение

Реализовано **локальное управление состоянием** без полной перезагрузки данных.

... (full content moved)

````
````

---

## IVR_TREE_STRUCTURE.md

````markdown
````markdown
# IVR Tree Structure - Древовидная структура

## Обзор изменений

Модуль IVR теперь поддерживает **неограниченную вложенность** дочерних элементов. Каждый элемент может иметь свои дочерние элементы, которые в свою очередь также могут иметь детей, создавая многоуровневую иерархию.

... (full content moved)

````
````

---

## IVR_USER_GUIDE.md

````markdown
````markdown
# Руководство по использованию IVR модуля

## Быстрый старт

### Доступ к модулю
Модуль IVR доступен через боковое меню: `Меню → IVR`

... (full content moved)

````
````

---

## IVR_UX_IMPROVEMENTS.md

````markdown
````markdown
# IVR UX Improvements

## Обзор улучшений

Модуль управления IVR (Interactive Voice Response) был полностью переработан с учетом дизайн-системы проекта и современных UX-практик.

... (full content moved)

````
````

---

## keys.md

```markdown
# keys/

**Purpose:** Directory holding TLS certificates and private keys for Asterisk HTTP/WS/TLS endpoints.

**Notes / Recommendations:**
- Do not commit private keys to VCS. Use mount points for production certs.
- Rotate keys periodically and use secure permissions on filesystem.
```

---

## logger.conf.md

```markdown
# logger.conf

**Purpose:** Logging configuration for Asterisk (which logs are written where and rotation).

**Notes / Recommendations:**
- Configure separate logs for full verbose, console, and cron-friendly summaries.
- Use log rotation and ensure logs are mounted/persisted outside containers for troubleshooting.
```

---

## manager.conf.md

```markdown
# manager.conf

**Purpose:** Asterisk Manager Interface (AMI) configuration for event/action access.

**Key sections:**
- `general` for AMI listener settings
- `user` blocks defining credentials and permissions for AMI clients

**Notes / Recommendations:**
- Restrict AMI user privileges to only necessary actions.
- Rotate AMI credentials and avoid exposing AMI to untrusted networks.
- Backend uses AMI for some telephony controls — coordinate with ops for credentials.
```

---

## modules.conf.md

```markdown
# modules.conf

**Purpose:** Controls which Asterisk modules are loaded at startup.

**Notes:**
- Disable unused modules to reduce attack surface and memory usage.
- Be careful changing module order; missing modules can break features (e.g., ARI, chan_pjsip).
```

---

## musiconhold.conf.md

```markdown
# musiconhold.conf

**Purpose:** Configuration for music-on-hold classes and sources.

**Key settings:**
- `classes` definitions, file or streaming sources

**Notes:**
- Place media on shared storage or CDN for scale.
- Match sample rates/format to Asterisk expectations to avoid transcoding.
```

---

## pjsip_postgresql.sql.md

```markdown
# pjsip_postgresql.sql

**Purpose:** SQL schema and helper statements to provision PJSIP-related tables in PostgreSQL.

**Notes:**
- Use this schema when enabling DB-based provisioning / realtime.
- Review schema before applying to production DB; test in staging.
```

---

## pjsip.conf.md

```markdown
# pjsip.conf

**Purpose:** SIP channel driver configuration for PJSIP (endpoints, transports, aors, auths).

**Key sections:**
- `transport` definitions (UDP/TCP/TLS)
- `endpoint` and `aor` settings for peers and users
- `auth` blocks for credential storage

**Notes / Recommendations:**
- Keep credentials out of repo; use env or extconfigs for production secrets.
- Tune `rtp_engine` and codecs to match `rtp.conf` and TURN settings.
- Use `pjsip.d/` for per-endpoint dynamic fragments when provisioned programmatically.
```

---

## pjsip.d.md

```markdown
# pjsip.d/

**Purpose:** Directory of per-endpoint PJSIP fragments (commonly used for dynamic provisioning or DB-backed configs).

**Key notes:**
- Files here are commonly generated by provisioning scripts or DB exports.
- Useful for separating static base config (`pjsip.conf`) from generated peers.
- Avoid committing sensitive credential fragments to VCS.
```

---

## README-queues.md

```markdown
# README-queues

**Purpose:** Documentation for queue configuration and best practices for `extensions`/`queues` usage.

**Notes:**
- This file mirrors the existing repo `README-queues.md` in `asterisk-config/` and is kept here for consolidated docs.
- For detailed queue behavior, refer to the original file in `asterisk-config/`.
```

---

## res_pgsql.conf.md

```markdown
# res_pgsql.conf / res_odbc.conf / odbc.ini

**Purpose:** Database connector configurations for Asterisk (PostgreSQL/ODBC) used by CDR, CEL, and realtime modules.

**Key notes:**
- `res_pgsql.conf` configures PostgreSQL backend; `res_odbc.conf` and `odbc.ini` configure ODBC sources.
- `odbcinst.ini` contains driver definitions.

**Recommendations:**
- Keep DB credentials out of repo; use env or external secret stores.
- Test connectivity from container to DB; watch DNS and network timeouts.
```

---

## rtp.conf.md

```markdown
# rtp.conf

**Purpose:** RTP settings for media streams (port ranges, codecs behavior, and NAT traversal helpers).

**Key settings:**
- RTP port range, `rtpstart` / `rtpend`
- `icesupport` and `rtpkeepalive` tuning

**Notes:**
- Ensure RTP range matches firewall/NAT rules and TURN configuration.
- Adjust packetization and jitter settings for call quality tuning.
```

---

## sorcery.conf.md

```markdown
# sorcery.conf

**Purpose:** Sorcery config controls how Asterisk loads realtime resources (e.g., pjsip endpoints) from backends.

**Notes:**
- Often paired with database-backed provisioning; ensure mappings match `pjsip.d` or DB schemas.
- Useful for dynamic reconfiguration without full reloads.
```

---

## stun.conf.md

```markdown
# stun.conf

**Purpose:** STUN/TURN related configuration for NAT traversal used by WebRTC/softphone.

**Notes:**
- If TURN is used, ensure credentials and ports are configured correctly.
- The repo includes `turnserver/` for TURN service; coordinate settings between Asterisk, TURN and frontend softphone.
```

---

## extensions.conf.md (duplicate of earlier section)

```markdown
# extensions.conf

**Purpose:** Dialplan definitions — how calls are routed, IVR flows and call handling logic.

**Key sections:**
- `contexts` grouping extensions and routing rules
- `include` statements to compose dialplans

**Notes / Recommendations:**
- Keep heavy logic minimal in the core dialplan; call out to AGI/ARI for complex handling.
- Test dialplan changes in a staging environment; malformed dialplan can break call routing.
- Use comments and versioning for maintainability.
```

---

## extconfig.conf.md (duplicate of earlier section)

```markdown
# extconfig.conf

**Purpose:** External configuration mapping — allows Asterisk to read certain config from external sources (ODBC, CSV, etc.).

**Notes:**
- Useful to store dynamic data (peers, voicemail) in DB instead of flat files.
- Ensure mapping matches expected table schemas and migrations.
```

---

*End of consolidated asterisk-config documentation.*
