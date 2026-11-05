import React from 'react';
import { CFG } from './api';

// The teacher's logo (plugin setting, site logo or site icon); nothing when the site has none.
export function Logo() {
  return CFG.logoUrl ? <img className="bos-logo" src={CFG.logoUrl} alt={CFG.siteName || ''} /> : null;
}
