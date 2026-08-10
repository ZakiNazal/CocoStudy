import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/martian-mono';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './index.css';
import { registerMotion } from './lib/motion';

registerMotion();

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
