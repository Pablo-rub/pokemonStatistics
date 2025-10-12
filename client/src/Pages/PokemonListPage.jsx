import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import PokemonCard from '../components/pokemon/PokemonCard';
import usePokemonList from '../hooks/usePokemonList';
import { useNavigate } from 'react-router-dom';

/**
 * PokemonListPage - Page for browsing and searching Pokémon
 */
const PokemonListPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pokemonList, loading, error, totalCount } = usePokemonList();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  // Filter Pokémon based on search term
  const filteredPokemon = pokemonList.filter(pokemon =>
    pokemon.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pokemon.id.toString().includes(searchTerm)
  );

  // Pagination
  const totalPages = Math.ceil(filteredPokemon.length / itemsPerPage);
  const paginatedPokemon = filteredPokemon.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page on search
  };

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePokemonClick = (pokemon) => {
    // Navigate to detail page
    navigate(`/pokemon-list/${pokemon.id}`);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}>
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Alert severity="error">
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderRadius: 2,
            minHeight: '70vh'
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 'bold',
                textAlign: 'center',
                mb: 2
              }}
            >
              Pokémon List
            </Typography>
            
            <Typography
              variant="body1"
              sx={{
                color: 'white',
                textAlign: 'center',
                opacity: 0.8,
                mb: 3
              }}
            >
              Browse all {totalCount} Pokémon from Generation 1 to 9
            </Typography>

            {/* Search Bar */}
            <Box sx={{ maxWidth: 600, mx: 'auto' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by name or number..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'white' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main
                    }
                  }
                }}
              />
            </Box>

            {/* Results count */}
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                textAlign: 'center',
                mt: 2
              }}
            >
              Showing {paginatedPokemon.length} of {filteredPokemon.length} Pokémon
            </Typography>
          </Box>

          {/* Pokémon Grid */}
          {paginatedPokemon.length > 0 ? (
            <>
              <Grid container spacing={3}>
                {paginatedPokemon.map((pokemon) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={pokemon.id}>
                    <PokemonCard
                      pokemon={pokemon}
                      onClick={() => handlePokemonClick(pokemon)}
                    />
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    sx={{
                      '& .MuiPaginationItem-root': {
                        color: 'white'
                      }
                    }}
                  />
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" sx={{ color: 'white', opacity: 0.6 }}>
                No Pokémon found matching "{searchTerm}"
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PokemonListPage;