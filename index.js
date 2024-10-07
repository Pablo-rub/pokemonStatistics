const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");

const uri =
  "mongodb+srv://pabloruar03:pokemonStadistics@pokemonstadistics.phu03.mongodb.net/?retryWrites=true&w=majority&appName=pokemonStadistics";

const clientOptions = {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
};

//Initialize the express app
const app = express();
app.use(express.json());

// Define the schema for the pokemons
const pokemonSchema = new mongoose.Schema({
  name: { type: String, required: true },
  moves: [String],
  ability: String,
  item: String,
  remainingHp: Number,
  volatileStatus: String,
  nonVolatileStatus: String,
  stats: {
    atk: Number,
    def: Number,
    spa: Number,
    spd: Number,
    spe: Number,
  },
});

// Define the schema for the replays
const replaySchema = new mongoose.Schema({
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  winner: { type: String, required: true },
  loser: { type: String, required: true },
  date: { type: Date, required: true },
  revealedPokemons: {
    player1: [pokemonSchema],
    player2: [pokemonSchema],
  },
  faintedPokemons: {
    player1: [{ name: String, turnFainted: Number }],
    player2: [{ name: String, turnFainted: Number }],
  },
  turns: [
    {
      turnNumber: { type: Number, required: true },
      startsWith: {
        player1: [pokemonSchema],
        player2: [pokemonSchema],
      },
      endsWith: {
        player1: [pokemonSchema],
        player2: [pokemonSchema],
      },
    },
  ],
});

//Create the model for the replays
const Replay = mongoose.model("Replay", replaySchema);

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
    //console.log("Player 1: ", player1);
    const player2 = players[1];
    //console.log("Player 2: ", player2);
    const winner = processWinner(log);
    //console.log("Winner of the match is:", winner);
    const loser = winner === player1 ? player2 : player1;
    //console.log("Loser of the match is:", loser);
    const date = new Date(uploadtime * 1000);
    //console.log("Date of the match is:", date);
    let revealedPokemons = { player1: [], player2: [] };
    let faintedPokemons = { player1: [], player2: [] };
    let turns = [];
    //console.log("Empty initial turns: ", turns);

    // Initialize the first turn
    let actualTurn = 0;
    turns.push({
      turnNumber: actualTurn,
      startsWith: {
        player1: [],
        player2: [],
      },
      endsWith: {
        player1: [],
        player2: [],
      },
    });

    for (let line of log) {
      //console.log("Looking at line");

      // Detect new turn
      const turnMatch = line.match(/\|turn\|(\d+)/);
      if (turnMatch) {
        actualTurn = parseInt(turnMatch[1]);
        turns = processTurn(actualTurn, turns);
        //console.log("Start of turn", turnMatch[1]);
      }

      // Detect active Pokémon switches and update revealed Pokémon if necessary
      const switchMatchesG = line.match(
        /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, ([MF])\|)?(\d+)\/(\d+)/
      );
      const switchMatchesNG = line.match(
        /\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)\|(\d+)\/(\d+)/
      );

      let switchMatches = switchMatchesG || switchMatchesNG;
      if (switchMatches) {
        //console.log("Switch detected");
        const [newTurns, newRevealedPokemons] = processSwitch(
          actualTurn,
          switchMatches,
          turns,
          revealedPokemons
        );
        //console.log("Turn processed");
      }

      // Detect the usage of an item in different formats
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
      if (itemMatch) {
        processItem(actualTurn, itemMatch, turns, revealedPokemons);
      }

      // Detect the end of an item effect
      let endItemMatch = line.match(/\|-enditem\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      if (endItemMatch) {
        //console.log(endItemMatch);
        processItem(actualTurn, endItemMatch, turns, revealedPokemons);
      }

      // Detect the usage of an ability
      let abilityMatch = line.match(
        /\|-ability\|(p1[ab]|p2[ab]): (.+)\|(.+)\|(.+)/
      );
      if (abilityMatch) {
        processAbility(actualTurn, abilityMatch, turns, revealedPokemons);
      }

      // Detect the usage of a move
      let moveMatch = line.match(
        /\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|(p1[ab]|p2[ab]): (.+)/
      );
      if (moveMatch) {
        processMove(actualTurn, moveMatch, turns, revealedPokemons);
      }

      // Update the remaining HP of a Pokémon in each turn
      let damageMatch = line.match(/\|-damage\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      if (damageMatch) {
        //console.log(damageMatch);
        processDamage(
          actualTurn,
          damageMatch,
          turns,
          revealedPokemons,
          faintedPokemons
        );
      }

      // Detect the effect of a status condition
      const statusMatch = line.match(
        /\|-status\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
      );
      if (statusMatch) {
        //console.log(statusMatch);
        processStatus(actualTurn, statusMatch, turns, revealedPokemons);
      }

      // Detect the effect of a boost
      const boostMatch = line.match(
        /\|-boost\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(.+)/
      );
      if (boostMatch) {
        //console.log(boostMatch);
        processBoost(actualTurn, boostMatch, turns, revealedPokemons);
      }

      // Detect the healing of a Pokémon
      const healMatch = line.match(
        /\|-heal\|(p1[ab]|p2[ab]): (.+?)\|(.+?)\|(?:\[from\] (.+?))?(?:\|\[of\] (.+?))?/
      );
      if (healMatch) {
        console.log("heal detected");
        processDamage(
          actualTurn,
          healMatch,
          turns,
          revealedPokemons,
          faintedPokemons
        );
      }
    }

    // Create the new entry in the database
    const newReplay = new Replay({
      player1: player1,
      player2: player2,
      winner: winner,
      loser: loser,
      date: date,
      revealedPokemons: revealedPokemons,
      faintedPokemons: faintedPokemons,
      turns: turns,
    });

    await newReplay.save();
    res.status(201).send(newReplay);
  } catch (error) {
    //console.error("Error obtaining the data from the replay: ", error);
    res.status(400).send(error);
  }
});

