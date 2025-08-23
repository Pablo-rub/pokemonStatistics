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

  // Nota: no precomputamos tipo de Tera globalmente (provocaría usar siempre el mismo tipo).
  // El tipo de Tera se evaluará por separado en cada escenario (más abajo) para que
  // escenarios con diferentes teratypes se muestren correctamente.
  // (dejamos sin valor una posible variable teraInfo global)
  const teraInfo = {};

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
      
      // Por cada escenario calculamos:
      // - teraStatus[pokemonName] => si ese Pokémon ha terastallizado en ESTE escenario
      // - teraType[pokemonName] => el tipo de Tera active en ESTE escenario (o null)
      const teraStatus = {};
      const teraType = {};
      ['player1_revealed', 'player2_revealed'].forEach(sideRevealed => {
        if (!Array.isArray(scenario[sideRevealed])) return;
        scenario[sideRevealed].forEach(pokemon => {
          if (!pokemon || !pokemon.name) return;
          if (!yourPokemon.includes(pokemon.name)) return;
          const active = !!(pokemon.tera && pokemon.tera.active === true);
          teraStatus[pokemon.name] = active;
          teraType[pokemon.name] = active ? (pokemon.tera.type || null) : null;
        });
      });
      
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
          
          // Añadir nota de Tera solo si en ESTE escenario ese Pokémon ha terastallizado
          if (teraStatus[pokemon]) {
            const type = teraType[pokemon];
            moveText = type
              ? `${moveText} (Tera ${type} active)`
              : `${moveText} (Tera active)`;
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
        
        // Añadir nota de Tera solo si en ESTE escenario ese Pokémon ha terastallizado
        if (teraStatus[pokemon1]) {
          const type = teraType[pokemon1];
          move1 = type ? `${move1} (Tera ${type} active)` : `${move1} (Tera active)`;
        }
        if (teraStatus[pokemon2]) {
          const type = teraType[pokemon2];
          move2 = type ? `${move2} (Tera ${type} active)` : `${move2} (Tera active)`;
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

// Function to parse usage data from Smogon
function parseUsageData(text) {
  const usageData = [];
  const lines = text.split('\n');
  
  // Find the start of the data section
  let dataStartLine = 0;
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('| Rank | Pokemon') && lines[i].includes('| Usage %')) {
          dataStartLine = i + 2; // Start 2 lines after the header
          break;
      }
  }
  
  // Parse each data line
  for (let i = dataStartLine; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && !line.startsWith('+-')) {
          // Parse line like: "| 1 | Urshifu-Rapid-Strike | 32.27% |"
          const parts = line.split('|').filter(part => part.trim());
          if (parts.length >= 3) {
              const rank = parts[0].trim();
              const name = parts[1].trim();
              // Extract percentage without % symbol
              const usageMatch = parts[2].trim().match(/([0-9.]+)%/);
              if (usageMatch) {
                  const usagePercentage = parseFloat(usageMatch[1]);
                  usageData.push({
                      rank,
                      name,
                      usagePercentage
                  });
              }
          }
      }
      
      // Stop parsing when we reach the end of the data table
      if (line.startsWith('+-')) {
          const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
          if (!nextLine.startsWith('|')) {
              break;
          }
      }
  }
  
  return usageData;
}

// Function to combine usage data with moveset details
function combineData(usageData, movesetData) {
  const result = {
      data: {}
  };
  
  // First, add all Pokemon from the usage data to maintain the correct order
  for (const pokemon of usageData) {
      const movesetInfo = movesetData.data[pokemon.name] || {};
      
      // Create entry with usage data and any available moveset data
      result.data[pokemon.name] = {
          ...movesetInfo,
          // Keep the usage percentage as is - don't multiply again
          usage: pokemon.usagePercentage,
          rank: parseInt(pokemon.rank)
      };
  }
  
  return result;
}

