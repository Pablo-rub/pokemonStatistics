const { BigQuery } = require('@google-cloud/bigquery');
const express = require("express");
const axios = require('axios');
const cors = require("cors");
const cheerio = require('cheerio');
const obtainGameDataRouter = require('./obtainGameData');

require('dotenv').config();

// Initialize express
const app = express();
app.use(cors());
app.use(express.json());

// Enable CORS for all requests
app.use(cors());

// Enable parsing of JSON bodies
app.use(express.json());

const keyFilename = "C:/Users/pablo/Documents/pokemonStatistics/pokemonStatistics/credentials.json";

// Initialize the BigQuery client
const bigQuery = new BigQuery({keyFilename});

// Show when server is running
app.get('/', (req, res) => {
    res.send('Server running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening in port number ${PORT}`);
});

// Endpoint to get the total number of games
app.get('/api/games/count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS number_games FROM `pokemon-statistics.pokemon_replays.replays`';
        const [rows] = await bigQuery.query(query);
        console.log('Count result:', rows[0].number_games);
        res.json({ numGames: parseInt(rows[0].number_games) });
    } catch (error) {
        console.error("Error fetching data from BigQuery:", error);
        res.status(500).json({ error: "Error retrieving data" });
    }
});

// Modify the /api/games endpoint
app.get('/api/games', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const sortBy = req.query.sortBy || 'date DESC';
    const playerFilter = req.query.playerFilter || '';
    const ratingFilter = req.query.ratingFilter || 'all';
    const dateFilter = req.query.dateFilter || 'all';
    const userId = req.query.userId;
    const showSaved = req.query.showSaved || 'all';
    const offset = (page - 1) * limit;

    let whereClause = [];
    let joinClause = '';

    // Filtro para partidas no guardadas
    if (userId && showSaved === 'unsaved') {
      joinClause = `
        LEFT JOIN (
          SELECT replay_id 
          FROM \`pokemon-statistics.pokemon_replays.saved_replays\`,
          UNNEST(replays_saved) as replays
          WHERE user_id = '${userId}'
        ) saved ON r.replay_id = saved.replay_id
      `;
      whereClause.push('saved.replay_id IS NULL');
    }

    // Nuevo: Filtro para partidas guardadas
    if (userId && showSaved === 'saved') {
      joinClause = `
        INNER JOIN (
          SELECT replay_id 
          FROM \`pokemon-statistics.pokemon_replays.saved_replays\`,
          UNNEST(replays_saved) as replays
          WHERE user_id = '${userId}'
        ) saved ON r.replay_id = saved.replay_id
      `;
    }

    let orderBy = 'date DESC';

    // Sort clause
    if (sortBy === 'date ASC') orderBy = 'date ASC';
    else if (sortBy === 'date DESC') orderBy = 'date DESC';
    else if (sortBy === 'rating ASC') orderBy = 'rating ASC';
    else if (sortBy === 'rating DESC') orderBy = 'rating DESC';

    // Player filter
    if (playerFilter) {
      whereClause.push(`(LOWER(player1) LIKE LOWER('%${playerFilter}%') OR LOWER(player2) LIKE LOWER('%${playerFilter}%'))`);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'unknown') {
        whereClause.push('rating IS NULL');
      } else {
        const ratingValue = parseInt(ratingFilter.replace('+', ''));
        whereClause.push(`rating >= ${ratingValue}`);
      }
    }

    // Date filter
    if (dateFilter !== 'all') {
      let dateLimit;
      const now = new Date();
      
      switch (dateFilter) {
        case 'week':
          dateLimit = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          dateLimit = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          dateLimit = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (dateLimit) {
        whereClause.push(`date >= '${dateLimit.toISOString()}'`);
      }
    }

    const whereClauseString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    // Get filtered count
    const countQuery = `
      SELECT COUNT(*) as count
      FROM \`pokemon-statistics.pokemon_replays.replays\` r
      ${joinClause}
      ${whereClauseString}
    `;
    const [countRows] = await bigQuery.query(countQuery);
    const totalFilteredGames = parseInt(countRows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT r.*
      FROM \`pokemon-statistics.pokemon_replays.replays\` r
      ${joinClause}
      ${whereClauseString}
      ORDER BY ${orderBy}
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const [rows] = await bigQuery.query(dataQuery);

    res.json({
      games: rows,
      total: totalFilteredGames
    });
  } catch (error) {
    console.error("Error fetching data from BigQuery:", error);
    res.status(500).send("Error retrieving data");
  }
});

// Endpoint that returns if a replay is already in the database
app.get('/api/games/:gameId', async (req, res) => {
    const { gameId } = req.params;

    try {
        const query = `SELECT * FROM \`pokemon-statistics.pokemon_replays.replays\` WHERE replay_id = '${gameId}'`;
        const [rows] = await bigQuery.query(query);
        res.json({ exists: rows.length > 0 });
    } catch (error) {
        console.error("Error fetching data from BigQuery:", error);
        res.status(500).send("Error checking if game exists");
    }
});

// Endpoint to get the list of months
app.get('/api/months', async (req, res) => {
    try {
        const response = await axios.get('https://www.smogon.com/stats/');
        const $ = cheerio.load(response.data);

        const months = new Set();
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Month format is YYYY-MM/
                const match = href.match(/(\d{4}-\d{2}(-DLC\d{1})?\/)/);
                if (match) {
                    months.add(match[1].replace('/', ''));
                }
            }
        });

        res.json(Array.from(months).sort().reverse());
    } catch (error) {
        console.error("Error fetching months:", error);
        res.status(500).send("Error fetching months");
    }
});

// Endpoint to get the list of formats for a given month
app.get('/api/formats/:month', async (req, res) => {
    const { month } = req.params;

    try {
        const response = await axios.get(`https://www.smogon.com/stats/${month}/`);
        const $ = cheerio.load(response.data);

        const formats = [];
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            // Format files end with .txt and are not compressed (.txt.gz)
            if (href && href.endsWith('.txt') && !href.endsWith('.txt.gz')) {
                formats.push(href.replace('.txt', ''));
            }
        });

        res.json(formats.reverse());
    } catch (error) {
        console.error("Error fetching formats:", error);
        res.status(500).send("Error fetching formats");
    }
});

// Modify the /api/rankings endpoint to fetch both sources
app.get('/api/rankings', async (req, res) => {
    const { format, month } = req.query;

    if (!format || !month) {
        res.status(400).send("Missing format or month");
        return;
    }

    try {
        // First fetch usage data for proper sorting
        const baseUrl = 'https://www.smogon.com/stats';
        const monthPath = `/${month}`;
        
        // 1. Fetch the usage data (no "moveset/" in the path)
        const usageUrl = `${baseUrl}${monthPath}/${format}.txt`;
        console.log('Fetching usage stats from URL:', usageUrl);
        
        const usageResponse = await axios.get(usageUrl);
        const usageData = parseUsageData(usageResponse.data);
        
        // 2. Fetch the moveset data for details
        const movesetUrl = `${baseUrl}${monthPath}/moveset/${format}.txt`;
        console.log('Fetching moveset data from URL:', movesetUrl);
        
        const movesetResponse = await axios.get(movesetUrl);
        const movesetData = parseMovesetText(movesetResponse.data);
        
        // 3. Combine the data, prioritizing the order from usage data
        const combinedData = combineData(usageData, movesetData);
        
        // Log para depuración
        console.log(`Sending data with ${Object.keys(combinedData.data).length} Pokémon entries`);
        // Opcional: log de ejemplo para el primer Pokémon
        if (Object.keys(combinedData.data).length > 0) {
            const firstPokemon = Object.keys(combinedData.data)[0];
            console.log(`Sample: ${firstPokemon} with usage ${combinedData.data[firstPokemon].usage}%`);
        }
        
        res.send(combinedData);
    } catch (error) {
        console.error("Error fetching data from Smogon:", error);
        console.error("Error details:", error.message);
        
        // Intentar con formato base si hay un error (sin -1760)
        try {
            if (format.includes('-')) {
                const baseFormat = format.split('-')[0];
                const baseUrl = 'https://www.smogon.com/stats';
                const monthPath = `/${month}`;
                
                // Try both sources with base format
                const usageUrl = `${baseUrl}${monthPath}/${baseFormat}.txt`;
                const movesetUrl = `${baseUrl}${monthPath}/moveset/${baseFormat}.txt`;
                
                console.log('Trying fallback usage URL:', usageUrl);
                
                const usageResponse = await axios.get(usageUrl);
                const usageData = parseUsageData(usageResponse.data);
                
                console.log('Trying fallback moveset URL:', movesetUrl);
                
                const movesetResponse = await axios.get(movesetUrl);
                const movesetData = parseMovesetText(movesetResponse.data);
                
                const combinedData = combineData(usageData, movesetData);
                
                res.send(combinedData);
                return;
            }
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError.message);
        }
        
        res.status(500).send("Error fetching data from Smogon");
    }
});

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

