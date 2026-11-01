import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ASSETS, PASSWORD_RE, forgotPassword, getTerms, register, setPassword, verifyCode } from '../api';
import { useApp } from '../App.jsx';

// Port of Account/SignUp.js + VerifyCode.js.
// Login validates the password as 4+ letters/digits, so sign-up enforces the same or the user could never log in.

export function SignUp() {
  const { login } = useApp();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', countryCode: '+61', phone: '' });
  const [agreed, setAgreed] = useState(false);
  const [terms, setTerms] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const showTerms = async e => {
    e.preventDefault();
    setTerms('');
    setTerms((await getTerms().catch(() => '')) || 'Could not load the terms.');
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_RE.test(form.password)) return setError('Password must be at least 4 characters, letters and digits only.');
    if (!agreed) return setError('Please agree to the Terms of Use and Privacy Policy.');
    setLoading(true);
    try {
      const res = await register(form);
      if (res?.token) {
        login({ ...res, needsVerification: String(res.status) !== '1' });
      } else if (res?.error === 'User already exist') {
        setError('An account with this email already exists. Please sign in.');
      } else {
        setError(typeof res === 'string' ? res.replace(/<[^>]+>/g, ' ').trim() : 'Sign up failed. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bos-center">
      <form className="bos-card bos-signin" onSubmit={submit} noValidate>
        <img className="bos-logo" src={`${ASSETS}logo.png`} alt="" />
        <p className="bos-eyebrow" style={{ textAlign: 'center' }}>Online programs</p>
        <h2>Create account</h2>
        <label>
          Full name
          <input type="text" autoComplete="name" value={form.fullName} onChange={set('fullName')} required />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={4} />
          <small className="bos-field-hint">At least 4 characters, letters and digits only.</small>
        </label>
        <div className="bos-phone">
          <label className="bos-phone-code">
            Code
            <input type="tel" autoComplete="tel-country-code" value={form.countryCode} onChange={set('countryCode')} />
          </label>
          <label>
            Phone (optional)
            <input type="tel" autoComplete="tel-national" value={form.phone} onChange={set('phone')} />
          </label>
        </div>
        <label className="bos-check">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
          <span>
            I agree to the <a href="#" onClick={showTerms}>Terms of Use and Privacy Policy</a>
          </span>
        </label>
        {error && <p className="bos-error" role="alert">{error}</p>}
        <button className="bos-btn" type="submit" disabled={loading || !form.fullName.trim() || !form.email.trim()}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p className="bos-muted">Already have an account? <Link to="/">Sign in</Link></p>
      </form>

      {terms !== null && (
        <div className="bos-modal" onClick={() => setTerms(null)}>
          <div className="bos-card bos-terms" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Terms of Use and Privacy Policy">
            {terms === '' ? <div className="bos-spinner" /> : <div className="bos-terms-body" dangerouslySetInnerHTML={{ __html: terms }} />}
            <button className="bos-btn" type="button" onClick={() => setTerms(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function VerifyCode() {
  const { account, login, logout } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await verifyCode(account.token, code);
      if (res?.status_code === 200) login({ ...account, ...(res.data || {}), token: account.token, needsVerification: false });
      else setError('Invalid code. Please check the email and try again.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bos-center">
      <form className="bos-card bos-signin" onSubmit={submit}>
        <img className="bos-logo" src={`${ASSETS}logo.png`} alt="" />
        <h2>Check your email</h2>
        <p className="bos-muted" style={{ textAlign: 'center' }}>
          We sent a 5-digit code to <strong>{account.email}</strong>.
        </p>
        <label>
          Verification code
          <input
            className="bos-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={5}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            autoFocus
          />
        </label>
        {error && <p className="bos-error" role="alert">{error}</p>}
        <button className="bos-btn" type="submit" disabled={loading || code.length !== 5}>
          {loading ? 'Checking…' : 'Verify'}
        </button>
        <button className="bos-link" type="button" onClick={logout} style={{ alignSelf: 'center' }}>
          Use a different email
        </button>
      </form>
    </div>
  );
}

// Port of Account/ForgotPassword.js. Same answer whether or not the email exists, so it cannot be used to probe accounts.
export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bos-center">
      <form className="bos-card bos-signin" onSubmit={submit}>
        <img className="bos-logo" src={`${ASSETS}logo.png`} alt="" />
        <h2>Set a new password</h2>
        {sent ? (
          <p className="bos-muted" role="status" style={{ textAlign: 'center' }}>
            If <strong>{email.trim()}</strong> has an account, we sent it a link to set a new password.
            Check your inbox and spam folder.
          </p>
        ) : (
          <>
            <p className="bos-muted" style={{ textAlign: 'center' }}>
              Enter the email you used in the app or for your purchase. We’ll email you a link to set your password.
            </p>
            <label>
              Email
              <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </label>
            {error && <p className="bos-error" role="alert">{error}</p>}
            <button className="bos-btn" type="submit" disabled={loading || !email.trim()}>
              {loading ? 'Sending…' : 'Send link'}
            </button>
          </>
        )}
        <p className="bos-muted"><Link to="/">Back to sign in</Link></p>
      </form>
    </div>
  );
}

// Password form for an account that has none yet (bought a program) or a "set your password" email link.
export function SetPasswordForm({ onDone, onLater }) {
  const { account, login } = useApp();
  const [password, setPassword1] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!PASSWORD_RE.test(password)) return setError('Password must be at least 4 characters, letters and digits only.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      const res = await setPassword(account.token, password);
      if (res?.status_code === 200) {
        login({ ...account, needsPassword: false });
        onDone?.();
      } else {
        setError(res?.error || 'Could not save the password. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="bos-signin" onSubmit={submit}>
      <label>
        New password
        <input type="password" autoComplete="new-password" value={password} onChange={e => setPassword1(e.target.value)} required minLength={4} autoFocus />
        <small className="bos-field-hint">At least 4 characters, letters and digits only.</small>
      </label>
      <label>
        Repeat password
        <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
      </label>
      {error && <p className="bos-error" role="alert">{error}</p>}
      <button className="bos-btn" type="submit" disabled={loading || !password || !confirm}>
        {loading ? 'Saving…' : 'Save password'}
      </button>
      {onLater && <button type="button" className="bos-link" onClick={onLater} style={{ alignSelf: 'center' }}>Later</button>}
    </form>
  );
}

// Popup shown right after a purchase created the account: the buyer is already signed in.
export function SetPasswordModal() {
  const { account } = useApp();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('@PW_LATER') === '1'; } catch { return false; } });
  if (!account?.needsPassword || hidden) return null;
  const later = () => { try { sessionStorage.setItem('@PW_LATER', '1'); } catch {} setHidden(true); };
  return (
    <div className="bos-modal" role="dialog" aria-modal="true" aria-labelledby="bos-pw-title">
      <div className="bos-card">
        <h2 id="bos-pw-title">Welcome! Choose a password</h2>
        <p className="bos-muted" style={{ textAlign: 'center' }}>
          Your program is ready. Set a password for <strong>{account.email}</strong> so you can sign in next time, here or in the app.
        </p>
        <SetPasswordForm onLater={later} />
      </div>
    </div>
  );
}

// #/set-password?key=…  (from the email link). The key was exchanged by App; here only the form remains.
export function SetPasswordPage() {
  const { account, keyError } = useApp();
  const navigate = useNavigate();
  return (
    <div className="bos-center">
      <div className="bos-card">
        <img className="bos-logo" src={`${ASSETS}logo.png`} alt="" />
        <h2>Set a new password</h2>
        {account ? (
          <>
            <p className="bos-muted" style={{ textAlign: 'center' }}>For <strong>{account.email}</strong></p>
            <SetPasswordForm onDone={() => navigate('/programs', { replace: true })} />
          </>
        ) : (
          <>
            <p className="bos-error" role="alert">{keyError || 'This link is invalid or has expired.'}</p>
            <p className="bos-muted"><Link to="/forgot">Request a new link</Link> · <Link to="/">Sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
