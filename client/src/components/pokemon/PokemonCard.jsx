import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PokemonCard = ({ pokemon }) => {
  const navigate = useNavigate();

  // Función para obtener color del tipo
  const getTypeColor = (typeName) => {
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
    return typeColors[typeName?.toLowerCase()] || '#777';
  };

  // CORRECCIÓN: Asegurar que siempre tenemos un identificador válido
  const handleClick = () => {
    // Prioridad: usar ID si existe, sino usar name
    const identifier = pokemon?.id || pokemon?.name;
    
    if (!identifier) {
      console.error('Pokemon card clicked but no ID or name available:', pokemon);
      return;
    }
    
    console.log('Navigating to pokemon:', identifier);
    navigate(`/pokemon/${identifier}`);
  };

  // Validación: asegurar que pokemon existe
  if (!pokemon) {
    console.error('PokemonCard rendered with undefined pokemon');
    return null;
  }

  const displayName = pokemon.displayName || pokemon.name || 'Unknown';
  const pokemonId = pokemon.id || 0;
  const types = pokemon.types || [];
  const image = pokemon.officialArtwork || pokemon.sprite || '/placeholder-pokemon.png';

  return (
    <Card
      onClick={handleClick}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(36, 204, 159, 0.3)',
          backgroundColor: 'rgba(40, 40, 40, 0.95)'
        }
      }}
    >
      {/* Imagen del Pokémon */}
      <Box
        sx={{
          position: 'relative',
          paddingTop: '100%', // Aspect ratio 1:1
          backgroundColor: 'rgba(20, 20, 20, 0.5)',
          overflow: 'hidden'
        }}
      >
        <CardMedia
          component="img"
          image={image}
          alt={displayName}
          onError={(e) => {
            e.target.src = '/placeholder-pokemon.png';
          }}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: 2
          }}
        />
      </Box>

      {/* Información del Pokémon */}
      <CardContent sx={{ flexGrow: 1, pt: 2 }}>
        {/* ID */}
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 'bold',
            display: 'block',
            mb: 0.5
          }}
        >
          #{String(pokemonId).padStart(4, '0')}
        </Typography>

        {/* Nombre */}
        <Typography
          variant="h6"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            mb: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayName}
        </Typography>

        {/* Tipos */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {types.map((typeObj, index) => {
            const typeName = typeObj.name || typeObj.type?.name || 'Unknown';
            return (
              <Chip
                key={index}
                label={typeName.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: getTypeColor(typeName),
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  height: '20px'
                }}
              />
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PokemonCard;