import React from 'react';
import { Box, Typography } from '@mui/material';

const AnalyzeBattlePage = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4">Analyze Battle</Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Aquí irá el análisis de la batalla para el replay seleccionado.
      </Typography>
    </Box>
  );
};

export default AnalyzeBattlePage;