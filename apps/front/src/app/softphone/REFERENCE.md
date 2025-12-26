# Softphone — Reference & Usage

Source folder: `apps/front/src/app/softphone`

Purpose: WebRTC/JsSIP-based softphone UI for agents.

Key files:
- `softphone.component.ts` — UI + call lifecycle
- `softphone.service.ts` — JsSIP UA wrapper, registration, call API
- `softphone.html` / `.scss` — templates and styles

Usage (component):
- Selector: `<app-softphone></app-softphone>` (confirm in `*.component.ts`)

Configuration:
- SIP / JsSIP settings come from environment config (SIP server, user, password)
- ICE servers / TURN configured in `softphone.service.ts` options

Troubleshooting:
- Ensure TURN server reachable; check console for JsSIP UA logs
- Keep UA registered after call end — the service keeps UA alive by design

If you want, I can extract exact selector, input/output bindings and example initialization from the component files.
