import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { School, Logout, Assessment } from '@mui/icons-material';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    console.log('Current path:', location.pathname);
    // Molecules paths
    if (location.pathname.startsWith('/molecules/')) {
      navigate('/molecules');
      return;
    }
    if (location.pathname === '/molecules') {
      navigate('/');
      return;
    }

    // QCM paths
    if (location.pathname.includes('/quiz') || location.pathname === '/results') {
      navigate('/home');
      return;
    }
    if (location.pathname === '/home') {
      navigate('/');
      return;
    }

    // Default fallback
    navigate('/');
  };

  const showBackButton = location.pathname !== '/';
  
  const isInQcmProject = location.pathname.includes('/home') || 
                        location.pathname.includes('/quiz') || 
                        location.pathname.includes('/results');

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
      <Toolbar sx={{ gap: 1 }}>
        {showBackButton && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            size="small"
            sx={{
              mr: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <ArrowBack />
          </IconButton>
        )}
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
          {isInQcmProject ? 'QCMs CSP' : 'Sélection du Projet'}
        </Typography>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            {isInQcmProject && (
              <>
                <Button
                  color="inherit"
                  startIcon={<Assessment />}
                  onClick={() => navigate('/results')}
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
              </>
            )}
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
