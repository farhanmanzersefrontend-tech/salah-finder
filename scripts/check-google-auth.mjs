import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/googleAuth.ts', import.meta.url), 'utf8');
const asModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const appModule = asModule('export const getApps = () => globalThis.authTest.apps; export const initializeApp = (config, name) => { const app = {config, name}; globalThis.authTest.apps.push(app); return app; };');
const authModule = asModule('export const browserPopupRedirectResolver = {}; export const getRedirectResult = async () => { globalThis.authTest.redirectChecks = (globalThis.authTest.redirectChecks || 0) + 1; return null; }; export const signInWithRedirect = async (auth, provider, resolver) => { globalThis.authTest.redirect = {auth, provider, resolver}; }; export class GoogleAuthProvider { setCustomParameters(value) { this.parameters = value; } } export const signInWithPopup = async (auth, provider, resolver) => { globalThis.authTest.popup = {auth, provider, resolver}; if (globalThis.authTest.popupError) throw globalThis.authTest.popupError; return {user: {uid: "test-user"}}; }; export const browserLocalPersistence = "local"; export const getAuth = app => ({app}); export const setPersistence = async (auth, mode) => { globalThis.authTest.persistence.push(mode); if (globalThis.authTest.fail) { globalThis.authTest.fail = false; throw new Error("Storage failed"); } };');
async function load(env) {
  const configuredSource = source.replaceAll('import.meta.env', JSON.stringify(env));
  const compiled = ts.transpileModule(configuredSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/import\(['"]firebase\/app['"]\)/g, `import(${JSON.stringify(appModule)})`)
    .replace(/import\(['"]firebase\/auth['"]\)/g, `import(${JSON.stringify(authModule)})`);
  return import(asModule(compiled));
}
const defaults = await load({});
assert.equal(defaults.googleAuthConfigured, true, 'Deployments must work without local environment files');
const emptyValues = await load({ VITE_FIREBASE_API_KEY: '', VITE_FIREBASE_AUTH_DOMAIN: '', VITE_FIREBASE_PROJECT_ID: '', VITE_FIREBASE_APP_ID: '' });
assert.equal(emptyValues.googleAuthConfigured, true, 'Blank deployment variables should use the public defaults');
const unavailable = await load({ VITE_FIREBASE_PROJECT_ID: 'another-project' });
assert.equal(unavailable.googleAuthConfigured, false);
await assert.rejects(unavailable.getGoogleAuth(), /not available/);
assert.equal(unavailable.googleAuthError({ code: 'auth/popup-closed-by-user' }), '');
assert.match(unavailable.googleAuthError({ code: 'auth/popup-blocked' }), /pop-ups/);
assert.match(unavailable.googleAuthError({ code: 'auth/network-request-failed' }), /connection/);
assert.match(unavailable.googleAuthError({ code: 'auth/configuration-not-found' }), /not been enabled/);
assert.match(unavailable.googleAuthError({ code: 'auth/operation-not-allowed' }), /not been enabled/);
assert.match(unavailable.googleAuthError({ code: 'auth/unauthorized-domain' }), /website address/);
assert.equal(unavailable.googleAuthError(new Error('Private internal details')), 'Google sign-in is unavailable right now. Please try again later.');
globalThis.authTest = { apps: [], persistence: [], fail: true };
const configured = await load({ VITE_FIREBASE_API_KEY: 'test-key', VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com', VITE_FIREBASE_PROJECT_ID: 'test', VITE_FIREBASE_APP_ID: 'test-app' });
assert.equal(configured.googleAuthConfigured, true);
await assert.rejects(configured.getGoogleAuth(), /Storage failed/);
const first = await configured.getGoogleAuth();
assert.equal(await configured.getGoogleAuth(), first, 'Successful initialization should be reused');
assert.equal(globalThis.authTest.apps.length, 1, 'Retrying should reuse the Firebase app');
assert.deepEqual(globalThis.authTest.persistence, ['local', 'local']);
console.log('Google auth checks passed: missing configuration, cancellation, error messages, initialization retry, and session persistence setup.');

const signedIn = await configured.handleGoogleSignIn();
assert.equal(signedIn.user.uid, 'test-user');
assert.deepEqual(globalThis.authTest.popup.provider.parameters, { prompt: 'select_account' });
assert.equal(globalThis.authTest.popup.resolver, first.sdk.browserPopupRedirectResolver);
globalThis.authTest.popupError = Object.assign(new Error('Popup blocked'), { code: 'auth/popup-blocked' });
await configured.handleGoogleSignIn();
assert.equal(globalThis.authTest.redirect.auth, first.auth);
assert.equal(globalThis.authTest.redirect.resolver, first.sdk.browserPopupRedirectResolver);
assert.equal(globalThis.authTest.redirectChecks, 1);
globalThis.authTest.redirect = null;
globalThis.authTest.popupError = Object.assign(new Error('Closed'), { code: 'auth/popup-closed-by-user' });
await assert.rejects(configured.handleGoogleSignIn(), { code: 'auth/popup-closed-by-user' });
assert.equal(globalThis.authTest.redirect, null, 'Closing the popup should not force a redirect');
globalThis.authTest.popupError = null;
globalThis.authTest.popup = null;
const pending = configured.handleGoogleSignIn();
assert.ok(globalThis.authTest.popup, 'The popup must start before yielding the button click');
await pending;
console.log('Google popup checks passed: provider, account selection, synchronous popup, blocked-popup redirect, redirect completion, and cancellation.');

globalThis.authTest.apps = [];
const defaultClient = await defaults.getGoogleAuth();
assert.equal(defaultClient.auth.app.config.projectId, 'awqat-al-salah');
assert.equal(defaultClient.auth.app.config.authDomain, 'awqat-al-salah.firebaseapp.com');
console.log('Deployment config checks passed: no env file, blank values, and incomplete alternate project.');
