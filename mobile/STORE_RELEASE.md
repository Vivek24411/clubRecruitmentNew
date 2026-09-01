# Discovr mobile store release guide

Last verified: 1 September 2026.

This project is an Expo SDK 57 app. SDK 57 targets Android API 36 and uses Xcode 26.4 or later, which meets the Google Play requirement effective 31 August 2026 and Apple's Xcode 26 / iOS 26 SDK requirement effective 28 April 2026.

## Release identity

| Item | Value |
| --- | --- |
| App name | Discovr |
| Expo slug | `discovr-student` |
| Android package | `in.expediva.discovr` |
| iOS bundle ID | `in.expediva.discovr` |
| Current marketing version | `1.0.0` |
| EAS project ID | `2bfabc19-0f4f-4f1b-9163-1fad89c369fa` |
| Production API | `https://discovr-api.iitr.ac.in` |

Do not create a second Play Console or App Store Connect record with a different identifier. Package and bundle identifiers cannot be changed after publication.

## APK, AAB, and IPA: which artifact to use

- `preview` Android builds produce a signed `.apk`. Use this only for direct installation and physical-device QA.
- `production` Android builds produce a signed `.aab`. Google Play requires the AAB; an APK cannot be submitted as the store release.
- `production` iOS builds produce a signed `.ipa`. Upload it to App Store Connect, then distribute it through TestFlight or App Review.

The profiles are already defined in `mobile/eas.json`. EAS owns remote build-number/version-code auto-incrementing.

## External prerequisites

Complete these with accounts owned by IIT Roorkee/E-Cell rather than a departing student's personal account where possible.

