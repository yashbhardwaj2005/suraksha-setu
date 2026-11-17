import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField.jsx';
import Icon from '../components/Icon.jsx';
import { Badge } from '../components/ui.jsx';
import { validateAuthForm } from '../utils/authValidation.js';
import { registerAccount, loginAccount, getRegistrationError } from '../services/auth.service.js';

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'USER' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const request = useRef(null);

  useEffect(() => () => request.current?.abort(), []);

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validateAuthForm(values, mode);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback('Please correct the highlighted fields.');
      setFeedbackType('error');
      const firstField = document.getElementById(Object.keys(nextErrors)[0]);
      if (firstField) firstField.focus();
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setIsSubmitting(true);
    setFeedback('');
    try {
      if (!isRegister) {
        await loginAccount(values, controller.signal);
        if (!controller.signal.aborted) navigate('/dashboard');
        return;
      }
      const user = await registerAccount(values, controller.signal);
      if (controller.signal.aborted) return;
      let message = 'Account created. You are not signed in; sign-in is the next development step.';
      if (user.role === 'VOLUNTEER') {
        message += ' Your volunteer account is not approved. Verification requests will be added later.';
      }
      setFeedback(message);
      setFeedbackType('success');
      setValues({ ...values, password: '', confirmPassword: '' });
    } catch (error) {
      if (controller.signal.aborted) return;
      setFeedback(getRegistrationError(error));
      setFeedbackType('error');
    } finally {
      if (!controller.signal.aborted) setIsSubmitting(false);
    }
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
        <Badge tone="teal">{isRegister ? 'ACCOUNT SETUP' : 'SIGN IN'}</Badge>
        <h2 id="auth-title">{isRegister ? 'Create your account' : 'Sign in'}</h2>
        <p className="auth-intro">{isRegister ? 'A few details to get started.' : 'Use your registered email address.'}</p>
        <div className="auth-preview-note"><Icon name="info" size={17} /><p>{isRegister ? 'Registration creates an account on the connected backend. It does not sign you in or approve a volunteer.' : 'Sign in securely to access your dashboard.'}</p></div>
        <form method="post" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <fieldset className="auth-fields" disabled={isSubmitting}>
          {isRegister && <FormField id="name" label="Full name" value={values.name} onChange={handleChange} onBlur={handleBlur} autoComplete="name" maxLength={80} required error={errors.name} />}
          <FormField id="email" label="Email address" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} maxLength={254} required error={errors.email} />
          <FormField id="password" label="Password" type={showPassword ? 'text' : 'password'} value={values.password} onChange={handleChange} onBlur={handleBlur} autoComplete={isRegister ? 'new-password' : 'current-password'} required error={errors.password} hint={isRegister ? 'At least 12 characters, up to 72 UTF-8 bytes. Spaces are allowed.' : undefined}>
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </FormField>
          {isRegister && <FormField id="confirmPassword" label="Confirm password" type={showPassword ? 'text' : 'password'} value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} autoComplete="new-password" required error={errors.confirmPassword} />}
          {isRegister && <fieldset className="role-fieldset"><legend>I want to join as a</legend><div className="role-options"><label className={values.role === 'USER' ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value="USER" checked={values.role === 'USER'} onChange={handleChange} /><span>Community member</span></label><label className={values.role === 'VOLUNTEER' ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value="VOLUNTEER" checked={values.role === 'VOLUNTEER'} onChange={handleChange} /><span>Volunteer</span></label></div>{errors.role && <p className="field-error">{errors.role}</p>}<p className="field-hint">Volunteer status requires admin review. Selecting this role does not grant responder access.</p></fieldset>}
          <button type="submit" className="button button-primary auth-submit">{isRegister ? isSubmitting ? 'Creating account…' : 'Create account' : isSubmitting ? 'Signing in…' : 'Sign in'}<Icon name="arrow" size={16} /></button>
          </fieldset>
          <div className={'form-feedback form-feedback-' + feedbackType} role="status" aria-live="polite">{feedback && <p>{feedback}</p>}</div>
        </form>
        <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to Community Safety?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Preview sign-in' : 'Create account'}</Link></p>
      </section>
    </div>
    <p className="auth-emergency-note">Need emergency services now? <a href="tel:112">Call 112</a>. This academic prototype is not an emergency-response service.</p>
  </div>;
}

export default AuthPage;
