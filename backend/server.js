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

const keyFilename = "D:/tfg/pokemonStatistics/credentials.json";

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

// Create a new user with empty saved_replays
app.post('/api/users/saved-replays', async (req, res) => {
  const { userId } = req.body;
  const query = `
    INSERT INTO \`pokemon-statistics.pokemon_replays.saved_replays\`
      (user_id, replays_saved)
    VALUES (@userId, [])
  `;
  try {
    await bigQuery.query({ query, params: { userId } });
    res.status(200).json({ message: 'User record created' });
  } catch (error) {
    console.error('Error creating user record:', error);
    res.status(500).send('Error creating user');
  }
});

// Save one replay for a user
app.post('/api/users/:userId/saved-replays', async (req, res) => {
  const { userId } = req.params;
  const { replayId } = req.body;
  if (!replayId) {
    return res.status(400).json({ error: 'Missing replayId' });
  }

  const query = `
    UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
    SET replays_saved = ARRAY_CONCAT(
      replays_saved,
      [STRUCT(@replayId AS replay_id)]
    )
    WHERE user_id = @userId
  `;
  try {
    await bigQuery.query({ query, params: { userId, replayId } });
    res.json({ message: 'Replay saved' });
  } catch (err) {
    console.error('Error saving replay:', err);
    res.status(500).json({ error: 'Error saving replay' });
  }
});

// Remove a saved replay
app.delete('/api/users/:userId/saved-replays/:replayId', async (req, res) => {
  const { userId, replayId } = req.params;
  const query = `
    UPDATE \`pokemon-statistics.pokemon_replays.saved_replays\`
    SET replays_saved = (
      SELECT ARRAY_AGG(r) FROM UNNEST(replays_saved) AS r
      WHERE r.replay_id != @replayId
    )
    WHERE user_id = @userId
  `;
  try {
    await bigQuery.query({ query, params: { userId, replayId } });
    res.json({ message: 'Replay removed' });
  } catch (err) {
    console.error('Error removing replay:', err);
    res.status(500).json({ error: 'Error removing replay' });
  }
});

