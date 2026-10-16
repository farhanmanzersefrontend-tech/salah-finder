# Awqat Al-Salah

Awqat Al-Salah is a prayer companion with prayer times, Quran reading, Qibla direction, duas, and daily prayer tracking. Built with React, TypeScript, and Vite.

## Visitor count on Vercel

The home footer displays a shared visit total from `/api/visitors`. Each browser starts a new visit on opening the app after its 30-minute visit window expires. Refreshes and repeat opens within that window reuse an anonymous random ID. This counts visits, not distinct people or currently online users. No name, IP address, or location is stored by the counter. Clearing browser storage can start another visit.

Before deploying:

1. Connect an Upstash Redis database to the Vercel project through the Marketplace.
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the project's server environment variables. The integration's `KV_REST_API_URL` and `KV_REST_API_TOKEN` names also work. See `.env.example`; never expose the token with a `VITE_` prefix.
3. Redeploy. The first visit creates the total automatically. Production and preview totals are separate. An optional `VISITOR_COUNTER_KEY` overrides the storage namespace.

The total is persistent in Redis, and an atomic Lua operation prevents duplicate increments for the same visit ID, including concurrent requests and retries. Deduplication IDs expire after 24 hours; the total does not expire. The displayed total is fetched when the app opens. If the API is unavailable or unconfigured, the footer says "Visitor count unavailable" instead of showing a fabricated number.

`npm run dev` previews the frontend only. Use `vercel dev` with development environment variables to exercise the function locally. Run `node scripts/check-visitors.mjs` for mocked API and browser-session checks; live Redis/Vercel verification still requires the database connection.

References: [Vercel Node.js functions](https://vercel.com/docs/functions/runtimes/node-js), [Upstash REST API](https://upstash.com/docs/redis/features/restapi).

## Day and night appearance

Use the sun/moon switch beside **Your space** in Profile. The preference is saved on this device and applies across the app, independently of the selected scenery theme.

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
