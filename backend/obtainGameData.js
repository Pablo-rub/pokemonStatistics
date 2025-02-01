const {BigQuery} = require('@google-cloud/bigquery');
const express = require("express");
const axios = require("axios");

const keyFilename = "C:/Users/pablo/Documents/pokemonStatistics/pokemonStatistics/credentials.json";

//todo: tailwind (sidestart)
//todo: pokemon name instead of random names random|pokemon
//todo: objects for weathers, terrains, rooms, screens, etc.

// Initialize the BigQuery client
const bigQuery = new BigQuery({keyFilename});

//Initialize the express app
const app = express();
app.use(express.json());

app.post("/replays", async (req, res) => {
  const replayUrl = req.body.url;
  try {
    // Obtaining the data from the JSON file in the URL
    const response = await axios.get(`${replayUrl}.json`);
    const replayData = response.data;

    // Extracting the data from the replay
    const id = replayData.id;

    // Check if the replay is already in the database
    /*const checkResponse = await axios.get(`http://localhost:5000/api/games/${id}`);
    if (checkResponse.data.exists) {
      res.status(200).send("Replay already exists in the database");
      return;
    }*/

    const format = replayData.format;
    const players = replayData.players;
    const log = replayData.log.split("\n");
    const uploadtime = replayData.uploadtime;
    const views = replayData.views;
    const formatId = replayData.formatid;
    const rating = replayData.rating;
    const private = replayData.private;
    const password = replayData.password;

    //Defining the variables to store the data
    const player1 = players[0];
    //console.log("Player 1: ", player1);
    const player2 = players[1];
    //console.log("Player 2: ", player2);
    const winner = processWinner(log);
    //console.log("Winner of the match is:", winner);
    const loser = winner === player1 ? player2 : player1;
    //console.log("Loser of the match is:", loser);
    const date = new Date(uploadtime * 1000).toISOString();
    //console.log("Date of the match is:", date);
    const teams = processShowteam(log); // Safe fallback if no showteam lines
    //console.log("Initial teams: ", teams);
    let turns = [];
    //console.log("Empty initial turns: ", turns);
    
    // Initialize the first turn
    let currentTurn = 0;
    turns.push({
      turn_number: currentTurn,
      startsWith: {
        player1: [],
        player2: [],
      },
      endsWith: {
        player1: [],
        player2: [],
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
      revealedPokemon: {
        player1: [],
        player2: [],
      }
    });
    
    for (let line of log) {
      //console.log("Looking at line");

      const turnMatch = line.match(/\|turn\|(\d+)/);
      const switchMatchesG = line.match(
        /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, ([MF])\|)?(\d+)\/(\d+)/
      );
      const switchMatchesNG = line.match(
        /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)\|(\d+)\/(\d+)/
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
      let moveMatch = line.match(
        /\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|(p1[ab]|p2[ab]): (.+)/
      );
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
      const volatileMatch = line.match(/\|-start\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      
      // Detect new turn
      if (turnMatch) {
        currentTurn = parseInt(turnMatch[1]);
        turns = processTurn(currentTurn, turns);
        incrementVolatileTurnCounters(turns);
        console.log("Start of turn", turnMatch[1]);
      }
      if (switchMatches) { // Detect active Pokémon switches and update revealed Pokémon if necessary
        console.log("Switch detected");
        processSwitch(
          currentTurn,
          switchMatches,
          turns,
          teams
        );
        //console.log("Turn processed");
      } 
      if (itemMatch) { // Detect the usage of an item in different formats
        processItem(currentTurn, itemMatch, turns);
      } 
      if (endItemMatch) { // Detect the end of an item effect
        //console.log(endItemMatch);
        processItem(currentTurn, endItemMatch, turns);
      } 
      if (moveMatch) { // Detect the usage of a move
        processMove(currentTurn, moveMatch, turns);
      } 
      if (damageMatch) { // Update the remaining HP of a Pokémon in each turn
        //console.log(damageMatch);
        processDamage(
          currentTurn,
          damageMatch,
          turns
        );
      } 
      if (healMatch) { // Detect the healing of a Pokémon
        //console.log("heal detected");
        processDamage(
          currentTurn,
          healMatch,
          turns
        );
      } 
      if (statusMatch) { // Detect the effect of a status condition
        //console.log(statusMatch);
        processStatus(currentTurn, statusMatch, turns);
      } 
      if (cureStatusMatch) { // Detect the cure of a status condition
        //console.log(cureStatusMatch);
        processStatus(currentTurn, cureStatusMatch, turns);
      } 
      if (boostMatch) { // Detect the effect of a boost
        //console.log(boostMatch);
        processBoost(currentTurn, boostMatch, turns);
      } 
      if (unBoostMatch) { // Detect the effect of an unboost
        //console.log(unBoostMatch);
        processBoost(currentTurn, unBoostMatch, turns);
      } 
      if (teraMatch) { // Detect the terastallize effect
        //console.log(teraMatch);
        processTerastallize(currentTurn, teraMatch, turns);
      } 
      if (fieldMatch) { // Detect the start of a field effect
        // If the effect is Trick Room, process it as a room effect.
        if (roomEffects.includes(fieldMatch[1])) {
          processRoom(currentTurn, fieldMatch, turns, line);
        } else {
          // Otherwise, process it as a normal terrain field effect.
          processField(currentTurn, fieldMatch, turns);
        }
      }
      if (weatherMatch && !line.includes("[upkeep]")) { // Only set or reset weather if line doesn't have [upkeep]
        processWeather(currentTurn, weatherMatch, turns, line);
      }
      if (volatileMatch) { // Detect the start of a volatile status
        processVolatileStart(currentTurn, volatileMatch, turns);
      }
    }

    try {
      // Save the replay data in BigQuery
      const replayData = {
        replay_id: id,
        format: format,
        views: views,
        rating: rating,
        player1: player1,
        player2: player2,
        winner: winner,
        loser: loser,
        date: date,
        teams: teams,
        turns: turns,
      };

      //console.log(turns[5].startsWith.player1);
      //console.log(turns[5].startsWith.player2);
      //console.log(turns[5].endsWith.player1);
      //console.log(turns[5].endsWith.player2);
      //console.log(turns[5].revealedPokemon.player1);
      //console.log(turns[5].revealedPokemon.player2);

      // Rename the names of the variables to match the BigQuery schema
      const snakeCaseData = toSnakeCase(replayData);
      //console.log("Replay in snake case", snakeCaseData);
      //console.log(snakeCaseData.turns[4].revealed_pokemon.player1);
    
      // Save the replay data in BigQuery
      saveReplay(snakeCaseData);
      res.status(200).send("Replay saved successfully");

    } catch (error) {
      console.error("Error saving replay", error);
      res.status(500).send("Error saving replay");
    }
  
  } catch (error) {
    console.error("Error obtaining the data from the replay: ", error);
    res.status(400).send(error);
  }
});

// Process the turn
function processTurn(currentTurn, turns) {
  // Check if we are adding the first turn
  if (turns.length === 0) {
    // If no turns exist yet, initialize the first turn
    turns.push({
      turnNumber: currentTurn,
      startsWith: {
        player1: [],
        player2: [],
      },
      endsWith: {
        player1: [],
        player2: [],
      },
      field: {
        terrain: "none",
        duration: 0,
      },
      weather: {
        condition: "none",
        duration: 0,
      },
      room: {
        condition: "none",
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
      revealedPokemon: {
        player1: [],
        player2: [],
      }
    });

  } else {
    
    const previousTurn = turns[currentTurn - 1];
    //console.log("Previous turn", previousTurn);
    
    const previousTerrainEnds = (previousTurn.field.duration) > 1;
    console.log("Turns of terrain left: ", previousTurn.field.duration);
    
    const previousWeatherEnds = (previousTurn.weather.duration) > 1;
    console.log("Turns of weather left: ", previousTurn.weather.duration);

    const previousRoomEnds = (previousTurn.room.duration) > 1;
    console.log("Turns of room left: ", previousTurn.room.duration);

    let newTerrain;
    let newFieldDuration;
    let newWeather;
    let newWeatherDuration;

    if (previousTerrainEnds) {
      newTerrain = previousTurn.field.terrain;
      newFieldDuration = previousTurn.field.duration - 1;
    } else if (previousTurn.terrain != "none" && previousTurn.turnNumber == 1) {
      newTerrain = previousTurn.field.terrain;
      newFieldDuration = previousTurn.field.duration;
      //console.log("Field in turn: ", previousTurn.turnNumber);
    } else {
      newTerrain = "none";
      newFieldDuration = 0;
    }

    if (previousWeatherEnds) {
      newWeather = previousTurn.weather.condition;
      newWeatherDuration = previousTurn.weather.duration - 1;
    } else if (previousTurn.weather != "none" && previousTurn.turnCounter == 1) {
      newWeather = previousTurn.weather.condition;
      newWeatherDuration = previousTurn.weather.duration;
    } else {
      newWeather = "none";
      newWeatherDuration = 0;
    }

    // Decrement room duration
    let newRoom = { ...previousTurn.room };
    if (newRoom.duration > 0) {
      newRoom.duration = (previousTurn.turn_number >= 1)
        ? newRoom.duration - 1
        : newRoom.duration;
      if (newRoom.duration <= 0) {
        console.log(`Room ${newRoom.condition} ended.`);
        newRoom = { condition: "none", duration: 0 };
      }
    }

    // Decrement screens per player for each screen type
    let newScreens = {
      reflect: { 
        player1: previousTurn.screens.reflect.player1, 
        player2: previousTurn.screens.reflect.player2,
        duration1: 0,
        duration2: 0
      },
      lightscreen: { 
        player1: previousTurn.screens.lightscreen.player1, 
        player2: previousTurn.screens.lightscreen.player2,
        duration1: 0,
        duration2: 0
      },
      auroraveil: { 
        player1: previousTurn.screens.auroraveil.player1, 
        player2: previousTurn.screens.auroraveil.player2,
        duration1: 0,
        duration2: 0
      }
    };

    // For each screen type and for each player, decrement the duration
    ['reflect', 'lightscreen', 'auroraveil'].forEach(screen => {
      ['player1', 'player2'].forEach(player => {
        let durationKey = "duration" + (player === "player1" ? "1" : "2");
        let prevDuration = previousTurn.screens[screen][durationKey];
        if (prevDuration && prevDuration > 0) {
          let newDuration = (previousTurn.turn_number >= 1) ? prevDuration - 1 : prevDuration;
          newScreens[screen][durationKey] = newDuration > 0 ? newDuration : 0;
          // If duration drops to 0, set the screen to false
          if (newDuration <= 0) {
            newScreens[screen][player] = false;
          } else {
            newScreens[screen][player] = previousTurn.screens[screen][player];
          }
        }
      });
    });

    // Decrement tailwind durations per player
    let newTailwind = {
      player1: previousTurn.tailwind.player1,
      player2: previousTurn.tailwind.player2,
      duration1: 0,
      duration2: 0
    };

    ['player1', 'player2'].forEach(player => {
      let durationKey = "duration" + (player === "player1" ? "1" : "2");
      let prevDuration = previousTurn.tailwind[durationKey];
      if (prevDuration && prevDuration > 0) {
        let newDuration = (previousTurn.turn_number >= 1) ? prevDuration - 1 : prevDuration;
        newTailwind[durationKey] = newDuration > 0 ? newDuration : 0;
        if (newDuration <= 0) {
          newTailwind[player] = false;
        } else {
          newTailwind[player] = previousTurn.tailwind[player];
        }
      }
    });

    // Create a new object for the current turn
    turns.push({
      turnNumber: currentTurn,
      startsWith: {
        player1: JSON.parse(JSON.stringify(previousTurn.endsWith.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.endsWith.player2)), // Deep copy
      },
      endsWith: {
        player1: JSON.parse(JSON.stringify(previousTurn.endsWith.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.endsWith.player2)), // Deep copy
      },
      field: {
        terrain: newTerrain,
        duration: newFieldDuration,
      },
      weather: {
        condition: newWeather,
        duration: newWeatherDuration,
      },
      room: newRoom, // Include the room property
      screens: newScreens,
      tailwind: newTailwind,
      revealedPokemon: {
        player1: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player2)), // Deep copy
      }
    });
  }

  return turns;
}