// Get all saved replays for a user
app.get('/api/users/:userId/saved-replays', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1) fetch the array of saved IDs
    const [userRows] = await bigQuery.query({
      query: `
        SELECT replays_saved
        FROM \`pokemon-statistics.pokemon_replays.saved_replays\`
        WHERE user_id = @userId
      `,
      params: { userId }
    });
    if (!userRows.length || !userRows[0].replays_saved.length) {
      return res.json([]);
    }

    // 2) build an IN‐clause to fetch the full replay objects
    const ids = userRows[0].replays_saved.map(r => r.replay_id);
    const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
    const params = ids.reduce((p, id, i) => ({
      ...p,
      [`id${i}`]: id
    }), {});

    const [games] = await bigQuery.query({
      query: `
        SELECT *
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE replay_id IN (${placeholders})
      `,
      params
    });

    res.json(games);
  } catch (error) {
    console.error('Error fetching saved replays:', error);
    res.status(500).send('Error fetching saved replays');
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
      },
      yourTeam = [],
      opponentTeam = [],
      filterStats = false,
      statChanges = {}
    } = req.body;

    console.log("Battle conditions received:", JSON.stringify(battleConditions, null, 2));
    
    if (!pokemonData || !pokemonData.topLeft || !pokemonData.topRight ||
        !pokemonData.bottomLeft || !pokemonData.bottomRight) {
      return res.status(400).json({ error: "Incomplete Pokémon data" });
    }
    
    // Extraer nombres según fila
    const yourPokemon = [
      pokemonData.topLeft.name || '', 
      pokemonData.topRight.name || ''
    ];
    const opponentPokemon = [
      pokemonData.bottomLeft.name || '', 
      pokemonData.bottomRight.name || ''
    ];
    
    // (Otros filtros, items, abilities y statuses se construyen como antes)
    let params = {
      yourPokemon1: yourPokemon[0],
      yourPokemon2: yourPokemon[1],
      opponentPokemon1: opponentPokemon[0],
      opponentPokemon2: opponentPokemon[1]
    };
    
    let matchingTurnsQuery = `
      WITH matching_turns AS (
        SELECT
          r.replay_id,
          t.turn_number,
          t.starts_with.player1 AS player1_pokemon,
          t.starts_with.player2 AS player2_pokemon,
          t.moves_done.player1 AS player1_moves,
          t.moves_done.player2 AS player2_moves,
          t.revealed_pokemon.player1 AS player1_revealed,
          t.revealed_pokemon.player2 AS player2_revealed,
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
    
    // ───────── Filtro por stats ─────────
    // Para topLeft
    if (pokemonData.topLeft.filterStats === true) {
      params.yourHP1  = pokemonData.topLeft.stats.hp;
      params.yourAtk1 = pokemonData.topLeft.stats.atk;
      params.yourDef1 = pokemonData.topLeft.stats.def;
      params.yourSpa1 = pokemonData.topLeft.stats.spa;
      params.yourSpd1 = pokemonData.topLeft.stats.spd;
      params.yourSpe1 = pokemonData.topLeft.stats.spe;
      params.yourAcc1 = pokemonData.topLeft.stats.acc;
      params.yourEva1 = pokemonData.topLeft.stats.eva;
      
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST(
            CASE
              WHEN (t.starts_with.player1[OFFSET(0)] = @yourPokemon1 OR t.starts_with.player1[OFFSET(1)] = @yourPokemon1)
              THEN t.revealed_pokemon.player1
              ELSE t.revealed_pokemon.player2
            END
          ) p
          WHERE p.name = '${yourPokemon[0]}'
            AND p.remaining_hp = @yourHP1
            AND p.stats.atk  = @yourAtk1
            AND p.stats.def  = @yourDef1
            AND p.stats.spa  = @yourSpa1
            AND p.stats.spd  = @yourSpd1
            AND p.stats.spe  = @yourSpe1
            AND p.stats.acc  = @yourAcc1
            AND p.stats.eva  = @yourEva1
        )
      `;
    }
    
    // Para topRight
    if (pokemonData.topRight.filterStats === true) {
      params.yourHP2  = pokemonData.topRight.stats.hp;
      params.yourAtk2 = pokemonData.topRight.stats.atk;
      params.yourDef2 = pokemonData.topRight.stats.def;
      params.yourSpa2 = pokemonData.topRight.stats.spa;
      params.yourSpd2 = pokemonData.topRight.stats.spd;
      params.yourSpe2 = pokemonData.topRight.stats.spe;
      params.yourAcc2 = pokemonData.topRight.stats.acc;
      params.yourEva2 = pokemonData.topRight.stats.eva;
      
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST(
            CASE
              WHEN (t.starts_with.player1[OFFSET(0)] = @yourPokemon2 OR t.starts_with.player1[OFFSET(1)] = @yourPokemon2)
              THEN t.revealed_pokemon.player1
              ELSE t.revealed_pokemon.player2
            END
          ) p
          WHERE p.name = '${yourPokemon[1]}'
            AND p.remaining_hp = @yourHP2
            AND p.stats.atk  = @yourAtk2
            AND p.stats.def  = @yourDef2
            AND p.stats.spa  = @yourSpa2
            AND p.stats.spd  = @yourSpd2
            AND p.stats.spe  = @yourSpe2
            AND p.stats.acc  = @yourAcc2
            AND p.stats.eva  = @yourEva2
        )
      `;
    }
    
    // Para bottomLeft
    if (pokemonData.bottomLeft.filterStats === true) {
      params.oppHP1   = pokemonData.bottomLeft.stats.hp;
      params.oppAtk1  = pokemonData.bottomLeft.stats.atk;
      params.oppDef1  = pokemonData.bottomLeft.stats.def;
      params.oppSpa1  = pokemonData.bottomLeft.stats.spa;
      params.oppSpd1  = pokemonData.bottomLeft.stats.spd;
      params.oppSpe1  = pokemonData.bottomLeft.stats.spe;
      params.oppAcc1  = pokemonData.bottomLeft.stats.acc;
      params.oppEva1  = pokemonData.bottomLeft.stats.eva;
      
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST(
            CASE
              WHEN (t.starts_with.player1[OFFSET(0)] = @opponentPokemon1 OR t.starts_with.player1[OFFSET(1)] = @opponentPokemon1)
              THEN t.revealed_pokemon.player1
              ELSE t.revealed_pokemon.player2
            END
          ) p
          WHERE p.name = '${opponentPokemon[0]}'
            AND p.remaining_hp = @oppHP1
            AND p.stats.atk  = @oppAtk1
            AND p.stats.def  = @oppDef1
            AND p.stats.spa  = @oppSpa1
            AND p.stats.spd  = @oppSpd1
            AND p.stats.spe  = @oppSpe1
            AND p.stats.acc  = @oppAcc1
            AND p.stats.eva  = @oppEva1
        )
      `;
    }
    
    if (pokemonData.bottomRight.filterStats === true) {
      params.oppHP2   = pokemonData.bottomRight.stats.hp;
      params.oppAtk2  = pokemonData.bottomRight.stats.atk;
      params.oppDef2  = pokemonData.bottomRight.stats.def;
      params.oppSpa2  = pokemonData.bottomRight.stats.spa;
      params.oppSpd2  = pokemonData.bottomRight.stats.spd;
      params.oppSpe2  = pokemonData.bottomRight.stats.spe;
      params.oppAcc2  = pokemonData.bottomRight.stats.acc;
      params.oppEva2 = pokemonData.bottomRight.stats.eva;
      
      console.log("BottomRight stats filter:", JSON.stringify({
        hp: params.oppHP2, atk: params.oppAtk2, def: params.oppDef2,
        spa: params.oppSpa2, spd: params.oppSpd2, spe: params.oppSpe2,
        acc: params.oppAcc2, eva: params.oppEva2
      }, null, 2));
      
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST(
            CASE
              WHEN (t.starts_with.player1[OFFSET(0)] = @opponentPokemon2 OR t.starts_with.player1[OFFSET(1)] = @opponentPokemon2)
              THEN t.revealed_pokemon.player1
              ELSE t.revealed_pokemon.player2
            END
          ) p
          WHERE p.name = '${opponentPokemon[1]}'
            AND p.remaining_hp   = @oppHP2
            AND p.stats.atk  = @oppAtk2
            AND p.stats.def  = @oppDef2
            AND p.stats.spa  = @oppSpa2
            AND p.stats.spd  = @oppSpd2
            AND p.stats.spe  = @oppSpe2
            AND p.stats.acc  = @oppAcc2
            AND p.stats.eva  = @oppEva2
        )
      `;
    }
    
    // Filtro para Stats (sólo si se activó el filtro)
    if (filterStats) {
      let statsConditions = [];
      // Para tus Pokémon activos (lado player1)
      ["topLeft", "topRight"].forEach((slot, idx) => {
                statsConditions.push(`
          EXISTS(
            SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
            WHERE rp.name = @yourPokemon${idx+1}
              AND rp.remaining_hs = ${statChanges.hp}
              AND rp.stats.atk = ${statChanges.atk}
              AND rp.stats.def = ${statChanges.def}
              AND rp.stats.spa = ${statChanges.spa}
              AND rp.stats.spd = ${statChanges.spd}
              AND rp.stats.spe = ${statChanges.spe}
              AND rp.stats.acc = ${statChanges.acc}
              AND rp.stats.eva = ${statChanges.eva}
          )
        `);
      });

      // Para los Pokémon activos del oponente (lado player2)
      ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
        statsConditions.push(`
          EXISTS(
            SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
            WHERE rp.name = @opponentPokemon${idx+1}
              AND rp.remaining_hs = ${statChanges.hp}
              AND rp.stats.atk = ${statChanges.atk}
              AND rp.stats.def = ${statChanges.def}
              AND rp.stats.spa = ${statChanges.spa}
              AND rp.stats.spd = ${statChanges.spd}
              AND rp.stats.spe = ${statChanges.spe}
              AND rp.stats.acc = ${statChanges.acc}
              AND rp.stats.eva = ${statChanges.eva}
          )
        `);
      });

      if (statsConditions.length > 0) {
        matchingTurnsQuery += ` AND (${statsConditions.join(' AND ')})`;
      }
    }
    
    // Filtrar el equipo "yourTeam" de manera general, validando nombre, item, ability, tera_type, tera_active, moves, status y si está revelado (revealed)
    if (yourTeam && Array.isArray(yourTeam)) {
      if (yourTeam.length > 0) {
        if (yourTeam.length === 6) {
          yourTeam.forEach(member => {
            // Verificar que el Pokémon esté en el equipo (una sola vez)
            matchingTurnsQuery += `
              AND EXISTS (
                SELECT 1 FROM UNNEST(r.teams.p1) AS tm
                WHERE tm.name = '${member.name}'
                  ${member.item ? `AND tm.item = '${member.item}'` : ''}
                  ${member.ability ? `AND tm.ability = '${member.ability}'` : ''}
                  ${member.moves && member.moves.length > 0 ? `
                    AND (
                      SELECT COUNT(1)
                      FROM UNNEST(tm.moves) AS move
                      WHERE move IN (${member.moves.map(m => `'${m}'`).join(',')})
                    ) = ${member.moves.length}
                  ` : ''}
                  ${member.tera_type ? `AND tm.tera_type = '${member.tera_type}'` : ''}
              )
            `;
            
            // Filtros a nivel del turno (únicos, sin duplicar)
            if (member.fainted) {
              matchingTurnsQuery += `
                AND EXISTS (
                  SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                  WHERE rp.name = '${member.name}'
                    AND rp.remaining_hp = 0
                )
              `;
            } else {
              // Si se marca revealed se agrega la condición de revelado
              if (member.revealed) {
                matchingTurnsQuery += `
                  AND EXISTS (
                    SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                    WHERE rp.name = '${member.name}'
                  )
                `;
              }
              // Filtrado de non‑volatile status en revealed_pokemon:
              //console.log("Non-volatile status:", member.non_volatile_status);
              if (member.non_volatile_status && member.non_volatile_status.trim() !== "") {
                matchingTurnsQuery += `
                  AND EXISTS (
                    SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                    WHERE rp.name = '${member.name}'
                      AND rp.non_volatile_status = '${member.non_volatile_status}'
                  )
                `;
              }
              // Filtrado de tera active en revealed_pokemon:
              if (member.tera_active !== null && member.tera_active !== undefined) {
                matchingTurnsQuery += `
                  AND EXISTS (
                    SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                    WHERE rp.name = '${member.name}'
                      AND rp.tera.active = ${member.tera_active ? 'TRUE' : 'FALSE'}
                  )
                `;
              }
            }
          });
        } else {
          // Para equipos incompletos, exigir que se encuentren todos los nombres enviados (solo por nombre)
          const yourTeamNames = yourTeam.filter(p => p && p.name).map(p => p.name);
          matchingTurnsQuery += `
            AND (
              SELECT COUNT(1)
              FROM r.teams.p1 AS t
              WHERE t.name IN (${yourTeamNames.map(name => `'${name}'`).join(',')})
            ) >= ${yourTeamNames.length}
          `;
        }
      }
    }
    
    // Filtrar el equipo "opponentTeam" de manera general, validando nombre, item, ability, tera_type, tera_active, moves y status
    if (opponentTeam && Array.isArray(opponentTeam)) {
      if (opponentTeam.length > 0) {
        if (opponentTeam.length === 6) {
          opponentTeam.forEach(member => {
            matchingTurnsQuery += `
              AND EXISTS (
                SELECT 1 FROM UNNEST(r.teams.p2) AS tm
                WHERE tm.name = '${member.name}'
                  ${member.item ? `AND tm.item = '${member.item}'` : ''}
                  ${member.ability ? `AND tm.ability = '${member.ability}'` : ''}
                  ${member.moves && member.moves.length > 0 ? `
                    AND (
                      SELECT COUNT(1)
                      FROM UNNEST(tm.moves) AS move
                      WHERE move IN (${member.moves.map(m => `'${m}'`).join(',')})
                    ) = ${member.moves.length}
                  ` : ''}
                  ${member.tera_type ? `AND tm.tera_type = '${member.tera_type}'` : ''}
              )
            `;

            // Si se quiere filtrar por revelado o fainted, usar los arrays de player2
            if (member.fainted) {
              matchingTurnsQuery += `
                AND EXISTS (
                  SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                  WHERE rp.name = '${member.name}'
                    AND rp.remaining_hp = 0
                )
              `;
            } else if (member.revealed) {
              matchingTurnsQuery += `
                AND EXISTS (
                  SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                  WHERE rp.name = '${member.name}'
                )
              `;
            }

            // Filtros adicionales para non-volatile status y tera_active
            if (!member.fainted) {
              if (member.non_volatile_status) {
                matchingTurnsQuery += `
                  AND EXISTS (
                    SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                    WHERE rp.name = '${member.name}'
                      AND rp.non_volatile_status = '${member.non_volatile_status}'
                  )
                `;
              }
              if (member.tera_active !== undefined) {
                matchingTurnsQuery += `
                  AND EXISTS (
                    SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                    WHERE rp.name = '${member.name}'
                      AND rp.tera.active = ${member.tera_active ? 'TRUE' : 'FALSE'}
                  )
                `;
              }
            }
          });
        } else {
          // Lógica para equipos incompletos (solo por nombre, por ejemplo)
          const opponentTeamNames = opponentTeam.filter(p => p && p.name).map(p => `'${p.name}'`).join(',');
          matchingTurnsQuery += `
            AND (
              SELECT COUNT(1)
              FROM r.teams.p2 AS t
              WHERE t.name IN (${opponentTeamNames})
            ) >= ${opponentTeamNames.length}
          `;
        }
      }
    }
    
    // Filtro para los items de los 4 Pokémon activos (seleccionados en Pokémon Dialog)
    let activeItemConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot]; // debes asegurarte de tener este objeto con la info
      if (details && details.item && details.item.trim() !== "") {
        // Caso especial para "No Item"
        if (details.item === "No Item") {
          activeItemConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @yourPokemon${idx+1} AND (p.item IS NULL OR p.item = '')
            )
          `);
        } else {
          const formattedItem = details.item.replace(/\s+/g, '').toLowerCase();
          activeItemConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @yourPokemon${idx+1}
                AND LOWER(REPLACE(p.item, ' ', '')) = '${formattedItem}'
            )
          `);
        }
      }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.item && details.item.trim() !== "") {
        if (details.item === "No Item") {
          activeItemConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @opponentPokemon${idx+1} AND (p.item IS NULL OR p.item = '')
            )
          `);
        } else {
          const formattedItem = details.item.replace(/\s+/g, '').toLowerCase();
          activeItemConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @opponentPokemon${idx+1}
                AND LOWER(REPLACE(p.item, ' ', '')) = '${formattedItem}'
            )
          `);
        }
      }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeItemConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeItemConditions.join(' AND ')})`;
    }

    // Inicializar un array para las condiciones de abilities activas
    let activeAbilityConditions = [];

    // Buscar la habilidad en ambos lados para tus Pokémon activos
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.ability && details.ability.trim() !== "") {
        if (details.ability === "No Ability") {
          activeAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) AS p
                WHERE p.name = @yourPokemon${idx+1} AND (p.ability IS NULL OR p.ability = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) AS p
                WHERE p.name = @yourPokemon${idx+1} AND (p.ability IS NULL OR p.ability = '')
              )
            )
          `);
        } else {
          const formattedAbility = details.ability.toLowerCase().replace(/[^a-z0-9]/g, '');
          activeAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) AS p
                WHERE p.name = @yourPokemon${idx+1}
                  AND LOWER(REPLACE(REPLACE(REPLACE(p.ability, ' ', ''), '-', ''), '_', '')) = '${formattedAbility}'
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) AS p
                WHERE p.name = @yourPokemon${idx+1}
                  AND LOWER(REPLACE(REPLACE(REPLACE(p.ability, ' ', ''), '-', ''), '_', '')) = '${formattedAbility}'
              )
            )
          `);
        }
      }
    });

    // Para los Pokémon activos del oponente (lado player2: bottomLeft, bottomRight)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.ability && details.ability.trim() !== "") {
        if (details.ability === "No Ability") {
          activeAbilityConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @opponentPokemon${idx+1} AND (p.ability IS NULL OR p.ability = '')
            )
          `);
        } else {
          const formattedAbility = details.ability.toLowerCase().replace(/[^a-z0-9]/g, '');
          activeAbilityConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p1) AS p
                WHERE p.name = @opponentPokemon${idx+1}
                  AND LOWER(REPLACE(p.ability, ' ', '')) = '${formattedAbility}'
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(r.teams.p2) AS p
                WHERE p.name = @opponentPokemon${idx+1}
                  AND LOWER(REPLACE(p.ability, ' ', '')) = '${formattedAbility}'
              )
            )
          `);
        }
      }
    });

    // Si se generaron condiciones, se añaden al query general:
    if (activeAbilityConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeAbilityConditions.join(' AND ')})`;
    }

    // Objeto de mapeo para non volatile statuses
    const statusMapping = {
      "burn": "brn",
      "freeze": "frz",
      "frostbite": "frt",
      "paralysis": "par",
      "poison": "psn",
      "badly poisoned": "tox",
      "sleep": "slp"
    };

    let activeNonVolatileStatusConditions = [];

    // Para tus Pokémon activos (lado player1: topLeft, topRight)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.nonVolatileStatus && details.nonVolatileStatus.trim() !== "") {
        if (details.nonVolatileStatus.toLowerCase() === "none") {
          activeNonVolatileStatusConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @yourPokemon${idx+1} AND (rp.non_volatile_status IS NULL OR rp.non_volatile_status = '')
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @yourPokemon${idx+1} AND (rp.non_volatile_status IS NULL OR rp.non_volatile_status = '')
              )
            )
          `);
        } else {
          const mappedStatus = statusMapping[details.nonVolatileStatus.toLowerCase()] || details.nonVolatileStatus.toLowerCase();
          activeNonVolatileStatusConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                  AND LOWER(rp.non_volatile_status) = '${mappedStatus}'
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                  AND LOWER(rp.non_volatile_status) = '${mappedStatus}'
              )
            )
          `);
        }
      }
    });

    // Para los Pokémon activos del oponente (lado player2: bottomLeft, bottomRight)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.nonVolatileStatus && details.nonVolatileStatus.trim() !== "") {
        if (details.nonVolatileStatus.toLowerCase() === "none") {
          activeNonVolatileStatusConditions.push(`
            EXISTS(
              SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
              WHERE rp.name = @opponentPokemon${idx+1} AND (rp.non_volatile_status IS NULL OR rp.non_volatile_status = '')
            )
          `);
        } else {
          const mappedStatus = statusMapping[details.nonVolatileStatus.toLowerCase()] || details.nonVolatileStatus.toLowerCase();
          activeNonVolatileStatusConditions.push(`
            (
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                  AND LOWER(rp.non_volatile_status) = '${mappedStatus}'
              )
              OR
              EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                  AND LOWER(rp.non_volatile_status) = '${mappedStatus}'
              )
            )
          `);
        }
      }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeNonVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeNonVolatileStatusConditions.join(' AND ')})`;
    }

    // Filtro para los volatile statuses de los 4 Pokémon activos (seleccionados en Pokémon Dialog)
    let activeVolatileStatusConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.volatileStatuses && details.volatileStatuses.length > 0) {
        // Normalizar cada volatile status: pasar a minúsculas y quitar espacios
        const normalizedStatuses = details.volatileStatuses.map(s => s.toLowerCase().replace(/\s+/g, ''));
        activeVolatileStatusConditions.push(`
          EXISTS(
            SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp,
                   UNNEST(rp.volatile_status) AS vs
            WHERE rp.name = @yourPokemon${idx+1}
              AND LOWER(REPLACE(vs.name, ' ', '')) IN (${normalizedStatuses.map(s => `'${s}'`).join(',')})
          )
        `);
      }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.volatileStatuses && details.volatileStatuses.length > 0) {
        const normalizedStatuses = details.volatileStatuses.map(s => s.toLowerCase().replace(/\s+/g, ''));
        activeVolatileStatusConditions.push(`
          EXISTS(
            SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp,
                   UNNEST(rp.volatile_status) AS vs
            WHERE rp.name = @opponentPokemon${idx+1}
              AND LOWER(REPLACE(vs.name, ' ', '')) IN (${normalizedStatuses.map(s => `'${s}'`).join(',')})
          )
        `);
      }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeVolatileStatusConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeVolatileStatusConditions.join(' AND ')})`;
    }

    // Filtro para los moves de los 4 Pokémon activos (seleccionados en Pokémon Dialog)
    let activeMovesConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.moves && details.moves.length > 0) {
        // Extraer el nombre del movimiento si es objeto o usar el valor directamente
        const movesArray = details.moves.map(m => (typeof m === 'object' && m.name ? m.name : m));
        // Normalizar cada movimiento: pasar a minúsculas y quitar espacios
        const normalizedMoves = movesArray.map(m => m.toLowerCase().replace(/\s+/g, ''));
        activeMovesConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @yourPokemon${idx+1}
                AND (
                  SELECT COUNT(1)
                  FROM UNNEST(p.moves) AS move
                  WHERE LOWER(REPLACE(move, ' ', '')) IN (${normalizedMoves.map(m => `'${m}'`).join(',')})
                ) = ${normalizedMoves.length}
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @yourPokemon${idx+1}
                AND (
                  SELECT COUNT(1)
                  FROM UNNEST(p.moves) AS move
                  WHERE LOWER(REPLACE(move, ' ', '')) IN (${normalizedMoves.map(m => `'${m}'`).join(',')})
                ) = ${normalizedMoves.length}
            )
          )
        `);
      }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.moves && details.moves.length > 0) {
        const movesArray = details.moves.map(m => (typeof m === 'object' && m.name ? m.name : m));
        const normalizedMoves = movesArray.map(m => m.toLowerCase().replace(/\s+/g, ''));
        activeMovesConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @opponentPokemon${idx+1}
                AND (
                  SELECT COUNT(1)
                  FROM UNNEST(p.moves) AS move
                  WHERE LOWER(REPLACE(move, ' ', '')) IN (${normalizedMoves.map(m => `'${m}'`).join(',')})
                ) = ${normalizedMoves.length}
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @opponentPokemon${idx+1}
                AND (
                  SELECT COUNT(1)
                  FROM UNNEST(p.moves) AS move
                  WHERE LOWER(REPLACE(move, ' ', '')) IN (${normalizedMoves.map(m => `'${m}'`).join(',')})
                ) = ${normalizedMoves.length}
            )
          )
        `);
      }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeMovesConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeMovesConditions.join(' AND ')})`;
    }

    // Filtro para los tera type de los 4 Pokémon activos (seleccionados en Pokémon Dialog)
    let activeTeraTypeConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.teraType && details.teraType.trim() !== "") {
        const normalizedTeraType = details.teraType.toLowerCase().replace(/\s+/g, '');
        activeTeraTypeConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @yourPokemon${idx+1}
                AND LOWER(REPLACE(p.tera_type, ' ', '')) = '${normalizedTeraType}'
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @yourPokemon${idx+1}
                AND LOWER(REPLACE(p.tera_type, ' ', '')) = '${normalizedTeraType}'
            )
          )
        `);
      }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && details.teraType && details.teraType.trim() !== "") {
        const normalizedTeraType = details.teraType.toLowerCase().replace(/\s+/g, '');
        activeTeraTypeConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p1) AS p
              WHERE p.name = @opponentPokemon${idx+1}
                AND LOWER(REPLACE(p.tera_type, ' ', '')) = '${normalizedTeraType}'
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(r.teams.p2) AS p
              WHERE p.name = @opponentPokemon${idx+1}
                AND LOWER(REPLACE(p.tera_type, ' ', '')) = '${normalizedTeraType}'
            )
          )
        `);
      }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeTeraTypeConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeTeraTypeConditions.join(' AND ')})`;
    }

    // Filtro para Tera Active de los 4 Pokémon activos (seleccionados en Pokémon Dialog)
    let activeTeraActiveConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && typeof details.teraActive === 'boolean') {
        const condition = details.teraActive ? 'TRUE' : 'FALSE';
        activeTeraActiveConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
              WHERE rp.name = @yourPokemon${idx+1}
                AND rp.tera.active = ${condition}
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
              WHERE rp.name = @yourPokemon${idx+1}
                AND rp.tera.active = ${condition}
            )
          )
        `);
      }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
      const details = pokemonData[slot];
      if (details && typeof details.teraActive === 'boolean') {
        const condition = details.teraActive ? 'TRUE' : 'FALSE';
        activeTeraActiveConditions.push(`
          (
            EXISTS(
              SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
              WHERE rp.name = @opponentPokemon${idx+1}
                AND rp.tera.active = ${condition}
            )
            OR
            EXISTS(
              SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
              WHERE rp.name = @opponentPokemon${idx+1}
                AND rp.tera.active = ${condition}
            )
          )
        `);
      }
    });

    if (activeTeraActiveConditions.length > 0) {
      matchingTurnsQuery += ` AND (${activeTeraActiveConditions.join(' AND ')})`;
    }

        if (battleConditions.weather && battleConditions.weatherDuration) {
      const normWeather = battleConditions.weather.toLowerCase().replace(/\s+/g, '');
      if (normWeather === 'any') {
        // No se aplica ningún filtro para weather
      } else if (normWeather === 'none') {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE (turn.weather.condition IS NULL OR TRIM(turn.weather.condition) = '')
              AND turn.weather.duration = 0
          )
        `;
      } else {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE LOWER(REPLACE(turn.weather.condition, ' ', '')) LIKE '%${normWeather}%'
              AND turn.weather.duration = ${battleConditions.weatherDuration}
          )
        `;
      }
    }

    // Filtro para Field
    if (battleConditions.field && battleConditions.fieldDuration) {
      const normField = battleConditions.field.toLowerCase().replace(/\s+/g, '');
      if (normField === 'any') {
        // No se aplica ningún filtro para field
      } else if (normField === 'none') {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE (turn.field.terrain IS NULL OR TRIM(turn.field.terrain) = '')
              AND turn.field.duration = 0
          )
        `;
      } else {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE LOWER(REPLACE(turn.field.terrain, ' ', '')) LIKE '%${normField}%'
              AND turn.field.duration = ${battleConditions.fieldDuration}
          )
        `;
      }
    }

    // Filtro para Room
    if (battleConditions.room && battleConditions.roomDuration) {
      const normRoom = battleConditions.room.toLowerCase().replace(/\s+/g, '');
      if (normRoom === 'any') {
        // No se aplica ningún filtro para room
      } else if (normRoom === 'none') {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE (turn.room.condition IS NULL OR TRIM(turn.room.condition) = '')
              AND turn.room.duration = 0
          )
        `;
      } else {
        matchingTurnsQuery += `
          AND EXISTS (
            SELECT 1 FROM UNNEST([t]) AS turn
            WHERE LOWER(REPLACE(turn.room.condition, ' ', '')) LIKE '%${normRoom}%'
              AND turn.room.duration = ${battleConditions.roomDuration}
          )
        `;
      }
    }

    // Filtro para Tailwind – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.tailwind === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.tailwind !== undefined
    ) {
      const twYour = battleConditions.sideEffects.yourSide.tailwind ? 'TRUE' : 'FALSE';
      const durationYour = battleConditions.sideEffectsDuration.yourSide.tailwind;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.tailwind.player1 = ${twYour}
              AND turn.tailwind.duration1 = ${durationYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.tailwind.player2 = ${twYour}
              AND turn.tailwind.duration2 = ${durationYour}
            )
          )
        )
      `;
    }

    // Filtro para Tailwind – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.tailwind === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.tailwind !== undefined
    ) {
      const twOpponent = battleConditions.sideEffects.opponentSide.tailwind ? 'TRUE' : 'FALSE';
      const durationOpponent = battleConditions.sideEffectsDuration.opponentSide.tailwind;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.tailwind.player1 = ${twOpponent}
              AND turn.tailwind.duration1 = ${durationOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.tailwind.player2 = ${twOpponent}
              AND turn.tailwind.duration2 = ${durationOpponent}
            )
          )
        )
      `;
    }

    // Filtro para reflect – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.reflect === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.reflect !== undefined
    ) {
      const reflectYour = battleConditions.sideEffects.yourSide.reflect ? 'TRUE' : 'FALSE';
      const durationYour = battleConditions.sideEffectsDuration.yourSide.reflect;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.reflect.player1 = ${reflectYour}
              AND turn.screens.reflect.duration1 = ${durationYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.reflect.player2 = ${reflectYour}
              AND turn.screens.reflect.duration2 = ${durationYour}
            )
          )
        )
      `;
    }

    // Filtro para reflect – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.reflect === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.reflect !== undefined
    ) {
      const reflectOpponent = battleConditions.sideEffects.opponentSide.reflect ? 'TRUE' : 'FALSE';
      const durationOpponent = battleConditions.sideEffectsDuration.opponentSide.reflect;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.reflect.player1 = ${reflectOpponent}
              AND turn.screens.reflect.duration1 = ${durationOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.reflect.player2 = ${reflectOpponent}
              AND turn.screens.reflect.duration2 = ${durationOpponent}
            )
          )
        )
      `;
    }

    // Filtro para light screen – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.lightscreen === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.lightscreen !== undefined
    ) {
      // Usamos la misma nomenclatura: 'lightscreen'
      const lightscreenYour = battleConditions.sideEffects.yourSide.lightscreen ? 'TRUE' : 'FALSE';
      const durationYour = battleConditions.sideEffectsDuration.yourSide.lightscreen;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1)
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.lightscreen.player1 = ${lightscreenYour}
              AND turn.screens.lightscreen.duration1 >= ${durationYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2)
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.lightscreen.player2 = ${lightscreenYour}
              AND turn.screens.lightscreen.duration2 >= ${durationYour}
            )
          )
        )
      `;
    }

    // Filtro para light screen – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.lightScreen === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.lightScreen !== undefined
    ) {
      const lightScreenOpponent = battleConditions.sideEffects.opponentSide.lightScreen ? 'TRUE' : 'FALSE';
      const durationOpponent = battleConditions.sideEffectsDuration.opponentSide.lightScreen;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.lightscreen.player1 = ${lightScreenOpponent}
              AND turn.screens.lightscreen.duration1 = ${durationOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.lightscreen.player2 = ${lightScreenOpponent}
              AND turn.screens.lightscreen.duration2 = ${durationOpponent}
            )
          )
        )
      `;
    }

    // Filtro para Aurora Veil – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      battleConditions.sideEffects.yourSide.auroraveil !== undefined &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.auroraveil !== undefined
    ) {
      const avYour = battleConditions.sideEffects.yourSide.auroraveil ? 'TRUE' : 'FALSE';
      const durationYourAV = battleConditions.sideEffectsDuration.yourSide.auroraveil;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.auroraveil.player1 = ${avYour}
              AND turn.screens.auroraveil.duration1 = ${durationYourAV}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2)
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.auroraveil.player2 = ${avYour}
              AND turn.screens.auroraveil.duration2 = ${durationYourAV}
            )
          )
        )
      `;
    }

    // Filtro para Aurora Veil – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      battleConditions.sideEffects.opponentSide.auroraveil !== undefined &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.auroraveil !== undefined
    ) {
      const avOpp = battleConditions.sideEffects.opponentSide.auroraveil ? 'TRUE' : 'FALSE';
      const durationOppAV = battleConditions.sideEffectsDuration.opponentSide.auroraveil;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1)
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.screens.auroraveil.player1 = ${avOpp}
              AND turn.screens.auroraveil.duration1 = ${durationOppAV}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2)
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.screens.auroraveil.player2 = ${avOpp}
              AND turn.screens.auroraveil.duration2 = ${durationOppAV}
            )
          )
        )
      `;
    }

    // Filtro para aurora veil – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.auroraVeil === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.auroraVeil !== undefined
    ) {
      const auroraVeilYour = battleConditions.sideEffects.yourSide.auroraVeil ? 'TRUE' : 'FALSE';
      const durationYour = battleConditions.sideEffectsDuration.yourSide.auroraVeil;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.aurora_veil.player1 = ${auroraVeilYour}
              AND turn.aurora_veil.duration1 = ${durationYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.aurora_veil.player2 = ${auroraVeilYour}
              AND turn.aurora_veil.duration2 = ${durationYour}
            )
          )
        )
      `;
    }

    // Filtro para aurora veil – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.auroraVeil === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.auroraVeil !== undefined
    ) {
      const auroraVeilOpponent = battleConditions.sideEffects.opponentSide.auroraVeil ? 'TRUE' : 'FALSE';
      const durationOpponent = battleConditions.sideEffectsDuration.opponentSide.auroraVeil;
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.aurora_veil.player1 = ${auroraVeilOpponent}
              AND turn.aurora_veil.duration1 = ${durationOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.aurora_veil.player2 = ${auroraVeilOpponent}
              AND turn.aurora_veil.duration2 = ${durationOpponent}
            )
          )
        )
      `;
    }

    // Filtro para spikes – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.spikes === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.spikes !== undefined
    ) {
      const spikesYour = battleConditions.sideEffects.yourSide.spikes ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.spikes.player1 = ${spikesYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.spikes.player2 = ${spikesYour}
            )
          )
        )
      `;
    }

    // Filtro para spikes – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.spikes === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.spikes !== undefined
    ) {
      const spikesOpponent = battleConditions.sideEffects.opponentSide.spikes ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.spikes.player1 = ${spikesOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.spikes.player2 = ${spikesOpponent}
            )
          )
        )
      `;
    }

    // Filtro para toxic spikes – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.toxicSpikes === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.toxicSpikes !== undefined
    ) {
      const toxicSpikesYour = battleConditions.sideEffects.yourSide.toxicSpikes ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.toxic_spikes.player1 = ${toxicSpikesYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.toxic_spikes.player2 = ${toxicSpikesYour}
            )
          )
        )
      `;
    }

    // Filtro para toxic spikes – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.toxicSpikes === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.toxicSpikes !== undefined
    ) {
      const toxicSpikesOpponent = battleConditions.sideEffects.opponentSide.toxicSpikes ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.toxic_spikes.player1 = ${toxicSpikesOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.toxic_spikes.player2 = ${toxicSpikesOpponent}
            )
          )
        )
      `;
    }

    // Filtro para stealth rock – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.stealthRock === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.stealthRock !== undefined
    ) {
      const stealthRockYour = battleConditions.sideEffects.yourSide.stealthRock ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.stealth_rock.player1 = ${stealthRockYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.stealth_rock.player2 = ${stealthRockYour}
            )
          )
        )
      `;
    }

    // Filtro para stealth rock – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.stealthRock === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.stealthRock !== undefined
    ) {
      const stealthRockOpponent = battleConditions.sideEffects.opponentSide.stealthRock ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.stealth_rock.player1 = ${stealthRockOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.stealth_rock.player2 = ${stealthRockOpponent}
            )
          )
        )
      `;
    }

    // Filtro para sticky web – Tu lado
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.yourSide &&
      typeof battleConditions.sideEffects.yourSide.stickyWeb === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.yourSide &&
      battleConditions.sideEffectsDuration.yourSide.stickyWeb !== undefined
    ) {
      const stickyWebYour = battleConditions.sideEffects.yourSide.stickyWeb ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.sticky_web.player1 = ${stickyWebYour}
            )
            OR
            (
              '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.sticky_web.player2 = ${stickyWebYour}
            )
          )
        )
      `;
    }

    // Filtro para sticky web – Oponente
    if (
      battleConditions.sideEffects &&
      battleConditions.sideEffects.opponentSide &&
      typeof battleConditions.sideEffects.opponentSide.stickyWeb === 'boolean' &&
      battleConditions.sideEffectsDuration &&
      battleConditions.sideEffectsDuration.opponentSide &&
      battleConditions.sideEffectsDuration.opponentSide.stickyWeb !== undefined
    ) {
      const stickyWebOpponent = battleConditions.sideEffects.opponentSide.stickyWeb ? 'TRUE' : 'FALSE';
      matchingTurnsQuery += `
        AND EXISTS (
          SELECT 1 FROM UNNEST([t]) AS turn
          WHERE (
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
              AND turn.spikes.sticky_web.player1 = ${stickyWebOpponent}
            )
            OR
            (
              '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) 
              AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
              AND turn.spikes.sticky_web.player2 = ${stickyWebOpponent}
            )
          )
        )
      `;
    }

    // Mapeo de nombres de hazards a las propiedades en la base de datos
    const hazardsMapping = {
      "Spikes": "spikes",
      "Toxic Spikes": "toxic_spikes",
      "Stealth Rock": "stealth_rock",
      "Sticky Web": "sticky_web"
    };

    // Filtro para Entry Hazards – Tu lado
    if (battleConditions.entryHazards && battleConditions.entryHazards.yourSide) {
      for (const hazard in battleConditions.entryHazards.yourSide) {
        if (battleConditions.entryHazards.yourSide[hazard] === true) {
          const prop = hazardsMapping[hazard];
          let hazardCondition = "";
          // Para Spikes y Toxic Spikes son int (nivel mínimo)
          if (hazard === "Spikes" || hazard === "Toxic Spikes") {
            const level = (battleConditions.entryHazardsLevel?.yourSide?.[hazard]) || 0;
            hazardCondition = `(turn.spikes.player1.${prop} = ${level})`;
          } else {
            // Para Stealth Rock y Sticky Web se espera un booleano y opcionalmente duración
            hazardCondition = `(turn.spikes.player1.${prop} = TRUE)`;
          }
          matchingTurnsQuery += `
            AND EXISTS (
              SELECT 1 FROM UNNEST([t]) AS turn
              WHERE (
                (
                  '${yourPokemon[0]}' IN UNNEST(t.starts_with.player1)
                  AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1)
                  AND ${hazardCondition}
                )
                OR
                (
                  '${yourPokemon[0]}' IN UNNEST(t.starts_with.player2)
                  AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player2)
                  AND ${hazardCondition.replace("player1", "player2")}
                )
              )
            )
          `;
        }
      }
    }

    // Filtro para Entry Hazards – Oponente
    if (battleConditions.entryHazards && battleConditions.entryHazards.opponentSide) {
      for (const hazard in battleConditions.entryHazards.opponentSide) {
        if (battleConditions.entryHazards.opponentSide[hazard] === true) {
          const prop = hazardsMapping[hazard];
          let hazardCondition = "";
          if (hazard === "Spikes" || hazard === "Toxic Spikes") {
            const level = (battleConditions.entryHazardsLevel?.opponentSide?.[hazard]) || 0;
            hazardCondition = `(turn.spikes.player1.${prop} >= ${level})`;
          } else {
            hazardCondition = `(turn.spikes.player1.${prop} = TRUE)`;
          }
          matchingTurnsQuery += `
            AND EXISTS (
              SELECT 1 FROM UNNEST([t]) AS turn
              WHERE (
                (
                  '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player1)
                  AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player1)
                  AND ${hazardCondition}
                )
                OR
                (
                  '${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2)
                  AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2)
                  AND ${hazardCondition.replace("player1", "player2")}
                )
              )
            )
          `;
        }
      }
    }

    // Se añaden condiciones para que ambos equipos estén correctamente posicionados
    matchingTurnsQuery += `
          AND (
            (
              ('${yourPokemon[0]}' IN UNNEST(t.starts_with.player1) AND '${yourPokemon[1]}' IN UNNEST(t.starts_with.player1))
              AND
              ('${opponentPokemon[0]}' IN UNNEST(t.starts_with.player2) AND '${opponentPokemon[1]}' IN UNNEST(t.starts_with.player2))
            )
            OR
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
          WHEN (m.player1_pokemon[OFFSET(0)] = @yourPokemon1 OR m.player1_pokemon[OFFSET(1)] = @yourPokemon1)
            AND (m.player1_pokemon[OFFSET(0)] = @yourPokemon2 OR m.player1_pokemon[OFFSET(1)] = @yourPokemon2)
            THEN (m.winner = m.player1)
          ELSE (m.winner = m.player2)
        END as your_team_won
      FROM matching_turns m
    `;
    
    // Log final query y parámetros para depuración
    console.log("Final BigQuery params:\n", JSON.stringify(params, null, 2));
    console.log("Final BigQuery query:\n", matchingTurnsQuery);
    
    const [matchingScenarios] = await bigQuery.query({ query: matchingTurnsQuery, params });
    console.log(`Found ${matchingScenarios.length} matching scenarios`);
    
    if (matchingScenarios.length === 0) {
      return res.json({
        matchingScenarios: 0,
        message: "No matching battle scenarios found with these Pokémon."
      });
    }
    
    // Se llama a la función de análisis según la lógica original
    const analysis = analyzeMatchingScenarios(matchingScenarios, yourPokemon, /* yourItems, yourAbilities */);
    
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