// Mount the obtainGameData router on the /api/replays path
app.use('/api/replays', obtainGameDataRouter);

// Save a replay for a user
app.post('/api/users/:userId/saved-replays', async (req, res) => {
  const { userId } = req.params;
  const { replayId } = req.body;
  
  try {
    // Check if user exists
    const userQuery = `SELECT * FROM \`pokemon-statistics.pokemon_replays.saved_replays\` WHERE user_id = '${userId}'`;
    const [userRows] = await bigQuery.query(userQuery);

    if (userRows.length === 0) {
      // Create new user entry
      const insertQuery = `
        INSERT INTO \`pokemon-statistics.pokemon_replays.saved_replays\`
        (user_id, replays_saved)
        VALUES ('${userId}', ARRAY<STRUCT<replay_id STRING>>[(STRUCT('${replayId}'))])
      `;
      await bigQuery.query(insertQuery);
    } else {
      // Update existing user's replays
      const updateQuery = `
        UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
        SET replays_saved = ARRAY_CONCAT(replays_saved, [STRUCT<replay_id STRING>('${replayId}')])
        WHERE user_id = '${userId}'
      `;
      await bigQuery.query(updateQuery);
    }
    res.status(200).send("Replay saved successfully");
  } catch (error) {
    console.error("Error saving replay:", error);
    res.status(500).send("Error saving replay");
  }
});

// Create new user with empty replays array
app.post('/api/users/saved-replays', async (req, res) => {
  const { userId } = req.body;
  
  try {
    const query = `
      INSERT INTO \`pokemon-statistics.pokemon_replays.saved_replays\`
      (user_id, replays_saved)
      VALUES ('${userId}', ARRAY<STRUCT<replay_id STRING>>[])
    `;
    await bigQuery.query(query);
    res.status(200).send("User created successfully with empty replays array");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user");
  }
});

// Get user's saved replays
app.get('/api/users/:userId/saved-replays', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const query = `
      SELECT r.*
      FROM \`pokemon-statistics.pokemon_replays.replays\` r
      JOIN UNNEST((
        SELECT replays_saved 
        FROM \`pokemon-statistics.pokemon_replays.saved_replays\` 
        WHERE user_id = '${userId}'
      )) saved
      WHERE r.replay_id = saved.replay_id
    `;
    const [rows] = await bigQuery.query(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching saved replays:", error);
    res.status(500).send("Error fetching saved replays");
  }
});

// Delete a saved replay
app.delete('/api/users/:userId/saved-replays/:replayId', async (req, res) => {
  const { userId, replayId } = req.params;
  
  try {
    const query = `
      UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
      SET replays_saved = ARRAY(
        SELECT STRUCT<replay_id STRING>(x.replay_id)
        FROM UNNEST(replays_saved) x
        WHERE x.replay_id != '${replayId}'
      )
      WHERE user_id = '${userId}'
    `;
    await bigQuery.query(query);
    res.status(200).send("Replay removed successfully");
  } catch (error) {
    console.error("Error removing replay:", error);
    res.status(500).send("Error removing replay");
  }
});

// Delete all saved replays (when deleting account)
app.delete('/api/users/:userId/saved-replays', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const query = `
      DELETE FROM \`pokemon-statistics.pokemon_replays.saved_replays\`
      WHERE user_id = '${userId}'
    `;
    await bigQuery.query(query);
    res.status(200).send("All saved replays deleted successfully");
  } catch (error) {
    console.error("Error deleting saved replays:", error);
    res.status(500).send("Error deleting saved replays");
  }
});

