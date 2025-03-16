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
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDraggable from '../hooks/useDraggable';

//todo
//borde del select item blanco
//cargar los datos ya puestos en el pokemon dialog

const PokemonDialog = ({ open, onClose, position, onSelectPokemon, pokemonList = [] }) => {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lista predefinida de objetos populares
  const commonItems = [
    { name: 'No Item', usage: 0 },
    { name: 'Choice Specs', usage: 25.2 },
    { name: 'Rocky Helmet', usage: 18.7 },
    { name: 'Assault Vest', usage: 15.4 },
    { name: 'Covert Cloak', usage: 12.3 },
    { name: 'Life Orb', usage: 10.1 },
    { name: 'Focus Sash', usage: 9.8 },
    { name: 'Sitrus Berry', usage: 8.5 },
    { name: 'Safety Goggles', usage: 7.9 },
    { name: 'Mental Herb', usage: 6.2 },
    { name: 'Weakness Policy', usage: 5.8 },
    { name: 'Choice Scarf', usage: 5.5 },
    { name: 'Leftovers', usage: 4.9 },
    { name: 'Choice Band', usage: 4.6 },
  ];
  
  // Use the draggable hook
  const { ref, style, handleMouseDown, resetPosition, isDragging } = useDraggable();
  
  // Effect to reset position and selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetPosition();
      setSelectedPokemon(null);
      setSelectedItem('');
      setSearchTerm('');
    }
  }, [open, resetPosition]);

  // Modificar esta función para asegurar que selectedPokemon sea un string
  const handleSelectPokemon = () => {
    if (selectedPokemon) {
      // Asegúrate de enviar correctamente el nombre del Pokémon como string
      onSelectPokemon(position, {
        name: selectedPokemon,
        item: selectedItem || null
      });
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
            <>
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
              
              {/* Item selector appears only when a Pokémon is selected */}
              {selectedPokemon && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="item-select-label" sx={{ color: 'white' }}>Held Item</InputLabel>
                  <Select
                    labelId="item-select-label"
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    label="Held Item"
                    sx={{
                      mt: 1,
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'white',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      }
                    }}
                  >
                    {commonItems.map((item) => (
                      <MenuItem key={item.name} value={item.name}>
                        {item.name} {item.usage > 0 && `(${item.usage.toFixed(1)}%)`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </>
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