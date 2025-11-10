import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CardActionArea,
  Checkbox,
  Alert,
  CircularProgress,
  Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PokemonSprite from '../PokemonSprite';

/**
 * Componente para seleccionar Pokémon del pool disponible
 * Permite búsqueda, filtrado y selección múltiple
 */
const PokemonSelector = ({ 
  availablePokemon = [], 
  selectedPokemon = [], 
  onSelectionChange,
  loading = false,
  maxSelection = null 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPokemon, setFilteredPokemon] = useState([]);

  useEffect(() => {
    // Filtrar Pokémon por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = availablePokemon.filter(pokemon =>
        pokemon.displayName.toLowerCase().includes(query) ||
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.id.toString().includes(query) ||
        (pokemon.types && pokemon.types.some(t => t.name.toLowerCase().includes(query)))
      );
      setFilteredPokemon(filtered);
    } else {
      setFilteredPokemon(availablePokemon);
    }
  }, [searchQuery, availablePokemon]);

  const handleTogglePokemon = (pokemon) => {
    const isSelected = selectedPokemon.some(p => p.id === pokemon.id);
    
    if (isSelected) {
      // Deseleccionar
      onSelectionChange(selectedPokemon.filter(p => p.id !== pokemon.id));
    } else {
      // Seleccionar (si no se alcanzó el máximo)
      if (maxSelection && selectedPokemon.length >= maxSelection) {
        return; // No permitir más selecciones
      }
      onSelectionChange([...selectedPokemon, pokemon]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const getTypeColor = (typeName) => {
    const typeColors = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0',
      electric: '#F8D030', grass: '#78C850', ice: '#98D8D8',
      fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
      flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
      dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
    };
    return typeColors[typeName.toLowerCase()] || '#777';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Barra de búsqueda */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search Pokémon by name, ID, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
                borderColor: '#24cc9f'
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#24cc9f'
              }
            }
          }}
        />
      </Box>

      {/* Info de selección */}
      {maxSelection && (
        <Alert 
          severity={selectedPokemon.length === maxSelection ? "success" : "info"}
          sx={{ mb: 2 }}
        >
          Selected: {selectedPokemon.length} / {maxSelection}
          {selectedPokemon.length === maxSelection && " (Maximum reached)"}
        </Alert>
      )}

      {/* Grid de Pokémon */}
      <Grid container spacing={2}>
        {filteredPokemon.length === 0 ? (
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', py: 4 }}>
              {searchQuery ? 'No Pokémon found matching your search' : 'No Pokémon available'}
            </Typography>
          </Grid>
        ) : (
          filteredPokemon.map((pokemon) => {
            const isSelected = selectedPokemon.some(p => p.id === pokemon.id);
            const isDisabled = maxSelection && selectedPokemon.length >= maxSelection && !isSelected;

            return (
              <Grid item xs={6} sm={4} md={3} lg={2} key={pokemon.id}>
                <Fade in={true} timeout={300}>
                  <Card
                    sx={{
                      backgroundColor: isSelected 
                        ? 'rgba(36, 204, 159, 0.2)' 
                        : 'rgba(30, 30, 30, 0.9)',
                      border: isSelected ? '2px solid #24cc9f' : '2px solid transparent',
                      transition: 'all 0.2s',
                      position: 'relative',
                      opacity: isDisabled ? 0.5 : 1,
                      pointerEvents: isDisabled ? 'none' : 'auto',
                      '&:hover': {
                        transform: isDisabled ? 'none' : 'translateY(-4px)',
                        boxShadow: isDisabled ? 'none' : '0 8px 16px rgba(0,0,0,0.3)'
                      }
                    }}
                  >
                    <CardActionArea onClick={() => handleTogglePokemon(pokemon)}>
                      {/* Checkbox de selección */}
                      <Checkbox
                        checked={isSelected}
                        icon={<Box />}
                        checkedIcon={<CheckCircleIcon />}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          color: '#24cc9f',
                          zIndex: 1
                        }}
                      />

                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        {/* Sprite del Pokémon */}
                        <Box sx={{ mb: 1, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PokemonSprite 
                            pokemonName={pokemon.name}
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                          />
                        </Box>

                        {/* Nombre y ID */}
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'white', 
                            fontWeight: 'bold',
                            mb: 0.5
                          }}
                        >
                          {pokemon.displayName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                        >
                          #{pokemon.id}
                        </Typography>

                        {/* Tipos */}
                        {pokemon.types && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            {pokemon.types.map((typeObj) => (
                              <Chip
                                key={typeObj.name}
                                label={typeObj.name}
                                size="small"
                                sx={{
                                  backgroundColor: getTypeColor(typeObj.name),
                                  color: 'white',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  height: 20
                                }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Badge de uso (si disponible) */}
                        {(pokemon.usageCount || pokemon.usagePercent) && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              mt: 0.5,
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.65rem'
                            }}
                          >
                            {pokemon.usageCount 
                              ? `${pokemon.usageCount} uses` 
                              : `${pokemon.usagePercent.toFixed(1)}%`
                            }
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Fade>
              </Grid>
            );
          })
        )}
      </Grid>
    </Box>
  );
};

export default PokemonSelector;
