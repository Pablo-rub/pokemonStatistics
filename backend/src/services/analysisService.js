const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');
const axios = require('axios');

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

// Analyze battle endpoint
router.get('/analyze-battle/:replayId', async (req, res) => {
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
        weather:    turn.weather?.condition || "",
        field:      turn.field?.terrain   || "",
        room:       turn.room?.condition    || "",
        sideEffects: {
        yourSide: {
        tailwind:  turn.tailwind?.player1  || false,
        reflect:   turn.screens?.reflect?.player1    || false,
        lightscreen: turn.screens?.lightscreen?.player1 || false,
        auroraveil:  turn.screens?.auroraveil?.player1  || false
        },
        opponentSide: {
        tailwind:  turn.tailwind?.player2  || false,
        reflect:   turn.screens?.reflect?.player2    || false,
        lightscreen: turn.screens?.lightscreen?.player2 || false,
        auroraveil:  turn.screens?.auroraveil?.player2  || false
        }
    },
    entryHazards:       { yourSide: {}, opponentSide: {} }
    };

    // teams
    const yourTeam     = teams.p1 || [];
    const opponentTeam = teams.p2 || [];

    // Prepare the body for P1 perspective
    const bodyP1 = { pokemonData, battleConditions, yourTeam, opponentTeam };

    // Also prepare a swapped version for P2 perspective
    const swapSides = bc => ({
        weather:            bc.weather,
        field:              bc.field,
        room:               bc.room,
        sideEffects: {
        yourSide:         bc.sideEffects.opponentSide,
        opponentSide:     bc.sideEffects.yourSide
        },
        entryHazards:        { yourSide: bc.entryHazards.opponentSide,   opponentSide: bc.entryHazards.yourSide }
    });

    const bodyP2 = {
        // swap the four slots so TA treats P2 as "your"
        pokemonData: {
        topLeft:    pokemonData.bottomLeft,
        topRight:   pokemonData.bottomRight,
        bottomLeft: pokemonData.topLeft,
        bottomRight:pokemonData.topRight
        },
        battleConditions: swapSides(battleConditions),
        yourTeam:        opponentTeam,
        opponentTeam:    yourTeam
    };

    try {
        // llamamos a TA para P1 y P2
        const [res1, res2] = await Promise.all([
        axios.post(`${API_URL}/api/turn-assistant/analyze`, bodyP1),
        axios.post(`${API_URL}/api/turn-assistant/analyze`, bodyP2)
        ]);

        const ta1 = res1.data;
        const ta2 = res2.data;

        // normaliza winRate de P1
        const raw     = ta1.data?.winRate ?? 0;
        const winRate = raw > 1 ? raw / 100 : raw;
        const hasData = ta1.matchingScenarios > 0;

        // ← aquí: extrae allMoveOptions del objeto `data`
        const opts1 = ta1.data?.allMoveOptions || {};
        const opts2 = ta2.data?.allMoveOptions || {};
        const allMoveOptions = { ...opts1, ...opts2 };

        // opcional: log para verificar
        console.log(`Turn ${turn.turn_number} opts1:`, Object.keys(opts1));
        console.log(`Turn ${turn.turn_number} opts2:`, Object.keys(opts2));
        console.log(`Turn ${turn.turn_number} merged:`, Object.keys(allMoveOptions));

        return {
        turn_number:    turn.turn_number,
        activePokemon:  { p1: activeP1Names, p2: activeP2Names },
        moveUsedP1,
        moveUsedP2,
        winProbP1:      hasData ? winRate     : null,
        winProbP2:      hasData ? 1 - winRate : null,
        noData:         !hasData,
        scenarioCount:  ta1.matchingScenarios || 0,
        state:          battleConditions,
        allMoveOptions
        };
    } catch (error) {
        console.error(`Error analyzing turn ${turn.turn_number}:`, error);
        return {
        turn_number:   turn.turn_number,
        activePokemon: { p1: activeP1Names, p2: activeP2Names },
        moveUsedP1,
        moveUsedP2,
        winProbP1:    null,
        winProbP2:    null,
        noData:       true,
        scenarioCount: 0,
        allMoveOptions:{}
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

// Endpoint para estadísticas de múltiples replays
router.post('/multistats', async (req, res) => {
try {
    const { replayIds } = req.body;
    if (!Array.isArray(replayIds) || replayIds.length < 2) {
    return res.status(400).json({ error: 'At least two replay IDs are required' });
    }

    // 1) Obtener los jugadores de cada replay
    const playerQuery = `
    SELECT replay_id, player1, player2
    FROM \`pokemon-statistics.pokemon_replays.replays\`
    WHERE replay_id IN UNNEST(@ids)
    `;
    const [playerRows] = await bigQuery.query({
    query: playerQuery,
    params: { ids: replayIds }
    });
    if (playerRows.length !== replayIds.length) {
    return res
        .status(404)
        .json({ error: 'One or more replay IDs not found in the database' });
    }

    // 2) Calcular intersección para hallar el jugador común
    let comunes = new Set([playerRows[0].player1, playerRows[0].player2]);
    for (let i = 1; i < playerRows.length; i++) {
    const { player1, player2 } = playerRows[i];
    comunes = new Set(
        [...comunes].filter(p => p === player1 || p === player2)
    );
    if (comunes.size === 0) break;
    }
    if (comunes.size !== 1) {
    return res.status(400).json({ error: 'There is no single common player across all replays' });
    }
    const [player] = [...comunes];

    // 3) Obtener "teams" y "turns" de esas replays
    const dataQuery = `
    SELECT replay_id, teams, turns, winner, player1, player2
    FROM \`pokemon-statistics.pokemon_replays.replays\`
    WHERE replay_id IN UNNEST(@ids)
    `;
    const [dataRows] = await bigQuery.query({
    query: dataQuery,
    params: { ids: replayIds }
    });

    // 0) Determinar los movesets de los Pokémon del jugador común (suponiendo todas las replays comparten equipo)
    const firstMeta = playerRows.find(r => r.replay_id === dataRows[0].replay_id);
    const firstSide = firstMeta.player1 === player ? 'p1' : 'p2';
    const firstTeam = dataRows[0].teams?.[firstSide] || [];
    const teamMovesets = {};
    for (const mon of firstTeam) {
    if (mon.name && Array.isArray(mon.moves)) {
        teamMovesets[mon.name] = mon.moves;
    }
    }

    // 1) Inicializar contador de uso de cada movimiento por Pokémon
    const moveCounts = {};
    for (const [name, moves] of Object.entries(teamMovesets)) {
    moveCounts[name] = {};
    for (const mv of moves) {
        moveCounts[name][mv] = 0;
    }
    }

    // Inicializar contadores
    const usageCounts        = {};
    const winCounts          = {};
    const lossCounts         = {};
    const teraCount          = {};
    const teraWinCounts      = {};
    const rivalUsageCounts   = {};
    const rivalWinCounts     = {};
    const rivalTeamCounts    = {};    // NUEVO: apariciones en equipo rival
    const leadCounts         = {};
    const leadWinCounts      = {};
    const leadPairCounts     = {};
    const leadPairWinCounts  = {};

    for (const row of dataRows) {
    const meta      = playerRows.find(r => r.replay_id === row.replay_id);
    const side      = meta.player1 === player ? 'p1' : 'p2';
    const playerKey = side.replace('p','player');  // 'player1' o 'player2'

    // CONTAR EQUIPO RIVAL (independiente de combate)
    const rivalTeamList = row.teams?.[side === 'p1' ? 'p2' : 'p1'] || [];
    const names = rivalTeamList
        .map(mon => mon.name)
        .filter(n => typeof n === 'string' && n !== 'none');
    for (const name of new Set(names)) {
        rivalTeamCounts[name] = (rivalTeamCounts[name] || 0) + 1;
    }

    // NUEVO: Contar leads de esta partida (turno 1)
    if (row.turns.length > 0) {
        const firstTurn = row.turns.find(t => t.turn_number === 1) || row.turns[0];
        const leads = (firstTurn.starts_with?.[playerKey] || [])
        .filter(name => name && name !== 'none');
        const uniqueLeads = [...new Set(leads)];

        // Conteo individual y victorias tras lead
        uniqueLeads.forEach(mon => {
        leadCounts[mon] = (leadCounts[mon] || 0) + 1;
        if (row.winner === player) {
            leadWinCounts[mon] = (leadWinCounts[mon] || 0) + 1;
        }
        });

        // Conteo de pareja y victorias tras esa pareja
        if (uniqueLeads.length === 2) {
        const [a, b] = uniqueLeads.sort();
        const key = `${a}|${b}`;
        leadPairCounts[key] = (leadPairCounts[key] || 0) + 1;
        if (row.winner === player) {
            leadPairWinCounts[key] = (leadPairWinCounts[key] || 0) + 1;
        }
        }
    }

    const seenThisReplay      = new Set();
    const rivalSeenThisReplay = new Set();
    const teraPokemonThisReplay = new Set();

    if (Array.isArray(row.turns)) {
        for (const turn of row.turns) {
        // Verificar Pokémon activos del jugador común
        if (turn.starts_with && turn.starts_with[playerKey]) {
            const activeAtStart = turn.starts_with[playerKey];
            for (const monName of activeAtStart) {
            if (monName && monName !== 'none' && typeof monName === 'string') {
                seenThisReplay.add(monName);
            }
            }
        }
        
        // Verificar Pokémon activos del RIVAL
        if (turn.starts_with && turn.starts_with[side === 'p1' ? 'player2' : 'player1']) {
            const rivalActiveAtStart = turn.starts_with[side === 'p1' ? 'player2' : 'player1'];
            for (const monName of rivalActiveAtStart) {
            if (monName && monName !== 'none' && typeof monName === 'string') {
                rivalSeenThisReplay.add(monName);
            }
            }
        }
        
        // Verificar en revealed_pokemon para jugador común y registrar terastalizaciones
        if (turn.revealed_pokemon && turn.revealed_pokemon[playerKey]) {
            for (const pokemon of turn.revealed_pokemon[playerKey]) {
            if (pokemon && pokemon.name && pokemon.name !== 'none') {
                // Añadir a Pokémon vistos
                seenThisReplay.add(pokemon.name);
                
                // Verificar si el Pokémon ha terastalizado (condición más flexible)
                if (pokemon.tera && 
                    (pokemon.tera.active === true || 
                    pokemon.tera.active === 'true' || 
                    pokemon.tera.active === 1)) {
                teraPokemonThisReplay.add(pokemon.name);
                }
            }
            }
        }
        
        // Verificar en revealed_pokemon para RIVAL
        if (turn.revealed_pokemon && turn.revealed_pokemon[side === 'p1' ? 'player2' : 'player1']) {
            for (const pokemon of turn.revealed_pokemon[side === 'p1' ? 'player2' : 'player1']) {
            if (pokemon && pokemon.name && pokemon.name !== 'none') {
                rivalSeenThisReplay.add(pokemon.name);
            }
            }
        }

        // Contar movimientos usados por cada Pokémon
        const actions = turn.moves_done?.[playerKey] || [];
        for (const action of actions) {
            // Normalizamos la descripción de la acción
            const actNorm = action
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');

            // Para cada Pokémon y sus movimientos
            for (const [monName, moves] of Object.entries(teamMovesets)) {
            for (const mv of moves) {
                const mvNorm = mv
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9]/g, '');

                // Si aparece el nombre del movimiento, lo contamos
                if (actNorm.includes(mvNorm)) {
                moveCounts[monName][mv] = (moveCounts[monName][mv] || 0) + 1;
                }
            }
            }
        }
        }
    }

    // Contar apariciones, victorias y derrotas
    for (const mon of seenThisReplay) {
        usageCounts[mon] = (usageCounts[mon] || 0) + 1;
        if (row.winner === player)   winCounts[mon]   = (winCounts[mon]   || 0) + 1;
        else                         lossCounts[mon]  = (lossCounts[mon]  || 0) + 1;
    }

    // CONTAR TERASTALIZACIONES y CUÁNTAS DE ESAS PARTIDAS SE GANARON
    for (const mon of teraPokemonThisReplay) {
        teraCount[mon] = (teraCount[mon] || 0) + 1;
        if (row.winner === player) {
        teraWinCounts[mon] = (teraWinCounts[mon] || 0) + 1;
        }
    }

    // CONTAR uso rival en combate
    for (const mon of rivalSeenThisReplay) {
        rivalUsageCounts[mon] = (rivalUsageCounts[mon] || 0) + 1;
        if (row.winner !== player) {
        rivalWinCounts[mon] = (rivalWinCounts[mon] || 0) + 1;
        }
    }
    }

    return res.json({
    player,
    usageCounts,
    winCounts,
    lossCounts,
    teraCount,
    teraWinCounts,
    rivalUsageCounts,
    rivalWinCounts,
    rivalTeamCounts,
    leadCounts,
    leadWinCounts,
    leadPairCounts,
    leadPairWinCounts,
    moveCounts
    });
} catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
}
});

module.exports = router;