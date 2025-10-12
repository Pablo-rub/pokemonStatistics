import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Skeleton,
  Tooltip,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getTypeColor } from '../../utils/pokemonTypes';

/**
 * PokemonCard - Reusable component to display a Pokémon card with types
 * 
 * @param {Object} pokemon - Pokémon data (must include types array)
 * @param {Function} onClick - Optional click handler
 */
const PokemonCard = ({ pokemon, onClick }) => {
  const theme = useTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <Tooltip title={`#${pokemon.id} - ${pokemon.displayName}`} arrow>
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(30, 30, 30, 0.9)',
          borderRadius: 2,
          transition: 'all 0.3s ease',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': onClick ? {
            transform: 'translateY(-8px)',
            boxShadow: `0 8px 24px ${theme.palette.primary.main}40`,
            backgroundColor: 'rgba(40, 40, 40, 0.95)'
          } : {},
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        {/* Image Section */}
        <Box
          sx={{
            position: 'relative',
            paddingTop: '100%',
            backgroundColor: 'rgba(50, 50, 50, 0.3)',
            overflow: 'hidden'
          }}
        >
          {!imageLoaded && !imageError && (
            <Skeleton
              variant="rectangular"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
            />
          )}
          
          {!imageError ? (
            <CardMedia
              component="img"
              image={pokemon.officialArtwork || pokemon.sprite}
              alt={pokemon.displayName}
              onLoad={handleImageLoad}
              onError={handleImageError}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: 2,
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }}
            />
          ) : (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.5)'
              }}
            >
              <Typography variant="h6">?</Typography>
            </Box>
          )}
        </Box>

        {/* Content Section */}
        <CardContent 
          sx={{ 
            flexGrow: 1, 
            textAlign: 'center', 
            py: 1.5,
            px: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}
        >
          {/* Pokémon ID */}
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              display: 'block'
            }}
          >
            #{pokemon.id.toString().padStart(4, '0')}
          </Typography>
          
          {/* Pokémon Name */}
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mb: 0.5
            }}
          >
            {pokemon.displayName}
          </Typography>

          {/* Type Badges */}
          {pokemon.types && pokemon.types.length > 0 && (
            <Box 
              sx={{ 
                display: 'flex', 
                gap: 0.5, 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              {pokemon.types
                .sort((a, b) => a.slot - b.slot)
                .map((type) => {
                  const typeName = typeof type === 'string' ? type : type.name;
                  return (
                    <Chip
                      key={typeName}
                      label={typeName}
                      size="small"
                      sx={{
                        backgroundColor: getTypeColor(typeName),
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.65rem',
                        height: 20,
                        '& .MuiChip-label': {
                          px: 1,
                          py: 0
                        }
                      }}
                    />
                  );
                })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Tooltip>
  );
};

export default PokemonCard;