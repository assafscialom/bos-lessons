import React from 'react';
import { SHOP_URL } from '../api';
import { useApp } from '../App.jsx';

// Web payments are not implemented yet: react-native-iap has no web equivalent.
export default function Paywall() {
  const { logout } = useApp();
  return (
    <div className="bos-center">
      <div className="bos-card">
        <h2>Your free trial has ended</h2>
        <p>Buy this program to keep listening.</p>
        <p>Or buy a single program. It stays yours, in the app and here.</p>
        <a className="bos-btn" href={SHOP_URL} target="_top" rel="noopener" style={{ display: 'inline-block', marginBottom: 12, textDecoration: 'none' }}>
          Browse programs
        </a>
        <br />
        <button className="bos-btn bos-btn-ghost" onClick={logout}>Sign out</button>
      </div>
    </div>
  );
}
