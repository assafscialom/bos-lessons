import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { findLessons, getBodyAreas, getPositions } from '../api';
import { Tabs, useApp } from '../App.jsx';
import { LessonList } from './Lessons.jsx';

// Port of features/FindLessons. Filters live in the URL so "back" from a lesson keeps the results.
const LENGTHS = [{ value: 3, label: '~30' }, { value: 2, label: '~20' }, { value: 1, label: '~10' }];
const ids = v => (v ? v.split(',') : []);

function Chips({ legend, options, selected, onToggle }) {
  return (
    <fieldset className="bos-filter">
      <legend>{legend}</legend>
      <div className="bos-chips">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className="bos-chip"
            aria-pressed={selected.includes(String(o.value))}
            onClick={() => onToggle(String(o.value))}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function FindLessons() {
  const { account, logout } = useApp();
  const [params, setParams] = useSearchParams();
  const [positions, setPositions] = useState(null);
  const [areas, setAreas] = useState(null);
  const [draft, setDraft] = useState({ pos: ids(params.get('pos')), area: ids(params.get('area')), len: params.get('len') || '' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searched = params.has('go');

  useEffect(() => {
    const opts = res => (Array.isArray(res?.data) ? res.data.map(o => ({ value: o.id, label: o.title })) : []);
    getPositions(account.token).then(r => setPositions(opts(r))).catch(() => setPositions([]));
    getBodyAreas(account.token).then(r => setAreas(opts(r))).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    if (!searched) return setResults(null);
    setLoading(true);
    setError('');
    findLessons(account.token, { positions: ids(params.get('pos')), areas: ids(params.get('area')), duration: params.get('len') })
      .then(res => setResults(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [params]);

  const toggle = (key, value) =>
    setDraft(d => ({ ...d, [key]: d[key].includes(value) ? d[key].filter(v => v !== value) : [...d[key], value] }));

  const search = e => {
    e.preventDefault();
    const next = { go: '1' };
    if (draft.pos.length) next.pos = draft.pos.join(',');
    if (draft.area.length) next.area = draft.area.join(',');
    if (draft.len) next.len = draft.len;
    setParams(next);
  };

  const clear = () => {
    setDraft({ pos: [], area: [], len: '' });
    setParams({});
  };

  return (
    <div className="bos-page">
      <header className="bos-header">
        <div>
          <p className="bos-eyebrow">Advanced search</p>
          <h2>Find a lesson</h2>
        </div>
        <button className="bos-link" onClick={logout}>Sign out</button>
      </header>
      <Tabs />

      <form className="bos-card bos-find" onSubmit={search}>
        {!positions || !areas ? (
          <div className="bos-spinner" />
        ) : (
          <>
            <Chips legend="Position" options={positions} selected={draft.pos} onToggle={v => toggle('pos', v)} />
            <Chips legend="Area / Action" options={areas} selected={draft.area} onToggle={v => toggle('area', v)} />
            <Chips
              legend="Lesson length (minutes)"
              options={LENGTHS}
              selected={draft.len ? [draft.len] : []}
              onToggle={v => setDraft(d => ({ ...d, len: d.len === v ? '' : v }))}
            />
            <div className="bos-find-actions">
              <button className="bos-btn" type="submit">Search</button>
              <button className="bos-btn bos-btn-ghost" type="button" onClick={clear}>Clear</button>
            </div>
          </>
        )}
      </form>

      {error && <p className="bos-error">{error}</p>}
      {loading && <div className="bos-center"><div className="bos-spinner" /></div>}
      {!loading && results && (
        <>
          <p className="bos-count bos-results-count" role="status">{results.length} lessons found</p>
          <LessonList lessons={results} suffix={params.get('len') ? `?length=${params.get('len')}` : ''} />
        </>
      )}
    </div>
  );
}
