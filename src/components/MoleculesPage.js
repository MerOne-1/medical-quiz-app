import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Button,
  Rating,
  CircularProgress,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Refresh,
} from '@mui/icons-material';

export default function MoleculesPage() {
  const { theme } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  
  // Map theme names to their directory names
  const themeToDirectory = {
    'antibact-antisept': 'Antibact-antisept',
    'broncho': 'Broncho',
    'gastro': 'Gastro',
    'immuno-hemato': 'Immuno-hemato',
    'infectio': 'Infectio',
    'onco': 'Onco',
    'syst-nerveux': 'Syst-nerveux'
  };

  // Load cards data
  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/molecules/data/${theme}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load cards for ${theme}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format');
        }
        
        setCards(data);
      } catch (err) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [theme]);

  // Load user ratings
  useEffect(() => {
    const loadRatings = async () => {
      if (!user) return;
      
      try {
        const ratingsDoc = await getDoc(doc(db, 'userRatings', user.uid));
        if (ratingsDoc.exists()) {
          setRatings(ratingsDoc.data()[theme] || {});
        }
      } catch (err) {
        console.error('Error loading ratings:', err);
      }
    };

    loadRatings();
  }, [user, theme]);

  // Save ratings
  const saveRating = async (cardId, rating) => {
    if (!user) return;
    
    try {
      const newRatings = { ...ratings, [cardId]: rating };
      setRatings(newRatings);
      
      const ratingsRef = doc(db, 'userRatings', user.uid);
      const ratingsDoc = await getDoc(ratingsRef);
      const allRatings = ratingsDoc.exists() ? ratingsDoc.data() : {};
      
      await setDoc(ratingsRef, {
        ...allRatings,
        [theme]: newRatings
      });
    } catch (err) {
      console.error('Error saving rating:', err);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error" align="center">{error}</Typography>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  const currentCard = cards[currentIndex];
  if (!currentCard) return null;

  // Get image path for current card
  const imagePath = currentCard.image ? `/molecules/images/${themeToDirectory[theme]}/${currentCard.image.split('/').pop()}` : null;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography>
          {currentIndex + 1} / {cards.length}
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
        {imagePath && (
          <CardMedia
            component="img"
            image={imagePath}
            alt={currentCard.name}
            sx={{
              height: 400,
              objectFit: 'contain',
              bgcolor: '#fff',
              p: 2
            }}
          />
        )}
        {isFlipped && (
          <CardContent>
            <Typography variant="h5" gutterBottom align="center">
              {currentCard.name}
            </Typography>
            {currentCard.details && (
              <Typography variant="body1" align="center">
                {currentCard.details}
              </Typography>
            )}
          </CardContent>
        )}
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <IconButton 
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} 
          disabled={currentIndex === 0}
        >
          <NavigateBefore />
        </IconButton>
        <IconButton onClick={() => setIsFlipped(!isFlipped)}>
          <Refresh />
        </IconButton>
        <IconButton 
          onClick={() => setCurrentIndex(i => Math.min(cards.length - 1, i + 1))} 
          disabled={currentIndex === cards.length - 1}
        >
          <NavigateNext />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
        <Typography component="legend">Difficulty</Typography>
        <Rating
          value={ratings[currentCard.id] || 0}
          onChange={(_, value) => saveRating(currentCard.id, value)}
        />
      </Box>
    </Container>
  );
}
