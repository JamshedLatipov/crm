NOTE: Repository policy forbids creating `.md` files. Created `agents.txt` as an alternative containing the requested content.

---

Contents from .github/instructions/copilot-instructions.md

---

```text
---
applyTo: '**'
---

# AI Assistant Instructions for crm Monorepo

## Purpose
This guide enables AI coding agents to work productively in the crm_mono Nx monorepo. It covers architecture, workflows, conventions, and integration points specific to this project.

## 1. Architecture Overview

### Big Picture
- Nx monorepo: `apps/back` (NestJS API), `apps/front` (Angular 20 + Vite), minimal `libs/` for shared code.
- Backend: Modular NestJS, TypeORM (Postgres), Redis, RabbitMQ, feature modules in `apps/back/src/app/modules/`, dynamic Asterisk config via CallsModule.
- Frontend: Standalone Angular components, Material, Tailwind, WebRTC softphone in `softphone/`.
- Telephony: JsSIP softphone connects to Asterisk via WS, TURN server for ICE, configs in `docker-compose.yml` and `asterisk-config/`.
- Infrastructure: Docker Compose for all services, K8s manifests in `k8s/`.

## 2. Key Conventions & Patterns

### Patterns & Conventions
- Backend modules: Register in `apps/back/src/app/modules/index.ts` for auto-loading.
- Entities/migrations: Entities per feature, migrations aggregated and exported as constants (see CallsModule).
- TypeORM: `synchronize: true` and migrations run; avoid destructive schema changes.
- RabbitMQ: Register clients via `ClientsModule.register`, use named tokens/configs per queue.
- Frontend: Use standalone Angular components, import via `imports` array, avoid NgModules unless needed for providers.
- Styling: Tailwind + CSS variables, semantic class names.
- Softphone: Always maintain `Registered!` status after call end/fail if UA active.

## 3. Build & Run Workflows

### Developer Workflows
- Start infrastructure: `npm run start:services` (Postgres, Redis, RabbitMQ, TURN, Asterisk)
- Start backend: `npm run start:back`
- Start frontend: `npm run start:front`
- Build backend: `npm run build:back`
- Build frontend: `npm run build:front`
- Test backend: `npm run test:back` (Jest)
- Test frontend: `npm run test:front` (Vitest)
- Coverage: `coverage/apps/back` for backend
- Add Nx targets: update `project.json` in app/lib folder

## 4. Telephony Integration Details

### Integration Points
- WebRTC: JsSIP UA connects to Asterisk via WS (`ws://<host>:8089/ws`), SIP realm = Asterisk host
- TURN: Static credentials, config in `turnserver/`, ICE config commented in softphone TS
- Asterisk: Configs in `asterisk-config/`, read-only mount, update via repo then recreate container
- PJSIP: Dynamic provisioning via DB entities, update via API not config files

## 5. Error Handling & Status Patterns

### Status & Error Handling
- Softphone: On call end/fail, do NOT force logout; UA stays active for quick calls
- Registration failures: Show cause, keep credentials for retry
- Timers: `callDuration` resets on end; mute/hold toggles flags only

## 6. Adding New Backend Feature

### Adding Backend Features
1. Create `apps/back/src/app/modules/<feature>` with `entities`, `services`, `controllers`
2. Export `<Feature>Module`, add to `MODULES` in `index.ts`
3. Entities: use `autoLoadEntities: true` or `TypeOrmModule.forFeature`
4. Migrations: create file, export constant, append to TypeORM config

## 7. Adding New Frontend Feature

### Adding Frontend Features
- Shared logic: use injectable service
- Follow status/style conventions, reuse utility classes
- Каждый компонент должен создаваться в отдельной папке: `apps/front/src/app/<feature>/<component>/`
- В папке компонента обязательно должны быть три файла: `<component>.component.ts`, `<component>.component.html`, `<component>.component.scss`
- Используйте `standalone: true`, импортируйте компонент напрямую
- Общую логику выносите в сервисы
- Соблюдайте существующие статусные и стилевые паттерны, используйте утилитные классы
- Активно используйте Angular signals для управления состоянием компонентов.
- Для передачи данных между компонентами применяйте новый input/output API (`input()`, `output()`, сигналы) вместо старого (`@Input()`, `@Output()`).


## 8. Code Quality & Linting

### Code Quality
- ESLint: root config + per-app overrides
- TypeScript strictness, avoid `any`, use lightweight interfaces
- Prefer small focused components (see softphone refactor)
- Активно используйте Angular signals для управления состоянием компонентов.
- Для передачи данных между компонентами применяйте новый input/output API (`input()`, `output()`, сигналы) вместо старого (`@Input()`, `@Output()`).


## 9. Common Pitfalls / Gotchas

### Common Pitfalls
- Never remove `Registered!` status logic in softphone
- Do not enable Asterisk STUN unless required
- TURN: use only one auth mode (static or secret)
- Docker Compose: respect memory limits for new volumes/ports

## 10. Example: Re-enabling ICE Servers (If Needed)

### Example: ICE Servers
Softphone call options (commented):
```ts
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
Enable only if TURN is healthy.

## 11. When Unsure

### When Unsure
- Search module directory for similar patterns (e.g., CallsModule)
- Mirror structure and conventions
- Ask for clarification only if technical ambiguity blocks progress

---
#### Examples from README and modules
- Leads module: supports webhooks for Zapier, Facebook, Google Ads, MailChimp (see `apps/back/src/app/modules/leads/README.md`)
- Users page: search by name/email/phone, role management (see `apps/front/src/app/pages/users/README.md`)
- Deal status: presentational components, semantic Tailwind classes (see `apps/front/src/app/shared/components/deal-status/README.md`)

---
Feedback welcome: highlight unclear or incomplete sections for improvement.

---
Feedback welcome: highlight unclear sections or additional patterns to document.
```

---

Contents from .github/instructions/do-not-create-md.instructions.md

---

```text
---
applyTo: '**'
---
```
\n\nNOTE: Documentation consolidated under the docs/ directory (see docs/README.md).
