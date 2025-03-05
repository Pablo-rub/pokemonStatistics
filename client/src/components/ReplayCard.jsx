import React, { useState, useEffect } from "react";
import { Paper, Typography, Box, Checkbox } from "@mui/material";
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';
import PokemonSprite from "./PokemonSprite";
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

// todo
// fix date

const ReplayCard = ({ game }) => {
  const { currentUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Check if replay is saved for current user
    const checkSavedStatus = async () => {
      if (!currentUser) return;
      try {
        const response = await axios.get(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays`);
        setIsSaved(response.data.some(replay => replay.replay_id === game.replay_id));
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };
    checkSavedStatus();
  }, [currentUser, game.replay_id]);

  const handleSaveToggle = async () => {
    if (!currentUser) return;

    try {
      if (isSaved) {
        await axios.delete(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays/${game.replay_id}`);
      } else {
        await axios.post(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays`, {
          replayId: game.replay_id
        });
      }
      setIsSaved(!isSaved);
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

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
      onClick={(e) => {
        if (!e.target.closest('.MuiCheckbox-root')) {
          window.open(`https://replay.pokemonshowdown.com/${game.replay_id}`, '_blank');
        }
      }}
      variant="replay"
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
        {currentUser && (
          <Checkbox 
            icon={<FavoriteBorder />} 
            checkedIcon={<Favorite />}
            checked={isSaved}
            onChange={handleSaveToggle}
            className="MuiCheckbox-root"
            sx={{
              color: '#000000',
              '&.Mui-checked': {
                color: '#000000',
              },
            }}
          />
        )}
      </Box>
    </Paper>
  );
};

export default ReplayCard;