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
          const response = await fetch(`/molecules/data/${theme}.json`);
          if (!response.ok) {
            throw new Error(`Failed to load theme ${theme}`);
          }
          const data = await response.json();
          themesData[theme] = data.cards;
        }

        setThemes(themesData);
        
        // Load user settings if they exist
        if (user) {
          const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
          const settingsSnapshot = await getDoc(userSettingsDoc);
          
          if (settingsSnapshot.exists()) {
            const savedSettings = settingsSnapshot.data();
            // Keep existing settings, initialize new themes with all cards
            const updatedSettings = {};
            Object.keys(themesData).forEach(theme => {
              if (savedSettings[theme]) {
                // Keep existing settings for this theme
                const validCardIds = themesData[theme].map(card => card.id);
                // Filter out any invalid card IDs
                updatedSettings[theme] = savedSettings[theme].filter(id => validCardIds.includes(id));
              } else {
                // Initialize new theme with all cards
                updatedSettings[theme] = themesData[theme].map(card => card.id);
              }
            });
            setUserSettings(updatedSettings);
            // Save the cleaned up settings
            await setDoc(userSettingsDoc, updatedSettings);
          } else {
            // Initialize with all cards enabled
            const initialSettings = {};
            Object.keys(themesData).forEach(theme => {
              initialSettings[theme] = themesData[theme].map(card => card.id);
            });
            setUserSettings(initialSettings);
          }
        }
      } catch (error) {
        console.error('Error loading themes:', error);
        setSaveError('Erreur lors du chargement des thèmes');
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
      
      // Validate and clean up settings before saving
      const validatedSettings = {};
      Object.keys(themes).forEach(theme => {
        const currentThemeCards = userSettings[theme] || [];
        const validCardIds = themes[theme].map(card => card.id);
        
        // If no cards are selected, select all cards for this theme
        if (currentThemeCards.length === 0) {
          validatedSettings[theme] = validCardIds;
        } else {
          // Only keep valid card IDs
          validatedSettings[theme] = currentThemeCards.filter(id => validCardIds.includes(id));
          // If all cards were invalid, select all cards
          if (validatedSettings[theme].length === 0) {
            validatedSettings[theme] = validCardIds;
          }
        }
      });

      const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
      await setDoc(userSettingsDoc, validatedSettings);
      setUserSettings(validatedSettings);
      setSaveSuccess(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Erreur lors de la sauvegarde. Veuillez réessayer.');
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
          Paramètres des Cartes
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          Sélectionnez les cartes que vous souhaitez étudier
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