// Process the turn
function processTurn(actualTurn, turns, revealedPokemons) {
  // Check if we are adding the first turn
  if (turns.length === 0) {
    // If no turns exist yet, initialize the first turn
    turns.push({
      turnNumber: actualTurn,
      startsWith: {
        player1: [],
        player2: [],
      },
      endsWith: {
        player1: [],
        player2: [],
      },
    });
  } else {
    // Copy the active Pokémon from the previous turn
    const previousTurn = turns[actualTurn - 1];

    // Create a new object for the current turn
    turns.push({
      turnNumber: actualTurn,
      startsWith: {
        player1: JSON.parse(JSON.stringify(previousTurn.endsWith.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.endsWith.player2)), // Deep copy
      },
      endsWith: {
        player1: JSON.parse(JSON.stringify(previousTurn.endsWith.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.endsWith.player2)), // Deep copy
      },
    });
  }

  return turns;
}

// Process the switch of a Pokémon
function processSwitch(actualTurn, switchMatches, turns, revealedPokemons) {
  const player = switchMatches[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = switchMatches[2];
  //console.log(pokemonName, "entered the battle");
  const slot = switchMatches[1].endsWith("a") ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
  //console.log("In the slot", slot);

  // Add Pokémon to revealedPokemons if it hasn't been revealed yet
  const isRevealed = revealedPokemons[player].some(
    (p) => p.name === pokemonName
  );
  //console.log("Is revealed?", isRevealed);
  if (!isRevealed) {
    pokemon = {
      name: pokemonName,
      moves: [],
      ability: "",
      item: "",
      remainingHp: 100,
      nonVolatileStatus: "",
      stats: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    };

    revealedPokemons[player].push(pokemon);
    //console.log(pokemonName, "was revealed");
  } else {
    // Load the info of the Pokémon from revealedPokemons, but the stats boosts return to 0
    pokemon = revealedPokemons[player].find((p) => p.name === pokemonName);
    pokemon = { ...pokemon, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    //console.log("Pokemon loaded", pokemon);
  }

  // Update active Pokémons
  //console.log(turns[actualTurn]);
  turns[actualTurn].endsWith[player][slot] = pokemon;
  /*console.log(
    "Active pokemons of turn",
    actualTurn,
    "updated",
    turns[actualTurn].endsWith
  );*/

  return [turns, revealedPokemons];
}

// Process the usage of an item
function processItem(actualTurn, itemMatch, turns, revealedPokemons) {
  const player = itemMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = itemMatch[2];
  let item = itemMatch[3];
  
  if (itemMatch[0].startsWith("|-enditem")) {
    item = "none";
  }

  // Update the item of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, item: item } : p
  );

  // Update the item of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );
  if (pokemon) {
    pokemon.item = item;
  }

  //console.log(pokemonName, "used the item", item);
}

// Process the usage of an ability
function processAbility(actualTurn, abilityMatch, turns, revealedPokemons) {
  const player = abilityMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = abilityMatch[2];
  const ability = abilityMatch[3];

  // Update the ability of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, ability: ability } : p
  );

  // Update the ability of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );
  if (pokemon) {
    pokemon.ability = ability;
  }
}

