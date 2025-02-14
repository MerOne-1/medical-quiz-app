import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { loadAllMolecules } from '../utils/molecules';
import { useAuth } from '../contexts/AuthContext';
import {
  saveUserDeck,
  getUserDecks,
  uploadMoleculeImage,
  addCardToDeck,
  removeCardFromDeck,
  deleteDeck,
} from '../utils/userDecks';

export default function PersonalDeckManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState('manual'); // 'manual' or 'existing'
  const [existingMolecules, setExistingMolecules] = useState([]);
  const [selectedMolecules, setSelectedMolecules] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDecks();
  }, [user]);

  const loadDecks = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userDecks = await getUserDecks(user.uid);
      setDecks(userDecks);
    } catch (error) {
      console.error('Error loading decks:', error);
      setAlert({
        open: true,
        message: 'Erreur lors du chargement des decks',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async () => {
    try {
      const trimmedName = newDeckName.trim();
      if (!trimmedName) {
        throw new Error('Le nom du deck est requis');
      }

      await saveUserDeck(user.uid, trimmedName, []);
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
        message: error.message || 'Erreur lors de la création du deck',
        severity: 'error',
      });
    }
  };

  // Load existing molecules when opening the dialog
  useEffect(() => {
    if (isAddingCard) {
      loadAllMolecules()
        .then(molecules => setExistingMolecules(molecules))
        .catch(error => {
          console.error('Error loading molecules:', error);
          setAlert({
            open: true,
            message: 'Erreur lors du chargement des molécules',
            severity: 'error',
          });
        });
    }
  }, [isAddingCard]);

  const handleAddCard = async () => {
    try {
      if (addMode === 'manual') {
        if (!newCard.image) {
          throw new Error('Veuillez sélectionner une image');
        }
        if (!newCard.name) {
          throw new Error('Veuillez entrer un nom');
        }
      } else if (selectedMolecules.length === 0) {
        throw new Error('Veuillez sélectionner au moins une molécule');
      }

      let card;
      
      if (addMode === 'manual') {
        const { url, fileName } = await uploadMoleculeImage(user.uid, newCard.image);
        card = {
          id: Date.now().toString(),
          name: newCard.name,
          details: newCard.details,
          image: url,
          fileName: fileName,
        };
      } else {
        // Add all selected molecules
        for (const molecule of selectedMolecules) {
          const card = {
            id: molecule.id,
            name: molecule.name,
            details: molecule.details || '',
            image: molecule.image,
            theme: molecule.theme,
            directory: molecule.directory,
          };
          await addCardToDeck(user.uid, selectedDeck.deckName, card);
        }
      }

      if (addMode === 'manual') {
        await addCardToDeck(user.uid, selectedDeck.deckName, card);
      }
      
      setAlert({
        open: true,
        message: addMode === 'manual' ? 
          'Molécule ajoutée avec succès' : 
          `${selectedMolecules.length} molécule${selectedMolecules.length > 1 ? 's' : ''} ajoutée${selectedMolecules.length > 1 ? 's' : ''} avec succès`,
        severity: 'success',
      });
      
      setIsAddingCard(false);
      setNewCard({ name: '', details: '', image: null });
      setSelectedMolecules([]);
      setAddMode('manual');
      loadDecks();
    } catch (error) {
      setAlert({
        open: true,
        message: error.message || 'Erreur lors de l\'ajout de la molécule',
        severity: 'error',
      });
    }
  };

  const handleDeleteDeck = async (deckId) => {
    try {
      await deleteDeck(user.uid, deckId);
      setAlert({
        open: true,
        message: 'Deck supprimé avec succès',
        severity: 'success',
      });
      loadDecks();
    } catch (error) {
      setAlert({
        open: true,
        message: 'Erreur lors de la suppression du deck',
        severity: 'error',
      });
    }
  };

  const handleRemoveCard = async (deckName, cardId) => {
    try {
      await removeCardFromDeck(user.uid, deckName, cardId);
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



  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Mes Decks Personnels
      </Typography>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">{deck.deckName}</Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Êtes-vous sûr de vouloir supprimer le deck "${deck.deckName}" ? Cette action est irréversible.`)) {
                          handleDeleteDeck(deck.id);
                        }
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  <Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        const practiceMode = localStorage.getItem('moleculesPracticeMode') || 'recognition';
                        const studyMode = localStorage.getItem('moleculesStudyMode') || 'guided';
                        const path = practiceMode === 'drawing' ? 
                          `/molecules/personal/${deck.id}/drawing` : 
                          `/molecules/personal/${deck.id}/recognition`;
                        const queryParams = studyMode === 'guided' ? '?mode=guided' : '';
                        navigate(path + queryParams);
                      }}
                      disabled={!deck.cards?.length}
                      sx={{ mr: 1 }}
                    >
                      S'entraîner
                    </Button>
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
          <Box sx={{ mt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              label="Nom du deck"
              fullWidth
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              error={newDeckName.length > 50}
              helperText={newDeckName.length > 50 ? 'Le nom ne doit pas dépasser 50 caractères' : ''}
              inputProps={{ maxLength: 50 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Le nom doit être unique et peut contenir des lettres, chiffres et espaces.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreatingDeck(false)}>Annuler</Button>
          <Button onClick={handleCreateDeck} variant="contained" disabled={!newDeckName}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Card Dialog */}
      <Dialog open={isAddingCard} onClose={() => {
        setIsAddingCard(false);
        setAddMode('manual');
        setNewCard({ name: '', details: '', image: null });
        setSelectedMolecules([]);
        setSearchTerm('');
      }} maxWidth="md" fullWidth>
        <DialogTitle>Ajouter une Molécule</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={addMode} onChange={(e, newValue) => setAddMode(newValue)}>
              <Tab label="Ajouter manuellement" value="manual" />
              <Tab label="Choisir une molécule existante" value="existing" />
            </Tabs>
          </Box>
          
          {addMode === 'manual' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                <Box sx={{ mt: 1, textAlign: 'center' }}>
                  <img
                    src={URL.createObjectURL(newCard.image)}
                    alt="Preview"
                    style={{ maxWidth: '100%', maxHeight: '200px' }}
                  />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={existingMolecules}
                getOptionLabel={(option) => `${option.name} (${option.theme})`}
                value={selectedMolecules}
                onChange={(e, newValue) => setSelectedMolecules(newValue)}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                      <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>
                        <img
                          src={option.image}
                          alt={option.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Theme: {option.theme}
                        </Typography>
                      </Box>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Rechercher des molécules"
                    placeholder="Sélectionnez plusieurs molécules..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                    }}
                  />
                )}
                ListboxProps={{
                  style: {
                    maxHeight: '400px'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {selectedMolecules.length} molécule{selectedMolecules.length > 1 ? 's' : ''} sélectionnée{selectedMolecules.length > 1 ? 's' : ''}
              </Typography>
              {selectedMolecules.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Molécules sélectionnées:
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedMolecules.map((molecule) => (
                      <Grid item xs={12} sm={6} key={molecule.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" gutterBottom>
                              {molecule.name}
                            </Typography>
                            <Box sx={{ mt: 1, textAlign: 'center' }}>
                              <img
                                src={molecule.image}
                                alt={molecule.name}
                                style={{ maxWidth: '100%', maxHeight: '100px' }}
                              />
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Theme: {molecule.theme}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsAddingCard(false);
            setAddMode('manual');
            setNewCard({ name: '', details: '', image: null });
            setSelectedMolecules([]);
          }}>
            Annuler
          </Button>
          <Button
            onClick={handleAddCard}
            variant="contained"
            disabled={addMode === 'manual' ? !newCard.name || !newCard.image : selectedMolecules.length === 0}
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
