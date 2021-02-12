import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from 'context/auth-context';
import { ThemeProvider } from 'styled-components';
import GlobalStyle from '../styles/GlobalStyle';
import { darkTheme } from '../styles/theme';
import { ReactQueryConfigProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query-devtools';
import SnackbarProvider from 'react-simple-snackbar';

const config = {
  queries: {
    refetchOnWindowFocus: false,
    /**
     * @param {number} failureCount
     * @param {{ status: number; }} error
     */
    retry(failureCount, error) {
      if (error.status === 404) return false;
      else if (failureCount < 2) return true;
      else return false;
    },
  },
};

function AppProviders({ children }) {
  return (
    <ReactQueryConfigProvider config={config}>
      <Router>
        <AuthProvider>
          <SnackbarProvider>
            <ThemeProvider theme={darkTheme}>
              <GlobalStyle />
              <ReactQueryDevtools />
              {children}
            </ThemeProvider>
          </SnackbarProvider>
        </AuthProvider>
      </Router>
    </ReactQueryConfigProvider>
  );
}

export default AppProviders;