// Endpoint para obtener el porcentaje de victorias por Pokémon agrupados por mes
app.get('/api/victories', async (req, res) => {
  try {
    const totalQuery = `
      SELECT month, pokemon, SUM(cnt) AS total_games FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.name) AS pokemon,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t
        GROUP BY month, pokemon
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.name) AS pokemon,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t
        GROUP BY month, pokemon
      )
      GROUP BY month, pokemon
      ORDER BY month DESC
    `;
    
    // Consulta para obtener cuántas veces ganó cada Pokémon, agrupado por mes.
    // Se utiliza la misma agrupación y se comparan los valores de winner con player1/player2 respectivamente.
    const winsQuery = `
      SELECT month, pokemon, SUM(w) AS wins FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.name) AS pokemon,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t
        WHERE r.winner = r.player1
        GROUP BY month, pokemon
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.name) AS pokemon,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t
        WHERE r.winner = r.player2
        GROUP BY month, pokemon
      )
      GROUP BY month, pokemon
      ORDER BY month DESC
    `;
    
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    
    // Creamos un mapa de victorias indexado por "month_pokemon"
    const winsMap = {};
    winsRows.forEach(row => {
      const key = `${row.month}_${row.pokemon}`;
      winsMap[key] = parseInt(row.wins);
    });
    
    // Para cada combinación (mes, Pokémon) calculamos el porcentaje: (victorias / partidos totales) * 100
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const key = `${row.month}_${row.pokemon}`;
      const wins = winsMap[key] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        month: row.month,
        pokemon: row.pokemon,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching victories data:", error);
    res.status(500).json({ error: "Error fetching victories data" });
  }
});

