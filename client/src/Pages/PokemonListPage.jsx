import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Box,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useTheme } from '@mui/material/styles';
import PokemonCard from '../components/pokemon/PokemonCard';
import TypeFilter from '../components/pokemon/TypeFilter';
import usePokemonList from '../hooks/usePokemonList';
import { matchesTypeFilter } from '../utils/pokemonTypes';

const PokemonListPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get URL parameters
  const searchParams = new URLSearchParams(location.search);
  const pageParam = parseInt(searchParams.get('page')) || 1;
  const searchParam = searchParams.get('search') || '';
  const typesParam = searchParams.get('types') || '';
  const filterModeParam = searchParams.get('filterMode') || 'OR';
  
  const [currentPage, setCurrentPage] = useState(pageParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [selectedTypes, setSelectedTypes] = useState(
    typesParam ? typesParam.split(',').filter(Boolean) : []
  );
  const [filterMode, setFilterMode] = useState(filterModeParam);
  const [typeFilterExpanded, setTypeFilterExpanded] = useState(selectedTypes.length > 0);
  
  const itemsPerPage = 24;
  
  // Fetch Pokémon list
  const { pokemonList, loading, error } = usePokemonList({ limit: 1025 });

  // Log cuando cambie la lista de Pokémon
  useEffect(() => {
    console.log('📊 PokemonListPage: pokemonList updated:', {
      count: pokemonList.length,
      firstPokemon: pokemonList[0],
      hasTypes: pokemonList.filter(p => p.types && p.types.length > 0).length
    });
  }, [pokemonList]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (selectedTypes.length > 0) params.set('types', selectedTypes.join(','));
    if (filterMode !== 'OR') params.set('filterMode', filterMode);
    
    const newSearch = params.toString();
    const currentSearch = location.search.slice(1);
    
    if (newSearch !== currentSearch) {
      navigate(`${location.pathname}?${newSearch}`, { replace: true });
    }
  }, [currentPage, searchQuery, selectedTypes, filterMode, navigate, location.pathname, location.search]);

  // Filter and search Pokémon
  const filteredPokemon = useMemo(() => {
    console.log('🔍 PokemonListPage: Filtering Pokémon...', {
      totalPokemon: pokemonList.length,
      searchQuery,
      selectedTypes,
      filterMode
    });

    let filtered = [...pokemonList];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pokemon =>
        pokemon.displayName.toLowerCase().includes(query) ||
        pokemon.id.toString().includes(query)
      );
      console.log(`   After search: ${filtered.length} Pokémon`);
    }

    // Apply type filter
    if (selectedTypes.length > 0) {
      const beforeTypeFilter = filtered.length;
      filtered = filtered.filter(pokemon =>
        matchesTypeFilter(pokemon, selectedTypes, filterMode)
      );
      console.log(`   After type filter: ${filtered.length} Pokémon (from ${beforeTypeFilter})`);
    }

    console.log(`✅ Final filtered count: ${filtered.length}`);
    return filtered;
  }, [pokemonList, searchQuery, selectedTypes, filterMode]);

  // Pagination
  const totalPages = Math.ceil(filteredPokemon.length / itemsPerPage);
  const paginatedPokemon = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPokemon.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPokemon, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypes, filterMode]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePokemonClick = (pokemon) => {
    navigate(`/pokemon-list/${pokemon.id}`);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleTypesChange = (newTypes) => {
    setSelectedTypes(newTypes);
  };

  const handleFilterModeChange = (newMode) => {
    setFilterMode(newMode);
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
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              mb: 1
            }}
          >
            Pokémon List
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Browse and explore all Pokémon from Generations 1-9
          </Typography>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleClearSearch}
                    edge="end"
                    sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)'
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

        {/* Type Filter */}
        <TypeFilter
          selectedTypes={selectedTypes}
          onTypesChange={handleTypesChange}
          filterMode={filterMode}
          onFilterModeChange={handleFilterModeChange}
          filteredCount={filteredPokemon.length}
          totalCount={pokemonList.length}
          expanded={typeFilterExpanded}
          onExpandedChange={setTypeFilterExpanded}
        />

        {/* Results Summary */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Showing {paginatedPokemon.length} of {filteredPokemon.length} Pokémon
            {(searchQuery || selectedTypes.length > 0) && (
              <span style={{ color: theme.palette.primary.main, marginLeft: '8px' }}>
                (filtered from {pokemonList.length} total)
              </span>
            )}
          </Typography>

          {totalPages > 1 && (
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Page {currentPage} of {totalPages}
            </Typography>
          )}
        </Box>

        {/* No results message */}
        {filteredPokemon.length === 0 ? (
          <Fade in={true}>
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
                px: 2
              }}
            >
              <Typography variant="h5" sx={{ color: 'white', mb: 2 }}>
                No Pokémon found
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Try adjusting your search or filter criteria
              </Typography>
            </Box>
          </Fade>
        ) : (
          <>
            {/* Pokémon Grid */}
            <Grid container spacing={3}>
              {paginatedPokemon.map((pokemon) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={pokemon.id}>
                  <Fade in={true} timeout={300}>
                    <Box>
                      <PokemonCard
                        pokemon={pokemon}
                        onClick={() => handlePokemonClick(pokemon)}
                      />
                    </Box>
                  </Fade>
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                  showFirstButton
                  showLastButton
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      '&:hover': {
                        backgroundColor: 'rgba(36, 204, 159, 0.1)',
                        borderColor: theme.palette.primary.main
                      },
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        fontWeight: 'bold',
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark
                        }
                      }
                    }
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
};

export default PokemonListPage;