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
          const data = await response.json();
          themesData[theme] = data.cards;
        }

        setThemes(themesData);
        
        // Load user settings if they exist
        if (user) {
          const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
          const settingsSnapshot = await getDoc(userSettingsDoc);
          
          if (settingsSnapshot.exists()) {
            setUserSettings(settingsSnapshot.data());
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
      const themeCards = prev[themeId] || [];
      const newThemeCards = themeCards.includes(cardId)
        ? themeCards.filter(id => id !== cardId)
        : [...themeCards, cardId];

      return {
        ...prev,
        [themeId]: newThemeCards
      };
    });
  };

  const handleThemeToggle = (themeId, enable) => {
    setUserSettings(prev => ({
      ...prev,
      [themeId]: enable ? themes[themeId].map(card => card.id) : []
    }));
  };

  const saveSettings = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const userSettingsDoc = doc(db, 'moleculeSettings', user.uid);
      await setDoc(userSettingsDoc, userSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
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
