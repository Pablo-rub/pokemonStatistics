import React from 'react';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import PokemonSprite from '../PokemonSprite';
import MultiLineChart from './MultiLineChart';

const DetailsPane = ({
  isLoadingFormat,
  isLoadingDetails,
  selectedPokemon,
  pokemonDetails,
  rankingType,
  renderCategoryNavigation,
  renderCategoryContent,
  renderPokemonHistoricalUsage,
  renderPokemonHistoricalVictory,
  categories,
  currentCategory,
  isVictoryDataLoading,
  victoryData,
  prepareVictoryTimelineData,
  getUniqueElements,
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
          msOverflowStyle: 'none',
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
              // For usage ranking
              categories[currentCategory].key === 'historicalUsage' ? (
                renderPokemonHistoricalUsage && renderPokemonHistoricalUsage()
              ) : (
                renderCategoryContent && renderCategoryContent()
              )
            ) : (
              // For victories ranking
              categories[currentCategory].key === 'historicalUsage' || categories[currentCategory].key === 'historicalWinrate' ? (
                renderPokemonHistoricalVictory && renderPokemonHistoricalVictory()
              ) : isVictoryDataLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                  }}
                >
                  <CircularProgress sx={{ color: 'white' }} size={50} />
                </Box>
              ) : victoryData && victoryData.length === 0 ? (
                <Typography sx={{ color: 'white', mt: 2 }}>
                  No victory data available for {categories[currentCategory].name}.
                </Typography>
              ) : (
                <Box sx={{ height: '100%', overflow: 'auto', pr: 1 }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {categories[currentCategory].name} Win Rates ({victoryData.length})
                  </Typography>
                  
                  {/* Agregar el MultiLineChart para datos de victoria */}
                  {victoryData.length > 0 && (
                    <Box sx={{ height: 350, mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                        Win Rate Trends
                      </Typography>
                      <MultiLineChart 
                        chartData={prepareVictoryTimelineData(victoryData)} 
                        elements={getUniqueElements(victoryData)}
                      />
                    </Box>
                  )}
                  
                  {/* Lista de elementos con sus tasas de victoria */}
                  {victoryData.map((item, index) => {
                    // Select the appropriate property based on category
                    const label =
                      item.ability ||
                      item.move ||
                      item.item ||
                      item.tera_type ||
                      item.teammate ||
                      'N/A';
                    
                    // Format the month from "YYYY-MM" to a more readable format
                    const formattedDate = item.month 
                      ? (() => {
                          const [year, monthNum] = item.month.split('-');
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                            'July', 'August', 'September', 'October', 'November', 'December'];
                          const monthName = monthNames[parseInt(monthNum) - 1];
                          return `${monthName} ${year}`;
                        })()
                      : '';
                      
                    return (
                      <Paper
                        key={index}
                        sx={{ p: 1, mb: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          {label}: {item.win_rate}% ({item.wins}/{item.total_games})
                        </Typography>
                        {formattedDate && (
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              display: 'block', 
                              color: 'rgba(255,255,255,0.7)',
                              mt: 0.5 
                            }}
                          >
                            {formattedDate}
                          </Typography>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              )
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