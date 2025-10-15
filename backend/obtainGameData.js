const { BigQuery } = require('@google-cloud/bigquery');

const bigQuery = new BigQuery();

async function saveReplayToBigQuery(replayData) {
    const replayId = replayData?.replay_id || replayData?.id || 'unknown';
    
    try {
        console.log(`[${replayId}] Starting replay processing`);
        
        let id, format, players, log, views, rating, uploadtime;
        
        if (replayData.meta) {
            id = replayData.replay_id;
            format = replayData.format;
            players = replayData.meta.players || [];
            log = (replayData.log || '').split('\n');
            views = replayData.meta.views || 0;
            rating = replayData.meta.rating || null;
            uploadtime = replayData.meta.uploadtime || Math.floor(Date.now() / 1000);
        } else {
            id = replayData.id;
            format = replayData.format;
            players = replayData.players || [];
            log = (replayData.log || '').split('\n');
            views = replayData.views || 0;
            rating = replayData.rating || null;
            uploadtime = replayData.uploadtime || Math.floor(Date.now() / 1000);
        }
        
        if (!id || !format || !players || players.length < 2) {
            throw new Error(`Invalid replay data: missing required fields`);
        }

        console.log(`[${replayId}] Basic data:`, {
            format,
            players,
            logLines: log.length
        });

        console.log(`[${replayId}] Processing winner...`);
        const winner = processWinner(log);
        console.log(`[${replayId}] Winner: ${winner}`);

        console.log(`[${replayId}] Processing teams...`);
        const teams = processShowteam(log);
        
        // ===== VALIDACIÓN CRÍTICA =====
        if (!teams.p1 || !teams.p2 || teams.p1.length === 0 || teams.p2.length === 0) {
            console.error(`[${replayId}] ERROR: Teams extraction failed`);
            console.error(`[${replayId}] teams.p1 (${teams.p1?.length || 0} Pokemon):`, teams.p1);
            console.error(`[${replayId}] teams.p2 (${teams.p2?.length || 0} Pokemon):`, teams.p2);
            console.error(`[${replayId}] Log sample (first 10 lines):`, log.slice(0, 10));
            throw new Error('Teams data is empty or invalid');
        }
        
        console.log(`[${replayId}] Teams processed: p1=${teams.p1.length}, p2=${teams.p2.length}`);

        let turns = [];

        // Initialize first turn with proper structure
        let currentTurn = 0;
        turns.push({
            turnNumber: currentTurn,
            startsWith: {
                player1: ["none", "none"],
                player2: ["none", "none"] 
            },
            endsWith: {
                player1: ["none", "none"],
                player2: ["none", "none"] 
            },
            field: {
                terrain: "",
                duration: 0,
            },
            weather: {
                condition: "",
                duration: 0,
            },
            room: {
                condition: "",
                duration: 0,
            },
            screens: {
                reflect: { player1: false, player2: false, duration1: 0, duration2: 0 },
                lightscreen: { player1: false, player2: false, duration1: 0, duration2: 0 },
                auroraveil: { player1: false, player2: false, duration1: 0, duration2: 0 }
            },
            tailwind: {
                player1: false,
                player2: false,
                duration1: 0,
                duration2: 0
            },
            spikes: {
                player1: {
                    spikes: 0,
                    toxicSpikes: 0,
                    stealthRock: false,
                    stickyWeb: false
                },
                player2: {
                    spikes: 0,
                    toxicSpikes: 0,
                    stealthRock: false,
                    stickyWeb: false
                }
            },
            movesDone: {
                player1: ["", ""],
                player2: ["", ""]
            },
            revealedPokemon: {
                player1: [],
                player2: [],
            }
        });

        console.log(`[${replayId}] Processing log lines...`);
        
        // Process each line of the log
        for (let line of log) {
            const turnMatch = line.match(/\|turn\|(\d+)/);
            const switchMatchesG = line.match(
              /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, ([MF]))?(?:, shiny)?\|(\d+)\/(\d+)/
            );
            const switchMatchesNG = line.match(
              /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, shiny)?\|(\d+)\/(\d+)/
            );
            let switchMatches = switchMatchesG || switchMatchesNG;
            const itemMatchActivate = line.match(
              /\|-activate\|(p1[ab]|p2[ab]): (.+?)\|item: (.+?)\|/
            );
            const itemMatchStatus = line.match(
              /\|-status\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/
            );
            const itemMatchDamage = line.match(
              /\|-damage\|(p1[ab]|p2[ab]): (.+?)\|(\d+\/\d+|0 fnt)\s*(?:\|.+?\[from\] item: (.+))?/
            );    
            const itemMatchEnd = line.match(
              /\|-enditem\|(p1[ab]|p2[ab]): (.+?)\|(.+)/
            );
            const itemMatchBoost = line.match(
              /\|-boost\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/
            );
            let itemMatch =
              itemMatchActivate ||
              itemMatchStatus ||
              itemMatchDamage ||
              itemMatchEnd ||
              itemMatchBoost;
            let endItemMatch = line.match(/\|-enditem\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
            let abilityMatch = line.match(
              /\|-ability\|(p1[ab]|p2[ab]): (.+)\|(.+)\|(.+)/
            );
            let moveOkMatch = line.match(
              /\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|(p1[ab]|p2[ab]): (.+)/
            );
            let moveFailMatch = line.match(
              /\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|\[still\]/
            );
            let moveMatch = moveOkMatch || moveFailMatch;
            let damageMatch = line.match(/\|-damage\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
            const healMatch = line.match(
              /\|-heal\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(?:\[from\] (.+?))?(?:\|\[of\] (.+?))?/
            );
            const statusMatch = line.match(
              /\|-status\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
            );
            const cureStatusMatch = line.match(
              /\|-curestatus\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
            );
            const boostMatch = line.match(
              /\|-boost\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
            );
            const unBoostMatch = line.match(
              /\|-unboost\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
            );
            const teraMatch = line.match(
              /\|-terastallize\|(p1[ab]|p2[ab]): (.+?)\|(.+)/
            );
            const fieldMatch = line.match(/\|-fieldstart\|move: ([\w\s]+)\|(?:\[from\] [^\|]+\|)?\[of\] (p\d[ab]): ([\w\s]+)/);
            const weatherMatch = line.match(/\|-weather\|(.+?)\|(.+)/);
            const sideStartMatch = line.match(/^\|-sidestart\|(p1|p2):\s*([^|]+)\|move:\s*(.+)$/);
            const volatileMatch = line.match(/\|-start\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
            
            // Detect new turn
            if (turnMatch) {
              currentTurn = parseInt(turnMatch[1]);
              turns = processTurn(currentTurn, turns);
              incrementVolatileTurnCounters(turns);
            }
            if (switchMatches) {
              processSwitch(currentTurn, switchMatches, turns, teams);
            } 
            if (itemMatch) {
              processItem(currentTurn, itemMatch, turns);
            } 
            if (endItemMatch) {
              processItem(currentTurn, endItemMatch, turns);
            } 
            if (moveMatch || moveFailMatch) {
              processMove(currentTurn, moveMatch, turns);
            } 
            if (damageMatch) {
              processDamage(currentTurn, damageMatch, turns);
            } 
            if (healMatch) {
              processDamage(currentTurn, healMatch, turns);
            } 
            if (statusMatch) {
              processStatus(currentTurn, statusMatch, turns);
            } 
            if (cureStatusMatch) {
              processStatus(currentTurn, cureStatusMatch, turns);
            } 
            if (boostMatch) {
              processBoost(currentTurn, boostMatch, turns);
            } 
            if (unBoostMatch) {
              processBoost(currentTurn, unBoostMatch, turns);
            } 
            if (teraMatch) {
              processTerastallize(currentTurn, teraMatch, turns);
            } 
            if (fieldMatch) {
              if (roomEffects.includes(fieldMatch[1])) {
                processRoom(currentTurn, fieldMatch, turns, line);
              } else {
                processField(currentTurn, fieldMatch, turns);
              }
            }
            if (weatherMatch && !line.includes("[upkeep]")) {
              processWeather(currentTurn, weatherMatch, turns, line);
            }
            if (volatileMatch) {
              processVolatileStart(currentTurn, volatileMatch, turns);
            }
            if (line.includes("fieldend")) {
              processFieldEnd(currentTurn, line, turns);
            }
            if (sideStartMatch) {
              processSideStart(currentTurn, sideStartMatch, turns);
            }
            if (line.includes("sideend")) {
              processSideEnd(currentTurn, line, turns);
            }
        }

        console.log(`[${replayId}] Log processing complete, ${turns.length} turns`);

        const replayToSave = {
            replay_id: id,
            format: format,
            views: views,
            rating: rating,
            player1: players[0],
            player2: players[1],
            winner: winner,
            loser: winner === players[0] ? players[1] : players[0],
            date: new Date(uploadtime * 1000).toISOString(),
            teams: teams,
            turns: turns
        };

        console.log(`[${replayId}] Converting to snake_case...`);
        
        // ===== VALIDACIÓN PRE SNAKE_CASE =====
        if (!replayToSave.teams || !replayToSave.teams.p1 || !replayToSave.teams.p2) {
            console.error(`[${replayId}] ERROR: replayToSave.teams is invalid`);
            console.error(`[${replayId}] teams:`, JSON.stringify(replayToSave.teams, null, 2));
            throw new Error('Teams data lost before conversion');
        }
        
        const snakeCaseReplay = toSnakeCase(replayToSave);

        // ===== VALIDACIÓN POST SNAKE_CASE =====
        if (!snakeCaseReplay.teams || !snakeCaseReplay.teams.p1 || !snakeCaseReplay.teams.p2) {
            console.error(`[${replayId}] ERROR: teams lost during snake_case`);
            console.error(`[${replayId}] Before:`, JSON.stringify(replayToSave.teams, null, 2));
            console.error(`[${replayId}] After:`, JSON.stringify(snakeCaseReplay.teams, null, 2));
            throw new Error('Teams data lost during conversion');
        }

        console.log(`[${replayId}] Attempting to save to BigQuery...`);

        const dataset = bigQuery.dataset('pokemon_replays');
        const table = dataset.table('replays');
        
        try {
            await table.insert(snakeCaseReplay);
            console.log(`[${replayId}] ✓ Successfully saved to BigQuery`);
            return { success: true };
        } catch (bqError) {
            console.error(`[${replayId}] ✗ BigQuery insertion failed:`, {
                errorName: bqError.name,
                errorMessage: bqError.message
            });

            if (bqError.errors && Array.isArray(bqError.errors)) {
                bqError.errors.forEach((errorItem, idx) => {
                    console.error(`[${replayId}] Error item ${idx}:`, JSON.stringify(errorItem, null, 2));
                });
            }

            return {
                success: false,
                error: 'BigQuery insertion failed',
                errorName: bqError.name || 'PartialFailureError',
                details: bqError.errors || []
            };
        }

    } catch (error) {
        console.error(`[${replayId}] CRITICAL ERROR:`, {
            error: error.message,
            stack: error.stack
        });
        
        return {
            success: false,
            error: error.message || 'Unknown error',
            errorName: error.name || 'Error',
            stack: error.stack
        };
    }
}

function processWinner(log) {
    let winner = log.find((line) => line.includes("|win|"));
    if (winner) {
        winner = winner.split("|")[2];
    }
    return winner.trim();
}

function processTurn(currentTurn, turns) {
    const previousTurn = turns[currentTurn - 1];
    let newWeather = { condition: "", duration: 0 };
    if (previousTurn.weather && previousTurn.weather.duration > 0) {
        const weatherDuration = previousTurn.turnNumber >= 1 ? previousTurn.weather.duration - 1 : previousTurn.weather.duration;
        newWeather = {
        condition: previousTurn.weather.condition,
        duration: weatherDuration > 0 ? weatherDuration : 0
        };
        if (newWeather.duration === 0);
    }
    let newField = { terrain: "", duration: 0 };
    if (previousTurn.field && previousTurn.field.duration > 0) {
        const fieldDuration = previousTurn.turnNumber >= 1 ? previousTurn.field.duration - 1 : previousTurn.field.duration;
        newField = {
        terrain: previousTurn.field.terrain,
        duration: fieldDuration > 0 ? fieldDuration : 0
        };
        if (newField.duration === 0);
    }
    let newRoom = { condition: "", duration: 0 };
    if (previousTurn.room && previousTurn.room.duration > 0) {
        const roomDuration = previousTurn.turnNumber >= 1 ? previousTurn.room.duration - 1 : previousTurn.room.duration;
        newRoom = {
        condition: previousTurn.room.condition,
        duration: roomDuration > 0 ? roomDuration : 0
        };
        if (newRoom.duration === 0);
    }
    let newScreens = {
        reflect: { player1: previousTurn.screens.reflect.player1, player2: previousTurn.screens.reflect.player2, duration1: 0, duration2: 0 },
        lightscreen: { player1: previousTurn.screens.lightscreen.player1, player2: previousTurn.screens.lightscreen.player2, duration1: 0, duration2: 0 },
        auroraveil: { player1: previousTurn.screens.auroraveil.player1, player2: previousTurn.screens.auroraveil.player2, duration1: 0, duration2: 0 }
    };
    ['reflect', 'lightscreen', 'auroraveil'].forEach(screen => {
        ['player1', 'player2'].forEach(player => {
        const durationKey = "duration" + (player === "player1" ? "1" : "2");
        const prevDuration = previousTurn.screens[screen][durationKey];
        if (prevDuration && prevDuration > 0) {
            const newDuration = previousTurn.turnNumber >= 1 ? prevDuration - 1 : prevDuration;
            newScreens[screen][durationKey] = newDuration > 0 ? newDuration : 0;
            if (newDuration <= 0) {
            newScreens[screen][player] = false;
            } else {
            newScreens[screen][player] = previousTurn.screens[screen][player];
            }
        }
        });
    });
    let newTailwind = {
        player1: previousTurn.tailwind.player1,
        player2: previousTurn.tailwind.player2,
        duration1: 0,
        duration2: 0
    };
    ['player1', 'player2'].forEach(player => {
        const durationKey = "duration" + (player === "player1" ? "1" : "2");
        const prevDuration = previousTurn.tailwind[durationKey];
        if (prevDuration && prevDuration > 0) {
        const newDuration = previousTurn.turnNumber >= 1 ? prevDuration - 1 : prevDuration;
        newTailwind[durationKey] = newDuration > 0 ? newDuration : 0;
        if (newDuration <= 0) {
            newTailwind[player] = false;
        } else {
            newTailwind[player] = previousTurn.tailwind[player];
        }
        }
    });
    turns.push({
        turnNumber: currentTurn,
        startsWith: {
        player1: [
            previousTurn.endsWith.player1[0] || "none",
            previousTurn.endsWith.player1[1] || "none"
        ],
        player2: [
            previousTurn.endsWith.player2[0] || "none", 
            previousTurn.endsWith.player2[1] || "none"
        ]
        },
        endsWith: {
        player1: [
            previousTurn.endsWith.player1[0] || "none",
            previousTurn.endsWith.player1[1] || "none"
        ],
        player2: [
            previousTurn.endsWith.player2[0] || "none", 
            previousTurn.endsWith.player2[1] || "none"
        ]
        },
        field: newField,
        weather: newWeather,
        room: newRoom,
        screens: newScreens,
        tailwind: newTailwind,
        spikes: {
        player1: { ...previousTurn.spikes.player1 },
        player2: { ...previousTurn.spikes.player2 }
        },
        movesDone: {
        player1: [ "", "" ],
        player2: [ "", "" ]
        },
        revealedPokemon: {
        player1: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player1)),
        player2: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player2)),
        }
    });
    for (const player of ['player1', 'player2']) {
        for (let slot = 0; slot < 2; slot++) {
        const pokemonName = turns[currentTurn].startsWith[player][slot];
        if (pokemonName && pokemonName !== "none") {
            const pokemon = turns[currentTurn].revealedPokemon[player].find(
            p => p && p.name === pokemonName
            );
            if (pokemon && pokemon.nonVolatileStatus === "slp" && 
                (!turns[currentTurn].movesDone[player][slot] 
                || turns[currentTurn].movesDone[player][slot] === "")) {
            turns[currentTurn].movesDone[player][slot] = "continue sleeping";
            }
        }
        }
    }
    for (const player of ['player1', 'player2']) {
        for (let slot = 0; slot < 2; slot++) {
        const pokemonName = turns[currentTurn].startsWith[player][slot];
        if (pokemonName && pokemonName !== "none") {
            const pokemon = turns[currentTurn].revealedPokemon[player].find(
            p => p && p.name === pokemonName
            );
            if (pokemon && pokemon.nonVolatileStatus === "slp") {
            turns[currentTurn].movesDone[player][slot] = "sleeping";
            }
        }
        }
    }
    return turns;
}

