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

  useEffect(() => {
    const loadThemeAndProgress = async () => {
      if (!user || !theme) return;

      try {
        setLoading(true);
        console.log('Loading theme and progress for:', theme);

        // First load the theme information
        const themesResponse = await fetch('/data/themes.json');
        if (!themesResponse.ok) {
          throw new Error(`Failed to load themes.json: ${themesResponse.status}`);
        }
        const themesData = await themesResponse.json();
        const currentTheme = themesData.find(t => t.id === theme);

        if (!currentTheme) {
          throw new Error(`Theme not found: ${theme}`);
        }
        setThemeInfo(currentTheme);

        // Then load the questions
        const questionsResponse = await fetch(`/data/${currentTheme.filename}`);
        if (!questionsResponse.ok) {
          throw new Error(`Failed to load questions: ${questionsResponse.status}`);
        }

        const data = await questionsResponse.json();
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          throw new Error('No questions found in the file');
        }

        // Load saved progress before deciding whether to shuffle
        const savedProgress = await loadQuizProgress(user.uid, theme);
        console.log('Loaded saved progress:', savedProgress);

        if (savedProgress) {
          // If we have saved progress, restore the state
          setHasProgress(true);
          setCurrentQuestionIndex(savedProgress.lastQuestionIndex || 0);
          setStats(savedProgress.stats || { correct: 0, total: 0 });
          setAnsweredQuestions(savedProgress.answeredQuestions || {});
          setSkippedQuestions(savedProgress.skippedQuestions || []);
          setQuestions(data.questions); // Use original order when restoring progress
        } else {
          // If no progress, shuffle questions and initialize new progress
          const shuffledQuestions = data.questions.sort(() => Math.random() - 0.5);
          setQuestions(shuffledQuestions);
          setHasProgress(false);
          
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

        console.log('Theme and progress loaded successfully');
      } catch (error) {
        console.error('Error loading theme and progress:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadThemeAndProgress();
  }, [theme, user]); // Only depend on theme and user

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
    if (!user || !currentQuestion) return;

    try {
      const correct = currentQuestion.correct_answers;
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
      
      const isAnswerCorrect = wrongAnswers === 0;
      
      // Update local state first
      setIsCorrect(isAnswerCorrect);
      setShowFeedback(true);
      
      // Create new answered questions state
      const newAnsweredQuestions = {
        ...answeredQuestions,
        [currentQuestionIndex]: {
          selectedAnswers,
          isCorrect: isAnswerCorrect,
          points,
          questionId: currentQuestion.id || currentQuestionIndex.toString(),
          timestamp: new Date().toISOString()
        }
      };
      
      // Calculate total points and answered questions
      const totalAnswered = Object.keys(newAnsweredQuestions).length;
      const totalPoints = Object.values(newAnsweredQuestions)
        .reduce((sum, answer) => sum + (answer.points || 0), 0);
      
      // Update local stats
      const newStats = {
        total: totalAnswered,
        correct: totalPoints
      };
      
      // Update local state
      setAnsweredQuestions(newAnsweredQuestions);
      setStats(newStats);
      
      // Save to Firebase
      const progressData = {
        answeredQuestions: newAnsweredQuestions,
        stats: newStats,
        totalQuestions: questions.length,
        themeId: theme,
        lastQuestionIndex: currentQuestionIndex,
        skippedQuestions: skippedQuestions,
        completed: totalAnswered === questions.length,
        lastUpdated: new Date().toISOString()
      };
      
      console.log('Saving answer progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Error in checkAnswer:', error);
      setError('Failed to save answer');
    }
  };

  const navigateQuestion = async (direction) => {
    if (!user || questions.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = Math.min(currentQuestionIndex + 1, questions.length - 1);
    } else {
      newIndex = Math.max(currentQuestionIndex - 1, 0);
    }

    try {
      // Calculate current progress
      const totalAnswered = Object.keys(answeredQuestions).length;
      const correctAnswers = Object.values(answeredQuestions)
        .filter(answer => answer.isCorrect).length;

      // Save progress before changing question
      const progressData = {
        lastQuestionIndex: newIndex,
        totalQuestions: questions.length,
        themeId: theme,
        answeredQuestions: answeredQuestions,
        stats: {
          total: totalAnswered,
          correct: correctAnswers
        },
        skippedQuestions: skippedQuestions,
        completed: totalAnswered === questions.length
      };

      console.log('Saving navigation progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);

      // Update UI after saving
      setCurrentQuestionIndex(newIndex);
      setSelectedAnswers([]);
      setShowFeedback(false);
    } catch (error) {
      console.error('Error saving progress during navigation:', error);
      setError('Failed to save progress');
    }
  };

  const skipQuestion = async () => {
    const newSkippedQuestions = [...skippedQuestions, currentQuestionIndex];
    setSkippedQuestions(newSkippedQuestions);

    // Save skipped questions to Firebase
    if (user && questions.length > 0) {
      // Calculate total answered and correct
      const totalAnswered = Object.keys(answeredQuestions).length;
      const correctAnswers = Object.values(answeredQuestions)
        .filter(answer => answer.isCorrect).length;
      
      const progressData = {
        skippedQuestions: newSkippedQuestions,
        answeredQuestions: answeredQuestions,
        stats: {
          total: totalAnswered,
          correct: correctAnswers
        },
        totalQuestions: questions.length,
        themeId: theme,
        lastQuestionIndex: currentQuestionIndex,
        completed: totalAnswered === questions.length
      };
      
      console.log('Saving skip progress:', progressData);
      await saveQuizProgress(user.uid, theme, progressData);
    }

    navigateQuestion('next');
  };

  // Restore previous answers when navigating back
  useEffect(() => {
    if (!currentQuestion) return;
    
    const savedState = answeredQuestions[currentQuestionIndex];
    if (savedState) {
      setSelectedAnswers(savedState.selectedAnswers || []);
      setShowFeedback(true);
      setIsCorrect(savedState.isCorrect);
    } else {
      setSelectedAnswers([]);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [currentQuestionIndex, answeredQuestions, currentQuestion]);

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
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {currentQuestion.question}
              </Typography>
              {currentQuestion.image && (
                <Box 
                  sx={{ 
                    mt: 2, 
                    mb: 3,
                    display: 'flex',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={`/images/themes/${themeId}/${currentQuestion.image}`}
                    alt="Question illustration"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </Box>
              )}
            </Box>

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
