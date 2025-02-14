import React from 'react';
import { Box } from '@mui/material';

const RatingCircle = ({ value, isSelected, onClick }) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backgroundColor: isSelected ? 'primary.main' : 'transparent',
        border: '2px solid',
        borderColor: 'primary.main',
        color: isSelected ? 'white' : 'primary.main',
        fontWeight: 'bold',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.1)',
          backgroundColor: isSelected ? 'primary.dark' : 'primary.light',
          borderColor: isSelected ? 'primary.dark' : 'primary.light',
          color: 'white',
        },
      }}
    >
      {value}
    </Box>
  );
};

export default RatingCircle;