function processShowteam(log) {
    const teams = { p1: [], p2: [] };
    let p1Processed = false;
    let p2Processed = false;
    let index = 0;

    while (index < log.length && (!p1Processed || !p2Processed)) {
        const line = log[index];
        const showteamMatch = line.match(/\|showteam\|(p1|p2)\|(.+)/);
        
        if (showteamMatch) {
            const player = showteamMatch[1];
            const teamData = showteamMatch[2];
            
            if (!teamData || teamData.trim() === '') {
                console.error(`ERROR: Empty teamData for ${player}`);
                index++;
                continue;
            }
            
            const rawPokemonBlocks = teamData.split(']').filter((b) => b.trim() !== '');
            
            if (rawPokemonBlocks.length === 0) {
                console.error(`ERROR: No Pokemon blocks for ${player}`);
                index++;
                continue;
            }
            
            const parsedPokemons = rawPokemonBlocks.map((block) => {
                const parts = block.split('|');
                const name = parts[0]?.trim() || '';
                
                if (!name) {
                    console.error(`ERROR: Pokemon without name`);
                    return null;
                }
                
                const item = parts[2]?.trim() || '';
                const ability = parts[3]?.trim() || '';
                const moves = parts[4] ? parts[4].split(',').map((m) => m.trim()) : [];
                const level = parts[10]?.trim() || '';
                
                let teraType = '';
                if (parts[11]) {
                    const splitted = parts[11].split(',').filter(Boolean);
                    teraType = splitted[splitted.length - 1] || '';
                }
                
                return { name, item, ability, moves, level, teraType };
            }).filter(Boolean);
            
            if (parsedPokemons.length === 0) {
                console.error(`ERROR: No valid Pokemon for ${player}`);
                index++;
                continue;
            }
            
            parsedPokemons.forEach((poke) => {
                teams[player].push(poke);
            });
            
            if (player === 'p1') p1Processed = true;
            else if (player === 'p2') p2Processed = true;
        }
        index++;
    }
    
    if (teams.p1.length === 0 || teams.p2.length === 0) {
        console.error('ERROR: One or both teams empty');
        console.error('p1:', teams.p1);
        console.error('p2:', teams.p2);
    }

    return teams;
}

