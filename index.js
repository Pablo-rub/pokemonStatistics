
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const uri = "mongodb+srv://pabloruar03:pokemonStadistics@pokemonstadistics.phu03.mongodb.net/?retryWrites=true&w=majority&appName=pokemonStadistics";

const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };

//Initialize the express app
const app = express();
app.use(express.json());

//Define the schema for the replays
const replaySchema = new mongoose.Schema({
    player1: {type: String, required: true},
    player2: {type: String, required: true},
    winner: {type: String, required: true},
    loser: {type: String, required: true},
    date: {type: Date, required: true},
    revealedPokemons: {
      player1: [{
          name: String,
          moves: [String],
          ability: String,
          item: String,
          remainingHp: Number
      }],
      player2: [{
          name: String,
          moves: [String],
          ability: String,
          item: String,
          remainingHp: Number
      }]
    },
    faintedPokemons: {
      player1: [{name: String, turnFainted: Number}],
      player2: [{name: String, turnFainted: Number}]
    },
    turns: [{
      turnNumber: {type: Number, required: true},
      activePokemons: {
        player1: [{
          name: String,
          moves: [String],
          ability: String,
          item: String,
          remainingHp: Number
        }],
        player2: [{
          name: String,
          moves: [String],
          ability: String,
          item: String,
          remainingHp: Number
        }]
      }
    }]
});

//Create the model for the replays
const Replay = mongoose.model('Replay', replaySchema);

app.post('/replays', async (req, res) => {
  const replayUrl = req.body.url;
  try {
    // Obtaining the data from the JSON file in the URL
    const response = await axios.get(`${replayUrl}.json`);
    const replayData = response.data;
    
    // Extracting the data from the replay
    const id = replayData.id;
    const format = replayData.format;
    const players = replayData.players;
    const log = replayData.log.split('\n');
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
    let revealedPokemons = {player1: [],player2: []};
    let faintedPokemons = {player1: [],player2: []};
    let turns = [];
    //console.log("Empty initial turns: ", turns);

    // Initialize the first turn
    let actualTurn = 0;
    turns.push({
      turnNumber: actualTurn,
      activePokemons: {
        player1: [],
        player2: []
      }
    });

    for (let line of log) {
      //console.log("Looking at line");

      // Detect new turn
      const turnMatch = line.match(/\|turn\|(\d+)/);
      if (turnMatch) {
        actualTurn = parseInt(turnMatch[1]);
        turns = processTurn(actualTurn, turns);
        console.log("Start of turn", turnMatch[1]);
      }
      
      // Detect active Pokémon switches and update revealed Pokémon if necessary
      const switchMatchesG = line.match(/\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, ([MF])\|)?(\d+)\/(\d+)/);
      const switchMatchesNG = line.match(/\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)\|(\d+)\/(\d+)/);
      
      let switchMatches = switchMatchesG || switchMatchesNG;
      if (switchMatches) {
        //console.log("Switch detected");
        const [newTurns, newRevealedPokemons] = processSwitch(actualTurn, switchMatches, turns, revealedPokemons);
        //console.log("Turn processed");
        revealedPokemons = newRevealedPokemons;
        turns = newTurns;
        //console.log("New active pokemons", newActivePokemons);
      }
/*
      // Detect the usage of an item in different formats
      const itemMatchActivate = line.match(/\|-activate\|(p1[ab]|p2[ab]): (.+?)\|item: (.+?)\|/);
      const itemMatchStatus = line.match(/\|-status\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);
      const itemMatchDamage = line.match(/\|-damage\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);
      const itemMatchEnd = line.match(/\|-enditem\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      const itemMatchBoost = line.match(/\|-boost\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);

      let itemMatch = itemMatchActivate || itemMatchStatus || itemMatchDamage || itemMatchEnd || itemMatchBoost;
      if (itemMatch) {
        const player = itemMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = itemMatch[2];
        const item = itemMatch[3];

        // Update the item of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name === pokemonName);
        if (pokemon && !pokemon.item) {
          pokemon.item = item;
        }

        activePokemons[player] = activePokemons[player].map(p => p && p.name === pokemonName ? { ...p, item: item } : p);
        revealedPokemons[player] = revealedPokemons[player].map(p => p.name === pokemonName ? { ...p, item: item } : p);
        //console.log(pokemonName, "used the item", item);
      }

      // Detect the usage of an ability
      let abilityMatch = line.match(/\|-ability\|(p1[ab]|p2[ab]): (.+)\|(.+)\|(.+)/);
      if (abilityMatch) {
        const player = abilityMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = abilityMatch[2];
        const ability = abilityMatch[3];
      
        // Update the ability of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name === pokemonName);
        if (pokemon) {
          pokemon.ability = ability;
          //console.log(pokemonName, "has the ability", ability);
        }

        // Update the ability of the Pokémon in revealedPokemons
        revealedPokemons[player] = revealedPokemons[player].map(p => 
          p.name === pokemonName ? { ...p, ability: ability } : p
        );
      }

      // Detect the usage of a move
      let moveMatch = line.match(/\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|(p1[ab]|p2[ab]): (.+)/);
      if (moveMatch) {
        const player = moveMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = moveMatch[2];
        const move = moveMatch[3];
        const target = moveMatch[5];
 
        // Update the moveset of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name === pokemonName);
        if (pokemon) {
          // Solo agrega el movimiento si no está ya en la lista
          if (!pokemon.moves.includes(move)) {
            pokemon.moves.push(move);
          }
          
          // También actualiza la lista de movimientos en revealedPokemons
          revealedPokemons[player] = revealedPokemons[player].map(p => p.name === pokemonName ? { ...p, moves: [...new Set([...p.moves, move])] } : p);
          //console.log(pokemonName, "used the move", move, "against", target);
        }
      }

      // Update the remaining HP of a Pokémon in each turn
      let damageMatch = line.match(/\|-damage\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      if (damageMatch) {
        const player = damageMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = damageMatch[2].trim().toLowerCase();
        let remainingHpInfo = damageMatch[3];
        let newHp;

        // Update the item of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name.toLowerCase() === pokemonName);
        if (pokemon) {
          if (remainingHpInfo.includes('/')) {
            let [hp, maxHp] = remainingHpInfo.split('/');
            newHp = parseInt(hp);
            pokemon.remainingHp = newHp;
          } else if (remainingHpInfo === '0 fnt') {
            newHp = 0;
            pokemon.remainingHp = newHp;
            faintedPokemons[player].push({ name: pokemonName, turnFainted: turnNumber });
          } else {
            //console.log("Error: remaining HP info not found");
          }
        }

        debugger;
        turns[turns.length - 1].activePokemons[player] = turns[turns.length - 1].activePokemons[player].map(p => p && p.name.toLowerCase() === pokemonName ? { ...p, remainingHp: newHp } : p);
        revealedPokemons[player] = revealedPokemons[player].map(p => p.name === pokemonName ? { ...p, remainingHp: newHp } : p);
        //console.log(pokemonName, "hp left", newHp);
      }
        */
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
      turns: turns
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
      activePokemons: {
        player1: [],
        player2: []
      }
    });
  } else {
    // Copy the active Pokémon from the previous turn
    const previousTurn = turns[actualTurn - 1];
    
    // Create a new object for the current turn
    turns.push({
      turnNumber: actualTurn,
      activePokemons: {
        player1: JSON.parse(JSON.stringify(previousTurn.activePokemons.player1)), // Deep copy
        player2: JSON.parse(JSON.stringify(previousTurn.activePokemons.player2))  // Deep copy
      }
    });
  }

  return turns;
}