// Function to parse moveset data from Smogon with correct teammate and spread handling
function parseMovesetText(text) {
  const pokemonData = {};
  
  try {
      // Modified regex to only match actual Pokémon headers
      const pokemonRegex = /\+[-]{40,}\+\s*\n\s*\| ([^|]+?) \|\s*\n\s*\+[-]{40,}\+/g;
      
      // Get all Pokémon header positions
      const pokemonPositions = [];
      let match;
      while ((match = pokemonRegex.exec(text)) !== null) {
          pokemonPositions.push({
              name: match[1].trim(),
              position: match.index
          });
      }
      
      // Process each Pokémon block
      for (let i = 0; i < pokemonPositions.length; i++) {
          const pokemonName = pokemonPositions[i].name;
          
          // Skip "Checks and Counters" section headers
          if (pokemonName === "Checks and Counters") continue;
          
          const startPos = pokemonPositions[i].position;
          const endPos = (i < pokemonPositions.length - 1) ? 
                          pokemonPositions[i + 1].position : 
                          text.length;
          
          const pokemonBlock = text.substring(startPos, endPos);
          
          // Initialize data structure
          const data = {
              rawCount: 0,
              avgWeight: 0,
              viabilityCeiling: 0,
              usage: 0,
              Abilities: {},
              Items: {},
              Spreads: {},
              Moves: {},
              "Tera Types": {},
              Teammates: {},
              "Checks and Counters": {}
          };
          
          // Extract basic data
          const rawCountMatch = pokemonBlock.match(/\| Raw count: (\d+)/);
          if (rawCountMatch) {
              data.rawCount = parseInt(rawCountMatch[1]);
          }
          
          const weightMatch = pokemonBlock.match(/\| Avg\. weight: ([0-9.e-]+)/);
          if (weightMatch) {
              data.avgWeight = parseFloat(weightMatch[1]);
              data.usage = parseFloat((data.avgWeight * 100).toFixed(2)); // Convert to percentage
          }
          
          const ceilingMatch = pokemonBlock.match(/\| Viability Ceiling: (\d+)/);
          if (ceilingMatch) {
              data.viabilityCeiling = parseInt(ceilingMatch[1]);
          }
          
          // Process each section separately
          const sectionHeaders = [
              "Abilities", 
              "Items", 
              "Spreads", 
              "Moves", 
              "Tera Types", 
              "Teammates", 
              "Checks and Counters"
          ];
          
          for (const section of sectionHeaders) {
              // Find the section start position
              const sectionStartIndex = pokemonBlock.indexOf(`| ${section}`);
              if (sectionStartIndex === -1) continue;
              
              // Find the section end position (next section or end of block)
              let sectionEndIndex = pokemonBlock.length;
              for (const nextSection of sectionHeaders) {
                  if (nextSection === section) continue;
                  
                  const nextSectionIndex = pokemonBlock.indexOf(`| ${nextSection}`, sectionStartIndex);
                  if (nextSectionIndex !== -1 && nextSectionIndex < sectionEndIndex) {
                      sectionEndIndex = nextSectionIndex;
                  }
              }
              
              // Extract section content
              const sectionContent = pokemonBlock.substring(sectionStartIndex, sectionEndIndex);
              const sectionLines = sectionContent.split('\n');
              
              // Process each line in the section
              for (let j = 1; j < sectionLines.length; j++) { // Skip the header line
                  const line = sectionLines[j].trim();
                  if (!line || !line.includes('%') || !line.includes('|')) continue;
                  
                  let match;
                  if (section === "Spreads") {
                      match = line.match(/\|\s*([^|]+?)\s+([0-9.]+)%/);
                  } else if (section === "Teammates") {
                      match = line.match(/\|\s*([^|0-9]+?)\s+([0-9.]+)%/);
                  } else {
                      match = line.match(/\|\s*([^|0-9]+?)\s+([0-9.]+)%/);
                  }
                  
                  if (match) {
                      const name = match[1].trim();
                      const percentage = parseFloat(match[2]);
                      data[section][name] = percentage;
                  }
              }
          }
          
          // Store processed data
          pokemonData[pokemonName] = data;
      }
  } catch (error) {
      console.error("Error parsing moveset data:", error);
      console.error(error.stack);
  }
  
  return { data: pokemonData };
}

module.exports = {
  formatTimeSince,
  analyzeMatchingScenarios,
  parseUsageData,
  combineData,
  parseMovesetText
};
