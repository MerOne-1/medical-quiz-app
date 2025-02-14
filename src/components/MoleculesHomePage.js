import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserDecks } from '../utils/userDecks';
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
import { Science, Settings, School, ViewModule } from '@mui/icons-material';

export default function MoleculesHomePage() {
  const [themes, setThemes] = useState([]);
  const [personalDecks, setPersonalDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const [studyMode, setStudyMode] = useState(() => localStorage.getItem('moleculesStudyMode') || 'guided');
  const [practiceMode, setPracticeMode] = useState(() => localStorage.getItem('moleculesPracticeMode') || 'recognition');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const loadPersonalDecks = async () => {
      if (user) {
        try {
          const decks = await getUserDecks(user.uid);
          setPersonalDecks(decks);
        } catch (error) {
          console.error('Error loading personal decks:', error);
        }
      }
    };

    loadPersonalDecks();
  }, [user]);

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
      <Box sx={{ mb: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              Flashcards Molécules
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Révisez les structures moléculaires par thème
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/molecules/personal-decks')}
            startIcon={<School />}
            sx={{ height: 'fit-content' }}
          >
            Mes Decks Personnels
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant={practiceMode === 'recognition' ? 'contained' : 'outlined'}
              color="primary"
              startIcon={<ViewModule />}
              onClick={() => {
                setPracticeMode('recognition');
                localStorage.setItem('moleculesPracticeMode', 'recognition');
              }}
              sx={{
                minWidth: 200,
                backgroundColor: practiceMode === 'recognition' ? 'primary.main' : 'transparent',
                color: practiceMode === 'recognition' ? 'white' : 'primary.main',
              }}
            >
              Reconnaître les structures
            </Button>
            <Button
              variant={practiceMode === 'drawing' ? 'contained' : 'outlined'}
              color="primary"
              startIcon={<Science />}
              onClick={() => {
                setPracticeMode('drawing');
                localStorage.setItem('moleculesPracticeMode', 'drawing');
              }}
              sx={{
                minWidth: 200,
                backgroundColor: practiceMode === 'drawing' ? 'primary.main' : 'transparent',
                color: practiceMode === 'drawing' ? 'white' : 'primary.main',
              }}
            >
              S'entraîner au dessin
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Settings />}
              onClick={() => navigate('/molecules/settings')}
            >
              Gérer mes cartes
            </Button>
            <Button
              variant={studyMode === 'guided' ? 'contained' : 'outlined'}
              color="primary"
              startIcon={<School />}
              onClick={() => {
                const newMode = studyMode === 'guided' ? 'free' : 'guided';
                localStorage.setItem('moleculesStudyMode', newMode);
                setStudyMode(newMode);
                // Refresh the current page with the new mode if we're on a study page
                const currentPath = window.location.pathname;
                if (currentPath.startsWith('/molecules/') && !currentPath.includes('personal-decks')) {
                  navigate({
                    pathname: currentPath,
                    search: newMode === 'guided' ? '?mode=guided' : ''
                  });
                }
              }}
              sx={{
                minWidth: 200,
                backgroundColor: studyMode === 'guided' ? 'primary.main' : 'transparent',
                color: studyMode === 'guided' ? 'white' : 'primary.main',
              }}
            >
              {studyMode === 'guided' ? 'Mode guidé' : 'Mode libre'}
            </Button>
          </Box>
        </Box>
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
                  boxShadow: (theme) => '0 6px 20px ' + theme.palette.primary.main + '25',
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
                onClick={() => {
                  const basePath = '/molecules/' + theme.id;
                  const modePath = practiceMode === 'drawing' ? '/drawing' : '';
                  navigate({
                    pathname: basePath + modePath,
                    search: studyMode === 'guided' ? '?mode=guided' : ''
                  });
                }}
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

      {personalDecks.length > 0 && (
        <>
          <Typography variant="h4" gutterBottom sx={{ mt: 6 }}>
            Mes Decks Personnels
          </Typography>
          <Grid container spacing={4}>
            {personalDecks.map((deck) => (
              <Grid item xs={12} sm={6} md={4} key={deck.id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea
                    onClick={() => navigate(`/molecules/personal/${deck.id}/${practiceMode}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent>
                      <Typography variant="h5" component="div" gutterBottom>
                        {deck.deckName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {deck.cards?.length || 0} molécule(s)
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Container>
  );
}
