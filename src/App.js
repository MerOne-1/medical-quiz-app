import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './styles/theme';
import QuizPage from './components/QuizPage';
import HomePage from './components/HomePage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/:theme" element={<QuizPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
