import React from "react";
import { Paper, Typography, Box, Checkbox } from "@mui/material";
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import PokemonSprite from "./PokemonSprite";

// todo
// fix date

const ReplayCard = ({ game }) => {
  const formatDate = (timestamp) => {
    try {
      // Convert BigQuery timestamp (microseconds) to milliseconds
      const date = new Date(parseInt(timestamp) / 1000);
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown";
    }
  };

  return (
    <Paper 
      sx={{ 
        padding: 2, 
        marginBottom: 2,
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 6,
          transform: 'scale(1.005)',
          transition: 'all 0.2s ease-in-out',
        },
      }}
      onClick={(e) => {
        if (!e.target.closest('.MuiCheckbox-root')) {
          window.open(`https://replay.pokemonshowdown.com/${game.replay_id}`, '_blank');
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2
      }}>
        {/* Left side - Player names and rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle1" color="textSecondary">
            Players: {game.player1} vs {game.player2}
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Rating: {game.rating ? game.rating : "Unknown"}
          </Typography><Typography variant="subtitle1" color="textSecondary">
            Date: {game.date ? formatDate(game.date) : "Unknown"}
          </Typography>
        </Box>

        {/* Middle - Pokemon sprites */}
        <Box sx={{ 
          display: 'flex',
          gap: 4,
          flex: 1,
          justifyContent: 'center'
        }}>
          {/* Player 1 Pokemon */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {game.teams?.p1?.map((pokemon, index) => (
              <PokemonSprite key={`p1-${index}`} pokemon={pokemon} />
            ))}
          </Box>

          {/* Player 2 Pokemon */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {game.teams?.p2?.map((pokemon, index) => (
              <PokemonSprite key={`p2-${index}`} pokemon={pokemon} />
            ))}
          </Box>
        </Box>

        {/* Right side - Heart checkbox */}
        <Checkbox 
          icon={<FavoriteBorder />} 
          checkedIcon={<Favorite />}
          className="MuiCheckbox-root"
          sx={{
            color: '#000000',
            '&.Mui-checked': {
              color: '#000000',
            },
          }}
        />
      </Box>
    </Paper>
  );
};

export default ReplayCard;