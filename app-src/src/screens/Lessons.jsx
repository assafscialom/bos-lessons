import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllLessons } from '../api';
import { Tabs, useApp } from '../App.jsx';
import { isProgramOpen, usePackages } from './Programs.jsx';

export default function Lessons() {
  const { account, lessons, setLessons, logout } = useApp();
  usePackages(); // which program each lesson belongs to, for the locks
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (lessons) return;
    getAllLessons(account.token)
      .then(res => (Array.isArray(res?.data) ? setLessons(res.data) : setError('Could not load lessons.')))
      .catch(() => setError('Could not load lessons.'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!lessons || !q) return lessons;
    return lessons.filter(l => `${l.lesson_name} ${l.description}`.toLowerCase().includes(q));
  }, [lessons, query]);

  return (
    <div className="bos-page">
      <header className="bos-header">
        <div>
          <p className="bos-eyebrow">Online lessons</p>
          <h2>Lessons</h2>
        </div>
        <button className="bos-link" onClick={logout}>Sign out</button>
      </header>
      <Tabs />
      <p><Link className="bos-link" to="/find">Find a lesson by position, area or length ›</Link></p>
      <input
        className="bos-search"
        type="search"
        placeholder="Search lessons"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {error && <p className="bos-error">{error}</p>}
      {!lessons && !error && <div className="bos-center"><div className="bos-spinner" /></div>}
      <LessonList lessons={filtered} locks />
      {filtered?.length === 0 && <p className="bos-muted">No lessons match “{query}”.</p>}
    </div>
  );
}

// Where a lesson in the Lessons section leads: the player when a program the user may open has it (or the account
// is free), else the page of a program that has it (Buy is there); null = in no program, nothing to buy.
// Programs list their lessons (getPackages); the lesson itself carries no program id.
export function lessonTarget(lessonId, packages, purchased) {
  const withLesson = (packages || []).filter(p => p.lessons?.some(l => String(l.lesson_id) === String(lessonId)));
  if (purchased === 'all' || withLesson.some(p => isProgramOpen(p, purchased))) return { play: true };
  return { program: withLesson[0] || null };
}

// suffix: extra query string for the player, e.g. "?length=2". keyed: list may repeat a lesson (history).
// locks: show lessons the user may not play as locked (Lessons section); elsewhere the player decides.
export function LessonList({ lessons, suffix = '', keyed = false, locks = false }) {
  const { packages, purchased } = useApp();
  return (
      <ul className="bos-list">
        {lessons?.map((l, i) => {
          const target = locks ? (packages ? lessonTarget(l.lesson_id, packages, purchased) : null) : { play: true };
          const body = (
            <>
              {l.audio_picture_thumb && <img src={l.audio_picture_thumb} alt="" loading="lazy" />}
              <div className="bos-grow">
                <strong>
                  {target && !target.play && '🔒 '}
                  {l.lesson_name}
                  {l.is_done === '1' && <span className="bos-done" title="Completed">✓</span>}
                </strong>
                <p>{l.description}</p>
                {target?.program && <small className="bos-count">Part of {target.program.name}</small>}
              </div>
            </>
          );
          return (
            <li key={keyed ? i : l.lesson_id}>
              {target?.play ? (
                <Link className="bos-lesson" to={`/lesson/${l.lesson_id}${suffix}`}>{body}</Link>
              ) : target?.program ? (
                <Link className="bos-lesson bos-locked" to={`/program/${target.program.id}`}>{body}</Link>
              ) : (
                <div className="bos-lesson bos-locked" aria-disabled="true">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
  );
}
