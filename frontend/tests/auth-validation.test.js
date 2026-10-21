import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAuthForm } from '../src/utils/authValidation.js';

function registrationValues() {
  return { name: 'Fictional Student', email: 'student@example.invalid', password: 'fictional-password-123', confirmPassword: 'fictional-password-123', role: 'USER' };
}

test('valid member and volunteer input pass client checks', () => {
  const values = registrationValues();
  assert.deepEqual(validateAuthForm(values, 'register'), {});
  values.role = 'VOLUNTEER';
  assert.deepEqual(validateAuthForm(values, 'register'), {});
});

test('public registration rejects an administrator role', () => {
  const values = registrationValues();
  values.role = 'ADMIN';
  assert.ok(validateAuthForm(values, 'register').role);
});

test('registration rejects whitespace-only and excessive names', () => {
  const values = registrationValues();
  values.name = '  ';
  assert.ok(validateAuthForm(values, 'register').name);
  values.name = 'x'.repeat(81);
  assert.ok(validateAuthForm(values, 'register').name);
});

test('invalid and oversized email values are rejected', () => {
  const values = registrationValues();
  values.email = 'not-an-email';
  assert.ok(validateAuthForm(values, 'register').email);
  values.email = 'x'.repeat(250) + '@example.invalid';
  assert.ok(validateAuthForm(values, 'register').email);
});

test('registration requires 12 characters and matching confirmation', () => {
  const values = registrationValues();
  values.password = 'short';
  assert.ok(validateAuthForm(values, 'register').password);
  values.password = 'fictional-password-123';
  values.confirmPassword = 'different-password';
  assert.ok(validateAuthForm(values, 'register').confirmPassword);
});

test('bcrypt byte limit is checked for multibyte passwords', () => {
  const values = registrationValues();
  values.password = '🔒'.repeat(19);
  values.confirmPassword = values.password;
  assert.ok(validateAuthForm(values, 'register').password);
  values.password = '🔒'.repeat(18);
  values.confirmPassword = values.password;
  assert.deepEqual(validateAuthForm(values, 'register'), {});
});

test('login requires credentials but not registration-only fields', () => {
  const values = { name: '', email: '', password: '', confirmPassword: '', role: '' };
  const errors = validateAuthForm(values, 'login');
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.equal(errors.name, undefined);
  assert.equal(errors.role, undefined);
  values.email = 'student@example.invalid';
  values.password = 'existing-password';
  assert.deepEqual(validateAuthForm(values, 'login'), {});
});

test('password spaces are preserved and registration length is enforced', () => {
  const values = registrationValues();
  values.password = '  password  ';
  values.confirmPassword = values.password;
  assert.deepEqual(validateAuthForm(values, 'register'), {});
  assert.equal(values.password, '  password  ');
});