// Process the switch of a Pokémon
function processSwitch(actualTurn, switchMatches, turns, revealedPokemons) {
  const player = switchMatches[1].startsWith('p1') ? 'player1' : 'player2';
  const pokemonName = switchMatches[2];
  //console.log(pokemonName, "entered the battle");
  const slot = switchMatches[1].endsWith('a') ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
  //console.log("In the slot", slot);

  // Add Pokémon to revealedPokemons if it hasn't been revealed yet
  const isRevealed = revealedPokemons[player].some(p => p.name === pokemonName);
  //console.log("Is revealed?", isRevealed);
  if (!isRevealed) {
    pokemon = {
      name: pokemonName,
      moves: [],
      ability: "",
      item: "",
      remainingHp: 100
    };

    revealedPokemons[player].push(pokemon);
    console.log(pokemonName, "was revealed");
  } else {
    // Load the info of the Pokémon
    pokemon = revealedPokemons[player].find(p => p.name === pokemonName);
    console.log("Pokemon loaded", pokemon);
  }

  // Update active Pokémons
  console.log(turns[actualTurn]);
  turns[actualTurn].activePokemons[player][slot] = pokemon;
  console.log("Active pokemons of turn", actualTurn, "updated", turns[actualTurn].activePokemons);

  return [turns, revealedPokemons];
}

// Obtain the winner of the match
function processWinner(log) {
  let winner = log.find(line => line.includes("|win|"));
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
