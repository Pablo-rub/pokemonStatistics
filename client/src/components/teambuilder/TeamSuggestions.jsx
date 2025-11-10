import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShieldIcon from '@mui/icons-material/Shield';
import WarningIcon from '@mui/icons-material/Warning';
import PokemonSprite from '../PokemonSprite';

/**
 * Componente para mostrar sugerencias de Pokémon o equipos optimizados
 * Muestra análisis detallado, cobertura de tipos, y recomendaciones
 */
const TeamSuggestions = ({ 
  suggestions = [], 
  mode = 'suggest', // 'suggest' o 'optimize'
  loading = false 
}) => {
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

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2, textAlign: 'center' }}>
          Analyzing {mode === 'suggest' ? 'suggestions' : 'team combinations'}...
        </Typography>
        <LinearProgress sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </Box>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Alert severity="info">
        No suggestions available. {mode === 'suggest' ? 'Select some Pokémon to get started.' : 'Select at least 6 Pokémon to optimize.'}
      </Alert>
    );
  }

  // Modo: Sugerencias de Pokémon individuales (< 6)
  if (mode === 'suggest') {
    return (
      <Box>
        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
          <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          Suggested Pokémon
        </Typography>

        <Grid container spacing={2}>
          {suggestions.map((suggestion, index) => (
            <Grid item xs={12} key={index}>
              <Card 
                sx={{ 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)',
                  border: index === 0 ? '2px solid #24cc9f' : '1px solid rgba(255,255,255,0.1)'
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* Sprite */}
                    <Box sx={{ width: 80, height: 80, flexShrink: 0 }}>
                      <PokemonSprite 
                        pokemonName={suggestion.pokemon.name}
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {suggestion.pokemon.displayName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          #{suggestion.pokemon.id}
                        </Typography>
                        {index === 0 && (
                          <Chip 
                            label="Top Pick" 
                            size="small" 
                            color="primary" 
                            sx={{ ml: 'auto' }}
                          />
                        )}
                      </Box>

                      {/* Tipos */}
                      {suggestion.pokemon.types && (
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                          {suggestion.pokemon.types.map((typeObj) => (
                            <Chip
                              key={typeObj.name}
                              label={typeObj.name}
                              size="small"
                              sx={{
                                backgroundColor: getTypeColor(typeObj.name),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Score */}
                      <Typography variant="body2" sx={{ color: '#24cc9f', fontWeight: 'bold', mb: 1 }}>
                        Score: {suggestion.score}
                      </Typography>

                      {/* Razones */}
                      {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                        <List dense sx={{ py: 0 }}>
                          {suggestion.reasoning.map((reason, idx) => (
                            <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                              <ListItemText
                                primary={`• ${reason}`}
                                primaryTypographyProps={{
                                  variant: 'body2',
                                  sx: { color: 'rgba(255,255,255,0.8)' }
                                }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  // Modo: Equipos optimizados (≥ 6)
  return (
    <Box>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        <ShieldIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Optimized Team Combinations
      </Typography>

      {suggestions.map((teamData, teamIndex) => {
        const { team, score, coverage, analysis } = teamData;

        return (
          <Accordion 
            key={teamIndex}
            defaultExpanded={teamIndex === 0}
            sx={{ 
              mb: 2,
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              border: teamIndex === 0 ? '2px solid #24cc9f' : '1px solid rgba(255,255,255,0.1)',
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
              sx={{ 
                '& .MuiAccordionSummary-content': { 
                  alignItems: 'center' 
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                  Team #{teamIndex + 1}
                </Typography>
                {teamIndex === 0 && (
                  <Chip 
                    label="Best Option" 
                    size="small" 
                    color="primary"
                  />
                )}
                <Typography 
                  variant="body1" 
                  sx={{ 
                    color: '#24cc9f', 
                    fontWeight: 'bold',
                    ml: 'auto'
                  }}
                >
                  Score: {score}
                </Typography>
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              {/* Pokémon del equipo */}
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                Team Members:
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {team.map((pokemon, idx) => (
                  <Grid item xs={4} sm={2} key={idx}>
                    <Card sx={{ backgroundColor: 'rgba(50, 50, 50, 0.5)', textAlign: 'center', p: 1 }}>
                      <Box sx={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PokemonSprite 
                          pokemonName={pokemon.name}
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'white', display: 'block', mt: 0.5 }}>
                        {pokemon.displayName}
                      </Typography>
                      {pokemon.types && (
                        <Box sx={{ mt: 0.5, display: 'flex', gap: 0.25, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {pokemon.types.map((typeObj) => (
                            <Chip
                              key={typeObj.name}
                              label={typeObj.name}
                              size="small"
                              sx={{
                                backgroundColor: getTypeColor(typeObj.name),
                                color: 'white',
                                fontSize: '0.6rem',
                                height: 16,
                                '& .MuiChip-label': { px: 0.5 }
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />

              {/* Análisis del equipo */}
              {analysis && (
                <Box>
                  {/* Fortalezas */}
                  {analysis.strengths && analysis.strengths.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#24cc9f', mb: 1, fontWeight: 'bold' }}>
                        <TrendingUpIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                        Strengths:
                      </Typography>
                      <List dense>
                        {analysis.strengths.map((strength, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5, px: 2 }}>
                            <ListItemText
                              primary={`✓ ${strength}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { color: 'rgba(255,255,255,0.9)' }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Debilidades */}
                  {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#ff6b6b', mb: 1, fontWeight: 'bold' }}>
                        <WarningIcon sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
                        Weaknesses:
                      </Typography>
                      <List dense>
                        {analysis.weaknesses.map((weakness, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5, px: 2 }}>
                            <ListItemText
                              primary={`⚠ ${weakness}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { color: 'rgba(255,255,255,0.9)' }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Recomendaciones */}
                  {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: '#ffd93d', mb: 1, fontWeight: 'bold' }}>
                        💡 Recommendations:
                      </Typography>
                      <List dense>
                        {analysis.recommendations.map((rec, idx) => (
                          <ListItem key={idx} sx={{ py: 0.5, px: 2 }}>
                            <ListItemText
                              primary={`• ${rec}`}
                              primaryTypographyProps={{
                                variant: 'body2',
                                sx: { color: 'rgba(255,255,255,0.9)' }
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              )}

              {/* Cobertura de tipos */}
              {coverage && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                    Type Coverage:
                  </Typography>
                  
                  {/* Tipos presentes */}
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      Types: {coverage.types.length}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {coverage.types.map((type) => (
                        <Chip
                          key={type}
                          label={type}
                          size="small"
                          sx={{
                            backgroundColor: getTypeColor(type),
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.7rem'
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default TeamSuggestions;