// Process showteam
// Always return a default teams object, even if there is no "|showteam" in the log
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

      // Split into Pokémon blocks by "]"
      const rawPokemonBlocks = teamData.split(']').filter((b) => b.trim() !== '');

      const parsedPokemons = rawPokemonBlocks.map((block) => {
        const parts = block.split('|');
        const name = parts[0]?.trim() || '';
        const item = parts[2]?.trim() || '';
        const ability = parts[3]?.trim() || '';
        const moves = parts[4] ? parts[4].split(',').map((m) => m.trim()) : [];
        const level = parts[10]?.trim() || '';
        let teraType = '';
        if (parts[11]) {
          const splitted = parts[11].split(',').filter(Boolean);
          teraType = splitted[splitted.length - 1] || '';
        }

        return {
          name,
          item,
          ability,
          moves,
          level,
          teraType,
        };
      });

      // Store Pokémon info in 'teams'
      parsedPokemons.forEach((poke) => {
        teams[player].push(poke);
      });

      if (player === 'p1') {
        p1Processed = true;
      } else if (player === 'p2') {
        p2Processed = true;
      }
    }
    index++;
  }

  return teams;
}

// Process the switch of a Pokémon
function processSwitch(currentTurn, switchMatches, turns, teams) {
  const slotOwner = switchMatches[1];       // e.g. p1a
  const player = slotOwner.startsWith("p1") ? "player1" : "player2";
  const pokemonName = switchMatches[2];
  const slot = slotOwner.endsWith("a") ? 0 : 1;

  // Reset volatile on whoever was in this slot
  const oldMon = turns[currentTurn].endsWith[player][slot];
  if (oldMon) {
    turns[currentTurn].revealedPokemon[player] =
      turns[currentTurn].revealedPokemon[player].map((p) =>
        p && p.name === oldMon ? { ...p, volatileStatus: [] } : p
      );
  }

  // Check if this Pokémon is already revealed
  const isRevealed = turns[currentTurn].revealedPokemon[player].some(
    (p) => p.name === pokemonName
  );

  let pokemon;
  if (!isRevealed) {
    // Safely retrieve a matching Pokémon record from teams if it exists
    let pInfo = undefined;
    if (teams && teams[player]) {
      pInfo = teams[player].find((m) => m.name === pokemonName);
    }

    // Fallback to default values if not found
    pokemon = {
      name: pokemonName,
      moves: pInfo?.moves || [],
      ability: pInfo?.ability || "",
      item: pInfo?.item || "",
      remainingHp: 100,
      volatileStatus: [],
      nonVolatileStatus: "",
      stats: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      tera: { type: pInfo?.tera_type || "", active: false },
      fightingStatus: "",
      consecutiveProtectCounter: 0,
      abilitySuppressed: false,
      lastMoveUsed: "",
      mimicUsed: false,
      copiedMove: "",
      transformed: false
    };

    turns[currentTurn].revealedPokemon[player].push(pokemon);
  } else {
    // Already known, just find it
    pokemon = turns[currentTurn].revealedPokemon[player].find(
      (p) => p && p.name === pokemonName
    );
  }

  // Update active Pokémon in endsWith
  turns[currentTurn].endsWith[player][slot] = pokemon.name;
  return turns;
}

