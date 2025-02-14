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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadThemes = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Loading themes...');
        const response = await fetch('/molecules/data/themes.json');
        if (!response.ok) {
          throw new Error('Failed to load themes');
        }
        const data = await response.json();
        console.log('Loaded data:', data);
        if (!data || !data.themes) {
          throw new Error('Invalid themes data');
        }
        setThemes(data.themes);
      } catch (error) {
        console.error('Error loading themes:', error);
        setError(error.message);
        setThemes([]);
      } finally {
        setLoading(false);
      }
    };
    loadThemes();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <Typography variant="h5">Loading themes...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh' }}>
        <Typography variant="h5" color="error" gutterBottom>{error}</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>Retry</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Flashcards Molécules
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Révisez les structures moléculaires par thème
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
                borderRadius: 2,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => `0 6px 20px ${theme.palette.primary.main}25`,
                  '& .MuiSvgIcon-root': {
                    transform: 'scale(1.1)',
                  }
                },
                '& .MuiSvgIcon-root': {
                  transition: 'transform 0.3s ease-in-out',
                }
              }}
            >
              <CardActionArea
                sx={{ height: '100%' }}
                onClick={() => navigate(`/molecules/${theme.id}`)}
              >
                <CardContent sx={{ height: '100%', p: 3 }}>
                  <Box
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      p: 1
                    }}
                  >
                    <Science
                      sx={{
                        fontSize: { xs: 45, sm: 50 },
                        color: 'primary.main',
                      }}
                    />
                    <Typography
                      variant="h5"
                      component="h2"
                      align="center"
                      sx={{
                        fontWeight: 'medium',
                        color: 'text.primary',
                        lineHeight: 1.3
                      }}
                    >
                      {theme.title}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
