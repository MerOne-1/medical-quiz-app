import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Box,
  Button,
} from '@mui/material';
import { Science, Settings } from '@mui/icons-material';

export default function MoleculesHomePage() {
  const [themes, setThemes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadThemes = async () => {
      try {
        const response = await fetch('/molecules/data/themes.json');
        if (!response.ok) {
          throw new Error('Failed to load themes');
        }
        const data = await response.json();
        setThemes(data.themes);
      } catch (error) {
        console.error('Error loading themes:', error);
        setThemes([]);
      }
    };
    loadThemes();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Flashcards Molécules
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Sélectionnez un thème pour commencer
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<Settings />}
          onClick={() => navigate('/molecules/settings')}
          sx={{ mt: 2 }}
        >
          Gérer mes cartes
        </Button>
      </Box>

      <Grid container spacing={3}>
        {themes.map((theme) => (
          <Grid item xs={12} sm={6} md={4} key={theme.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                },
              }}
            >
              <CardActionArea
                sx={{ height: '100%' }}
                onClick={() => navigate(`/molecules/${theme.id}`)}
              >
                <CardContent sx={{ height: '100%', p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 2,
                    }}
                  >
                    <Science
                      sx={{
                        fontSize: 40,
                        color: 'primary.main',
                      }}
                    />
                  </Box>
                  <Typography
                    gutterBottom
                    variant="h5"
                    component="h2"
                    align="center"
                  >
                    {theme.title}
                  </Typography>
                  {theme.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      {theme.description}
                    </Typography>
                  )}
                  {theme.cardCount && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      align="center"
                      sx={{ display: 'block', mt: 1 }}
                    >
                      {theme.cardCount} cartes
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
