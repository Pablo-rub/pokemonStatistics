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
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDraggable from '../hooks/useDraggable';

const PokemonDialog = ({ open, onClose, position, onSelectPokemon }) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();
  
  // Effect to fetch Pokémon data and reset position when dialog opens/closes
  useEffect(() => {
    if (open) {
      const fetchPokemonList = async () => {
        setLoading(true);
        try {
          // In a real implementation, fetch from your API
          // For now, using a sample list
          const samplePokemonList = [
            "Urshifu-Rapid-Strike", "Ogerpon", "Raging Bolt", "Iron Thorns", 
            "Chi-Yu", "Flutter Mane", "Chien-Pao", "Landorus-Therian", 
            "Incineroar", "Tornadus", "Archaludon", "Amoonguss"
          ];
          setPokemonList(samplePokemonList.sort());
        } catch (error) {
          console.error("Error fetching Pokémon list:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchPokemonList();
    } else {
      resetPosition();
      setSelectedPokemon(null);
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
          <Autocomplete
            options={pokemonList}
            loading={loading}
            value={selectedPokemon}
            onChange={(event, newValue) => setSelectedPokemon(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Pokémon Name"
                variant="outlined"
                fullWidth
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