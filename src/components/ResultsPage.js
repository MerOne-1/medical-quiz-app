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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  ExpandMore,
  School,
  CheckCircle,
  Cancel,
  Timeline,
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

    const totalQuestions = themeProgress.questions?.length || 0;
    const answeredQuestions = Object.keys(themeProgress.answeredQuestions || {}).length;
    const correctAnswers = Object.values(themeProgress.answeredQuestions || {})
      .filter(answer => answer.isCorrect).length;
    const partialCorrect = Object.values(themeProgress.answeredQuestions || {})
      .filter(answer => answer.points > 0 && answer.points < 1).length;

    return {
      progress: (answeredQuestions / totalQuestions) * 100,
      correctPercentage: (correctAnswers / answeredQuestions) * 100 || 0,
      partialCorrectPercentage: (partialCorrect / answeredQuestions) * 100 || 0,
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      partialCorrect,
      score: themeProgress.stats?.correct || 0,
      total: themeProgress.stats?.total || 0,
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
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Questions Réussies
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {Object.values(progress).reduce((acc, curr) => 
                      acc + Object.values(curr.answeredQuestions || {})
                        .filter(a => a.isCorrect).length, 0)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Timeline sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Score Total
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {Object.values(progress).reduce((acc, curr) => 
                      acc + (curr.stats?.correct || 0), 0).toFixed(1)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Box sx={{ textAlign: 'center' }}>
                  <Cancel sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                  <Typography variant="h6" gutterBottom>
                    Questions à Revoir
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {Object.values(progress).reduce((acc, curr) => 
                      acc + Object.values(curr.answeredQuestions || {})
                        .filter(a => !a.isCorrect).length, 0)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed Results by Theme */}
        {themes.map((theme) => {
          const stats = calculateThemeStats(theme.id);
          if (!stats) return null;

          return (
            <Accordion key={theme.id} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                    {theme.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={stats.progress} 
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {Math.round(stats.progress)}%
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Statistiques Générales
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Questions Totales:</Typography>
                        <Typography>{stats.totalQuestions}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography>Questions Répondues:</Typography>
                        <Typography>{stats.answeredQuestions}</Typography>
                      </Box>
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