// Turn Assistant endpoint - Find battle scenarios with specific Pokémon
app.post('/api/turn-assistant/analyze', async (req, res) => {
  try {
    const {
      pokemonData,
      battleConditions = { 
        weather: "", 
        field: "", 
        room: "",
        sideEffects: { yourSide: {}, opponentSide: {} },
        sideEffectsDuration: { yourSide: {}, opponentSide: {} }
      }
    } = req.body;
    console.log("Battle conditions received:", JSON.stringify(battleConditions, null, 2));
    
    if (!pokemonData || !pokemonData.topLeft || !pokemonData.topRight || 
        !pokemonData.bottomLeft || !pokemonData.bottomRight) {
      return res.status(400).json({ 
        error: "Missing Pokémon selection. Please select all 4 Pokémon." 
      });
    }
    
    // Extract your Pokémon (from the top row)
    const yourPokemon = [
      pokemonData.topLeft.name || '', 
      pokemonData.topRight.name || ''
    ];
    
    // Extract opponent's Pokémon (from the bottom row)
    const opponentPokemon = [
      pokemonData.bottomLeft.name || '', 
      pokemonData.bottomRight.name || ''
    ];
    
    // Extract items for your Pokémon, ensuring we have a value or null
    const yourItems = {
      [yourPokemon[0]]: pokemonData.topLeft.item || null,
      [yourPokemon[1]]: pokemonData.topRight.item || null
    };
    
    // Extract items for opponent's Pokémon too
    const opponentItems = {
      [opponentPokemon[0]]: pokemonData.bottomLeft.item || null,
      [opponentPokemon[1]]: pokemonData.bottomRight.item || null
    };

    // Extract abilities for your Pokémon
    const yourAbilities = {
      [yourPokemon[0]]: pokemonData.topLeft.ability || null,
      [yourPokemon[1]]: pokemonData.topRight.ability || null
    };

    // Extract abilities for opponent's Pokémon too
    const opponentAbilities = {
      [opponentPokemon[0]]: pokemonData.bottomLeft.ability || null,
      [opponentPokemon[1]]: pokemonData.bottomRight.ability || null
    };

    // Extraer non-volatile status de tus Pokémon
    const yourNonVolatileStatus = {
      [yourPokemon[0]]: pokemonData.topLeft.nonVolatileStatus || null,
      [yourPokemon[1]]: pokemonData.topRight.nonVolatileStatus || null
    };

    // Extraer non-volatile status de los Pokémon del oponente
    const opponentNonVolatileStatus = {
      [opponentPokemon[0]]: pokemonData.bottomLeft.nonVolatileStatus || null,
      [opponentPokemon[1]]: pokemonData.bottomRight.nonVolatileStatus || null
    };

    // Extraer volatile statuses de tus Pokémon (como arrays)
    const yourVolatileStatuses = {
      [yourPokemon[0]]: pokemonData.topLeft.volatileStatuses || [],
      [yourPokemon[1]]: pokemonData.topRight.volatileStatuses || []
    };

    // Extraer volatile statuses de los Pokémon del oponente
    const opponentVolatileStatuses = {
      [opponentPokemon[0]]: pokemonData.bottomLeft.volatileStatuses || [],
      [opponentPokemon[1]]: pokemonData.bottomRight.volatileStatuses || []
    };

    // Define params for BigQuery
    let params = {
      yourPokemon1: yourPokemon[0],
      yourPokemon2: yourPokemon[1],
      opponentPokemon1: opponentPokemon[0],
      opponentPokemon2: opponentPokemon[1]
    };

    // Build the main query to find turns with these Pokémon
    let matchingTurnsQuery = `
      WITH matching_turns AS (
        SELECT
          r.replay_id,
          t.turn_number,
          t.starts_with.player1 as player1_pokemon,
          t.starts_with.player2 as player2_pokemon,
          t.moves_done.player1 as player1_moves,
          t.moves_done.player2 as player2_moves,
          t.revealed_pokemon.player1 as player1_revealed,
          t.revealed_pokemon.player2 as player2_revealed,
          r.winner,
          r.player1,
          r.player2,
          t.weather,
          t.field,
          t.room
        FROM \`pokemon-statistics.pokemon_replays.replays\` r
        CROSS JOIN UNNEST(r.turns) t
        WHERE t.turn_number > 0 
    `;

    // Ejemplo de procesamiento de movimientos para un Pokémon (por ejemplo, topLeft)
    if (pokemonData.topLeft.moves && pokemonData.topLeft.moves.length > 0) {
      // Normalizar: extrae y procesa los nombres de movimientos
      const moveStrings = pokemonData.topLeft.moves.map(move => {
        let moveName;
        if (typeof move === 'string') {
          moveName = move;
        } else if (move && move.name) {
          moveName = move.name;
        } else {
          moveName = String(move);
        }
        // Convertir a minúsculas y eliminar espacios para que coincida con el formato en la BD
        return moveName.trim().toLowerCase().replace(/\s+/g, '');
      });

      console.log("Top Left moves (normalized):", moveStrings);

      matchingTurnsQuery += `
        AND (
          ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND EXISTS (
             SELECT 1 FROM UNNEST(r.teams.p1) AS team_pokemon
             WHERE team_pokemon.name = '${yourPokemon[0]}'
               AND EXISTS (
                 SELECT team_move FROM UNNEST(team_pokemon.moves) AS team_move
                 WHERE LOWER(REPLACE(team_move, ' ', '')) IN UNNEST(@yourMovesTopLeft)
               )
          ))
          OR
          ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND EXISTS (
             SELECT 1 FROM UNNEST(r.teams.p2) AS team_pokemon
             WHERE team_pokemon.name = '${yourPokemon[0]}'
               AND EXISTS (
                 SELECT team_move FROM UNNEST(team_pokemon.moves) AS team_move
                 WHERE LOWER(REPLACE(team_move, ' ', '')) IN UNNEST(@yourMovesTopLeft)
               )
          ))
        )
      `;

      params.yourMovesTopLeft = moveStrings;
    }

    // Build item conditions for your Pokémon
    let yourItemConditions = [];
    
    // Process item search conditions for your Pokémon
    for (let i = 0; i < yourPokemon.length; i++) {
      const pokemon = yourPokemon[i];
      const item = yourItems[pokemon];
      
      // Only add condition if an item is specified
      if (item) {
        // Remove spaces from item name to match database format
        const formattedItem = item === 'No Item' ? null : item.replace(/\s+/g, '');
        
        if (item === 'No Item') {
          // Search for Pokémon with no item
          yourItemConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @yourPokemon${i+1} AND (p.item IS NULL OR p.item = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @yourPokemon${i+1} AND (p.item IS NULL OR p.item = '')
              )
            )
          `);
        } else {
          // Search for Pokémon with the specified item
          yourItemConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @yourPokemon${i+1} AND p.item = @yourItem${i+1}
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @yourPokemon${i+1} AND p.item = @yourItem${i+1}
              )
            )
          `);
          params[`yourItem${i+1}`] = formattedItem;
        }
      }
    }
    
    // Build item conditions for opponent's Pokémon
    let opponentItemConditions = [];
    
    // Process item search conditions for opponent's Pokémon
    for (let i = 0; i < opponentPokemon.length; i++) {
      const pokemon = opponentPokemon[i];
      const item = opponentItems[pokemon];
      
      // Only add condition if an item is specified
      if (item) {
        // Remove spaces from item name to match database format
        const formattedItem = item === 'No Item' ? null : item.replace(/\s+/g, '');
        
        if (item === 'No Item') {
          // Search for Pokémon with no item
          opponentItemConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @opponentPokemon${i+1} AND (p.item IS NULL OR p.item = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @opponentPokemon${i+1} AND (p.item IS NULL OR p.item = '')
              )
            )
          `);
        } else {
          // Search for Pokémon with the specified item
          opponentItemConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @opponentPokemon${i+1} AND p.item = @opponentItem${i+1}
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @opponentPokemon${i+1} AND p.item = @opponentItem${i+1}
              )
            )
          `);
          params[`opponentItem${i+1}`] = formattedItem;
        }
      }
    }

    // Construir condiciones para filtrar por habilidad de "tus" Pokémon
    let yourAbilityConditions = [];
    for (let i = 0; i < yourPokemon.length; i++) {
      const pokemon = yourPokemon[i];
      const ability = yourAbilities[pokemon];

      if (ability && ability.trim() !== "") {
        if (ability === "No Ability") {
          yourAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @yourPokemon${i+1} AND (p.ability IS NULL OR p.ability = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @yourPokemon${i+1} AND (p.ability IS NULL OR p.ability = '')
              )
            )
          `);
        } else {
          // Normaliza: quita espacios, recorta y pasa a minúsculas
          const formattedAbility = ability.trim().toLowerCase().replace(/\s+/g, '');
          yourAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @yourPokemon${i+1} 
                  AND LOWER(REPLACE(p.ability, ' ', '')) = @yourAbility${i+1}
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @yourPokemon${i+1} 
                  AND LOWER(REPLACE(p.ability, ' ', '')) = @yourAbility${i+1}
              )
            )
          `);
          params[`yourAbility${i+1}`] = formattedAbility;
        }
      }
    }

    if (yourAbilityConditions.length > 0) {
      matchingTurnsQuery += ` AND (${yourAbilityConditions.join(' AND ')})`;
    }

    // Add item conditions to the query
    if (yourItemConditions.length > 0) {
      matchingTurnsQuery += ` AND (${yourItemConditions.join(' AND ')})`;
    }
    
    // Add opponent item conditions to the query
    if (opponentItemConditions.length > 0) {
      matchingTurnsQuery += ` AND (${opponentItemConditions.join(' AND ')})`;
    }

    // Construir condiciones para filtrar por habilidad de los Pokémon del oponente
    let opponentAbilityConditions = [];
    for (let i = 0; i < opponentPokemon.length; i++) {
      const pokemon = opponentPokemon[i];
      const ability = opponentAbilities[pokemon];

      if (ability && ability.trim() !== "") {
        if (ability === "No Ability") {
          opponentAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @opponentPokemon${i+1} AND (p.ability IS NULL OR p.ability = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @opponentPokemon${i+1} AND (p.ability IS NULL OR p.ability = '')
              )
            )
          `);
        } else {
          // Normaliza: quita espacios, recorta y pasa a minúsculas
          const formattedAbility = ability.trim().toLowerCase().replace(/\s+/g, '');
          opponentAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @opponentPokemon${i+1} 
                  AND LOWER(REPLACE(p.ability, ' ', '')) = @opponentAbility${i+1}
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @opponentPokemon${i+1} 
                  AND LOWER(REPLACE(p.ability, ' ', '')) = @opponentAbility${i+1}
              )
            )
          `);
          params[`opponentAbility${i+1}`] = formattedAbility;
        }
      }
    }

    // Añadir las condiciones de habilidad del oponente a la query
    if (opponentAbilityConditions.length > 0) {
      matchingTurnsQuery += ` AND (${opponentAbilityConditions.join(' AND ')})`;
    }

    // Add the conditions for weather, field, and room if they are specified
    console.log("Battle conditions being applied:", battleConditions);

    if (battleConditions.weather && battleConditions.weather.trim() !== "") {
      const formattedWeather = battleConditions.weather.trim().toLowerCase();
      console.log(`Applying weather filter: "${formattedWeather}"`);
      
      if (formattedWeather === "none") {
        // Ya está correcto usando t.weather
        matchingTurnsQuery += ` AND (t.weather IS NULL OR t.weather.condition IS NULL OR t.weather.condition = '')`;
      } else {
        // Ya está correcto usando t.weather 
        matchingTurnsQuery += ` AND t.weather IS NOT NULL AND LOWER(t.weather.condition) = @battleWeather`;
        params.battleWeather = formattedWeather;
      }
    }

    // Para Field (por ejemplo, "Electric Terrain" en BD vs "ElectricTerrain" recibido)
    if (battleConditions.field && battleConditions.field.trim() !== "") {
      const formattedField = battleConditions.field.trim().toLowerCase();
      console.log(`Applying field filter: "${formattedField}"`);
      
      if (formattedField === "none") {
        matchingTurnsQuery += ` AND (t.field IS NULL OR t.field.terrain IS NULL OR t.field.terrain = '')`;
      } else {
        matchingTurnsQuery += ` AND t.field IS NOT NULL AND LOWER(REPLACE(t.field.terrain, ' ', '')) = @battleField`;
        params.battleField = formattedField;
      }
    }

    // Para Room (por ejemplo, "Trick Room" en BD vs "TrickRoom" recibido)
    if (battleConditions.room && battleConditions.room.trim() !== "") {
      const formattedRoom = battleConditions.room.trim().toLowerCase();
      console.log(`Applying room filter: "${formattedRoom}"`);
      
      if (formattedRoom === "none") {
        matchingTurnsQuery += ` AND (t.room IS NULL OR t.room.condition IS NULL OR t.room.condition = '')`;
      } else {
        matchingTurnsQuery += ` AND t.room IS NOT NULL AND LOWER(REPLACE(t.room.condition, ' ', '')) = @battleRoom`;
        params.battleRoom = formattedRoom;
      }
    }

    // Agregar condiciones para non-volatile status para tus Pokémon
    const yourNonVolatileStatusConditions = [];
    Object.entries(yourNonVolatileStatus).forEach(([pokemonName, statusName], index) => {
      if (statusName) {
        const formattedStatus = statusName.trim().toLowerCase();
        // Mapea el estado al formato de la BBDD
        const mappedStatus = statusMapping[formattedStatus] || formattedStatus;
        params[`yourNonVolatileStatus${index + 1}`] = mappedStatus;
        yourNonVolatileStatusConditions.push(`
          EXISTS (
            SELECT 1 FROM UNNEST(
              CASE
                WHEN (
                  t.starts_with.player1[OFFSET(0)] = @yourPokemon1 OR
                  t.starts_with.player1[OFFSET(1)] = @yourPokemon1
                ) THEN t.revealed_pokemon.player1
                ELSE t.revealed_pokemon.player2
              END
            ) p
            WHERE p.name = "${pokemonName}" 
              AND LOWER(REPLACE(p.non_volatile_status, ' ', '')) = @yourNonVolatileStatus${index + 1}
          )
        `);
      }
    });
    if (yourNonVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${yourNonVolatileStatusConditions.join(' AND ')})`;
    }

    // Agregar condiciones para non volatile status para Pokémon del oponente
    const opponentNonVolatileStatusConditions = [];
    Object.entries(opponentNonVolatileStatus).forEach(([pokemonName, statusName], index) => {
      if (statusName) {
        const formattedStatus = statusName.trim().toLowerCase();
        const mappedStatus = statusMapping[formattedStatus] || formattedStatus;
        params[`opponentNonVolatileStatus${index + 1}`] = mappedStatus;
        opponentNonVolatileStatusConditions.push(`
          EXISTS (
            SELECT 1 FROM UNNEST(
              CASE
                WHEN (
                  t.starts_with.player1[OFFSET(0)] = @opponentPokemon1 OR
                  t.starts_with.player1[OFFSET(1)] = @opponentPokemon1
                ) THEN t.revealed_pokemon.player1
                ELSE t.revealed_pokemon.player2
              END
            ) p
            WHERE p.name = "${pokemonName}" 
              AND LOWER(REPLACE(p.non_volatile_status, ' ', '')) = @opponentNonVolatileStatus${index + 1}
          )
        `);
      }
    });
    if (opponentNonVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${opponentNonVolatileStatusConditions.join(' AND ')})`;
    }

    // Agregar condiciones para volatile statuses para tus Pokémon
    const yourVolatileStatusConditions = [];
    Object.entries(yourVolatileStatuses).forEach(([pokemonName, statusesArray], pIndex) => {
      // Si hay algún volatile status seleccionado para este Pokémon…
      if (statusesArray.length > 0) {
        statusesArray.forEach((status, sIndex) => {
          const formattedStatus = status.trim().toLowerCase();
          const paramName = `yourVolatileStatus${pIndex + 1}_${sIndex + 1}`;
          params[paramName] = formattedStatus;
          yourVolatileStatusConditions.push(`
            EXISTS (
              SELECT 1 FROM UNNEST(
                CASE
                  WHEN (
                    t.starts_with.player1[OFFSET(0)] = @yourPokemon1 OR t.starts_with.player1[OFFSET(1)] = @yourPokemon1
                  ) THEN t.revealed_pokemon.player1
                  ELSE t.revealed_pokemon.player2
                END
              ) p
              WHERE p.name = "${pokemonName}"
                AND ARRAY_LENGTH(
                  ARRAY(
                    SELECT x FROM UNNEST(p.volatile_status) x
                    WHERE LOWER(x.name) = @${paramName}
                  )
                ) > 0
            )
          `);
        });
      }
    });
    if (yourVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${yourVolatileStatusConditions.join(' AND ')})`;
    }

    // Agregar condiciones para volatile statuses para Pokémon del oponente
    const opponentVolatileStatusConditions = [];
    Object.entries(opponentVolatileStatuses).forEach(([pokemonName, statusesArray], pIndex) => {
      if (statusesArray.length > 0) {
        statusesArray.forEach((status, sIndex) => {
          const formattedStatus = status.trim().toLowerCase();
          const paramName = `opponentVolatileStatus${pIndex + 1}_${sIndex + 1}`;
          params[paramName] = formattedStatus;
          opponentVolatileStatusConditions.push(`
            EXISTS (
              SELECT 1 FROM UNNEST(
                CASE
                  WHEN (
                    t.starts_with.player1[OFFSET(0)] = @opponentPokemon1 OR t.starts_with.player1[OFFSET(1)] = @opponentPokemon1
                  ) THEN t.revealed_pokemon.player1
                  ELSE t.revealed_pokemon.player2
                END
              ) p
              WHERE p.name = "${pokemonName}"
                AND ARRAY_LENGTH(
                  ARRAY(
                    SELECT x FROM UNNEST(p.volatile_status) x
                    WHERE LOWER(x.name) = @${paramName}
                  )
                ) > 0
            )
          `);
        });
      }
    });
    if (opponentVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${opponentVolatileStatusConditions.join(' AND ')})`;
    }

    // Filtro Tailwind para "Your Side"
    if (battleConditions.sideEffects.yourSide.tailwind === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.tailwind.player1 = TRUE
            AND t.tailwind.duration1 = @tailwindDurationYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.tailwind.player2 = TRUE
            AND t.tailwind.duration2 = @tailwindDurationYourSide
          )
        )
      `;
      params.tailwindDurationYourSide = battleConditions.sideEffectsDuration.yourSide.tailwind;
    }

    // Filtro Tailwind para "Opponent Side"
    if (battleConditions.sideEffects.opponentSide.tailwind === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.tailwind.player1 = TRUE
            AND t.tailwind.duration1 = @tailwindDurationOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.tailwind.player2 = TRUE
            AND t.tailwind.duration2 = @tailwindDurationOpponentSide
          )
        )
      `;
      params.tailwindDurationOpponentSide = battleConditions.sideEffectsDuration.opponentSide.tailwind;
    }
    
    // Filtro Reflect para "Your Side"
    if (battleConditions.sideEffects.yourSide.reflect === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.reflect.player1 = TRUE
            AND t.screens.reflect.duration1 = @reflectDurationYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.reflect.player2 = TRUE
            AND t.screens.reflect.duration2 = @reflectDurationYourSide
          )
        )
      `;
      params.reflectDurationYourSide = battleConditions.sideEffectsDuration.yourSide.reflect;
    }

    // Filtro Reflect para "Opponent Side"
    if (battleConditions.sideEffects.opponentSide.reflect === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.reflect.player1 = TRUE
            AND t.screens.reflect.duration1 = @reflectDurationOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.reflect.player2 = TRUE
            AND t.screens.reflect.duration2 = @reflectDurationOpponentSide
          )
        )
      `;
      params.reflectDurationOpponentSide = battleConditions.sideEffectsDuration.opponentSide.reflect;
    }

    // Filtro Lightscreen para "Your Side"
    if (battleConditions.sideEffects.yourSide.lightscreen === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.lightscreen.player1 = TRUE
            AND t.screens.lightscreen.duration1 = @lightscreenDurationYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.lightscreen.player2 = TRUE
            AND t.screens.lightscreen.duration2 = @lightscreenDurationYourSide
          )
        )
      `;
      params.lightscreenDurationYourSide = battleConditions.sideEffectsDuration.yourSide.lightscreen;
    }

    // Filtro Lightscreen para "Opponent Side"
    if (battleConditions.sideEffects.opponentSide.lightscreen === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.lightscreen.player1 = TRUE
            AND t.screens.lightscreen.duration1 = @lightscreenDurationOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.lightscreen.player2 = TRUE
            AND t.screens.lightscreen.duration2 = @lightscreenDurationOpponentSide
          )
        )
      `;
      params.lightscreenDurationOpponentSide = battleConditions.sideEffectsDuration.opponentSide.lightscreen;
    }

    // Filtro Auroraveil para "Your Side"
    if (battleConditions.sideEffects.yourSide.auroraveil === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.auroraveil.player1 = TRUE
            AND t.screens.auroraveil.duration1 = @auroraveilDurationYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.auroraveil.player2 = TRUE
            AND t.screens.auroraveil.duration2 = @auroraveilDurationYourSide
          )
        )
      `;
      params.auroraveilDurationYourSide = battleConditions.sideEffectsDuration.yourSide.auroraveil;
    }

    // Filtro Auroraveil para "Opponent Side"
    if (battleConditions.sideEffects.opponentSide.auroraveil === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1))
            AND t.screens.auroraveil.player1 = TRUE
            AND t.screens.auroraveil.duration1 = @auroraveilDurationOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            AND t.screens.auroraveil.player2 = TRUE
            AND t.screens.auroraveil.duration2 = @auroraveilDurationOpponentSide
          )
        )
      `;
      params.auroraveilDurationOpponentSide = battleConditions.sideEffectsDuration.opponentSide.auroraveil;
    }

    // Filtro Entry Hazards para "Your Side"
    if (battleConditions.entryHazards?.yourSide?.["Spikes"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.spikes >= @spikesLevelYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.spikes >= @spikesLevelYourSide
          )
        )
      `;
      params.spikesLevelYourSide = battleConditions.entryHazardsLevel?.yourSide?.["Spikes"] || 1;
    }

    if (battleConditions.entryHazards?.yourSide?.["Toxic Spikes"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.toxic_spikes >= @toxicSpikesLevelYourSide
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.toxic_spikes >= @toxicSpikesLevelYourSide
          )
        )
      `;
      params.toxicSpikesLevelYourSide = battleConditions.entryHazardsLevel?.yourSide?.["Toxic Spikes"] || 1;
    }

    if (battleConditions.entryHazards?.yourSide?.["Stealth Rock"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.stealth_rock = TRUE
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.stealth_rock = TRUE
          )
        )
      `;
    }

    if (battleConditions.entryHazards?.yourSide?.["Sticky Web"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.sticky_web = TRUE
          )
          OR
          (
            ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.sticky_web = TRUE
          )
        )
      `;
    }

    // Filtro Entry Hazards para "Opponent Side"
    if (battleConditions.entryHazards?.opponentSide?.["Spikes"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.spikes >= @spikesLevelOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.spikes >= @spikesLevelOpponentSide
          )
        )
      `;
      params.spikesLevelOpponentSide = battleConditions.entryHazardsLevel?.opponentSide?.["Spikes"] || 1;
    }

    if (battleConditions.entryHazards?.opponentSide?.["Toxic Spikes"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.toxic_spikes >= @toxicSpikesLevelOpponentSide
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.toxic_spikes >= @toxicSpikesLevelOpponentSide
          )
        )
      `;
      params.toxicSpikesLevelOpponentSide = battleConditions.entryHazardsLevel?.opponentSide?.["Toxic Spikes"] || 1;
    }

    if (battleConditions.entryHazards?.opponentSide?.["Stealth Rock"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.stealth_rock = TRUE
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.stealth_rock = TRUE
          )
        )
      `;
    }

    if (battleConditions.entryHazards?.opponentSide?.["Sticky Web"] === true) {
      matchingTurnsQuery += `
        AND (
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1))
            AND t.spikes.player1.sticky_web = TRUE
          )
          OR
          (
            ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2))
            AND t.spikes.player2.sticky_web = TRUE
          )
        )
      `;
    }
    
    // Filtro Tera para Top Left (Your Side)
    if (pokemonData.topLeft.teraType && pokemonData.topLeft.teraType.trim() !== "") {
      matchingTurnsQuery += `
        AND (
          (
            '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p1) AS team
                 WHERE team.name = '${yourPokemon[0]}' 
                   AND LOWER(team.tera_type) = LOWER(@yourTeraTypeTopLeft)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS p
                 WHERE p.name = '${yourPokemon[0]}' 
                   AND p.tera.active = @yourTeraActiveTopLeft
            )
          )
          OR
          (
            '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p2) AS team
                 WHERE team.name = '${yourPokemon[0]}' 
                   AND LOWER(team.tera_type) = LOWER(@yourTeraTypeTopLeft)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS p
                 WHERE p.name = '${yourPokemon[0]}' 
                   AND p.tera.active = @yourTeraActiveTopLeft
            )
          )
        )
      `;
      params.yourTeraTypeTopLeft = pokemonData.topLeft.teraType;
      params.yourTeraActiveTopLeft = pokemonData.topLeft.teraActive;
    }

    // Filtro Tera para Top Right (Your Side)
    if (pokemonData.topRight.teraType && pokemonData.topRight.teraType.trim() !== "") {
      matchingTurnsQuery += `
        AND (
          (
            '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p1) AS team
                 WHERE team.name = '${yourPokemon[1]}' 
                   AND LOWER(team.tera_type) = LOWER(@yourTeraTypeTopRight)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS p
                 WHERE p.name = '${yourPokemon[1]}' 
                   AND p.tera.active = @yourTeraActiveTopRight
            )
          )
          OR
          (
            '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p2) AS team
                 WHERE team.name = '${yourPokemon[1]}' 
                   AND LOWER(team.tera_type) = LOWER(@yourTeraTypeTopRight)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS p
                 WHERE p.name = '${yourPokemon[1]}' 
                   AND p.tera.active = @yourTeraActiveTopRight
            )
          )
        )
      `;
      params.yourTeraTypeTopRight = pokemonData.topRight.teraType;
      params.yourTeraActiveTopRight = pokemonData.topRight.teraActive;
    }

    // Filtro Tera para Bottom Left (Opponent Side)
    if (pokemonData.bottomLeft.teraType && pokemonData.bottomLeft.teraType.trim() !== "") {
      matchingTurnsQuery += `
        AND (
          (
            '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p1) AS team
                 WHERE team.name = '${opponentPokemon[0]}' 
                   AND LOWER(team.tera_type) = LOWER(@opponentTeraTypeBottomLeft)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS p
                 WHERE p.name = '${opponentPokemon[0]}' 
                   AND p.tera.active = @opponentTeraActiveBottomLeft
            )
          )
          OR
          (
            '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p2) AS team
                 WHERE team.name = '${opponentPokemon[0]}' 
                   AND LOWER(team.tera_type) = LOWER(@opponentTeraTypeBottomLeft)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS p
                 WHERE p.name = '${opponentPokemon[0]}' 
                   AND p.tera.active = @opponentTeraActiveBottomLeft
            )
          )
        )
      `;
      params.opponentTeraTypeBottomLeft = pokemonData.bottomLeft.teraType;
      params.opponentTeraActiveBottomLeft = pokemonData.bottomLeft.teraActive;
    }

    // Filtro Tera para Bottom Right (Opponent Side)
    if (pokemonData.bottomRight.teraType && pokemonData.bottomRight.teraType.trim() !== "") {
      matchingTurnsQuery += `
        AND (
          (
            '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p1) AS team
                 WHERE team.name = '${opponentPokemon[1]}' 
                   AND LOWER(team.tera_type) = LOWER(@opponentTeraTypeBottomRight)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS p
                 WHERE p.name = '${opponentPokemon[1]}' 
                   AND p.tera.active = @opponentTeraActiveBottomRight
            )
          )
          OR
          (
            '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
            AND EXISTS (
                 SELECT 1 FROM UNNEST(r.teams.p2) AS team
                 WHERE team.name = '${opponentPokemon[1]}' 
                   AND LOWER(team.tera_type) = LOWER(@opponentTeraTypeBottomRight)
            )
            AND EXISTS (
                 SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS p
                 WHERE p.name = '${opponentPokemon[1]}' 
                   AND p.tera.active = @opponentTeraActiveBottomRight
            )
          )
        )
      `;
      params.opponentTeraTypeBottomRight = pokemonData.bottomRight.teraType;
      params.opponentTeraActiveBottomRight = pokemonData.bottomRight.teraActive;
    }

    // Build move conditions for your Pokémon (assumes moves are selected in the PokemonDialog)
    let yourMoveConditions = [];
    // Iterate for each of your Pokémon (topLeft and topRight)
    [yourPokemon[0], yourPokemon[1]].forEach((poke, i) => {
      const moves = pokemonData[i === 0 ? 'topLeft' : 'topRight'].moves; // selected moves for the Pokémon
      if (moves && moves.length > 0) {
        moves.forEach((move, j) => {
          // Extract move name based on type and normalize it
          let moveName;
          if (typeof move === 'string') {
            moveName = move;
          } else if (move && move.name) {
            moveName = move.name;
          } else {
            moveName = String(move);
          }
          
          // Normalize: remove spaces, convert to lowercase
          const formattedMove = moveName.trim().toLowerCase().replace(/\s+/g, '');
          
          // Set parameter for this move
          params[`yourMove${i+1}_${j+1}`] = formattedMove;
          
          // Add condition to find this move in the appropriate team's Pokemon moves array
          yourMoveConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @yourPokemon${i+1} AND 
                EXISTS (
                  SELECT 1 FROM UNNEST(p.moves) m
                  WHERE LOWER(REPLACE(m, ' ', '')) = @yourMove${i+1}_${j+1}
                )
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @yourPokemon${i+1} AND 
                EXISTS (
                  SELECT 1 FROM UNNEST(p.moves) m
                  WHERE LOWER(REPLACE(m, ' ', '')) = @yourMove${i+1}_${j+1}
                )
              )
            )
          `);
        });
      }
    });

    // Add move conditions to the query if any exist
    if (yourMoveConditions.length > 0) {
      matchingTurnsQuery += ` AND (${yourMoveConditions.join(' AND ')})`;
    }

    // Build move conditions for opponent's Pokémon (bottomLeft and bottomRight)
    let opponentMoveConditions = [];
    [opponentPokemon[0], opponentPokemon[1]].forEach((poke, i) => {
      // Usar "bottomLeft" para i===0 y "bottomRight" para i===1
      const position = i === 0 ? 'bottomLeft' : 'bottomRight';
      const moves = pokemonData[position].moves; // movimientos seleccionados para este Pokémon del oponente
      if (moves && moves.length > 0) {
        moves.forEach((move, j) => {
          let moveName;
          if (typeof move === 'string') {
            moveName = move;
          } else if (move && move.name) {
            moveName = move.name;
          } else {
            moveName = String(move);
          }
          // Normalizar: quitar espacios, convertir a minúsculas
          const formattedMove = moveName.trim().toLowerCase().replace(/\s+/g, '');
          // Establecer parámetro para este movimiento
          params[`opponentMove${i+1}_${j+1}`] = formattedMove;
          
          // Condición para encontrar este movimiento en el Pokémon del oponente
          opponentMoveConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) p
                WHERE p.name = @opponentPokemon${i+1} AND 
                  EXISTS(
                    SELECT 1 FROM UNNEST(p.moves) m
                    WHERE LOWER(REPLACE(m, ' ', '')) = @opponentMove${i+1}_${j+1}
                  )
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) p
                WHERE p.name = @opponentPokemon${i+1} AND 
                  EXISTS(
                    SELECT 1 FROM UNNEST(p.moves) m
                    WHERE LOWER(REPLACE(m, ' ', '')) = @opponentMove${i+1}_${j+1}
                  )
              )
            )
          `);
        });
      }
    });

    if (opponentMoveConditions.length > 0) {
      matchingTurnsQuery += ` AND (${opponentMoveConditions.join(' AND ')})`;
    }
    
    // Supongamos que ya se han construido las condiciones de moves, items, etc.
    // Ahora añadimos condiciones para filtrar por vida y stats

    // Agrega parámetros para el primer Pokémon de "tu" equipo (topLeft)
    params['yourHp1'] = pokemonData.topLeft.stats.hp;
    params['yourAtk1'] = pokemonData.topLeft.stats.atk;
    params['yourDef1'] = pokemonData.topLeft.stats.def;
    params['yourSpa1'] = pokemonData.topLeft.stats.spa;
    params['yourSpd1'] = pokemonData.topLeft.stats.spd;
    params['yourSpe1'] = pokemonData.topLeft.stats.spe;
    params['yourAcc1'] = pokemonData.topLeft.stats.acc;
    params['yourEva1'] = pokemonData.topLeft.stats.eva;

    // Agrega parámetros para el segundo Pokémon de "tu" equipo (topRight)
    params['yourHp2'] = pokemonData.topRight.stats.hp;
    params['yourAtk2'] = pokemonData.topRight.stats.atk;
    params['yourDef2'] = pokemonData.topRight.stats.def;
    params['yourSpa2'] = pokemonData.topRight.stats.spa;
    params['yourSpd2'] = pokemonData.topRight.stats.spd;
    params['yourSpe2'] = pokemonData.topRight.stats.spe;
    params['yourAcc2'] = pokemonData.topRight.stats.acc;
    params['yourEva2'] = pokemonData.topRight.stats.eva;

    // Condición para el primer Pokémon: el filtro debe encontrar en 
    // t.revealed_pokemon (ya sea de player1 o player2) un elemento 
    // donde el nombre y los stats coincidan exactamente.
    const yourStatCondition1 = `
      (
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) rp
          WHERE rp.name = @yourPokemon1
            AND rp.remaining_hp = @yourHp1
            AND rp.stats.atk = @yourAtk1
            AND rp.stats.def = @yourDef1
            AND rp.stats.spa = @yourSpa1
            AND rp.stats.spd = @yourSpd1
            AND rp.stats.spe = @yourSpe1
            AND rp.stats.acc = @yourAcc1
            AND rp.stats.eva = @yourEva1
        )
        OR
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) rp
          WHERE rp.name = @yourPokemon1
            AND rp.remaining_hp = @yourHp1
            AND rp.stats.atk = @yourAtk1
            AND rp.stats.def = @yourDef1
            AND rp.stats.spa = @yourSpa1
            AND rp.stats.spd = @yourSpd1
            AND rp.stats.spe = @yourSpe1
            AND rp.stats.acc = @yourAcc1
            AND rp.stats.eva = @yourEva1
        )
      )
    `;

    // Condición para el segundo Pokémon:
    const yourStatCondition2 = `
      (
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) rp
          WHERE rp.name = @yourPokemon2
            AND rp.remaining_hp = @yourHp2
            AND rp.stats.atk = @yourAtk2
            AND rp.stats.def = @yourDef2
            AND rp.stats.spa = @yourSpa2
            AND rp.stats.spd = @yourSpd2
            AND rp.stats.spe = @yourSpe2
            AND rp.stats.acc = @yourAcc2
            AND rp.stats.eva = @yourEva2
        )
        OR
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) rp
          WHERE rp.name = @yourPokemon2
            AND rp.remaining_hp = @yourHp2
            AND rp.stats.atk = @yourAtk2
            AND rp.stats.def = @yourDef2
            AND rp.stats.spa = @yourSpa2
            AND rp.stats.spd = @yourSpd2
            AND rp.stats.spe = @yourSpe2
            AND rp.stats.acc = @yourAcc2
            AND rp.stats.eva = @yourEva2
        )
      )
    `;

    // Parámetros para el primer Pokémon del oponente (bottomLeft)
    params['opponentHp1']  = pokemonData.bottomLeft.stats.hp;
    params['opponentAtk1'] = pokemonData.bottomLeft.stats.atk;
    params['opponentDef1'] = pokemonData.bottomLeft.stats.def;
    params['opponentSpa1'] = pokemonData.bottomLeft.stats.spa;
    params['opponentSpd1'] = pokemonData.bottomLeft.stats.spd;
    params['opponentSpe1'] = pokemonData.bottomLeft.stats.spe;
    params['opponentAcc1'] = pokemonData.bottomLeft.stats.acc;
    params['opponentEva1'] = pokemonData.bottomLeft.stats.eva;

    // Parámetros para el segundo Pokémon del oponente (bottomRight)
    params['opponentHp2']  = pokemonData.bottomRight.stats.hp;
    params['opponentAtk2'] = pokemonData.bottomRight.stats.atk;
    params['opponentDef2'] = pokemonData.bottomRight.stats.def;
    params['opponentSpa2'] = pokemonData.bottomRight.stats.spa;
    params['opponentSpd2'] = pokemonData.bottomRight.stats.spd;
    params['opponentSpe2'] = pokemonData.bottomRight.stats.spe;
    params['opponentAcc2'] = pokemonData.bottomRight.stats.acc;
    params['opponentEva2'] = pokemonData.bottomRight.stats.eva;

    // Condición para el primer Pokémon del oponente:
    const opponentStatCondition1 = `
      (
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) rp
          WHERE rp.name = @opponentPokemon1
            AND rp.remaining_hp = @opponentHp1
            AND rp.stats.atk = @opponentAtk1
            AND rp.stats.def = @opponentDef1
            AND rp.stats.spa = @opponentSpa1
            AND rp.stats.spd = @opponentSpd1
            AND rp.stats.spe = @opponentSpe1
            AND rp.stats.acc = @opponentAcc1
            AND rp.stats.eva = @opponentEva1
        )
        OR
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) rp
          WHERE rp.name = @opponentPokemon1
            AND rp.remaining_hp = @opponentHp1
            AND rp.stats.atk = @opponentAtk1
            AND rp.stats.def = @opponentDef1
            AND rp.stats.spa = @opponentSpa1
            AND rp.stats.spd = @opponentSpd1
            AND rp.stats.spe = @opponentSpe1
            AND rp.stats.acc = @opponentAcc1
            AND rp.stats.eva = @opponentEva1
        )
      )
    `;

    // Condición para el segundo Pokémon del oponente:
    const opponentStatCondition2 = `
      (
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) rp
          WHERE rp.name = @opponentPokemon2
            AND rp.remaining_hp = @opponentHp2
            AND rp.stats.atk = @opponentAtk2
            AND rp.stats.def = @opponentDef2
            AND rp.stats.spa = @opponentSpa2
            AND rp.stats.spd = @opponentSpd2
            AND rp.stats.spe = @opponentSpe2
            AND rp.stats.acc = @opponentAcc2
            AND rp.stats.eva = @opponentEva2
        )
        OR
        EXISTS(
          SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) rp
          WHERE rp.name = @opponentPokemon2
            AND rp.remaining_hp = @opponentHp2
            AND rp.stats.atk = @opponentAtk2
            AND rp.stats.def = @opponentDef2
            AND rp.stats.spa = @opponentSpa2
            AND rp.stats.spd = @opponentSpd2
            AND rp.stats.spe = @opponentSpe2
            AND rp.stats.acc = @opponentAcc2
            AND rp.stats.eva = @opponentEva2
        )
      )
    `;

    // Agrega las condiciones de stats al query (después de las condiciones de moves, items, etc.)
    matchingTurnsQuery += ` AND (${yourStatCondition1} AND ${yourStatCondition2})`;
    matchingTurnsQuery += ` AND (${opponentStatCondition1} AND ${opponentStatCondition2})`;

    // Asegurarnos de que se filtren los escenarios por ambos equipos
    matchingTurnsQuery += `
          AND (
            -- Caso 1: Tus Pokémon están en player1 y los del oponente en player2
            (
              ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
              AND
              ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            )
            OR
            -- Caso 2: Tus Pokémon están en player2 y los del oponente en player1
            (
              ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2))
              AND
              ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1))
            )
          )
      )

      SELECT
        m.replay_id,
        m.turn_number,
        m.player1_pokemon,
        m.player2_pokemon,
        m.player1_moves,
        m.player2_moves,
        m.player1_revealed,
        m.player2_revealed,
        CASE 
          -- Determine if "your" Pokémon are player1 or player2
          WHEN (m.player1_pokemon[OFFSET(0)] = @yourPokemon1 OR m.player1_pokemon[OFFSET(1)] = @yourPokemon1) 
            AND (m.player1_pokemon[OFFSET(0)] = @yourPokemon2 OR m.player1_pokemon[OFFSET(1)] = @yourPokemon2)
            THEN (m.winner = m.player1) -- True if player1 won and they had "your" Pokémon
          ELSE (m.winner = m.player2) -- True if player2 won and they had "your" Pokémon
        END as your_team_won
      FROM matching_turns m
    `;

    console.log("Executing query to find matching scenarios...");
    const [matchingScenarios] = await bigQuery.query({ query: matchingTurnsQuery, params });
    console.log(`Found ${matchingScenarios.length} matching scenarios`);
    
    if (matchingScenarios.length === 0) {
      return res.json({
        matchingScenarios: 0,
        message: "No matching battle scenarios found with these Pokémon."
      });
    }
    
    // Analyze the scenarios to find winning moves and combinations
    const analysis = analyzeMatchingScenarios(matchingScenarios, yourPokemon, yourItems, yourAbilities);
    
    res.json({
      matchingScenarios: matchingScenarios.length,
      data: analysis
    });
    
  } catch (error) {
    console.error("Error analyzing battle scenarios:", error);
    res.status(500).json({ 
      error: "Error analyzing battle scenarios", 
      details: error.message 
    });
  }
});

// Helper function to analyze matching scenarios
function analyzeMatchingScenarios(scenarios, yourPokemon, yourItems = {}, yourAbilities = {}) {
  console.log("Analyzing scenarios:", scenarios.length);
  console.log("Your Pokémon:", yourPokemon);
  console.log("Your Items:", yourItems);
  console.log("Your Abilities:", yourAbilities);
  
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

// Improved helper function to parse move strings and extract all relevant information
function parseMoveString(moveString) {
  if (!moveString) return null;
  
  // Common formats in the data:
  // 1. "moveX used by PokemonA on PokemonB" -> "electro drift used by Miraidon on Whimsicott"
  // 2. "move on target" -> "electro drift on Miraidon"
  // 3. "move (spread)" -> "dazzling gleam (spread)"
  // 4. "move (spread) used by Pokemon" -> "dazzling gleam (spread) used by Miraidon"
  // 5. "PokemonA used move on PokemonB" -> "Miraidon used electro drift on Whimsicott"
  // 6. "switch to Pokemon" -> "switch to Iron Hands"
  // 7. "fainted, switch to Pokemon" -> "fainted, switch to Chi-Yu"
  
  let move = null;
  let userPokemon = null;
  let targetPokemon = null;
  let isSpreadMove = false;
  
  // Case 1: "moveX used by PokemonA on PokemonB"
  const usedByPattern = /^([^\s]+(?:\s+[^\s]+)*) used by ([^\s]+) on ([^\s]+)/;
  const usedByMatch = moveString.match(usedByPattern);
  if (usedByMatch) {
    move = usedByMatch[1].trim();
    userPokemon = usedByMatch[2].trim();
    targetPokemon = usedByMatch[3].trim();
    return { move, userPokemon, targetPokemon, isSpreadMove };
  }
  
  // Case 2: "move on target"
  const onTargetPattern = /^([^\s]+(?:\s+[^\s]+)*) on ([^\s,(]+)/;
  const onTargetMatch = moveString.match(onTargetPattern);
  if (onTargetMatch) {
    move = onTargetMatch[1].trim();
    targetPokemon = onTargetMatch[2].trim();
    return { move, targetPokemon, isSpreadMove };
  }
  
  // Case 3 & 4: Spread moves
  const spreadPattern = /^([^\s(]+(?:\s+[^\s(]+)*) \(spread\)(?:\s+used by ([^\s]+))?/;
  const spreadMatch = moveString.match(spreadPattern);
  if (spreadMatch) {
    move = spreadMatch[1].trim();
    userPokemon = spreadMatch[2]?.trim(); // Optional user Pokemon
    isSpreadMove = true;
    return { move, userPokemon, isSpreadMove };
  }
  
  // Case 5: "PokemonA used move on PokemonB"
  const pokemonUsedPattern = /^([^\s]+) used ([^\s]+(?:\s+[^\s]+)*)(?: on ([^\s,]+))?/;
  const pokemonUsedMatch = moveString.match(pokemonUsedPattern);
  if (pokemonUsedMatch) {
    userPokemon = pokemonUsedMatch[1].trim();
    move = pokemonUsedMatch[2].trim();
    targetPokemon = pokemonUsedMatch[3]?.trim(); // Optional target
    return { move, userPokemon, targetPokemon, isSpreadMove };
  }
  
  // Case 6: Switch actions
  const switchPattern = /^(?:.*,\s*)?switch to ([^\s,]+)/;
  const switchMatch = moveString.match(switchPattern);
  if (switchMatch) {
    move = "switch";
    return { move, isSpreadMove };
  }
  
  // Case 7: Fainted notifications
  if (moveString.startsWith("fainted")) {
    move = "fainted";
    return { move, isSpreadMove };
  }
  
  // If we reach here, use the whole string as the move (fallback)
  return { move: moveString, isSpreadMove };
}

// Define un objeto de mapeo para los estados non-volatile
const statusMapping = {
  "burn": "brn",
  "freeze": "frz",
  "frostbite": "frt",
  "paralysis": "par",
  "poison": "psn",
  "badly poisoned": "tox",
  "sleep": "slp"
};

app.get('/api/items', async (req, res) => {
  try {
    // Consulta PokeAPI para obtener hasta 1000 ítems (ajusta el limit según sea necesario)
    const response = await axios.get('https://pokeapi.co/api/v2/item?limit=10000');
    const items = response.data.results.map(item => ({
      // Formateamos el nombre para que aparezca con mayúsculas en cada palabra
      name: item.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: item.url
    }));
    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).send("Error fetching items");
  }
});

// Endpoint para obtener la lista de habilidades (abilities)
app.get('/api/abilities', async (req, res) => {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/ability?limit=1000');
    const abilities = response.data.results.map(ability => ({
      name: ability.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: ability.url
    }));
    res.json(abilities);
  } catch (error) {
    console.error("Error fetching abilities:", error);
    res.status(500).send("Error fetching abilities");
  }
});

// Endpoint para obtener la lista de movimientos (moves)
app.get('/api/moves', async (req, res) => {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/move?limit=1000');
    const moves = response.data.results.map(move => ({
      name: move.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: move.url
    }));
    res.json(moves);
  } catch (error) {
    console.error("Error fetching moves:", error);
    res.status(500).send("Error fetching moves");
  }
});

// Forum endpoints

// Get all forum topics
app.get('/api/forum/topics', async (req, res) => {
  try {
    const query = `
      SELECT * 
      FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      ORDER BY last_active DESC
    `;
    const [rows] = await bigQuery.query(query);
    
    // Format the timestamps for frontend display
    const formattedRows = rows.map(row => ({
      ...row,
      lastActive: formatTimeSince(new Date(row.last_active.value)),
      posts: row.posts_count
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error("Error fetching forum topics:", error);
    res.status(500).send("Error fetching forum topics");
  }
});

// Get a specific topic with its messages
app.get('/api/forum/topics/:topicId', async (req, res) => {
  const { topicId } = req.params;
  
  try {
    // Get topic details
    const topicQuery = `
      SELECT * 
      FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId
    `;
    
    const topicOptions = {
      query: topicQuery,
      params: { topicId }
    };
    
    const [topicRows] = await bigQuery.query(topicOptions);
    
    if (topicRows.length === 0) {
      return res.status(404).send("Topic not found");
    }
    
    // Get all messages for this topic
    const messagesQuery = `
      SELECT * 
      FROM \`pokemon-statistics.pokemon_replays.forum_messages\`
      WHERE topic_id = @topicId
      ORDER BY created_at ASC
    `;
    
    const messagesOptions = {
      query: messagesQuery,
      params: { topicId }
    };
    
    const [messagesRows] = await bigQuery.query(messagesOptions);
    
    // Format both the topic and messages
    const formattedTopic = {
      ...topicRows[0],
      created_at: topicRows[0].created_at.value,
      last_active: topicRows[0].last_active.value,
      posts_count: Number(topicRows[0].posts_count)
    };
    
    const formattedMessages = messagesRows.map(msg => ({
      ...msg,
      id: msg.message_id,
      content: msg.content,
      userId: msg.userId,
      userName: msg.userName,
      userAvatar: msg.userAvatar,
      timestamp: msg.created_at.value
    }));
    
    res.json({
      topic: formattedTopic,
      messages: formattedMessages
    });
  } catch (error) {
    console.error("Error fetching topic details:", error);
    res.status(500).send("Error fetching topic details");
  }
});