// Process the usage of an item
function processItem(currentTurn, itemMatch, turns) {
  const player = itemMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = itemMatch[2];
  let item = itemMatch[3];
  
  if (itemMatch[0].startsWith("|-enditem")) {
    item = "none";
  
    // Update the item of the Pokémon in revealedPokemon
    turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
      p.name === pokemonName ? { ...p, item: item } : p
    );
  }
}

// Process the damage received by a Pokémon
function processDamage(
  currentTurn,
  damageMatch,
  turns
) {
  const player = damageMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = damageMatch[2];
  const damageInfo = damageMatch[3];
  console.log("Damage info", damageInfo);
  
  let remainingHp, newFightingStatus;
  if (damageInfo === "0 fnt") {
    newFightingStatus = "fainted";
    remainingHp = 0;
    //console.log(pokemonName, "fainted");
  } else {
    // Update the remaining HP of the Pokémon in revealedPokemon
    remainingHp = parseInt(damageInfo.split("/")[0]);
    if (damageMatch[0].startsWith("|-heal")) {
      //console.log("Healing", pokemonName, "for", remainingHp, "HP");
    }
  }

  // Update the remaining HP of the Pokémon in revealedPokemon
  turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
    p.name === pokemonName ? { ...p, remainingHp: remainingHp, fightingStatus: newFightingStatus, } : p
  );

  //console.log(pokemonName, "status:", damageInfo);
}

