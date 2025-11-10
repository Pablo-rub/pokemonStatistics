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
  Fade,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ShieldIcon from '@mui/icons-material/Shield';
import GavelIcon from '@mui/icons-material/Gavel';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import SEO from '../components/SEO';
import {
  calculateDefensiveMatchups,
  calculateOffensiveMatchups,
  getTypeColor,
  getEffectivenessInfo
} from '../utils/typeMatchups';

const PokemonDetailPage = () => {
  const { nameOrId } = useParams();
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
  const [abilityDescriptions, setAbilityDescriptions] = useState({});
  const [loadingAbilityDesc, setLoadingAbilityDesc] = useState({});

  useEffect(() => {
    fetchPokemonDetails();
  }, [nameOrId]);

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

  useEffect(() => {
    if (displayedPokemon?.abilities) {
      fetchAbilityDescriptions(displayedPokemon.abilities);
    }
  }, [displayedPokemon]);

  const fetchPokemonDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔄 Fetching details for: ${nameOrId}`);
      const response = await axios.get(`/api/pokemon/${nameOrId}`);
      
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      console.log('✅ Pokemon data received:', response.data);
      setPokemonData(response.data);
    } catch (err) {
      console.error('❌ Error fetching Pokémon details:', err);
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

  const fetchAbilityDescriptions = async (abilities) => {
    for (const ability of abilities) {
      if (abilityDescriptions[ability.name]) {
        continue;
      }

      const abilitySlug = ability.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

      setLoadingAbilityDesc(prev => ({ ...prev, [ability.name]: true }));

      try {
        const response = await axios.get(`https://pokeapi.co/api/v2/ability/${abilitySlug}`);
        
        const englishEntry = response.data.effect_entries.find(
          entry => entry.language.name === 'en'
        );

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
    if (!stats || !Array.isArray(stats)) {
      return { total: 0, optimized: 0, wasted: 0, wastedStatName: 'N/A' };
    }

    const hp = stats.find(s => s.name === 'hp')?.baseStat || 0;
    const attack = stats.find(s => s.name === 'attack')?.baseStat || 0;
    const defense = stats.find(s => s.name === 'defense')?.baseStat || 0;
    const spAttack = stats.find(s => s.name === 'special-attack')?.baseStat || 0;
    const spDefense = stats.find(s => s.name === 'special-defense')?.baseStat || 0;
    const speed = stats.find(s => s.name === 'speed')?.baseStat || 0;

    const total = hp + attack + defense + spAttack + spDefense + speed;
    
    const wastedStat = attack < spAttack ? attack : spAttack;
    const wastedStatName = attack < spAttack ? 'Attack' : 'Sp. Attack';
    const optimized = total - wastedStat;

    return { total, optimized, wasted: wastedStat, wastedStatName };
  };

  const renderMatchupCategory = (category, types, effectivenessInfo) => {
    if (!types || types.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          mb: 1.5,
          pb: 1,
          borderBottom: `2px solid ${effectivenessInfo.color}`
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: effectivenessInfo.color,
              fontWeight: 'bold'
            }}
          >
            {effectivenessInfo.label}
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            ({types.length} {types.length === 1 ? 'type' : 'types'})
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1
        }}>
          {types.sort().map((type) => (
            <Chip
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              sx={{
                backgroundColor: getTypeColor(type),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                px: 1.5,
                py: 0.5,
                height: 'auto',
                '& .MuiChip-label': {
                  padding: '6px 0'
                }
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <SEO 
          title="Loading Pokémon Details..."
          description="Loading detailed competitive stats, abilities, moves, and type matchups for this Pokémon."
          keywords="pokemon stats, pokemon details, vgc analysis"
        />
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
        <SEO 
          title="Error Loading Pokémon"
          description="Unable to load Pokémon details. Please try again."
          keywords="pokemon, error"
        />
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

  if (!pokemonData || !displayedPokemon) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <IconButton onClick={handleBackToList} sx={{ color: 'white', mb: 2 }}>
            <ArrowBackIcon /> Back to list
          </IconButton>
          
          <Alert severity="warning">
            No Pokémon data available
          </Alert>
        </Box>
      </Container>
    );
  }

  const optimizedStats = calculateOptimizedTotal(displayedPokemon.stats || []);
  
  const pokemonTypes = (displayedPokemon.types || []).map(t => t.name?.toLowerCase() || 'unknown');
  const defensiveMatchups = calculateDefensiveMatchups(pokemonTypes);
  const offensiveMatchups = calculateOffensiveMatchups(pokemonTypes);

  // SEO dinámico basado en el Pokémon
  const pokemonName = displayedPokemon?.displayName || displayedPokemon?.name || 'Unknown Pokémon';
  const pokemonTypesStr = (displayedPokemon?.types || []).map(t => t.name).join('/');
  const totalStats = optimizedStats.total;
  const seoTitle = selectedForm 
    ? `${pokemonName} ${selectedForm.formType} - Stats & Analysis`
    : `${pokemonName} - Stats & Competitive Analysis`;
  
  const seoDescription = `Complete competitive analysis for ${pokemonName}${pokemonTypesStr ? ` (${pokemonTypesStr} type)` : ''}. Base stats total: ${totalStats}, OST: ${optimizedStats.optimized}. View abilities, type matchups, and optimal builds for VGC battles.`;
  
  const seoKeywords = `${pokemonName}, pokemon stats, ${pokemonTypesStr}, ${(displayedPokemon?.abilities || []).map(a => a.name).join(', ')}, vgc ${pokemonName}, competitive ${pokemonName}, pokemon analysis`;

  return (
    <Container maxWidth="xl">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        image={displayedPokemon?.sprites?.officialArtwork || displayedPokemon?.officialArtwork}
      />
      <Box sx={{ py: 4 }}>
        {/* Header */}
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
            {displayedPokemon?.displayName || 'Unknown'}
          </Typography>
          
          <Typography variant="h5" sx={{ color: theme.palette.primary.main, ml: 1 }}>
            #{(displayedPokemon?.id || 0).toString().padStart(4, '0')}
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
                  src={
                    displayedPokemon?.sprites?.officialArtwork || 
                    displayedPokemon?.officialArtwork || 
                    displayedPokemon?.sprite || 
                    '/placeholder-pokemon.png'
                  }
                  alt={displayedPokemon?.displayName || 'Pokemon'}
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
                    e.target.src = '/placeholder-pokemon.png';
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
                          {form.displayName?.replace(pokemonData.displayName, '').trim() || form.displayName}
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
                    {(displayedPokemon?.types || []).map((type) => (
                      <Chip
                        key={type.slot}
                        label={type.name || 'Unknown'}
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

                {/* Height & Weight */}
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Height
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {((displayedPokemon?.height || 0) / 10).toFixed(1)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Weight
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'white' }}>
                      {((displayedPokemon?.weight || 0) / 10).toFixed(1)} kg
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Fade>
          </Grid>

          {/* Right Column - Tabs */}
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
                <Tab label="Type Matchups" />
              </Tabs>

              {currentTab === 0 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Base Stats
                  </Typography>
                  
                  {(displayedPokemon?.stats || []).map((stat) => (
                    <Box key={stat.name} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ color: 'white', fontWeight: 500 }}>
                          {stat.name
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
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
                  ))}

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
                    {(displayedPokemon?.abilities || []).map((ability) => (
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

              {currentTab === 2 && (
                <Box>
                  <Typography variant="h5" sx={{ color: 'white', mb: 3, fontWeight: 'bold' }}>
                    Type Matchups
                  </Typography>

                  {/* Defensive Matchups */}
                  <Card
                    sx={{
                      backgroundColor: 'rgba(50, 50, 50, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      mb: 3
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <ShieldIcon sx={{ color: theme.palette.primary.main }} />
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          Defensive (Taking Damage)
                        </Typography>
                        <Tooltip 
                          title="How much damage this Pokémon takes from each attacking type"
                          arrow
                        >
                          <IconButton size="small">
                            <InfoOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.6)',
                          display: 'block',
                          mb: 2
                        }}
                      >
                        Damage multipliers when hit by attacks of these types
                      </Typography>

                      <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                      {renderMatchupCategory(
                        'immune',
                        defensiveMatchups.immune,
                        getEffectivenessInfo('immune')
                      )}

                      {renderMatchupCategory(
                        'quarter',
                        defensiveMatchups.quarter,
                        getEffectivenessInfo('quarter')
                      )}

                      {renderMatchupCategory(
                        'half',
                        defensiveMatchups.half,
                        getEffectivenessInfo('half')
                      )}

                      {renderMatchupCategory(
                        'neutral',
                        defensiveMatchups.neutral,
                        getEffectivenessInfo('neutral')
                      )}

                      {renderMatchupCategory(
                        'double',
                        defensiveMatchups.double,
                        getEffectivenessInfo('double')
                      )}

                      {renderMatchupCategory(
                        'quadruple',
                        defensiveMatchups.quadruple,
                        getEffectivenessInfo('quadruple')
                      )}
                    </CardContent>
                  </Card>

                  {/* Offensive Matchups */}
                  {(displayedPokemon?.types || []).map((type, index) => {
                    const typeMatchups = offensiveMatchups[type.name];
                    if (!typeMatchups) return null;

                    return (
                      <Card
                        key={index}
                        sx={{
                          backgroundColor: 'rgba(50, 50, 50, 0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          mb: index < displayedPokemon.types.length - 1 ? 3 : 0
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <GavelIcon sx={{ color: getTypeColor(type.name) }} />
                            <Chip
                              label={type.name}
                              sx={{
                                backgroundColor: getTypeColor(type.name),
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.875rem'
                              }}
                            />
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                              Type Offensive
                            </Typography>
                            <Tooltip 
                              title={`How effective ${type.name}-type attacks are against each defending type`}
                              arrow
                            >
                              <IconButton size="small">
                                <InfoOutlinedIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              display: 'block',
                              mb: 2
                            }}
                          >
                            Damage multipliers when attacking Pokémon of these types
                          </Typography>

                          <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                          {renderMatchupCategory(
                            'immune',
                            typeMatchups.immune,
                            getEffectivenessInfo('immune')
                          )}

                          {renderMatchupCategory(
                            'quarter',
                            typeMatchups.quarter,
                            getEffectivenessInfo('quarter')
                          )}

                          {renderMatchupCategory(
                            'half',
                            typeMatchups.half,
                            getEffectivenessInfo('half')
                          )}

                          {renderMatchupCategory(
                            'neutral',
                            typeMatchups.neutral,
                            getEffectivenessInfo('neutral')
                          )}

                          {renderMatchupCategory(
                            'double',
                            typeMatchups.double,
                            getEffectivenessInfo('double')
                          )}

                          {renderMatchupCategory(
                            'quadruple',
                            typeMatchups.quadruple,
                            getEffectivenessInfo('quadruple')
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
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