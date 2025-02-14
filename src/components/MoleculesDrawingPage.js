import React, { useState, useEffect, useRef } from 'react';
import CanvasDraw from 'react-canvas-draw';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
} from '@mui/material';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import { getStudyCards, updateCardProgress } from '../utils/learningAlgorithm';

// Map theme names to directory names
const themeToDirectory = {
  'antibact-antisept': 'antibact-antisept',
  'broncho': 'broncho',
  'gastro': 'gastro',
  'immuno-hemato': 'immuno-hemato',
  'infectio': 'infectio',
  'onco': 'onco',
  'syst-nerveux': 'syst-nerveux'
};

export default function MoleculesDrawingPage() {
  const { theme } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studyData, setStudyData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const canvasRef = useRef(null);

  // Validate theme
  useEffect(() => {
    if (!themeToDirectory[theme]) {
      setError('Invalid theme');
      setLoading(false);
      return;
    }

    const loadCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/molecules/data/' + themeToDirectory[theme] + '.json');
        if (!response.ok) {
          throw new Error('Failed to load cards');
        }
        const data = await response.json();
        if (!data || !data.cards) {
          throw new Error('Invalid card data');
        }

        // Transform the data into cards
        const cards = data.cards.map(card => ({
          id: card.id || card.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: card.name,
          image: card.image,
          details: card.details
        }));

        // If no cards are returned, just use all cards
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
        setCurrentIndex(0);
      } catch (error) {
        console.error('Error loading cards:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [theme, user.uid]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowSolution(false);
      if (canvasRef.current) {
        canvasRef.current.clear();
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < studyData.currentBatch.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowSolution(false);
      if (canvasRef.current) {
        canvasRef.current.clear();
      }
    }
  };

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
    }
  };

  const handleUndo = () => {
    if (canvasRef.current) {
      canvasRef.current.undo();
    }
  };

  const handleReveal = () => {
    setShowSolution(true);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" align="center" gutterBottom>
          Loading cards...
        </Typography>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" color="error" align="center" gutterBottom>
          {error}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  if (!studyData || !studyData.currentBatch || studyData.currentBatch.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Typography variant="h5" align="center" gutterBottom>
          No cards available for study
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button variant="contained" onClick={() => navigate('/molecules')}>
            Return to Themes
          </Button>
        </Box>
      </Container>
    );
  }

  const currentCard = studyData.currentBatch[currentIndex];
  const imagePath = currentCard.image
    ? currentCard.image.includes('/') 
      ? `/molecules/images/${currentCard.image}`
      : `/molecules/images/${themeToDirectory[theme]}/${currentCard.image}`
    : null;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
            Mode Dessin
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
            Entraînez-vous à dessiner les structures moléculaires
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/molecules')}
          startIcon={<NavigateBefore />}
          sx={{ height: 'fit-content' }}
        >
          Retour aux Thèmes
        </Button>
      </Box>

      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mb: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          py: 1
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Molécule {currentIndex + 1} sur {studyData.currentBatch.length}
        </Typography>
      </Box>

      <Card 
        sx={{ 
          minHeight: 600, 
          display: 'flex', 
          flexDirection: 'column',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderRadius: '12px'
        }}
      >
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              {currentCard.name}
            </Typography>
            {currentCard.details && (
              <Typography variant="subtitle1" color="text.secondary">
                {currentCard.details}
              </Typography>
            )}
          </Box>
          
          <Typography variant="body1" gutterBottom sx={{ mb: 2, color: '#666' }}>
            Dessinez la structure de la molécule ci-dessous
          </Typography>
          
          <Box 
            sx={{ 
              width: '100%', 
              maxWidth: 600, 
              mb: 2,
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}
          >
            <CanvasDraw
              ref={canvasRef}
              canvasWidth={600}
              canvasHeight={400}
              brushRadius={2}
              lazyRadius={0}
              brushColor="#000"
              backgroundColor="#fff"
              hideGrid
              style={{ border: '1px solid #e0e0e0' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <Button 
              variant="outlined" 
              onClick={handleClear}
              sx={{ minWidth: '120px' }}
            >
              Effacer
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleUndo}
              sx={{ minWidth: '120px' }}
            >
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={handleReveal} 
              disabled={showSolution}
              sx={{ 
                minWidth: '120px',
                backgroundColor: showSolution ? '#ccc' : '#1976d2',
                '&:hover': {
                  backgroundColor: showSolution ? '#ccc' : '#1565c0'
                }
              }}
            >
              Voir Solution
            </Button>
          </Box>

          {showSolution && imagePath && (
            <Box 
              sx={{ 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                mb: 2,
                p: 3,
                backgroundColor: '#f8f8f8',
                borderRadius: '8px'
              }}
            >
              <Typography variant="h6" sx={{ color: '#1976d2' }}>
                Solution
              </Typography>
              <img
                src={imagePath}
                alt={currentCard.name}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '300px',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              />
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 'auto', pt: 4 }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              startIcon={<NavigateBefore />}
              sx={{ minWidth: '150px' }}
            >
              Précédent
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={currentIndex === studyData.currentBatch.length - 1}
              endIcon={<NavigateNext />}
              sx={{ minWidth: '150px' }}
            >
              Suivant
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
