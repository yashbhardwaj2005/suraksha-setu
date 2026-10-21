import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { api } from '../src/services/api.js';
import { registerAccount, getRegistrationError } from '../src/services/auth.service.js';

let originalAdapter;
const safeUser = { id: '507f1f77bcf86cd799439011', name: 'Fictional User', email: 'student@example.invalid', role: 'USER', accountStatus: 'ACTIVE', verificationStatus: 'NOT_REQUESTED' };

beforeEach(() => { originalAdapter = api.defaults.adapter; });
afterEach(() => { api.defaults.adapter = originalAdapter; });

test('registration posts only allowed fields and preserves the password', async () => {
  const values = { name: ' Fictional User ', email: ' STUDENT@EXAMPLE.INVALID ', password: '  fictional password  ', confirmPassword: '  fictional password  ', role: 'USER', authVersion: 99 };
  let requests = 0;
  api.defaults.adapter = async (config) => {
    requests += 1;
    assert.equal(config.method, 'post');
    assert.equal(config.url, '/auth/register');
    assert.deepEqual(JSON.parse(config.data), { name: 'Fictional User', email: 'student@example.invalid', password: values.password, role: 'USER' });
    return { data: { success: true, data: { user: safeUser } }, status: 201, statusText: 'Created', headers: {}, config: config };
  };
  assert.deepEqual(await registerAccount(values), safeUser);
  assert.equal(requests, 1);
});

test('malformed receipts never produce account-created confirmation', async () => {
  api.defaults.adapter = async (config) => ({ data: { success: true, data: {} }, status: 201, headers: {}, config: config });
  await assert.rejects(() => registerAccount({ name: 'Fictional User', email: 'student@example.invalid', password: 'fictional-password', role: 'USER' }), /could not be confirmed/);
});

test('client keeps only the safe receipt fields', async () => {
  api.defaults.adapter = async (config) => ({ data: { success: true, data: { user: { ...safeUser, passwordHash: 'private-test-field', authVersion: 99 } } }, status: 201, headers: {}, config: config });
  const result = await registerAccount({ name: 'Fictional User', email: 'student@example.invalid', password: 'fictional-password', role: 'USER' });
  assert.deepEqual(result, safeUser);
});

test('duplicate, Origin and throttling responses show useful safe feedback', () => {
  assert.match(getRegistrationError({ response: { status: 409 } }), /already exists/);
  assert.match(getRegistrationError({ response: { status: 403 } }), /configured application URL/);
  assert.match(getRegistrationError({ response: { status: 429 } }), /wait before trying/);
});

test('network and timeout failures do not claim the account was never created', () => {
  assert.match(getRegistrationError({ code: 'ECONNABORTED' }), /could not be confirmed/);
  assert.match(getRegistrationError(new Error('private request details')), /could not be confirmed/);
});

test('server error internals are not echoed to the interface', () => {
  const result = getRegistrationError({ response: { status: 500, data: { error: { message: 'private-driver-details' } } } });
  assert.ok(!result.includes('private-driver-details'));
  assert.match(result, /could not be confirmed/);
});
