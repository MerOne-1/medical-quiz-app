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
  Paper,
} from '@mui/material';
import { Delete, History } from '@mui/icons-material';

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [adminEmails, setAdminEmails] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [registrationHistory, setRegistrationHistory] = useState([]);

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

  // Load registration history
  useEffect(() => {
    const loadHistory = async () => {
      if (!showHistory) return;
      
      try {
        setLoading(true);
        const historyCollection = collection(db, 'registrationHistory');
        const historySnapshot = await getDocs(query(historyCollection, orderBy('deletedAt', 'desc')));
        const historyData = historySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRegistrationHistory(historyData);
      } catch (err) {
        console.error('Error loading registration history:', err);
        setError('Failed to load registration history');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadHistory();
    }
  }, [user, showHistory]);

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

      // Update the request status to trigger email notification
      console.log('Updating registration request status...');
      const requestRef = doc(db, 'registrationRequests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        setupToken: token,
        setupUrl: setupUrl
      });
      console.log('Registration request updated successfully');

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

  const handleDelete = async (request) => {
    try {
      setLoading(true);
      
      // Store in registrationHistory before deleting
      const historyRef = collection(db, 'registrationHistory');
      await addDoc(historyRef, {
        email: request.email,
        originalRequestId: request.id,
        registrationDate: request.createdAt,
        status: request.status,
        approvedAt: request.approvedAt || null,
        rejectedAt: request.rejectedAt || null,
        deletedAt: new Date().toISOString(),
        reason: 'manually_deleted',
        hadAccount: false // Will be updated if we find a user account
      });

      // Delete from registrationRequests
      const requestRef = doc(db, 'registrationRequests', request.id);
      await deleteDoc(requestRef);

      // Delete from allowedEmails if exists
      const allowedEmailRef = doc(db, 'allowedEmails', request.email);
      await deleteDoc(allowedEmailRef);

      // Try to find and delete the user from Firebase Auth
      try {
        const userRecord = await auth.getUserByEmail(request.email);
        if (userRecord) {
          // Update history to note that user had an account
          const historyDocs = await getDocs(query(
            collection(db, 'registrationHistory'),
            where('email', '==', request.email),
            orderBy('deletedAt', 'desc'),
            limit(1)
          ));
          
          if (!historyDocs.empty) {
            await updateDoc(doc(db, 'registrationHistory', historyDocs.docs[0].id), {
              hadAccount: true,
              uid: userRecord.uid
            });
          }

          await auth.deleteUser(userRecord.uid);
        }
      } catch (error) {
        // Ignore error if user doesn't exist in Auth
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Update local state
      setRequests(prev => prev.filter(r => r.id !== request.id));
      setSuccessMessage('Registration deleted successfully');
    } catch (err) {
      console.error('Error deleting registration:', err);
      setError('Failed to delete registration');
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
    <Container maxWidth="md" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="subtitle1">
          Manage registration requests and admin access
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', fontWeight: 'medium' }}>
          Manage Admin Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Add or remove administrator access for users
        </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              label="New Admin Email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              size="small"
              sx={{ flexGrow: 1 }}
              placeholder="Enter email address"
              type="email"
              error={newAdminEmail && !newAdminEmail.includes('@')}
              helperText={newAdminEmail && !newAdminEmail.includes('@') ? 'Please enter a valid email' : ''}
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
      </Paper>

      <Typography variant="h5" gutterBottom>
        Registration Requests
      </Typography>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', fontWeight: 'medium' }}>
          Registration Requests
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review and manage registration requests
        </Typography>
        {requests.length === 0 ? (
          <Typography color="text.secondary">
            No registration requests found
          </Typography>
        ) : (
          <Stack spacing={2}>
            {requests.map((request) => (
              <Paper key={request.id} elevation={1} sx={{
                borderRadius: 2,
                bgcolor: {
                  'approved': 'success.lighter',
                  'rejected': 'error.lighter',
                  'pending': 'background.paper'
                }[request.status] || 'background.paper',
                border: 1,
                borderColor: {
                  'approved': 'success.main',
                  'rejected': 'error.main',
                  'pending': 'primary.main'
                }[request.status] || 'primary.main',
                p: 2
              }}>
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
                        {request.status === 'approved' && (
                          <Typography component="span" color="success.main" sx={{ ml: 1 }}>
                            (Approved on {new Date(request.approvedAt?.toDate?.() || request.approvedAt).toLocaleDateString()})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {request.status === 'pending' && (
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
                      )}
                      {request.status === 'rejected' && (
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
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the registration for ${request.email}? If they have already set up their account, they will be logged out and their account will be deleted.`)) {
                            handleDelete(request);
                          }
                        }}
                        disabled={loading}
                        size="small"
                        startIcon={<Delete />}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 'medium' }}>
            Registration History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<History />}
            onClick={() => {
              setShowHistory(!showHistory);
            }}
          >
            {showHistory ? 'Hide History' : 'Show History'}
          </Button>
        </Box>
        
        {showHistory && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              History of deleted registrations
            </Typography>
            {registrationHistory.length === 0 ? (
              <Typography color="text.secondary">
                No registration history found
              </Typography>
            ) : (
              <Stack spacing={2}>
                {registrationHistory.map((record) => (
                  <Paper key={record.id} elevation={1} sx={{
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    p: 2
                  }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {record.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Originally registered: {new Date(record.registrationDate?.toDate?.() || record.registrationDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last status: {record.status}
                        {record.approvedAt && ` (Approved on ${new Date(record.approvedAt?.toDate?.() || record.approvedAt).toLocaleDateString()})`}
                        {record.rejectedAt && ` (Rejected on ${new Date(record.rejectedAt?.toDate?.() || record.rejectedAt).toLocaleDateString()})`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Deleted on: {new Date(record.deletedAt).toLocaleDateString()}
                        {record.hadAccount && ' - Had active account'}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
