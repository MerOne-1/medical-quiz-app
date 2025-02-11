import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
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
  transition: 'opacity 0.2s ease-in-out, transform 0.3s ease-out',
  opacity: 1,
  transform: 'translateY(0)',
  '&.changing': {
    opacity: 0,
    transform: 'translateY(10px)',
  },
  '& .card-inner': {
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease-in-out', // Smooth out-back easing
    transformStyle: 'preserve-3d',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    willChange: 'transform, opacity', // Optimize performance
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
    borderRadius: 1,
    bgcolor: 'background.paper',
    WebkitTransform: 'translateZ(0)',
    transform: 'translateZ(0)',
    pointerEvents: 'none', // Prevent interaction with the card faces directly
    transition: 'box-shadow 0.3s ease-in-out',
  },
  '& .card-back': {
    transform: 'rotateY(180deg)',
    WebkitTransform: 'rotateY(180deg)',
  }
};

export default function MoleculesPage() {
  const { theme } = useParams();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState([]);
  const [shuffledMode, setShuffledMode] = useState(false);

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
      const response = await fetch(`/molecules/data/${theme}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Loaded data:', data);
      if (!data.cards || !Array.isArray(data.cards)) {
        throw new Error('Invalid data format: cards array not found');
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
    }
  }, [theme]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

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
      // Just fade out, change card, and fade in
      setIsChanging(true);
      setTimeout(() => {
        setIsFlipped(false); // Reset flip state for next card
        setCurrentIndex(nextIndex);
        requestAnimationFrame(() => {
          setIsChanging(false);
        });
      }, 200);
    } else {
      // Original behavior for reset and shuffle
      setIsFlipped(false);
      setIsChanging(true);
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        requestAnimationFrame(() => {
          setIsChanging(false);
        });
      }, 250);
    }
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % cards.length;
    navigateToCard(nextIndex, true); // Skip flip back animation
  }, [currentIndex, cards.length, navigateToCard]);

  const handlePrevious = useCallback(() => {
    const nextIndex = (currentIndex - 1 + cards.length) % cards.length;
    navigateToCard(nextIndex, true); // Skip flip back animation
  }, [currentIndex, cards.length, navigateToCard]);

  const handleShuffle = useCallback(() => {
    setShuffledMode(prev => !prev);
    
    // Use fade transition only
    setIsChanging(true);
    setTimeout(() => {
      setIsFlipped(false);
      if (!shuffledMode) {
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffled);
      } else {
        // Reset to original order
        loadCards();
      }
      // Reset to first card
      setCurrentIndex(0);
      requestAnimationFrame(() => {
        setIsChanging(false);
      });
    }, 200);
  }, [shuffledMode, cards, loadCards]);

  const handleReset = useCallback(() => {
    navigateToCard(0);
  }, [navigateToCard]);

  if (!cards.length) {
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

  const currentCard = cards[currentIndex];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          {theme}
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary">
          Carte {currentIndex + 1} sur {cards.length}
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

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <IconButton
          onClick={handlePrevious}
          disabled={cards.length <= 1}
          color="primary"
        >
          <NavigateBefore />
        </IconButton>
        <Button
          startIcon={<Shuffle />}
          onClick={handleShuffle}
          variant="outlined"
          color="primary"
        >
          {shuffledMode ? 'Mode Normal' : 'Mode Aléatoire'}
        </Button>
        <Button
          startIcon={<Refresh />}
          onClick={handleReset}
          variant="outlined"
          color="primary"
        >
          Recommencer
        </Button>
        <IconButton
          onClick={handleNext}
          disabled={cards.length <= 1}
          color="primary"
        >
          <NavigateNext />
        </IconButton>
      </Box>
    </Container>
  );
}
