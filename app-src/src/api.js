// API client for the browser.
// Calls go through the WordPress proxy (the API sends no CORS headers).
export const CFG = window.BOS_LESSONS || {};
// Ends with '/'. May already contain '?' when WordPress uses plain permalinks (?rest_route=...).
export const API_BASE = CFG.apiBase || '/api/';
export const ASSETS = CFG.assetsUrl || '/';
export const COMPANY_ID = String(CFG.companyId || '');
// program id -> WooCommerce product URL (from the WordPress plugin), for "Buy" links on locked programs.
export const PACKAGE_PRODUCTS = CFG.packageProducts || {};
export const SHOP_URL = CFG.shopUrl || '/';
export const buyUrl = packageId => PACKAGE_PRODUCTS[String(packageId)] || SHOP_URL;
// Sections besides Programs, from Settings → BOS Lessons. Defaults match the plugin's (installs before 1.0.5).
// Dev only: ?sections=lessons,history overrides them, to try each combination with ?mock. In a build DEV is false,
// devSections is null and the override is removed as dead code (an earlier `DEV && …` gave false and crashed on .split).
const devSections = import.meta.env.DEV ? new URLSearchParams(location.search).get('sections') : null;
export const SECTIONS = typeof devSections === 'string'
  ? Object.fromEntries(['lessons', 'favourites', 'history'].map(k => [k, devSections.split(',').includes(k)]))
  : { lessons: false, favourites: true, history: true, ...CFG.sections };

const ACCOUNT_KEY = '@ACCOUNT';
const DEVICE_KEY = '@DEVICE_ID';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export function loadAccount() {
  try { return JSON.parse(safeGet(ACCOUNT_KEY)) || null; } catch { return null; }
}
export function saveAccount(acc) {
  safeSet(ACCOUNT_KEY, acc ? JSON.stringify(acc) : null);
}

const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

// Stable per browser. Also sent as push_token: the server rejects an empty one, and a shared value
// (it used to be 'web') let a sign-up overwrite whichever account last logged in on the web.
function deviceId() {
  let id = safeGet(DEVICE_KEY);
  if (!id || !id.startsWith('web-') || id.length < 20) {
    id = 'web-' + randomId();
    safeSet(DEVICE_KEY, id);
  }
  return id;
}

// Dev-only: ?mock serves demo data (removed from production builds).
const useMock = () => import.meta.env.DEV && new URLSearchParams(location.search).has('mock');
const mockFetch = (url, fields) => import('./mock.js').then(m => m.mockFetch(url, fields));

async function getData(path, params = {}) {
  const qs = new URLSearchParams({ company_id: COMPANY_ID, ...params });
  const sep = API_BASE.includes('?') ? '&' : '?';
  if (import.meta.env.DEV && useMock()) return mockFetch(`${API_BASE}${path}`);
  const res = await fetch(`${API_BASE}${path}${sep}${qs}`);
  return res.json();
}

async function postForm(path, fields) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v !== undefined && fd.append(k, v));
  if (import.meta.env.DEV && useMock()) return mockFetch(`${API_BASE}${path}`, fields);
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: fd });
  return res.json();
}

export const signIn = (email, password) =>
  postForm('login', {
    email: email.trim(),
    password,
    push_token: deviceId(),
    is_android: 0,
    environment: 'as',
    imei: deviceId(),
    company_id: COMPANY_ID,
    notification_user_id: 134,
  });

export const getAppData = token => getData('data', { token });
export const getTerms = () => getData('data').then(res => res?.appdata?.terms || '');

// Same fields as the app's SignUp.js. A fresh push token per sign-up never matches an existing user.
export const register = ({ fullName, email, password, phone, countryCode }) =>
  postForm('user', {
    full_name: fullName.trim(),
    email: email.trim(),
    password,
    phone: phone.trim(),
    country_code: phone.trim() ? countryCode.replace(/\D/g, '') : '',
    push_token: 'web-' + randomId(),
    is_android: 0,
    environment: 'as',
    imei: deviceId(),
    company_id: COMPANY_ID,
    notification_user_id: '123',
  });
export const verifyCode = (token, code) => postForm('verifyCode', { token, verification_code: code });
// Emails a "set a new password" link (also how accounts created by a WooCommerce purchase get their first password).
export const forgotPassword = email => postForm('forgotPassword', { email: email.trim() });
// One-time key from the checkout redirect or a "set your password" email link -> account with a session token.
export const loginWithKey = key => postForm('loginKey', { login_key: key });
export const setPassword = (token, password) => postForm('setPassword', { token, password });
export const PASSWORD_RE = /^[A-Za-z0-9]{4,}$/; // same rule as login validation on the server

// ?key=... inside the hash route (e.g. #/program/18?key=abc). Returns the key and removes it from the URL.
export function takeLoginKeyFromUrl() {
  const hash = window.location.hash || '';
  const q = hash.indexOf('?');
  if (q < 0) return '';
  const params = new URLSearchParams(hash.slice(q + 1));
  const key = params.get('key') || '';
  if (!key) return '';
  params.delete('key');
  const rest = params.toString();
  window.history.replaceState(null, '', window.location.pathname + window.location.search + hash.slice(0, q) + (rest ? '?' + rest : ''));
  return key;
}
export const getGeneralInfo = token => getData('getInfo', { token });
export const getAllLessons = token => getData('getLessons', { token });
export const getRelatedLessons = (token, lesson_id) => getData('getRelatedLessons', { token, lesson_id });
// packageId advances the user's position in that program by one.
export const startCourse = (token, lesson_id, packageId) =>
  postForm('startCourse', packageId ? { token, lesson_id, isPackage: true, package_id: packageId } : { token, lesson_id });
export const addFavourite = (token, lesson_id) => postForm('addFavorite', { token, lesson_id });
export const deleteFavourite = (token, lesson_id) => postForm('removeFavorite', { token, lesson_id });
export const getPositions = token => getData('getPositions', { token });
export const getBodyAreas = token => getData('getBodyAreas', { token });
// Advanced search (FindLessons.js): comma-separated ids, duration 1/2/3 = ~10/~20/~30.
export const findLessons = (token, { positions, areas, duration }) =>
  getData('getCourses', { token, position: positions.join(','), body_area: areas.join(','), ...(duration ? { duration } : {}) });
export const getAllPackages = token => getData('getPackages', { token });
export const resetPackage = (token, package_id) => postForm('resetPackagePosition', { token, package_id });
export const addFavouritePack = (token, package_id) => postForm('addFavoritePackage', { token, package_id });
export const deleteFavouritePack = (token, package_id) => postForm('removeFavoritePackage', { token, package_id });

// Programs the user may open: the ones bought in WooCommerce, or 'all' for accounts marked free in IQDesk (staff, comps).
export const ownedPrograms = appData =>
  String(appData?.free) === '1' ? 'all' : Array.isArray(appData?.purchased_packages) ? appData.purchased_packages.map(String) : [];

