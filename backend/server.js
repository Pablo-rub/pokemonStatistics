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

// Corrige la función parseMovesetText para manejar correctamente los datos de spreads y teammates
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
            
            // Extract sections with improved regex patterns
            const sections = ["Abilities", "Items", "Spreads", "Moves", "Tera Types", "Teammates"];
            
            for (const section of sections) {
                // Find section data with clear boundary pattern
                let sectionRegex;
                
                if (section === "Teammates" || section === "Spreads") {
                    // Special handling for Teammates and Spreads which often have different formatting
                    sectionRegex = new RegExp(`\\| ${section}\\s*\\|(.*?)\\+[-]{40,}\\+`, "s");
                } else {
                    sectionRegex = new RegExp(`\\| ${section}\\s*\\|(.*?)\\+[-]{40,}\\+`, "s");
                }
                
                const sectionMatch = pokemonBlock.match(sectionRegex);
                
                if (sectionMatch && sectionMatch[1]) {
                    // Extract data lines with percentage
                    const dataLines = sectionMatch[1].split('\n').filter(line => line.includes('%'));
                    
                    dataLines.forEach(line => {
                        // Different regex patterns based on the section
                        let dataMatch;
                        
                        if (section === "Spreads") {
                            // Pattern for spreads like: | Adamant:4/252/0/0/0/252 22.547% |
                            dataMatch = line.match(/\|\s*([^|0-9%]+?[^|%]+?)\s+([0-9.]+)%/);
                        } else if (section === "Teammates") {
                            // Pattern for teammates like: | Incineroar 51.044% |
                            dataMatch = line.match(/\|\s*([^|0-9%]+?)\s+([0-9.]+)%/);
                        } else {
                            // General pattern for other sections
                            dataMatch = line.match(/\|\s*([^|0-9]+?)\s+([0-9.]+)%/);
                        }
                        
                        if (dataMatch) {
                            const name = dataMatch[1].trim();
                            const percentage = parseFloat(dataMatch[2]);
                            
                            data[section][name] = percentage;
                        }
                    });
                }
            }
            
            // Store data
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