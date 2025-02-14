import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Grid,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import {
  saveUserDeck,
  getUserDecks,
  uploadMoleculeImage,
  addCardToDeck,
  removeCardFromDeck,
} from '../utils/userDecks';

export default function PersonalDeckManager() {
  const { currentUser } = useAuth();
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({
    name: '',
    details: '',
    image: null,
  });
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [newDeckName, setNewDeckName] = useState('');
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);

  useEffect(() => {
    loadDecks();
  }, [currentUser]);

  const loadDecks = async () => {
    if (currentUser) {
      const userDecks = await getUserDecks(currentUser.uid);
      setDecks(userDecks);
    }
  };

  const handleCreateDeck = async () => {
    try {
      await saveUserDeck(currentUser.uid, newDeckName, []);
      setAlert({
        open: true,
        message: 'Deck créé avec succès',
        severity: 'success',
      });
      setIsCreatingDeck(false);
      setNewDeckName('');
      loadDecks();
    } catch (error) {
      setAlert({
        open: true,
        message: 'Erreur lors de la création du deck',
        severity: 'error',
      });
    }
  };

  const handleAddCard = async () => {
    try {
      if (!newCard.image) {
        throw new Error('Veuillez sélectionner une image');
      }

      const { url, fileName } = await uploadMoleculeImage(currentUser.uid, newCard.image);
      
      const card = {
        id: Date.now().toString(),
        name: newCard.name,
        details: newCard.details,
        image: url,
        fileName: fileName,
      };

      await addCardToDeck(currentUser.uid, selectedDeck.deckName, card);
      
      setAlert({
        open: true,
        message: 'Molécule ajoutée avec succès',
        severity: 'success',
      });
      
      setIsAddingCard(false);
      setNewCard({ name: '', details: '', image: null });
      loadDecks();
    } catch (error) {
      setAlert({
        open: true,
        message: error.message || 'Erreur lors de l\'ajout de la molécule',
        severity: 'error',
      });
    }
  };

  const handleRemoveCard = async (deckName, cardId) => {
    try {
      await removeCardFromDeck(currentUser.uid, deckName, cardId);
      setAlert({
        open: true,
        message: 'Molécule supprimée avec succès',
        severity: 'success',
      });
      loadDecks();
    } catch (error) {
      setAlert({
        open: true,
        message: 'Erreur lors de la suppression de la molécule',
        severity: 'error',
      });
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setNewCard({ ...newCard, image: file });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
          Mes Decks Personnels
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreatingDeck(true)}
        >
          Créer un Deck
        </Button>
      </Box>

      <Grid container spacing={3}>
        {decks.map((deck) => (
          <Grid item xs={12} md={6} key={deck.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{deck.deckName}</Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedDeck(deck);
                        setIsAddingCard(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      Ajouter une Molécule
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  {deck.cards.map((card) => (
                    <Grid item xs={12} sm={6} key={card.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {card.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveCard(deck.deckName, card.id)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          {card.details && (
                            <Typography variant="body2" color="text.secondary">
                              {card.details}
                            </Typography>
                          )}
                          <Box sx={{ mt: 1 }}>
                            <img
                              src={card.image}
                              alt={card.name}
                              style={{
                                width: '100%',
                                height: '120px',
                                objectFit: 'contain',
                                borderRadius: '4px',
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Deck Dialog */}
      <Dialog open={isCreatingDeck} onClose={() => setIsCreatingDeck(false)}>
        <DialogTitle>Créer un Nouveau Deck</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom du deck"
            fullWidth
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreatingDeck(false)}>Annuler</Button>
          <Button onClick={handleCreateDeck} variant="contained" disabled={!newDeckName}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={isAddingCard} onClose={() => setIsAddingCard(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Ajouter une Molécule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nom de la molécule"
              fullWidth
              value={newCard.name}
              onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
            />
            <TextField
              label="Description (optionnelle)"
              fullWidth
              multiline
              rows={2}
              value={newCard.details}
              onChange={(e) => setNewCard({ ...newCard, details: e.target.value })}
            />
            <Button
              variant="outlined"
              component="label"
              fullWidth
            >
              {newCard.image ? 'Changer l\'image' : 'Choisir une image'}
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageChange}
              />
            </Button>
            {newCard.image && (
              <Typography variant="body2" color="text.secondary">
                Image sélectionnée: {newCard.image.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsAddingCard(false);
            setNewCard({ name: '', details: '', image: null });
          }}>
            Annuler
          </Button>
          <Button
            onClick={handleAddCard}
            variant="contained"
            disabled={!newCard.name || !newCard.image}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
