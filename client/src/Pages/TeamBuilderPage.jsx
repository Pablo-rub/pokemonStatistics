import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import GroupsIcon from '@mui/icons-material/Groups';
import axios from 'axios';
import PokemonSelector from '../components/teambuilder/PokemonSelector';
import TeamSuggestions from '../components/teambuilder/TeamSuggestions';
import PokemonSprite from '../components/PokemonSprite';
import { formatGameFormat } from '../utils/formatHelpers';

/**
 * Team Builder Page
 * Dos modos:
 * - < 6 Pokémon: Sugerir Pokémon para completar equipo
 * - ≥ 6 Pokémon: Optimizar y encontrar mejor combinación de 6
 */
const TeamBuilderPage = () => {
  const theme = useTheme();

  // Estados principales
  const [selectedFormat, setSelectedFormat] = useState('');
  const [formats, setFormats] = useState([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(true);

  const [availablePokemon, setAvailablePokemon] = useState([]);
  const [isLoadingPokemon, setIsLoadingPokemon] = useState(false);

  const [selectedPokemon, setSelectedPokemon] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // Determinar modo según cantidad de Pokémon
  const mode = selectedPokemon.length >= 6 ? 'optimize' : 'suggest';

  // Cargar formatos disponibles
  useEffect(() => {
    const fetchFormats = async () => {
      try {
        setIsLoadingFormats(true);
        const response = await axios.get('/api/games/formats');
        
        if (response.data && response.data.formats) {
          // Filtrar y ordenar formatos VGC 2025
          const vgcFormats = response.data.formats
            .filter(format => 
              format.toLowerCase().includes('vgc') && 
              format.toLowerCase().includes('2025')
            )
            .sort((a, b) => b.localeCompare(a));
          
          setFormats(vgcFormats);
          
          // Seleccionar el primer formato por defecto
          if (vgcFormats.length > 0) {
            setSelectedFormat(vgcFormats[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching formats:', err);
        setError('Failed to load formats. Please refresh the page.');
      } finally {
        setIsLoadingFormats(false);
      }
    };

    fetchFormats();
  }, []);

  // Cargar Pokémon disponibles cuando cambia el formato
  useEffect(() => {
    if (!selectedFormat) return;

    const fetchAvailablePokemon = async () => {
      try {
        setIsLoadingPokemon(true);
        setError(null);
        
        console.log('📡 Fetching available Pokémon for format:', selectedFormat);
        
        const response = await axios.get('/api/team-builder/available-pokemon', {
          params: { format: selectedFormat }
        });

        if (response.data && response.data.pokemon) {
          setAvailablePokemon(response.data.pokemon);
          console.log(`✅ Loaded ${response.data.pokemon.length} available Pokémon`);
        }
      } catch (err) {
        console.error('Error fetching available Pokémon:', err);
        setError('Failed to load available Pokémon for this format.');
      } finally {
        setIsLoadingPokemon(false);
      }
    };

    fetchAvailablePokemon();
  }, [selectedFormat]);

  // Manejar cambio de formato
  const handleFormatChange = (event) => {
    const newFormat = event.target.value;
    setSelectedFormat(newFormat);
    setSelectedPokemon([]); // Limpiar selección al cambiar formato
    setSuggestions([]);
    setActiveStep(0);
  };

  // Manejar selección de Pokémon
  const handleSelectionChange = (newSelection) => {
    setSelectedPokemon(newSelection);
    setSuggestions([]); // Limpiar sugerencias al cambiar selección
  };

  // Remover un Pokémon de la selección
  const handleRemovePokemon = (pokemonId) => {
    setSelectedPokemon(prev => prev.filter(p => p.id !== pokemonId));
    setSuggestions([]);
  };

  // Limpiar selección completa
  const handleClearSelection = () => {
    setSelectedPokemon([]);
    setSuggestions([]);
  };

  // Analizar equipo (sugerir o optimizar)
  const handleAnalyze = async () => {
    if (selectedPokemon.length === 0) {
      setError('Please select at least one Pokémon');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      setSuggestions([]);

      if (mode === 'suggest') {
        // Modo: Sugerir Pokémon para completar equipo
        console.log('💡 Requesting suggestions...');
        
        const response = await axios.post('/api/team-builder/suggest-pokemon', {
          team: selectedPokemon,
          format: selectedFormat,
          limit: 10
        });

        if (response.data && response.data.suggestions) {
          setSuggestions(response.data.suggestions);
          setActiveStep(2);
        }
      } else {
        // Modo: Optimizar combinación de 6
        console.log('🔍 Optimizing team combinations...');
        
        const response = await axios.post('/api/team-builder/optimize-team', {
          pokemon: selectedPokemon,
          format: selectedFormat,
          limit: 5
        });

        if (response.data && response.data.combinations) {
          setSuggestions(response.data.combinations);
          setActiveStep(2);
        }
      }
    } catch (err) {
      console.error('Error analyzing team:', err);
      setError(
        err.response?.data?.error || 
        'Failed to analyze team. Please try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const steps = ['Select Format', 'Choose Pokémon', 'View Results'];

  const getTypeColor = (typeName) => {
    const typeColors = {
      normal: '#A8A878', fire: '#F08030', water: '#6890F0',
      electric: '#F8D030', grass: '#78C850', ice: '#98D8D8',
      fighting: '#C03028', poison: '#A040A0', ground: '#E0C068',
      flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
      rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
      dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
    };
    return typeColors[typeName?.toLowerCase()] || '#777';
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white', 
              fontWeight: 'bold',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2
            }}
          >
            <GroupsIcon sx={{ fontSize: '2.5rem' }} />
            Team Builder
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Build and optimize your competitive Pokémon team
          </Typography>
        </Box>

        {/* Stepper */}
        <Paper 
          elevation={3}
          sx={{ 
            p: 3, 
            mb: 4, 
            backgroundColor: 'rgba(30, 30, 30, 0.9)' 
          }}
        >
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      color: 'rgba(255,255,255,0.3)',
                      '&.Mui-active': { color: theme.palette.primary.main },
                      '&.Mui-completed': { color: theme.palette.primary.main }
                    }
                  }}
                  sx={{
                    '& .MuiStepLabel-label': {
                      color: 'rgba(255,255,255,0.6)',
                      '&.Mui-active': { color: 'white' },
                      '&.Mui-completed': { color: 'white' }
                    }
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Panel izquierdo: Selección */}
          <Grid item xs={12} lg={8}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                minHeight: 400
              }}
            >
              {/* Selector de formato */}
              <Box sx={{ mb: 3 }}>
                <FormControl fullWidth>
                  <InputLabel 
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': { color: theme.palette.primary.main }
                    }}
                  >
                    Select Format / Regulation
                  </InputLabel>
                  <Select
                    value={selectedFormat}
                    onChange={handleFormatChange}
                    label="Select Format / Regulation"
                    disabled={isLoadingFormats}
                    sx={{
                      color: 'white',
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)'
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main
                      },
                      '.MuiSvgIcon-root': { color: 'white' }
                    }}
                  >
                    {formats.map((format) => (
                      <MenuItem key={format} value={format}>
                        {formatGameFormat(format)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

              {/* Selector de Pokémon */}
              {selectedFormat ? (
                <PokemonSelector
                  availablePokemon={availablePokemon}
                  selectedPokemon={selectedPokemon}
                  onSelectionChange={handleSelectionChange}
                  loading={isLoadingPokemon}
                  maxSelection={null} // Sin límite
                />
              ) : (
                <Alert severity="info">
                  Please select a format to see available Pokémon
                </Alert>
              )}
            </Paper>
          </Grid>

          {/* Panel derecho: Equipo actual y acciones */}
          <Grid item xs={12} lg={4}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                position: 'sticky',
                top: 20
              }}
            >
              <Typography variant="h6" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
                Current Team
              </Typography>

              {/* Info de modo */}
              <Alert 
                severity={mode === 'suggest' ? 'info' : 'success'}
                sx={{ mb: 2 }}
              >
                {mode === 'suggest' ? (
                  <>
                    <strong>Suggestion Mode</strong>
                    <br />
                    Select 1-5 Pokémon to get suggestions
                  </>
                ) : (
                  <>
                    <strong>Optimization Mode</strong>
                    <br />
                    Finding best combination of 6 from your selection
                  </>
                )}
              </Alert>

              {/* Counter */}
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                  {selectedPokemon.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Pokémon Selected
                </Typography>
              </Box>

              {/* Lista de Pokémon seleccionados */}
              {selectedPokemon.length > 0 ? (
                <Box sx={{ mb: 2, maxHeight: 400, overflowY: 'auto' }}>
                  {selectedPokemon.map((pokemon) => (
                    <Card 
                      key={pokemon.id}
                      sx={{ 
                        mb: 1, 
                        backgroundColor: 'rgba(50, 50, 50, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        p: 1
                      }}
                    >
                      <Box sx={{ width: 50, height: 50, mr: 1, flexShrink: 0 }}>
                        <PokemonSprite 
                          pokemonName={pokemon.name}
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {pokemon.displayName}
                        </Typography>
                        {pokemon.types && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {pokemon.types.map((typeObj) => (
                              <Chip
                                key={typeObj.name}
                                label={typeObj.name}
                                size="small"
                                sx={{
                                  backgroundColor: getTypeColor(typeObj.name),
                                  color: 'white',
                                  fontSize: '0.65rem',
                                  height: 18
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePokemon(pokemon.id)}
                        sx={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No Pokémon selected yet
                </Alert>
              )}

              {/* Botones de acción */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={isAnalyzing ? <CircularProgress size={20} /> : <AutoFixHighIcon />}
                  onClick={handleAnalyze}
                  disabled={selectedPokemon.length === 0 || isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing...' : mode === 'suggest' ? 'Get Suggestions' : 'Optimize Team'}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleClearSelection}
                  disabled={selectedPokemon.length === 0}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.5)',
                      backgroundColor: 'rgba(255,255,255,0.05)'
                    }
                  }}
                >
                  Clear Selection
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Resultados */}
        {suggestions.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                backgroundColor: 'rgba(30, 30, 30, 0.9)' 
              }}
            >
              <TeamSuggestions
                suggestions={suggestions}
                mode={mode}
                loading={isAnalyzing}
              />
            </Paper>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default TeamBuilderPage;
