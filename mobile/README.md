# Discovr student mobile app

Expo SDK 57 / React Native student client for the existing Discovr API. Club and admin workflows remain in their web applications.

## Current student feature set

- Public dashboard, club directory, recruitment events, and information sessions with mobile search, category/status/type filters, and correct upcoming/past classification
- Event, session, and club detail screens
- Student login and OTP-based account registration, with the access token held in the device secure store
- Eligibility-aware event and vertical applications, including withdrawal, team naming, invitations, member removal, captain transfer, and leaving a team
- Application history and exact round progress, schedules, results, native Cloudinary-backed submissions, and existing submission review
- Alerts with unread counts, per-alert navigation, and read/read-all actions
- Editable profile photo, name, phone number, in-app/email preferences, and password change
- Session RSVP/cancellation, capacity, seat availability, and accurate live/upcoming/past states
- Production API default with an environment override

Native push-token registration and password recovery remain future mobile-specific slices; in-app alerts and notification preferences already use the website backend.

## Run locally

```bash
cp .env.example .env.local
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL` in `.env.local` when testing against another backend. The checked-in default and example point to `https://discovr-api.iitr.ac.in`; Expo public variables are bundled into the app and must never contain secrets.

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npx expo export --platform android
```

The application identifiers are `in.expediva.discovr` on Android and iOS. Store signing credentials and service-account files must not be committed.
