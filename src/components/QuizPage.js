import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@mui/material';

function QuizPage() {
  const { theme } = useParams();
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const [themeInfo, setThemeInfo] = useState(null);

  useEffect(() => {
    const loadThemeData = async () => {
      try {
        // Load theme information
        const themesResponse = await fetch('/data/themes.json');
        const themesData = await themesResponse.json();
        const currentTheme = themesData.find(t => t.id === theme);
        setThemeInfo(currentTheme);

        if (currentTheme) {
          // Load questions for the theme
          const questionsResponse = await fetch(`/data/${currentTheme.filename}`);
          const questionsData = await questionsResponse.json();
          setQuestions(questionsData);
        }
      } catch (error) {
        console.error('Error loading theme data:', error);
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
    const isAnswerCorrect =
      selectedAnswers.length === correct.length &&
      selectedAnswers.every((answer) => correct.includes(answer));

    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);
    setStats({
      correct: stats.correct + (isAnswerCorrect ? 1 : 0),
      total: stats.total + 1,
    });
  };

  const nextQuestion = () => {
    setSelectedAnswers([]);
    setShowFeedback(false);
    setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % questions.length);
  };

  if (!currentQuestion) {
    return (
      <Container>
        <Typography>Chargement...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {themeInfo?.title || currentQuestion.theme}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Question {currentQuestionIndex + 1} sur {questions.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Score : {stats.correct}/{stats.total}
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 4 }}>
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
                    '&.Mui-checked': getOptionStyle(option),
                    '&.Mui-disabled': getOptionStyle(option)
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

        {!showFeedback ? (
          <Button
            variant="contained"
            onClick={checkAnswer}
            sx={{ mt: 2 }}
            disabled={selectedAnswers.length === 0}
          >
            Vérifier la réponse
          </Button>
        ) : (
          <>
            <Alert severity={isCorrect ? 'success' : 'error'} sx={{ mt: 2 }}>
              {isCorrect ? 'Correct !' : 'Incorrect !'}
            </Alert>
            {!isCorrect && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Justification :
                </Typography>
                {selectedAnswers.map(
                  (answer) =>
                    currentQuestion.justification_fausses_reponses[answer] && (
                      <Typography key={answer} color="error" variant="body2">
                        {answer}: {currentQuestion.justification_fausses_reponses[answer]}
                      </Typography>
                    )
                )}
              </Box>
            )}
            <Button variant="contained" onClick={nextQuestion} sx={{ mt: 2 }}>
              Question suivante
            </Button>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default QuizPage;
