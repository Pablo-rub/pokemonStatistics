import React, { useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Button, ButtonGroup, Chip } from '@mui/material';
import PokemonSprite from '../PokemonSprite';
import MultiLineChart from './MultiLineChart';
import RemoveIcon from '@mui/icons-material/Remove';
import SortIcon from '@mui/icons-material/Sort';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

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
  calculateVictoryMonthlyChange,
}) => {
  // Add state for sorting
  const [sortBy, setSortBy] = useState('win_rate'); // Default sort by win rate
  const [sortDirection, setSortDirection] = useState('desc'); // Default sort direction is descending

  // Function to handle sort button clicks
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      setSortBy(field);
      setSortDirection(field === 'label' ? 'asc' : 'desc');
    }
  };

  // Function to get appropriate label for stats based on category
  const getCategoryStatsLabel = (categoryKey) => {
    switch (categoryKey) {
      case 'moves':
        return 'move usages';
      case 'abilities':
        return 'total games';
      case 'items':
        return 'item usages';
      case 'teraTypes':
        return 'tera activations';
      case 'teammates':
        return 'team compositions';
      default:
        return 'total games';
    }
  };

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
              <Typography component="h2" variant="h5" sx={{ color: 'white' }}>
                {selectedPokemon.name}
              </Typography>
              {rankingType === 'usage' && (
                <Typography component="p" variant="subtitle1" sx={{ color: 'white' }}>
                  Rank #{selectedPokemon.rank} • Usage: {selectedPokemon.percentage}%
                </Typography>
              )}
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
              categories[currentCategory].key === 'historicalUsage' ||
              categories[currentCategory].key === 'historicalWinrate' ? (
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
                  <Typography component="h3" variant="h6" sx={{ color: 'white', mb: 2 }}>
                    {categories[currentCategory].name} Win Rates ({victoryData.length})
                  </Typography>

                  {/* Agregar el MultiLineChart para datos de victoria */}
                  {victoryData.length > 0 && (
                    <Box sx={{ height: 350, mb: 4 }}>
                      <Typography component="h4" variant="subtitle1" sx={{ color: 'white', mb: 1 }}>
                        Win Rate Trends
                      </Typography>
                      <MultiLineChart
                        chartData={prepareVictoryTimelineData(victoryData)}
                        elements={getUniqueElements(victoryData)}
                      />
                    </Box>
                  )}

                  {/* Lista de elementos con sus tasas de victoria con barras horizontales - AHORA FILTRADA Y ORDENADA */}
                  {(() => {
                    // Identify which property we're categorizing by
                    const elementKey =
                      categories[currentCategory].key === 'teraTypes'
                        ? 'tera_type'
                        : categories[currentCategory].key === 'abilities'
                        ? 'ability'
                        : categories[currentCategory].key === 'moves'
                        ? 'move'
                        : categories[currentCategory].key === 'items'
                        ? 'item'
                        : 'teammate';

                    // Find the latest month in the dataset
                    let latestMonth = '';
                    for (const item of victoryData) {
                      if (item.month && item.month > latestMonth) {
                        latestMonth = item.month;
                      }
                    }

                    // Filter for items from the latest month, or use all if month data is missing
                    const relevantData = latestMonth
                      ? victoryData.filter((item) => item.month === latestMonth)
                      : victoryData;

                    // Aggregate data by element name
                    const aggregatedData = {};
                    let totalWins = 0;
                    let totalGames = 0;

                    relevantData.forEach((item) => {
                      const key = item[elementKey];
                      if (key) {
                        if (!aggregatedData[key]) {
                          aggregatedData[key] = {
                            [elementKey]: key,
                            wins: 0,
                            total_games: 0,
                            month: latestMonth,
                          };
                        }
                        // Add wins and total games to the aggregate
                        aggregatedData[key].wins += item.wins || 0;
                        aggregatedData[key].total_games += item.total_games || 0;
                        // Track totals for the summary header
                        totalWins += item.wins || 0;
                        totalGames += item.total_games || 0;
                      }
                    });

                    // Calculate win rates and convert to array
                    const aggregatedArray = Object.values(aggregatedData).map((item) => ({
                      ...item,
                      win_rate: item.total_games > 0 ? (item.wins / item.total_games) * 100 : 0,
                    }));

                    // Format the month for display
                    let displayMonth = latestMonth;
                    if (latestMonth) {
                      const [year, month] = latestMonth.split('-');
                      const monthNames = [
                        'January',
                        'February',
                        'March',
                        'April',
                        'May',
                        'June',
                        'July',
                        'August',
                        'September',
                        'October',
                        'November',
                        'December',
                      ];
                      displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;
                    }

                    return (
                      <>
                        {/* Global stats header showing total stats for last month */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            p: 1.5,
                            borderRadius: 1,
                            mb: 1,
                          }}
                        >
                          <Typography component="p" variant="subtitle2" sx={{ color: 'white' }}>
                            Stats of last month:
                          </Typography>
                          <Typography component="p" variant="subtitle2" sx={{ color: 'white' }}>
                            {totalWins} / {totalGames}{' '}
                            {getCategoryStatsLabel(categories[currentCategory].key)} ({displayMonth})
                          </Typography>
                        </Box>

                        {/* Sorting controls */}
                        <Box sx={{ mb: 2, mt: 1, display: 'flex', justifyContent: 'center' }}>
                          <ButtonGroup size="small" variant="outlined" sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                            <Button 
                              onClick={() => handleSort('label')}
                              startIcon={sortBy === 'label' ? (sortDirection === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />) : <SortIcon />}
                              sx={{ 
                                color: sortBy === 'label' ? '#24CC9F' : 'white',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                              }}
                            >
                              Name
                            </Button>
                            <Button 
                              onClick={() => handleSort('total_games')}
                              startIcon={sortBy === 'total_games' ? (sortDirection === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />) : <SortIcon />}
                              sx={{ 
                                color: sortBy === 'total_games' ? '#24CC9F' : 'white',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                              }}
                            >
                              Games
                            </Button>
                            <Button 
                              onClick={() => handleSort('win_rate')}
                              startIcon={sortBy === 'win_rate' ? (sortDirection === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />) : <SortIcon />}
                              sx={{ 
                                color: sortBy === 'win_rate' ? '#24CC9F' : 'white',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                              }}
                            >
                              Win %
                            </Button>
                            <Button 
                              onClick={() => handleSort('change')}
                              startIcon={sortBy === 'change' ? (sortDirection === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />) : <SortIcon />}
                              sx={{ 
                                color: sortBy === 'change' ? '#24CC9F' : 'white',
                                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                              }}
                            >
                              Change
                            </Button>
                          </ButtonGroup>
                        </Box>

                        {/* Render the sorted items */}
                        {aggregatedArray
                          .sort((a, b) => {
                            // Get appropriate values based on sort field
                            const valueA = sortBy === 'label' ? a[elementKey] : 
                                          sortBy === 'total_games' ? a.total_games : 
                                          sortBy === 'win_rate' ? a.win_rate : 
                                          sortBy === 'change' ? (calculateVictoryMonthlyChange && 
                                                               calculateVictoryMonthlyChange(victoryData, a[elementKey])?.change) : 0;
                            
                            const valueB = sortBy === 'label' ? b[elementKey] : 
                                          sortBy === 'total_games' ? b.total_games : 
                                          sortBy === 'win_rate' ? b.win_rate : 
                                          sortBy === 'change' ? (calculateVictoryMonthlyChange && 
                                                               calculateVictoryMonthlyChange(victoryData, b[elementKey])?.change) : 0;
                            
                            // Apply sort direction
                            if (sortBy === 'label') {
                              // String comparison for labels
                              return sortDirection === 'asc' 
                                ? String(valueA).localeCompare(String(valueB))
                                : String(valueB).localeCompare(String(valueA));
                            } else {
                              // Numeric comparison for everything else
                              return sortDirection === 'asc' 
                                ? valueA - valueB 
                                : valueB - valueA;
                            }
                          })
                          .map((item, index) => {
                            // Get appropriate label
                            const label = item[elementKey] || 'N/A';

                            // Calculate month-over-month change
                            const monthlyChange =
                              calculateVictoryMonthlyChange &&
                              calculateVictoryMonthlyChange(victoryData, label);

                            return (
                              <Box key={index} sx={{ mb: 2 }}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: 'white',
                                      maxWidth: '60%',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {label}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {/* WIN RATE con fondo para mejorar contraste */}
                                    <Chip
                                      size="small"
                                      label={`${item.win_rate.toFixed(2)}%`}
                                      sx={{
                                        backgroundColor: 'rgba(255,255,255,0.15)',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        height: 20,
                                        '& .MuiChip-label': {
                                          px: 0.5,
                                        },
                                        mr: 1,
                                      }}
                                    />
                                    {/* Badge de cambio mensual (ya existente) */}
                                    {monthlyChange && (
                                      <Chip
                                        size="small"
                                        label={`${monthlyChange.change}%`}
                                        icon={
                                          monthlyChange.isPositive ? (
                                            <ArrowDropUpIcon fontSize="small" />
                                          ) : monthlyChange.isNeutral ? (
                                            <RemoveIcon fontSize="small" />
                                          ) : (
                                            <ArrowDropDownIcon fontSize="small" />
                                          )
                                        }
                                        sx={{
                                          backgroundColor: 'rgba(255,255,255,0.15)',
                                          color: monthlyChange.isPositive
                                            ? '#4CAF50'
                                            : monthlyChange.isNeutral
                                            ? '#FFC107'
                                            : '#F44336',
                                          '& .MuiChip-icon': {
                                            color: monthlyChange.isPositive
                                              ? '#4CAF50'
                                              : monthlyChange.isNeutral
                                              ? '#FFC107'
                                              : '#F44336',
                                          },
                                          fontSize: '0.75rem',
                                          height: 20,
                                          '& .MuiChip-label': { px: 0.5 },
                                        }}
                                      />
                                    )}
                                  </Box>
                                </Box>

                                <Box
                                  sx={{
                                    width: '100%',
                                    height: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${Math.min(item.win_rate, 100)}%`,
                                      height: '100%',
                                      backgroundColor: '#FF6384',
                                      borderRadius: '4px',
                                    }}
                                  />
                                </Box>
                              </Box>
                            );
                          })}
                      </>
                    );
                  })()}
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