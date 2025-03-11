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
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

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
        setMessage('Replay removed');
      } else {
        await axios.post(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays`, {
          replayId: game.replay_id
        });
        setMessage('Replay saved');
      }
      setIsSaved(!isSaved);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 2000);
    } catch (error) {
      console.error('Error toggling save:', error);
      setMessage('Error');
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 2000);
    }
  };

  const formatDate = (timestamp) => {
    try {
      // Handle if timestamp is an object with a value property
      const dateStr = typeof timestamp === 'object' && timestamp.value 
        ? timestamp.value 
        : timestamp;

      const date = new Date(dateStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", timestamp);
        return "Unknown";
      }

      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
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
          <Box sx={{ position: 'relative' }}>
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
            {showMessage && (
              <Typography
                sx={{
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}
              >
                {message}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ReplayCard;