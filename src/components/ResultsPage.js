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
    <Box sx={{ 
      bgcolor: 'background.default', 
      minHeight: '100vh', 
      py: 6,
      background: 'linear-gradient(180deg, rgba(0, 150, 136, 0.05) 0%, rgba(255, 255, 255, 0) 100%)'
    }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <School sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" component="h1" gutterBottom color="primary.main">
            Résultats et Statistiques
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Suivez votre progression et identifiez vos points forts
          </Typography>
        </Box>

        {/* Overall Progress */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Progression Globale
          </Typography>
          <Paper elevation={1} sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 1 }}>
            <Box sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.min(
                    (Object.values(progress).reduce((acc, curr) => 
                      acc + Object.keys(curr.answeredQuestions || {}).length, 0) /
                    Object.values(progress).reduce((acc, curr) => 
                      acc + (curr.totalQuestions || 0), 0)) * 100,
                    100
                  )}
                  sx={{ 
                    flexGrow: 1, 
                    height: 8, 
                    borderRadius: 4,
                    backgroundColor: 'rgba(0, 150, 136, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #009688 0%, #00796b 100%)'
                    }
                  }}
                />
                <Typography variant="h6" color="primary.main" sx={{ minWidth: '60px', textAlign: 'right' }}>
                  {Math.round(
                    (Object.values(progress).reduce((acc, curr) => 
                      acc + Object.keys(curr.answeredQuestions || {}).length, 0) /
                    Object.values(progress).reduce((acc, curr) => 
                      acc + (curr.totalQuestions || 0), 0)) * 100
                  )}%
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ 
                    textAlign: 'center',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#4caf50',
                    color: '#ffffff'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Questions Réussies
                    </Typography>
                    <Typography variant="h5">
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + Object.values(curr.answeredQuestions || {})
                          .filter(answer => answer.points === 1).length, 0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    textAlign: 'center',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#2196f3',
                    color: '#ffffff'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Questions Répondues
                    </Typography>
                    <Typography variant="h5">
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + Object.keys(curr.answeredQuestions || {}).length, 0)}
                      {' / '}
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + (curr.totalQuestions || 0), 0)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ 
                    textAlign: 'center',
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: '#f44336',
                    color: '#ffffff'
                  }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Questions à Revoir
                    </Typography>
                    <Typography variant="h5">
                      {Object.values(progress).reduce((acc, curr) => 
                        acc + Object.values(curr.answeredQuestions || {})
                          .filter(answer => answer.points === 0).length, 0)}
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
            <Paper 
              key={theme.id} 
              sx={{ 
                mb: 2, 
                p: 3,
                bgcolor: '#ffffff'
              }}
            >
              <Box sx={{ width: '100%' }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'primary.main', 
                    mb: 2,
                    fontWeight: 600,
                    fontSize: '1.25rem'
                  }}
                >
                  {theme.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.progress} 
                    sx={{ 
                      flexGrow: 1, 
                      height: 12, 
                      borderRadius: 6,
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #2196f3 0%, #1976d2 100%)'
                      }
                    }}
                  />
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'primary.main',
                      minWidth: '60px',
                      textAlign: 'right',
                      fontWeight: 600
                    }}
                  >
                    {Math.round(stats.progress)}%
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: '#2196f3',
                      color: '#ffffff',
                      textAlign: 'center'
                    }}>
                      <Typography variant="body1" gutterBottom>
                        Questions répondues
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {stats.answeredQuestions} / {stats.totalQuestions}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: 2,
                      bgcolor: stats.points > (stats.totalQuestions * 0.7) ? '#4caf50' : '#ff9800',
                      color: '#ffffff',
                      textAlign: 'center'
                    }}>
                      <Typography variant="body1" gutterBottom>
                        Points
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 600 }}>
                        {stats.points}
                      </Typography>
                    </Box>
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