function processSwitch(currentTurn, switchMatches, turns, teams) {
    const slotOwner = switchMatches[1];
    const player = slotOwner.startsWith("p1") ? "player1" : "player2";
    const nickname = switchMatches[2];
    const newPokemonName = switchMatches[3];
    const slot = slotOwner.endsWith("a") ? 0 : 1;
    let oldMonName = "none";
    if (currentTurn != 0) {
        oldMonName =
            turns[currentTurn].endsWith[player][slot] ||
            turns[currentTurn].startsWith[player][slot];
    }
    if (oldMonName && oldMonName !== "none") {
        if (turns[currentTurn].movesDone[player][slot] === "") {
            turns[currentTurn].movesDone[player][slot] = `switch to ${newPokemonName}`;
        } else {
            turns[currentTurn].movesDone[player][slot] += `, switch to ${newPokemonName}`;
        }
    }
    let newPokemon = turns[currentTurn].revealedPokemon[player].find(
        (p) => p && p.name === newPokemonName
    );
    if (!newPokemon) {
        newPokemon = {
            name: newPokemonName,
            nickname: nickname,
            moves: [],
            ability: "",
            item: "",
            remainingHp: 100,
            volatileStatus: [],
            nonVolatileStatus: "none",
            stats: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
            tera: { type: "", active: false },
            fightingStatus: "ok",
            consecutiveProtectCounter: 0,
            abilitySuppressed: false,
            lastMoveUsed: "none",
            mimicUsed: false,
            copiedMove: "none",
            transformed: false
        };
        turns[currentTurn].revealedPokemon[player].push(newPokemon);
    }
    if (currentTurn === 0) {
        turns[currentTurn].movesDone[player][slot] = "switched in";
    }
    turns[currentTurn].endsWith[player][slot] = newPokemonName;
    return turns;
}