// Create a new topic
app.post('/api/forum/topics', async (req, res) => {
  const { title, description, icon, userId, userName } = req.body;
  
  if (!title || !userId || !userName) {
    return res.status(400).send("Title, userId, and userName are required");
  }
  
  try {
    const topicId = `topic-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    
    const insertTopicQuery = `
      INSERT INTO \`pokemon-statistics.pokemon_replays.forum_topics\`
      (topic_id, title, description, icon, created_by, created_at, last_active, posts_count)
      VALUES(@topicId, @title, @description, @icon, @userId, @now, @now, 0)
    `;
    
    const params = {
      topicId,
      title,
      description: description || "",
      icon: icon || "",
      userId,
      now
    };
    
    await bigQuery.query({
      query: insertTopicQuery,
      params
    });
    
    res.status(201).json({ 
      topicId,
      title,
      description,
      icon,
      created_by: userId,
      created_at: now,
      last_active: now,
      posts_count: 0
    });
  } catch (error) {
    console.error("Error creating new topic:", error);
    res.status(500).send("Error creating new topic");
  }
});

// Add a new message to a topic
app.post('/api/forum/topics/:topicId/messages', async (req, res) => {
  const { topicId } = req.params;
  const { content, userId, userName, userAvatar } = req.body;
  
  if (!content || !userId || !userName) {
    return res.status(400).send("Content, userId, and userName are required");
  }
  
  try {
    // First check if topic exists
    const topicQuery = `
      SELECT * FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId
    `;
    
    const [topicRows] = await bigQuery.query({
      query: topicQuery,
      params: { topicId }
    });
    
    if (topicRows.length === 0) {
      return res.status(404).send("Topic not found");
    }
    
    // Add new message
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    
    const insertMessageQuery = `
      INSERT INTO \`pokemon-statistics.pokemon_replays.forum_messages\`
      (message_id, topic_id, content, userId, userName, userAvatar, created_at)
      VALUES(@messageId, @topicId, @content, @userId, @userName, @userAvatar, @now)
    `;
    
    const params = {
      messageId,
      topicId,
      content,
      userId,
      userName,
      userAvatar: userAvatar || null,
      now
    };
    
    await bigQuery.query({
      query: insertMessageQuery,
      params
    });
    
    // Update topic's last_active timestamp and increment posts_count
    const updateTopicQuery = `
      UPDATE \`pokemon-statistics.pokemon_replays.forum_topics\`
      SET last_active = @now, posts_count = posts_count + 1
      WHERE topic_id = @topicId
    `;
    
    await bigQuery.query({
      query: updateTopicQuery,
      params: { now, topicId }
    });
    
    // Return the created message
    res.status(201).json({
      id: messageId,
      topic_id: topicId,
      content,
      userId,
      userName,
      userAvatar,
      timestamp: now
    });
  } catch (error) {
    console.error("Error creating new message:", error);
    res.status(500).send("Error creating new message");
  }
});

