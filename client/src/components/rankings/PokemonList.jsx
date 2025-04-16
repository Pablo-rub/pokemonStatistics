import React from 'react';
import { Box, Paper, Typography, IconButton, CircularProgress } from '@mui/material';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LastPageIcon from '@mui/icons-material/LastPage';
import PokemonSprite from '../PokemonSprite';

const PokemonList = ({
  data,
  isLoadingFormat,
  onPokemonSelect,
  selectedPokemon,
  page,
  itemsPerPage,
  totalItems,
  onPageChange,
  showUsagePercentage,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {isLoadingFormat ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {data.map((pokemon) => (
            <Paper
              key={pokemon.rank}
              onClick={() => onPokemonSelect(pokemon)}
              sx={{
                p: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                backgroundColor:
                  selectedPokemon?.name === pokemon.name ? 'rgba(255, 255, 255, 0.2)' : '#221FC7',
                '&:hover': {
                  backgroundColor:
                    selectedPokemon?.name === pokemon.name ? 'rgba(255, 255, 255, 0.2)' : '#1f24a0',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <PokemonSprite pokemon={{ name: pokemon.name }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ color: 'white' }}>{pokemon.name}</Typography>
                  {showUsagePercentage && (
                    <Typography variant="caption" sx={{ color: 'white' }}>
                      {pokemon.percentage}%
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'white' }}>
                  #{pokemon.rank}
                </Typography>
              </Box>
            </Paper>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 2 }}>
            <IconButton
              onClick={() => onPageChange(null, 1)}
              disabled={page === 1}
              sx={{ color: 'white' }}
            >
              <FirstPageIcon />
            </IconButton>
            <IconButton
              onClick={() => onPageChange(null, page - 1)}
              disabled={page === 1}
              sx={{ color: 'white' }}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <Typography sx={{ color: 'white', mx: 1, minWidth: '60px', textAlign: 'center' }}>
              {page}/{Math.ceil(totalItems / itemsPerPage)}
            </Typography>
            <IconButton
              onClick={() => onPageChange(null, page + 1)}
              disabled={page >= Math.ceil(totalItems / itemsPerPage)}
              sx={{ color: 'white' }}
            >
              <NavigateNextIcon />
            </IconButton>
            <IconButton
              onClick={() => onPageChange(null, Math.ceil(totalItems / itemsPerPage))}
              disabled={page >= Math.ceil(totalItems / itemsPerPage)}
              sx={{ color: 'white' }}
            >
              <LastPageIcon />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PokemonList;