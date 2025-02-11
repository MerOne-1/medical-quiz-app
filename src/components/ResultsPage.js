import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllQuizProgress } from '../firebase';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  School,
} from '@mui/icons-material';

function ResultsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [themes, setThemes] = useState([]);
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load themes
        const themesResponse = await fetch('/data/themes.json');
        const themesData = await themesResponse.json();
        setThemes(themesData);

        // Load progress for all themes
        if (user) {
          const progressData = await getAllQuizProgress(user.uid);
          setProgress(progressData);
        }
      } catch (err) {
        console.error('Error loading results:', err);
        setError('Erreur lors du chargement des résultats');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const calculateThemeStats = (themeId) => {
    const themeProgress = progress[themeId];
    if (!themeProgress) return null;

    const totalQuestions = themeProgress.totalQuestions || 0;
    if (totalQuestions === 0) return null;

    const answeredQuestions = Object.keys(themeProgress.answeredQuestions || {}).length;
    const points = Object.values(themeProgress.answeredQuestions || {})
      .reduce((sum, answer) => sum + (answer.points || 0), 0);

    return {
      progress: (answeredQuestions / totalQuestions) * 100,
      points: Math.round(points * 10) / 10, // Round to 1 decimal
      totalQuestions,
      answeredQuestions,
      completed: answeredQuestions === totalQuestions
    };
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh' 
      }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <School sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom color="primary.main">
            Résultats et Statistiques
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Suivez votre progression et identifiez vos points forts
          </Typography>
        </Box>

        {/* Overall Progress */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Progression Globale
          </Typography>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(
                    (Object.values(progress).reduce((acc, curr) => 
                      acc + Object.keys(curr.answeredQuestions || {}).length, 0) /
                    Object.values(progress).reduce((acc, curr) => 
                      acc + (curr.totalQuestions || 0), 0)) * 100,
                    100
                  )}
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                />
                <Typography variant="body1" color="text.secondary">
                  {Math.round(
                    (Object.values(progress).reduce((acc, curr) => 
                      acc + Object.keys(curr.answeredQuestions || {}).length, 0) /
                    Object.values(progress).reduce((acc, curr) => 
                      acc + (curr.totalQuestions || 0), 0)) * 100
                  )}%
                </Typography>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Questions Répondues
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + Object.keys(curr.answeredQuestions || {}).length, 0)}
                      {' / '}
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + (curr.totalQuestions || 0), 0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Points Obtenus
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + Object.values(curr.answeredQuestions || {})
                          .reduce((sum, answer) => sum + (answer.points || 0), 0), 0).toFixed(1)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>

        {/* Detailed Results by Theme */}
        {themes.map((theme) => {
          const stats = calculateThemeStats(theme.id);
          if (!stats) return null;

          return (
            <Paper key={theme.id} sx={{ mb: 2, p: 3 }}>
              <Box sx={{ width: '100%' }}>
                <Typography variant="h6" sx={{ color: 'primary.main', mb: 2 }}>
                  {theme.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.progress} 
                    sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body1" color="text.secondary">
                    {Math.round(stats.progress)}%
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" color="text.secondary">
                      Questions répondues: {stats.answeredQuestions} / {stats.totalQuestions}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body1" color="text.secondary">
                      Points: {stats.points}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          );
        })}
      </Container>
    </Box>
  );
}

export default ResultsPage;
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Score:</Typography>
                        <Typography>{stats.score.toFixed(1)}/{stats.total}</Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Répartition des Réponses
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Réponses Correctes:</Typography>
                        <Typography color="success.main">{stats.correctAnswers}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Réponses Partiellement Correctes:</Typography>
                        <Typography color="warning.main">{stats.partialCorrect}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Réponses Incorrectes:</Typography>
                        <Typography color="error.main">
                          {stats.answeredQuestions - stats.correctAnswers - stats.partialCorrect}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Container>
    </Box>
  );
}

export default ResultsPage;
