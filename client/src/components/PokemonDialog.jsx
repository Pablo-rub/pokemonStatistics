import axios from 'axios';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDraggable from '../hooks/useDraggable';

const PokemonDialog = ({ open, onClose, position, onSelectPokemon, pokemonList = [] }) => {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Nuevo estado para almacenar la lista de items
  const [itemsList, setItemsList] = useState([]);
  
  // Obtener la lista de items de la API al montar el componente
  useEffect(() => {
    axios.get('http://localhost:5000/api/items')
      .then(response => setItemsList(response.data))
      .catch(error => console.error("Error fetching items:", error));
  }, []);
  
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

  const [abilitiesList, setAbilitiesList] = useState([]);
  const [movesList, setMovesList] = useState([]);

  // Estados para la habilidad y movimiento seleccionados
  const [selectedAbility, setSelectedAbility] = useState('');
  const [selectedMove, setSelectedMove] = useState('');

  // Obtener la lista de habilidades y movimientos al montar el componente
  useEffect(() => {
    axios.get('http://localhost:5000/api/abilities')
      .then(response => setAbilitiesList(response.data))
      .catch(error => console.error("Error fetching abilities:", error));
  }, []);

  useEffect(() => {
    axios.get('http://localhost:5000/api/moves')
      .then(response => setMovesList(response.data))
      .catch(error => console.error("Error fetching moves:", error));
  }, []);

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
                <>
                  {/* Autocomplete para Held Item (ya implementado) */}
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={itemsList}
                      getOptionLabel={(option) => option.name}
                      value={itemsList.find(item => item.name === selectedItem) || null}
                      onChange={(event, newValue) => {
                        setSelectedItem(newValue ? newValue.name : '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Held Item"
                          variant="outlined"
                          InputLabelProps={{ style: { color: 'white' } }}
                          InputProps={{
                            ...params.InputProps,
                            style: { color: 'white' },
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'white' },
                        },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        mt: 1,
                      }}
                    />
                  </FormControl>
                  
                  {/* Nuevo Autocomplete para Ability */}
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={abilitiesList}
                      getOptionLabel={(option) => option.name}
                      value={abilitiesList.find(ability => ability.name === selectedAbility) || null}
                      onChange={(event, newValue) => {
                        setSelectedAbility(newValue ? newValue.name : '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Ability"
                          variant="outlined"
                          InputLabelProps={{ style: { color: 'white' } }}
                          InputProps={{
                            ...params.InputProps,
                            style: { color: 'white' },
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        mt: 1,
                      }}
                    />
                  </FormControl>

                  {/* Nuevo Autocomplete para Move */}
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={movesList}
                      getOptionLabel={(option) => option.name}
                      value={movesList.find(move => move.name === selectedMove) || null}
                      onChange={(event, newValue) => {
                        setSelectedMove(newValue ? newValue.name : '');
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Move"
                          variant="outlined"
                          InputLabelProps={{ style: { color: 'white' } }}
                          InputProps={{
                            ...params.InputProps,
                            style: { color: 'white' },
                          }}
                        />
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        mt: 1,
                      }}
                    />
                  </FormControl>
                </>
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