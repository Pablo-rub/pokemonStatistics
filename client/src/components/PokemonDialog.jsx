import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Autocomplete, Box, IconButton,
  Typography, FormControl, Grid, FormControlLabel, Checkbox,
  Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import useDraggable from '../hooks/useDraggable';
import MovesSelect from './MovesSelect';
import VolatileStatusesSelect from './VolatileStatusesSelect';

const PokemonDialog = ({ open, onClose, position, onSelectPokemon, pokemonList = [] }) => {
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedAbility, setSelectedAbility] = useState('');
  const [selectedMoves, setSelectedMoves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNonVolatileStatus, setSelectedNonVolatileStatus] = useState('');
  const [selectedVolatileStatuses, setSelectedVolatileStatuses] = useState([]);
  const [statChanges, setStatChanges] = useState({
    hp: 100,
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    acc: 0,
    eva: 0,
  });
  const [selectedTeraType, setSelectedTeraType] = useState('');
  const [teraActive, setTeraActive] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filterStats, setFilterStats] = useState(false);
  
  const [itemsList, setItemsList] = useState([]);
  const [abilitiesList, setAbilitiesList] = useState([]);
  const [movesList, setMovesList] = useState([]);
  const [volatileStatuses, setVolatileStatuses] = useState([]);
  const [nonVolatileStatuses, setNonVolatileStatuses] = useState([]);

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

    fetch(process.env.PUBLIC_URL + '/volatile.txt')
      .then(res => res.text())
      .then(text => {
        const statuses = text
          .trim()
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        setVolatileStatuses(statuses);
      })
      .catch(err => console.error("Error fetching volatile statuses:", err));

    fetch(process.env.PUBLIC_URL + '/nonvolatile.txt')
      .then(res => res.text())
      .then(text => {
        const statuses = text
          .trim()
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean);
        setNonVolatileStatuses(statuses);
      });
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
        moves: selectedMoves.length > 0 ? selectedMoves : [],
        stats: statChanges,
        filterStats,
        nonVolatileStatus: selectedNonVolatileStatus || null,
        volatileStatuses: selectedVolatileStatuses || [],
        teraType: selectedTeraType,
        teraActive: teraActive,
      });
      onClose();
    }
  };

  const handleClearData = () => {
    setSelectedPokemon(null);
    setSelectedItem('');
    setSelectedAbility('');
    setSelectedMoves([]);
    setSelectedNonVolatileStatus('');
    setSelectedVolatileStatuses([]);
    setStatChanges({
      hp: 100,
      atk: 0,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 0,
      acc: 0,
      eva: 0,
    });
    setSelectedTeraType('');
    setTeraActive(false);
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const teraTypes = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 
    'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'
  ];

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
                      value={selectedNonVolatileStatus}
                      onChange={(e, newValue) => setSelectedNonVolatileStatus(newValue || '')}
                      clearIcon={selectedNonVolatileStatus ? undefined : null}
                      renderInput={(params) => (
                        <TextField {...params} label="Non Volatile Status" variant="outlined" />
                      )}
                    />
                  </FormControl>

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <VolatileStatusesSelect
                      options={volatileStatuses}
                      selectedStatuses={selectedVolatileStatuses}
                      setSelectedStatuses={setSelectedVolatileStatuses}
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

                  {/* Tera Type and Active checkbox - horizontal */}
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Autocomplete
                      options={teraTypes}
                      value={selectedTeraType}
                      onChange={(e, newValue) => setSelectedTeraType(newValue || '')}
                      clearIcon={selectedTeraType ? undefined : null}
                      renderInput={(params) => (
                        <TextField {...params} label="Tera Type" variant="outlined" InputLabelProps={{ style: { color: 'white' } }} />
                      )}
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                        '& .MuiSvgIcon-root': { color: 'white' }
                      }}
                    />
                    {/* Solo mostrar Tera Active si hay un tipo Tera seleccionado */}
                    {selectedTeraType && (
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={teraActive}
                            onChange={(e) => setTeraActive(e.target.checked)}
                            sx={{ 
                              color: 'white',
                              '&.Mui-checked': { color: '#24CC9F' }
                            }}
                          />
                        }
                        label="Tera Active"
                        sx={{ color: 'white' }}
                      />
                    )}
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setStatsExpanded(!statsExpanded)}>
                    <Typography variant="h6" color="white" sx={{ flexGrow: 1 }}>
                      Stats
                    </Typography>
                    <IconButton sx={{ color: 'white', transform: statsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <ExpandMoreIcon />
                    </IconButton>
                  </Box>
                  <Collapse in={statsExpanded} timeout="auto" unmountOnExit>
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        backgroundColor: '#221FC7', // Fondo azul oscuro
                        border: '2px solid #ffffff', // Borde azul
                        borderRadius: 2
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={filterStats}
                            onChange={(e) => setFilterStats(e.target.checked)}
                            sx={{ 
                              color: 'white',
                              '&.Mui-checked': { color: '#ffffff' }
                            }}
                          />
                        }
                        label="Filter by stats"
                        sx={{ color: 'white', mb: 2 }}
                      />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <TextField
                            type="number"
                            label="HP"
                            value={statChanges.hp}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, hp: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, hp: clamp(newValue, 0, 100) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: 0, max: 100, step: 1, style: { color: 'white' } }}
                            sx={{
                              backgroundColor: '#221FC7',
                              borderRadius: 1
                            }}
                          />
                          <TextField
                            type="number"
                            label="ATK"
                            value={statChanges.atk}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, atk: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, atk: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{
                              mt: 1,
                              backgroundColor: '#221FC7',
                              borderRadius: 1
                            }}
                          />
                          <TextField
                            type="number"
                            label="DEF"
                            value={statChanges.def}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, def: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, def: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{ mt: 1, backgroundColor: '#221FC7', borderRadius: 1 }}
                          />
                          <TextField
                            type="number"
                            label="ACC"
                            value={statChanges.acc}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, acc: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, acc: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{ mt: 1, backgroundColor: '#221FC7', borderRadius: 1 }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            type="number"
                            label="SPA"
                            value={statChanges.spa}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, spa: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, spa: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{
                              backgroundColor: '#221FC7',
                              borderRadius: 1
                            }}
                          />
                          <TextField
                            type="number"
                            label="SPD"
                            value={statChanges.spd}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, spd: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, spd: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{ mt: 1, backgroundColor: '#221FC7', borderRadius: 1 }}
                          />
                          <TextField
                            type="number"
                            label="SPE"
                            value={statChanges.spe}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, spe: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, spe: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{ mt: 1, backgroundColor: '#221FC7', borderRadius: 1 }}
                          />
                          <TextField
                            type="number"
                            label="EVA"
                            value={statChanges.eva}
                            onChange={(e) =>
                              setStatChanges(prev => ({ ...prev, eva: Number(e.target.value) }))
                            }
                            onBlur={(e) => {
                              const newValue = Number(e.target.value);
                              setStatChanges(prev => ({ ...prev, eva: clamp(newValue, -6, 6) }));
                            }}
                            variant="outlined"
                            fullWidth
                            InputLabelProps={{ style: { color: 'white' } }}
                            inputProps={{ min: -6, max: 6, step: 1, style: { color: 'white' } }}
                            sx={{ mt: 1, backgroundColor: '#221FC7', borderRadius: 1 }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={handleClearData} 
          variant="outlined" 
          color="warning"
          sx={{ mr: 'auto' }}
        >
          Clear Data
        </Button>
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