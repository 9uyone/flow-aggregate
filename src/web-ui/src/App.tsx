import { useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Routes, Route, Navigate } from 'react-router-dom';
import { darkTheme } from './theme/theme';
import { MainLayout } from './components/layout';
import { LoadingSpinner } from './components';
import { ParserList } from './features/parsers';
import { LoginPage } from './features/auth';
import { useAuthStore } from './store/authStore';
import { googleConfig } from './config/google';
import { useMe } from './hooks';

/**
 * Root application component.
 *
 * Why: Centralizes initialization, auth-aware routing, and global providers
 * so the UI renders only after authentication state is stable.
 */
function App() {
  const {
    isAuthenticated,
    isInitialized,
    setInitialized,
  } = useAuthStore();

  const {
    isLoading: isMeLoading,
    isFetched: isMeFetched,
    isError: isMeError,
  } = useMe();

  useEffect(() => {
    if (isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      setInitialized(true);
      return;
    }

    if (isMeFetched || isMeError) {
      setInitialized(true);
    }
  }, [isAuthenticated, isInitialized, isMeFetched, isMeError, setInitialized]);

  if (!isAuthenticated) {
    console.log('[Auth Debug] User not authenticated, showing login');
  }

  if (isAuthenticated) {
    console.log('[Auth Debug] Authenticated, waiting for /auth/me', {
      isInitialized,
      isMeLoading,
      isMeFetched,
    });
  }

  // Loading state while initializing authenticated session
  if (isAuthenticated && !isInitialized && isMeLoading && !isMeFetched) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <LoadingSpinner message="Loading..." />
      </ThemeProvider>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleConfig.clientId}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
            }
          />
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <MainLayout>
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      Dashboard
                    </Typography>
                    <Typography color="text.secondary">
                      Welcome to the Data Aggregation System
                    </Typography>
                  </Box>
                  <ParserList />
                </MainLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