function processItem(currentTurn, itemMatch, turns) {
    const player = itemMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = itemMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    let item = itemMatch[3];
    if (itemMatch[0].startsWith("|-enditem")) {
        item = "none";
        turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
            p.name === pokemonName ? { ...p, item: item } : p
        );
    }
}

function processDamage(currentTurn, damageMatch, turns) {
    const player = damageMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = damageMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    const damageInfo = damageMatch[3];
    let remainingHp, newFightingStatus;
    if (damageInfo === "0 fnt") {
        newFightingStatus = "fainted";
        remainingHp = 0;
        const slot = turns[currentTurn].startsWith[player].indexOf(pokemonName);
        if (slot !== -1) {
            if (turns[currentTurn].movesDone[player][slot]) {
                turns[currentTurn].movesDone[player][slot] += " (fainted)";
            } else {
                turns[currentTurn].movesDone[player][slot] = "fainted";
            }
        }
    } else {
        remainingHp = parseInt(damageInfo.split("/")[0]);
    }
    turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
        p.name === pokemonName ? { ...p, remainingHp: remainingHp, fightingStatus: newFightingStatus, } : p
    );
}

function processStatus(currentTurn, statusMatch, turns) {
    const player = statusMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = statusMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    let status;
    if (statusMatch[0].startsWith("|-curestatus")) {
        status = "";
    } else {
     status = statusMatch[3];
    }
    turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
        p.name === pokemonName ? { ...p, nonVolatileStatus: status } : p
    );
}

