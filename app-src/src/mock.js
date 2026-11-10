// Dev-only demo data: open http://localhost:5173/?mock to browse without an account.
const AUDIO = '/bell.m4a'; // the short sound shipped in public/, so the demo needs no network
// Placeholder pictures drawn locally (no remote image service).
const pic = (seed, w, h = w) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="hsl(${[...String(seed)].reduce((n, c) => n + c.charCodeAt(0) * 37, 0) % 360} 35% 70%)"/></svg>`);
const lesson = (id, name, thumb) => ({
  lesson_id: String(id),
  lesson_name: name,
  description: 'Lie on your back with your knees bent. Notice how your spine meets the floor, then begin a slow, gentle movement.',
  '10_min_lesson_description': 'A short version of the lesson focusing on the essential movement.',
  audio_10m: AUDIO, audio_20m: AUDIO, audio_30m: id % 2 ? AUDIO : '',
  audio_picture_thumb: pic(`sim${thumb}`, 200),
  audio_picture: pic(`sim${thumb}`, 1200, 800),
  audio_picture_v: id % 2 ? pic(`simv${thumb}`, 800, 1200) : '',
  gallery: id === 2 ? [1, 2, 3].map(n => pic(`simg${n}`, 720, 1100)) : [],
  is_done: id === 2 ? '1' : '0',
  special_notes: id === 1 ? 'Use a soft mat and a small towel under your head.' : '',
});
const LESSONS = [lesson(1, 'Awareness of the spine', 1), lesson(2, 'Easy breathing', 2),
  // Video lessons: YouTube by ID, Vimeo by a pasted link (both forms are accepted).
  { ...lesson(3, 'Soft shoulders (YouTube video)', 3), media_switcher: '1', youtube_video_id: 'aqz-KE-bpKQ', vimeo_video_id: '' },
  { ...lesson(4, 'Pelvic clock (Vimeo video)', 4), media_switcher: '1', youtube_video_id: '', vimeo_video_id: 'https://vimeo.com/76979871' }];
const PROGRAMS = [
  { id: '1', name: 'Back pain relief', description: 'Five gentle lessons to release the lower back.', picture: pic('simp1', 800, 300), gallery: [pic('simg1', 800, 600), pic('simg2', 600, 900)], picture_thumb: pic('simp1', 200), user_position: 2,
    lessons: LESSONS.map(l => ({ ...l, selected_lesson_length: '20' })) },
  { id: '2', name: 'Better breathing', description: 'Find an easier, fuller breath.', picture_thumb: pic('simp2', 200), user_position: 4,
    lessons: LESSONS.map(l => ({ ...l, selected_lesson_length: '10' })) },
];
const DATA = {
  data: { success: 1, free: '1', appdata: { terms: '<h1>Disclaimer &amp; Privacy Policy</h1><p>Demo terms text.</p>' } },
  getInfo: { status_code: 200, data: { my_favorite: [LESSONS[1]], fav_packages: [{ package_id: '2', package_name: 'Better breathing', lessons: LESSONS }], my_history: [LESSONS[0], LESSONS[2], LESSONS[0]] } },
  getLessons: { status_code: 200, data: LESSONS },
  getPositions: { status_code: 200, data: [{ id: '1', title: 'Lying on back' }, { id: '2', title: 'Lying on side' }, { id: '3', title: 'Sitting' }, { id: '4', title: 'Standing' }] },
  getBodyAreas: { status_code: 200, data: [{ id: '1', title: 'Neck & shoulders' }, { id: '2', title: 'Lower back' }, { id: '3', title: 'Hips' }, { id: '4', title: 'Breathing' }, { id: '5', title: 'Balance' }] },
  getCourses: { status_code: 200, data: LESSONS.slice(0, 2) },
  getPackages: { status_code: 200, data: PROGRAMS },
  login: { token: 'demo-token', name: 'Demo' },
  user: { token: 'demo-token', email: 'new@example.com', status: '0' },
  verifyCode: { status_code: 200, data: { status: 1 } },
  forgotPassword: { message: 'Check your mail' },
  loginKey: { token: 'demo-token', email: 'buyer@example.com', full_name: 'Dana', status: '1', needs_password: true },
  setPassword: { status_code: 200, success: 1 },
};
const LIMITED = new URLSearchParams(location.search).has('limited');
if (LIMITED) {
  DATA.data = { success: 1, free: '0', registered_date: '2025-01-01 00:00:00', purchased_packages: ['1'], appdata: DATA.data.appdata };
  // Lesson 5 is only in program 3 (not bought) -> locked, leads to program 3; lesson 6 is in no program -> locked, no link.
  LESSONS.push(lesson(5, 'Rolling to sitting', 5), lesson(6, 'Standing balance', 6));
  PROGRAMS.push({ id: '3', name: 'Easy shoulders', description: 'Release the neck and shoulders.', picture_thumb: pic('simp3', 200), user_position: 0, lessons: [...LESSONS.slice(0, 3), LESSONS[4]] });
}
PROGRAMS.forEach(p => { p.purchased = LIMITED ? p.id === '1' : p.id === '2'; });

export function mockFetch(url, fields = {}) {
  const path = url.replace(/^\/api\//, '').split('?')[0];
  if (path === 'loginKey' && fields.login_key === 'bad') return Promise.resolve({ error: 'This link is invalid or has expired' });
  return Promise.resolve(DATA[path] || { status_code: 200 });
}