// Endpoint: Win rate de HABILIDADES de un Pokémon agrupado por mes
app.get('/api/victories/abilities', async (req, res) => {
  const { pokemon } = req.query;
  if (!pokemon) return res.status(400).json({ error: "El parámetro 'pokemon' es obligatorio" });
  try {
    // Total de partidos en que el Pokémon aparece con cada habilidad, agrupados por mes
    const totalQuery = `
      SELECT month, ability, SUM(cnt) AS total_games FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.ability) AS ability,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        GROUP BY month, ability
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.ability) AS ability,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        GROUP BY month, ability
      )
      GROUP BY month, ability
      ORDER BY month DESC
    `;
    // Victorias: usando r.winner = r.player1 o r.player2 respectivamente, agrupados por mes
    const winsQuery = `
      SELECT month, ability, SUM(w) AS wins FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.ability) AS ability,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player1
        GROUP BY month, ability
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.ability) AS ability,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player2
        GROUP BY month, ability
      )
      GROUP BY month, ability
      ORDER BY month DESC
    `;
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    // Crear un mapa indexado por month y ability
    const winsMap = {};
    winsRows.forEach(row => {
      const key = `${row.month}_${row.ability}`;
      winsMap[key] = parseInt(row.wins);
    });
    // Mapear los resultados por mes y habilidad
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const key = `${row.month}_${row.ability}`;
      const wins = winsMap[key] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        month: row.month,
        ability: row.ability,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching abilities victories:", error);
    res.status(500).json({ error: "Error fetching abilities victories" });
  }
});

