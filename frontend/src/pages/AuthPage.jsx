import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Icon from '../components/Icon.jsx';
import { Badge } from '../components/ui.jsx';
import { validateAuthForm } from '../utils/authValidation.js';

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'USER' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');

  function handleChange(event) {
    const name = event.target.name;
    const value = event.target.value;
    setValues({ ...values, [name]: value });
    setErrors({ ...errors, [name]: '' });
    setFeedback('');
  }

  function handleBlur(event) {
    const name = event.target.name;
    const nextErrors = validateAuthForm(values, mode);
    setErrors({ ...errors, [name]: nextErrors[name] || '' });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateAuthForm(values, mode);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback('Please correct the highlighted fields.');
      const firstField = document.getElementById(Object.keys(nextErrors)[0]);
      if (firstField) firstField.focus();
      return;
    }

    // UI preview only: do not send or persist credentials before auth exists.
    setFeedback(isRegister
      ? 'Your details pass the form checks. Registration is not connected yet; no account was created.'
      : 'Your details pass the form checks. Authentication is not connected yet; you have not been signed in.');
    setValues({ ...values, password: '', confirmPassword: '' });
  }

  return <div className="page-content auth-page">
    <div className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">A COMMUNITY BUILT ON TRUST</p>
        <h1>{isRegister ? 'A safer community starts with people.' : 'Welcome back to your community.'}</h1>
        <p>{isRegister ? 'Start as a community member or apply to become a volunteer. Every role has clear boundaries, and trust is earned through review.' : 'Sign-in will give you access to the tools for your role. Your identity and permissions will be checked by the backend.'}</p>
        <div className="auth-promise"><span className="icon-box"><Icon name="shield" /></span><div><strong>Verification means more than an email.</strong><p>Volunteers require administrator approval before responding to emergencies.</p></div></div>
        <div className="auth-promise"><span className="icon-box"><Icon name="lock" /></span><div><strong>Your location stays permission-based.</strong><p>Account creation never starts location tracking.</p></div></div>
      </div>
      <section className="card auth-card" aria-labelledby="auth-title">
        <Badge tone="teal">INTERFACE PREVIEW</Badge>
        <h2 id="auth-title">{isRegister ? 'Create your account' : 'Sign in'}</h2>
        <p className="auth-intro">{isRegister ? 'A few details to get started.' : 'Use your registered email address.'}</p>
        <div className="auth-preview-note"><Icon name="info" size={17} /><p>Account endpoints are not implemented yet. This form checks your input; it sends no credentials and creates no session.</p></div>
        <form noValidate onSubmit={handleSubmit}>
          {isRegister && <FormField id="name" label="Full name" value={values.name} onChange={handleChange} onBlur={handleBlur} autoComplete="name" maxLength={80} required error={errors.name} />}
          <FormField id="email" label="Email address" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} required error={errors.email} />
          <FormField id="password" label="Password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={handleChange} onBlur={handleBlur} autoComplete={isRegister ? 'new-password' : 'current-password'} required error={errors.password} hint={isRegister ? 'At least 12 characters, up to 72 UTF-8 bytes. Spaces are allowed.' : undefined}>
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </FormField>
          {isRegister && <FormField id="confirmPassword" label="Confirm password" type={showPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} autoComplete="new-password" required error={errors.confirmPassword} />}
          {isRegister && <fieldset className="role-fieldset"><legend>I want to join as a</legend><div className="role-options"><label className={values.role === 'USER' ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value="USER" checked={values.role === 'USER'} onChange={handleChange} /><span>Community member</span></label><label className={values.role === 'VOLUNTEER' ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value="VOLUNTEER" checked={values.role === 'VOLUNTEER'} onChange={handleChange} /><span>Volunteer</span></label></div>{errors.role && <p className="field-error">{errors.role}</p>}<p className="field-hint">Volunteer status requires admin review. Selecting this role does not grant responder access.</p></fieldset>}
          <button type="submit" className="button button-primary auth-submit">Check form details <Icon name="arrow" size={16} /></button>
          <div className="form-feedback" role="status" aria-live="polite">{feedback && <p>{feedback}</p>}</div>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Community Safety?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Explore registration'}</Link></p>
      </section>
    </div>
    <p className="auth-emergency-note">Need emergency services now? <a href="tel:112">Call 112</a>. This academic prototype is not an emergency-response service.</p>
  </div>;
}

export default AuthPage;