// Delete a message (optional)
app.delete('/api/forum/messages/:messageId', async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body; // Para verificar propiedad
  
  if (!userId) {
    return res.status(400).send("User ID is required");
  }
  
  try {
    // Verificar si el mensaje existe y pertenece al usuario
    const messageQuery = `
      SELECT topic_id FROM \`pokemon-statistics.pokemon_replays.forum_messages\`
      WHERE message_id = @messageId AND userId = @userId
    `;
    
    const [messageRows] = await bigQuery.query({
      query: messageQuery,
      params: { messageId, userId }
    });
    
    if (messageRows.length === 0) {
      return res.status(404).send("Message not found or you don't have permission to delete it");
    }
    
    const topicId = messageRows[0].topic_id;
    
    // Borrar el mensaje
    const deleteQuery = `
      DELETE FROM \`pokemon-statistics.pokemon_replays.forum_messages\`
      WHERE message_id = @messageId
    `;
    
    await bigQuery.query({
      query: deleteQuery,
      params: { messageId }
    });
    
    // Decrementar conteo de posts
    const updateTopicQuery = `
      UPDATE \`pokemon-statistics.pokemon_replays.forum_topics\`
      SET posts_count = posts_count - 1
      WHERE topic_id = @topicId
    `;
    
    await bigQuery.query({
      query: updateTopicQuery,
      params: { topicId }
    });
    
    res.status(200).send("Message deleted successfully");
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).send("Error deleting message");
  }
});