// Process the usage of a move
function processMove(actualTurn, moveMatch, turns, revealedPokemons) {
  const player = moveMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = moveMatch[2];
  const move = moveMatch[3];
  const target = moveMatch[5];

  // Update the moves of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName
      ? { ...p, moves: [...new Set([...p.moves, move])] }
      : p
  );

  // Update the moves of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );
  if (pokemon && !pokemon.moves.includes(move)) {
    pokemon.moves.push(move);
  }
}

// Process the damage received by a Pokémon
function processDamage(
  actualTurn,
  damageMatch,
  turns,
  revealedPokemons,
  faintedPokemons
) {
  const player = damageMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = damageMatch[2];
  const damageInfo = damageMatch[3];
  //console.log("Damage info", damageInfo);
  
  let remainingHp;
  if (damageInfo === "0 fnt") {
    // Update the faintedPokemons
    faintedPokemons[player].push({
      name: pokemonName,
      turnFainted: actualTurn,
    });
    remainingHp = 0;
    //console.log(pokemonName, "fainted");
  } else {
    // Update the remaining HP of the Pokémon in revealedPokemons
    remainingHp = parseInt(damageInfo.split("/")[0]);
    if (damageMatch[0].startsWith("|-heal")) {
      //console.log("Healing", pokemonName, "for", remainingHp, "HP");
    }
  }

  // Update the remaining HP of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );

  if (pokemon) {
    pokemon.remainingHp = remainingHp;
  }

  // Update the remaining HP of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, remainingHp: remainingHp } : p
  );

  //console.log(pokemonName, "received", damageInfo, "damage");
}

// Process the effect of a status condition
function processStatus(actualTurn, statusMatch, turns, revealedPokemons) {
  const player = statusMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = statusMatch[2];
  const status = statusMatch[3];

  // Update the status of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, nonVolatileStatus: status } : p
  );

  // Update the status of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );
  
  if (pokemon) {
    pokemon.nonVolatileStatus = status;
  }
}

// Process the effect of a boost
function processBoost(actualTurn, boostMatch, turns, revealedPokemons) {
  const player = boostMatch[1].startsWith("p1") ? "player1" : "player2";
  const pokemonName = boostMatch[2];
  const statBoosted = boostMatch[3];
  const boost = parseInt(boostMatch[4]);

  // Update the boosts of the Pokémon in endsWith
  const pokemon = turns[actualTurn].endsWith[player].find(
    (p) => p && p.name === pokemonName
  );

  pokemon.stats[statBoosted] += boost;
  //console.log("new stats", pokemon.stats);

  // Update the boosts of the Pokémon in revealedPokemons
  revealedPokemons[player] = revealedPokemons[player].map((p) =>
    p.name === pokemonName ? { ...p, stats: pokemon.stats } : p
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
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    //console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //Initialize server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      //console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    //console.error("Error connecting to MongoDB: ", error);
  }
}

run().catch(console.dir);
