const { BigQuery } = require('@google-cloud/bigquery');
const express = require("express");
const axios = require("axios");

// todo: pokemons name instead of names in some revealed_pokemon

const router = express.Router();
const keyFilename = "C:/Users/pablo/Documents/pokemonStatistics/pokemonStatistics/credentials.json";

// Initialize the BigQuery client
const bigQuery = new BigQuery({ keyFilename });

// POST endpoint to process a replay
router.post("/", async (req, res) => {
  const replayUrl = req.body.url;
  if (!replayUrl) {
    return res.status(400).json({ error: 'Missing replay URL' });
  }

  try {
    // Obtaining the data from the JSON file in the URL
    const response = await axios.get(`${replayUrl}.json`);
    const replayData = response.data;

    // Extracting the data from the replay
    const id = replayData.id;

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
      movesDone: {
        player1: [ "", "" ],
        player2: [ "", "" ]
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
      if (switchMatches) { // Detect active Pokémon switches and update revealed Pokémon if necessary
        //console.log("Switch detected");
        processSwitch(currentTurn, switchMatches, turns, teams);
        //console.log("Turn processed");
      } 
      if (itemMatch) { // Detect the usage of an item in different formats
        processItem(currentTurn, itemMatch, turns);
      } 
      if (endItemMatch) { // Detect the end of an item effect
        //console.log(endItemMatch);
        processItem(currentTurn, endItemMatch, turns);
      } 
      if (moveMatch || moveFailMatch) { // Detect the usage of a move
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
      // Process fieldend to clear terrain effect if found
      if (line.includes("fieldend")) {
        processFieldEnd(currentTurn, line, turns);
      }
      if (sideStartMatch) { // Detect the start of a side effect
        processSideStart(currentTurn, sideStartMatch, turns);
      }
      // Process sideend to clear tailwind and screens if found
      if (line.includes("sideend")) {
        processSideEnd(currentTurn, line, turns);
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
      
      // Add detailed logging of snakeCaseData
      //console.log("Full replay data after snake case conversion:");
      //console.log(JSON.stringify(snakeCaseData, null, 2));

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

// In processTurn, add logging for the remaining turns of side effects (screens and tailwind)
function processTurn(currentTurn, turns) {
  const previousTurn = turns[currentTurn - 1];
  
  // Process weather update (existing code)
  let newWeather = { condition: "", duration: 0 };
  if (previousTurn.weather && previousTurn.weather.duration > 0) {
    const weatherDuration = previousTurn.turn_number >= 1 ? previousTurn.weather.duration - 1 : previousTurn.weather.duration;
    newWeather = {
      condition: previousTurn.weather.condition,
      duration: weatherDuration > 0 ? weatherDuration : 0
    };
    if (newWeather.duration === 0); //console.log(`Weather ${newWeather.condition} ended.`);
  }
  
  // Process field update (existing code)
  let newField = { terrain: "", duration: 0 };
  if (previousTurn.field && previousTurn.field.duration > 0) {
    const fieldDuration = previousTurn.turn_number >= 1 ? previousTurn.field.duration - 1 : previousTurn.field.duration;
    newField = {
      terrain: previousTurn.field.terrain,
      duration: fieldDuration > 0 ? fieldDuration : 0
    };
    if (newField.duration === 0); //console.log(`Terrain ${newField.terrain} ended.`);
  }
  
  // Process room update (existing code)
  let newRoom = { condition: "", duration: 0 };
  if (previousTurn.room && previousTurn.room.duration > 0) {
    const roomDuration = previousTurn.turn_number >= 1 ? previousTurn.room.duration - 1 : previousTurn.room.duration;
    newRoom = {
      condition: previousTurn.room.condition,
      duration: roomDuration > 0 ? roomDuration : 0
    };
    if (newRoom.duration === 0); //console.log(`Room ${newRoom.condition} ended.`);
  }
  
  // Process screens update for each type and each player
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
        const newDuration = previousTurn.turn_number >= 1 ? prevDuration - 1 : prevDuration;
        newScreens[screen][durationKey] = newDuration > 0 ? newDuration : 0;
        if (newDuration <= 0) {
          newScreens[screen][player] = false;
        } else {
          newScreens[screen][player] = previousTurn.screens[screen][player];
        }
      }
    });
  });
  
  // Process tailwind update for each player
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
      const newDuration = previousTurn.turn_number >= 1 ? prevDuration - 1 : prevDuration;
      newTailwind[durationKey] = newDuration > 0 ? newDuration : 0;
      if (newDuration <= 0) {
        newTailwind[player] = false;
      } else {
        newTailwind[player] = previousTurn.tailwind[player];
      }
      //console.log(`Tailwind on ${player} has ${newTailwind[durationKey]} turns left`);
    }
  });
  
  // Build new turn state incorporating updates
  turns.push({
    turn_number: currentTurn,
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
    movesDone: {
      player1: [ "", "" ],
      player2: [ "", "" ]
    },
    revealedPokemon: {
      player1: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player1)),
      player2: JSON.parse(JSON.stringify(previousTurn.revealedPokemon.player2)),
    }
  });

  //console.log(`Start of turn ${currentTurn}`);
  //console.log(`Terrain left: ${newField.duration}`);
  //console.log(`Weather left: ${newWeather.duration}`);
  //console.log(`Room left: ${newRoom.duration}`);
  //console.log(`Reflect left: ${newScreens.reflect.duration1} ${newScreens.reflect.duration2}`);
  //console.log(`Lightscreen left: ${newScreens.lightscreen.duration1} ${newScreens.lightscreen.duration2}`);
  //console.log(`Auroraveil left: ${newScreens.auroraveil.duration1} ${newScreens.auroraveil.duration2}`);
  //console.log(`Tailwind left: ${newTailwind.duration1} ${newTailwind.duration2}`);
  //console.log('startsWith p1:', turns[currentTurn].startsWith.player1);
  //console.log('startsWith p2:', turns[currentTurn].startsWith.player2);
  //console.log('endsWith p1:', turns[currentTurn].endsWith.player1);
  //console.log('endsWith p2:', turns[currentTurn].endsWith.player2);

  // After initializing the turn, check for sleeping Pokémon and update their movesDone
  for (const player of ['player1', 'player2']) {
    // Check each active slot (0 and 1)
    for (let slot = 0; slot < 2; slot++) {
      const pokemonName = turns[currentTurn].startsWith[player][slot];
      if (pokemonName && pokemonName !== "none") {
        const pokemon = turns[currentTurn].revealedPokemon[player].find(
          p => p && p.name === pokemonName
        );
        
        // If Pokémon exists, is sleeping, and hasn't made a move yet
        if (pokemon && pokemon.nonVolatileStatus === "slp" && 
            (!turns[currentTurn].movesDone[player][slot] 
            || turns[currentTurn].movesDone[player][slot] === "")) {
          turns[currentTurn].movesDone[player][slot] = "continue sleeping";
        }
      }
    }
  }

  // Check for sleeping Pokémon at the start of each turn
  for (const player of ['player1', 'player2']) {
    // Check each active slot (0 and 1)
    for (let slot = 0; slot < 2; slot++) {
      const pokemonName = turns[currentTurn].startsWith[player][slot];
      if (pokemonName && pokemonName !== "none") {
        const pokemon = turns[currentTurn].revealedPokemon[player].find(
          p => p && p.name === pokemonName
        );
        
        // If Pokémon exists and is sleeping, mark it in movesDone
        if (pokemon && pokemon.nonVolatileStatus === "slp") {
          turns[currentTurn].movesDone[player][slot] = "sleeping";
          //console.log(`Move done updated for ${player} slot ${slot}: sleeping`);
        }
      }
    }
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
  const slotOwner = switchMatches[1];
  const player = slotOwner.startsWith("p1") ? "player1" : "player2";
  const nickname = switchMatches[2];
  const newPokemonName = switchMatches[3];
  const slot = slotOwner.endsWith("a") ? 0 : 1;

  // Identify the old (switching-out) Pokémon name from the active slot.
  const oldMonName =
    turns[currentTurn].endsWith[player][slot] ||
    turns[currentTurn].startsWith[player][slot];
    
  // Update movesDone for the switching-out Pokémon
  if (oldMonName && oldMonName !== "none") {
    if (turns[currentTurn].movesDone[player][slot] === "") {
      turns[currentTurn].movesDone[player][slot] = `switch to ${newPokemonName}`;
    } else {
      turns[currentTurn].movesDone[player][slot] += `, switch to ${newPokemonName}`;
    }

    //console.log(`Move done updated for ${player} slot ${slot}: ${turns[currentTurn].movesDone[player][slot]}`);
  }
  
  // Locate (or create) the new (switching-in) Pokémon.
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
    //console.log(`New Pokémon revealed: ${newPokemonName}`);
  }
  
  // For turn 0 only, update switching-in move description in movesDone.
  if (currentTurn === 0) {
    turns[currentTurn].movesDone[player][slot] = "switched in";
    //console.log(`Move done set for ${player} slot ${slot}: switched in because of the switch`);
  }
  
  // Update the active slot with the new Pokémon.
  turns[currentTurn].endsWith[player][slot] = newPokemonName;
  return turns;
}

