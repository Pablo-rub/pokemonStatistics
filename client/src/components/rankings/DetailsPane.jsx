import React, { useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Button, ButtonGroup, Chip, Tooltip } from '@mui/material';
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
                    // Normalize label extraction so teammates (and other types) don't become undefined
                    const getLabelFromItem = (item) => {
                      const key = categories[currentCategory].key;
                  
                      if (key === 'teraTypes') {
                        return item.tera_type || item.tera || item.label || item.name || '';
                      }
                      if (key === 'abilities') {
                        return item.ability || item.label || item.name || '';
                      }
                      if (key === 'moves') {
                        return item.move || item.label || item.name || '';
                      }
                      if (key === 'items') {
                        return item.item || item.label || item.name || '';
                      }
                      // teammates can be a string, array or object
                      if (key === 'teammates') {
                        const t = item.teammate || item.teammate_name || item.name || item.label || item.teammates;
                        if (Array.isArray(t)) return t.join(';');
                        if (typeof t === 'object' && t !== null) return t.name || JSON.stringify(t);
                        return String(t || '');
                      }
                  
                      // fallback
                      return item.label || item.name || '';
                    };
                  
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
                  
                    // Aggregate data by the normalized label
                    const aggregatedData = {};
                    let totalWins = 0;
                    let totalGames = 0;
                  
                    relevantData.forEach((item) => {
                      const label = getLabelFromItem(item);
                      if (!label) return;
                      if (!aggregatedData[label]) {
                        aggregatedData[label] = {
                          label,
                          wins: 0,
                          total_games: 0,
                          month: latestMonth,
                        };
                      }
                      aggregatedData[label].wins += item.wins || 0;
                      aggregatedData[label].total_games += item.total_games || 0;
                      totalWins += item.wins || 0;
                      totalGames += item.total_games || 0;
                    });
                  
                    // Calculate win rates and convert to array
                    const aggregatedArray = Object.values(aggregatedData).map((item) => ({
                      ...item,
                      win_rate: item.total_games > 0 ? (item.wins / item.total_games) * 100 : 0,
                    }));
 
                    return (
                      <>
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
                            const valueA =
                              sortBy === 'label' ? a.label :
                              sortBy === 'total_games' ? a.total_games :
                              sortBy === 'win_rate' ? a.win_rate :
                              sortBy === 'change' ? (calculateVictoryMonthlyChange && calculateVictoryMonthlyChange(victoryData, a.label)?.change) : 0;
 
                            const valueB =
                              sortBy === 'label' ? b.label :
                              sortBy === 'total_games' ? b.total_games :
                              sortBy === 'win_rate' ? b.win_rate :
                              sortBy === 'change' ? (calculateVictoryMonthlyChange && calculateVictoryMonthlyChange(victoryData, b.label)?.change) : 0;
 
                            // Apply sort direction
                            if (sortBy === 'label') {
                              // String comparison for labels
                              return sortDirection === 'asc'
                                ? String(valueA).localeCompare(String(valueB))
                                : String(valueB).localeCompare(String(valueA));
                            } else {
                              // Numeric comparison for everything else
                              return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
                            }
                          })
                          .map((item, index) => {
                            // Use normalized label
                            const label = item.label || 'N/A';
 
                            // Calculate month-over-month change
                            const monthlyChange = calculateVictoryMonthlyChange && calculateVictoryMonthlyChange(victoryData, label);
 
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
                                    {/* chip con número de partidas */}
                                    <Tooltip title="Games">
                                      <Chip
                                        size="small"
                                        label={item.total_games}
                                        sx={{
                                          backgroundColor: 'rgba(255,255,255,0.15)',
                                          color: 'white',
                                          fontSize: '0.75rem',
                                          height: 20,
                                          mr: 1,
                                          '& .MuiChip-label': { px: 0.5 },
                                        }}
                                      />
                                    </Tooltip>

                                    {/* WIN RATE con hover */}
                                    <Tooltip title="Win Rate">
                                      <Chip
                                        size="small"
                                        label={`${item.win_rate.toFixed(2)}%`}
                                        sx={{
                                          backgroundColor: 'rgba(255,255,255,0.15)',
                                          color: 'white',
                                          fontSize: '0.75rem',
                                          height: 20,
                                          '& .MuiChip-label': { px: 0.5 },
                                          mr: 1,
                                        }}
                                      />
                                    </Tooltip>
                                    {monthlyChange && (
                                      <Tooltip title="Monthly Change">
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
                                      </Tooltip>
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