import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePhone, getMessageLinks, createAlertMessage } from '../src/utils/sharing.js';

test('Indian local and international numbers normalize without accepting URI injection', () => {
  assert.equal(normalizePhone('98765 43210'), '+919876543210');
  assert.equal(normalizePhone('+1 (202) 555-0123'), '+12025550123');
  for (const value of ['javascript:alert(1)', '+1?body=test', '123', '+00000000000']) assert.equal(normalizePhone(value), null);
});

test('messaging links target the selected contact and encode message text', () => {
  const text = 'Help & call me? https://example.invalid/alerts/123';
  const links = getMessageLinks('+12025550123', text);
  assert.equal(new URL(links.whatsapp).hostname, 'wa.me');
  assert.equal(new URL(links.whatsapp).pathname, '/12025550123');
  assert.equal(new URL(links.whatsapp).searchParams.get('text'), text);
  assert.ok(links.sms.startsWith('sms:+12025550123?body='));
  assert.equal(getMessageLinks('bad phone', text), null);
});

test('SOS messages contain a protected app link and no location coordinates or credential', () => {
  const text = createAlertMessage('Fictional User', '507f1f77bcf86cd799439011', 'https://example.invalid');
  assert.ok(text.includes('https://example.invalid/alerts/507f1f77bcf86cd799439011'));
  assert.ok(text.includes('Sign in'));
  assert.ok(!/latitude|longitude|token=|maps\./i.test(text));
  assert.throws(() => createAlertMessage('User', '../admin', 'https://example.invalid'));
});
