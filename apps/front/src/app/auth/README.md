# Frontend: Auth

**Purpose:** UI flows for authentication (login/logout, session handling, MFA if any).

**Key responsibilities:**
- Login page and form validation
- Token storage (JWT) handling and session renewal
- Redirects and guarded routes for protected pages

**Notes:** Integrates with backend auth endpoints; ensure secure storage (no localStorage for sensitive tokens unless justified).