import type { Auth } from 'firebase/auth';

// Public Firebase web configuration, also needed in builds without .env.local.
// Authentication and access control remain enforced by Firebase.
const defaultConfig = {
  apiKey: 'AIzaSyAB-vGXccYoqKVb2wOeBOwx8ns9xkg3xqA',
  authDomain: 'awqat-al-salah.firebaseapp.com',
  projectId: 'awqat-al-salah',
  appId: '1:346485964713:web:361754be95417b64914eb8',
};
const overrides = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};
// A different project must provide its complete configuration rather than mix projects.
const differentProject = Boolean(overrides.projectId && overrides.projectId !== defaultConfig.projectId);
const config = differentProject ? overrides : {
  apiKey: overrides.apiKey || defaultConfig.apiKey,
  authDomain: overrides.authDomain || defaultConfig.authDomain,
  projectId: overrides.projectId || defaultConfig.projectId,
  appId: overrides.appId || defaultConfig.appId,
};
export const googleAuthConfigured = Object.values(config).every(value => Boolean(value) && !value?.startsWith('YOUR_'));
type GoogleAuthClient = { auth: Auth; sdk: typeof import('firebase/auth') };
let client: Promise<GoogleAuthClient> | null = null;
let readyClient: GoogleAuthClient | null = null;

export function getGoogleAuth() {
  if (!googleAuthConfigured) return Promise.reject(new Error('Google sign-in is not available yet.'));
  if (!client) {
    client = Promise.all([import('firebase/app'), import('firebase/auth')]).then(async ([appSdk, sdk]) => {
      const app = appSdk.getApps().find(app => app.name === 'salah-auth') || appSdk.initializeApp(config, 'salah-auth');
      const auth = sdk.getAuth(app);
      await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      await sdk.getRedirectResult(auth, sdk.browserPopupRedirectResolver);
      readyClient = { auth, sdk };
      return readyClient;
    }).catch(error => { client = null; readyClient = null; throw error; });
  }
  return client;
}

export function handleGoogleSignIn() {
  function open({ auth, sdk }: GoogleAuthClient) {
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    // Start the popup synchronously inside the click's browser activation.
    return sdk.signInWithPopup(auth, provider, sdk.browserPopupRedirectResolver).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'auth/popup-blocked') {
        return sdk.signInWithRedirect(auth, provider, sdk.browserPopupRedirectResolver);
      }
      throw error;
    });
  }
  return readyClient ? open(readyClient) : getGoogleAuth().then(open);
}

export function googleAuthError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request': return '';
    case 'auth/popup-blocked': return 'Allow pop-ups for this site, then try signing in again.';
    case 'auth/network-request-failed': return 'Check your internet connection and try again.';
    case 'auth/web-storage-unsupported': return 'Allow browser storage to sign in on this device.';
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed': return 'Google sign-in has not been enabled for this app yet.';
    case 'auth/unauthorized-domain': return 'Google sign-in is not enabled for this website address yet.';
    case 'auth/invalid-api-key':
    case 'auth/app-not-authorized': return 'This app’s Google sign-in settings need to be updated.';
    case 'auth/account-exists-with-different-credential': return 'This email already uses another sign-in method. Please contact support.';
    default: return 'Google sign-in is unavailable right now. Please try again later.';
  }
}