function processBoost(currentTurn, boostMatch, turns) {
    const player = boostMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = boostMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    let statBoosted = boostMatch[3];
    if (statBoosted === "accuracy") statBoosted = "acc";
    const boost = parseInt(boostMatch[4]);
    const pokemon = turns[currentTurn].revealedPokemon[player].find(
        (p) => p && p.name === pokemonName
    );
    if (pokemon) {
        if (boostMatch[0].startsWith("|-boost")) {
            pokemon.stats[statBoosted] += boost;
        } else if (boostMatch[0].startsWith("|-unboost")) {
            pokemon.stats[statBoosted] -= boost;
        }
    }
}

function processTerastallize(currentTurn, teraMatch, turns) {
    const player = teraMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = teraMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    const type = teraMatch[3];
    turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
        p.name === pokemonName ? { ...p, tera: { type: type, active: true } } : p
    );
}

function processVolatileStart(currentTurn, volatileMatch, turns) {
    const player = volatileMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = volatileMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    let statusName = volatileMatch[3] || "";
    if (statusName.startsWith("move: ")) {
        statusName = statusName.replace("move: ", "");
    }
    const pokemon = turns[currentTurn].revealedPokemon[player].find(
        (p) => p && p.name === pokemonName
    );
    if (!pokemon) return;
    if (!pokemon.volatileStatus) {
        pokemon.volatileStatus = [];
    }
    const existing = pokemon.volatileStatus.find((v) => v.name === statusName);
    if (!existing) {
        pokemon.volatileStatus.push({ name: statusName, turnCounter: 0 });
    }
}