// Process the effect of a status condition
function processStatus(currentTurn, statusMatch, turns) {
  const player = statusMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = statusMatch[2];
  let status;

  if (statusMatch[0].startsWith("|-curestatus")) {
    status = "";
  } else {
   status = statusMatch[3];
  }

  // Update the status of the Pokémon in revealedPokemon
  turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
    p.name === pokemonName ? { ...p, nonVolatileStatus: status } : p
  );
}

// Process the effect of a boost
function processBoost(currentTurn, boostMatch, turns) {
  const player = boostMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = boostMatch[2];
  const statBoosted = boostMatch[3];
  const boost = parseInt(boostMatch[4]);

  // Update the boosts of the Pokémon in revealedPokemon
  const pokemon = turns[currentTurn].revealedPokemon[player].find(
    (p) => p && p.name === pokemonName
  );

  if (pokemon) {
    if (boostMatch[0].startsWith("|-boost")) {
      pokemon.stats[statBoosted] += boost;
    } else if (boostMatch[0].startsWith("|-unboost")) {
      pokemon.stats[statBoosted] -= boost;
    }
  } else {
    console.log("Stats not updated because the Pokémon was not found:", pokemonName);
  }

  //console.log("new stats", pokemon.stats);
}

// Process the terastallize effect
function processTerastallize(currentTurn, teraMatch, turns) {
  const player = teraMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = teraMatch[2];
  const type = teraMatch[3];

  // Update the terastallize effect of the Pokémon in revealedPokemon
  turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
    p.name === pokemonName ? { ...p, tera: { type: type, active: true } } : p
  );
}

