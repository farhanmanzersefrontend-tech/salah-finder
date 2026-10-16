import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const listeners = new Map();
const messages = [];
let focused = 0;
let opened = 0;
let closed = 0;
let windows = [{ url: 'https://salah.example/', postMessage: value => messages.push(value), focus: async () => { focused++; } }];
vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
  URL,
  self: {
    location: { origin: 'https://salah.example' },
    addEventListener: (type, listener) => listeners.set(type, listener),
    clients: { matchAll: async () => windows, openWindow: async () => { opened++; } },
  },
});
async function click(action) {
  let pending;
  listeners.get('notificationclick')({
    action, notification: { data: { token: 'current-azan' }, close: () => { closed++; } },
    waitUntil: promise => { pending = promise; },
  });
  await pending;
}
await click('mute-azan');
assert.equal(messages[0].type, 'MUTE_AZAN');
assert.equal(messages[0].token, 'current-azan');
assert.equal(focused, 0, 'Mute should not bring the app to the foreground');
assert.equal(opened, 0, 'Mute should not open a new window');
await click('');
assert.equal(focused, 1, 'Tapping the notification focuses an existing app');
windows = [];
await click('');
assert.equal(opened, 1, 'Tapping the notification opens the app if no window exists');
assert.equal(closed, 3);
console.log('PASS: notification mute message, playback token, focus, open and dismissal.');
