import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getStudyCards, updateCardProgress } from '../utils/learningAlgorithm';
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
  LinearProgress,
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
  const location = useLocation();
  const isGuidedMode = new URLSearchParams(location.search).get('mode') === 'guided';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  const [message, setMessage] = useState('');
  const [studyData, setStudyData] = useState(null);
  
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

  // Reset state when theme changes
  useEffect(() => {
    if (!theme) return;
    
    // Reset all state immediately when theme changes
    setLoading(true);
    setError(null);
    setAllCards([]);
    setStudyData(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMessage('');
    
    const loadCards = async () => {
      try {
        const response = await fetch(`/molecules/data/${theme}.json`);
        if (!response.ok) {
          throw new Error(`Failed to load cards for ${theme}`);
        }
        
        const data = await response.json();
        if (!data || !Array.isArray(data.cards)) {
          throw new Error('Invalid data format');
        }
        
        // Set all cards and initialize study data based on mode
        const cards = data.cards;
        setAllCards(cards);
        
        try {
          if (isGuidedMode && user) {
            // In guided mode, get the study cards from the algorithm
            const studyData = await getStudyCards(user.uid, theme, cards);
            if (!studyData || !studyData.currentBatch || studyData.currentBatch.length === 0) {
              // Fallback to showing all cards if algorithm returns empty
              setStudyData({
                currentBatch: cards,
                progress: {
                  totalCards: cards.length,
                  masteredCards: 0,
                  currentBatchSize: cards.length,
                  newCards: cards.length,
                  reviewCards: 0
                }
              });
            } else {
              setStudyData(studyData);
            }
          } else {
            // In free mode or no user, show all cards
            setStudyData({
              currentBatch: cards,
              progress: {
                totalCards: cards.length,
                masteredCards: 0,
                currentBatchSize: cards.length,
                newCards: cards.length,
                reviewCards: 0
              }
            });
          }
        } catch (err) {
          console.error('Error initializing study data:', err);
          // Fallback to showing all cards
          setStudyData({
            currentBatch: cards,
            progress: {
              totalCards: cards.length,
              masteredCards: 0,
              currentBatchSize: cards.length,
              newCards: cards.length,
              reviewCards: 0
            }
          });
        }
      } catch (err) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    };

    loadCards();
  }, [theme]);

  // Load ratings when user logs in
  useEffect(() => {
    const loadRatings = async () => {
      if (!theme || !user) return;
      
      try {
        const ratingsDoc = await getDoc(doc(db, 'moleculeRatings', user.uid));
        if (ratingsDoc.exists()) {
          const data = ratingsDoc.data();
          setRatings(data[theme] || {});
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
      // Save rating
      const newRatings = { ...ratings };
      newRatings[cardId] = newValue;
      setRatings(newRatings);
      
      const ratingsRef = doc(db, 'moleculeRatings', user.uid);
      const timestamp = new Date().toISOString();
      
      // Update ratings
      await setDoc(ratingsRef, {
        [theme]: newRatings,
        lastUpdated: timestamp,
        [`${theme}_lastUpdated`]: timestamp
      }, { merge: true });

      // Update learning progress and get next review time
      const { reviewInterval } = await updateCardProgress(user.uid, theme, cardId, newValue);

      // Get updated study data
      const newStudyData = await getStudyCards(user.uid, theme, allCards);
      
      // Always maintain a minimum batch size
      let updatedBatch = [...studyData.currentBatch];
      
      // If rating is low (1-2), add the card back into the batch at a later position
      if (newValue <= 2) {
        // Remove the current card from its position
        updatedBatch = updatedBatch.filter(card => card.id !== cardId);
        
        // Reinsert it 3-5 cards later
        const reinsertPosition = Math.min(
          currentIndex + 3 + Math.floor(Math.random() * 3),
          updatedBatch.length
        );
        updatedBatch.splice(reinsertPosition, 0, studyData.currentBatch[currentIndex]);
      }
      
      // Add new cards if we're running low
      if (updatedBatch.length - currentIndex <= 5) {
        const existingCardIds = new Set(updatedBatch.map(card => card.id));
        const newCards = newStudyData.currentBatch
          .filter(card => !existingCardIds.has(card.id))
          .slice(0, 5);
        
        // Randomly insert new cards into the remaining sequence
        newCards.forEach(card => {
          const insertPos = currentIndex + 1 + Math.floor(Math.random() * 
            Math.max(1, updatedBatch.length - currentIndex));
          updatedBatch.splice(insertPos, 0, card);
        });
      }
      
      // Update study data with the modified batch
      setStudyData({
        ...newStudyData,
        currentBatch: updatedBatch
      });

      // Move to next card with smooth transition
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setIsFlipped(false);
          
          // Always move forward, wrapping around if needed
          if (currentIndex >= updatedBatch.length - 1) {
            setCurrentIndex(0);
          } else {
            setCurrentIndex(i => i + 1);
          }
          
          setIsTransitioning(false);
          
          // Show review interval message
          const timeUntilReview = reviewInterval / (1000 * 60); // Convert to minutes
          let message = '';
          if (timeUntilReview < 60) {
            message = `Cette carte reviendra dans ${Math.round(timeUntilReview)} minutes`;
          } else if (timeUntilReview < 24 * 60) {
            message = `Cette carte reviendra dans ${Math.round(timeUntilReview / 60)} heures`;
          } else {
            message = `Cette carte reviendra dans ${Math.round(timeUntilReview / (60 * 24))} jours`;
          }
          setMessage(message);
        }, 300);
      }, 500);
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

  // Show loading or error state
  if (loading || error || !studyData || !studyData.currentBatch || studyData.currentBatch.length === 0) {
    return (
      <Container sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh', gap: 2 }}>
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <>
            <Typography color="error" align="center">{error}</Typography>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Retour
            </Button>
          </>
        ) : (
          <>
            <Typography align="center">Aucune carte disponible</Typography>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Retour
            </Button>
          </>
        )}
      </Container>
    );
  }

  const currentCard = studyData.currentBatch[currentIndex];
  if (!currentCard) {
    setCurrentIndex(0);
    return null;
  }

  // Get image path for current card
  const imagePath = currentCard.image ? `/molecules/images/${themeToDirectory[theme]}/${currentCard.image.split('/').pop()}` : null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Progress indicator */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {studyData.progress?.totalCards || 0} cartes au total, {studyData.progress?.masteredCards || 0} maîtrisées
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {studyData.progress?.newCards || 0} nouvelles, {studyData.progress?.reviewCards || 0} en révision
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={studyData.progress ? (studyData.progress.masteredCards / studyData.progress.totalCards * 100) : 0}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'success.main',
              borderRadius: 4
            }
          }}
        />
        {message && (
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 1,
              textAlign: 'center',
              color: 'text.secondary',
              fontStyle: 'italic'
            }}
          >
            {message}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => navigate(-1)} size="small">
          Retour
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          >
            <NavigateBefore />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {currentIndex + 1} / {studyData.currentBatch.length}
          </Typography>
          <IconButton
            onClick={() => {
              if (currentIndex >= studyData.currentBatch.length - 1) return;
              setIsTransitioning(true);
              setTimeout(() => {
                setIsFlipped(false);
                setCurrentIndex(i => i + 1);
                setIsTransitioning(false);
              }, 300);
            }}
            disabled={currentIndex >= studyData.currentBatch.length - 1}
          >
            <NavigateNext />
          </IconButton>
        </Box>
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
          '&:hover': {
            transform: 'scale(1.02)',
            transition: 'transform 0.2s ease-in-out'
          },
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

      {/* Rating UI */}
      <Box sx={{
        maxWidth: 600,
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        mt: { xs: 2, sm: 3 }
      }}>
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
      </Box>


    </Container>
  );
}