function incrementVolatileTurnCounters(turns) {
    if (!turns.length) return;
    const current = turns[turns.length - 1];
    for (const playerKey in current.revealedPokemon) {
        current.revealedPokemon[playerKey].forEach((p) => {
            if (p.volatileStatus && p.volatileStatus.length) {
                p.volatileStatus.forEach((v) => {
                    v.turnCounter++;
                });
            }
        });
    }
}

async function run() {
    try {
        // Placeholder
    } catch (error) {
        console.error('Error in run()', error);
    }
}

function toSnakeCase(data) {
    if (Array.isArray(data)) {
        return data.map(v => toSnakeCase(v));
    } else if (data !== null && typeof data === 'object') {
        return Object.keys(data).reduce((result, key) => {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            result[snakeKey] = toSnakeCase(data[key]);
            return result;
        }, {});
    }
    return data;
}

function processMove(currentTurn, moveMatch, turns) {
    const protectMoves = [
        "baneful bunker", "burning bulwark", "detect", "king's shield", "max guard",
        "obstruct", "protect", "silk trap", "spiky shield", "crafty shield",
        "mat block", "quick guard", "wide guard",
    ];
    const player = moveMatch[1].startsWith("p1") ? "player1" : "player2";
    let pokemonName = moveMatch[2];
    pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
    const moveUsed = moveMatch[3].toLowerCase().replace(/\|.*$/, '');
    let targetInfo = "";
    if (moveMatch.length > 4) {
        const targetPlayer = moveMatch[4].startsWith("p1") ? "player1" : "player2";
        const targetSlot = moveMatch[4].endsWith("a") ? 0 : 1;
        const originalTarget = turns[currentTurn].startsWith[targetPlayer][targetSlot];
        targetInfo = ` on ${originalTarget}`;
    }
    const slot = turns[currentTurn].startsWith[player].indexOf(pokemonName);
    if (slot === -1) return;
    if (moveMatch[0].includes("[spread]")) {
        turns[currentTurn].movesDone[player][slot] = `${moveUsed} (spread)`;
    } else if (moveMatch[0].includes("[still]")) {
        turns[currentTurn].movesDone[player][slot] = `${moveUsed} (failed)`;
    } else {
        turns[currentTurn].movesDone[player][slot] = `${moveUsed}${targetInfo}`;
    }
    const userPokemon = turns[currentTurn].revealedPokemon[player].find(
        (p) => p && p.name === pokemonName
    );
    if (!userPokemon) return;
    if (userPokemon.consecutiveProtectCounter === undefined) {
        userPokemon.consecutiveProtectCounter = 0;
    }
    if (protectMoves.includes(moveUsed)) {
        userPokemon.consecutiveProtectCounter++;
    } else {
        userPokemon.consecutiveProtectCounter = 0;
    }
    userPokemon.lastMoveUsed = moveUsed;
    const opponent = player === "player1" ? "player2" : "player1";
    const targetName = turns[currentTurn].endsWith[opponent][0];
    const targetPokemon =
        turns[currentTurn].revealedPokemon[opponent].find((p) => p && p.name === targetName) || {};
    handleObjectChangingMoves(currentTurn, userPokemon, targetPokemon, moveUsed, turns);
}

