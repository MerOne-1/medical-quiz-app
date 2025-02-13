import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Snackbar,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [adminEmails, setAdminEmails] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Check if user's email is in authorized admins list
  useEffect(() => {
    console.log('AdminPage mounted');
    const checkAdminAccess = async () => {
      console.log('Starting admin access check...');
      if (!user) {
        console.log('No user found - redirecting to home');
        navigate('/');
        return;
      }
      console.log('User found:', user.email);

      console.log('Checking access for user:', user.email);

      try {
        // Get the authorized admins document
        console.log('Getting admin document reference...');
        const adminsRef = doc(db, 'adminAccess', 'authorizedEmails');
        console.log('Fetching admin document...');
        
        const adminsDoc = await getDoc(adminsRef);
        
        if (!adminsDoc.exists()) {
          console.error('Admin configuration not found in Firestore');
          console.log('adminsDoc:', adminsDoc);
          navigate('/');
          return;
        }
        console.log('Admin document exists');

        const data = adminsDoc.data();
        console.log('Admin document data:', JSON.stringify(data, null, 2));
        
        const authorizedEmails = data.emails || [];
        console.log('Authorized emails:', authorizedEmails);
        
        if (!authorizedEmails.includes(user.email)) {
          console.error('Unauthorized access attempt');
          navigate('/');
          return;
        }

        console.log('Access granted!');
        setLoading(false);
      } catch (err) {
        console.error('Error checking admin access:', err);
        navigate('/');
      }
    };

    checkAdminAccess();
  }, [user, navigate]);

  // Initialize and load admin emails
  useEffect(() => {
    const initializeAndLoadAdminEmails = async () => {
      try {
        const adminsRef = doc(db, 'adminAccess', 'authorizedEmails');
        const adminsDoc = await getDoc(adminsRef);
        
        if (!adminsDoc.exists()) {
          // Create initial document with the current user's email
          await setDoc(adminsRef, {
            emails: [user.email]
          });
          setAdminEmails([user.email]);
          console.log('Created admin access document with initial admin:', user.email);
        } else {
          setAdminEmails(adminsDoc.data().emails || []);
        }
      } catch (err) {
        console.error('Error initializing/loading admin emails:', err);
        setError('Failed to load admin emails');
      }
    };

    if (user) {
      initializeAndLoadAdminEmails();
    }
  }, [user]);

  // Load registration requests
  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        const requestsCollection = collection(db, 'registrationRequests');
        const snapshot = await getDocs(requestsCollection);
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRequests(requestsData);
      } catch (err) {
        console.error('Error loading requests:', err);
        setError('Failed to load registration requests');
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const handleAccept = async (request) => {
    try {
      setLoading(true);
      console.log('Starting approval process for:', request.email);

      // Generate a unique token for the setup link
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Add to allowedEmails collection with token
      console.log('Adding to allowedEmails collection...');
      const allowedEmailsRef = doc(db, 'allowedEmails', request.email);
      await setDoc(allowedEmailsRef, { 
        email: request.email,
        approved: true,
        approvedAt: new Date().toISOString(),
        setupToken: token,
        setupTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });
      console.log('Added to allowedEmails successfully');

      // Send approval email using a cloud function
      const setupUrl = `${window.location.origin}/setup-account?email=${encodeURIComponent(request.email)}&token=${token}`;
      
      // Here you would call your cloud function to send the email
      // For now, we'll just show the URL in the success message
      console.log('Setup URL:', setupUrl);

      // Delete the request
      console.log('Deleting registration request...');
      await deleteDoc(doc(db, 'registrationRequests', request.id));
      console.log('Registration request deleted successfully');

      // Update local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setSuccessMessage(`Demande approuvée. URL de configuration : ${setupUrl}`);
    } catch (err) {
      console.error('Error accepting request:', err);
      setError(`Erreur lors de l'approbation : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (request) => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'registrationRequests', request.id));
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setSuccessMessage('Registration request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject registration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">
          Admin Dashboard
        </Typography>
      </Box>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Manage Admin Access
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="New Admin Email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  if (!newAdminEmail) return;
                  
                  const adminsRef = doc(db, 'adminAccess', 'authorizedEmails');
                  await updateDoc(adminsRef, {
                    emails: arrayUnion(newAdminEmail)
                  });
                  
                  setAdminEmails([...adminEmails, newAdminEmail]);
                  setNewAdminEmail('');
                  setSuccessMessage('Admin email added successfully');
                } catch (err) {
                  console.error('Error adding admin:', err);
                  setError('Failed to add admin email');
                }
              }}
            >
              Add Admin
            </Button>
          </Box>
          
          <List>
            {adminEmails.map((email) => (
              <ListItem
                key={email}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={async () => {
                      try {
                        const adminsRef = doc(db, 'adminAccess', 'authorizedEmails');
                        await updateDoc(adminsRef, {
                          emails: arrayRemove(email)
                        });
                        
                        setAdminEmails(adminEmails.filter(e => e !== email));
                        setSuccessMessage('Admin email removed successfully');
                      } catch (err) {
                        console.error('Error removing admin:', err);
                        setError('Failed to remove admin email');
                      }
                    }}
                  >
                    <Delete />
                  </IconButton>
                }
              >
                <ListItemText primary={email} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Typography variant="h5" gutterBottom>
        Registration Requests
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />

      {requests.length === 0 ? (
        <Typography color="text.secondary">
          No pending registration requests
        </Typography>
      ) : (
        <Stack spacing={2}>
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6">
                      {request.name}
                    </Typography>
                    <Typography color="text.secondary">
                      {request.email}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleAccept(request)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleReject(request)}
                    >
                      Reject
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
