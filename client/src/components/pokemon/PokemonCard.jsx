import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Skeleton,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

/**
 * PokemonCard - Reusable component to display a Pokémon card
 * 
 * @param {Object} pokemon - Pokémon data
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

        <CardContent sx={{ flexGrow: 1, textAlign: 'center', py: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              display: 'block',
              mb: 0.5
            }}
          >
            #{pokemon.id.toString().padStart(4, '0')}
          </Typography>
          
          <Typography
            variant="body2"
            sx={{
              color: 'white',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {pokemon.displayName}
          </Typography>
        </CardContent>
      </Card>
    </Tooltip>
  );
};

export default PokemonCard;