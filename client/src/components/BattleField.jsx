import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography,
  Grid
} from '@mui/material';
import PokemonDialog from './PokemonDialog';
import PokemonSprite from './PokemonSprite';

const BattleField = ({ onPokemonSelect }) => {
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

  const handleSelectPokemon = (position, pokemon) => {
    const newSelectedPokemon = {
      ...selectedPokemon,
      [position]: pokemon
    };
    
    setSelectedPokemon(newSelectedPokemon);
    onPokemonSelect(newSelectedPokemon);
  };

  // Helper function to render a Pokémon slot
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
            <PokemonSprite pokemon={{ name: pokemon }} size={80} />
            <Typography variant="subtitle1" sx={{ mt: 1 }}>
              {pokemon}
            </Typography>
          </>
        ) : (
          <Typography variant="subtitle1">
            {label}
          </Typography>
        )}
      </Paper>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {/* Player's (Your) Pokémon */}
      <Typography variant="h6" align="center" sx={{ mb: 2 }}>
        Your Team
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          {renderPokemonSlot('topLeft', 'Select Left Pokémon')}
          <PokemonDialog
            open={dialogOpen.topLeft}
            onClose={() => handleCloseDialog('topLeft')}
            position="topLeft"
            onSelectPokemon={handleSelectPokemon}
          />
        </Grid>
        <Grid item xs={6}>
          {renderPokemonSlot('topRight', 'Select Right Pokémon')}
          <PokemonDialog
            open={dialogOpen.topRight}
            onClose={() => handleCloseDialog('topRight')}
            position="topRight"
            onSelectPokemon={handleSelectPokemon}
          />
        </Grid>
      </Grid>

      {/* Field divider */}
      <Box 
        sx={{ 
          height: 4, 
          backgroundColor: '#24CC9F', 
          mb: 4, 
          borderRadius: 2,
          width: '100%'
        }} 
      />

      {/* Opponent's Pokémon */}
      <Typography variant="h6" align="center" sx={{ mb: 2 }}>
        Opponent's Team
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={6}>
          {renderPokemonSlot('bottomLeft', 'Select Left Pokémon')}
          <PokemonDialog
            open={dialogOpen.bottomLeft}
            onClose={() => handleCloseDialog('bottomLeft')}
            position="bottomLeft"
            onSelectPokemon={handleSelectPokemon}
          />
        </Grid>
        <Grid item xs={6}>
          {renderPokemonSlot('bottomRight', 'Select Right Pokémon')}
          <PokemonDialog
            open={dialogOpen.bottomRight}
            onClose={() => handleCloseDialog('bottomRight')}
            position="bottomRight"
            onSelectPokemon={handleSelectPokemon}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default BattleField;