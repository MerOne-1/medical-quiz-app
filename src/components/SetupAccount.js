import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
} from '@mui/material';
import { School } from '@mui/icons-material';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function SetupAccount() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();

  // Get email from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  useEffect(() => {
    async function validateToken() {
      if (!email || !token) {
        setError('Email ou token manquant');
        navigate('/login');
        return;
      }

      try {
        // Check if email exists in allowedEmails and token matches
        const allowedEmailRef = doc(db, 'allowedEmails', email);
        const allowedEmailDoc = await getDoc(allowedEmailRef);

        if (!allowedEmailDoc.exists()) {
          setError('Email non autorisé');
          navigate('/login');
          return;
        }

        const data = allowedEmailDoc.data();
        if (data.setupToken !== token) {
          setError('Token invalide');
          navigate('/login');
          return;
        }

        // Check if token is expired (24 hours)
        const setupTokenExpires = new Date(data.setupTokenExpires);
        if (setupTokenExpires < new Date()) {
          setError('Le lien a expiré. Veuillez demander un nouveau lien.');
          navigate('/login');
          return;
        }
      } catch (err) {
        console.error('Error validating token:', err);
        setError('Erreur lors de la validation du token');
        navigate('/login');
      }
    }

    validateToken();
  }, [email, token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      return setError('Les mots de passe ne correspondent pas');
    }

    if (password.length < 6) {
      return setError('Le mot de passe doit contenir au moins 6 caractères');
    }

    try {
      setError('');
      setLoading(true);

      // Create the user account
      await signup(email, password);

      // Create user document
      await setDoc(doc(db, 'users', email), {
        email,
        createdAt: new Date().toISOString()
      });

      // Update allowedEmails to mark setup as complete
      await updateDoc(doc(db, 'allowedEmails', email), {
        setupComplete: true,
        setupCompletedAt: new Date().toISOString(),
        setupToken: null, // Clear the token
        setupTokenExpires: null
      });

      navigate('/login');
    } catch (error) {
      setError('Erreur lors de la création du compte: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <School sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            Configuration du compte
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            Bienvenue ! Veuillez créer un mot de passe pour votre compte.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Mot de passe"
            type="password"
            required
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Minimum 6 caractères"
          />
          <TextField
            label="Confirmer le mot de passe"
            type="password"
            required
            fullWidth
            margin="normal"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Créer le compte
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
