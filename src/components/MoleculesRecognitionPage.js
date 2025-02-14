import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';

export default function MoleculesRecognitionPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deck, setDeck] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([]);

  // Load deck
  useEffect(() => {
    const loadDeck = async () => {
      try {
        setLoading(true);
        setError(null);

        const deckRef = doc(db, 'userDecks', deckId);
        const deckDoc = await getDoc(deckRef);

        if (!deckDoc.exists()) {
          throw new Error('Deck non trouvé');
        }

        const deckData = deckDoc.data();
        if (deckData.userId !== user?.uid) {
          throw new Error('Accès non autorisé');
        }

        setDeck(deckData);
        // Shuffle cards for practice
        const shuffled = [...deckData.cards].sort(() => Math.random() - 0.5);
        setShuffledCards(shuffled);
      } catch (err) {
        console.error('Error loading deck:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user && deckId) {
      loadDeck();
    }
  }, [deckId, user]);

  const handleSubmit = () => {
    const currentCard = shuffledCards[currentIndex];
    const isAnswerCorrect = userAnswer.toLowerCase().trim() === currentCard.name.toLowerCase().trim();
    setIsCorrect(isAnswerCorrect);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setShowResult(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setUserAnswer('');
      setShowResult(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={() => navigate('/molecules')} sx={{ mt: 2 }}>
          Retour aux molécules
        </Button>
      </Container>
    );
  }

  if (!deck || !shuffledCards.length) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Aucune molécule trouvée dans ce deck</Typography>
        <Button onClick={() => navigate('/molecules')} sx={{ mt: 2 }}>
          Retour aux molécules
        </Button>
      </Container>
    );
  }

  const currentCard = shuffledCards[currentIndex];
  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Reconnaissance de Molécules - {deck.deckName}
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ mt: 2 }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          Molécule {currentIndex + 1} sur {shuffledCards.length}
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img
              src={currentCard.image}
              alt="Molécule à identifier"
              style={{
                maxWidth: '100%',
                height: 'auto',
                maxHeight: '300px',
                objectFit: 'contain',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              label="Nom de la molécule"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              disabled={showResult}
            />
            {!showResult && (
              <Button variant="contained" onClick={handleSubmit}>
                Vérifier
              </Button>
            )}
          </Box>

          {showResult && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography
                variant="h6"
                color={isCorrect ? 'success.main' : 'error.main'}
              >
                {isCorrect ? 'Correct !' : 'Incorrect'}
              </Typography>
              <Typography>
                La réponse correcte est : {currentCard.name}
              </Typography>
              {currentCard.details && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {currentCard.details}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          startIcon={<NavigateBefore />}
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Précédent
        </Button>
        <Button
          endIcon={<NavigateNext />}
          onClick={handleNext}
          disabled={currentIndex === shuffledCards.length - 1}
        >
          Suivant
        </Button>
      </Box>
    </Container>
  );
}
