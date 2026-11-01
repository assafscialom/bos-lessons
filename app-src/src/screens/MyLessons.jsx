import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Tabs, useApp } from '../App.jsx';
import { LessonList } from './Lessons.jsx';

// Port of Drawer/Favourite.js + Drawer/History.js. Data comes from getInfo (my_favorite, fav_packages, my_history).
function Page({ eyebrow, title, children }) {
  const { info, refreshInfo, logout } = useApp();
  useEffect(() => {
    refreshInfo(); // History/favourites change as the user plays lessons.
  }, []);
  return (
    <div className="bos-page">
      <header className="bos-header">
        <div>
          <p className="bos-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <button className="bos-link" onClick={logout}>Sign out</button>
      </header>
      <Tabs />
      {info ? children(info) : <div className="bos-center"><div className="bos-spinner" /></div>}
    </div>
  );
}

export function Favourites() {
  return (
    <Page eyebrow="Saved for later" title="My favourites">
      {info => {
        const lessons = info.my_favorite || [];
        const programs = info.fav_packages || [];
        if (!lessons.length && !programs.length) {
          return <p className="bos-muted">No favourites yet. Tap ♡ on a lesson or program to save it here.</p>;
        }
        return (
          <>
            {programs.length > 0 && (
              <section className="bos-section">
                <h3>Programs</h3>
                <ul className="bos-list">
                  {programs.map(p => (
                    <li key={p.package_id}>
                      <Link className="bos-lesson" to={`/program/${p.package_id}`}>
                        <div>
                          <strong>{p.package_name}</strong>
                          <p>{p.lessons?.length || 0} lessons</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {lessons.length > 0 && (
              <section className="bos-section">
                <h3>Lessons</h3>
                <LessonList lessons={lessons} />
              </section>
            )}
          </>
        );
      }}
    </Page>
  );
}

export function History() {
  return (
    <Page eyebrow="Recently played" title="My history">
      {info => {
        const lessons = info.my_history || [];
        return lessons.length
          ? <LessonList lessons={lessons} keyed />
          : <p className="bos-muted">Lessons you play will appear here.</p>;
      }}
    </Page>
  );
}
