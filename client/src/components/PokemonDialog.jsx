import React, { useState, useEffect, useCallback, useRef } from 'react';
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

const PokemonDialog = ({ open, onClose, position, onSelectPokemon }) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Draggable dialog states
  const [dialogPosition, setDialogPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const paperRef = useRef(null);
  
  useEffect(() => {
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

    if (open) {
      fetchPokemonList();
    }
  }, [open]);

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
  
  // Reset position and state when dialog closes
  useEffect(() => {
    if (!open) {
      setDialogPosition(null);
      setIsDragging(false);
    }
  }, [open]);
  
  // Mouse down handler to start dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.MuiDialogTitle-root')) {
      const rect = paperRef.current?.getBoundingClientRect();
      if (rect) {
        // Set initial position if not already set
        if (!dialogPosition) {
          setDialogPosition({
            x: rect.left,
            y: rect.top
          });
        }
        setIsDragging(true);
        // Calculate offset between cursor and dialog top-left corner
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  // Mouse move handler for dragging
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setDialogPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  }, [isDragging, dragOffset]);

  // Mouse up handler to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      onMouseDown={handleMouseDown}
      PaperProps={{
        ref: paperRef,
        sx: {
          backgroundColor: '#221FC7',
          position: dialogPosition ? 'fixed' : 'static',
          left: dialogPosition?.x,
          top: dialogPosition?.y,
          cursor: isDragging ? 'grabbing' : 'default',
          margin: dialogPosition ? 0 : 'auto',
          transition: 'none',
          '& .MuiDialogTitle-root': {
            cursor: 'grab',
            userSelect: 'none'
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        backgroundColor: isDragging ? 'rgba(26, 24, 150, 0.8)' : 'transparent',
        transition: 'background-color 0.2s'
      }}>
        {positionName(position)}
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
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