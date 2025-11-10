import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import axios from 'axios';

import App from './App';
import theme from './styles/theme';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || ''; // URL vacía para rutas relativas

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <CssBaseline />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
