import React from 'react';
import MoleculesPage from './components/MoleculesPage';
import MoleculesHomePage from './components/MoleculesHomePage';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProjectSelect from './components/ProjectSelect';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './styles/theme';
import QuizPage from './components/QuizPage';
import HomePage from './components/HomePage';
import Login from './components/Login';
import Signup from './components/Signup';
import ResultsPage from './components/ResultsPage';
import NavBar from './components/NavBar';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { Box } from '@mui/material';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <NavBar />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/select"
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
                path="/molecules/:theme"
                element={
                  <PrivateRoute>
                    <MoleculesPage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <HomePage />
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
                path="/molecules"
                element={
                  <PrivateRoute>
                    <MoleculesHomePage />
                  </PrivateRoute>
                }
              />
              <Route
                path="/molecules/:theme"
                element={
                  <PrivateRoute>
                    <MoleculesPage />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
