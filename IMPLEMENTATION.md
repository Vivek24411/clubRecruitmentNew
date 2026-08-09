# Club Recruitment implementation guide

## What the app now supports

- Students can discover active clubs, events, and sessions; register individually or as a team; manage invitations; track application rounds and final status; receive in-app notifications; update their profile/password; and RSVP or join a session waitlist.
- Clubs can manage event and session lifecycles, edit details, review/search/filter applications, store private notes and scores, perform bulk status updates, schedule and clear rounds, export safe CSV files, and record attendance.
- Administrators can moderate clubs, students, events, and sessions; suspend accounts and revoke sessions; reset club passwords; control the recruitment cycle; and inspect audit logs.

## Required backend configuration

Set these values in the deployment environment (never commit them):

- `MONGODB_URI`
- `JWT_SECRET` (at least 32 random characters in production)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH` (a bcrypt hash; plaintext `ADMIN_PASSWORD` is development-only)
- `ALLOWED_ORIGINS` (comma-separated exact frontend origins, without paths)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional; defaults to `Recruit IITR <noreply@devx.live>`)
- `STUDENT_APP_ORIGIN` (optional, used to create links in notification emails)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
- `TRUST_PROXY_HOPS` when the deployment is behind a non-standard number of trusted proxies (production defaults to `1`)

Production authentication uses Secure, HttpOnly cookies. Every frontend must use HTTPS and point `VITE_BASE_URI` to the backend origin. If the proxy topology changes, review Express's `trust proxy` value before deployment because it controls client-IP rate limiting.

## Existing database upgrade

Back up the database, deploy the new code, and run this once from `backend/`:

```sh
npm run migrate:v2
```

The migration is idempotent. It backfills event deadlines and event memberships, records legacy withdrawn applications, reconciles RSVP counters, removes the obsolete session TTL index, and creates the new history/rate-limit indexes. Conflicting legacy team memberships are retained deterministically and reported for manual review.

## Demo data for testing

The demo seeder creates four students, two clubs, three events, two sessions, team and individual applications, RSVPs, and notifications. It only upserts reserved `.example.test` identities and records prefixed with `[Demo]`, so rerunning it does not create duplicates. Email notifications are disabled for the demo students.

Review the configured `MONGODB_URI`, then explicitly confirm the target and run:

```sh
cd backend
ALLOW_DEMO_SEED=true npm run seed:demo
```

Default test credentials are printed after a successful run. Override them with `DEMO_PASSWORD` and `DEMO_CLUB_PASSWORD` when needed. The dummy email addresses are intended for login and UI testing; they intentionally cannot receive password-reset email.

## Verification commands

```sh
cd backend && npm test
cd ../student && npm run lint && npm run build
cd ../club && npm run lint && npm run build
cd ../admin && npm run lint && npm run build
```
