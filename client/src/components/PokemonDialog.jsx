import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
  IconButton,
  CircularProgress,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDraggable from '../hooks/useDraggable';

const PokemonDialog = ({ open, onClose, position, onSelectPokemon, pokemonList = [] }) => {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();
  
  // Effect to reset position and selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetPosition();
      setSelectedPokemon(null);
      setSearchTerm('');
    }
  }, [open, resetPosition]);

  const handleSelectPokemon = () => {
    if (selectedPokemon) {
      onSelectPokemon(position, selectedPokemon);
      onClose();
    }
  };

  const positionName = position => {
    switch(position) {
      case 'topLeft': return "Your Left Pokémon";
      case 'topRight': return "Your Right Pokémon";
      case 'bottomLeft': return "Opponent's Left Pokémon";
      case 'bottomRight': return "Opponent's Right Pokémon";
      default: return "Select Pokémon";
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        ref,
        style: {
          ...style,
          backgroundColor: '#221FC7',
          transition: 'none'
        },
        onMouseDown: handleMouseDown,
        sx: {
          '& .MuiDialogTitle-root': {
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            padding: '16px 24px',
            color: 'white'
          }
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          {positionName(position)}
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {pokemonList.length === 0 ? (
            <Typography sx={{ color: 'white', textAlign: 'center' }}>
              Please select a format to load Pokémon list
            </Typography>
          ) : (
            <Autocomplete
              options={pokemonList}
              loading={loading}
              value={selectedPokemon}
              onChange={(event, newValue) => setSelectedPokemon(newValue)}
              inputValue={searchTerm}
              onInputChange={(event, newInputValue) => setSearchTerm(newInputValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pokémon Name"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'white',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'white',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
                '& .MuiAutocomplete-endAdornment': {
                  '& .MuiIconButton-root': {
                    color: 'white',
                  }
                }
              }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button 
          onClick={handleSelectPokemon} 
          variant="containedSuccess"
          disabled={!selectedPokemon}
        >
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PokemonDialog;