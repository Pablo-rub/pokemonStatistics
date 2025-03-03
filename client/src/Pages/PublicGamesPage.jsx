import React, { useState, useEffect } from "react";
import axios from "axios";
import { Paper, Typography, Box, Pagination, Checkbox, Tooltip } from "@mui/material";
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Favorite from '@mui/icons-material/Favorite';

// New Pokemon Sprite Component
const PokemonSprite = ({ pokemon }) => {
  const [imgSrc, setImgSrc] = useState(null);

  const formatPokemonName = (pokemonName) => {
    if (!pokemonName) return null;
    
    // Casos especiales que necesitan un manejo particular
    const specialCases = {
      'urshifu-rapid-strike': 'urshifu-rapidstrike',
      'indeedee-f': 'indeedee-f',
      'calyrex-ice': 'calyrex-ice',
      'calyrex-shadow': 'calyrex-shadow',
      'chien-pao': 'chienpao',
      'chi-yu': 'chiyu',
    };

    // Convertir el nombre a minúsculas y eliminar caracteres especiales
    let formattedName = pokemonName.toLowerCase()
      .replace(/[^a-z0-9\-]/g, ''); // Mantiene guiones para formas especiales

    // Comprobar si es un caso especial
    return specialCases[formattedName] || formattedName;
  };

  const getPokemonSprite = (pokemonName) => {
    if (!pokemonName) return null;
    
    const formattedName = formatPokemonName(pokemonName);

    // Intenta primero con los sprites animados
    const animatedUrl = `https://play.pokemonshowdown.com/sprites/gen5ani/${formattedName}.gif`;
    const staticUrl = `https://play.pokemonshowdown.com/sprites/gen5/${formattedName}.png`;
  
    return new Promise((resolve) => {
      const animatedImg = new Image();
      animatedImg.onload = () => resolve(animatedUrl);
      animatedImg.onerror = () => {
        const staticImg = new Image();
        staticImg.onload = () => resolve(staticUrl);
        staticImg.onerror = () => resolve(null);
        staticImg.src = staticUrl;
      };
      animatedImg.src = animatedUrl;
    });
  };

  useEffect(() => {
    if (pokemon?.name) {
      getPokemonSprite(pokemon.name).then(url => setImgSrc(url));
    }
  }, [pokemon?.name]);

  return (
    <Tooltip title={pokemon?.name || "Unknown"} arrow>
      <Box sx={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {pokemon?.name ? (
          <img 
            src={imgSrc}
            alt={pokemon.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              e.target.onerror = null;
              const parent = e.target.parentNode;
              const textElement = document.createElement('span');
              textElement.textContent = pokemon.name;
              textElement.style.fontSize = '10px';
              textElement.style.textAlign = 'center';
              textElement.style.wordBreak = 'break-word';
              parent.replaceChild(textElement, e.target);
            }}
          />
        ) : (
          <Box sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '2px solid #000000',
            backgroundColor: 'transparent'
          }} />
        )}
      </Box>
    </Tooltip>
  );
};

function PublicGamesPage() {
  const [games, setGames] = useState([]);
  const [numGames, setNumGames] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Fetch total number of replays from backend
  const fetchTotalCount = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/games/count");
      setNumGames(response.data.numGames);
    } catch (error) {
      console.error("Error fetching total count:", error);
    }
  };

  // Fetch only the replays for the current page
  const fetchPublicGames = async (page) => {
    try {
      const response = await axios.get("http://localhost:5000/api/games", {
        params: { page, limit: itemsPerPage },
      });
      setGames(response.data);
    } catch (error) {
      console.error("Error fetching public games:", error);
    }
  };

  useEffect(() => {
    // On initial load, get the total count of replays
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchPublicGames(currentPage);
  }, [currentPage]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const totalPages = numGames !== null ? Math.ceil(numGames / itemsPerPage) : 0;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Public Games
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        Total Replays: {numGames === null ? "Cargando..." : numGames}
      </Typography>
      {games.map((game) => (
        <Paper 
          key={game.replay_id} 
          sx={{ 
            padding: 2, 
            marginBottom: 2,
            cursor: 'pointer', // Add pointer cursor
            '&:hover': {      // Add hover effect
              boxShadow: 6,
              transform: 'scale(1.005)',
              transition: 'all 0.2s ease-in-out',
            },
          }}
          onClick={(e) => {
            // Only open link if we didn't click the checkbox
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
      ))}
      {totalPages > 1 && (
        <Pagination
          count={totalPages}
          page={currentPage}
          onChange={handlePageChange}
          color="primary"
          sx={{ marginTop: 2, display: "flex", justifyContent: "center" }}
        />
      )}
    </Box>
  );
}

export default PublicGamesPage;