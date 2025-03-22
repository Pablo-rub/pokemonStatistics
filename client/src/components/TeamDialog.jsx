import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Autocomplete, Box, 
    Typography, Grid, Alert, Paper, FormControlLabel, Checkbox
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { createFilterOptions } from '@mui/material/Autocomplete';
import useDraggable from '../hooks/useDraggable';

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

    useEffect(() => {
        setLocalPokemonList(pokemonList);
    }, [pokemonList]);

    const handleChange = (index, newValue) => {
        const newTeam = [...team];
        newTeam[index] = newValue;
        setTeam(newTeam);
        setError('');
    };

    const handleSearchChange = (index, newSearch) => {
        const newSearchTerms = [...searchTerms];
        newSearchTerms[index] = newSearch;
        setSearchTerms(newSearchTerms);
    };

    const handleSubmit = () => {
        if (team.every(p => p)) {
            // Incluir información de revealed y fainted en el equipo
            const teamWithMetadata = team.map((pokemon, index) => ({
                ...pokemon,
                revealed: revealed[index] || false,
                fainted: fainted[index] || false
            }));
            
            onSelectTeam(teamWithMetadata);
            onClose();
            setError('');
        }
    };

    // Actualizar la función handleRevealedChange para limitar a 4 Pokémon revelados
    const handleRevealedChange = (index, value) => {
        // Si estamos intentando marcar un nuevo Pokémon como revelado
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
        matchFrom: 'start',
        stringify: (option) => (option && option.name ? option.name : ''),
    });

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            fullWidth 
            maxWidth="sm"
            PaperComponent={DraggablePaperComponent}
        >
            <DialogTitle id="draggable-dialog-title" style={{ cursor: 'grab' }}>
                Select Team
            </DialogTitle>
            <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto', pt: 5 }}>
                {/* Spacer box to ensure content doesn't get cut off */}
                <Box sx={{ height: 12 }} />
                
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    {team.map((pokemon, index) => (
                        <Box key={index} sx={{ mb: 2, width: '100%' }}>
                            {/* Selector existente para el Pokémon */}
                            <Autocomplete
                                options={localPokemonList}
                                getOptionLabel={(option) => (option && option.name ? option.name : (typeof option === 'string' ? option : ''))}
                                filterOptions={filterOptions}
                                isOptionEqualToValue={(option, value) =>
                                    option && value ? 
                                        (option.name === value.name || 
                                         option === value || 
                                         option.name === value || 
                                         option === value.name) : false
                                }
                                loading={loading}
                                value={team[index]}
                                onChange={(event, newValue) => handleChange(index, newValue)}
                                inputValue={searchTerms[index]}
                                onInputChange={(event, newInputValue) => handleSearchChange(index, newInputValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={`Slot ${index + 1}`}
                                        variant="outlined"
                                        fullWidth
                                    />
                                )}
                                sx={{
                                    mt: 1,
                                }}
                            />
                            {/* Checkboxes adicionales */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                                <FormControlLabel
                                    control={
                                        <WhiteCheckbox
                                            checked={revealed[index] || false}
                                            onChange={(e) => handleRevealedChange(index, e.target.checked)}
                                            disabled={
                                                Object.values(revealed).filter(isRevealed => isRevealed).length >= 4 && 
                                                !revealed[index]
                                            }
                                        />
                                    }
                                    label="Revealed"
                                    sx={{ color: 'white' }}
                                />
                                <FormControlLabel
                                    control={
                                        <WhiteCheckbox
                                            checked={fainted[index] || false}
                                            onChange={(e) => handleFaintedChange(index, e.target.checked)}
                                            disabled={!revealed[index]} // Deshabilitar si no está revelado
                                        />
                                    }
                                    label="Fainted"
                                    sx={{ color: 'white' }}
                                />
                            </Box>
                        </Box>
                    ))}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained" color="error">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} variant="contained" color="success" disabled={!team.every(p => p)}>
                    Select Team
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TeamDialog;