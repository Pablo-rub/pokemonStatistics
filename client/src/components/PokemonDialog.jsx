import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Autocomplete, Box, IconButton, 
  CircularProgress, Typography, FormControl, Slider, Select, MenuItem 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import useDraggable from '../hooks/useDraggable';
import MovesSelect from './MovesSelect';

const PokemonDialog = ({ open, onClose, position, onSelectPokemon, pokemonList = [] }) => {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedAbility, setSelectedAbility] = useState('');
  const [selectedMove, setSelectedMove] = useState('');
  const [selectedMoves, setSelectedMoves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hp, setHp] = useState(100);
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [itemsList, setItemsList] = useState([]);
  const [abilitiesList, setAbilitiesList] = useState([]);
  const [movesList, setMovesList] = useState([]);

  // Obtener las listas (items, abilities, moves) al montar el componente
  useEffect(() => {
    // Items
    fetch('http://localhost:5000/api/items')
      .then(res => res.json())
      .then(data => setItemsList(data))
      .catch(err => console.error("Error fetching items:", err));
    // Abilities
    fetch('http://localhost:5000/api/abilities')
      .then(res => res.json())
      .then(data => setAbilitiesList(data))
      .catch(err => console.error("Error fetching abilities:", err));
    // Moves
    fetch('http://localhost:5000/api/moves')
      .then(res => res.json())
      .then(data => setMovesList(data))
      .catch(err => console.error("Error fetching moves:", err));
  }, []);

  const { ref, style, handleMouseDown, isDragging } = useDraggable({ resetOnClose: true });
  
  const positionName = (position) => {
    switch(position) {
      case 'topLeft': return "Your Left Pokémon";
      case 'topRight': return "Your Right Pokémon";
      case 'bottomLeft': return "Opponent's Left Pokémon";
      case 'bottomRight': return "Opponent's Right Pokémon";
      default: return "Select Pokémon";
    }
  };

  const handleSelect = () => {
    if (selectedPokemon) {
      onSelectPokemon(position, {
        name: selectedPokemon,
        item: selectedItem || null,
        ability: selectedAbility || null,
        moves: selectedMoves.length > 0 ? selectedMoves : []
      });
      onClose();
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
        style: { ...style, backgroundColor: '#221FC7', transition: 'none' },
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
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
                  <TextField {...params} label="Pokémon Name" variant="outlined" fullWidth />
                )}
                sx={{
                  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                  '& .MuiSvgIcon-root': { color: 'white' },
                  mt: 1,
                }}
              />
              {selectedPokemon && (
                <>
                  {/* Barra de vida y campo numérico */}
                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                    <Slider
                      value={hp}
                      onChange={(e, newValue) => setHp(newValue)}
                      aria-labelledby="hp-slider"
                      sx={{ color: '#24CC9F', flexGrow: 1, mr: 2, width: '50%' }}
                    />
                    <TextField
                      value={hp}
                      onChange={(e) => setHp(Number(e.target.value))}
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      size="small"
                      sx={{ width: 80, mr: 1 }} 
                    />
                    <Typography variant="body2" color="white">/100% hp</Typography>
                  </Box>

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={itemsList}
                      getOptionLabel={(option) => option.name}
                      value={itemsList.find(item => item.name === selectedItem) || null}
                      onChange={(e, newValue) => setSelectedItem(newValue ? newValue.name : '')}
                      renderInput={(params) => (
                        <TextField {...params} label="Held Item" variant="outlined" InputLabelProps={{ style: { color: 'white' } }} />
                      )}
                      sx={{
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                        '& .MuiSvgIcon-root': { color: 'white' },
                        mt: 1,
                      }}
                    />
                  </FormControl>
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={abilitiesList}
                      getOptionLabel={(option) => option.name}
                      value={abilitiesList.find(ability => ability.name === selectedAbility) || null}
                      onChange={(e, newValue) => setSelectedAbility(newValue ? newValue.name : '')}
                      renderInput={(params) => (
                        <TextField {...params} label="Ability" variant="outlined" InputLabelProps={{ style: { color: 'white' } }} />
                      )}
                      // Se elimina el mt interno para que solo se use el del FormControl
                      sx={{
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                        '& .MuiSvgIcon-root': { color: 'white' }
                      }}
                    />
                  </FormControl>

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <Autocomplete
                      options={["Burn", "Freeze", "Paralysis", "Poison", "Badly poisoned", "Sleep"]}
                      getOptionLabel={(option) => option}
                      value={selectedStatus}
                      onChange={(e, newValue) => setSelectedStatus(newValue || '')}
                      renderInput={(params) => (
                        <TextField {...params} label="Non Volatile Status" variant="outlined" />
                      )}
                    />
                  </FormControl>

                  {/* Movimientos */}
                  <Box sx={{ mt: 2 }}>
                    <MovesSelect 
                      movesList={movesList} 
                      selectedMoves={selectedMoves} 
                      setSelectedMoves={setSelectedMoves} 
                    />
                  </Box>
                </>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="error">
          Cancel
        </Button>
        <Button onClick={handleSelect} variant="containedSuccess" color="success" disabled={!selectedPokemon}>
          Select
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PokemonDialog;