import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { saveQuizProgress, loadQuizProgress, resetQuizProgress } from '../firebase';
import { CheckCircle, Info } from '@mui/icons-material';
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
        try {
          const progress = await loadQuizProgress(user.uid, theme);
          if (progress) {
            console.log('Loaded progress:', progress);
            setHasProgress(true);
            setCurrentQuestionIndex(progress.lastQuestionIndex || 0);
            setStats(progress.stats || { correct: 0, total: 0 });
            setAnsweredQuestions(progress.answeredQuestions || {});
            setSkippedQuestions(progress.skippedQuestions || []);
          }
        } catch (error) {
          console.error('Error loading progress:', error);
          setError('Failed to load progress');
        }
      }
    };
    loadSavedProgress();
  }, [user, theme]);

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

        // Save initial state to Firebase if no progress exists
        if (!hasProgress && user) {
          const initialProgress = {
            totalQuestions: shuffledQuestions.length,
            themeId: theme,
            lastQuestionIndex: 0,
            stats: { correct: 0, total: 0 },
            answeredQuestions: {},
            skippedQuestions: []
          };
          await saveQuizProgress(user.uid, theme, initialProgress);
        }
      } catch (error) {
        console.error('Error loading theme data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadThemeData();
  }, [theme, user, hasProgress]);

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

  const checkAnswer = async () => {
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
    const newStats = {
      correct: stats.correct + points,
      total: stats.total + 1,
    };
    setStats(newStats);

    // Save progress after updating stats
    const newAnsweredQuestions = {
      ...answeredQuestions,
      [currentQuestionIndex]: {
        selectedAnswers,
        isCorrect: wrongAnswers === 0,
        points
      }
    };
    setAnsweredQuestions(newAnsweredQuestions);

    // Save progress to Firebase
    if (user && questions.length > 0) {
      const progressData = {
        answeredQuestions: newAnsweredQuestions,
        stats: newStats,
        totalQuestions: questions.length,
        themeId: theme,
        lastQuestionIndex: currentQuestionIndex,
        skippedQuestions: skippedQuestions, // Include skipped questions
        completed: Object.keys(newAnsweredQuestions).length === questions.length // Track completion
      };
      console.log('Saving answer progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);
    }
  };

  const navigateQuestion = async (direction) => {
    setSelectedAnswers([]);
    setShowFeedback(false);
    
    let newIndex;
    if (direction === 'next') {
      newIndex = Math.min(currentQuestionIndex + 1, questions.length - 1);
    } else {
      newIndex = Math.max(currentQuestionIndex - 1, 0);
    }
    setCurrentQuestionIndex(newIndex);

    // Save current position to Firebase
    if (user && questions.length > 0) {
      const progressData = {
        lastQuestionIndex: newIndex,
        totalQuestions: questions.length,
        themeId: theme,
        answeredQuestions: answeredQuestions,
        stats: stats,
        skippedQuestions: skippedQuestions
      };
      console.log('Saving navigation progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);
    }
  };

  const skipQuestion = async () => {
    const newSkippedQuestions = [...skippedQuestions, currentQuestionIndex];
    setSkippedQuestions(newSkippedQuestions);

    // Save skipped questions to Firebase
    if (user && questions.length > 0) {
      const progressData = {
        skippedQuestions: newSkippedQuestions,
        lastQuestionIndex: currentQuestionIndex,
        totalQuestions: questions.length,
        themeId: theme,
        answeredQuestions: answeredQuestions,
        stats: stats
      };
      console.log('Saving skip progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);
    }

    navigateQuestion('next');
  };

  // Restore previous answers when navigating back
  useEffect(() => {
    const savedState = answeredQuestions[currentQuestionIndex];
    if (savedState) {
      setSelectedAnswers(savedState.selectedAnswers);
      setShowFeedback(true);
      setIsCorrect(savedState.isCorrect);
    } else {
      setSelectedAnswers([]);
      setShowFeedback(false);
    }
  }, [currentQuestionIndex, answeredQuestions]);

  const handleResetProgress = async () => {
    try {
      if (user && theme) {
        await resetQuizProgress(user.uid, theme);
        setAnsweredQuestions({});
        setSkippedQuestions([]);
        setStats({ correct: 0, total: 0 });
        setSelectedAnswers([]);
        setShowFeedback(false);
        setCurrentQuestionIndex(0);
      }
    } catch (error) {
      console.error('Error resetting progress:', error);
      setError('Failed to reset progress. Please try again.');
    }
    setResetDialogOpen(false);
  };

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

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="md">
        {/* Progress bar */}
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

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <IconButton onClick={() => navigate('/')} color="primary" sx={{ p: 1 }}>
            <Home />
          </IconButton>
          <Typography variant="h4" sx={{ color: 'primary.main', flex: 1, fontWeight: 500 }}>
            {themeInfo?.title || currentQuestion.theme}
          </Typography>
          <School sx={{ color: 'primary.main', fontSize: 32 }} />
        </Box>

        {/* Question Card */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary.main">
              Question {currentQuestionIndex + 1} sur {questions.length}
            </Typography>
            <Typography variant="h6" color="primary.main">
              Score : {stats.correct.toFixed(1)}/{stats.total}
            </Typography>
          </Box>

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

            {/* Feedback */}
            {showFeedback && (
              <Box sx={{ mt: 3 }}>
                <Alert 
                  severity={isCorrect ? 'success' : 'error'} 
                  sx={{ 
                    mb: 3,
                    '& .MuiAlert-icon': {
                      fontSize: '2rem'
                    },
                    '& .MuiAlert-message': {
                      fontSize: '1.1rem',
                      fontWeight: 500
                    }
                  }}
                >
                  {isCorrect ? 'Correct !' : 'Incorrect !'}
                </Alert>

                {/* Show correct answers when incorrect */}
                {!isCorrect && (
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      mb: 3,
                      overflow: 'hidden',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'success.light',
                    }}
                  >
                    <Box 
                      sx={{ 
                        bgcolor: '#e8f5e9',
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderBottom: '1px solid',
                        borderColor: 'success.light'
                      }}
                    >
                      <CheckCircle sx={{ color: '#2e7d32' }} />
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: '#1b5e20',
                          fontWeight: 600
                        }}
                      >
                        Réponses correctes
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2, bgcolor: 'success.lighter' }}>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        {currentQuestion.correct_answers.map((answer, index) => (
                          <Typography 
                            component="li" 
                            key={index} 
                            sx={{ 
                              mb: 1,
                              color: 'success.dark',
                              '&:last-child': { mb: 0 }
                            }}
                          >
                            {answer}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  </Paper>
                )}

                {/* Show justifications for wrong answers */}
                {!isCorrect && currentQuestion.justification_fausses_reponses && (
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'error.light',
                    }}
                  >
                    <Box 
                      sx={{ 
                        bgcolor: '#ffebee',
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderBottom: '1px solid',
                        borderColor: 'error.light'
                      }}
                    >
                      <Info sx={{ color: '#c62828' }} />
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          color: '#b71c1c',
                          fontWeight: 600
                        }}
                      >
                        Explications des erreurs
                      </Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                      {selectedAnswers
                        .filter(answer => !currentQuestion.correct_answers.includes(answer))
                        .map((wrongAnswer, index) => (
                          currentQuestion.justification_fausses_reponses[wrongAnswer] && (
                            <Box 
                              key={index} 
                              sx={{ 
                                mb: 3,
                                '&:last-child': { mb: 0 },
                                p: 2,
                                bgcolor: 'error.lighter',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'error.light'
                              }}
                            >
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  color: 'error.dark',
                                  fontWeight: 600,
                                  mb: 1
                                }}
                              >
                                {wrongAnswer}
                              </Typography>
                              <Typography 
                                variant="body2"
                                sx={{ 
                                  color: 'text.primary',
                                  lineHeight: 1.6
                                }}
                              >
                                {currentQuestion.justification_fausses_reponses[wrongAnswer]}
                              </Typography>
                            </Box>
                          )
                        ))}
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        </Paper>

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
      </Container>
    </Box>
  );
}

export default QuizPage;
