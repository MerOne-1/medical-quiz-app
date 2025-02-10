import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveQuizProgress, loadQuizProgress, resetQuizProgress } from '../firebase';
import {
  Container,
  Typography,
  Box,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Alert,
  IconButton,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { ArrowBack, ArrowForward, Home, School } from '@mui/icons-material';

function QuizPage() {
  const { theme } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [answeredQuestions, setAnsweredQuestions] = useState({});
  const [skippedQuestions, setSkippedQuestions] = useState([]);
  const [hasProgress, setHasProgress] = useState(false);

  const [themeInfo, setThemeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Load saved progress when component mounts
  useEffect(() => {
    const loadSavedProgress = async () => {
      if (user && theme) {
        const progress = await loadQuizProgress(user.uid, theme);
        if (progress) {
          setHasProgress(true);
          setQuestions(progress.questions || []);
          setCurrentQuestionIndex(progress.currentQuestionIndex || 0);
          setStats(progress.stats || { correct: 0, total: 0 });
          setAnsweredQuestions(progress.answeredQuestions || {});
          setSkippedQuestions(progress.skippedQuestions || []);
        }
      }
    };
    loadSavedProgress();
  }, [user, theme]);

  // Save progress whenever relevant state changes
  useEffect(() => {
    const saveProgress = async () => {
      if (user && theme && questions.length > 0) {
        await saveQuizProgress(user.uid, theme, {
          questions,
          currentQuestionIndex,
          stats,
          answeredQuestions,
          skippedQuestions,
          lastUpdated: new Date(),
        });
      }
    };
    saveProgress();
  }, [user, theme, questions, currentQuestionIndex, stats, answeredQuestions, skippedQuestions]);

  useEffect(() => {
    console.log('QuizPage mounted, theme:', theme);
    const loadThemeData = async () => {
      try {
        setLoading(true);
        console.log('Loading theme:', theme);

        // Load theme information
        const themesResponse = await fetch('/data/themes.json');
        if (!themesResponse.ok) {
          throw new Error(`Failed to load themes.json: ${themesResponse.status}`);
        }
        const themesData = await themesResponse.json();
        const currentTheme = themesData.find(t => t.id === theme);
        console.log('Found theme:', currentTheme);

        if (!currentTheme) {
          throw new Error(`Theme not found: ${theme}`);
        }

        setThemeInfo(currentTheme);

        // Load questions for the theme
        const questionsResponse = await fetch(`/data/${currentTheme.filename}`);
        if (!questionsResponse.ok) {
          throw new Error(`Failed to load questions: ${questionsResponse.status}`);
        }

        const data = await questionsResponse.json();
        console.log('Loaded quiz data:', {
          theme: data.theme,
          questionCount: data.questions.length,
          firstQuestion: data.questions[0]
        });

        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('No questions found in the file');
        }

        // Shuffle all questions for better learning experience
        // Only shuffle questions if there's no saved progress
        const shuffledQuestions = hasProgress ? data.questions : data.questions.sort(() => Math.random() - 0.5);

        setQuestions(shuffledQuestions);
        console.log('Set questions, count:', shuffledQuestions.length);
      } catch (error) {
        console.error('Error loading theme data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadThemeData();
  }, [theme]);

  const currentQuestion = questions[currentQuestionIndex];

  const getOptionStyle = (option) => {
    if (!showFeedback) {
      return {};
    }
    const isSelected = selectedAnswers.includes(option);
    const isCorrect = currentQuestion.correct_answers.includes(option);
    
    if (isSelected && isCorrect) {
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' }; // Green background for correct selected
    } else if (isSelected && !isCorrect) {
      return { backgroundColor: '#ffebee', color: '#c62828' }; // Red background for incorrect selected
    } else if (!isSelected && isCorrect) {
      return { backgroundColor: '#e8f5e9', color: '#2e7d32' }; // Green background for correct unselected
    }
    return {};
  };

  const handleAnswerChange = (option) => {
    if (selectedAnswers.includes(option)) {
      setSelectedAnswers(selectedAnswers.filter((answer) => answer !== option));
    } else {
      setSelectedAnswers([...selectedAnswers, option]);
    }
  };

  const checkAnswer = () => {
    const correct = currentQuestion.correct_answers;
    
    // Count wrong answers (both missing correct ones and selecting wrong ones)
    let wrongAnswers = 0;
    
    // Check for incorrect selections
    wrongAnswers += selectedAnswers.filter(answer => !correct.includes(answer)).length;
    
    // Check for missing correct answers
    wrongAnswers += correct.filter(answer => !selectedAnswers.includes(answer)).length;
    
    // Calculate points based on wrong answers
    let points = 0;
    if (wrongAnswers === 0) points = 1;
    else if (wrongAnswers === 1) points = 0.5;
    else if (wrongAnswers === 2) points = 0.2;
    // 3 or more wrong answers = 0 points (default)
    
    setIsCorrect(wrongAnswers === 0);
    setShowFeedback(true);
    setStats(prev => ({
      correct: prev.correct + points,
      total: prev.total + 1,
    }));
  };

  const navigateQuestion = (direction) => {
    // Save current question state if answered
    if (showFeedback) {
      setAnsweredQuestions(prev => ({
        ...prev,
        [currentQuestionIndex]: {
          selectedAnswers,
          isCorrect: selectedAnswers.length > 0 ? isCorrect : null,
          points: stats.correct - (Object.values(prev).reduce((sum, q) => sum + (q.points || 0), 0) || 0)
        }
      }));
    }

    setSelectedAnswers([]);
    setShowFeedback(false);
    
    if (direction === 'next') {
      setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % questions.length);
    } else if (direction === 'prev') {
      setCurrentQuestionIndex((prevIndex) => (prevIndex - 1 + questions.length) % questions.length);
    }
  };

  const skipQuestion = () => {
    setSkippedQuestions(prev => [...prev, currentQuestionIndex]);
    navigateQuestion('next');
  };

  // Restore previous answers when navigating back
  useEffect(() => {
    const savedState = answeredQuestions[currentQuestionIndex];
    if (savedState) {
      setSelectedAnswers(savedState.selectedAnswers);
      setIsCorrect(savedState.isCorrect);
      setShowFeedback(true);
    }
  }, [currentQuestionIndex]);

  if (!currentQuestion || questions.length === 0) {
    return (
      <Box sx={{ 
        bgcolor: 'background.default', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Chargement du quiz...
        </Typography>
      </Box>
    );
  }

  if (loading || error) {
    return (
      <Box sx={{ 
        bgcolor: 'background.default', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 2
      }}>
        {loading ? (
          <CircularProgress size={60} />
        ) : (
          <>
            <Typography variant="h6" color="error" align="center">
              {error}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              startIcon={<Home />}
            >
              Retour à l'accueil
            </Button>
          </>
        )}
      </Box>
    );
  }

  const handleResetProgress = async () => {
    if (user && theme) {
      await resetQuizProgress(user.uid, theme);
      // Reset local state
      setCurrentQuestionIndex(0);
      setSelectedAnswers([]);
      setShowFeedback(false);
      setIsCorrect(false);
      setStats({ correct: 0, total: 0 });
      setAnsweredQuestions({});
      setSkippedQuestions([]);
      setHasProgress(false);
      // Reload questions in random order
      setQuestions(prev => [...prev].sort(() => Math.random() - 0.5));
    }
    setResetDialogOpen(false);
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      {/* Progress bar */}
      {!loading && !error && questions.length > 0 && (
        <Container maxWidth="md">
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progression: {Math.round((Object.keys(answeredQuestions).length / questions.length) * 100)}%
              </Typography>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                onClick={() => setResetDialogOpen(true)}
              >
                Réinitialiser le progrès
              </Button>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(Object.keys(answeredQuestions).length / questions.length) * 100} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        </Container>
      )}
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => navigate('/')} color="primary" sx={{ p: 1 }}>
            <Home />
          </IconButton>
          <Typography variant="h4" sx={{ color: 'primary.main', flex: 1, fontWeight: 500 }}>
            {themeInfo?.title || currentQuestion.theme}
          </Typography>
          <School sx={{ color: 'primary.main', fontSize: 32 }} />
        </Box>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary.main">
              Question {currentQuestionIndex + 1} sur {questions.length}
            </Typography>
            <Typography variant="h6" color="primary.main">
              Score : {stats.correct.toFixed(1)}/{stats.total}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(currentQuestionIndex + 1) / questions.length * 100} 
            sx={{ mb: 3, height: 8, borderRadius: 4 }}
          />

          <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {currentQuestion.question}
        </Typography>

        <FormGroup>
          {currentQuestion.options.map((option) => (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  checked={selectedAnswers.includes(option)}
                  onChange={() => handleAnswerChange(option)}
                  disabled={showFeedback}
                  sx={{
                    '&.Mui-checked': {
                      ...getOptionStyle(option),
                      '& .MuiSvgIcon-root': {
                        fontSize: 28
                      }
                    },
                    '&.Mui-disabled': getOptionStyle(option),
                    '& .MuiSvgIcon-root': {
                      fontSize: 28
                    }
                  }}
                />
              }
              label={option}
              sx={{
                ...getOptionStyle(option),
                marginY: 1,
                padding: 1,
                borderRadius: 1,
              }}
            />
          ))}
        </FormGroup>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', mt: 3 }}>
          <Box>
            <Button
              variant="outlined"
              onClick={() => navigateQuestion('prev')}
              startIcon={<ArrowBack />}
              sx={{ mr: 1 }}
            >
              Précédent
            </Button>
            {!showFeedback && (
              <Button
                variant="outlined"
                onClick={skipQuestion}
                color="secondary"
              >
                Passer
              </Button>
            )}
          </Box>
          <Box>
            {!showFeedback ? (
              <Button
                variant="contained"
                onClick={checkAnswer}
                disabled={selectedAnswers.length === 0}
              >
                Vérifier
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={() => navigateQuestion('next')}
                endIcon={<ArrowForward />}
              >
                Suivant
              </Button>
            )}
          </Box>
        </Box>
        {skippedQuestions.includes(currentQuestionIndex) && (
          <Typography 
            variant="body2" 
            color="secondary" 
            sx={{ mt: 1, textAlign: 'center' }}
          >
            Question passée
          </Typography>
        )}
        </Box>
        </Paper>

        {showFeedback && (
          <>
            <Alert severity={isCorrect ? 'success' : 'error'} sx={{ mt: 2 }}>
              {isCorrect ? 'Correct !' : 'Incorrect !'}
            </Alert>
            {!isCorrect && (
              <Paper 
                elevation={0} 
                sx={{ 
                  mt: 2,
                  p: 2.5, 
                  bgcolor: '#f5f9ff', 
                  borderRadius: 2,
                  border: 1,
                  borderColor: '#cce5ff'
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#0d47a1',
                    mb: 2,
                    fontWeight: 500
                  }}
                >
                  Explications
                </Typography>
                {selectedAnswers.map(answer => {
                  const justification = currentQuestion.justification_fausses_reponses[answer];
                  if (!justification) return null;
                  
                  return (
                    <Box key={answer} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: '#1976d2',
                          fontWeight: 500,
                          mb: 0.5
                        }}
                      >
                        {answer}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: 'text.primary',
                          lineHeight: 1.6
                        }}
                      >
                        {justification}
                      </Typography>
                    </Box>
                  );
                })}
              </Paper>
            )}
            <Button 
              variant="contained" 
              onClick={() => navigateQuestion('next')} 
              sx={{ 
                mt: 2,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                px: 4,
                py: 1.5,
                borderRadius: 2
              }}
            >
              Question suivante
            </Button>
          </>
        )}
      </Container>

    {/* Reset Progress Dialog */}
    <Dialog
      open={resetDialogOpen}
      onClose={() => setResetDialogOpen(false)}
    >
      <DialogTitle>Réinitialiser le progrès</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Êtes-vous sûr de vouloir réinitialiser votre progression pour ce thème ?
          Cette action ne peut pas être annulée.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setResetDialogOpen(false)}>Annuler</Button>
        <Button onClick={handleResetProgress} color="error" autoFocus>
          Réinitialiser
        </Button>
      </DialogActions>
    </Dialog>
    </Box>
  );
}

      {/* Reset Progress Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>Réinitialiser le progrès</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir réinitialiser votre progression pour ce thème ?
            Cette action ne peut pas être annulée.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleResetProgress} color="error" autoFocus>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default QuizPage;