// Add a function to process volatile statuses
function processVolatileStart(currentTurn, volatileMatch, turns) {
  const player = volatileMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = volatileMatch[2];
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

  // Add the status if it doesn't exist
  const existing = pokemon.volatileStatus.find((v) => v.name === statusName);
  if (!existing) {
    pokemon.volatileStatus.push({ name: statusName, turnCounter: 0 });
    //console.log(pokemonName, "got the volatile status", statusName);
  }
}

// Increments volatile turn counters each turn
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
      
      if (p.consecutiveProtectCounter !== undefined) {
        p.consecutiveProtectCounter++;
      }
    });
  }
}

// Obtain the winner of the match
function processWinner(log) {
  let winner = log.find((line) => line.includes("|win|"));
  if (winner) {
    winner = winner.split("|")[2];
  }

  return winner.trim();
}

async function run() {
  try {
    //console.log("BigQuery initialized", bigQuery);

    //Initialize express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      //console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    //console.error("Error connecting to MongoDB: ", error);
  }
}

// Function to convert camelCase to snake_case
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

// Function to save the replay data in BigQuery and receive more info from problems
async function saveReplay(data) {
  const dataset = bigQuery.dataset('pokemon_replays');
  const table = dataset.table('replays');

  try {
    await table.insert(data);
    console.log('Replay saved successfully');
  } catch (error) {
    console.error('Error saving replay:', error);

    if (error.errors) {
        error.errors.forEach(err => {
            console.error('Row with error:', err.row);
            console.error('Details of the error:', err.errors);
        });
    }
  }
}

