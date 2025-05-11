import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Autocomplete, Box, Grid, Alert, Paper,
    FormControlLabel, Checkbox, Collapse, IconButton, Typography,
    FormControl, Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { createFilterOptions } from '@mui/material/Autocomplete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import useDraggable from '../hooks/useDraggable';
import TriStateCheckbox from '../components/TriStateCheckBox';

// Checkbox con estilo blanco
const WhiteCheckbox = styled(Checkbox)(({ theme }) => ({
    color: 'white',
    '&.Mui-checked': {
        color: 'white',
    }
}));

// Componente para hacer el diálogo arrastrable
function DraggablePaperComponent(props) {
    const { ref, style, handleMouseDown } = useDraggable({ 
        resetOnClose: true, 
        handleSelector: '#draggable-dialog-title' 
    });
    
    return (
        <Paper 
            ref={ref} 
            {...props} 
            style={{ ...props.style, ...style }} 
            onMouseDown={handleMouseDown} 
        />
    );
}

const TeamDialog = ({ open, onClose, onSelectTeam, pokemonList = [] }) => {
    const [team, setTeam] = useState(Array(6).fill(null));
    const [searchTerms, setSearchTerms] = useState(Array(6).fill(''));
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [localPokemonList, setLocalPokemonList] = useState([]);
    const [revealed, setRevealed] = useState({});
    const [fainted, setFainted] = useState({});
    
    // Estados para los detalles de cada Pokémon
    const [expandedDetails, setExpandedDetails] = useState({});
    const [pokemonDetails, setPokemonDetails] = useState(Array(6).fill({
        item: '',
        ability: '',
        moves: [],
        nonVolatileStatus: '',
        teraType: '',
        teraActive: null
    }));
    
    // Listas para los selectores
    const [itemsList, setItemsList] = useState([]);
    const [abilitiesList, setAbilitiesList] = useState([]);
    const [movesList, setMovesList] = useState([]);
    const [nonVolatileStatusList, setnonVolatileStatusList] = useState([]);
    
    // Obtener las listas al montar el componente
    useEffect(() => {
        // Items
        fetch('/api/items')
            .then(res => res.json())
            .then(data => setItemsList(data))
            .catch(err => console.error("Error fetching items:", err));
        
        // Abilities
        fetch('/api/abilities')
            .then(res => res.json())
            .then(data => setAbilitiesList(data))
            .catch(err => console.error("Error fetching abilities:", err));
        
        // Moves
        fetch('/api/moves')
            .then(res => res.json())
            .then(data => setMovesList(data))
            .catch(err => console.error("Error fetching moves:", err));
        
        // nonVolatileStatus
        fetch(process.env.PUBLIC_URL + '/nonvolatile.txt')
            .then(res => res.text())
            .then(text => {
                const nonVolatileStatuses = text
                    .trim()
                    .split('\n')
                    .map(s => s.trim())
                    .filter(Boolean);
                setnonVolatileStatusList(nonVolatileStatuses);
            })
            .catch(err => console.error("Error fetching non-volatile nonVolatileStatuses:", err));
    }, []);

    useEffect(() => {
        setLocalPokemonList(pokemonList);
    }, [pokemonList]);

    const handleChange = (index, newValue) => {
        //console.log("Changing team at index", index, "to value:", newValue);
        const newTeam = [...team];
        
        // Verifica explícitamente el formato del valor y asegúrate de que tenga name
        if (newValue) {
            // Si es un string, conviértelo a objeto
            if (typeof newValue === 'string') {
                newValue = { name: newValue };
            } 
            // Si ya es un objeto pero no tiene name o name está vacío, asegúrate de arreglarlo
            else if (typeof newValue === 'object') {
                if (!newValue.name || newValue.name === '') {
                    console.warn("Selected pokemon doesn't have a name property:", newValue);
                    // Si hay alguna propiedad que podría ser el nombre, úsala
                    if (newValue.label) {
                        newValue.name = newValue.label;
                    } else if (newValue.value) {
                        newValue.name = newValue.value;
                    } else if (newValue.toString) {
                        newValue.name = newValue.toString();
                    } else {
                        // Si todo falla, usa un placeholder
                        newValue.name = `Pokemon-${index}`;
                    }
                }
            }
        }
        
        newTeam[index] = newValue;
        setTeam(newTeam);
        setError('');
    };

    const handleSearchChange = (index, newInputValue) => {
        // Actualiza el término de búsqueda para este slot
        const newSearchTerms = [...searchTerms];
        newSearchTerms[index] = newInputValue;
        setSearchTerms(newSearchTerms);
    };

    const handleSelectTeam = () => {
        const teamWithDetails = team.map((pokemon, index) => {
            if (!pokemon) return null;
            const heldItem = (pokemonDetails[index].item || '').replace(/\s/g, '');
            const ability = (pokemonDetails[index].ability || '').replace(/\s/g, '');
            const moves = pokemonDetails[index].moves.map(move => move.replace(/\s/g, ''));
            const nonVolatileStatus = pokemonDetails[index].nonVolatileStatus || '';
            //console.log("Pokemon details:", pokemonDetails[index].nonVolatileStatus);

            return {
                ...pokemon,
                item: heldItem,
                ability: ability,
                moves: moves,
                non_volatile_status: nonVolatileStatus,
                tera_type: pokemonDetails[index].teraType,
                tera_active: pokemonDetails[index].teraActive,
                revealed: revealed[index] !== undefined ? revealed[index] : false,
                fainted: fainted[index] !== undefined ? fainted[index] : false
            };
        });

        if (teamWithDetails.some(member => !member)) {
            setError('El equipo debe estar completo.');
            return;
        }
        if (typeof onSelectTeam === 'function') {
            onSelectTeam(teamWithDetails);
        }
        onClose();
    };

    // Toggle expanded details for a Pokemon
    const toggleDetails = (index) => {
        setExpandedDetails(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };
    
    // Update Pokemon details
    const updatePokemonDetail = (index, field, value) => {
        const newDetails = [...pokemonDetails];
        newDetails[index] = {
            ...newDetails[index],
            [field]: value
        };
        setPokemonDetails(newDetails);
    };

    // Actualizar la función handleRevealedChange para limitar a 4 Pokémon revelados
    const handleRevealedChange = (index, value) => {
        if (value) {
            // Comprobar cuántos Pokémon están ya revelados
            const currentRevealedCount = Object.values(revealed).filter(isRevealed => isRevealed).length;
            
            // No permitir más de 4 Pokémon revelados
            if (currentRevealedCount >= 4) {
                return; // No hacer nada si ya hay 4 revelados
            }
        } else {
            // Si estamos desmarcando "Revealed", también desmarcamos "Fainted"
            setFainted(prev => ({ ...prev, [index]: false }));
        }
        
        // Actualizar el estado revelado
        setRevealed(prev => ({ ...prev, [index]: value }));
    };

    // Actualizar handleFaintedChange para que solo permita marcar fainted si está revelado
    const handleFaintedChange = (index, value) => {
        // Comprobar si el Pokémon está revelado
        if (!revealed[index] && value) {
            return; // No permitir marcar como fainted si no está revelado
        }
        
        setFainted(prev => ({ ...prev, [index]: value }));
    };

    const filterOptions = createFilterOptions({
        matchFrom: 'any', // Cambia 'start' a 'any' para buscar en cualquier parte del nombre
        stringify: (option) => {
            if (!option) return '';
            return typeof option === 'string' ? option : (option.name || '');
        },
        ignoreCase: true, // Asegura que la búsqueda ignore mayúsculas/minúsculas
        trim: true // Elimina espacios innecesarios
    });
    
    const teraTypes = [
        'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 
        'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 
        'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Stellar'
    ];

    // Añade esta función de reseteo después de handleSubmit
    const handleClearData = () => {
        // Crear un equipo vacío, que indique que no hay ningún Pokémon seleccionado
        const clearedTeam = Array(6).fill(null);
        setTeam(clearedTeam);
        setSearchTerms(Array(6).fill(''));
        setRevealed({});
        setFainted({});
        setExpandedDetails({});
        setPokemonDetails(Array(6).fill({
            item: '',
            ability: '',
            moves: [],
            nonVolatileStatus: '',
            teraType: '',
            teraActive: false,
            revealed: false,
            fainted: false
        }));
        setError('');
        // Notificar al componente padre que el equipo se ha limpiado
        if (typeof onSelectTeam === 'function') {
            onSelectTeam(clearedTeam);
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            aria-labelledby="draggable-dialog-title"
            fullWidth 
            maxWidth="md"
            PaperComponent={DraggablePaperComponent}
        >
            <DialogTitle id="draggable-dialog-title" style={{ cursor: 'grab' }}>
                Select Team
            </DialogTitle>
            <DialogContent sx={{ maxHeight: '80vh', overflowY: 'auto', pt: 5 }}>
                {/* Spacer box to ensure content doesn't get cut off */}
                <Box sx={{ height: 12 }} />
                
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    {team.map((pokemon, index) => (
                        <Grid item xs={12} key={index}>
                            <Paper 
                                elevation={3}
                                sx={{ 
                                    p: 2, 
                                    mb: 2, 
                                    backgroundColor: '#1A1896',
                                    color: 'white'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography component='p' variant="h6">Slot {index + 1}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ color: 'white' }}>
                                            {expandedDetails[index] ? 'Hide details' : 'More details'}
                                        </Typography>
                                        <IconButton
                                            onClick={() => toggleDetails(index)}
                                            aria-label={
                                              expandedDetails[index] 
                                                ? `Hide details for slot ${index + 1}` 
                                                : `Show details for slot ${index + 1}`
                                            }
                                            sx={{ color: 'white' }}
                                        >
                                            {expandedDetails[index] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                        </IconButton>
                                    </Box>
                                </Box>
                                
                                {/* Selector existente para el Pokémon */}
                                <Autocomplete
                                    options={localPokemonList}
                                    getOptionLabel={(option) => {
                                        // Asegúrate de que devuelva siempre un string válido
                                        if (!option) return '';
                                        return typeof option === 'object' && option.name ? option.name : String(option);
                                    }}
                                    filterOptions={filterOptions}
                                    // Simplifica la función de comparación para que sea más precisa
                                    isOptionEqualToValue={(option, value) => {
                                        if (!option || !value) return false;
                                        if (typeof option === 'object' && typeof value === 'object') {
                                            return option.name === value.name;
                                        }
                                        return option === value;
                                    }}
                                    loading={loading}
                                    value={team[index]}
                                    onChange={(event, newValue) => handleChange(index, newValue)}
                                    inputValue={searchTerms[index]}
                                    onInputChange={(event, newInputValue) => handleSearchChange(index, newInputValue)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={`Pokémon`}
                                            variant="outlined"
                                            fullWidth
                                            InputLabelProps={{ style: { color: 'white' } }}
                                        />
                                    )}
                                    sx={{
                                        mt: 1,
                                        mb: 1,
                                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                        '& .MuiSvgIcon-root': { color: 'white' }
                                    }}
                                />
                                
                                {/* Checkboxes para Revealed y Fainted */}
                                <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                    {/* Solo mostrar Revealed si no hay 4 revelados o si este ya está revelado */}
                                    {(Object.values(revealed).filter(isRevealed => isRevealed).length < 4 || revealed[index]) && (
                                        <FormControlLabel
                                            control={
                                                <WhiteCheckbox
                                                    checked={revealed[index] || false}
                                                    onChange={(e) => handleRevealedChange(index, e.target.checked)}
                                                />
                                            }
                                            label="Revealed"
                                            sx={{ color: 'white' }}
                                        />
                                    )}
                                    {/* Solo mostrar Fainted si el Pokémon está revelado */}
                                    {revealed[index] && (
                                        <FormControlLabel
                                            control={
                                                <WhiteCheckbox
                                                    checked={fainted[index] || false}
                                                    onChange={(e) => handleFaintedChange(index, e.target.checked)}
                                                />
                                            }
                                            label="Fainted"
                                            sx={{ color: 'white' }}
                                        />
                                    )}
                                </Box>
                                
                                {/* Detalles expandibles del Pokémon */}
                                <Collapse in={expandedDetails[index]}>
                                    <Divider sx={{ my: 2, borderColor: 'grey.500' }} />
                                    
                                    <Grid container spacing={2}>
                                        {/* Item */}
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth>
                                                <Autocomplete
                                                    options={[{ name: "None" }, ...itemsList]}
                                                    getOptionLabel={(option) => option.name}
                                                    value={
                                                        pokemonDetails[index].item
                                                            ? (pokemonDetails[index].item === "None"
                                                                ? { name: "None" }
                                                                : itemsList.find(item => item.name === pokemonDetails[index].item) || null)
                                                            : null
                                                    }
                                                    onChange={(_, newValue) => updatePokemonDetail(index, 'item', newValue ? newValue.name : '')}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            label="Held Item" 
                                                            variant="outlined"
                                                            InputLabelProps={{ style: { color: 'white' } }} 
                                                        />
                                                    )}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                                        '& .MuiSvgIcon-root': { color: 'white' }
                                                    }}
                                                />
                                            </FormControl>
                                        </Grid>
                                        
                                        {/* Ability */}
                                        <Grid item xs={12} sm={6}>
                                            <FormControl fullWidth>
                                                <Autocomplete
                                                    options={[{ name: "None" }, ...abilitiesList]}
                                                    getOptionLabel={(option) => option.name}
                                                    value={
                                                        pokemonDetails[index].ability
                                                            ? (pokemonDetails[index].ability === "None"
                                                                ? { name: "None" }
                                                                : abilitiesList.find(ability => ability.name === pokemonDetails[index].ability) || null)
                                                            : null
                                                    }
                                                    onChange={(_, newValue) => updatePokemonDetail(index, 'ability', newValue ? newValue.name : '')}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            label="Ability" 
                                                            variant="outlined"
                                                            InputLabelProps={{ style: { color: 'white' } }} 
                                                        />
                                                    )}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                                        '& .MuiSvgIcon-root': { color: 'white' }
                                                    }}
                                                />
                                            </FormControl>
                                        </Grid>
                                        
                                        {/* Moves */}
                                        <Grid item xs={12}>
                                            <FormControl fullWidth>
                                                <Autocomplete
                                                    multiple
                                                    options={movesList}
                                                    getOptionLabel={(option) => option?.name || ''}
                                                    value={pokemonDetails[index].moves.map(moveName => 
                                                        movesList.find(move => move.name === moveName) || { name: moveName }
                                                    )}
                                                    onChange={(_, newValue) => updatePokemonDetail(index, 'moves', newValue.map(move => move.name))}
                                                    renderInput={(params) => (
                                                        <TextField 
                                                            {...params} 
                                                            label="Moves" 
                                                            variant="outlined"
                                                            InputLabelProps={{ style: { color: 'white' } }}
                                                        />
                                                    )}
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                                        '& .MuiSvgIcon-root': { color: 'white' }
                                                    }}
                                                />
                                            </FormControl>
                                        </Grid>
                                        
                                        {/* nonVolatileStatus */}
                                        {revealed[index] && !fainted[index] && (
                                            <Grid item xs={12} sm={6}>
                                                <FormControl fullWidth>
                                                    <Autocomplete
                                                        options={[{ name: "None" }, ...nonVolatileStatusList.map(status => ({ name: status }))]}
                                                        getOptionLabel={(option) => option.name}
                                                        value={
                                                            pokemonDetails[index].nonVolatileStatus
                                                                ? (pokemonDetails[index].nonVolatileStatus === "None"
                                                                    ? { name: "None" }
                                                                    : { name: pokemonDetails[index].nonVolatileStatus })
                                                                : null
                                                        }
                                                        onChange={(_, newValue) => updatePokemonDetail(index, 'nonVolatileStatus', newValue ? newValue.name : '')}
                                                        renderInput={(params) => (
                                                            <TextField 
                                                                {...params} 
                                                                label="Non‑Volatile Status" 
                                                                variant="outlined"
                                                                InputLabelProps={{ style: { color: 'white' } }}
                                                            />
                                                        )}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                                            '& .MuiSvgIcon-root': { color: 'white' }
                                                        }}
                                                    />
                                                </FormControl>
                                            </Grid>
                                        )}
                                        
                                        {/* Tera Type y Tera Active */}
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                <FormControl sx={{ flex: 1 }}>
                                                    <Autocomplete
                                                        options={teraTypes}
                                                        getOptionLabel={(option) => option || ''}
                                                        value={pokemonDetails[index].teraType || null}
                                                        onChange={(_, newValue) => updatePokemonDetail(index, 'teraType', newValue || '')}
                                                        renderInput={(params) => (
                                                            <TextField 
                                                                {...params} 
                                                                label="Tera Type" 
                                                                variant="outlined"
                                                                InputLabelProps={{ style: { color: 'white' } }}
                                                            />
                                                        )}
                                                        sx={{
                                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'white' } },
                                                            '& .MuiSvgIcon-root': { color: 'white' }
                                                        }}
                                                    />
                                                </FormControl>
                                                {/* Tera Active */}
                                                {pokemonDetails[index].teraType && !fainted[index] && revealed[index] && (
                                                    <FormControlLabel
                                                        control={
                                                            <TriStateCheckbox
                                                                value={pokemonDetails[index].teraActive}
                                                                onChange={(newValue) => updatePokemonDetail(index, 'teraActive', newValue)}
                                                                sx={{ color: 'white' }}
                                                            />
                                                        }
                                                        label="Tera Active"
                                                        sx={{ color: 'white' }}
                                                    />
                                                )}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Collapse>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleClearData} 
                    variant="outlined" 
                    color="warning"
                    sx={{ mr: 'auto' }}
                >
                    Clear Team
                </Button>
                <Button onClick={onClose} variant="contained" color="error">
                    Cancel
                </Button>
                <Button onClick={handleSelectTeam} variant="contained" color="success" disabled={!team.every(p => p)}>
                    Select Team
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TeamDialog;