---
applyTo: '**'
---

# AI Assistant Instructions for crm Monorepo

Purpose: Enable AI coding agents to contribute effectively to this Nx-based CRM monorepo (NestJS backend, Angular (Vite) frontend, Asterisk + TURN infra).
Keep responses concise, concrete, and aligned with existing patterns.

## 1. Architecture Overview
- Monorepo Tooling: Nx workspace (see `nx.json`, `project.json` in app folders). Two primary apps: `apps/back` (NestJS API) and `apps/front` (Angular 20 via Vite + Analog plugin). Shared libs folder currently minimal (`libs/` placeholder).
- Backend (`apps/back`): NestJS modular design. Root `AppModule` wires database (TypeORM Postgres, `synchronize: true`), Redis, RabbitMQ (RMQ microservice client), and feature modules aggregated in `apps/back/src/app/modules/index.ts` (`MODULES` array). Each feature module may export its own controllers/services/entities.
- Calls Domain: `CallsModule` manages dynamic PJSIP (Asterisk) configuration entities (`PsEndpoint`, `PsAor`, `PsAuth`) persisted via TypeORM.
- Frontend (`apps/front`): Angular standalone components + Material + Tailwind. Recently refactored WebRTC softphone implemented in `softphone` folder; complex component decomposed into presentational standalone components under `softphone/components`.
- Realtime / Telephony: External Asterisk server container (see `docker-compose.yml`) plus TURN server (`spreed/turnserver`). Browser softphone (JsSIP) connects via WebSocket (`ws://<host>:8089/ws`). TURN configured with static credentials (webrtc/webrtcpass) but ICE config currently commented out in TS.
- Infrastructure: `docker-compose.yml` orchestrates Postgres, Redis, RabbitMQ, TURN, custom Asterisk image, plus app containers. Backend built from repo `Dockerfile` (multi-stage not shown here) when run via compose.

## 2. Key Conventions & Patterns
- Feature Module Registration: Add any new backend module to `apps/back/src/app/modules/index.ts` so it auto-loads in `AppModule` via `...MODULES` spread.
- Entities & Migrations: Entities live inside their feature (e.g., `calls/entities`). Migrations for calls aggregated in `CALLS_MIGRATIONS` imported into `AppModule`. Keep new migrations exported via a similar constant and merged into TypeOrm config `migrations` array.
- TypeORM Config: Currently `synchronize: true` AND migrations run; avoid destructive schema changes—prefer explicit migrations if moving toward disabling synchronize in production.
- Microservices: RabbitMQ client registered via `ClientsModule.register`. New queues/services should define their own named client token and configuration inside module.
- Softphone Frontend: Use standalone Angular components; all new UI bits should also be `standalone: true` and imported in parent component `imports` array. Avoid NgModules for new front-end work unless needing shared providers.
- Styling: Tailwind utility classes + CSS variables (e.g., `var(--primary-color)`) unify theme; keep existing semantic class patterns.
- Status Management (Softphone): Maintain registration state; after a call ends or fails, status reverts to `Registered!` if UA still active.
- Logging: JsSIP debug explicitly disabled in `SoftphoneComponent` constructor. Avoid re-enabling unless adding a temporary debug flag.

## 3. Build & Run Workflows
- Local Dev (recommended): Run infrastructure: `npm run start:services` (spins up postgres, redis, rabbitmq, turn, asterisk). Then in separate terminals: `npm run start:back`, `npm run start:front`.
- Backend Build: `npm run build:back` (Nx target). Tests: `npm run test:back` (Jest, ts-jest transform). Coverage written to `coverage/apps/back`.
- Frontend Build: `npm run build:front`. Tests: `npm run test:front` (Vitest, config in `vite.config.mts`). Use `src/test-setup.ts` for globals.
- Adding Nx Target: Update corresponding `project.json` under the app or lib; follow existing structure (see `apps/back/project.json`).

## 4. Telephony Integration Details
- WebRTC Signaling: JsSIP UA connects to Asterisk via WS (port 8089). SIP realm equals Asterisk host (`127.0.0.1` by default).
- TURN Server: Config mounted at `./turnserver/data:/srv` (env-style). Static credentials; if you reintroduce ICE servers, use the commented block in softphone call options and ensure `USERNAME/PASSWORD` align with config.
- Asterisk Config: Mounted read-only from `asterisk-config/`. Avoid editing runtime inside container; change files in repo then recreate container.
- Disabled STUN in Asterisk to reduce call setup delay; rely on browser ICE gathering.
- PJSIP dynamic provisioning uses database entities (PsEndpoint etc.). Prefer updating via API rather than editing `pjsip.conf` directly when extending.

## 5. Error Handling & Status Patterns
- On call end/fail: do not force logout—keep UA for rapid subsequent calls.
- Registration failures surface cause; retain user credentials in component state for quick retry.
- Softphone timers: `callDuration` resets to `00:00` on end; any new call features (mute/hold) should toggle flags without resetting registration.

## 6. Adding New Backend Feature
1. Create module folder under `apps/back/src/app/modules/<feature>` with `entities`, `services`, `controllers`.
2. Export a `<Feature>Module` and add it to `MODULES` array.
3. If adding entities, rely on `autoLoadEntities: true` OR explicitly include in `TypeOrmModule.forFeature` inside your module.
4. For migrations, create migration file and aggregate into a `<FEATURE>_MIGRATIONS` constant; append into `AppModule` TypeORM config (mirroring calls module approach).

## 7. Adding New Frontend Feature
- Create a standalone component (e.g., `apps/front/src/app/<feature>/<feature>.component.ts` with `standalone: true`). Import directly where used.
- Keep logic (WebRTC, stateful services) inside a service injectable if multiple components will share it.
- Respect existing status and style conventions; reuse utility classes.

## 8. Code Quality & Linting
- ESLint config at root (`eslint.config.mjs`) + per-app overrides. Follow TypeScript strictness; avoid `any`—define lightweight interfaces like current JsSIP event wrappers.
- Prefer small focused components (as per refactored softphone) over monoliths.

## 9. Common Pitfalls / Gotchas
- Do NOT remove `Registered!` status maintenance logic—prevents forced relogin after hangup.
- Avoid enabling Asterisk STUN settings again unless network constraints demand; it reintroduces call setup delay.
- TURN config: mixing STATIC_AUTH_SECRET and static credentials causes 401; only one auth mode at a time.
- When adding new volumes or ports in `docker-compose.yml`, respect memory limits to avoid container OOM.

## 10. Example: Re-enabling ICE Servers (If Needed)
Inside softphone call options (currently commented):
```
'pcConfig': {
  iceServers: [
    { urls: [`stun:${this.asteriskHost}:3478`] },
    { urls: [
        `turn:${this.asteriskHost}:3478?transport=udp`,
        `turn:${this.asteriskHost}:3478?transport=tcp`
      ], username: 'webrtc', credential: 'webrtcpass' }
  ],
  rtcpMuxPolicy: 'require'
}
```
Ensure TURN container is healthy before enabling.

## 11. When Unsure
- Search within module directory for similar patterns (e.g., calls module) and mirror structure.
- Ask for clarification only if technical ambiguity blocks execution (e.g., missing domain model details).

---
Feedback welcome: highlight unclear sections or additional patterns to document.
