# Discovr mobile release

The app configuration is prepared for `in.expediva.discovr` on iOS and Android. Before the first public submission, the account owner must complete the external items that cannot be committed to source control:

- Accept the latest Apple Developer and Google Play agreements.
- Add iOS APNs and Android FCM credentials to the EAS project so Expo push tokens can be issued.
- Connect the App Store Connect app and Google Play service account to EAS Submit.
- Publish a privacy-policy URL and a support URL, then add them to both store listings.
- Complete the store data-safety/privacy forms for account details, contact information, photos, and user-submitted files.
- Capture final phone screenshots from the production build and complete content-rating declarations.
- Verify the production API, email delivery, Cloudinary authenticated delivery, deep links, and push on physical iOS and Android devices.
- Exercise the password-confirmed in-app account deletion flow against a production-like database and verify that the student cannot sign in again.

Release checks:

```sh
npm run verify
npm run export:android
npm run export:ios
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform android
npx eas-cli submit --profile production --platform ios
```

Production submission credentials belong in EAS/Apple/Google credential stores, never in this repository.
