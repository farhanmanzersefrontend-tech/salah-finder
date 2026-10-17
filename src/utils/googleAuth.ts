import type { Auth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
};
export const googleAuthConfigured = Object.values(config).every(Boolean);
let client: Promise<{ auth: Auth; sdk: typeof import('firebase/auth') }> | null = null;

export function getGoogleAuth() {
  if (!googleAuthConfigured) return Promise.reject(new Error('Google sign-in is not available yet.'));
  if (!client) {
    client = Promise.all([import('firebase/app'), import('firebase/auth')]).then(async ([appSdk, sdk]) => {
      const app = appSdk.getApps().find(app => app.name === 'salah-auth') || appSdk.initializeApp(config, 'salah-auth');
      const auth = sdk.getAuth(app);
      await sdk.setPersistence(auth, sdk.browserLocalPersistence);
      return { auth, sdk };
    }).catch(error => { client = null; throw error; });
  }
  return client;
}

export async function handleGoogleSignIn() {
  const { auth, sdk } = await getGoogleAuth();
  const provider = new sdk.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return sdk.signInWithPopup(auth, provider, sdk.browserPopupRedirectResolver);
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