// Process the usage of an item
function processItem(currentTurn, itemMatch, turns) {
  const player = itemMatch[1].startsWith("p1") ? "player1" : "player2";
  let pokemonName = itemMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
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
function processDamage(currentTurn, damageMatch, turns) {
  const player = damageMatch[1].startsWith("p1") ? "player1" : "player2";
  let pokemonName = damageMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
  const damageInfo = damageMatch[3];
  //console.log("Damage info", damageInfo);
  
  let remainingHp, newFightingStatus;
  if (damageInfo === "0 fnt") {
    newFightingStatus = "fainted";
    remainingHp = 0;
    //console.log(pokemonName, "fainted");

    // Find which slot this Pokemon occupies
    const slot = turns[currentTurn].startsWith[player].indexOf(pokemonName);
    if (slot !== -1) {
      // If there's already a move recorded, append (fainted), otherwise just set to "fainted"
      if (turns[currentTurn].movesDone[player][slot]) {
        turns[currentTurn].movesDone[player][slot] += " (fainted)";
      } else {
        turns[currentTurn].movesDone[player][slot] = "fainted";
      }
    }
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
  let pokemonName = statusMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
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
  let pokemonName = boostMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
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
  let pokemonName = teraMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
  const type = teraMatch[3];

  // Update the terastallize effect of the Pokémon in revealedPokemon
  turns[currentTurn].revealedPokemon[player] = turns[currentTurn].revealedPokemon[player].map((p) =>
    p.name === pokemonName ? { ...p, tera: { type: type, active: true } } : p
  );
}

// Add a function to process volatile statuses
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

  // Add the status if it doesn't exist
  const existing = pokemon.volatileStatus.find((v) => v.name === statusName);
  if (!existing) {
    pokemon.volatileStatus.push({ name: statusName, turnCounter: 0 });
    //console.log(pokemonName, "got the volatile status", statusName);
  }
}

// Modify incrementVolatileTurnCounters to not increment protect counter automatically
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
  let pokemonName = moveMatch[2];
  pokemonName = getPokemonName(pokemonName, player, turns, currentTurn);
  const moveUsed = moveMatch[3].toLowerCase().replace(/\|.*$/, ''); // Remove anything after a |

  // Extract target info (for successful moves)
  let targetInfo = "";
  if (moveMatch.length > 4) {
    const targetPlayer = moveMatch[4].startsWith("p1") ? "player1" : "player2";
    const targetSlot = moveMatch[4].endsWith("a") ? 0 : 1;
    // Get the original target from startsWith instead of the final Pokemon
    const originalTarget = turns[currentTurn].startsWith[targetPlayer][targetSlot];
    targetInfo = ` on ${originalTarget}`;
  }

  // Find which slot the moving Pokémon occupies in the active (startsWith) array.
  const slot = turns[currentTurn].startsWith[player].indexOf(pokemonName);
  if (slot === -1) return; // not active
  
  // Update movesDone with target info
  if (moveMatch[0].includes("[spread]")) {
    turns[currentTurn].movesDone[player][slot] = `${moveUsed} (spread)`;
  } else if (moveMatch[0].includes("[still]")) {
    turns[currentTurn].movesDone[player][slot] = `${moveUsed} (failed)`;
  } else {
    turns[currentTurn].movesDone[player][slot] = `${moveUsed}${targetInfo}`;
  }
  //console.log(`Move done updated for ${player} slot ${slot}: ${turns[currentTurn].movesDone[player][slot]}`);

  // Find the Pokémon in the current turn's revealedPokemon
  const userPokemon = turns[currentTurn].revealedPokemon[player].find(
    (p) => p && p.name === pokemonName
  );
  if (!userPokemon) return;

  // Initialize protect counter if undefined
  if (userPokemon.consecutiveProtectCounter === undefined) {
    userPokemon.consecutiveProtectCounter = 0;
  }

  // Update protect counter based on move used
  if (protectMoves.includes(moveUsed)) {
    userPokemon.consecutiveProtectCounter++;
  } else {
    userPokemon.consecutiveProtectCounter = 0;
  }

  // Record the last move used
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
    
    // Check if the Pokemon setting the weather has a duration-extending item
    const player = line.includes("p1") ? "player1" : "player2";
    const pokemon = turns[currentTurn].revealedPokemon[player].find(p => {
      return p.item === "Heat Rock" || p.item === "Damp Rock" || 
             p.item === "Smooth Rock" || p.item === "Icy Rock";
    });

    // If Pokemon has relevant item, extend duration
    if (pokemon) {
      switch(pokemon.item) {
        case "Damp Rock":
          if (newCondition === "RainDance") initialDuration = currentTurn === 0 ? 9 : 8;
          break;
        case "Heat Rock":
          if (newCondition === "SunnyDay") initialDuration = currentTurn === 0 ? 9 : 8;
          break;
        case "Smooth Rock":
          if (newCondition === "Sandstorm") initialDuration = currentTurn === 0 ? 9 : 8;
          break;
        case "Icy Rock":
          if (newCondition === "Hail") initialDuration = currentTurn === 0 ? 9 : 8;
          break;
      }
    }

    // Always replace existing weather with new weather
    turns[currentTurn].weather = {
      condition: newCondition,
      duration: initialDuration
    };
    
    //console.log(`Weather changed to: ${newCondition} with duration: ${initialDuration}`);
  }
}

