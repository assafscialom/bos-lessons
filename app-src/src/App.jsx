import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { getAppData, getGeneralInfo, loadAccount, loginWithKey, ownedPrograms, saveAccount, takeLoginKeyFromUrl } from './api';
import SignIn from './screens/SignIn.jsx';
import { ForgotPassword, SetPasswordModal, SetPasswordPage, SignUp, VerifyCode } from './screens/SignUp.jsx';
import Player from './screens/Player.jsx';
import { Program, Programs } from './screens/Programs.jsx';
import { Favourites, History } from './screens/MyLessons.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Programs only (one-time purchases). Lessons are reached through programs, favourites and history.
// Lessons.jsx / FindLessons.jsx / Paywall.jsx are kept but not routed for now.
export function Tabs() {
  return (
    <nav className="bos-tabs">
      <NavLink to="/programs">Programs</NavLink>
      <NavLink to="/favourites">Favourites</NavLink>
      <NavLink to="/history">History</NavLink>
    </nav>
  );
}

export default function App() {
  const [account, setAccount] = useState(loadAccount);
  const [appData, setAppData] = useState(null);
  const [info, setInfo] = useState(null);
  const [lessons, setLessons] = useState(null);
  const [packages, setPackages] = useState(null);
  const [checking, setChecking] = useState(Boolean(account));
  // ?key= in the URL: checkout redirect or "set your password" email link. Exchanged once, before anything renders.
  const [pendingKey] = useState(takeLoginKeyFromUrl);
  const [keyBusy, setKeyBusy] = useState(Boolean(pendingKey));
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    if (!pendingKey) return;
    loginWithKey(pendingKey)
      .then(res => {
        if (res?.token) login({ ...res, token: res.token, needsPassword: Boolean(res.needs_password) });
        else setKeyError(res?.error || 'This link is invalid or has expired.');
      })
      .catch(() => setKeyError('Could not reach the server. Please try again.'))
      .finally(() => setKeyBusy(false));
  }, [pendingKey]);

  const refreshInfo = async (token = account?.token) => {
    const res = await getGeneralInfo(token).catch(() => null);
    if (res?.data) setInfo(res.data);
  };

  useEffect(() => {
    if (!account?.token) return;
    setChecking(true);
    getAppData(account.token)
      .then(res => {
        if (res?.error === 'Invalid token') return logout();
        setAppData(res);
      })
      .catch(() => setAppData(null))
      .finally(() => setChecking(false));
    refreshInfo(account.token);
  }, [account?.token]);

  const login = acc => {
    saveAccount(acc);
    setAccount(acc);
  };
  const logout = () => {
    saveAccount(null);
    setAccount(null);
    setAppData(null);
    setInfo(null);
    setLessons(null);
    setPackages(null);
  };

  // No subscriptions or trial on the web: programs are bought one at a time (or all, for "free" accounts).
  const purchased = ownedPrograms(appData);
  const value = { account, appData, info, lessons, setLessons, packages, setPackages, login, logout, refreshInfo, purchased, keyError };

  let routes;
  if (keyBusy) {
    routes = <Route path="*" element={<div className="bos-center"><div className="bos-spinner" /></div>} />;
  } else if (!account) {
    routes = (
      <>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<SignIn />} />
      </>
    );
  } else if (account.needsVerification) {
    routes = <Route path="*" element={<VerifyCode />} />;
  } else if (checking) {
    routes = <Route path="*" element={<div className="bos-center"><div className="bos-spinner" /></div>} />;
  } else {
    routes = (
      <>
        <Route path="/programs" element={<Programs />} />
        <Route path="/program/:id" element={<Program />} />
        <Route path="/lesson/:id" element={<Player />} />
        <Route path="/favourites" element={<Favourites />} />
        <Route path="/history" element={<History />} />
        <Route path="/set-password" element={<SetPasswordPage />} />
        <Route path="*" element={<Navigate to="/programs" replace />} />
      </>
    );
  }

  return (
    <Ctx.Provider value={value}>
      <div className="bos-root">
        <div className="bos-shade">
          <HashRouter>
            <Routes>{routes}</Routes>
            {account && !keyBusy && <SetPasswordModal />}
          </HashRouter>
        </div>
      </div>
    </Ctx.Provider>
  );
}
