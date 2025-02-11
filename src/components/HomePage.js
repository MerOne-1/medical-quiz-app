import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllQuizProgress } from '../firebase';
import { Container, Typography, Box, Grid, Card, CardContent, CardActionArea, CircularProgress, LinearProgress } from '@mui/material';
import { LocalHospital, School } from '@mui/icons-material';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [availableThemes, setAvailableThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizProgress, setQuizProgress] = useState({});

  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        const progress = await getAllQuizProgress(user.uid);
        setQuizProgress(progress);
      }
    };
    loadProgress();
  }, [user]);

  useEffect(() => {
    const loadThemes = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/themes.json');
        const data = await response.json();
        // Sort themes alphabetically
        const sortedThemes = data.sort((a, b) => a.title.localeCompare(b.title));
        setAvailableThemes(sortedThemes);
      } catch (error) {
        console.error('Error loading themes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      pt: 8,
      pb: 6
    }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <LocalHospital sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            Application de Cartes Mémoire
          </Typography>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              color: 'text.secondary',
              maxWidth: 800,
              mx: 'auto',
              mb: 4
            }}
          >
            Pratiquez et maîtrisez vos connaissances médicales avec la répétition espacée
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
            <School sx={{ color: 'primary.main' }} />
            <Typography variant="h6" color="primary.main">
              Préparation aux examens médicaux
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {availableThemes.map((theme) => (
              <Grid item xs={12} sm={6} md={4} key={theme.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      bgcolor: 'primary.main',
                      borderTopLeftRadius: 12,
                      borderTopRightRadius: 12,
                    }
                  }}
                >
                  <CardActionArea
                    onClick={() => navigate(`/quiz/${theme.id}`)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ height: '100%' }}>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                          fontWeight: 500,
                          color: 'primary.main',
                          borderBottom: '2px solid',
                          borderColor: 'primary.light',
                          pb: 1,
                          mb: 2
                        }}
                      >
                        {theme.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {theme.description}
                      </Typography>
                      {quizProgress[theme.id] && (
                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Progression
                            </Typography>
                            <Typography variant="body2" color="primary">
                              {Math.round((Object.keys(quizProgress[theme.id].answeredQuestions || {}).length / 
                                (quizProgress[theme.id].questions || []).length) * 100)}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={(Object.keys(quizProgress[theme.id].answeredQuestions || {}).length / 
                              (quizProgress[theme.id].questions || []).length) * 100}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

export default HomePage;
