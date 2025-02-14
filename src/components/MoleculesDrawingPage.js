import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { getStudyCards } from '../utils/learningAlgorithm';
import RatingCircle from './RatingCircle';

// Map theme names to directory names
const themeToDirectory = {
  'Médicaments': 'medicaments',
  'Acides aminés': 'acides-amines',
  'Glucides': 'glucides',
  'Lipides': 'lipides',
  'Nucléotides': 'nucleotides',
  'Vitamines': 'vitamines',
};

export default function MoleculesDrawingPage() {
  const { theme } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const isGuidedMode = searchParams.get('mode') === 'guided';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allCards, setAllCards] = useState([]);
  const [studyData, setStudyData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ratings, setRatings] = useState({});
  const [message, setMessage] = useState('');

  // Load cards on mount
  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(\`/molecules/data/\${themeToDirectory[theme]}.json\`);
        if (!response.ok) {
          throw new Error('Failed to load cards');
        }
        const data = await response.json();
        if (!data || !data.cards) {
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

        // Load existing ratings if user is logged in
        if (user) {
          const ratingsDoc = await getDoc(doc(db, 'moleculeRatings', user.uid));
          if (ratingsDoc.exists()) {
            const userRatings = ratingsDoc.data()[theme] || {};
            setRatings(userRatings);
          }
        }
      } catch (err) {
        console.error('Error loading cards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [theme, user, isGuidedMode]);

  // Handle rating submission
  const handleRating = async (cardId, newValue) => {
    if (!user) return;
    
    try {
      // Save the rating
      await saveRating(cardId, newValue);
      
      // Show transition message
      setMessage('Évaluation enregistrée...');
      
      // Wait for animation
      setTimeout(async () => {
        setIsTransitioning(true);
        
        // Get next card after delay
        setTimeout(async () => {
          setIsFlipped(false);
          
          // If we're at the end, get new batch in guided mode
          if (currentIndex >= studyData.currentBatch.length - 1 && isGuidedMode && user) {
            const newStudyData = await getStudyCards(user.uid, theme, allCards);
            setStudyData(newStudyData);
            setCurrentIndex(0);
          } else if (currentIndex < studyData.currentBatch.length - 1) {
            setCurrentIndex(currentIndex + 1);
          }
          
          setIsTransitioning(false);
          
          // Calculate and show next review time
          const card = studyData.currentBatch[currentIndex];
          const timeUntilReview = calculateNextReview(card, newValue);
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
        [\`\${theme}_lastUpdated\`]: timestamp,
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
  const imagePath = currentCard.image ? \`/molecules/images/\${themeToDirectory[theme]}/\${currentCard.image.split('/').pop()}\` : null;

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

      {/* Navigation */}
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

      {/* Flashcard */}
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
          '& *': {
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
          }}
        >
          {/* Front of card (Molecule Name) */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              backgroundColor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" component="h2" gutterBottom>
              {currentCard.name}
            </Typography>
            {currentCard.properties && (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                {currentCard.properties}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Cliquez pour voir la structure
            </Typography>
          </Box>

          {/* Back of card (Structure) */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              backgroundColor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 3,
            }}
          >
            {imagePath && (
              <Box
                component="img"
                src={imagePath}
                alt={currentCard.name}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70%',
                  objectFit: 'contain',
                  mb: 2
                }}
              />
            )}
            {user && (
              <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <RatingCircle
                    key={value}
                    value={value}
                    isSelected={ratings[currentCard.id] === value}
                    onClick={() => handleRating(currentCard.id, value)}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
