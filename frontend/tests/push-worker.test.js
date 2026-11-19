import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker() {
  const handlers = {};
  const shown = [];
  const opened = [];
  const self = { location: { origin: 'https://example.invalid' }, addEventListener(name, handler) { handlers[name] = handler; }, registration: { async showNotification(title, options) { shown.push({ title, ...options }); } }, clients: { async matchAll() { return []; }, async openWindow(url) { opened.push(url); } } };
  vm.runInNewContext(source, { self, URL });
  return { handlers, shown, opened };
}

test('push shows a visible alert and rejects external or malformed click destinations', async () => {
  const context = worker();
  let completed;
  context.handlers.push({ data: { json: () => ({ body: 'Fictional alert', url: 'https://attacker.invalid', tag: 'fictional' }) }, waitUntil(promise) { completed = promise; } });
  await completed;
  assert.equal(context.shown[0].data.url, '/dashboard');
  assert.equal(context.shown[0].body, 'Fictional alert');
  context.handlers.notificationclick({ notification: { close() {}, data: { url: '//attacker.invalid' } }, waitUntil(promise) { completed = promise; } });
  await completed;
  assert.equal(context.opened[0], 'https://example.invalid/dashboard');
});

test('valid private alert links stay on the app origin and invalid payloads still show a notification', async () => {
  const context = worker();
  let completed;
  context.handlers.push({ data: { json() { throw new Error('fictional parse failure'); } }, waitUntil(promise) { completed = promise; } });
  await completed;
  assert.equal(context.shown.length, 1);
  const path = '/alerts/507f1f77bcf86cd799439011';
  context.handlers.notificationclick({ notification: { close() {}, data: { url: path } }, waitUntil(promise) { completed = promise; } });
  await completed;
  assert.equal(context.opened[0], 'https://example.invalid' + path);
});
