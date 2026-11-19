import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

let server;
let App;
let session;
const user = { id: '507f1f77bcf86cd799439011', name: 'Fictional User', email: 'user@example.invalid', role: 'USER', verificationStatus: 'NOT_REQUESTED' };

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: 'custom', plugins: [{
    name: 'session-test-fixture', enforce: 'pre',
    resolveId(source) { if (source.endsWith('/context/SessionContext.jsx') || source === 'virtual:session-fixture') return 'virtual:session-fixture'; },
    load(id) { if (id === 'virtual:session-fixture') return `let current = { user: null, status: 'anonymous', refreshSession: async () => {}, signOut: async () => {} }; export function useSession() { return current; } export function setSession(next) { current = { ...current, ...next }; }`; },
  }] });
  App = (await server.ssrLoadModule('/src/App.jsx')).default;
  session = await server.ssrLoadModule('virtual:session-fixture');
});
after(async () => { if (server) await server.close(); });

function render(path, signedIn = false) {
  session.setSession({ user: signedIn ? user : null, status: signedIn ? 'authenticated' : 'anonymous' });
  return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)));
}

test('public home explains manual sending and keeps emergency calling accessible', () => {
  const html = render('/');
  assert.match(html, /Your people/);
  assert.match(html, /confirm Send/);
  assert.match(html, /href="tel:112"/);
  assert.ok(!/href="\/(architecture|workspace|setup)"/.test(html));
});

test('signed-in navigation has only user tasks and a cancellable SOS action', () => {
  const html = render('/dashboard', true);
  for (const path of ['/dashboard', '/contacts', '/account']) assert.ok(html.includes('href="' + path + '"'));
  assert.match(html, /five-second cancellation countdown/);
  assert.match(html, /You must tap Send/);
  assert.ok(!/Architecture|Build workspace|Phase 02|Development/.test(html));
});

test('contact form has visible accessible labels and an international phone input', () => {
  const html = render('/contacts', true);
  assert.match(html, /for="contact-name"/);
  assert.match(html, /for="contact-relationship"/);
  assert.match(html, /for="contact-phone"/);
  assert.match(html, /type="tel"/);
});

test('developer pages are removed from the product and sign-in does not expose passwords', () => {
  assert.match(render('/architecture'), /This page isn’t here/);
  const html = render('/login');
  assert.match(html, /type="password"/);
  assert.match(html, /autoComplete="current-password"|autoComplete="current-password"/i);
  assert.ok(!html.includes('Development workspace'));
});

test('private alert routes expose no map or location before session authorization', () => {
  const html = render('/alerts/507f1f77bcf86cd799439011');
  assert.ok(!html.includes('location-map'));
  assert.ok(!html.includes('tile.openstreetmap.org'));
});