// Endpoint: Win rate de OBJETOS de un Pokémon, agrupado por mes
app.get('/api/victories/items', async (req, res) => {
  const { pokemon } = req.query;
  if (!pokemon) return res.status(400).json({ error: "El parámetro 'pokemon' es obligatorio" });
  try {
    const totalQuery = `
      SELECT month, item, SUM(cnt) AS total_games FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.item) AS item,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        GROUP BY month, item
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.item) AS item,
               COUNT(*) AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        GROUP BY month, item
      )
      GROUP BY month, item
      ORDER BY month DESC
    `;
    const winsQuery = `
      SELECT month, item, SUM(w) AS wins FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.item) AS item,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player1
        GROUP BY month, item
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.item) AS item,
               COUNT(*) AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player2
        GROUP BY month, item
      )
      GROUP BY month, item
      ORDER BY month DESC
    `;
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    const winsMap = {};
    winsRows.forEach(row => {
      const key = `${row.month}_${row.item}`;
      winsMap[key] = parseInt(row.wins);
    });
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const key = `${row.month}_${row.item}`;
      const wins = winsMap[key] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        month: row.month,
        item: row.item,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching items victories:", error);
    res.status(500).json({ error: "Error fetching items victories" });
  }
});

// Endpoint: Win rate de MOVIMIENTOS de un Pokémon, agrupado por mes
app.get('/api/victories/moves', async (req, res) => {
  const { pokemon } = req.query;
  if (!pokemon) return res.status(400).json({ error: "El parámetro 'pokemon' es obligatorio" });
  try {
    const totalQuery = `
      SELECT month, move, SUM(cnt) AS total_games FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(m) AS move,
               1 AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t,
             UNNEST(t.moves) AS m
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(m) AS move,
               1 AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t,
             UNNEST(t.moves) AS m
        WHERE LOWER(t.name)=LOWER('${pokemon}')
      )
      GROUP BY month, move
      ORDER BY month DESC
    `;
    const winsQuery = `
      SELECT month, move, SUM(w) AS wins FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(m) AS move,
               1 AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t,
             UNNEST(t.moves) AS m
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player1
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(m) AS move,
               1 AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t,
             UNNEST(t.moves) AS m
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player2
      )
      GROUP BY month, move
      ORDER BY month DESC
    `;
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    const winsMap = {};
    winsRows.forEach(row => {
      const key = `${row.month}_${row.move}`;
      winsMap[key] = parseInt(row.wins);
    });
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const key = `${row.month}_${row.move}`;
      const wins = winsMap[key] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        month: row.month,
        move: row.move,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching moves victories:", error);
    res.status(500).json({ error: "Error fetching moves victories" });
  }
});

