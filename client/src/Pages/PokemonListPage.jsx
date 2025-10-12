import React, { useEffect } from 'react';
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
  Pagination,
  IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PokemonCard from '../components/pokemon/PokemonCard';
import usePokemonList from '../hooks/usePokemonList';
import usePaginationState from '../hooks/usePaginationState';

/**
 * PokemonListPage - Page for browsing and searching Pokémon
 * Maintains pagination state across navigation
 */
const PokemonListPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pokemonList, loading, error, totalCount } = usePokemonList();
  
  // Use pagination state hook with persistence
  const { state, updateState, resetState } = usePaginationState('pokemonListState', {
    searchTerm: '',
    page: 1,
    itemsPerPage: 24
  });

  const { searchTerm, page, itemsPerPage } = state;

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

  // Reset to page 1 when search changes
  useEffect(() => {
    if (page > 1 && searchTerm !== state.searchTerm) {
      updateState({ page: 1 });
    }
  }, [searchTerm, page, state.searchTerm, updateState]);

  // Adjust page if current page exceeds total pages
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      updateState({ page: totalPages });
    }
  }, [totalPages, page, updateState]);

  const handleSearchChange = (event) => {
    updateState({ searchTerm: event.target.value, page: 1 });
  };

  const handleClearSearch = () => {
    updateState({ searchTerm: '', page: 1 });
  };

  const handlePageChange = (event, value) => {
    updateState({ page: value });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePokemonClick = (pokemon) => {
    // Navigate to detail page - state is preserved in localStorage
    navigate(`/pokemon-list/${pokemon.id}`);
  };

  const handleResetFilters = () => {
    resetState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <Box sx={{ maxWidth: 600, mx: 'auto', mb: 2 }}>
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
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <Tooltip title="Clear search">
                        <IconButton
                          onClick={handleClearSearch}
                          edge="end"
                          size="small"
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          <ClearIcon />
                        </IconButton>
                      </Tooltip>
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

            {/* Results count and page info */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
              >
                Showing {paginatedPokemon.length} of {filteredPokemon.length} Pokémon
              </Typography>
              
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.primary.main,
                  fontWeight: 'bold'
                }}
              >
                Page {page} of {totalPages}
              </Typography>
            </Box>
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
                    showFirstButton
                    showLastButton
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
              <Typography variant="h6" sx={{ color: 'white', opacity: 0.6, mb: 2 }}>
                No Pokémon found matching "{searchTerm}"
              </Typography>
              <Typography 
                variant="body2" 
                onClick={handleResetFilters}
                sx={{ 
                  color: theme.palette.primary.main,
                  cursor: 'pointer',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                Clear search
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PokemonListPage;