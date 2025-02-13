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
        console.log('Loading registration requests...');
        setLoading(true);
        const requestsCollection = collection(db, 'registrationRequests');
        const snapshot = await getDocs(requestsCollection);
        console.log('Found', snapshot.docs.length, 'requests');
        const requestsData = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Request data:', data);
          return {
            id: doc.id,
            ...data,
            status: data.status || 'pending' // Default to pending if no status
          };
        });
        console.log('Processed requests:', requestsData);
        setRequests(requestsData);
      } catch (err) {
        console.error('Error loading requests:', err);
        setError('Failed to load registration requests');
      } finally {
        setLoading(false);
      }
    };

    if (user) { // Only load requests if user is authenticated
      loadRequests();
    }
  }, [user]); // Reload when user changes

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
      // Instead of deleting, update the status to rejected
      const requestRef = doc(db, 'registrationRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString()
      });
      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'rejected', rejectedAt: new Date().toISOString() } : r
      ));
      setSuccessMessage('Registration request rejected');
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError('Failed to reject registration');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (request) => {
    try {
      setLoading(true);
      // Update the status back to pending
      const requestRef = doc(db, 'registrationRequests', request.id);
      await updateDoc(requestRef, {
        status: 'pending',
        rejectedAt: null
      });
      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === request.id ? { ...r, status: 'pending', rejectedAt: null } : r
      ));
      setSuccessMessage('Registration request restored');
    } catch (err) {
      console.error('Error restoring request:', err);
      setError('Failed to restore registration request');
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

      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Registration Requests
        </Typography>
        {requests.length === 0 ? (
          <Typography color="text.secondary">
            No registration requests found
          </Typography>
        ) : (
          <Stack spacing={2}>
            {requests.map((request) => (
              <Card key={request.id} sx={{
                borderLeft: 4,
                borderColor: request.status === 'rejected' ? 'error.main' : 'primary.main'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {request.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requested: {new Date(request.createdAt?.toDate?.() || request.createdAt || Date.now()).toLocaleDateString()}
                        {request.status === 'rejected' && (
                          <Typography component="span" color="error" sx={{ ml: 1 }}>
                            (Rejected on {new Date(request.rejectedAt?.toDate?.() || request.rejectedAt).toLocaleDateString()})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {request.status !== 'rejected' ? (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleAccept(request)}
                            disabled={loading}
                            size="small"
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleReject(request)}
                            disabled={loading}
                            size="small"
                          >
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="contained"
                          color="warning"
                          onClick={() => handleRestore(request)}
                          disabled={loading}
                          size="small"
                        >
                          Restore
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Container>
  );
}
