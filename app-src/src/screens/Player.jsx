import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ASSETS, CFG, buyUrl, addFavourite, deleteFavourite, getAllLessons, getAllPackages, startCourse } from '../api';
import { useApp } from '../App.jsx';
import { isProgramOpen } from './Programs.jsx';
import Gallery from './Gallery.jsx';
import { lessonVideo, onVideoPlay } from '../video.js';

// Replaces react-native-track-player / react-native-sound (features/Audio/Audio.js).
const LENGTHS = [
  { key: 3, label: '~30', field: 'audio_30m' },
  { key: 2, label: '~20', field: 'audio_20m' },
  { key: 1, label: '~10', field: 'audio_10m' },
];

const fmt = s => {
  if (!Number.isFinite(s)) return '00:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mmss = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return h ? `${h}:${mmss}` : mmss;
};

export default function Player() {
  const { id } = useParams();
  const { account, lessons, setLessons, packages, setPackages, info, refreshInfo, purchased } = useApp();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const programId = search.get('program');
  const step = Number(search.get('step'));
  const program = programId ? packages?.find(p => String(p.id) === programId) : null;
  const programLesson = program?.lessons?.[step];
  const lesson = programId
    ? (String(programLesson?.lesson_id) === id ? programLesson : undefined)
    : lessons?.find(l => String(l.lesson_id) === id);
  const list = programId ? packages : lessons;

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const bellRef = useRef(null);
  const startedRef = useRef(false);
  const [length, setLength] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [favourite, setFavourite] = useState(false);

  // Deep link straight to a lesson: load the list first.
  useEffect(() => {
    // Programs are needed in both cases: a lesson opened from favourites/history is allowed if a bought program has it.
    if (!packages) getAllPackages(account.token).then(res => Array.isArray(res?.data) && setPackages(res.data));
    if (!programId && !lessons) getAllLessons(account.token).then(res => Array.isArray(res?.data) && setLessons(res.data));
  }, [programId]);

  useEffect(() => {
    if (!lesson) return;
    // A program fixes each lesson's length: selected_lesson_length "10"/"20"/"30" -> key 1/2/3 (as in Package.js).
    // ?length= comes from the advanced search's length filter.
    const preset = Number(search.get('length') || String(lesson.selected_lesson_length ?? '')[0]);
    const available = LENGTHS.filter(l => lesson[l.field]?.length > 0);
    setLength(prev => prev ?? (available.find(l => l.key === preset) ?? available[0])?.key ?? 1);
  }, [lesson]);

  useEffect(() => {
    setFavourite(Boolean(info?.my_favorite?.some(f => String(f.lesson_id) === id)));
  }, [info, id]);

  const video = lesson ? lessonVideo(lesson) : null;
  const src = lesson && length && !video ? lesson[LENGTHS.find(l => l.key === length).field] : '';

  useEffect(() => {
    setPlaying(false);
    setPosition(0);
    setDuration(0);
    startedRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!lesson || !('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: lesson.lesson_name,
      artist: CFG.siteName || '',
      artwork: lesson.audio_picture_thumb ? [{ src: lesson.audio_picture_thumb }] : [],
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-10));
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(10));
  }, [lesson]);

  // First play of the lesson: history, and the program moves on (only from its current step, so replays skip nothing).
  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    const advances = program && step === Number(program.user_position);
    startCourse(account.token, lesson.lesson_id, advances ? program.id : undefined)
      .then(() => advances && getAllPackages(account.token).then(res => Array.isArray(res?.data) && setPackages(res.data)))
      .catch(() => {});
  };
  const markStartedRef = useRef(markStarted);
  markStartedRef.current = markStarted;

  useEffect(() => {
    if (!video || !videoRef.current) return;
    startedRef.current = false;
    return onVideoPlay(videoRef.current, video.provider, () => markStartedRef.current());
  }, [video?.src, Boolean(packages)]);

  // Lessons play only as part of a bought program: the one in the URL, or (lessons/favourites/history) any bought
  // program with it. Free accounts play everything, also lessons that are in no program.
  const programsWithLesson = program ? [program] : (packages || []).filter(p => p.lessons?.some(l => String(l.lesson_id) === id));
  if (packages && purchased !== 'all' && !programsWithLesson.some(p => isProgramOpen(p, purchased))) {
    const forSale = programsWithLesson[0];
    return (
      <div className="bos-center">
        <div className="bos-card">
          <p>{forSale ? 'This lesson is part of a program you haven\'t bought.' : 'This lesson is not part of a program you own.'}</p>
          {forSale && (
            <a className="bos-btn bos-buy" href={buyUrl(forSale.id)} target="_top" rel="noopener" style={{ display: 'inline-block', marginBottom: 12 }}>
              Buy {forSale.name}
            </a>
          )}
          <p><Link to="/programs">Back to programs</Link></p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="bos-center">
        {list ? <p>Lesson not found. <Link to="/">Back to lessons</Link></p> : <div className="bos-spinner" />}
      </div>
    );
  }

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (!a.paused) return a.pause();
    // Unlock the bell during a user gesture so it can play at the end (iOS Safari).
    const bell = bellRef.current;
    if (bell && !startedRef.current) bell.play().then(() => bell.pause()).catch(() => {});
    await a.play().catch(() => {});
    markStarted();
  };

  const seekBy = s => {
    const a = audioRef.current;
    if (a) a.currentTime = Math.min(Math.max(a.currentTime + s, 0), a.duration || 0);
  };

  const toggleFavourite = async () => {
    const next = !favourite;
    setFavourite(next);
    const res = await (next ? addFavourite : deleteFavourite)(account.token, lesson.lesson_id).catch(() => null);
    if (res?.status_code === 200) refreshInfo();
    else setFavourite(!next);
  };

  const description = length === 1 ? lesson['10_min_lesson_description'] || lesson.description : lesson.description;

  return (
    <div className="bos-page bos-player">
      <header className="bos-header">
        {program
          ? <Link className="bos-link" to={`/program/${program.id}`}>‹ {program.name}</Link>
          : <button type="button" className="bos-link" onClick={() => navigate(-1)}>‹ Back</button>}
        <button className="bos-icon-btn" onClick={toggleFavourite} aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}>
          {favourite ? '♥' : '♡'}
        </button>
      </header>

      {video ? (
        <div className="bos-video">
          <iframe
            ref={videoRef}
            src={video.src}
            title={lesson.lesson_name}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
      ) : (
        <Gallery
          images={[lesson.audio_picture, lesson.audio_picture_v, ...(lesson.gallery || [])].filter(Boolean)}
          fallback={lesson.audio_picture_thumb}
          alt={lesson.lesson_name}
        />
      )}
      <h2 className="bos-title">{lesson.lesson_name}</h2>
      {video ? (
        lesson.special_notes?.length > 0 && (
          <div className="bos-lengths"><button className="bos-notes-btn" onClick={() => setShowNotes(true)} aria-label="Special notes">i</button></div>
        )
      ) : (<>

      <div className="bos-lengths" role="radiogroup" aria-label="Lesson length (minutes)">
        {LENGTHS.filter(l => lesson[l.field]?.length > 0).map(l => (
          <button
            key={l.key}
            role="radio"
            aria-checked={length === l.key}
            className={length === l.key ? 'on' : ''}
            onClick={() => setLength(l.key)}
          >
            {l.label}
          </button>
        ))}
        {lesson.special_notes?.length > 0 && (
          <button className="bos-notes-btn" onClick={() => setShowNotes(true)} aria-label="Special notes">i</button>
        )}
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => bellRef.current?.play().catch(() => {})}
      />
      <audio ref={bellRef} src={`${ASSETS}bell.m4a`} preload="auto" />

      <input
        className="bos-seek"
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={position}
        onChange={e => (audioRef.current.currentTime = Number(e.target.value))}
        aria-label="Seek"
      />
      <div className="bos-times"><span>{fmt(position)}</span><span>{fmt(duration)}</span></div>

      <div className="bos-controls">
        <button className="bos-icon-btn" onClick={() => seekBy(-10)} aria-label="Back 10 seconds">−10</button>
        <button className="bos-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
        <button className="bos-icon-btn" onClick={() => seekBy(10)} aria-label="Forward 10 seconds">+10</button>
      </div>
      </>)}

      {description && <p className="bos-desc">{description}</p>}

      {showNotes && (
        <div className="bos-modal" onClick={() => setShowNotes(false)}>
          <div className="bos-card" onClick={e => e.stopPropagation()}>
            <p>{lesson.special_notes}</p>
            <button className="bos-btn" onClick={() => setShowNotes(false)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

