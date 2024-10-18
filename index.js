const {BigQuery} = require('@google-cloud/bigquery');
const express = require("express");
const axios = require("axios");

// Initialize the BigQuery client
const bigQuery = new BigQuery();
console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);

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
    console.log("Player 1: ", player1);
    const player2 = players[1];
    console.log("Player 2: ", player2);
    const winner = processWinner(log);
    console.log("Winner of the match is:", winner);
    const loser = winner === player1 ? player2 : player1;
    console.log("Loser of the match is:", loser);
    const date = new Date(uploadtime * 1000);
    console.log("Date of the match is:", date);
    let turns = [];
    console.log("Empty initial turns: ", turns);
    
    // Initialize the first turn
    let currentTurn = 0;
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
        terrain: "",
        duration: 0,
      },
      revealedPokemons: {
        player1: [],
        player2: [],
      },
      faintedPokemons: { 
        player1: [], 
        player2: [],
      }
    });
    
    for (let line of log) {
      console.log("Looking at line");

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
        /\|-damage\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/
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
      const fieldMatch = line.match(/\|-fieldstart\|move: (\w+\s?\w*)\|\[of\] (p\d[ab]): (\w+)/);
      
      // Detect new turn
      if (turnMatch) {
        currentTurn = parseInt(turnMatch[1]);
        turns = processTurn(currentTurn, turns);
        console.log("Start of turn", turnMatch[1]);
      } else if (switchMatches) { // Detect active Pokémon switches and update revealed Pokémon if necessary
        console.log("Switch detected");
        processSwitch(
          currentTurn,
          switchMatches,
          turns
        );
        console.log("Turn processed");
      } else if (itemMatch) { // Detect the usage of an item in different formats
        processItem(currentTurn, itemMatch, turns);
      } else if (endItemMatch) { // Detect the end of an item effect
        console.log(endItemMatch);
        processItem(currentTurn, endItemMatch, turns);
      } else if (abilityMatch) { // Detect the usage of an ability
        processAbility(currentTurn, abilityMatch, turns);
      } else if (moveMatch) { // Detect the usage of a move
        processMove(currentTurn, moveMatch, turns);
      } else if (damageMatch) { // Update the remaining HP of a Pokémon in each turn
        console.log(damageMatch);
        processDamage(
          currentTurn,
          damageMatch,
          turns
        );
      } else if (healMatch) { // Detect the healing of a Pokémon
        console.log("heal detected");
        processDamage(
          currentTurn,
          healMatch,
          turns
        );
      } else if (statusMatch) { // Detect the effect of a status condition
        console.log(statusMatch);
        processStatus(currentTurn, statusMatch, turns);
      } else if (cureStatusMatch) { // Detect the cure of a status condition
        console.log(cureStatusMatch);
        processStatus(currentTurn, cureStatusMatch, turns);
      } else if (boostMatch) { // Detect the effect of a boost
        console.log(boostMatch);
        processBoost(currentTurn, boostMatch, turns);
      } else if (unBoostMatch) { // Detect the effect of an unboost
        console.log(unBoostMatch);
        processBoost(currentTurn, unBoostMatch, turns);
      } else if (teraMatch) { // Detect the terastallize effect
        console.log(teraMatch);
        processTerastallize(currentTurn, teraMatch, turns);
      } else if (fieldMatch) { // Detect the start of a field effect
        console.log(fieldMatch);
        turns[currentTurn].field = { terrain: fieldMatch[1], duration: 5 };
      }
    }

    console.log("e");
    app.post("/replays", async (req, res) => {
      console.log("e1");
      try {
        const replayData = {
          player1: req.body.player1,
          player2: req.body.player2,
          winner: req.body.winner,
          loser: req.body.loser,
          date: req.body.date,
          turns: req.body.turns,
        };
    
        // Insertar en la tabla `replays`
        await bigQuery
          .dataset('pokemon_replays')
          .table('replays')
          .insert(replayData);
    
        res.status(201).send("Replay saved successfully!");
      } catch (error) {
        console.error("Error saving replay", error);
        res.status(500).send("Error saving replay");
      }
    });
    
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
        terrain: "",
        duration: 0,
      },
      revealedPokemons: {
        player1: [],
        player2: [],
      },
      faintedPokemons: { 
        player1: [], 
        player2: [],
      }
    });
  } else {
    // Copy the active Pokémon from the previous turn
    console.log("Previous turn", turns[currentTurn - 1]);
    const previousTurn = turns[currentTurn - 1];
    console.log(previousTurn.field.duration, previousTurn.field.terrain);
    const previousTerrainEnds = (previousTurn.field.duration - 1) > 1;
    console.log(previousTerrainEnds);

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
        terrain: previousTerrainEnds ? previousTurn.field.terrain : "",
        duration: previousTerrainEnds ? previousTurn.field.duration - 1 : 0,
      },
      revealedPokemons: {
        player1: JSON.parse(JSON.stringify(previousTurn.revealedPokemons.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.revealedPokemons.player2)), // Deep copy
      },
      faintedPokemons: {
        player1: JSON.parse(JSON.stringify(previousTurn.faintedPokemons.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.faintedPokemons.player2)), // Deep copy
      }
    });
  }

  return turns;
}

