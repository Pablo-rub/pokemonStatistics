import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Collapse,
  IconButton,
  Grid,
  LinearProgress,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';

/**
 * AlternateFormCard - Displays alternate forms of a Pokémon
 * 
 * @param {Object} form - Form data from PokeAPI
 * @param {Function} getTypeColor - Function to get type colors
 * @param {Function} getStatColor - Function to get stat colors
 * @param {Function} getStatBarValue - Function to calculate stat bar values
 */
const AlternateFormCard = ({ form, getTypeColor, getStatColor, getStatBarValue }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  // Determine form badge color based on type
  const getFormBadgeColor = (formType) => {
    const colors = {
      mega: 'rgba(147, 51, 234, 0.9)',
      primal: 'rgba(220, 38, 38, 0.9)',
      gigantamax: 'rgba(239, 68, 68, 0.9)',
      alola: 'rgba(59, 130, 246, 0.9)',
      galar: 'rgba(99, 102, 241, 0.9)',
      hisui: 'rgba(124, 58, 237, 0.9)',
      paldea: 'rgba(236, 72, 153, 0.9)',
      alternate: 'rgba(156, 163, 175, 0.9)'
    };
    return colors[formType] || colors.alternate;
  };

  const getFormLabel = (formType) => {
    const labels = {
      mega: 'MEGA',
      primal: 'PRIMAL',
      gigantamax: 'GMAX',
      alola: 'ALOLA',
      galar: 'GALAR',
      hisui: 'HISUI',
      paldea: 'PALDEA',
      alternate: 'ALT'
    };
    return labels[formType] || 'FORM';
  };

  const totalStats = form.stats.reduce((sum, stat) => sum + stat.baseStat, 0);

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(40, 40, 40, 0.95)',
        borderRadius: 2,
        border: `2px solid ${getFormBadgeColor(form.formType)}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${getFormBadgeColor(form.formType)}60`
        }
      }}
    >
      <Grid container>
        {/* Left side - Image */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              position: 'relative',
              paddingTop: '100%',
              backgroundColor: 'rgba(50, 50, 50, 0.3)'
            }}
          >
            {/* Form badge */}
            <Chip
              label={getFormLabel(form.formType)}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 10,
                backgroundColor: getFormBadgeColor(form.formType),
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem'
              }}
            />

            <CardMedia
              component="img"
              image={form.sprites.officialArtwork || form.sprites.default}
              alt={form.displayName}
              onLoad={() => setImageLoaded(true)}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: 2,
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
                filter: form.formType === 'mega' ? 'brightness(1.1) saturate(1.2)' : 'none'
              }}
            />
          </Box>
        </Grid>

        {/* Right side - Info */}
        <Grid item xs={12} md={8}>
          <CardContent>
            {/* Name and types */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 1 }}>
                {form.displayName}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                {form.types.map((type) => (
                  <Chip
                    key={type.slot}
                    label={type.name}
                    size="small"
                    sx={{
                      backgroundColor: getTypeColor(type.name),
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                ))}
              </Box>

              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Base Stat Total: <strong style={{ color: theme.palette.primary.main }}>{totalStats}</strong>
              </Typography>
            </Box>

            {/* Expand button */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                {expanded ? 'Hide details' : 'Show details'}
              </Typography>
              <IconButton
                onClick={handleExpandClick}
                sx={{
                  color: 'white',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>

            {/* Collapsible content */}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <Box sx={{ mt: 2 }}>
                {/* Stats */}
                <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, fontWeight: 'bold' }}>
                  Base Stats
                </Typography>
                {form.stats.map((stat) => {
                  const statName = stat.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  
                  return (
                    <Box key={stat.name} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'white' }}>
                          {statName}
                        </Typography>
                        <Typography 
                          variant="caption" 
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
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getStatColor(stat.baseStat),
                            borderRadius: 3
                          }
                        }}
                      />
                    </Box>
                  );
                })}

                {/* Abilities */}
                <Typography variant="subtitle2" sx={{ color: 'white', mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Abilities
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {form.abilities.map((ability, idx) => (
                    <Tooltip 
                      key={idx} 
                      title={ability.isHidden ? 'Hidden Ability' : 'Normal Ability'}
                      arrow
                    >
                      <Chip
                        label={ability.name}
                        size="small"
                        sx={{
                          backgroundColor: ability.isHidden 
                            ? theme.palette.primary.main 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          fontSize: '0.7rem'
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>

                {/* Height and Weight */}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Height
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {(form.height / 10).toFixed(1)} m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Weight
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {(form.weight / 10).toFixed(1)} kg
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  );
};

export default AlternateFormCard;