// Whenever a Pokémon uses a move, track that as its lastMoveUsed:
function processMove(currentTurn, moveMatch, turns) {
  const protectMoves = [
    "baneful bunker",
    "burning bulwark",
    "detect",
    "king's shield",
    "max guard",
    "obstruct",
    "protect",
    "silk trap",
    "spiky shield",
    "crafty shield",
    "mat block",
    "quick guard",
    "wide guard",
  ];

  const player = moveMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = moveMatch[2];
  const moveUsed = moveMatch[3];

  // Find the attacking Pokémon
  const userPokemon = turns[currentTurn].revealedPokemon[player].find(
    (p) => p && p.name === pokemonName
  );
  if (!userPokemon) return;

  // Initialize protect counter
  if (userPokemon.consecutiveProtectCounter === undefined) {
    userPokemon.consecutiveProtectCounter = 0;
  }

  // Increment or reset protect counter
  if (protectMoves.includes(moveUsed.toLowerCase())) {
    userPokemon.consecutiveProtectCounter += 1;
  } else {
    userPokemon.consecutiveProtectCounter = 0;
  }

  // Record the last move used by userPokemon
  userPokemon.lastMoveUsed = moveUsed;

  // Identify the target (simplified to the opponent's first slot)
  const opponent = player === "player1" ? "player2" : "player1";
  const targetName = turns[currentTurn].endsWith[opponent][0];
  const targetPokemon =
    turns[currentTurn].revealedPokemon[opponent].find((p) => p && p.name === targetName) || {};

  // Now handle moves that change abilities, moves, etc.
  handleObjectChangingMoves(currentTurn, userPokemon, targetPokemon, moveUsed, turns);
}

