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
    const offset = (page - 1) * limit;

    let whereClause = [];
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
      FROM \`pokemon-statistics.pokemon_replays.replays\`
      ${whereClauseString}
    `;
    const [countRows] = await bigQuery.query(countQuery);
    const totalFilteredGames = parseInt(countRows[0].count);

    // Get paginated results
    const dataQuery = `
      SELECT *
      FROM \`pokemon-statistics.pokemon_replays.replays\`
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

// Endpoint to get the rankings
app.get('/api/rankings', async (req, res) => {
    const { format, month } = req.query;

    if (!format || !month) {
        res.status(400).send("Missing format or month");
        return;
    }

    const url = `https://www.smogon.com/stats/${month}/${format}`;
    console.log("Fetching data from:", url);
    try {
        const response = await axios.get(url);
        res.send(response.data);
    } catch (error) {
        console.error("Error al obtener datos de Smogon:", error);
        res.status(500).send("Error al obtener datos de Smogon");
    }
});

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