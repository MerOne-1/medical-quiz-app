import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Checkbox,
  FormControlLabel,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ExpandMore,
  Save,
  RestoreFromTrash,
  DeleteOutline,
} from '@mui/icons-material';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function MoleculesSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState({});
  const [userSettings, setUserSettings] = useState({});
  const [expandedTheme, setExpandedTheme] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Load all themes and their cards
  useEffect(() => {
    const loadThemes = async () => {
      try {
        setLoading(true);
        setSaveError(null);
        const themesData = {};
        
        // List of all themes
        const themesList = [
          'antibact-antisept',
          'broncho',
          'gastro',
          'immuno-hemato',
          'infectio',
          'onco',
          'syst-nerveux'
        ];

        // Load each theme's cards
        for (const theme of themesList) {
          try {
            const response = await fetch(`/molecules/data/${theme}.json`);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.cards || !Array.isArray(data.cards)) {
              throw new Error('Invalid data format: cards array not found');
            }
            themesData[theme] = data.cards;
          } catch (error) {
            console.error(`Error loading theme ${theme}:`, error);
            throw new Error(`Erreur lors du chargement du thème ${theme}`);
          }
        }

        setThemes(themesData);
        
        // Load user settings if they exist
        if (user) {
          try {
            const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
            const settingsSnapshot = await getDoc(userSettingsDoc);
            
            if (settingsSnapshot.exists()) {
              const savedSettings = settingsSnapshot.data();
              // Initialize all themes with all cards
              const updatedSettings = {};
              Object.keys(themesData).forEach(theme => {
                updatedSettings[theme] = themesData[theme].map(card => card.id);
              });

              // Override with saved settings where they exist
              Object.keys(savedSettings).forEach(theme => {
                if (themesData[theme] && Array.isArray(savedSettings[theme])) {
                  const validCardIds = themesData[theme].map(card => card.id);
                  const validSavedCards = savedSettings[theme].filter(id => validCardIds.includes(id));
                  if (validSavedCards.length > 0) {
                    updatedSettings[theme] = validSavedCards;
                  }
                }
              });

              setUserSettings(updatedSettings);
            } else {
              // Initialize with all cards enabled
              const initialSettings = {};
              Object.keys(themesData).forEach(theme => {
                initialSettings[theme] = themesData[theme].map(card => card.id);
              });
              setUserSettings(initialSettings);
            }
          } catch (error) {
            console.error('Error loading user settings:', error);
            throw new Error('Erreur lors du chargement des paramètres utilisateur');
          }
        }
      } catch (error) {
        console.error('Error in loadThemes:', error);
        setSaveError(error.message);
        setUserSettings({});
      } finally {
        setLoading(false);
      }
    };

    loadThemes();
  }, [user]);

  const handleThemeExpand = (theme) => {
    setExpandedTheme(expandedTheme === theme ? null : theme);
  };

  const handleCardToggle = (themeId, cardId) => {
    setUserSettings(prev => {
      // Make sure we have a copy of the previous settings
      const newSettings = { ...prev };
      
      // Initialize theme array if it doesn't exist
      if (!newSettings[themeId]) {
        newSettings[themeId] = [];
      }
      
      // Toggle the card
      const themeCards = newSettings[themeId];
      const newThemeCards = themeCards.includes(cardId)
        ? themeCards.filter(id => id !== cardId)
        : [...themeCards, cardId];

      return {
        ...newSettings,
        [themeId]: newThemeCards
      };
    });
  };

  const handleThemeToggle = (themeId, enable) => {
    setUserSettings(prev => {
      const newSettings = { ...prev };
      if (enable && themes[themeId]) {
        newSettings[themeId] = themes[themeId].map(card => card.id);
      } else {
        newSettings[themeId] = [];
      }
      return newSettings;
    });
  };

  const saveSettings = async () => {
    if (!user) {
      setSaveError('Vous devez être connecté pour sauvegarder vos paramètres');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      
      // Make sure we have all themes loaded
      if (Object.keys(themes).length === 0) {
        throw new Error('Les thèmes ne sont pas encore chargés');
      }

      // Validate and clean up settings before saving
      const validatedSettings = {};
      Object.keys(themes).forEach(theme => {
        const themeCards = themes[theme];
        const validCardIds = themeCards.map(card => card.id);
        const currentSelection = userSettings[theme] || [];

        // Validate current selection
        const validSelection = currentSelection.filter(id => validCardIds.includes(id));

        // If no valid cards are selected, select all cards
        validatedSettings[theme] = validSelection.length > 0 ? validSelection : validCardIds;
      });

      // Save to Firestore
      const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
      await setDoc(userSettingsDoc, validatedSettings);
      
      // Update local state
      setUserSettings(validatedSettings);
      setSaveSuccess(true);

      // Log success
      console.log('Settings saved successfully:', validatedSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError(error.message || 'Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const getThemeTitle = (themeId) => {
    const titles = {
      'antibact-antisept': 'Antibactériens et Antiseptiques',
      'broncho': 'Bronchodilatateurs',
      'gastro': 'Gastro-entérologie',
      'immuno-hemato': 'Immuno-hématologie',
      'infectio': 'Infectiologie',
      'onco': 'Oncologie',
      'syst-nerveux': 'Système Nerveux'
    };
    return titles[themeId] || themeId;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Gestion des Molécules
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          Personnalisez votre liste de molécules à étudier
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save />}
          onClick={saveSettings}
          disabled={saving}
          sx={{ mr: 2 }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>

        <Snackbar 
          open={saveSuccess} 
          autoHideDuration={3000} 
          onClose={() => setSaveSuccess(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSaveSuccess(false)}>
            Paramètres sauvegardés avec succès
          </Alert>
        </Snackbar>

        <Snackbar 
          open={!!saveError} 
          autoHideDuration={3000} 
          onClose={() => setSaveError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        </Snackbar>
      </Box>

      {Object.entries(themes).map(([themeId, cards]) => (
        <Accordion
          key={themeId}
          expanded={expandedTheme === themeId}
          onChange={() => handleThemeExpand(themeId)}
          sx={{ mb: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', pr: 2 }}>
              <Typography variant="h6">{getThemeTitle(themeId)}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={`${userSettings[themeId]?.length || 0}/${cards.length} cartes`}
                  color="primary"
                  size="small"
                  sx={{ mr: 2 }}
                />
                <Tooltip title="Tout sélectionner">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeToggle(themeId, true);
                    }}
                  >
                    <RestoreFromTrash />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Tout désélectionner">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleThemeToggle(themeId, false);
                    }}
                  >
                    <DeleteOutline />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {cards.map((card) => (
                <Grid item xs={12} sm={6} key={card.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={userSettings[themeId]?.includes(card.id) || false}
                            onChange={() => handleCardToggle(themeId, card.id)}
                          />
                        }
                        label={card.name}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
}
