import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
  AppBar,
  Toolbar,
  Tabs,
  Tab
} from '@mui/material';
import {
  FitnessCenter as FitnessCenterIcon,
  Facebook as FacebookIcon,
  Google as GoogleIcon
} from '@mui/icons-material';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import NotificationIndicator from './NotificationIndicator';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(''); // Dummy email field
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authAPI.login(password);
      login(data.role);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSSOClick = () => {
    window.location.href = 'https://www.weather.com';
  };

  const handleTabChange = (event, newValue) => {
    navigate(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* App Bar with Navigation */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <FitnessCenterIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 700 }}>
            FitTrack
          </Typography>
          <Tabs value={location.pathname} onChange={handleTabChange} sx={{ ml: 'auto' }}>
            <Tab label="Fitness" value="/" />
            <Tab label="Login" value="/chat" />
          </Tabs>
        </Toolbar>
      </AppBar>

      {/* Login Form */}
      <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Paper elevation={2} sx={{ p: 4, width: '100%', position: 'relative' }}>
          <NotificationIndicator />
          <Typography variant="h4" component="h2" align="center" gutterBottom sx={{ fontWeight: 600 }}>
            Login
          </Typography>
          
          {/* Fake SSO Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 3 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<FacebookIcon />}
              onClick={handleSSOClick}
              sx={{ 
                bgcolor: '#1877f2',
                '&:hover': { bgcolor: '#166fe5' },
                textTransform: 'none',
                py: 1.5
              }}
            >
              Continue with Facebook
            </Button>
            
            <Button
              variant="outlined"
              fullWidth
              startIcon={<GoogleIcon />}
              onClick={handleSSOClick}
              sx={{ 
                color: '#3c4043',
                borderColor: '#dadce0',
                '&:hover': { borderColor: '#3c4043', bgcolor: 'grey.50' },
                textTransform: 'none',
                py: 1.5
              }}
            >
              Continue with Google
            </Button>
            
            <Button
              variant="contained"
              fullWidth
              onClick={handleSSOClick}
              sx={{ 
                bgcolor: '#000000',
                '&:hover': { bgcolor: '#1a1a1a' },
                textTransform: 'none',
                py: 1.5
              }}
            >
              ♪ Continue with TikTok
            </Button>
          </Box>

          {/* Divider */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              OR
            </Typography>
          </Divider>

          {/* Password Login */}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              disabled={loading}
              fullWidth
              variant="outlined"
            />
            
            <TextField
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              fullWidth
              variant="outlined"
            />
            
            <Button 
              type="submit" 
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default LoginPage;
