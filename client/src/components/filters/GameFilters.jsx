import React from "react";
import {
  Grid,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  InputLabel,
  Box,
  CircularProgress,
} from "@mui/material";

/**
 * Componente reutilizable de filtros para juegos/replays
 * Proporciona interfaz consistente de filtrado para PublicGamesPage y SavedGamesPage
 */
const GameFilters = ({
  sortBy,
  onSortByChange,
  playerFilter,
  onPlayerFilterChange,
  ratingFilter,
  onRatingFilterChange,
  dateFilter,
  onDateFilterChange,
  formatFilter,
  onFormatFilterChange,
  availableFormats = [],
  isLoadingFormats = false,
  showSaved,
  onShowSavedChange,
  showSavedFilter = false,
  onApply,
  onReset,
  compact = false,
}) => {
  // Helper para formatear nombres de regulaciones
  const formatRegulationName = (format) => {
    if (!format) return format;
    
    const match = format.match(/Reg ([A-Z])/i);
    if (match) {
      return `Reg ${match[1].toUpperCase()}`;
    }
    return format;
  };

  return (
    <Box
      sx={{
        mb: compact ? 2 : 3,
        p: 2,
        borderRadius: 2,
        boxShadow: 3,
        backgroundColor: '#221FC7',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <Grid container spacing={2}>
        {/* Row 1: Sort, Player Search, Rating, Date */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="sort-by-label"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Sort by
            </InputLabel>
            <Select
              labelId="sort-by-label"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              label="Sort by"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#24cc9f',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              <MenuItem value="date DESC">Date Descending</MenuItem>
              <MenuItem value="date ASC">Date Ascending</MenuItem>
              <MenuItem value="rating DESC">Rating Descending</MenuItem>
              <MenuItem value="rating ASC">Rating Ascending</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Search by player"
            value={playerFilter}
            onChange={(e) => onPlayerFilterChange(e.target.value)}
            size="small"
            variant="outlined"
            fullWidth
            sx={{
                paddingRight: 1,
                paddingLeft: 1,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#24cc9f',
                },
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="rating-label"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Rating
            </InputLabel>
            <Select
              labelId="rating-label"
              value={ratingFilter}
              onChange={(e) => onRatingFilterChange(e.target.value)}
              label="Rating"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#24cc9f',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              <MenuItem value="all">All Ratings</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
              <MenuItem value="1200+">&gt;1200</MenuItem>
              <MenuItem value="1500+">&gt;1500</MenuItem>
              <MenuItem value="1800+">&gt;1800</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="date-label"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Date
            </InputLabel>
            <Select
              labelId="date-label"
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              label="Date"
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#24cc9f',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Row 2: Format, Show Saved (optional), Buttons */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="format-label"
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Format
            </InputLabel>
            <Select
              labelId="format-label"
              value={formatFilter}
              onChange={(e) => onFormatFilterChange(e.target.value)}
              label="Format"
              disabled={isLoadingFormats}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#24cc9f',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              <MenuItem value="all">All Formats</MenuItem>
              {isLoadingFormats ? (
                <MenuItem disabled>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <span>Loading...</span>
                  </Box>
                </MenuItem>
              ) : (
                availableFormats.map((format) => (
                  <MenuItem key={format} value={format}>
                    {formatRegulationName(format)}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Show saved filter (conditional) */}
        {showSavedFilter && (
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel 
                id="show-saved-label"
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                Show
              </InputLabel>
              <Select
                labelId="show-saved-label"
                value={showSaved}
                onChange={(e) => onShowSavedChange(e.target.value)}
                label="Show"
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#24cc9f',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                  },
                }}
              >
                <MenuItem value="all">All Replays</MenuItem>
                <MenuItem value="unsaved">Unsaved Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        )}

        {/* Buttons */}
        <Grid 
          item 
          xs={12} 
          sm={12} 
          md={showSavedFilter ? 6 : 9}
          sx={{ 
            display: 'flex', 
            gap: 1,
            alignItems: 'center',
            justifyContent: { xs: 'stretch', md: 'flex-end' }
          }}
        >
          <Button
            variant="contained"
            onClick={onApply}
            sx={{
              flex: { xs: 1, md: '0 1 120px' },
              minWidth: '100px',
              backgroundColor: '#24cc9f',
              color: 'white',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: '#1fa885',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(36, 204, 159, 0.4)',
              },
            }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            onClick={onReset}
            sx={{
              flex: { xs: 1, md: '0 1 120px' },
              minWidth: '100px',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              color: 'white',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'white',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-2px)',
              },
            }}
          >
            Reset
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GameFilters;