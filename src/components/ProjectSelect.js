import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Grid,
} from '@mui/material';
import { QuizOutlined, ScienceOutlined } from '@mui/icons-material';

const projects = [
  {
    id: 'qcm',
    title: 'QCMs CSP',
    description: 'Préparez vos examens avec des QCMs interactifs',
    icon: QuizOutlined,
    color: '#009688',
    path: '/home'
  },
  {
    id: 'molecules',
    title: 'Flashcards Molécules',
    description: 'Apprenez et révisez les structures moléculaires',
    icon: ScienceOutlined,
    color: '#2196f3',
    path: '/molecules'  // Link to molecules theme selection page
  }
];

export default function ProjectSelect() {
  const navigate = useNavigate();

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      pt: 8,
      pb: 6
    }}>
      <Container maxWidth="md">
        <Typography
          component="h1"
          variant="h3"
          align="center"
          color="text.primary"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Choisissez votre application
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {projects.map((project) => (
            <Grid item key={project.id} xs={12} sm={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardActionArea 
                  sx={{ height: '100%' }}
                  onClick={() => navigate(project.path)}
                >
                  <CardContent sx={{ height: '100%', p: 4 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        mb: 3
                      }}
                    >
                      <project.icon 
                        sx={{ 
                          fontSize: 60,
                          color: project.color
                        }}
                      />
                    </Box>
                    <Typography gutterBottom variant="h5" component="h2" align="center">
                      {project.title}
                    </Typography>
                    <Typography align="center" color="text.secondary">
                      {project.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
