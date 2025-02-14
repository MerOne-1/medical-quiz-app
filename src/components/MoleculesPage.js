import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState({});
  const [studyData, setStudyData] = useState({ currentBatch: [], masteredCards: [], progress: null });
  
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
      } catch (err) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [theme]);

  // Load study data when cards or user changes
  useEffect(() => {
    const loadStudyData = async () => {
      if (!user || allCards.length === 0) return;
      
      try {
        // Get study cards and progress
        const data = await getStudyCards(user.uid, theme, allCards);
        setStudyData(data);

        // Load ratings
        const ratingsDoc = await getDoc(doc(db, 'moleculeRatings', user.uid));
        if (ratingsDoc.exists()) {
          const data = ratingsDoc.data();
          setRatings(data[theme] || {});
        }
      } catch (err) {
        console.error('Error loading study data:', err);
      }
    };

    loadStudyData();
  }, [user, theme, allCards]);

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

      // Update learning progress
      await updateCardProgress(user.uid, theme, cardId, newValue);

      // Get updated study data
      const newStudyData = await getStudyCards(user.uid, theme, allCards);
      setStudyData(newStudyData);

      // Move to next card after a short delay
      setTimeout(() => {
        if (currentIndex < newStudyData.currentBatch.length - 1) {
          setIsTransitioning(true);
          setTimeout(() => {
            setIsFlipped(false);
            setCurrentIndex(i => i + 1);
            setIsTransitioning(false);
          }, 300);
        } else {
          // Start new batch
          setCurrentIndex(0);
          setIsFlipped(false);
        }
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

  const currentCard = studyData.currentBatch[currentIndex];
  if (!currentCard) return null;

  // Get image path for current card
  const imagePath = currentCard.image ? `/molecules/images/${themeToDirectory[theme]}/${currentCard.image.split('/').pop()}` : null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Progress indicator */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Lot {studyData.progress?.currentBatch || 1} sur {studyData.progress?.totalBatches || 1}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {studyData.progress?.masteredInBatch || 0} / {studyData.progress?.cardsInBatch || 0} maîtrisées
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={studyData.progress ? (studyData.progress.masteredInBatch / studyData.progress.cardsInBatch * 100) : 0}
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
      </Box>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" onClick={() => navigate(-1)} size="small">
          Retour
        </Button>
        <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
          {currentIndex + 1} / {studyData.currentBatch.length}
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
          disabled={currentIndex === 0 || studyData.currentBatch.length === 0}
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
            if (currentIndex === studyData.currentBatch.length - 1) return;
            setIsTransitioning(true);
            setTimeout(() => {
              setIsFlipped(false);
              setCurrentIndex(i => i + 1);
              setIsTransitioning(false);
            }, 300);
          }}
          disabled={currentIndex === studyData.currentBatch.length - 1}
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
