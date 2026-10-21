function validateAuthForm(values, mode) {
  const errors = {};
  const email = values.email.trim();

  if (mode === 'register') {
    if (values.name.trim().length < 2 || values.name.trim().length > 80) {
      errors.name = 'Enter a name between 2 and 80 characters.';
    }
    if (values.role !== 'USER' && values.role !== 'VOLUNTEER') {
      errors.role = 'Choose community member or volunteer.';
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Enter your password.';
  } else if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = 'Use a password of no more than 72 UTF-8 bytes.';
  } else if (mode === 'register' && values.password.length < 12) {
    errors.password = 'Use at least 12 characters.';
  }

  if (mode === 'register' && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export { validateAuthForm };
