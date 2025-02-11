import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  Rating,
} from '@mui/material';
import {
  NavigateNext,
  NavigateBefore,
  Refresh,
  Shuffle,
} from '@mui/icons-material';

// CSS for the flipping card animation
const cardStyles = {
  perspective: '1000px',
  cursor: 'pointer',
  position: 'relative',
  touchAction: 'none', // Prevent touch events from causing unwanted behavior
  transition: 'opacity 0.2s ease-in-out, transform 0.2s ease-out',
  opacity: 1,
  transform: 'scale(1)',
  '&.changing': {
    opacity: 0,
    transform: 'scale(0.95)',
  },
  '& .card-inner': {
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease-in-out',
    transformStyle: 'preserve-3d',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    willChange: 'transform, opacity',
    '&:hover': {
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
    },
  },
  '& .card-inner.flipped': {
    transform: 'rotateY(180deg)',
  },
  '& .card-front, & .card-back': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    bgcolor: 'background.paper',
    WebkitTransform: 'translateZ(0)',
    transform: 'translateZ(0)',
    pointerEvents: 'none',
    transition: 'box-shadow 0.3s ease-in-out',
  },
  '& .card-back': {
    transform: 'rotateY(180deg)',
    WebkitTransform: 'rotateY(180deg)',
  }
};

