import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Tabs,
  Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

/**
 * PokemonDetailPage - Detailed view of a single Pokémon
 * Shows stats, types, abilities, moves, and competitive data
 */
const PokemonDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [pokemonData, setPokemonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  useEffect(() => {
    fetchPokemonDetails();
  }, [id]);

  const fetchPokemonDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/pokemon/${id}`);
      setPokemonData(response.data);
    } catch (err) {
      console.error('Error fetching Pokémon details:', err);
      setError(err.response?.data?.message || 'Error loading Pokémon details');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getTypeColor = (type) => {
    const typeColors = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return typeColors[type.toLowerCase()] || '#68A090';
  };

  const getStatColor = (value) => {
    if (value >= 120) return '#4caf50';
    if (value >= 90) return '#8bc34a';
    if (value >= 60) return '#ffc107';
    if (value >= 30) return '#ff9800';
    return '#f44336';
  };

  const getStatBarValue = (value) => {
    // Max stat is typically 255, but we'll normalize to 200 for better visualization
    return Math.min((value / 200) * 100, 100);
  };

  // Enhanced back navigation that preserves list state
  const handleBackToList = () => {
    // Navigate back to the list - usePaginationState hook will restore the previous state
    navigate('/pokemon-list');
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
          <Box sx={{ mt: 2 }}>
            <IconButton onClick={handleBackToList} sx={{ color: 'white' }}>
              <ArrowBackIcon /> Back to list
            </IconButton>
          </Box>
        </Box>
      </Container>
    );
  }

  if (!pokemonData) return null;

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header with back button */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={handleBackToList}
            sx={{ 
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
            }}
            aria-label="Back to Pokémon list"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            {pokemonData.displayName}
          </Typography>
          <Typography variant="h5" sx={{ color: theme.palette.primary.main, ml: 1 }}>
            #{pokemonData.id.toString().padStart(4, '0')}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - Image and Basic Info */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderRadius: 2,
                textAlign: 'center'
              }}
            >
              <Box
                component="img"
                src={pokemonData.sprites.officialArtwork}
                alt={pokemonData.displayName}
                sx={{
                  width: '100%',
                  maxWidth: 300,
                  height: 'auto',
                  margin: '0 auto',
                  filter: 'drop-shadow(0 0 20px rgba(36, 204, 159, 0.3))'
                }}
                onError={(e) => {
                  e.target.src = pokemonData.sprites.default;
                }}
              />

              {/* Types */}
              <Box sx={{ mt: 3, mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                  Type
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {pokemonData.types.map((type) => (
                    <Chip
                      key={type.slot}
                      label={type.name}
                      sx={{
                        backgroundColor: getTypeColor(type.name),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        px: 2
                      }}
                    />
                  ))}
                </Box>
              </Box>

              {/* Height and Weight */}
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Height
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {(pokemonData.height / 10).toFixed(1)} m
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Weight
                  </Typography>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {(pokemonData.weight / 10).toFixed(1)} kg
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Right Column - Stats and Abilities */}
          <Grid item xs={12} md={8}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderRadius: 2,
                minHeight: 500
              }}
            >
              {/* Tabs */}
              <Tabs
                value={currentTab}
                onChange={handleTabChange}
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  mb: 3,
                  '& .MuiTab-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-selected': {
                      color: theme.palette.primary.main
                    }
                  }
                }}
              >
                <Tab label="Stats" />
                <Tab label="Abilities" />
              </Tabs>

              {/* Tab Content: Stats */}
              {currentTab === 0 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Base Stats
                  </Typography>
                  
                  {pokemonData.stats.map((stat) => {
                    const statName = stat.name
                      .split('-')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    
                    return (
                      <Box key={stat.name} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography sx={{ color: 'white', fontWeight: 500 }}>
                            {statName}
                          </Typography>
                          <Typography 
                            sx={{ 
                              color: getStatColor(stat.baseStat),
                              fontWeight: 'bold'
                            }}
                          >
                            {stat.baseStat}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={getStatBarValue(stat.baseStat)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStatColor(stat.baseStat),
                              borderRadius: 4
                            }
                          }}
                        />
                      </Box>
                    );
                  })}

                  {/* Total Stats */}
                  <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Total
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: theme.palette.primary.main,
                          fontWeight: 'bold'
                        }}
                      >
                        {pokemonData.stats.reduce((sum, stat) => sum + stat.baseStat, 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Tab Content: Abilities */}
              {currentTab === 1 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Abilities
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {pokemonData.abilities.map((ability) => (
                      <Grid item xs={12} key={ability.slot}>
                        <Card
                          sx={{
                            backgroundColor: ability.isHidden 
                              ? 'rgba(36, 204, 159, 0.1)' 
                              : 'rgba(50, 50, 50, 0.5)',
                            border: ability.isHidden 
                              ? `1px solid ${theme.palette.primary.main}` 
                              : '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                                {ability.name}
                              </Typography>
                              {ability.isHidden && (
                                <Chip
                                  label="Hidden"
                                  size="small"
                                  sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: 'white',
                                    fontWeight: 'bold'
                                  }}
                                />
                              )}
                            </Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.7)',
                                mt: 1
                              }}
                            >
                              Slot {ability.slot}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default PokemonDetailPage;