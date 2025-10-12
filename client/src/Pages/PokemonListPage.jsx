import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PokemonListPage - Page for browsing and searching Pokémon
 * 
 * This page will eventually display a comprehensive list of Pokémon
 * with filtering, searching, and detailed information capabilities.
 * Currently serves as a placeholder for future development.
 */
const PokemonListPage = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderRadius: 2,
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 3
            }}
          >
            Pokémon List
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              textAlign: 'center',
              mt: 2,
              opacity: 0.8,
              mb: 4
            }}
          >
            Browse and explore detailed information about all Pokémon
          </Typography>

          <Box
            sx={{
              mt: 4,
              p: 3,
              backgroundColor: 'rgba(36, 204, 159, 0.1)',
              borderRadius: 2,
              border: '1px solid rgba(36, 204, 159, 0.3)',
              maxWidth: '600px'
            }}
          >
            <Typography
              variant="body1"
              sx={{ 
                color: 'white', 
                textAlign: 'center',
                lineHeight: 1.8
              }}
            >
              This feature is currently under development.
              <br />
              Soon you'll be able to:
            </Typography>
            
            <Box component="ul" sx={{ color: 'white', mt: 2, pl: 3 }}>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Search and filter Pokémon by name, type, and generation
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                View detailed stats, abilities, and movesets
              </Typography>
              <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                Compare Pokémon side-by-side
              </Typography>
              <Typography component="li" variant="body2">
                Access competitive usage data and tier information
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default PokemonListPage;