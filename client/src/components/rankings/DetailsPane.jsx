import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import PokemonSprite from '../PokemonSprite';

const DetailsPane = ({
  isLoadingFormat,
  isLoadingDetails,
  selectedPokemon,
  pokemonDetails,
  rankingType,
  renderCategoryNavigation,
  renderCategoryContent,
  renderPokemonHistoricalUsage,
  categories,
  currentCategory,
  isVictoryDataLoading,
  victoryData,
}) => {
  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: '#221FC7',
        height: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Mantener hidden
        '& *': {
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          msOverflowStyle: 'none', // Fixed: kebab-case to camelCase
        },
      }}
    >
      {isLoadingFormat ? (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <CircularProgress />
        </Box>
      ) : isLoadingDetails ? (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <CircularProgress />
        </Box>
      ) : selectedPokemon && pokemonDetails ? (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Pokémon header with name, sprite and usage */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              pb: 2,
              mb: 2,
            }}
          >
            <PokemonSprite pokemon={{ name: selectedPokemon.name }} size={60} />
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" sx={{ color: 'white' }}>
                {selectedPokemon.name}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'white' }}>
                Rank #{selectedPokemon.rank} • {rankingType === 'usage' ? 'Usage' : 'Victories'}:{' '}
                {selectedPokemon.percentage}%
              </Typography>
            </Box>
          </Box>

          {/* Category navigation */}
          {renderCategoryNavigation && renderCategoryNavigation()}

          {/* Content area */}
          <Box
            sx={{
              flexGrow: 1,
              overflow: 'auto', // Allow scrolling
              mt: 1,
            }}
          >
            {rankingType === 'usage' ? (
              renderCategoryContent && renderCategoryContent()
            ) : categories[currentCategory].key === 'historicalUsage' ? (
              renderPokemonHistoricalUsage && renderPokemonHistoricalUsage()
            ) : isVictoryDataLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                }}
              >
                <CircularProgress />
              </Box>
            ) : victoryData && victoryData.length === 0 ? (
              <Typography sx={{ color: 'white', mt: 2 }}>
                No victory data available for {categories[currentCategory].name}.
              </Typography>
            ) : (
              victoryData.map((item, index) => {
                // Select the appropriate property based on category
                const label =
                  item.ability ||
                  item.move ||
                  item.item ||
                  item.tera_type ||
                  item.teammate ||
                  'N/A';
                return (
                  <Paper
                    key={index}
                    sx={{ p: 1, mb: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      {label}: {item.win_rate}% ({item.wins}/{item.total_games})
                    </Typography>
                  </Paper>
                );
              })
            )}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Typography sx={{ color: 'white' }}>Select a Pokémon to see details</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default DetailsPane;