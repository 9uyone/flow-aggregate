import { Box, Paper, Typography, Container } from '@mui/material';
import { useEffect } from 'react';
import { GoogleLoginButton } from './GoogleLoginButton';
import { Dashboard as DashboardIcon } from '@mui/icons-material';

export const LoginPage: React.FC = () => {
  useEffect(() => {
    document.title = 'FlowAggregate - Login';
  }, []);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={4}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo/Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              mb: 3,
            }}
          >
            <DashboardIcon sx={{ fontSize: 48, color: 'primary.contrastText' }} />
          </Box>

          {/* Title */}
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Data Aggregator
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ mb: 4 }}
          >
            Sign in to access your microservices data aggregation dashboard
          </Typography>

          {/* Google Login Button */}
          <GoogleLoginButton />

          {/* Footer */}
          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ mt: 4 }}
          >
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
