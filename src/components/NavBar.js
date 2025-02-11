import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { School, Logout, Assessment } from '@mui/icons-material';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar>
        <IconButton
          size="large"
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={() => navigate('/')}
        >
          <School />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          QCMs CSP
        </Typography>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <Button
              color="inherit"
              startIcon={<Assessment />}
              sx={{
                display: { xs: 'none', sm: 'flex' }
              }}
            >
              Résultats
            </Button>
            <IconButton
              color="inherit"
              onClick={() => navigate('/results')}
              sx={{
                display: { xs: 'flex', sm: 'none' }
              }}
            >
              <Assessment />
            </IconButton>
              onClick={() => navigate('/results')}
            >
              Résultats
            </Button>
            <Typography 
              variant="body1" 
              sx={{ 
                display: { xs: 'none', sm: 'block' }
              }}
            >
              {user.email}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                display: { xs: 'block', sm: 'none' }
              }}
            >
              {user.email.split('@')[0]}
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              title="Déconnexion"
            >
              <Logout />
            </IconButton>
          </Box>
        ) : (
          <Box>
            <Button color="inherit" onClick={() => navigate('/login')}>
              Connexion
            </Button>
            <Button color="inherit" onClick={() => navigate('/signup')}>
              Inscription
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