1. Enroll in a Google Play/Android Developer account. Full distribution currently has a one-time USD 25 fee. See [Android Developer account setup](https://support.google.com/android-developer-console/answer/16604405?hl=en).
2. Enroll in the [Apple Developer Program](https://developer.apple.com/help/account/membership/program-enrollment). It is USD 99 per membership year; accredited educational institutions may request a fee waiver. Enrollment in India is completed through the Apple Developer app.
3. Accept every pending legal agreement in Play Console and App Store Connect.
4. Publish permanent HTTPS pages for:
   - privacy policy;
   - support/contact information;
   - account-deletion request/help.
5. Create store-owned email aliases for support, privacy, and release notifications.
6. Add Android FCM and iOS APNs credentials to the EAS project and verify push notifications on physical devices.
7. Keep signing keys, App Store Connect API keys, and Google service-account JSON files in EAS/store credential storage. Never commit them.

The privacy/support URLs are release blockers: both stores require them, and Discovr does not currently expose dedicated public routes for these pages.

## Release candidate checks

Use Node 22.13 or newer for Expo SDK 57.

```bash
cd mobile
npm ci
npm run verify
npm test
npm run export:android
npm run export:ios
```

Also verify against production on real Android and iPhone devices:

- public Home, Events, Sessions, Clubs, Calendar, search, and pagination;
- login, registration, forgot-password, and logout;
- individual and team applications, invitations, withdrawal, and round submissions;
- file/photo upload and authenticated download;
- session RSVP/cancellation and seat counts;
- in-app alerts, Android push, and iOS push;
- calendar save/export and deep links;
- profile editing and password-confirmed permanent account deletion;
- offline, slow-network, expired-session, and denied-notification states.

Do not submit a build unless `https://discovr-api.iitr.ac.in/ping` and `/ping/db-health` are healthy.

## Create and distribute the Android APK

The checked-in `preview` profile already contains `android.buildType: "apk"` and the production API URL.

```bash
cd mobile
npx eas-cli@22.2.0 build --platform android --profile preview --non-interactive --wait
```

Download the artifact from the URL printed by EAS or from the project's EAS Builds page. Keep a release copy named like `discovr-1.0.0-preview-<build>.apk`, then record its checksum:

```bash
sha256sum discovr-1.0.0-preview-<build>.apk
```

Install it on a physical device with the EAS link or `adb install path/to/file.apk`. Confirm the package is `in.expediva.discovr` and that it calls the production API.

## Google Play publication

Google's current app-creation flow is documented in [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en-EN). Google Play distributes optimized APKs from one uploaded AAB.

### 1. Create the Play Console record

In Play Console select **Home > Create app**:

- Name: `Discovr`
- Default language: English (India) or English (United Kingdom)
- Type: App
- Pricing: Free
- Contact email: an institution-controlled support address
- Accept the policy, export-law, and Play App Signing declarations.

Choose Google-managed Play App Signing. Preserve the upload-key access held by EAS.

### 2. Prepare the main store listing

Suggested listing copy:

- Short description: `Discover IIT Roorkee clubs, recruitment events, sessions, and deadlines.`
- Full description: explain club discovery, recruitment applications, team workflows, round tracking, sessions/RSVPs, calendar, and alerts. Do not promise features that are not in the production build.

Required/recommended assets are listed in [Google Play preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en):

- 512 × 512 PNG app icon, at most 1 MB;
- 1024 × 500 JPEG or 24-bit PNG feature graphic without alpha;
- at least two phone screenshots; use 4–8 production screenshots showing Home, recruiting clubs, club directory/search, square event artwork, application progress, Calendar, Sessions, and Profile;
- optional preview video.

Do not put real student names, email addresses, phone numbers, enrollment numbers, push tokens, application results, or private submissions in screenshots.

### 3. Complete Play Console app-content declarations

Complete every item shown on **Policy and programs > App content**, including:

- privacy policy URL;
- app access: provide a stable reviewer account and clear steps to reach authenticated application features;
- ads: declare no ads unless this changes;
- content rating questionnaire;
- target audience and content;
- news, government, health, and financial-feature declarations as applicable (normally “No” for Discovr);
- Data safety;
- account deletion URL and in-app deletion path;
- sensitive-permission declarations if Play Console asks for one.

Discovr requests notifications and photo/document selection for user-initiated profile/submission uploads. Explain those purposes accurately.

### 4. Complete Data safety accurately

Google requires the Data safety form for closed, open, and production tracks. Review the app, backend, Firebase, Cloudinary, and email provider before answering; third-party SDK behavior must also be covered. See [Google's Data safety instructions](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

At minimum, evaluate and disclose these Discovr data categories:

- personal information: name, IITR email, optional phone number;
- user IDs/academic identifiers: account ID, enrollment number, programme, branch, year;
- photos: optional profile picture;
- files/documents and user-generated content: recruitment answers and uploaded submissions;
- app activity: applications, team membership, round status, session RSVPs, saved calendar items, and notification state;
- device/other identifiers: push-registration token and basic operational/security logs.

State the real purposes (account management, app functionality, communications, security/fraud prevention), whether each field is optional, whether data is linked to identity, whether service providers count as sharing under Google's definitions, encryption in transit, and the deletion process. The product owner—not the build engineer—must approve the final legal declarations.

Google requires apps that create accounts to provide an in-app deletion path and a web deletion resource. Discovr already has password-confirmed deletion under **Profile > Delete account**; publish the companion web help/request URL before submission. See [Google's account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en-EN).

### 5. Build the store AAB

Expo SDK 57 targets API 36, meeting Google's requirement effective 31 August 2026. Confirm the current rule before every release in [Google's target API policy](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

```bash
cd mobile
npx eas-cli@22.2.0 build --platform android --profile production --non-interactive --wait
```

This must produce an `.aab`, not an APK. Download and archive the AAB and its SHA-256 checksum.

### 6. Upload and test

For the first release, either upload the AAB manually under **Testing > Internal testing > Create release**, or configure a Google service account in EAS and submit with:

```bash
npx eas-cli@22.2.0 submit --platform android --profile production --latest
```

EAS submission requirements and service-account setup are documented in [Expo's Android submission guide](https://docs.expo.dev/submit/android/). Keep the initial release on the internal track until physical-device QA passes.

If the Play developer account is a personal account created after 13 November 2023, Google requires a closed test with at least 12 opted-in testers continuously for 14 days before production access can be requested. See [Google's testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

### 7. Release to production

1. Resolve every Dashboard task and pre-launch report issue.
2. Promote the verified testing release to Production.
3. Add release notes.
4. Prefer a staged rollout, monitor crashes/ANRs and API metrics, then increase to 100%.
5. From 30 September 2026, ensure the package is registered under Android developer verification; see [package-name registration](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en).

## Apple App Store publication

Apple's overall flow is: build a signed IPA, upload it to App Store Connect, test through TestFlight, complete metadata/privacy, select the processed build, and submit it to App Review.

### 1. Prepare Apple ownership and identifiers

1. Enroll the institution or legal entity in the Apple Developer Program. Organization enrollment requires the legal entity and usually a D-U-N-S number.
2. Accept agreements in App Store Connect.
3. Register/confirm bundle ID `in.expediva.discovr`.
4. Enable Push Notifications for the identifier.
5. Add an App Store Connect app record named `Discovr` with the same bundle ID, SKU, primary language, and the appropriate Education/Productivity category.
6. Give the release operator Account Holder/Admin/App Manager permissions as required.

### 2. Configure signing and APNs in EAS

```bash
cd mobile
npx eas-cli@22.2.0 credentials --platform ios
```

Let EAS manage the distribution certificate and provisioning profile unless the institution has an established signing process. Add the APNs key required for push. App Store Connect submission can use an Apple login or, preferably, a least-privilege App Store Connect API key stored by EAS.

### 3. Build the production IPA

Since 28 April 2026, Apple requires uploads built with Xcode 26 or later and an iOS 26 SDK. Expo SDK 57's default EAS image meets this requirement. Verify the current rule at [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/).

```bash
cd mobile
npx eas-cli@22.2.0 build --platform ios --profile production --non-interactive --wait
```

If non-interactive signing fails on the first build, run the same command interactively once so the account owner can approve certificate/profile creation and Apple two-factor authentication.

### 4. Upload to App Store Connect and TestFlight

```bash
npx eas-cli@22.2.0 submit --platform ios --profile production --latest
```

The processed build appears in TestFlight; it is not automatically released to the App Store. Apple documents the workflow in [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/). Add internal testers first, then external testers if required. TestFlight builds expire after 90 days.

Test the same production checklist on at least one current iPhone and the oldest supported iOS version available to the team. Verify APNs separately; Android push success does not validate iOS credentials.

### 5. Complete App Store metadata

App Store Connect requires the app/version information described in [Apple's property reference](https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties):

- app name and subtitle (each up to 30 characters);
- description (up to 4,000 characters) and keywords (up to 100 bytes);
- primary category, copyright, availability, and price;
- privacy policy URL and support URL containing real contact information;
- age-rating questionnaire;
- export-compliance answers;
- App Review contact, notes, and a stable reviewer account;
- release mode: manual, automatic after approval, or scheduled/phased as appropriate.

For App Review notes, state that public discovery works without login, while applications, teams, submissions, RSVP management, Calendar saves, alerts, profile editing, and deletion require the supplied student reviewer account. Explain how to reach an open demo event and submission flow.

### 6. Add App Store screenshots

Apple accepts one to ten screenshots per device class in JPEG/JPG/PNG without transparency. Use accurate production UI and the highest-resolution required iPhone size so App Store Connect can scale it where allowed. Consult [Apple's current screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) before capture because accepted device sizes change.

Recommended sequence:

1. Home and clubs recruiting now;
2. searchable club directory with category totals;
3. club profile/logo/banner;
4. square event detail and application deadline;
5. application/round tracking;
6. Sessions and RSVP;
7. Calendar/deadlines;
8. Alerts and Profile controls.

Use a dedicated demo account and synthetic data only.

### 7. Complete App Privacy and account deletion

Apple requires privacy details covering the app and its third-party SDKs. Use the same verified inventory listed for Google, then classify whether each data type is collected, linked to identity, or used for tracking. Discovr should not claim “Data Not Collected.” See [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/).

Add the privacy-policy URL under **App Privacy**. Apple also requires apps supporting account creation to let users initiate full deletion in the app; Discovr's Profile deletion flow must remain visible and functional. See [Apple's account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app).

Complete the current age-rating questionnaire. An unrated app cannot be published; see [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/).

### 8. Submit for App Review

1. In the iOS version page, select the processed production build.
2. Resolve export-compliance and missing-compliance warnings.
3. Verify screenshots, metadata, privacy, review account, URLs, and release setting.
4. Select **Add for Review**, open the draft submission, and select **Submit for Review**. See [Apple's submission steps](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/).
5. Monitor App Review messages. Reply with precise navigation/testing instructions; if code changes are required, increment the build number and upload a new build.

## Every subsequent release

1. Update `expo.version` only for a user-visible release; EAS auto-increments native build numbers.
2. Update release notes and re-run all release checks.
3. Deploy/verify the compatible backend before releasing a client that depends on new API fields.
4. Build new production AAB/IPA files; never reuse a version code/build number.
5. Test through Play internal/closed testing and TestFlight.
6. Recheck privacy/data-safety declarations whenever SDKs or collected data change.
7. Stage production rollout and monitor API health, queue health, crashes, push delivery, and user support.

## Credential and artifact retention

- EAS/store credential vaults: Android upload keystore, APNs key, iOS distribution certificate/profile, App Store Connect API key, Google service-account key.
- Institution password manager: account recovery details and role ownership.
- Release archive: source commit, EAS build URL/ID, APK/AAB/IPA checksum, store version/build numbers, release notes, approval dates, and rollout notes.
- Repository: configuration and documentation only—never signing keys, `.env` files, service-account JSON, or reviewer passwords.

Official Expo references: [APK builds](https://docs.expo.dev/build-reference/apk/), [Android submission](https://docs.expo.dev/submit/android/), [iOS/TestFlight submission](https://docs.expo.dev/submit/testflight/), and [store submission overview](https://docs.expo.dev/deploy/submit-to-app-stores/).
