import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Autocomplete,
    TextField,
    Button,
    Alert,
} from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';

const TeamDialog = ({ open, onClose, onSelectTeam, pokemonList = [] }) => {
    const [team, setTeam] = useState(Array(6).fill(null));
    const [searchTerms, setSearchTerms] = useState(Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const [localPokemonList, setLocalPokemonList] = useState([]);
    const [error, setError] = useState('');

    // Normalizar la lista de Pokémon: asegurarse que todos son objetos con propiedad 'name'
    useEffect(() => {
        if (pokemonList && pokemonList.length > 0) {
            // Convertir strings a objetos si es necesario
            const normalizedList = pokemonList.map(pokemon => 
                typeof pokemon === 'string' ? { name: pokemon } : pokemon
            );
            setLocalPokemonList(normalizedList);
        } else {
            setLoading(true);
            fetch('https://pokeapi.co/api/v2/pokemon?limit=1000')
                .then(res => res.json())
                .then(data => {
                    setLocalPokemonList(data.results || []);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching Pokémon:", err);
                    setLoading(false);
                });
        }
    }, [pokemonList]);

    const handleChange = (index, newValue) => {
        // Si el valor es null (borrar selección), permitirlo siempre
        if (!newValue) {
            const newTeam = [...team];
            newTeam[index] = newValue;
            setTeam(newTeam);
            setError('');
            return;
        }

        // Verificar si el Pokémon ya existe en otro slot del equipo
        const alreadyExists = team.some((pokemon, i) => 
            i !== index && 
            pokemon && 
            ((pokemon.name === newValue.name) || 
             (pokemon.name === newValue) || 
             (pokemon === newValue.name) ||
             (pokemon === newValue))
        );

        if (alreadyExists) {
            setError(`${newValue.name || newValue} ya está en tu equipo. No puedes seleccionar el mismo Pokémon dos veces.`);
            return;
        }

        // Si no existe, añadirlo al equipo
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
            onSelectTeam(team);
            onClose();
            //uncomment to reset everytime you enter
            //setTeam(Array(6).fill(null));
            //setSearchTerms(Array(6).fill(''));
            setError('');
        }
    };

    const filterOptions = createFilterOptions({
        matchFrom: 'start',
        stringify: (option) => (option && option.name ? option.name : ''),
    });

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Select Team</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Grid item xs={6} key={i}>
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
                                value={team[i]}
                                onChange={(event, newValue) => handleChange(i, newValue)}
                                inputValue={searchTerms[i]}
                                onInputChange={(event, newInputValue) => handleSearchChange(i, newInputValue)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={`Slot ${i + 1}`}
                                        variant="outlined"
                                        fullWidth
                                    />
                                )}
                                sx={{
                                    mt: 1,
                                }}
                            />
                        </Grid>
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