// Endpoint: Win rate de TERA TYPES de un Pokémon, agrupado por mes
app.get('/api/victories/tera', async (req, res) => {
  const { pokemon } = req.query;
  if (!pokemon) return res.status(400).json({ error: "El parámetro 'pokemon' es obligatorio" });
  try {
    const totalQuery = `
      SELECT month, tera_type, SUM(cnt) AS total_games FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.tera_type) AS tera_type,
               1 AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.tera_type) AS tera_type,
               1 AS cnt
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}')
      )
      GROUP BY month, tera_type
      ORDER BY month DESC
    `;
    const winsQuery = `
      SELECT month, tera_type, SUM(w) AS wins FROM (
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.tera_type) AS tera_type,
               1 AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p1) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player1
        GROUP BY month, tera_type
        UNION ALL
        SELECT FORMAT_TIMESTAMP('%Y-%m', r.date) AS month,
               LOWER(t.tera_type) AS tera_type,
               1 AS w
        FROM \`pokemon-statistics.pokemon_replays.replays\` r, UNNEST(teams.p2) AS t
        WHERE LOWER(t.name)=LOWER('${pokemon}') AND r.winner = r.player2
        GROUP BY month, tera_type
      )
      GROUP BY month, tera_type
      ORDER BY month DESC
    `;
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    const winsMap = {};
    winsRows.forEach(row => {
      const key = `${row.month}_${row.tera_type}`;
      winsMap[key] = parseInt(row.wins);
    });
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const key = `${row.month}_${row.tera_type}`;
      const wins = winsMap[key] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        month: row.month,
        tera_type: row.tera_type,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching tera types victories:", error);
    res.status(500).json({ error: "Error fetching tera types victories" });
  }
});