// Process the switch of a Pokémon
function processSwitch(currentTurn, switchMatches, turns) {
  const player = switchMatches[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = switchMatches[2];
  console.log(pokemonName, "entered the battle");
  const slot = switchMatches[1].endsWith("a") ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
  console.log("In the slot", slot);

  // Add Pokémon to revealedPokemons if it hasn't been revealed yet
  const isRevealed = turns[currentTurn].revealedPokemons[player].some(
    (p) => p.name === pokemonName
  );
  console.log("Is revealed?", isRevealed);
  
  let pokemon;

  if (!isRevealed) {
    pokemon = {
      name: pokemonName,
      moves: [],
      ability: "",
      item: "",
      remainingHp: 100,
      nonVolatileStatus: "",
      stats: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      tera: { type: "", active: false }
    };

    turns[currentTurn].revealedPokemons[player].push(pokemon);
    console.log(pokemonName, "was revealed");
  } else {
    // Load the info of the Pokémon from revealedPokemons, but the stats boosts return to 0
    pokemon = turns[currentTurn].revealedPokemons[player].find((p) => p.name === pokemonName);

    // make all the pokemons that are not active have 0 stats
    const activePokemons = [
      player1 = {
        "p1a": turns[currentTurn].startsWith.player1[0],
        "p1b": turns[currentTurn].startsWith.player1[1]
      },
      player2 = {
        "p2a": turns[currentTurn].startsWith.player2[0],
        "p2b": turns[currentTurn].startsWith.player2[1]
      }
    ];

    turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) => {
      // Si el Pokémon no está activo, se le asignan stats a 0
      if (!activePokemons[slot].includes(p.name)) {
        return { ...p, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
      }
      // Si está activo, se devuelve tal cual
      return p;
    });

    console.log("Pokemon loaded", pokemon);
  }

  // Update active Pokémons
  console.log(turns[currentTurn]);
  turns[currentTurn].endsWith[player][slot] = pokemon.name;

  return [turns];
}

// Process the usage of an item
function processItem(currentTurn, itemMatch, turns) {
  const player = itemMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = itemMatch[2];
  let item = itemMatch[3];
  
  if (itemMatch[0].startsWith("|-enditem")) {
    item = "none";
  }

  // Update the item of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, item: item } : p
  );

  console.log(pokemonName, "used the item", item);
}

// Process the usage of an ability
function processAbility(currentTurn, abilityMatch, turns) {
  const player = abilityMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = abilityMatch[2];
  const ability = abilityMatch[3];

  // Update the ability of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, ability: ability } : p
  );
}

// Process the usage of a move
function processMove(currentTurn, moveMatch, turns, revealedPokemons) {
  const player = moveMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = moveMatch[2];
  const move = moveMatch[3];
  const target = moveMatch[5];

  // Update the moves of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName
      ? { ...p, moves: [...new Set([...p.moves, move])] }
      : p
  );
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
  
  let remainingHp;
  if (damageInfo === "0 fnt") {
    // Update the faintedPokemons
    turns[currentTurn].
    faintedPokemons[player].push({
      name: pokemonName,
      turnFainted: currentTurn,
    });
    remainingHp = 0;
    console.log(pokemonName, "fainted");
  } else {
    // Update the remaining HP of the Pokémon in revealedPokemons
    remainingHp = parseInt(damageInfo.split("/")[0]);
    if (damageMatch[0].startsWith("|-heal")) {
      console.log("Healing", pokemonName, "for", remainingHp, "HP");
    }
  }

  // Update the remaining HP of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, remainingHp: remainingHp } : p
  );

  console.log(pokemonName, "received", damageInfo, "damage");
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

  // Update the status of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, nonVolatileStatus: status } : p
  );
}

// Process the effect of a boost
function processBoost(currentTurn, boostMatch, turns) {
  const player = boostMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = boostMatch[2];
  const statBoosted = boostMatch[3];
  const boost = parseInt(boostMatch[4]);

  // Update the boosts of the Pokémon in revealedPokemons
  const pokemon = turns[currentTurn].revealedPokemons[player].find(
    (p) => p && p.name === pokemonName
  );

  if (boostMatch[0].startsWith("|-boost")) {
    pokemon.stats[statBoosted] += boost;
  } else if (boostMatch[0].startsWith("|-unboost")) {
    pokemon.stats[statBoosted] -= boost;
  }

  console.log("new stats", pokemon.stats);
}

// Process the terastallize effect
function processTerastallize(currentTurn, teraMatch, turns) {
  const player = teraMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = teraMatch[2];
  const type = teraMatch[3];

  // Update the terastallize effect of the Pokémon in revealedPokemons
  turns[currentTurn].revealedPokemons[player] = turns[currentTurn].revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, tera: { type: type, active: true } } : p
  );
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
    console.log("BigQuery initialized", bigQuery);

    //Initialize express server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
  }
}

run().catch(console.dir);
