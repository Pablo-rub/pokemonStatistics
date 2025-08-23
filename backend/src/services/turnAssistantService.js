const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');
const { analyzeMatchingScenarios } = require('../utils/helpers');

// Turn Assistant endpoint - Find battle scenarios with specific Pokémon
router.post('/analyze', async (req, res) => {
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
    // Replaced: separate activeTeraTypeConditions + activeTeraActiveConditions with unified logic:
    let activeTeraConditions = [];

    // Para tus Pokémon activos (lado player1)
    ["topLeft", "topRight"].forEach((slot, idx) => {
    const details = pokemonData[slot];
    if (details && details.teraType && details.teraType.trim() !== "" && (details.teraActive !== null && details.teraActive !== undefined)) {
        const normalizedTeraType = details.teraType.toLowerCase().replace(/\s+/g, '');
        // Si se indicó que queremos filtrar por Tera activo
        if (details.teraActive === true) {
        activeTeraConditions.push(`
            (
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                    AND rp.tera.active = TRUE
                    AND LOWER(REPLACE(IFNULL(rp.tera.type, ''), ' ', '')) = '${normalizedTeraType}'
            )
            OR
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                    AND rp.tera.active = TRUE
                    AND LOWER(REPLACE(IFNULL(rp.tera.type, ''), ' ', '')) = '${normalizedTeraType}'
            )
            )
        `);
        } else {
        // details.teraActive === false -> exigir que el Tera NO esté activo (ignore type)
        activeTeraConditions.push(`
            (
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                    AND (rp.tera.active = FALSE OR rp.tera.active IS NULL)
            )
            OR
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @yourPokemon${idx+1}
                    AND (rp.tera.active = FALSE OR rp.tera.active IS NULL)
            )
            )
        `);
        }
    }
    });

    // Para los Pokémon activos del oponente (lado player2)
    ["bottomLeft", "bottomRight"].forEach((slot, idx) => {
    const details = pokemonData[slot];
    if (details && details.teraType && details.teraType.trim() !== "" && (details.teraActive !== null && details.teraActive !== undefined)) {
        const normalizedTeraType = details.teraType.toLowerCase().replace(/\s+/g, '');
        if (details.teraActive === true) {
        activeTeraConditions.push(`
            (
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                    AND rp.tera.active = TRUE
                    AND LOWER(REPLACE(IFNULL(rp.tera.type, ''), ' ', '')) = '${normalizedTeraType}'
            )
            OR
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                    AND rp.tera.active = TRUE
                    AND LOWER(REPLACE(IFNULL(rp.tera.type, ''), ' ', '')) = '${normalizedTeraType}'
            )
            )
        `);
        } else {
        activeTeraConditions.push(`
            (
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player1) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                    AND (rp.tera.active = FALSE OR rp.tera.active IS NULL)
            )
            OR
            EXISTS(
                SELECT 1 FROM UNNEST(t.revealed_pokemon.player2) AS rp
                WHERE rp.name = @opponentPokemon${idx+1}
                    AND (rp.tera.active = FALSE OR rp.tera.active IS NULL)
            )
            )
        `);
        }
    }
    });

    // Si se generaron condiciones, se agregan al query general:
    if (activeTeraConditions.length > 0) {
    matchingTurnsQuery += ` AND (${activeTeraConditions.join(' AND ')})`;
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

module.exports = router;