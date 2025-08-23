const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');

// Endpoint: Team usage statistics grouped by month
router.get('/teams', async (req, res) => {
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
router.get('/leads', async (req, res) => {
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

module.exports = router;