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
  CircularProgress,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Refresh,
} from '@mui/icons-material';

const RatingCircle = ({ value, isSelected, onClick }) => {
  const getColor = () => {
    if (value === 1) return '#ff4444';
    if (value === 2) return '#ff8c42';
    if (value === 3) return '#ffd700';
    if (value === 4) return '#90ee90';
    if (value === 5) return '#32cd32';
    return '#e0e0e0';
  };

  return (
    <Tooltip title={`Rate ${value}`} placement="top">
      <Box
        onClick={(e) => {
          e.stopPropagation();
          onClick(value);
        }}
        sx={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          backgroundColor: isSelected ? getColor() : '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isSelected ? 'white' : 'black',
          fontWeight: 'bold',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: getColor(),
          },
        }}
      >
        {value}
      </Box>
    </Tooltip>
  );
};

export default function MoleculesPage() {
  const [fadeOut, setFadeOut] = useState(false);
  const { theme } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
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

  // Load all cards data
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
        if (!data || !Array.isArray(data.cards)) {
          throw new Error('Invalid data format');
        }
        
        setAllCards(data.cards);
        setFilteredCards(data.cards); // Initially show all cards
      } catch (err) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [theme]);

  // Load and apply user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || allCards.length === 0) return;
      
      try {
        const settingsDoc = await getDoc(doc(db, 'moleculeSettings', user.uid));
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const enabledCardIds = settings[theme];
          
          if (Array.isArray(enabledCardIds)) {
            const filtered = allCards.filter(card => enabledCardIds.includes(card.id));
            setFilteredCards(filtered.length > 0 ? filtered : allCards);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };

    loadSettings();
  }, [user, theme, allCards]);

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

  const handleRating = async (cardId, newValue) => {
    if (!user) return;

    try {
      // Toggle rating if clicking the same value
      const valueToSet = ratings[cardId] === newValue ? null : newValue;
      const newRatings = { ...ratings };
      
      if (valueToSet === null) {
        delete newRatings[cardId];
      } else {
        newRatings[cardId] = valueToSet;
      }
      
      setRatings(newRatings);
      
      const ratingsDoc = doc(db, 'userRatings', user.uid);
      await setDoc(ratingsDoc, { [theme]: newRatings }, { merge: true });
    } catch (err) {
      console.error('Error saving rating:', err);
    }
  };

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

  const currentCard = filteredCards[currentIndex];
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
          {currentIndex + 1} / {filteredCards.length}
        </Typography>
      </Box>

      <Box
        sx={{
          maxWidth: 600,
          mx: 'auto',
          mb: 4,
          height: 400,
          perspective: '1000px',
          cursor: 'pointer',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.15s ease-out',
          '& *': { // Prevent any hover effects on children
            pointerEvents: 'none'
          }
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 0.3s ease-out',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            WebkitTransformStyle: 'preserve-3d',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
        >
          <Card
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              backgroundColor: '#fff',
            }}
          >
            {imagePath && (
              <CardMedia
                component="img"
                image={imagePath}
                alt={currentCard.name}
                sx={{
                  height: '100%',
                  objectFit: 'contain',
                  p: 2
                }}
              />
            )}
          </Card>

          <Card
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              backgroundColor: '#fff',
              transform: 'rotateY(180deg)',
              WebkitTransform: 'rotateY(180deg) translateZ(1px)', // Fix Safari flickering
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {currentCard.name}
              </Typography>
              {currentCard.details && (
                <Typography variant="h6" align="center" color="text.secondary">
                  {currentCard.details}
                </Typography>
              )}
              <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1 }}>
                <Typography variant="subtitle1" align="center" gutterBottom>
                  Rate your knowledge:
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <RatingCircle
                      key={value}
                      value={value}
                      isSelected={ratings[currentCard.id] === value}
                      onClick={(newValue) => handleRating(currentCard.id, newValue)}
                    />
                  ))}
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <IconButton 
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => {
              setIsFlipped(false);
              setCurrentIndex(i => Math.max(0, i - 1));
              setFadeOut(false);
            }, 150);
          }} 
          disabled={currentIndex === 0}
        >
          <NavigateBefore />
        </IconButton>
        <IconButton onClick={(e) => {
          e.stopPropagation();
          setIsFlipped(!isFlipped);
        }}>
          <Refresh />
        </IconButton>
        <IconButton 
          onClick={() => {
            setFadeOut(true);
            setTimeout(() => {
              setIsFlipped(false);
              setCurrentIndex(i => Math.min(filteredCards.length - 1, i + 1));
              setFadeOut(false);
            }, 150);
          }} 
          disabled={currentIndex === filteredCards.length - 1}
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
