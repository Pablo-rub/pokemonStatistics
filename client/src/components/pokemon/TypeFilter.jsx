import React from 'react';
import {
  Box,
  Typography,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Collapse,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useTheme } from '@mui/material/styles';
import { POKEMON_TYPES, getTypeColor } from '../../utils/pokemonTypes';

/**
 * TypeFilter - Component for filtering Pokémon by type
 * 
 * @param {Array<string>} selectedTypes - Currently selected types
 * @param {Function} onTypesChange - Callback when types selection changes
 * @param {string} filterMode - 'AND' or 'OR' mode
 * @param {Function} onFilterModeChange - Callback when filter mode changes
 * @param {number} filteredCount - Number of Pokémon matching the filter
 * @param {number} totalCount - Total number of Pokémon
 */
const TypeFilter = ({
  selectedTypes = [],
  onTypesChange,
  filterMode = 'OR',
  onFilterModeChange,
  filteredCount = 0,
  totalCount = 0,
  expanded = false,
  onExpandedChange
}) => {
  const theme = useTheme();

  const handleTypeClick = (type) => {
    if (selectedTypes.includes(type)) {
      // Remove type
      onTypesChange(selectedTypes.filter(t => t !== type));
    } else {
      // Add type
      onTypesChange([...selectedTypes, type]);
    }
  };

  const handleClearAll = () => {
    onTypesChange([]);
  };

  const handleFilterModeChange = (event, newMode) => {
    if (newMode !== null) {
      onFilterModeChange(newMode);
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        border: selectedTypes.length > 0 
          ? `2px solid ${theme.palette.primary.main}` 
          : '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
            Filter by Type
          </Typography>
          
          {selectedTypes.length > 0 && (
            <Badge 
              badgeContent={selectedTypes.length} 
              color="primary"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  fontWeight: 'bold'
                }
              }}
            >
              <Box sx={{ width: 24 }} />
            </Badge>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Results counter */}
          {selectedTypes.length > 0 && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.7)',
                mr: 1
              }}
            >
              {filteredCount} of {totalCount} Pokémon
            </Typography>
          )}

          {/* Clear button */}
          {selectedTypes.length > 0 && (
            <Tooltip title="Clear all filters">
              <IconButton
                size="small"
                onClick={handleClearAll}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: theme.palette.error.main,
                    backgroundColor: 'rgba(244, 67, 54, 0.1)'
                  }
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {/* Expand/Collapse button */}
          <IconButton
            size="small"
            onClick={() => onExpandedChange(!expanded)}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        {/* Filter Mode Toggle */}
        {selectedTypes.length > 1 && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Match:
            </Typography>
            <ToggleButtonGroup
              value={filterMode}
              exclusive
              onChange={handleFilterModeChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark
                    }
                  }
                }
              }}
            >
              <ToggleButton value="OR">
                <Tooltip title="Pokémon with ANY of the selected types">
                  <span>Any Type (OR)</span>
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="AND">
                <Tooltip title="Pokémon with ALL selected types (e.g., Water/Flying)">
                  <span>All Types (AND)</span>
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Type chips grid */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          {POKEMON_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type);
            return (
              <Chip
                key={type}
                label={type}
                onClick={() => handleTypeClick(type)}
                sx={{
                  backgroundColor: isSelected 
                    ? getTypeColor(type) 
                    : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontWeight: isSelected ? 'bold' : 'normal',
                  fontSize: '0.875rem',
                  px: 1,
                  py: 2,
                  cursor: 'pointer',
                  border: isSelected 
                    ? `2px solid ${getTypeColor(type)}` 
                    : '2px solid transparent',
                  filter: isSelected ? 'brightness(1.1)' : 'brightness(0.7)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    filter: 'brightness(1)',
                    transform: 'scale(1.05)',
                    boxShadow: `0 0 10px ${getTypeColor(type)}50`
                  },
                  '& .MuiChip-label': {
                    padding: '6px 12px'
                  }
                }}
              />
            );
          })}
        </Box>

        {/* Help text */}
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'block',
            mt: 2,
            textAlign: 'center'
          }}
        >
          Click on types to filter. Select multiple types to find dual-type Pokémon.
        </Typography>
      </Collapse>
    </Paper>
  );
};

export default TypeFilter;