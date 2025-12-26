# Documentation Index

This directory centralizes project documentation. Use the links below to find guides, architecture notes and feature docs.

## Guides

- [GitHub instructions](.github/instructions/copilot-instructions.md)
- [Frontend guidelines](.github/instructions/frontend.md)
- [Angular best practices](.instructions/angular-best-practice.md)

## Backend (server)

- [Overview / README](apps/apps/back/src/app/modules/src/app/modules/README.md)
- [API & modules]
  - [ads-integration](apps/apps/back/src/app/modules/src/app/modules/ads-integration.md)
  - [ai](apps/apps/back/src/app/modules/src/app/modules/ai.md)
  - [ami](apps/apps/back/src/app/modules/src/app/modules/ami.md)
  - [ari](apps/apps/back/src/app/modules/src/app/modules/ari.md)
  - [call-scripts](apps/apps/back/src/app/modules/src/app/modules/call-scripts.md)
  - [calls](apps/apps/back/src/app/modules/src/app/modules/calls.md)
  - [comments](apps/apps/back/src/app/modules/src/app/modules/comments.md)
  - [companies](apps/apps/back/src/app/modules/src/app/modules/companies.md)
  - [contact-center](apps/apps/back/src/app/modules/src/app/modules/contact-center.md)
  - [contacts](apps/apps/back/src/app/modules/src/app/modules/contacts.md)
  - [deals](apps/apps/back/src/app/modules/src/app/modules/deals.md)
  - [ecommerce](apps/apps/back/src/app/modules/src/app/modules/ecommerce.md)
  - [forecasting](apps/apps/back/src/app/modules/src/app/modules/forecasting.md)
  - [integrations](apps/apps/back/src/app/modules/src/app/modules/integrations.md)
  - [ivr](apps/apps/back/src/app/modules/src/app/modules/ivr.md)
  - [ivr-media](apps/apps/back/src/app/modules/src/app/modules/ivr-media.md)
  - [leads](apps/apps/back/src/app/modules/src/app/modules/leads.md)
  - [marketing](apps/apps/back/src/app/modules/src/app/modules/marketing.md)
  - [notifications](apps/apps/back/src/app/modules/src/app/modules/notifications.md)
  - [pipeline](apps/apps/back/src/app/modules/src/app/modules/pipeline.md)
  - [promo-companies](apps/apps/back/src/app/modules/src/app/modules/promo-companies.md)
  - [reports](apps/apps/back/src/app/modules/src/app/modules/reports.md)
  - [shared](apps/apps/back/src/app/modules/src/app/modules/shared.md)
  - [sms](apps/apps/back/src/app/modules/src/app/modules/sms.md)
  - [tasks](apps/apps/back/src/app/modules/src/app/modules/tasks.md)
  - [user](apps/apps/back/src/app/modules/src/app/modules/user.md)

## Frontend (client)

- [Overview / README](apps/apps/front/src/app/src/app/README.md)
- [Auth](apps/apps/front/src/app/src/app/auth.md)
- [Calls / softphone](apps/apps/front/src/app/src/app/calls.md)
- [Components](apps/apps/front/src/app/src/app/components.md)
- [Contact center UI](apps/apps/front/src/app/src/app/contact-center.md)
- [Contacts](apps/apps/front/src/app/src/app/contacts.md)
- [Dashboard](apps/apps/front/src/app/src/app/dashboard.md)
- [Deals](apps/apps/front/src/app/src/app/deals.md)
- [Integrations](apps/apps/front/src/app/src/app/integrations.md)
- [IVR UI](apps/apps/front/src/app/src/app/ivr.md)
- [Leads](apps/apps/front/src/app/src/app/leads.md)
- [Login](apps/apps/front/src/app/src/app/login.md)
- [Pages](apps/apps/front/src/app/src/app/pages.md)
- [Pipeline](apps/apps/front/src/app/src/app/pipeline.md)
- [Promo companies](apps/apps/front/src/app/src/app/promo-companies.md)
- [Services](apps/apps/front/src/app/src/app/services.md)
- [Shared utilities](apps/apps/front/src/app/src/app/shared.md)
- [Sidebar](apps/apps/front/src/app/src/app/sidebar.md)
- [Softphone details](apps/apps/front/src/app/src/app/softphone.md)
- [Tasks](apps/apps/front/src/app/src/app/tasks.md)
- [Users](apps/apps/front/src/app/src/app/users.md)

## Asterisk / Telephony

- [Asterisk config notes](asterisk-config/README-queues.md)
- [pjsip.conf](asterisk-config/pjsip.conf.md)
- [pjsip.postgresql.sql](asterisk-config/pjsip_postgresql.sql.md)
- [extensions.conf](asterisk-config/extensions.conf.md)
- [http.conf](asterisk-config/http.conf.md)
- [manager.conf](asterisk-config/manager.conf.md)
- [rtp.conf](asterisk-config/rtp.conf.md)
- [stun.conf](asterisk-config/stun.conf.md)
- [keys](asterisk-config/keys.md)

## Load tests

- [K6 full run](load-tests/k6/full-load-test-results.md)
- [K6 smoke](load-tests/k6/smoke-test-results.md)

## Root / Project notes

- [Roadmap](root/ROADMAP.md)
- [JWT Auth guide](root/JWT_AUTH_GUIDE.md)
- [Notifications readme](root/NOTIFICATIONS_README.md)
- [IVR guides and UX](root/IVR_USER_GUIDE.md)

---

If you'd like, I can:

- generate a flat numeric TOC for each folder (per-module TOC files),
- remove `docs/apps/` if empty, or
- extract API endpoints and examples into the backend module READMEs.
