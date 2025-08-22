function formatTimeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

// Helper function to analyze matching scenarios
function analyzeMatchingScenarios(scenarios, yourPokemon, yourItems = {}, yourAbilities = {}) {
  console.log("Analyzing scenarios:", scenarios.length);
  
  // Count total games and wins
  const totalGames = scenarios.length;
  const wins = scenarios.filter(s => s.your_team_won).length;
  const winRate = (wins / totalGames) * 100;

  // Track move frequency and win rates
  const moveStats = {
    [yourPokemon[0]]: {},
    [yourPokemon[1]]: {}
  };

  // Track combinations of moves
  const moveComboStats = {};

  // Primero, construimos un objeto que asocia el nombre del Pokémon con su tipo de tera (si está activo)
  const teraInfo = {};
  // Suponiendo que cada escenario incluye un array 'playerX_revealed' con objetos que incluyen { name, tera }
  scenarios.forEach(scenario => {
    // Determinar de qué lado están "tus" Pokémon (por ejemplo, 'player1' o 'player2')
    const yourSide = scenario.player1_pokemon.includes(yourPokemon[0]) ? "player1" : "player2";
    if (Array.isArray(scenario[`${yourSide}_revealed`])) {
      scenario[`${yourSide}_revealed`].forEach(pokemon => {
        // Asegurarse de que pokemon es un objeto con la propiedad name y tera
        if (pokemon && pokemon.name && yourPokemon.includes(pokemon.name) && pokemon.tera && pokemon.tera.active) {
          // Guarda el tipo; si no hay tipo definido se dejará como cadena vacía
          teraInfo[pokemon.name] = pokemon.tera.type || "";
        }
      });
    }
  });

  // For each scenario, analyze the moves used
  scenarios.forEach(scenario => {
    try {
      // Determine which player has your Pokémon
      let yourSide, opponentSide;
      
      // Check if your Pokémon are on player1's side
      if (Array.isArray(scenario.player1_pokemon) &&
          scenario.player1_pokemon.includes(yourPokemon[0]) && 
          scenario.player1_pokemon.includes(yourPokemon[1])) {
        yourSide = "player1";
        opponentSide = "player2";
      } else {
        yourSide = "player2";
        opponentSide = "player1";
      }
      
      // Get your Pokémon positions in the array
      const pokemonPositions = {};
      scenario[`${yourSide}_pokemon`].forEach((pokemon, index) => {
        if (yourPokemon.includes(pokemon)) {
          pokemonPositions[pokemon] = index;
        }
      });
      
      // Get Tera status for your Pokémon
      const teraStatus = {};
      if (Array.isArray(scenario[`${yourSide}_revealed`])) {
        scenario[`${yourSide}_revealed`].forEach(pokemon => {
          if (pokemon && yourPokemon.includes(pokemon.name)) {
            teraStatus[pokemon.name] = pokemon.tera && pokemon.tera.active === true;
          }
        });
      }
      
      // Get the moves corresponding to each of your Pokémon based on their position
      for (const pokemon of yourPokemon) {
        const position = pokemonPositions[pokemon];
        
        if (position !== undefined && 
            Array.isArray(scenario[`${yourSide}_moves`]) && 
            position < scenario[`${yourSide}_moves`].length) {
          
          // Get the exact move text from the database
          let moveText = scenario[`${yourSide}_moves`][position];
          
          // Skip if move is empty
          if (!moveText) continue;
          
          // Add Tera indicator if the Pokémon has Terastallized
          if (teraStatus[pokemon]) {
            moveText = `${moveText} (Tera)`;
          }

          // Si el Pokémon tiene terastallizado (la lógica original podría usar un objeto teraStatus booleado)
          if (teraInfo[pokemon] !== undefined) {
            const type = teraInfo[pokemon];
            // Si ya se añadió "(Tera)" previamente, se elimina para que quede solo la versión detallada
            moveText = type ? `${moveText.replace(" (Tera)", "")} (Tera ${type})` : `${moveText.replace(" (Tera)", "")} (Tera)`;
          }
          
          // Track move usage and win rates
          if (!moveStats[pokemon][moveText]) {
            moveStats[pokemon][moveText] = { total: 0, wins: 0 };
          }
          
          moveStats[pokemon][moveText].total++;
          if (scenario.your_team_won) {
            moveStats[pokemon][moveText].wins++;
          }
        }
      }
      
      // Track move combinations between your two Pokémon
      const pokemon1 = yourPokemon[0];
      const pokemon2 = yourPokemon[1];
      const pos1 = pokemonPositions[pokemon1];
      const pos2 = pokemonPositions[pokemon2];
      
      if (pos1 !== undefined && pos2 !== undefined && 
          Array.isArray(scenario[`${yourSide}_moves`]) && 
          pos1 < scenario[`${yourSide}_moves`].length && 
          pos2 < scenario[`${yourSide}_moves`].length) {
        
        // Get move texts for both Pokémon
        let move1 = scenario[`${yourSide}_moves`][pos1];
        let move2 = scenario[`${yourSide}_moves`][pos2];
        
        // Skip if either move is empty
        if (!move1 || !move2) return;
        
        // Add Tera indicators
        if (teraStatus[pokemon1]) move1 = `${move1} (Tera)`;
        if (teraStatus[pokemon2]) move2 = `${move2} (Tera)`;

        // Si el Pokémon tiene terastallizado (la lógica original podría usar un objeto teraStatus booleado)
        if (teraInfo[pokemon1] !== undefined) {
          const type = teraInfo[pokemon1];
          // Si ya se añadió "(Tera)" previamente, se elimina para que quede solo la versión detallada
          move1 = type ? `${move1.replace(" (Tera)", "")} (Tera ${type})` : `${move1.replace(" (Tera)", "")} (Tera)`;
        }
        if (teraInfo[pokemon2] !== undefined) {
          const type = teraInfo[pokemon2];
          // Si ya se añadió "(Tera)" previamente, se elimina para que quede solo la versión detallada
          move2 = type ? `${move2.replace(" (Tera)", "")} (Tera ${type})` : `${move2.replace(" (Tera)", "")} (Tera)`;
        }
        
        // Create a unique key for this move combination
        const comboKey = `${move1}:${move2}`;
        
        if (!moveComboStats[comboKey]) {
          moveComboStats[comboKey] = { 
            total: 0, 
            wins: 0,
            move1: move1,
            move2: move2,
            pokemon1: pokemon1,
            pokemon2: pokemon2
          };
        }
        
        moveComboStats[comboKey].total++;
        if (scenario.your_team_won) {
          moveComboStats[comboKey].wins++;
        }
      }
    } catch (err) {
      console.error("Error analyzing scenario:", err);
    }
  });

  // Convert move stats to array format with win rates for all moves
  const allMoves = {};
  
  for (const pokemon of yourPokemon) {
    allMoves[pokemon] = Object.keys(moveStats[pokemon])
      .map(move => ({
        move,
        total: moveStats[pokemon][move].total,
        wins: moveStats[pokemon][move].wins,
        winRate: (moveStats[pokemon][move].wins / moveStats[pokemon][move].total) * 100
      }))
      .sort((a, b) => b.winRate - a.winRate || b.total - a.total); // Sort by win rate, then by usage
  }

  // Find best move combinations
  const bestCombos = Object.keys(moveComboStats)
    .filter(combo => moveComboStats[combo].total >= 1) // Only consider combos with enough samples
    .sort((a, b) => {
      // Sort primarily by win rate, secondarily by number of games
      const winRateA = (moveComboStats[a].wins / moveComboStats[a].total) * 100;
      const winRateB = (moveComboStats[b].wins / moveComboStats[b].total) * 100;
      return winRateB - winRateA || moveComboStats[b].total - moveComboStats[a].total;
    })
    .slice(0, 10) // Take top 10 combinations instead of top 5
    .map(combo => ({
      move1: moveComboStats[combo].move1,
      move2: moveComboStats[combo].move2,
      pokemon1: moveComboStats[combo].pokemon1,
      pokemon2: moveComboStats[combo].pokemon2,
      games: moveComboStats[combo].total,
      wins: moveComboStats[combo].wins,
      winRate: (moveComboStats[combo].wins / moveComboStats[combo].total) * 100
    }));

  return {
    totalGames,
    winRate,
    allMoveOptions: allMoves,
    topCombinations: bestCombos
  };
}

module.exports = {
  formatTimeSince,
  analyzeMatchingScenarios
};
