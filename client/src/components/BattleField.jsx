import React, { useState } from 'react';
import { Box, Typography, Grid, Button, Paper } from '@mui/material';
import PokemonSprite from './PokemonSprite';
import PokemonDialog from './PokemonDialog';
import TeamDialog from './TeamDialog';  // nuevo componente de selección de equipo

const BattleField = ({ onPokemonSelect, onTeamSelectYour, onTeamSelectOpponent, pokemonList = [] }) => {
  // Estados existentes para los slots individuales...
  const [dialogOpen, setDialogOpen] = useState({
    topLeft: false,
    topRight: false,
    bottomLeft: false,
    bottomRight: false
  });
  const [selectedPokemon, setSelectedPokemon] = useState({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null
  });
  
  // Estados nuevos para equipos
  const [yourTeam, setYourTeam] = useState([]);
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState({ your: false, opponent: false });

  const handleOpenDialog = (position) => {
    setDialogOpen(prev => ({
      ...prev,
      [position]: true
    }));
  };

  const handleCloseDialog = (position) => {
    setDialogOpen(prev => ({
      ...prev,
      [position]: false
    }));
  };

  const handleSelectPokemon = (position, pokemonData) => {
    const newSelectedPokemon = {
      ...selectedPokemon,
      [position]: pokemonData
    };
    
    setSelectedPokemon(newSelectedPokemon);
    onPokemonSelect(newSelectedPokemon);
  };

  // Función para renderizar un slot de Pokémon individual (ya existente)
  const renderPokemonSlot = (position, label) => {
    const pokemon = selectedPokemon[position];
    return (
      <Paper
        elevation={3}
        onClick={() => handleOpenDialog(position)}
        sx={{
          height: 150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: '#1A1896',
          border: '2px solid #24CC9F',
          '&:hover': {
            backgroundColor: '#221FC7',
            transform: 'scale(1.02)',
            transition: 'all 0.2s ease-in-out'
          }
        }}
      >
        {pokemon ? (
          <>
            <PokemonSprite pokemon={{ name: pokemon.name }} size={80} />
            <Typography component="p" variant="subtitle1" sx={{ mt: 1 }}>
              {pokemon.name}
            </Typography>
            {pokemon.item && (
              <Typography variant="body2" sx={{ mt: 0.5, color: 'gold' }}>
                {pokemon.item}
              </Typography>
            )}
          </>
        ) : (
          <Typography component="p" variant="subtitle1">{label}</Typography>
        )}
      </Paper>
    );
  };

  // Función para renderizar la visualización del equipo completo
  const renderTeam = (team) => {
    return (
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', mt: 1 }}>
        {team.map((pokemon, idx) => (
          <Box key={idx} sx={{ cursor: 'pointer' }} title={pokemon?.name || ''}>
            {pokemon ? (
              <PokemonSprite pokemon={pokemon} size={60} />
            ) : null}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* Your Team Section */}
      <Typography component="p" variant="h6" align="center" sx={{ mb: 2 }}>
        Your Team
      </Typography>

      {/* Botón de selección de equipo - Ahora justo debajo del título */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() =>
            setTeamDialogOpen(prev => ({ ...prev, your: true }))
          }
        >
          Select Team
        </Button>
      </Box>

      {/* Visualización del equipo - Ahora separada del botón */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        {yourTeam.some(p => p) ? (
          renderTeam(yourTeam)
        ) : (
          <Typography variant="body2" color="white">
            No team selected
          </Typography>
        )}
      </Box>

      {/* Slots individuales para Pokémon */}
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          {renderPokemonSlot('topLeft', 'Select Left Pokémon')}
          <PokemonDialog
            open={dialogOpen.topLeft}
            onClose={() => handleCloseDialog('topLeft')}
            position="topLeft"
            onSelectPokemon={handleSelectPokemon}
            pokemonList={pokemonList}
          />
        </Grid>

        <Grid item xs={6}>
          {renderPokemonSlot('topRight', 'Select Right Pokémon')}
          <PokemonDialog
            open={dialogOpen.topRight}
            onClose={() => handleCloseDialog('topRight')}
            position="topRight"
            onSelectPokemon={handleSelectPokemon}
            pokemonList={pokemonList}
          />
        </Grid>
      </Grid>

      {/* Divider or Field Divider */}
      <Box
        sx={{
          height: 4,
          backgroundColor: '#24CC9F',
          mb: 4,
          borderRadius: 2,
          width: '100%'
        }}
      />

      {/* Opponent's Team Section */}
      <Typography component="p" variant="h6" align="center" sx={{ mb: 2 }}>
        Opponent's Team
      </Typography>

      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          {renderPokemonSlot('bottomLeft', 'Select Left Pokémon')}
          <PokemonDialog
            open={dialogOpen.bottomLeft}
            onClose={() => handleCloseDialog('bottomLeft')}
            position="bottomLeft"
            onSelectPokemon={handleSelectPokemon}
            pokemonList={pokemonList}
          />
        </Grid>

        <Grid item xs={6}>
          {renderPokemonSlot('bottomRight', 'Select Right Pokémon')}
          <PokemonDialog
            open={dialogOpen.bottomRight}
            onClose={() => handleCloseDialog('bottomRight')}
            position="bottomRight"
            onSelectPokemon={handleSelectPokemon}
            pokemonList={pokemonList}
          />
        </Grid>
      </Grid>

      {opponentTeam.length === 6 ? (
        renderTeam(opponentTeam)
      ) : (
        <Typography variant="body2" align="center">No team selected</Typography>
      )}
      <Box sx={{ textAlign: 'center', mt: 1, mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() =>
            setTeamDialogOpen(prev => ({ ...prev, opponent: true }))
          }
        >
          Select Team
        </Button>
      </Box>

      {/* Diálogos para seleccionar equipos */}
      <TeamDialog
        open={teamDialogOpen.your}
        onClose={() => setTeamDialogOpen(prev => ({ ...prev, your: false }))}
        onSelectTeam={(selectedTeam) => {
          console.log("Team selected in BattleField:", selectedTeam);
          // Llama al callback recibido desde TurnAssistantPage, si existe.
          if (typeof onTeamSelectYour === 'function') {
            onTeamSelectYour(selectedTeam);
          }
          // (Opcional) Actualiza el estado local, si se utiliza localmente
          setYourTeam(selectedTeam);
        }}
        pokemonList={pokemonList}
      />
      <TeamDialog
        open={teamDialogOpen.opponent}
        onClose={() => setTeamDialogOpen(prev => ({ ...prev, opponent: false }))}
        onSelectTeam={(selectedTeam) => {
          console.log("Opponent team selected in BattleField:", selectedTeam);
          if (typeof onTeamSelectOpponent === 'function') {
            onTeamSelectOpponent(selectedTeam);
          }
          setOpponentTeam(selectedTeam);
        }}
        pokemonList={pokemonList}
      />
    </Box>
  );
};

export default BattleField;