function handleObjectChangingMoves(currentTurn, userPokemon, targetPokemon, moveUsed, turns) {
    const move = moveUsed.toLowerCase();
    switch (move) {
        case "doodle":
            userPokemon.ability = targetPokemon.ability;
            break;
        case "entrainment":
            targetPokemon.ability = userPokemon.ability;
            break;
        case "role play":
            userPokemon.ability = targetPokemon.ability;
            break;
        case "simple beam":
            targetPokemon.ability = "Simple";
            break;
        case "skill swap":
            const temp = userPokemon.ability;
            userPokemon.ability = targetPokemon.ability;
            targetPokemon.ability = temp;
            break;
        case "worry seed":
            targetPokemon.ability = "Insomnia";
            break;
        case "gastro acid":
            targetPokemon.abilitySuppressed = true;
            break;
        case "mimic":
            if (targetPokemon.lastMoveUsed) {
                userPokemon.mimicUsed = true;
                userPokemon.copiedMove = targetPokemon.lastMoveUsed;
            } else {
                userPokemon.mimicUsed = false;
            }
            break;
        case "substitute":
            if (!userPokemon.volatileStatus) {
                userPokemon.volatileStatus = [];
            }
            const existingSubst = userPokemon.volatileStatus.find((v) => v.name === "substitute");
            if (!existingSubst) {
                userPokemon.volatileStatus.push({ name: "substitute", turnCounter: 0 });
                userPokemon.remainingHp -= Math.floor(userPokemon.maxHp / 4);
            }
            break;
        default:
            break;
    }
}

function processWeather(currentTurn, weatherMatch, turns, line) {
    if (weatherMatch && !line.includes("[upkeep]")) {
        const newCondition = weatherMatch[1];
        const initialDuration = 5;
        const player = line.includes("p1") ? "player1" : "player2";
        const pokemon = turns[currentTurn].revealedPokemon[player].find(p => {
            return p.item === "Heat Rock" || p.item === "Damp Rock" || 
                   p.item === "Smooth Rock" || p.item === "Icy Rock";
        });
        turns[currentTurn].weather = {
            condition: newCondition,
            duration: initialDuration
        };
    }
}

function processField(currentTurn, fieldMatch, turns) {
    if (fieldMatch) {
        const terrain = fieldMatch[1];
        let initialDuration = 5;
        const hasTerrainExtender = turns[currentTurn].revealedPokemon.player1.some(p => p.item === "Terrain Extender") ||
                                  turns[currentTurn].revealedPokemon.player2.some(p => p.item === "Terrain Extender");
        if (hasTerrainExtender) {
            initialDuration = 8;
        }
        turns[currentTurn].field = {
            terrain: terrain,
            duration: initialDuration
        };
    }
}

