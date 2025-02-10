import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Button, Box, Paper } from '@mui/material';

function HomePage() {
  const navigate = useNavigate();

  const [availableThemes, setAvailableThemes] = useState([]);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const response = await fetch('/data/themes.json');
        const data = await response.json();
        setAvailableThemes(data);
      } catch (error) {
        console.error('Error loading themes:', error);
      }
    };

    loadThemes();
  }, []);

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Application de Cartes Mémoire
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom align="center" color="text.secondary">
          Pratiquez et maîtrisez vos connaissances avec la répétition espacée
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom>
          Thèmes Disponibles
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {availableThemes.map((theme) => (
            <Paper
              key={theme.id}
              elevation={2}
              sx={{
                p: 2,
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer'
                }
              }}
              onClick={() => navigate(`/quiz/${theme.id}`)}
            >
              <Typography variant="h6" gutterBottom>
                {theme.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {theme.description}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>
    </Container>
  );
}

export default HomePage;