function processField(currentTurn, fieldMatch, turns) {
  if (fieldMatch) {
    const terrain = fieldMatch[1];
    let initialDuration = (currentTurn === 0) ? 6 : 5;

    // Check if any active Pokemon has Terrain Extender
    const hasTerrainExtender = turns[currentTurn].revealedPokemon.player1.some(p => p.item === "Terrain Extender") ||
                              turns[currentTurn].revealedPokemon.player2.some(p => p.item === "Terrain Extender");

    if (hasTerrainExtender) {
      initialDuration = currentTurn === 0 ? 9 : 8;
    }
    
    turns[currentTurn].field = {
      terrain: terrain,
      duration: initialDuration
    };
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
        //console.log(`${effect} cancelled.`);
      } else {
        // Otherwise, override the previous room effect with the new one
        turns[currentTurn].room = {
          condition: effect,
          duration: initialDuration
        };
        //console.log(`Room effect set to: ${effect} with duration: ${initialDuration}`);
      }
    }
  }
}

function processSideStart(currentTurn, sideStartMatch, turns) {
  const playerNumber = sideStartMatch[1];
  //console.log("Player number:", playerNumber);
  const playerName = sideStartMatch[2].trim();
  //console.log("Player name:", playerName);
  const effectName = sideStartMatch[3].trim().toLowerCase();
  //console.log("Effect name:", effectName);
  const side = playerNumber === "1" ? "player1" : "player2";

  //console.log(`Side start detected for ${side} (${playerName}), effect: ${effectName}`);

  if (effectName === "light screen") {
    processLightscreen(currentTurn, side, turns, sideStartMatch);
  } else if (effectName === "reflect") {
    processReflect(currentTurn, side, turns, sideStartMatch);
  } else if (effectName === "aurora veil") {
    processAuroraVeil(currentTurn, side, turns, sideStartMatch);
  } else if (effectName === "tailwind") {
    processTailwind(currentTurn, side, turns, sideStartMatch);
  } else {
    console.log("Unhandled sidestart effect:", effectName);
  }
}