// Delete a topic (optional)
app.delete('/api/forum/topics/:topicId', async (req, res) => {
  const { topicId } = req.params;
  const { userId } = req.body; // To verify ownership
  
  if (!userId) {
    return res.status(400).send("User ID is required");
  }
  
  try {
    // First check if topic exists and belongs to user
    const topicQuery = `
      SELECT * FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId AND created_by = @userId
    `;
    
    const [topicRows] = await bigQuery.query({
      query: topicQuery,
      params: { topicId, userId }
    });
    
    if (topicRows.length === 0) {
      return res.status(404).send("Topic not found or you don't have permission to delete it");
    }
    
    // Delete all messages in the topic
    const deleteMessagesQuery = `
      DELETE FROM \`pokemon-statistics.pokemon_replays.forum_messages\`
      WHERE topic_id = @topicId
    `;
    
    await bigQuery.query({
      query: deleteMessagesQuery,
      params: { topicId }
    });
    
    // Delete the topic
    const deleteTopicQuery = `
      DELETE FROM \`pokemon-statistics.pokemon_replays.forum_topics\`
      WHERE topic_id = @topicId
    `;
    
    await bigQuery.query({
      query: deleteTopicQuery,
      params: { topicId }
    });
    
    res.status(200).send("Topic and all its messages deleted successfully");
  } catch (error) {
    console.error("Error deleting topic:", error);
    res.status(500).send("Error deleting topic");
  }
});

// Helper function to format time since a given date
function formatTimeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 31536000; // seconds in a year
  
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000; // seconds in a month
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400; // seconds in a day
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600; // seconds in an hour
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60; // seconds in a minute
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
}