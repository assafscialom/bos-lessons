import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const el = document.getElementById('bos-app');
if (el) createRoot(el).render(<App />);
