import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAllQuizProgress } from '../firebase';
import { Container, Typography, Box, Grid, Card, CardContent, CardActionArea, CircularProgress, LinearProgress } from '@mui/material';
import { School, Science } from '@mui/icons-material';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [availableThemes, setAvailableThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizProgress, setQuizProgress] = useState({});

  useEffect(() => {
    const loadProgress = async () => {
      if (user) {
        try {
          console.log('Loading progress for user:', user.uid);
          const progress = await getAllQuizProgress(user.uid);
          console.log('Loaded progress:', progress);
          setQuizProgress(progress);
        } catch (error) {
          console.error('Error loading progress:', error);
        }
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

  const handleMoleculesClick = () => {
    navigate('/molecules');
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e3f2fd 100%)',
      pt: 8,
      pb: 6
    }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <img 
            src="/assets/icons/pharmacy-svgrepo-com.svg" 
            alt="Pharmacy Logo"
            style={{ 
              width: 80, 
              height: 80, 
              marginBottom: 16,
              filter: 'invert(42%) sepia(96%) saturate(427%) hue-rotate(127deg) brightness(92%) contrast(101%)'
            }} 
          />
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(45deg, #009688 30%, #00796b 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none'
            }}
          >
            Entrainement QCMs de CSP
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
            QCM interactifs pour progresser et suivre vos résultats
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 4 }}>
            <School sx={{ color: '#009688' }} />
            <Typography variant="h6" sx={{ color: '#009688', fontWeight: 600 }}>
              Préparation aux examens de pharmacie
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Molecules Project Card */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)'
                  },
                  background: '#ffffff',
                  borderRadius: 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 6,
                    background: 'linear-gradient(90deg, #009688 0%, #00796b 100%)',
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }
                }}
              >
                <CardActionArea
                  onClick={() => navigate('/molecules')}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ height: '100%' }}>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        fontWeight: 600,
                        color: '#009688',
                        borderBottom: '2px solid #e3f2fd',
                        pb: 1,
                        mb: 2
                      }}
                    >
                      Flashcards Molécules
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                      <Science sx={{ fontSize: 40, color: '#009688' }} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Apprenez et mémorisez les molécules importantes avec des cartes interactives
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            {/* Quiz Project Cards */}
            {availableThemes.map((theme) => (
              <Grid item xs={12} sm={6} md={4} key={theme.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)'
                    },
                    background: '#ffffff',
                    borderRadius: 2,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 6,
                      background: 'linear-gradient(90deg, #009688 0%, #00796b 100%)',
                      borderTopLeftRadius: 2,
                      borderTopRightRadius: 2,
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
                          fontWeight: 600,
                          color: '#009688',
                          borderBottom: '2px solid #e3f2fd',
                          pb: 1,
                          mb: 2
                        }}
                      >
                        {theme.title}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        {quizProgress[theme.id] ? (
                          <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#00796b' }}>
                                Score:
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#009688', fontWeight: 'bold' }}>
                                {Math.round((quizProgress[theme.id].stats?.correct || 0) * 100) / 100}/
                                {quizProgress[theme.id].stats?.total || 0}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={Math.round((quizProgress[theme.id].stats?.total || 0) / 
                                  (quizProgress[theme.id].totalQuestions || 1) * 100)}
                                sx={{
                                  flexGrow: 1,
                                  mr: 1,
                                  height: 10,
                                  borderRadius: 5,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: quizProgress[theme.id].completed ? '#00796b' : '#009688'
                                  }
                                }}
                              />
                              <Typography 
                                variant="body2" 
                                color={quizProgress[theme.id].completed ? '#00796b' : '#009688'}
                                sx={{ fontWeight: 'bold', minWidth: '45px', textAlign: 'right' }}
                              >
                                {Math.round((quizProgress[theme.id].stats?.total || 0) / 
                                  (quizProgress[theme.id].totalQuestions || 1) * 100)}%
                              </Typography>
                            </Box>
                          </>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={0}
                              sx={{
                                flexGrow: 1,
                                mr: 1,
                                height: 10,
                                borderRadius: 5,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: '#009688'
                                }
                              }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold', minWidth: '45px', textAlign: 'right' }}>
                              0%
                            </Typography>
                          </Box>
                        )}
                      </Box>
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