const roomEffects = ["Trick Room", "Gravity", "Magic Room", "Wonder Room"];

function processRoom(currentTurn, fieldMatch, turns, line) {
    if (fieldMatch && !line.includes("[upkeep]")) {
        const effect = fieldMatch[1];
        if (roomEffects.includes(effect)) {
            const initialDuration = 5;
            if (turns[currentTurn].room.condition === effect) {
                turns[currentTurn].room = { condition: "", duration: 0 };
            } else {
                turns[currentTurn].room = {
                    condition: effect,
                    duration: initialDuration
                };
            }
        }
    }
}

function processSideStart(currentTurn, sideStartMatch, turns) {
    const playerNumber = sideStartMatch[1];
    const playerName = sideStartMatch[2].trim();
    const effectName = sideStartMatch[3].trim().toLowerCase();
    const side = playerNumber === "1" ? "player1" : "player2";
    if (effectName === "light screen") {
        processLightscreen(currentTurn, side, turns, sideStartMatch);
    } else if (effectName === "reflect") {
        processReflect(currentTurn, side, turns, sideStartMatch);
    } else if (effectName === "aurora veil") {
        processAuroraVeil(currentTurn, side, turns, sideStartMatch);
    } else if (effectName === "tailwind") {
        processTailwind(currentTurn, side, turns, sideStartMatch);
    } else if (effectName === "spikes") {
        turns[currentTurn].spikes[side].spikes = Math.min((turns[currentTurn].spikes[side].spikes || 0) + 1, 3);
    } else if (effectName === "toxic spikes") {
        turns[currentTurn].spikes[side].toxicSpikes = Math.min((turns[currentTurn].spikes[side].toxicSpikes || 0) + 1, 2);
    } else if (effectName === "stealth rock") {
        turns[currentTurn].spikes[side].stealthRock = true;
    } else if (effectName === "sticky web") {
        turns[currentTurn].spikes[side].stickyWeb = true;
    }
}

function processScreen(currentTurn, side, screenType, turns, line) {
    let initialDuration = 5;
    const player = side === "player1" ? "player1" : "player2";
    const hasLightClay = turns[currentTurn].revealedPokemon[player].some(p => p.item === "Light Clay");
    if (hasLightClay) {
        initialDuration = 8;
    }
    turns[currentTurn].screens[screenType][side] = true;
    turns[currentTurn].screens[screenType]["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
}

function processReflect(currentTurn, side, turns, line) {
    processScreen(currentTurn, side, "reflect", turns, line);
}

function processLightscreen(currentTurn, side, turns, line) {
    processScreen(currentTurn, side, "lightscreen", turns, line);
}

function processAuroraVeil(currentTurn, side, turns, line) {
    processScreen(currentTurn, side, "auroraveil", turns, line);
}

function processTailwind(currentTurn, side, turns, line) {
    const initialDuration = 5;
    turns[currentTurn].tailwind[side] = true;
    turns[currentTurn].tailwind["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
}

function processFieldEnd(currentTurn, line, turns) {
    if (line.includes("fieldend") && !line.includes("[upkeep]")) {
        turns[currentTurn].field = {
            terrain: "",
            duration: 0
        };
    }
}

function processSideEnd(currentTurn, line, turns) {
    if (line.includes("sideend") && !line.includes("[upkeep]")) {
        turns[currentTurn].tailwind = {
            player1: false,
            player2: false,
            duration1: 0,
            duration2: 0
        };
        turns[currentTurn].screens.reflect = { player1: false, player2: false, duration1: 0, duration2: 0 };
        turns[currentTurn].screens.lightscreen = { player1: false, player2: false, duration1: 0, duration2: 0 };
        turns[currentTurn].screens.auroraveil = { player1: false, player2: false, duration1: 0, duration2: 0 };
    }
}

function getPokemonName(nickname, player, turns, currentTurn) {
    const revealedPokemon = turns[currentTurn].revealedPokemon[player];
    const pokemon = revealedPokemon.find(p => p.nickname === nickname);
    if (!pokemon) {
        return nickname;
    }
    return pokemon.name;
}

run().catch(console.dir);

module.exports = {
    saveReplayToBigQuery
};