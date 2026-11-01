import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSETS, signIn } from '../api';
import { useApp } from '../App.jsx';

export default function SignIn() {
  const { login, keyError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(keyError || '');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (!res?.token) {
        // Server: "Missing Inputs" = failed validation (password must be 4+ letters/digits), "Wrong Login" = bad credentials.
        setError(res === 'Missing Inputs'
          ? 'Please enter a valid email and a password of at least 4 letters or digits.'
          : 'Incorrect email or password.');
        return;
      }
      login({ ...res, token: res.token });
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
        <p className="bos-eyebrow" style={{ textAlign: 'center' }}>Online lessons</p>
        <h2>Sign in</h2>
        <label>
          Email
          <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p className="bos-error">{error}</p>}
        <button className="bos-btn" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="bos-muted"><Link to="/forgot">Forgot your password, or bought a program and have no password yet?</Link></p>
        <p className="bos-muted">Use the same account as the mobile app.</p>
        <p className="bos-muted">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