export default function MoleculesPage() {
  const { theme } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState([]);
  const [shuffledMode, setShuffledMode] = useState(false);
  const [userSettings, setUserSettings] = useState(null);
  const [filteredCards, setFilteredCards] = useState([]);
  const [ratings, setRatings] = useState({});
  const [saving, setSaving] = useState(false);

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

  // Special case for immuno-hemato theme which doesn't need the theme prefix
  const shouldPrefixTheme = (theme, imagePath) => {
    if (theme === 'immuno-hemato' && !imagePath.startsWith('Immuno-hemato/')) {
      return false;
    }
    return true;
  };

  const loadCards = useCallback(async () => {
    try {
      console.log('Loading cards for theme:', theme);
      
      // Load user settings and ratings
      if (user) {
        try {
          // Load settings
          const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
          const settingsSnapshot = await getDoc(userSettingsDoc);
          if (settingsSnapshot.exists()) {
            const userPreferences = settingsSnapshot.data();
            setUserSettings(userPreferences);
          }

          // Load ratings
          const userRatingsDoc = doc(db, 'moleculeRatings', user.uid);
          const ratingsSnapshot = await getDoc(userRatingsDoc);
          if (ratingsSnapshot.exists()) {
            const userRatings = ratingsSnapshot.data();
            setRatings(userRatings[theme] || {});
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }

      // Load theme cards
      const response = await fetch(`/molecules/data/${theme}.json`);
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement du thème ${theme} (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Loaded data:', data);
      
      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error(`Format de données invalide pour le thème ${theme}`);
      }
      
      // Update image paths to use correct directory names
      const updatedCards = data.cards.map(card => ({
        ...card,
        image: shouldPrefixTheme(theme, card.image)
          ? card.image.replace(
              new RegExp(`^${theme}/`, 'i'),
              `${themeToDirectory[theme]}/`
            )
          : card.image
      }));
      
      setCards(updatedCards);
    } catch (error) {
      console.error('Error loading cards:', error);
      setCards([]);
      throw error; // Let the error be handled by the effect
    }
  }, [theme, user, themeToDirectory]);

  // Separate effect for error handling
  useEffect(() => {
    loadCards().catch(error => {
      console.error('Failed to load cards:', error);
      setCards([]);
    });
  }, [loadCards]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Filter cards based on user settings
  useEffect(() => {
    if (!cards.length) return;

    if (userSettings && userSettings[theme]) {
      const enabledCards = cards.filter(card => userSettings[theme].includes(card.id));
      if (enabledCards.length === 0) {
        // If no cards are enabled, show a message and redirect
        navigate('/molecules/settings');
        return;
      }
      setFilteredCards(enabledCards);
    } else {
      setFilteredCards(cards);
    }
  }, [cards, userSettings, theme, navigate]);

  const [canFlip, setCanFlip] = useState(true);

  const handleFlip = useCallback((e) => {
    // Prevent default behavior and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!canFlip) return;
    setCanFlip(false);
    setIsFlipped(prev => !prev);
    // Re-enable flipping after animation completes
    setTimeout(() => setCanFlip(true), 650);
  }, [canFlip]);

  const [isChanging, setIsChanging] = useState(false);

  const navigateToCard = useCallback((nextIndex, skipFlipBack = false) => {
    if (skipFlipBack) {
      // Smooth transition for next/previous
      setIsChanging(true);
      setTimeout(() => {
        setIsFlipped(false);
        setCurrentIndex(nextIndex);
        setTimeout(() => {
          setIsChanging(false);
        }, 50);
      }, 200);
    } else {
      // Reset and shuffle transition
      setIsFlipped(false);
      setIsChanging(true);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setTimeout(() => {
          setIsChanging(false);
        }, 50);
      }, 200);
    }
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % filteredCards.length;
    navigateToCard(nextIndex, true); // Skip flip back animation
  }, [currentIndex, filteredCards.length, navigateToCard]);

  const handlePrevious = useCallback(() => {
    const nextIndex = (currentIndex - 1 + filteredCards.length) % filteredCards.length;
    navigateToCard(nextIndex, true); // Skip flip back animation
  }, [currentIndex, filteredCards.length, navigateToCard]);

  const handleShuffle = useCallback(() => {
    setShuffledMode(prev => !prev);
    
    // Enhanced fade transition
    setIsChanging(true);
    setTimeout(() => {
      setIsFlipped(false);
      if (!shuffledMode) {
        const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
        setFilteredCards(shuffled);
      } else {
        // Reset to original order
        const orderedCards = cards.filter(card => userSettings[theme]?.includes(card.id));
        setFilteredCards(orderedCards);
      }
      // Reset to first card
      setCurrentIndex(0);
      setTimeout(() => {
        setIsChanging(false);
      }, 50);
    }, 200);
  }, [shuffledMode, cards, loadCards, filteredCards, theme, userSettings]);

  const handleReset = useCallback(() => {
    navigateToCard(0);
  }, [navigateToCard]);

  // Handle rating change
  const handleRatingChange = async (cardId, newValue) => {
    if (!user) return;

    try {
      setSaving(true);
      const newRatings = { ...ratings, [cardId]: newValue };
      setRatings(newRatings);

      // Save to Firebase
      const userRatingsDoc = doc(db, 'moleculeRatings', user.uid);
      const ratingsSnapshot = await getDoc(userRatingsDoc);
      const allRatings = ratingsSnapshot.exists() ? ratingsSnapshot.data() : {};
      
      await setDoc(userRatingsDoc, {
        ...allRatings,
        [theme]: newRatings
      });
    } catch (error) {
      console.error('Error saving rating:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!filteredCards.length) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" align="center" gutterBottom>
          Chargement des cartes pour le thème : {theme}
        </Typography>
        <Typography color="text.secondary" align="center">
          Si rien ne s'affiche, vérifiez que le fichier JSON existe dans /public/data/molecules/{theme}.json
        </Typography>
      </Container>
    );
  }

  const currentCard = filteredCards[currentIndex];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          {theme}
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary">
          Carte {currentIndex + 1} sur {filteredCards.length}
        </Typography>
      </Box>

      <Box
        sx={{
          ...cardStyles,
          height: 400,
          mb: 4,
          userSelect: 'none', // Prevent text selection on click
          WebkitTouchCallout: 'none', // Prevent iOS callout
          WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
        }}
        className={isChanging ? 'changing' : ''}
        onClick={handleFlip}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.preventDefault()}
        onTouchEnd={handleFlip}
      >
        <Box className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          <Card className="card-front" elevation={3}>
            <CardContent sx={{ width: '100%', height: '100%', p: 0 }}>
              {currentCard && currentCard.image && (
                <>
                  <Box
                    component="img"
                    src={`/molecules/images/${theme === 'immuno-hemato' && !currentCard.image.startsWith('Immuno-hemato/') ? 'Immuno-hemato/' + currentCard.image : currentCard.image}`}
                    crossOrigin="anonymous"
                    alt={currentCard.name || 'Molécule'}
                    onError={(e) => {
                      console.error('Error loading image:', {
                        path: `/molecules/images/${currentCard.image}`,
                        cardName: currentCard.name,
                        imageProperty: currentCard.image
                      });
                      // Try to fetch the image to get more details about the error
                      fetch(`/molecules/images/${currentCard.image}`)
                        .then(response => {
                          if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                          }
                          return response.blob();
                        })
                        .catch(error => {
                          console.error('Fetch error:', error);
                        });
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.style.display = 'none';
                      // Show error message
                      const errorEl = document.getElementById(`error-${currentCard.id}`);
                      if (errorEl) errorEl.style.display = 'block';
                    }}
                    onLoad={(e) => {
                      console.log('Successfully loaded image:', {
                        path: `/molecules/images/${currentCard.image}`,
                        cardName: currentCard.name
                      });
                      e.target.style.display = 'block';
                      // Hide error message
                      const errorEl = document.getElementById(`error-${currentCard.id}`);
                      if (errorEl) errorEl.style.display = 'none';
                    }}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'none', // Start hidden until loaded
                    }}
                  />
                  <Typography
                    id={`error-${currentCard.id}`}
                    variant="body2"
                    color="error"
                    align="center"
                    sx={{
                      display: 'none',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      padding: '8px',
                      borderRadius: '4px',
                    }}
                  >
                    Error loading image: {currentCard.name}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="card-back" elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom align="center">
                {currentCard.name}
              </Typography>
              {currentCard.details && (
                <Typography color="text.secondary" align="center">
                  {currentCard.details}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Custom Rating component */}
      <Box 
        sx={{ 
          mt: 2, 
          mb: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: 2,
          boxShadow: 1
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Évaluez votre connaissance
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected = (ratings[currentCard?.id] || 0) === value;
            const getColor = (value) => {
              if (value <= 1) return '#f44336'; // Red
              if (value <= 2) return '#ff9800'; // Orange
              if (value <= 3) return '#ffc107'; // Yellow
              if (value <= 4) return '#8bc34a'; // Light green
              return '#4caf50'; // Green
            };
            return (
              <Box
                key={value}
                onClick={() => currentCard && handleRatingChange(currentCard.id, value)}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: isSelected ? getColor(value) : 'transparent',
                  border: `2px solid ${getColor(value)}`,
                  color: isSelected ? 'white' : getColor(value),
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor: getColor(value),
                    color: 'white'
                  }
                }}
              >
                {value}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <IconButton
          onClick={handlePrevious}
          disabled={filteredCards.length <= 1}
          color="primary"
        >
          <NavigateBefore />
        </IconButton>
        <Button
          startIcon={<Shuffle />}
          onClick={handleShuffle}
          variant="outlined"
          color="primary"
          disabled={filteredCards.length <= 1}
        >
          {shuffledMode ? 'Mode Normal' : 'Mode Aléatoire'}
        </Button>
        <Button
          startIcon={<Refresh />}
          onClick={handleReset}
          variant="outlined"
          color="primary"
          disabled={filteredCards.length <= 1}
        >
          Recommencer
        </Button>
        <IconButton
          onClick={handleNext}
          disabled={filteredCards.length <= 1}
          color="primary"
        >
          <NavigateNext />
        </IconButton>
      </Box>
    </Container>
  );
}