// Endpoint: Win rate de TEAMMATES de un Pokémon
app.get('/api/victories/teammates', async (req, res) => {
  const { pokemon } = req.query;
  if (!pokemon) return res.status(400).json({ error: "El parámetro 'pokemon' es obligatorio" });
  try {
    // Consulta TOTAL: agrupa por teammate en todos los partidos donde el Pokémon aparece
    const totalQuery = `
      SELECT teammate, SUM(total_games) AS total_games FROM (
        SELECT LOWER(t2.name) AS teammate, COUNT(*) AS total_games
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t1,
             UNNEST(teams.p1) AS t2
        WHERE LOWER(t1.name) = LOWER('${pokemon}') 
          AND LOWER(t2.name) <> LOWER('${pokemon}')
        GROUP BY teammate
        UNION ALL
        SELECT LOWER(t2.name) AS teammate, COUNT(*) AS total_games
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t1,
             UNNEST(teams.p2) AS t2
        WHERE LOWER(t1.name) = LOWER('${pokemon}') 
          AND LOWER(t2.name) <> LOWER('${pokemon}')
        GROUP BY teammate
      )
      GROUP BY teammate
      ORDER BY teammate
    `;
    
    // Consulta WINS: agrupa globalmente las victorias por teammate
    const winsQuery = `
      SELECT teammate, SUM(wins) AS wins FROM (
        SELECT LOWER(t2.name) AS teammate, COUNT(*) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p1) AS t1,
             UNNEST(teams.p1) AS t2
        WHERE LOWER(t1.name) = LOWER('${pokemon}') 
          AND LOWER(t2.name) <> LOWER('${pokemon}')
          AND r.winner = r.player1
        GROUP BY teammate
        UNION ALL
        SELECT LOWER(t2.name) AS teammate, COUNT(*) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\` r,
             UNNEST(teams.p2) AS t1,
             UNNEST(teams.p2) AS t2
        WHERE LOWER(t1.name) = LOWER('${pokemon}') 
          AND LOWER(t2.name) <> LOWER('${pokemon}')
          AND r.winner = r.player2
        GROUP BY teammate
      )
      GROUP BY teammate
      ORDER BY teammate
    `;
    
    const [totalRows] = await bigQuery.query(totalQuery);
    const [winsRows] = await bigQuery.query(winsQuery);
    
    // Crear un diccionario de victorias por teammate
    const winsMap = {};
    winsRows.forEach(row => {
      winsMap[row.teammate] = parseInt(row.wins);
    });
    
    // Mapear y calcular win_rate para cada teammate
    const result = totalRows.map(row => {
      const total = parseInt(row.total_games);
      const teammate = row.teammate;
      const wins = winsMap[teammate] || 0;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(2) : "0.00";
      return {
        teammate,
        total_games: total,
        wins: wins,
        win_rate: parseFloat(winRate)
      };
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching teammates victories:", error);
    res.status(500).json({ error: "Error fetching teammates victories" });
  }
});

// Endpoint: Team usage statistics grouped by month
app.get('/api/teams/usage', async (req, res) => {
  try {
    const {
      format: formatParam,
      month: monthParam,
      page = '1',
      limit = '12',
      sortBy = 'usage',
      sortDir = 'desc'
    } = req.query;
    const pageInt  = parseInt(page,  10);
    const limitInt = parseInt(limit, 10);
    const offset   = (pageInt - 1) * limitInt;

    if (!formatParam) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    // extraer rating mínimo (p.ej. “1760” de “gen9vgc2025reggbo3-1760”)
    let minRating = 0;
    let formatName = formatParam;
    const parts = formatParam.split('-');
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      minRating = parseInt(last, 10);
      parts.pop();
      formatName = parts.join('-');
    }

    const query = `
      WITH team_stats AS (
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          ARRAY_TO_STRING(
            ARRAY(
              SELECT LOWER(p.name)
              FROM UNNEST(teams.p1) AS p
              ORDER BY LOWER(p.name)
            ), ';'
          ) AS team,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player1 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%reg g%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
        GROUP BY month, team
        UNION ALL
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          ARRAY_TO_STRING(
            ARRAY(
              SELECT LOWER(p.name)
              FROM UNNEST(teams.p2) AS p
              ORDER BY LOWER(p.name)
            ), ';'
          ) AS team,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player2 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%reg g%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
        GROUP BY month, team
      )
      SELECT
        month,
        team,
        SUM(total_games) AS total_games,
        SUM(wins) AS wins,
        ROUND(SUM(wins)/SUM(total_games)*100, 2) AS win_rate
      FROM team_stats
      GROUP BY month, team
      ORDER BY month ASC, win_rate DESC
    `;

    const [rows] = await bigQuery.query({
      query,
      params: { formatName, minRating }
    });

    // Group rows by team and build history array
    const teamMap = {};
    rows.forEach(({ month, team, total_games, wins, win_rate }) => {
      if (!teamMap[team]) {
        teamMap[team] = { name: team, history: [] };
      }
      teamMap[team].history.push({
        month,
        usage: win_rate,
        total_games,
        wins
      });
    });

    // Build full team array with history and current‐month stats
    const teams = Object.values(teamMap).map(t => {
      t.history.sort((a,b) => a.month.localeCompare(b.month));
      // find record for the selected month
      const rec = t.history.find(h => h.month === monthParam) || { usage:0, total_games:0, wins:0 };
      t.monthly_usage       = rec.usage;
      t.monthly_total_games = rec.total_games;
      t.monthly_wins        = rec.wins;
      return t;
    });

    // sort by monthly_usage or monthly_total_games
    teams.sort((a,b) => {
      const dir = sortDir.toLowerCase()==='asc'?1:-1;
      const field = sortBy==='total_games'?'monthly_total_games':'monthly_usage';
      return dir*(a[field] - b[field]);
    });

    // apply pagination
    const paged = teams.slice(offset, offset + limitInt);
    res.json({ teams: paged, total: teams.length });
  } catch (error) {
    console.error("Error fetching team usage:", error);
    res.status(500).json({ error: "Error fetching team usage" });
  }
});

// Endpoint: Lead usage statistics grouped by month
app.get('/api/leads/usage', async (req, res) => {
  try {
    const {
      format: formatParam,
      month: monthParam,
      page = '1',
      limit = '12',
      sortBy = 'win_rate',
      sortDir = 'desc'
    } = req.query;
    const pageInt  = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset   = (pageInt - 1) * limitInt;

    if (!formatParam) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    // extraer rating mínimo (ej. “1760” de “gen9vgc2025reggbo3-1760”)
    let minRating = 0;
    const parts = formatParam.split('-');
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      minRating = parseInt(last, 10);
      parts.pop();
    }

    const query = `
      WITH lead_stats AS (
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          /* first two starters on player1 side */
          CONCAT(
            LOWER(teams.p1[OFFSET(0)].name), ';',
            LOWER(teams.p1[OFFSET(1)].name)
          ) AS lead,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player1 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%reg g%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
          AND ARRAY_LENGTH(teams.p1) >= 2   -- need two starting Pokémon
        GROUP BY month, lead
        UNION ALL
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          /* first two starters on player2 side */
          CONCAT(
            LOWER(teams.p2[OFFSET(0)].name), ';',
            LOWER(teams.p2[OFFSET(1)].name)
          ) AS lead,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player2 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%reg g%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
          AND ARRAY_LENGTH(teams.p2) >= 2   -- need two starting Pokémon
        GROUP BY month, lead
      )
      SELECT
        month,
        lead,
        SUM(total_games) AS total_games,
        SUM(wins)       AS wins,
        ROUND(SUM(wins)/SUM(total_games)*100, 2) AS win_rate
      FROM lead_stats
      GROUP BY month, lead
      ORDER BY month ASC, win_rate DESC
    `;

    const [rows] = await bigQuery.query({ query, params: { minRating } });

    // Group rows by lead and build history
    const leadMap = {};
    rows.forEach(({ month, lead, total_games, wins, win_rate }) => {
      if (!leadMap[lead]) leadMap[lead] = { name: lead, history: [] };
      leadMap[lead].history.push({
        month,
        total_games,
        wins,
        usage: win_rate
      });
    });

    // Assemble array, extract stats for monthParam, sort & paginate
    let leads = Object.values(leadMap).map(l => {
      l.history.sort((a,b) => a.month.localeCompare(b.month));
      const rec = l.history.find(h => h.month === monthParam) || { usage:0, total_games:0, wins:0 };
      l.monthly_usage       = rec.usage;
      l.monthly_total_games = rec.total_games;
      l.monthly_wins        = rec.wins;
      return l;
    });
    const totalItems = leads.length;
    leads.sort((a,b) => {
      const dir = sortDir.toLowerCase()==='asc'?1:-1;
      const field = sortBy==='total_games'? 'monthly_total_games' : 'monthly_usage';
      return dir * (a[field] - b[field]);
    });
    const paged = leads.slice(offset, offset + limitInt);
    res.json({ leads: paged, total: totalItems });
  } catch (error) {
    console.error("Error fetching lead usage:", error);
    res.status(500).json({ error: "Error fetching leads usage" });
  }
});

