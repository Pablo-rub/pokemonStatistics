const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');

// Endpoint para obtener el porcentaje de victorias por Pokémon agrupados por mes
router.get('/', async (req, res) => {
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
router.get('/abilities', async (req, res) => {
const { pokemon } = req.query;
if (!pokemon) return res.status(400).json({ error: "The 'pokemon' parameter is required" });
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
router.get('/items', async (req, res) => {
const { pokemon } = req.query;
if (!pokemon) return res.status(400).json({ error: "The 'pokemon' parameter is required" });
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
router.get('/moves', async (req, res) => {
const { pokemon } = req.query;
if (!pokemon) return res.status(400).json({ error: "The 'pokemon' parameter is required" });
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
router.get('/tera', async (req, res) => {
const { pokemon } = req.query;
if (!pokemon) return res.status(400).json({ error: "The 'pokemon' parameter is required" });
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
router.get('/teammates', async (req, res) => {
const { pokemon } = req.query;
if (!pokemon) return res.status(400).json({ error: "The 'pokemon' parameter is required" });
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

module.exports = router;