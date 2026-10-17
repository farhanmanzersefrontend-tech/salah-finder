# Awqat Al-Salah

Awqat Al-Salah is a prayer companion with prayer times, Quran reading, Qibla direction, duas, and daily prayer tracking. Built with React, TypeScript, and Vite.

## Azan playback and mobile notifications

While the web app is running, automatic azan displays the salah name and a popup with **Mute this azan** and **Turn off automatic azan**. With notification permission, it also shows a system notification with a mute action on supported browsers. Lock-screen media controls can stop playback where supported. HTTPS is required for the notification service worker; localhost also works for development.

Closing or suspending the web app can stop its scheduler. The service worker handles notification actions; it does not schedule closed-app azan, and this project has no Web Push subscription backend. Enabling mobile data alone cannot provide closed-app playback.

Closed-app reminders require a deployed push backend and subscriptions, or native scheduled notifications. Full background azan on Android needs a native alarm/playback implementation and foreground media service. iPhone notification sounds must be shorter than 30 seconds; a full recitation cannot be promised as an ordinary closed-app notification. Native Android/iOS projects and signing are not configured in this repository.

References: [Web background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation), [Android background playback](https://developer.android.com/media/media3/session/background-playback), [Apple notification sounds](https://developer.apple.com/documentation/usernotifications/unnotificationsound).

Run `node scripts/check-prayer-settings.mjs` and `node scripts/check-notification-actions.mjs` to check scheduling, mute controls, and notification actions without sending real notifications.

## Visitor count on Vercel

The home footer displays a shared visit total from `/api/visitors`. Each browser starts a new visit on opening the app after its 30-minute visit window expires. Refreshes and repeat opens within that window reuse an anonymous random ID. This counts visits, not distinct people or currently online users. No name, IP address, or location is stored by the counter. Clearing browser storage can start another visit.

Before deploying:

1. Connect an Upstash Redis database to the Vercel project through the Marketplace.
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the project's server environment variables. The integration's `KV_REST_API_URL` and `KV_REST_API_TOKEN` names also work. See `.env.example`; never expose the token with a `VITE_` prefix.
3. Redeploy. The first visit creates the total automatically. Production and preview totals are separate. An optional `VISITOR_COUNTER_KEY` overrides the storage namespace.

The total is persistent in Redis, and an atomic Lua operation prevents duplicate increments for the same visit ID, including concurrent requests and retries. Deduplication IDs expire after 24 hours; the total does not expire. The displayed total is fetched when the app opens. If the API is unavailable or unconfigured, the footer says "Visitor count unavailable" instead of showing a fabricated number.

`npm run dev` also serves `/api/visitors` through a development middleware that runs the same handler used in production. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env.local` to use real storage locally; they remain server-only. Restart Vite after changing them. `vercel dev` is also supported. Run `node scripts/check-visitors.mjs` for mocked API and browser-session checks and `node scripts/check-visitor-dev.mjs` for the local route integration check. Live Redis/Vercel verification still requires the database connection. The UI retries an unavailable counter every 30 seconds and when the browser reconnects.

References: [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## Day and night appearance

Use the sun/moon switch beside **Your space** in Profile. The preference is saved on this device and applies across the app, independently of the selected scenery theme.

## Google sign-in on Profile

The **Continue with Google** button uses Firebase Authentication for both new and returning users. A signed-in profile shows the Google display name, photo, email, and a Sign out button. Firebase restores the login on subsequent visits. Prayer tracking and reading progress remain stored locally on the device; this change does not add account-based cloud sync.

The button starts the popup directly from the click. When the browser blocks popups, it falls back to Google's same-tab redirect flow and processes the result on return. For hosting on a domain other than the Firebase auth domain, follow [Firebase's redirect hosting guidance](https://firebase.google.com/docs/auth/web/redirect-best-practices) so browsers that block third-party storage can restore the session.

The supplied public Firebase web configuration for `awqat-al-salah` is built into the app, so local and deployed builds use the same project even without environment variables. The four `VITE_FIREBASE_*` fields can override it; a different project ID requires all four fields.

To configure the Firebase project:

1. Create a project at [Firebase Console](https://console.firebase.google.com/), then register a **Web app** using the `</>` icon in Project settings.
2. Open **Authentication**, get started, and enable **Google** under **Sign-in method**. Select your support email and save. No email/password provider is needed.
3. Copy `.env.example` to `.env.local` and fill in the four `VITE_FIREBASE_*` fields from the web app's Firebase configuration: `apiKey`, `authDomain`, `projectId`, and `appId`. These are public web configuration values. Do not use a service-account key or Google client secret.
4. In **Authentication > Settings > Authorized domains**, add `localhost` for local testing and the domain where the app is hosted. Use HTTPS for production.
5. Restart Vite after editing `.env.local`. For Vercel, add the same four values as project environment variables and rebuild/redeploy.

For a different Firebase project, incomplete environment overrides prevent login rather than mixing project settings. A real Google account flow must be tested after configuration; mocked checks cannot verify the consent screen, authorized domain, or account permissions.

Reference: [Firebase Google sign-in guide](https://firebase.google.com/docs/auth/web/google-signin).

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
