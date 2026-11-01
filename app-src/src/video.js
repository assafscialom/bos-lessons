// Video lessons (IQDesk: Media = Video, source YouTube or Vimeo). The admin field may hold an ID or a pasted link.

export function youtubeId(value = '') {
  const v = String(value).trim();
  const m = v.match(/(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(v) ? v : '';
}

// Returns { id, hash }; hash is the privacy key of an unlisted video (vimeo.com/123/abc or ?h=abc).
export function vimeoId(value = '') {
  const v = String(value).trim();
  const m = v.match(/^(?:https?:\/\/)?(?:www\.|player\.)?(?:vimeo\.com\/)?(?:video\/)?(\d+)(?:\/([\da-f]+))?/i);
  if (!m) return null;
  const hash = m[2] || (v.match(/[?&]h=([\da-f]+)/i) || [])[1] || '';
  return { id: m[1], hash };
}

// { provider, src } for the lesson's player, or null for an audio lesson.
export function lessonVideo(lesson) {
  if (String(lesson?.media_switcher) !== '1') return null;
  const yt = youtubeId(lesson.youtube_video_id);
  if (yt) {
    const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1', enablejsapi: '1', origin: location.origin });
    return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}?${q}` };
  }
  const vm = vimeoId(lesson.vimeo_video_id);
  if (vm) {
    const q = new URLSearchParams({ dnt: '1', playsinline: '1', ...(vm.hash ? { h: vm.hash } : {}) });
    return { provider: 'vimeo', src: `https://player.vimeo.com/video/${vm.id}?${q}` };
  }
  return null;
}

// Calls onPlay once the viewer starts the video (both players report it with postMessage).
export function onVideoPlay(iframe, provider, onPlay) {
  const origin = provider === 'youtube' ? /youtube(-nocookie)?\.com$/ : /vimeo\.com$/;
  const send = msg => iframe.contentWindow?.postMessage(JSON.stringify(msg), '*');
  const subscribe = () => (provider === 'youtube'
    ? send({ event: 'listening', id: 'sim' })
    : send({ method: 'addEventListener', value: 'play' }));
  const onMessage = e => {
    if (e.source !== iframe.contentWindow || !origin.test(new URL(e.origin).hostname)) return;
    let data;
    try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
    if (provider === 'vimeo' && data?.event === 'ready') subscribe();
    const ytPlaying = data?.event === 'onStateChange' ? data.info === 1 : data?.info?.playerState === 1;
    if ((provider === 'youtube' && ytPlaying) || (provider === 'vimeo' && data?.event === 'play')) onPlay();
  };
  window.addEventListener('message', onMessage);
  iframe.addEventListener('load', subscribe);
  subscribe();
  return () => {
    window.removeEventListener('message', onMessage);
    iframe.removeEventListener('load', subscribe);
  };
}
