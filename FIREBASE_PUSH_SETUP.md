# Firebase Cloud Messaging setup

Discovr uses Firebase Cloud Messaging (FCM) only as a push transport. MongoDB remains the source of truth for students, notification history, and browser registrations. Push delivery runs through the existing backend job worker.

## 1. Firebase project

1. Create or select a Firebase project.
2. Add a Web app in **Project settings → General** and copy its public Firebase configuration.
3. In **Project settings → Cloud Messaging → Web configuration**, create a Web Push certificate and copy its public VAPID key.
4. Ensure the **FCM Registration API** is enabled for the Google Cloud project.
5. In **Project settings → Service accounts**, generate a private service-account key for the backend.

The Web app configuration and VAPID public key are safe to expose to the browser. The service-account JSON is a secret and must only be configured on the backend/worker.

## 2. Student frontend environment

Configure these variables in the student frontend deployment and local `student/.env`:

```text
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

Redeploy the student frontend after changing any `VITE_` variable because Vite embeds them during the production build.

## 3. Backend and worker environment

Use Node.js 22 or newer. Configure the API and the job worker with the same values:

```text
PUSH_NOTIFICATIONS_ENABLED=true
FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_BASE64=...
STUDENT_APP_ORIGIN=https://your-student-domain.example
```

Create `FIREBASE_SERVICE_ACCOUNT_BASE64` without putting the JSON in source control:

```bash
base64 -w 0 firebase-service-account.json
```

On macOS, use `base64 < firebase-service-account.json | tr -d '\n'`.

Alternatively, the backend supports `FIREBASE_SERVICE_ACCOUNT_JSON`, separate `FIREBASE_CLIENT_EMAIL` plus `FIREBASE_PRIVATE_KEY`, or Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`.

## 4. Database and processes

After deploying the backend code, create the push-registration indexes once:

```bash
npm run migrate:v7
```

Run the worker continuously:

```bash
npm run worker
```

For production, set `RUN_JOBS_IN_API=false` on the API process when a separate worker is running. This prevents both processes from polling unnecessarily; job claiming is still atomic if both are temporarily active during a rollout.

## 5. Verification

1. Sign in as a student over HTTPS.
2. Open **Profile and settings** and select **Enable browser notifications**.
3. Allow the browser permission prompt.
4. Trigger a test notification from a club action.
5. Confirm the in-app record and email are created, then close or background the student website and trigger another notification.
6. Clicking the browser notification should open the relevant Discovr event, session, application, or notifications page.

Explicit sign-out detaches the browser installation from that student account. Signing in again automatically refreshes the installation mapping when browser permission is already granted.

## Troubleshooting

- `FIREBASE_PROJECT_ID` must exactly match `project_id` in the backend service-account JSON. The API now refuses to start when these values differ.
- In Brave, enable **Settings → Privacy and security → Use Google Services for Push Messaging**, restart Brave, and then enable notifications again. Site permission showing **Allowed** is not sufficient when Brave's push service is disabled.
- A failed FCM response is not recorded as delivered. The job remains retryable and its `lastError` contains the Firebase failure instead.
- After changing backend environment variables, restart both the API and the separate worker process.
