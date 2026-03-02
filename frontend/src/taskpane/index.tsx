import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../components/App';

/* global Office */

const renderApp = () => {
  const container = document.getElementById('root');
  if (!container) return;
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Office.js is only present when running inside Word.
// Fall back to direct render for browser preview.
if (typeof Office !== 'undefined') {
  Office.onReady(() => renderApp());
} else {
  renderApp();
}
