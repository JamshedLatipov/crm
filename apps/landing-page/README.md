Landing page for CRM — single-page marketing site

Overview

This folder contains a small Vue-based single-page marketing site for the CRM. It's purposely simple so you can preview the new one-pager locally using Vite (the project already includes it via Nx).

How to run locally

# From repo root
# 1) Install dependencies (if not already)
npm install

# 2) Run the landing-page app with Nx (preferred)
# This will start the Vite dev server for the app
npx nx serve landing-page

# Or directly with pnpm/npm if you prefer:
# cd apps/landing-page
# npm run dev

Notes

- The landing page component lives at `apps/landing-page/src/app/NxWelcome.vue` and is intentionally self-contained.
- The contact form is a static form (no backend). Wire it to your API or analytics as needed.
- The page uses the existing `styles.scss` file and scoped styles inside the component.

Next steps

- Hook the contact form to a lead capture endpoint or mailing list.
- Replace the placeholder logo and screenshots with your real assets.
- Add analytics/tracking snippets as required.
