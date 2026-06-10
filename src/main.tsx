import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import { HashRouter } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import App from './App';
import { theme } from './theme';
import './i18n';
import './index.css';

dayjs.extend(utc);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <HashRouter>
        <App />
      </HashRouter>
    </ThemeProvider>
  </React.StrictMode>
);
