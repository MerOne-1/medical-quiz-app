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
    // Red to green progression
    if (value === 1) return '#ff4444';  // Red
    if (value === 2) return '#ff9248';  // Orange
    if (value === 3) return '#ffd700';  // Yellow
    if (value === 4) return '#90d959';  // Light green
    if (value === 5) return '#4caf50';  // Green
    return '#e0e0e0';
  };

  return (
    <Tooltip title={`Note ${value}`} placement="top">
      <Box
        onClick={(e) => {
          e.stopPropagation();
          onClick(value);
        }}
        sx={{
          width: { xs: 40, sm: 45 },
          height: { xs: 40, sm: 45 },
          borderRadius: '50%',
          border: `3px solid ${getColor()}`,
          backgroundColor: isSelected ? getColor() : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: isSelected ? 'white' : getColor(),
          fontWeight: 'bold',
          fontSize: { xs: '1rem', sm: '1.1rem' },
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'scale(1.1)',
            backgroundColor: getColor(),
            color: 'white',
          },
        }}
      >
        {value}
      </Box>
    </Tooltip>
  );
};

export default function MoleculesPage() {
  const [isTransitioning, setIsTransitioning] = useState(false);
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
        const ratingsDoc = await getDoc(doc(db, 'moleculeRatings', user.uid));
        if (ratingsDoc.exists()) {
          const data = ratingsDoc.data();
          // Get ratings for current theme
          const themeRatings = data[theme] || {};
          setRatings(themeRatings);
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
      
      const ratingsRef = doc(db, 'moleculeRatings', user.uid);
      const timestamp = new Date().toISOString();
      
      // Update the ratings document with the new rating and metadata
      await setDoc(ratingsRef, {
        [theme]: newRatings,
        lastUpdated: timestamp,
        [`${theme}_lastUpdated`]: timestamp
      }, { merge: true });
    } catch (err) {
      console.error('Error saving rating:', err);
    }
  };

  // Save ratings with metadata
  const saveRating = async (cardId, rating) => {
    if (!user) return;
    
    try {
      const newRatings = { ...ratings, [cardId]: rating };
      setRatings(newRatings);
      
      const ratingsRef = doc(db, 'moleculeRatings', user.uid);
      const timestamp = new Date().toISOString();
      
      await setDoc(ratingsRef, {
        [theme]: newRatings,
        lastUpdated: timestamp,
        [`${theme}_lastUpdated`]: timestamp,
        userId: user.uid,
        userEmail: user.email
      }, { merge: true });
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
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => navigate(-1)} size="small">
          Retour
        </Button>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
          {currentIndex + 1} / {filteredCards.length}
        </Typography>
      </Box>

      <Box
        sx={{
          maxWidth: 600,
          mx: 'auto',
          mb: { xs: 2, sm: 3 },
          height: { xs: 300, sm: 400 },
          perspective: '1000px',
          cursor: 'pointer',
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out',
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
              {/* Removed rating from card back */}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Navigation and Rating UI */}
      <Box sx={{
        maxWidth: 600,
        mx: 'auto',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: { xs: 1, sm: 2 },
        alignItems: 'center',
        mt: { xs: 1, sm: 2 }
      }}>
        <IconButton 
          onClick={() => {
            if (currentIndex === 0) return;
            setIsTransitioning(true);
            setTimeout(() => {
              setIsFlipped(false);
              setCurrentIndex(i => i - 1);
              setIsTransitioning(false);
            }, 300);
          }} 
          disabled={currentIndex === 0}
          sx={{ justifySelf: 'start' }}
        >
          <NavigateBefore sx={{ fontSize: { xs: 30, sm: 35 } }} />
        </IconButton>

        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
            Note :
          </Typography>
          <Stack direction="row" spacing={{ xs: 1, sm: 2 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <RatingCircle
                key={value}
                value={value}
                isSelected={ratings[currentCard.id] === value}
                onClick={(newValue) => handleRating(currentCard.id, newValue)}
              />
            ))}
          </Stack>
        </Stack>

        <IconButton
          onClick={() => {
            if (currentIndex === filteredCards.length - 1) return;
            setIsTransitioning(true);
            setTimeout(() => {
              setIsFlipped(false);
              setCurrentIndex(i => i + 1);
              setIsTransitioning(false);
            }, 300);
          }}
          disabled={currentIndex === filteredCards.length - 1}
          sx={{ justifySelf: 'end' }}
        >
          <NavigateNext sx={{ fontSize: { xs: 30, sm: 35 } }} />
        </IconButton>
      </Box>

      {/* Flip button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <IconButton 
          onClick={(e) => {
            e.stopPropagation();
            setIsFlipped(!isFlipped);
          }}
          size="small"
        >
          <Refresh />
        </IconButton>
      </Box>

    </Container>
  );
}
