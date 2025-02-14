import React from 'react';
import MoleculesPage from './components/MoleculesPage';
import MoleculesDrawingPage from './components/MoleculesDrawingPage';
import MoleculesThemeRecognitionPage from './components/MoleculesThemeRecognitionPage';
import PersonalDeckPage from './components/PersonalDeckPage';
import MoleculesHomePage from './components/MoleculesHomePage';
import MoleculesSettings from './components/MoleculesSettings';
import PersonalDeckManager from './components/PersonalDeckManager';
import AdminPage from './components/AdminPage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectSelect from './components/ProjectSelect';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './styles/theme';
import QuizPage from './components/QuizPage';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Signup from './components/Signup';
import SetupAccount from './components/SetupAccount';
import ResultsPage from './components/ResultsPage';
import NavBar from './components/NavBar';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Box } from '@mui/material';

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <NavBar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/setup-account" element={<SetupAccount />} />
              <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <ProjectSelect />
                  </PrivateRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <PrivateRoute>
                    <HomePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules"
                element={
                  <PrivateRoute>
                    <MoleculesHomePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/settings"
                element={
                  <PrivateRoute>
                    <MoleculesSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/personal-decks"
                element={
                  <PrivateRoute>
                    <PersonalDeckManager />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/personal/:deckId/drawing"
                element={
                  <PrivateRoute>
                    <MoleculesDrawingPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/personal/:deckId/recognition"
                element={
                  <PrivateRoute>
                    <PersonalDeckPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/personal/:deckId"
                element={
                  <PrivateRoute>
                    <PersonalDeckPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/:theme/drawing"
                element={
                  <PrivateRoute>
                    <MoleculesDrawingPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/:theme"
                element={
                  <PrivateRoute>
                    <MoleculesThemeRecognitionPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/quiz/:theme"
                element={
                  <PrivateRoute>
                    <QuizPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/results"
                element={
                  <PrivateRoute>
                    <ResultsPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="*"
                element={
                  <PrivateRoute>
                    <ProjectSelect />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Box>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
