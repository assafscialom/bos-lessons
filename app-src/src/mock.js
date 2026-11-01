// Dev-only demo data: open http://localhost:5173/?mock to browse without an account.
const AUDIO = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const lesson = (id, name, thumb) => ({
  lesson_id: String(id),
  lesson_name: name,
  description: 'Lie on your back with your knees bent. Notice how your spine meets the floor, then begin a slow, gentle movement.',
  '10_min_lesson_description': 'A short version of the lesson focusing on the essential movement.',
  audio_10m: AUDIO, audio_20m: AUDIO, audio_30m: id % 2 ? AUDIO : '',
  audio_picture_thumb: `https://picsum.photos/seed/sim${thumb}/200`,
  audio_picture: `https://picsum.photos/seed/sim${thumb}/1200/800`,
  audio_picture_v: id % 2 ? `https://picsum.photos/seed/simv${thumb}/800/1200` : '',
  gallery: id === 2 ? [1, 2, 3].map(n => `https://picsum.photos/seed/simg${n}/720/1100`) : [],
  is_done: id === 2 ? '1' : '0',
  special_notes: id === 1 ? 'Use a soft mat and a small towel under your head.' : '',
});
const LESSONS = [lesson(1, 'Awareness of the spine', 1), lesson(2, 'Easy breathing', 2),
  // Video lessons: YouTube by ID, Vimeo by a pasted link (both forms are accepted).
  { ...lesson(3, 'Soft shoulders (YouTube video)', 3), media_switcher: '1', youtube_video_id: 'aqz-KE-bpKQ', vimeo_video_id: '' },
  { ...lesson(4, 'Pelvic clock (Vimeo video)', 4), media_switcher: '1', youtube_video_id: '', vimeo_video_id: 'https://vimeo.com/76979871' }];
const PROGRAMS = [
  { id: '1', name: 'Back pain relief', description: 'Five gentle lessons to release the lower back.', picture: 'https://picsum.photos/seed/simp1/800/300', gallery: ['https://picsum.photos/seed/simg1/800/600', 'https://picsum.photos/seed/simg2/600/900'], picture_thumb: 'https://picsum.photos/seed/simp1/200', user_position: 2,
    lessons: LESSONS.map(l => ({ ...l, selected_lesson_length: '20' })) },
  { id: '2', name: 'Better breathing', description: 'Find an easier, fuller breath.', picture_thumb: 'https://picsum.photos/seed/simp2/200', user_position: 4,
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
  PROGRAMS.push({ id: '3', name: 'Easy shoulders', description: 'Release the neck and shoulders.', picture_thumb: 'https://picsum.photos/seed/simp3/200', user_position: 0, lessons: LESSONS.slice(0, 3) });
}
PROGRAMS.forEach(p => { p.purchased = LIMITED ? p.id === '1' : p.id === '2'; });

export function mockFetch(url, fields = {}) {
  const path = url.replace(/^\/api\//, '').split('?')[0];
  if (path === 'loginKey' && fields.login_key === 'bad') return Promise.resolve({ error: 'This link is invalid or has expired' });
  return Promise.resolve(DATA[path] || { status_code: 200 });
}