// Implement the moves that change abilities/moves/etc.
function handleObjectChangingMoves(currentTurn, userPokemon, targetPokemon, moveUsed, turns) {
  const move = moveUsed.toLowerCase();

  switch (move) {
    case "doodle":
      // Doodle copies the Ability of the target
      userPokemon.ability = targetPokemon.ability;
      break;

    case "entrainment":
      // Entrainment changes the target's Ability to match the user's
      targetPokemon.ability = userPokemon.ability;
      break;

    case "role play":
      // Role Play copies the target's Ability onto the user
      userPokemon.ability = targetPokemon.ability;
      break;

    case "simple beam":
      // Simple Beam changes the target's Ability to Simple
      targetPokemon.ability = "Simple";
      break;

    case "skill swap":
      // Skill Swap swaps the Abilities of the user and target
      const temp = userPokemon.ability;
      userPokemon.ability = targetPokemon.ability;
      targetPokemon.ability = temp;
      break;

    case "worry seed":
      // Worry Seed changes the target's Ability to Insomnia
      targetPokemon.ability = "Insomnia";
      break;

    case "gastro acid":
      // Gastro Acid suppresses the target's Ability
      targetPokemon.abilitySuppressed = true;
      break;

    case "mimic":
      // Mimic copies the target's last used move, if available
      if (targetPokemon.lastMoveUsed) {
        userPokemon.mimicUsed = true;
        userPokemon.copiedMove = targetPokemon.lastMoveUsed;
      } else {
        // No last move for target
        userPokemon.mimicUsed = false;
      }
      break;

    case "substitute":
      // Add a 'substitute' volatile status to the user if they don't already have it
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

// If weather or field introduced at turn 0, initialize it with duration=5 (or 6 to compensate turn 0)
function processWeather(currentTurn, weatherMatch, turns, line) {
  if (weatherMatch && !line.includes("[upkeep]")) {
    const newCondition = weatherMatch[1];
    const initialDuration = (currentTurn === 0) ? 6 : 5;
    
    // Always replace existing weather with new weather
    turns[currentTurn].weather = {
      condition: newCondition,
      duration: initialDuration
    };
    
    console.log(`Weather changed to: ${newCondition} with duration: ${initialDuration}`);
  }
}

function processField(currentTurn, fieldMatch, turns) {
  if (fieldMatch) {
    const terrain = fieldMatch[1];
    const initialDuration = (currentTurn === 0) ? 6 : 5;
    
    // Always replace existing terrain with new terrain
    turns[currentTurn].field = {
      terrain: terrain,
      duration: initialDuration
    };
    
    console.log(`Terrain changed to: ${terrain} with duration: ${initialDuration}`);
  }
}

// Allowed room effects
const roomEffects = ["Trick Room", "Gravity", "Magic Room", "Wonder Room"];

// Process room effects (moves that affect room property) using the same command (|-startfield|)
function processRoom(currentTurn, fieldMatch, turns, line) {
  if (fieldMatch && !line.includes("[upkeep]")) {
    const effect = fieldMatch[1];
    // Only process if the effect is one of the allowed room effects
    if (roomEffects.includes(effect)) {
      const initialDuration = (currentTurn === 0) ? 6 : 5;
      // If the same room effect is already active, cancel (delete) it
      if (turns[currentTurn].room.condition === effect) {
        turns[currentTurn].room = { condition: "", duration: 0 };
        console.log(`${effect} cancelled.`);
      } else {
        // Otherwise, override the previous room effect with the new one
        turns[currentTurn].room = {
          condition: effect,
          duration: initialDuration
        };
        console.log(`Room effect set to: ${effect} with duration: ${initialDuration}`);
      }
    }
  }
}

// Processing functions for screens (for when a screen move is detected)
// Each function accepts the current turn, the side (player1 or player2), and sets the relevant screen status
function processReflect(currentTurn, side, turns, line) {
  // Assuming a match has been detected for Reflect via a regex outside this function
  const initialDuration = (currentTurn === 0) ? 6 : 5;
  turns[currentTurn].screens.reflect[side] = true;
  turns[currentTurn].screens.reflect["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
  console.log(`Reflect set for ${side} with duration: ${initialDuration}`);
}

function processLightscreen(currentTurn, side, turns, line) {
  const initialDuration = (currentTurn === 0) ? 6 : 5;
  turns[currentTurn].screens.lightscreen[side] = true;
  turns[currentTurn].screens.lightscreen["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
  console.log(`Light Screen set for ${side} with duration: ${initialDuration}`);
}

function processAuroraVeil(currentTurn, side, turns, line) {
  const initialDuration = (currentTurn === 0) ? 6 : 5;
  turns[currentTurn].screens.auroraveil[side] = true;
  turns[currentTurn].screens.auroraveil["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
  console.log(`Aurora Veil set for ${side} with duration: ${initialDuration}`);
}

// Create a function to process tailwind effects for a given player side
function processTailwind(currentTurn, side, turns, line) {
  const initialDuration = (currentTurn === 0) ? 6 : 5;
  turns[currentTurn].tailwind[side] = true;
  turns[currentTurn].tailwind["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
  console.log(`Tailwind set for ${side} with duration: ${initialDuration}`);
}

run().catch(console.dir);