function processScreen(currentTurn, side, screenType, turns, line) {
  let initialDuration = (currentTurn === 0) ? 6 : 5;
  
  // Check if setter has Light Clay
  const player = side === "player1" ? "player1" : "player2";
  const hasLightClay = turns[currentTurn].revealedPokemon[player].some(p => p.item === "Light Clay");
  
  if (hasLightClay) {
    initialDuration = currentTurn === 0 ? 9 : 8;
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

// Create a function to process tailwind effects for a given player side
function processTailwind(currentTurn, side, turns, line) {
  const initialDuration = (currentTurn === 0) ? 6 : 5;
  turns[currentTurn].tailwind[side] = true;
  turns[currentTurn].tailwind["duration" + (side === "player1" ? "1" : "2")] = initialDuration;
  //console.log(`Tailwind set for ${side} with duration: ${initialDuration}`);
}

// New function to process fieldend: clears terrain effects
function processFieldEnd(currentTurn, line, turns) {
  if (line.includes("fieldend") && !line.includes("[upkeep]")) {
    turns[currentTurn].field = {
      terrain: "",
      duration: 0
    };
    //console.log("Field ended (terrain cleared).");
  }
}

// New function to process sideend: clears tailwind and screens effects
function processSideEnd(currentTurn, line, turns) {
  if (line.includes("sideend") && !line.includes("[upkeep]")) {
    // Clear tailwind
    turns[currentTurn].tailwind = {
      player1: false,
      player2: false,
      duration1: 0,
      duration2: 0
    };
    // Clear screens for both players
    turns[currentTurn].screens.reflect = { player1: false, player2: false, duration1: 0, duration2: 0 };
    turns[currentTurn].screens.lightscreen = { player1: false, player2: false, duration1: 0, duration2: 0 };
    turns[currentTurn].screens.auroraveil = { player1: false, player2: false, duration1: 0, duration2: 0 };
    //console.log("Side effects ended (tailwind and screens cleared).");
  }
}

// returns the original name of the pokemon given the alias
function getPokemonName(nickname, player, turns, currentTurn) {
  const revealedPokemon = turns[currentTurn].revealedPokemon[player];
  const pokemon = revealedPokemon.find(p => p.nickname === nickname);
  return pokemon.name;
}

run().catch(console.dir);

module.exports = router;