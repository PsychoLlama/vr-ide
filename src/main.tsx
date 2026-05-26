import 'the-new-css-reset/css/reset.css';
import '@fontsource-variable/inter/index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/app/App';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