// Analyze battle endpoint
app.get('/api/analyze-battle/:replayId', async (req, res) => {
  const { replayId } = req.params;
  try {
    // 1) Fetch teams + turns
    const query = `
      SELECT teams, turns
      FROM \`pokemon-statistics.pokemon_replays.replays\`
      WHERE replay_id = @replayId
    `;
    const [rows] = await bigQuery.query({ query, params: { replayId } });
    if (!rows.length) return res.status(404).json({ error: 'Replay not found' });
    const { teams, turns } = rows[0];

    // 2) For each turn, build payload with the actual on-field Pokémon objects
    const analysis = await Promise.all(turns.map(async turn => {
      // active pokemon
      const rawP1 = turn.moves_done?.player1 || [];
      const rawP2 = turn.moves_done?.player2 || [];
      const moveUsedP1 = rawP1.map(m => m?.trim() || '').join(', ');
      const moveUsedP2 = rawP2.map(m => m?.trim() || '').join(', ');

      // Get active Pokémon names from starts_with
      const activeP1Names = turn.starts_with?.player1 || [];
      const activeP2Names = turn.starts_with?.player2 || [];

      // Find the detailed Pokémon data for each active Pokémon
      const topLeftPokemon = activeP1Names[0] ? 
        turn.revealed_pokemon.player1.find(p => p.name === activeP1Names[0]) : null;
      
      const topRightPokemon = activeP1Names[1] ? 
        turn.revealed_pokemon.player1.find(p => p.name === activeP1Names[1]) : null;
      
      const bottomLeftPokemon = activeP2Names[0] ? 
        turn.revealed_pokemon.player2.find(p => p.name === activeP2Names[0]) : null;
      
      const bottomRightPokemon = activeP2Names[1] ? 
        turn.revealed_pokemon.player2.find(p => p.name === activeP2Names[1]) : null;

      // Create minimal Pokémon objects with at least names if detailed data isn't available
      const pokemonData = {
        topLeft: topLeftPokemon || (activeP1Names[0] ? { name: activeP1Names[0] } : null),
        topRight: topRightPokemon || (activeP1Names[1] ? { name: activeP1Names[1] } : null),
        bottomLeft: bottomLeftPokemon || (activeP2Names[0] ? { name: activeP2Names[0] } : null),
        bottomRight: bottomRightPokemon || (activeP2Names[1] ? { name: activeP2Names[1] } : null),
      };

      // battle conditions
      const battleConditions = {
        weather: "",
        weatherDuration: 0,
        field: "",
        fieldDuration: 0,
        room: "",
        roomDuration: 0,
        sideEffects: {
          yourSide: { tailwind: false },
          opponentSide: { tailwind: false }
        },
        sideEffectsDuration: {
          yourSide: { tailwind: 0 },
          opponentSide: { tailwind: 0 }
        },
        entryHazards: {
          yourSide: {},
          opponentSide: {}
        },
        entryHazardsLevel: {
          yourSide: {},
          opponentSide: {}
        },
        entryHazardsDuration: {
          yourSide: {},
          opponentSide: {}
        }
      }

      // teams
      const yourTeam = [];
      const opponentTeam = [];

      // === prepare the TA request ===
      const body = {
        pokemonData,
        battleConditions,
        yourTeam,
        opponentTeam,
      };

      try {
        // === call Turn-Assistant ===
        const { data: ta } = await axios.post(
          `http://localhost:${PORT}/api/turn-assistant/analyze`,
          body
        );

        const raw = ta.data?.winRate ?? 0;
        const winRate = raw > 1 ? raw / 100 : raw;

        return {
          turn_number:   turn.turn_number,
          activePokemon: {
            p1: [ activeP1Names[0] || null, activeP1Names[1] || null ],
            p2: [ activeP2Names[0] || null, activeP2Names[1] || null ]
          },
          moveUsedP1,
          moveUsedP2,
          winProbP1:    ta.matchingScenarios ? winRate : 0,
          winProbP2:    ta.matchingScenarios ? 1 - winRate : 0
        };
      } catch (error) {
        console.log(`Error analyzing turn ${turn.turn_number}:`, error.message);
        return {
          turn_number:   turn.turn_number,
          activePokemon: {
            p1: [ activeP1Names[0] || null, activeP1Names[1] || null ],
            p2: [ activeP2Names[0] || null, activeP2Names[1] || null ]
          },
          moveUsedP1,
          moveUsedP2,
          winProbP1: 0,
          winProbP2: 0
        };
      }
    }));

    return res.json({ replayId, teams, analysis });
  }
  catch (err) {
    console.error('Error in /api/analyze-battle:', err);
    return res.status(500).json({ error: 'Error analyzing battle' });
  }
});