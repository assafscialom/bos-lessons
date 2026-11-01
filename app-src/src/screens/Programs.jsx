import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addFavouritePack, buyUrl, deleteFavouritePack, getAllPackages, resetPackage } from '../api';
import { Tabs, useApp } from '../App.jsx';
import Gallery from './Gallery.jsx';

// Port of features/Packages. A program is an ordered lesson list; lesson N unlocks once user_position >= N.
export function usePackages() {
  const { account, packages, setPackages } = useApp();
  const [error, setError] = useState('');
  const reload = () =>
    getAllPackages(account.token)
      .then(res => (Array.isArray(res?.data) ? setPackages(res.data) : setError('Could not load programs.')))
      .catch(() => setError('Could not load programs.'));
  useEffect(() => {
    if (!packages) reload();
  }, []);
  return { packages, error, reload };
}

const progress = p => Math.min(Number(p.user_position) || 0, p.lessons?.length || 0);

// Programs are one-time purchases (WooCommerce): open only if bought. purchased is a list of ids or 'all' (free accounts).
export const isProgramOpen = (p, purchased) => purchased === 'all' || Boolean(p.purchased) || purchased.includes(String(p.id));

function BuyButton({ program }) {
  return (
    <a className="bos-btn bos-buy" href={buyUrl(program.id)} target="_top" rel="noopener">
      Buy program
    </a>
  );
}

export function Programs() {
  const { logout, purchased } = useApp();
  const { packages, error } = usePackages();

  return (
    <div className="bos-page">
      <header className="bos-header">
        <div>
          <p className="bos-eyebrow">Step by step</p>
          <h2>Programs</h2>
        </div>
        <button className="bos-link" onClick={logout}>Sign out</button>
      </header>
      <Tabs />
      {error && <p className="bos-error">{error}</p>}
      {!packages && !error && <div className="bos-center"><div className="bos-spinner" /></div>}
      <ul className="bos-list">
        {packages?.map(p => {
          const total = p.lessons?.length || 0;
          const done = progress(p);
          if (!isProgramOpen(p, purchased)) {
            return (
              <li key={p.id}>
                <div className="bos-lesson bos-locked">
                  {(p.picture_thumb || p.picture) && <img src={p.picture_thumb || p.picture} alt="" loading="lazy" />}
                  <div className="bos-grow">
                    <strong>🔒 {p.name}</strong>
                    <p>{p.description}</p>
                  </div>
                  <BuyButton program={p} />
                </div>
              </li>
            );
          }
          return (
            <li key={p.id}>
              <Link className="bos-lesson" to={`/program/${p.id}`}>
                {(p.picture_thumb || p.picture) && <img src={p.picture_thumb || p.picture} alt="" loading="lazy" />}
                <div className="bos-grow">
                  <strong>{p.name}{p.purchased && <span className="bos-chip-owned">Purchased</span>}</strong>
                  <p>{p.description}</p>
                  <div className="bos-progress" aria-label={`${done} of ${total} lessons done`}>
                    <span style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
                  </div>
                  <small className="bos-count">{done === total && total ? 'Completed ✓' : `${done} / ${total} lessons`}</small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Program() {
  const { id } = useParams();
  const { account, info, refreshInfo, purchased } = useApp();
  const { packages, reload } = usePackages();
  const [favourite, setFavourite] = useState(false);
  const [message, setMessage] = useState('');
  const program = packages?.find(p => String(p.id) === id);

  useEffect(() => {
    setFavourite(Boolean(info?.fav_packages?.some(f => String(f.package_id) === id)));
  }, [info, id]);

  if (!program) {
    return (
      <div className="bos-center">
        {packages ? <p>Program not found. <Link to="/programs">Back to programs</Link></p> : <div className="bos-spinner" />}
      </div>
    );
  }

  if (!isProgramOpen(program, purchased)) {
    return (
      <div className="bos-page">
        <header className="bos-header"><Link className="bos-link" to="/programs">‹ Programs</Link></header>
        <div className="bos-finished">
          <div>
            <strong>🔒 {program.name}</strong>
            <p className="bos-lead">Buy this program to open its {program.lessons?.length || ''} lessons in the app.</p>
          </div>
          <BuyButton program={program} />
        </div>
      </div>
    );
  }

  const lessons = program.lessons || [];
  const position = progress(program);
  const finished = lessons.length > 0 && position >= lessons.length;

  const toggleFavourite = async () => {
    const next = !favourite;
    setFavourite(next);
    const res = await (next ? addFavouritePack : deleteFavouritePack)(account.token, program.id).catch(() => null);
    if (res?.status_code === 200) refreshInfo();
    else setFavourite(!next);
  };

  const repeat = async () => {
    const res = await resetPackage(account.token, program.id).catch(() => null);
    if (res?.status_code == 200) {
      await reload();
      setMessage('Everything is ready, you can do the program again.');
    } else setMessage('Could not reset the program. Please try again.');
  };

  return (
    <div className="bos-page">
      <header className="bos-header">
        <Link className="bos-link" to="/programs">‹ Programs</Link>
        <button className="bos-icon-btn" onClick={toggleFavourite} aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}>
          {favourite ? '♥' : '♡'}
        </button>
      </header>

      <Gallery images={[program.picture, ...(program.gallery || [])].filter(Boolean)} alt={program.name} />
      <p className="bos-eyebrow">Program · {lessons.length} lessons</p>
      <h2>{program.name}</h2>
      {program.description && <p className="bos-lead">{program.description}</p>}

      <div className="bos-progress bos-progress-lg" aria-label={`${position} of ${lessons.length} lessons done`}>
        <span style={{ width: lessons.length ? `${(position / lessons.length) * 100}%` : 0 }} />
      </div>
      <p className="bos-count">{position} / {lessons.length} lessons done</p>

      {finished && (
        <div className="bos-finished">
          <strong>You finished the program! 🥳</strong>
          <button className="bos-btn" onClick={repeat}>Repeat the program</button>
        </div>
      )}
      {message && <p className="bos-muted" role="status">{message}</p>}

      <ol className="bos-steps">
        {lessons.map((l, i) => {
          const state = i < position ? 'done' : i === position ? 'current' : 'locked';
          const body = (
            <>
              <span className="bos-step-num">{state === 'done' ? '✓' : state === 'locked' ? '🔒' : i + 1}</span>
              <span className="bos-grow">
                <strong>{l.lesson_name}</strong>
                {state === 'current' && <small>Next lesson</small>}
              </span>
            </>
          );
          return (
            <li key={`${l.lesson_id}-${i}`}>
              {state === 'locked' ? (
                <div className={`bos-step ${state}`} aria-disabled="true">{body}</div>
              ) : (
                <Link className={`bos-step ${state}`} to={`/lesson/${l.lesson_id}?program=${program.id}&step=${i}`}>{body}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
