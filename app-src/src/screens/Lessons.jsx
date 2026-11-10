import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllLessons } from '../api';
import { Tabs, useApp } from '../App.jsx';

export default function Lessons() {
  const { account, lessons, setLessons, logout } = useApp();
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
      <input
        className="bos-search"
        type="search"
        placeholder="Search lessons"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {error && <p className="bos-error">{error}</p>}
      {!lessons && !error && <div className="bos-center"><div className="bos-spinner" /></div>}
      <LessonList lessons={filtered} />
      {filtered?.length === 0 && <p className="bos-muted">No lessons match “{query}”.</p>}
    </div>
  );
}

// suffix: extra query string for the player, e.g. "?length=2". keyed: list may repeat a lesson (history).
export function LessonList({ lessons, suffix = '', keyed = false }) {
  return (
      <ul className="bos-list">
        {lessons?.map((l, i) => (
          <li key={keyed ? i : l.lesson_id}>
            <Link className="bos-lesson" to={`/lesson/${l.lesson_id}${suffix}`}>
              {l.audio_picture_thumb && <img src={l.audio_picture_thumb} alt="" loading="lazy" />}
              <div>
                <strong>
                  {l.lesson_name}
                  {l.is_done === '1' && <span className="bos-done" title="Completed">✓</span>}
                </strong>
                <p>{l.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
  );
}
