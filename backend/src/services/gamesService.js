const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');

// Endpoint to get the total number of games
router.get('/count', async (req, res) => {
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
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const sortBy = req.query.sortBy || 'date DESC';
    const playerFilter = req.query.playerFilter || '';
    const ratingFilter = req.query.ratingFilter || 'all';
    const dateFilter = req.query.dateFilter || 'all';
    const formatFilter = req.query.format || 'all';
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

    // Format filter
    if (formatFilter !== 'all') {
      // escape single‐quotes in the incoming format string
      const fmt = formatFilter.replace(/'/g, "\\'");
      whereClause.push(`r.format = '${fmt}'`);
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
router.get('/:gameId', async (req, res) => {
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

module.exports = router;