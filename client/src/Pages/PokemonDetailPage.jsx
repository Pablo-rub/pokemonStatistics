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
  Tab,
  Tooltip,
  Button,
  ButtonGroup,
  Fade
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';

const PokemonDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [pokemonData, setPokemonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [alternateForms, setAlternateForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [displayedPokemon, setDisplayedPokemon] = useState(null);
  
  // NEW: State for ability descriptions
  const [abilityDescriptions, setAbilityDescriptions] = useState({});
  const [loadingAbilityDesc, setLoadingAbilityDesc] = useState({});

  useEffect(() => {
    fetchPokemonDetails();
  }, [id]);

  useEffect(() => {
    if (pokemonData && pokemonData.id <= 1025) {
      fetchAlternateForms(pokemonData.id);
      setDisplayedPokemon(pokemonData);
    }
  }, [pokemonData]);

  useEffect(() => {
    if (selectedForm === null) {
      setDisplayedPokemon(pokemonData);
    } else {
      setDisplayedPokemon(selectedForm);
    }
  }, [selectedForm, pokemonData]);

  // NEW: Fetch ability descriptions when displayed Pokemon changes
  useEffect(() => {
    if (displayedPokemon?.abilities) {
      fetchAbilityDescriptions(displayedPokemon.abilities);
    }
  }, [displayedPokemon]);

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

  const fetchAlternateForms = async (pokemonId) => {
    setLoadingForms(true);
    try {
      const response = await axios.get(`/api/pokemon-species/${pokemonId}`);
      const nonDefaultForms = response.data.varieties.filter(v => !v.isDefault);
      setAlternateForms(nonDefaultForms);
    } catch (err) {
      console.error('Error fetching alternate forms:', err);
      setAlternateForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  // NEW: Function to fetch ability descriptions from PokeAPI
  const fetchAbilityDescriptions = async (abilities) => {
    for (const ability of abilities) {
      // Skip if already fetched
      if (abilityDescriptions[ability.name]) {
        continue;
      }

      // Convert ability name to API format (lowercase, spaces to hyphens)
      const abilitySlug = ability.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      setLoadingAbilityDesc(prev => ({ ...prev, [ability.name]: true }));

      try {
        const response = await axios.get(`https://pokeapi.co/api/v2/ability/${abilitySlug}`);
        
        // Find English description
        const englishEntry = response.data.effect_entries.find(
          entry => entry.language.name === 'en'
        );

        // Alternatively, use flavor_text_entries for a shorter description
        const flavorTextEntry = response.data.flavor_text_entries.find(
          entry => entry.language.name === 'en'
        );

        const description = englishEntry?.effect || 
                          flavorTextEntry?.flavor_text || 
                          'Description not available';

        setAbilityDescriptions(prev => ({
          ...prev,
          [ability.name]: description.replace(/\n/g, ' ')
        }));
      } catch (err) {
        console.error(`Error fetching description for ${ability.name}:`, err);
        setAbilityDescriptions(prev => ({
          ...prev,
          [ability.name]: 'Description not available'
        }));
      } finally {
        setLoadingAbilityDesc(prev => ({ ...prev, [ability.name]: false }));
      }
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleFormChange = (form) => {
    setSelectedForm(form);
    setCurrentTab(0);
  };

  const getFormBadgeColor = (formType) => {
    const colors = {
      mega: '#9333EA',
      primal: '#DC2626',
      gigantamax: '#EF4444',
      alola: '#3B82F6',
      galar: '#6366F1',
      hisui: '#7C3AED',
      paldea: '#EC4899',
      alternate: '#9CA3AF'
    };
    return colors[formType] || colors.alternate;
  };

  const getFormIcon = (formType) => {
    if (formType === 'mega' || formType === 'primal') {
      return <AutoAwesomeIcon sx={{ fontSize: 16 }} />;
    }
    if (formType === 'gigantamax') {
      return <FlashOnIcon sx={{ fontSize: 16 }} />;
    }
    return null;
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
    return Math.min((value / 200) * 100, 100);
  };

  const handleBackToList = () => {
    navigate('/pokemon-list');
  };

  const calculateOptimizedTotal = (stats) => {
    if (!stats || !Array.isArray(stats)) return { total: 0, optimized: 0, wasted: 0 };
    
    const attackStat = stats.find(s => s.name === 'attack');
    const spAttackStat = stats.find(s => s.name === 'special-attack');
    
    if (!attackStat || !spAttackStat) return { total: 0, optimized: 0, wasted: 0 };
    
    const total = stats.reduce((sum, stat) => sum + stat.baseStat, 0);
    const wastedStat = Math.min(attackStat.baseStat, spAttackStat.baseStat);
    const optimized = total - wastedStat;
    
    return {
      total,
      optimized,
      wasted: wastedStat,
      wastedStatName: attackStat.baseStat < spAttackStat.baseStat ? 'Attack' : 'Sp. Attack'
    };
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

  if (!pokemonData || !displayedPokemon) return null;

  const optimizedStats = calculateOptimizedTotal(displayedPokemon.stats);

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
            {displayedPokemon.displayName}
          </Typography>
          
          <Typography variant="h5" sx={{ color: theme.palette.primary.main, ml: 1 }}>
            #{displayedPokemon.id.toString().padStart(4, '0')}
          </Typography>

          {selectedForm && (
            <Chip
              icon={getFormIcon(selectedForm.formType)}
              label={selectedForm.formType.toUpperCase()}
              sx={{
                backgroundColor: getFormBadgeColor(selectedForm.formType),
                color: 'white',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}
            />
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Left Column - Image and Basic Info */}
          <Grid item xs={12} md={4}>
            <Fade in={true} timeout={500}>
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
                  src={displayedPokemon.sprites.officialArtwork}
                  alt={displayedPokemon.displayName}
                  sx={{
                    width: '100%',
                    maxWidth: 300,
                    height: 'auto',
                    margin: '0 auto',
                    filter: selectedForm?.formType === 'mega' 
                      ? 'drop-shadow(0 0 30px rgba(147, 51, 234, 0.6))' 
                      : 'drop-shadow(0 0 20px rgba(36, 204, 159, 0.3))',
                    transition: 'all 0.5s ease'
                  }}
                  onError={(e) => {
                    e.target.src = displayedPokemon.sprites.default;
                  }}
                />

                {/* Alternate Forms Buttons */}
                {alternateForms.length > 0 && (
                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        display: 'block',
                        mb: 1.5,
                        textTransform: 'uppercase',
                        letterSpacing: 1
                      }}
                    >
                      Alternate Forms
                    </Typography>
                    
                    <ButtonGroup 
                      orientation="vertical" 
                      fullWidth
                      sx={{ gap: 1 }}
                    >
                      <Button
                        variant={selectedForm === null ? 'contained' : 'outlined'}
                        onClick={() => handleFormChange(null)}
                        sx={{
                          color: selectedForm === null ? 'white' : theme.palette.primary.main,
                          borderColor: theme.palette.primary.main,
                          backgroundColor: selectedForm === null 
                            ? theme.palette.primary.main 
                            : 'transparent',
                          '&:hover': {
                            backgroundColor: selectedForm === null
                              ? theme.palette.primary.dark
                              : 'rgba(36, 204, 159, 0.08)'
                          },
                          textTransform: 'none',
                          fontWeight: 'bold',
                          justifyContent: 'flex-start',
                          px: 2
                        }}
                      >
                        Base Form
                      </Button>

                      {alternateForms.map((form) => (
                        <Button
                          key={form.id}
                          variant={selectedForm?.id === form.id ? 'contained' : 'outlined'}
                          onClick={() => handleFormChange(form)}
                          startIcon={getFormIcon(form.formType)}
                          sx={{
                            color: selectedForm?.id === form.id 
                              ? 'white' 
                              : getFormBadgeColor(form.formType),
                            borderColor: getFormBadgeColor(form.formType),
                            backgroundColor: selectedForm?.id === form.id 
                              ? getFormBadgeColor(form.formType)
                              : 'transparent',
                            '&:hover': {
                              backgroundColor: selectedForm?.id === form.id
                                ? getFormBadgeColor(form.formType)
                                : `${getFormBadgeColor(form.formType)}20`
                            },
                            textTransform: 'none',
                            fontWeight: selectedForm?.id === form.id ? 'bold' : 'normal',
                            justifyContent: 'flex-start',
                            px: 2
                          }}
                        >
                          {form.displayName.replace(pokemonData.displayName, '').trim() || form.displayName}
                        </Button>
                      ))}
                    </ButtonGroup>

                    {loadingForms && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <CircularProgress size={20} />
                      </Box>
                    )}
                  </Box>
                )}

                {/* Types */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                    Type
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {displayedPokemon.types.map((type) => (
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
                      {(displayedPokemon.height / 10).toFixed(1)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Weight
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {(displayedPokemon.weight / 10).toFixed(1)} kg
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Fade>
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

              {currentTab === 0 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Base Stats
                  </Typography>
                  
                  {displayedPokemon.stats.map((stat) => {
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

                  <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
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
                        {optimizedStats.total}
                      </Typography>
                    </Box>

                    <Box 
                      sx={{ 
                        mt: 3,
                        p: 2,
                        backgroundColor: 'rgba(36, 204, 159, 0.08)',
                        borderRadius: 2,
                        border: '1px solid rgba(36, 204, 159, 0.3)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: theme.palette.primary.main, 
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            Optimized Stats Total (OST)
                            <Tooltip 
                              title="Base Stats Total minus the lower offensive stat (Attack or Sp. Attack). Shows how efficiently stats are distributed without wasting points on unused attack type."
                              arrow
                              placement="top"
                            >
                              <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              display: 'block',
                              mt: 0.5
                            }}
                          >
                            Effective stat distribution for competitive play
                          </Typography>
                        </Box>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            color: theme.palette.primary.main,
                            fontWeight: 'bold'
                          }}
                        >
                          {optimizedStats.optimized}
                        </Typography>
                      </Box>

                      <Box 
                        sx={{ 
                          mt: 2,
                          pt: 2,
                          borderTop: '1px solid rgba(36, 204, 159, 0.2)'
                        }}
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                Base Stat Total (BST)
                              </Typography>
                              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                                {optimizedStats.total}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                Wasted Stats
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: '#f44336',
                                  fontWeight: 'bold'
                                }}
                              >
                                -{optimizedStats.wasted}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  display: 'block'
                                }}
                              >
                                ({optimizedStats.wastedStatName})
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Box sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box
                              sx={{
                                flex: optimizedStats.optimized,
                                height: 6,
                                backgroundColor: theme.palette.primary.main,
                                borderRadius: '4px 0 0 4px',
                                transition: 'all 0.3s ease'
                              }}
                            />
                            <Box
                              sx={{
                                flex: optimizedStats.wasted,
                                height: 6,
                                backgroundColor: '#f44336',
                                borderRadius: '0 4px 4px 0',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ color: theme.palette.primary.main }}>
                              Optimized: {((optimizedStats.optimized / optimizedStats.total) * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#f44336' }}>
                              Wasted: {((optimizedStats.wasted / optimizedStats.total) * 100).toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              )}

              {currentTab === 1 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Abilities
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {displayedPokemon.abilities.map((ability) => (
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
                              
                              {/* NEW: Info button with ability description tooltip */}
                              <Tooltip 
                                title={
                                  loadingAbilityDesc[ability.name] ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <CircularProgress size={16} sx={{ color: 'white' }} />
                                      <Typography variant="caption">Loading...</Typography>
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                                      {abilityDescriptions[ability.name] || 'Hover to see description'}
                                    </Typography>
                                  )
                                }
                                arrow
                                placement="top"
                                enterDelay={300}
                                leaveDelay={200}
                                PopperProps={{
                                  sx: {
                                    '& .MuiTooltip-tooltip': {
                                      backgroundColor: 'rgba(30, 30, 30, 0.95)',
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      fontSize: '0.875rem',
                                      maxWidth: 450,
                                      padding: 2
                                    },
                                    '& .MuiTooltip-arrow': {
                                      color: 'rgba(30, 30, 30, 0.95)',
                                      '&::before': {
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                      }
                                    }
                                  }
                                }}
                              >
                                <IconButton 
                                  size="small" 
                                  sx={{ 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    '&:hover': {
                                      color: theme.palette.primary.main,
                                      backgroundColor: 'rgba(36, 204, 159, 0.1)'
                                    },
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {loadingAbilityDesc[ability.name] ? (
                                    <CircularProgress size={18} sx={{ color: 'inherit' }} />
                                  ) : (
                                    <InfoOutlinedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
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
                            
                            {/* Show description inline if available (optional) */}
                            {abilityDescriptions[ability.name] && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  display: 'block',
                                  mt: 1,
                                  fontStyle: 'italic'
                                }}
                              >
                                {abilityDescriptions[ability.name].substring(0, 100)}
                                {abilityDescriptions[ability.name].length > 100 ? '...' : ''}
                              </Typography>
                            )}
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

        {/* SECCIÓN ELIMINADA: Ya no renderizamos la sección de "Alternate Forms & Regional Variants" aquí */}
      </Box>
    </Container>
  );
};

export default PokemonDetailPage;