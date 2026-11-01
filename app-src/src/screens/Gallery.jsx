import React, { useRef, useState } from 'react';

// Image slider for lesson and program images from the admin. Several images -> scroll-snap slider; click opens a full-screen viewer.
export default function Gallery({ images, fallback, alt }) {
  const list = images.length ? images : fallback ? [fallback] : [];
  const trackRef = useRef(null);
  const dialogRef = useRef(null);
  const viewerRef = useRef(null);
  const [index, setIndex] = useState(0);

  if (!list.length) return null;

  const go = (ref, i) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' });
  };
  const onScroll = e => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth));
  const open = i => {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => viewerRef.current && (viewerRef.current.scrollLeft = viewerRef.current.clientWidth * i));
  };
  const multi = list.length > 1;

  const arrows = ref => multi && (
    <>
      <button type="button" className="bos-slide-btn prev" aria-label="Previous image" onClick={() => go(ref, Math.max(index - 1, 0))} disabled={index === 0}>‹</button>
      <button type="button" className="bos-slide-btn next" aria-label="Next image" onClick={() => go(ref, Math.min(index + 1, list.length - 1))} disabled={index === list.length - 1}>›</button>
    </>
  );

  return (
    <div className="bos-gallery">
      <div className="bos-slider">
        <div className="bos-track" ref={trackRef} onScroll={onScroll}>
          {list.map((src, i) => (
            <button key={src} type="button" className="bos-slide" onClick={() => open(i)} aria-label={`Open image ${i + 1} full size`}>
              <img src={src} alt={i === 0 ? alt : ''} loading={i ? 'lazy' : 'eager'} />
            </button>
          ))}
        </div>
        {arrows(trackRef)}
      </div>
      {multi && (
        <div className="bos-dots">
          {list.map((src, i) => (
            <button key={src} type="button" aria-label={`Image ${i + 1}`} aria-current={i === index} onClick={() => go(trackRef, i)} />
          ))}
        </div>
      )}

      <dialog ref={dialogRef} className="bos-viewer" onClick={e => e.target === e.currentTarget && dialogRef.current.close()}>
        <button type="button" className="bos-viewer-close" aria-label="Close" onClick={() => dialogRef.current.close()}>✕</button>
        <div className="bos-track" ref={viewerRef} onScroll={onScroll}>
          {list.map(src => (
            <div key={src} className="bos-slide"><img src={src} alt="" /></div>
          ))}
        </div>
        {arrows(viewerRef)}
      </dialog>
    </div>
  );
}
