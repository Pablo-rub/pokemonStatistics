import React, { useState, useEffect } from "react";
import { Box, Tooltip } from "@mui/material";

const PokemonSprite = ({ pokemon }) => {
  const [imgSrc, setImgSrc] = useState(null);

  const getPokemonSprite = (pokemonName) => {
    if (!pokemonName) return null;
    
    // Mapa de nombres especiales que requieren formateo específico
    const specialNames = {
      'Urshifu-Rapid-Strike': 'urshifu-rapidstrike',
      'Chien-Pao': 'chienpao',
      'Chi-Yu': 'chiyu',
      'Ho-Oh': 'hooh',
      'Ting-Lu': 'tinglu',
      'Wo-Chien': 'wochien',
      'Necrozma-Dawn-Wings': 'necrozma-dawnwings',
    };

    // Comprobar si es un caso especial
    const formattedName = specialNames[pokemonName] || 
                         pokemonName.toLowerCase()
                                  .replace(/[^a-z0-9-]/g, '');

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

export default PokemonSprite;