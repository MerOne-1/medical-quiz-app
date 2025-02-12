import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isEmailAllowed, checkExistingRequest, submitRegistrationRequest } from '../firebase';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Link,
} from '@mui/material';
import { School } from '@mui/icons-material';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [requestSubmitted, setRequestSubmitted] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      
      // Check if email is allowed
      const allowed = await isEmailAllowed(email);
      
      if (allowed) {
        setError('Cette adresse email est déjà autorisée. Veuillez vous connecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        // Check if a request already exists
        const existingRequest = await checkExistingRequest(email);
        
        if (existingRequest) {
          setError('Une demande d\'accès est déjà en cours pour cette adresse email. Veuillez patienter.');
        } else {
          // Submit new registration request
          const submitted = await submitRegistrationRequest(email);
          if (submitted) {
            setRequestSubmitted(true);
          } else {
            setError('Erreur lors de la soumission de la demande. Veuillez réessayer.');
          }
        }
      }
    } catch (error) {
      setError('Erreur lors de la demande d\'inscription. ' + error.message);
    }
    setLoading(false);
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {requestSubmitted ? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom color="primary">
              Demande envoyée !
            </Typography>
            <Typography variant="body1" paragraph>
              Votre demande d'accès a été enregistrée. Un administrateur l'examinera prochainement.
              Vous recevrez une notification lorsque votre accès sera autorisé.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/login')}
              sx={{ mt: 2 }}
            >
              Retour à la connexion
            </Button>
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <School sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" component="h1" gutterBottom>
                Inscription
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                required
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                helperText="Entrez votre adresse email pour demander l'accès"
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                S'inscrire
              </Button>
            </form>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link href="/login" variant="body2">
                Déjà un compte ? Se connecter
              </Link>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
