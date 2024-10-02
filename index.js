
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
    pokemonsRevealed: {
      player1: [{
          name: String,
          moves: [String],              // Movimientos disponibles
          ability: String,              // Habilidad del Pokémon
          item: String,                 // Objeto que lleva equipado
          remainingHp: Number           // Vida restante
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
          remainingHp: Number,
          status: String,
          statsChanges: {
            attack: Number,
            defense: Number,
            specialAttack: Number,
            specialDefense: Number,
            speed: Number,
            accuracy: Number,
            evasion: Number
          }
        }],
        player2: [{
          name: String,
          moves: [String],
          ability: String,
          item: String,
          remainingHp: Number,
          status: String,
          statsChanges: {
            attack: Number,
            defense: Number,
            specialAttack: Number,
            specialDefense: Number,
            speed: Number,
            accuracy: Number,
            evasion: Number
          }
        }]
      },
      events: [{
        player: {type: String, required: true},
        event: {type: String, required: true},
        pokemon: {type: String},
        move: {type: String},
        target: {type: String},
        damage: {type: Number},
        status: {type: String},
        statsChanges: {
          attack: Number,
          defense: Number,
          specialAttack: Number,
          specialDefense: Number,
          speed: Number,
          accuracy: Number,
          evasion: Number
        },
        item: {type: String},
        ability: {type: String},
        weather: {
          type: String,
          duration: Number
        },
        field: {
          type: String,
          duration: Number
        }
      }]
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
    const [player1, player2] = replayData.players;
    const pokemonsRevealed = {
      player1: [],
      player2: []
    };
    const faintedPokemons = {
      player1: [],
      player2: []
    };

    const turns = []; 
    const log = replayData.log.split('\n');
    let turnNumber = 1;
    let winnerMatch;
    let activePokemons = {
      player1: [null, null],
      player2: [null, null]
    };

    for (let line of log) {
      // Detect the winner
      let match = line.match(/win\|(.+)/);
      if (match) {
        winnerMatch = match[1];
        break;
      }
            
      // Detect active Pokémon switches and update revealed Pokémon if necessary
      const switchMatchesG = line.match(/\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)(?:, ([MF])\|)?(\d+)\/(\d+)/);
      const switchMatchesNG = line.match(/\|switch\|(p1[ab]|p2[ab]): (.+)\|(.+?), L(\d+)\|(\d+)\/(\d+)/);
      
      let switchMatches = switchMatchesG || switchMatchesNG;
      if (switchMatches) {
        const player = switchMatches[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = switchMatches[2]; // Pokémon name
        const remainingHp = parseInt(switchMatches[6]); // Remaining HP
            
        // Assign to the correct slot in the activePokemons array
        const slot = switchMatches[1].endsWith('a') ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
            
        const pokemon = {
          name: pokemonName,
          moves: [], // You can update this if the moves are available elsewhere in the log
          ability: "", // You can update this if the ability is available
          item: "", // You can update this if the item is available
          remainingHp: remainingHp
        };

        // Update active Pokémon
        activePokemons[player][slot] = pokemon;

        // Add Pokémon to pokemonsRevealed if it hasn't been revealed yet
        const isRevealed = pokemonsRevealed[player].some(p => p.name === pokemonName);
        if (!isRevealed) {
          pokemonsRevealed[player].push(pokemon);
        }
      }

      // Detect new turn
      const turnMatch = line.match(/\|turn\|(\d+)/);
      if (turnMatch) {
        turnNumber = parseInt(turnMatch[1]);

        // Create a new object for the turn if it doesn't exist
        turns.push({
          turnNumber: turnNumber,
          activePokemons: {
            player1: [...activePokemons.player1],
            player2: [...activePokemons.player2]
          },
          events: [] // You can capture additional events if necessary
        });
      }

      // Detect fainted Pokémon
      const faintedMatch = line.match(/\|faint\|(p1[ab]|p2[ab]): (.+)/);
      if (faintedMatch) {
        const player = faintedMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = faintedMatch[2];
        const slot = faintedMatch[1].endsWith('a') ? 0 : 1;

        // Update activePokemons
        activePokemons[player][slot] = null;

        // Update faintedPokemons
        faintedPokemons[player].push({name: pokemonName, turnFainted: turnNumber});
      }

      // Detect the usage of an item in different formats
      const itemMatchActivate = line.match(/\|-activate\|(p1[ab]|p2[ab]): (.+?)\|item: (.+?)\|/);
      const itemMatchStatus = line.match(/\|-status\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);
      const itemMatchDamage = line.match(/\|-damage\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);
      const itemMatchEnd = line.match(/\|-enditem\|(p1[ab]|p2[ab]): (.+?)\|(.+)/);
      const itemMatchBoost = line.match(/\|-boost\|(p1[ab]|p2[ab]): (.+?)\|.+?\[from\] item: (.+)/);

      let itemMatch = itemMatchActivate || itemMatchStatus || itemMatchDamage || itemMatchEnd || itemMatchBoost;
      if (itemMatch) {
        console.log(itemMatch);
        const player = itemMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = itemMatch[2];
        const item = itemMatch[3];

        // Update the item of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name === pokemonName);
        if (pokemon && !pokemon.item) {
          pokemon.item = item;
        }

        activePokemons[player] = activePokemons[player].map(p => p && p.name === pokemonName ? { ...p, item: item } : p);
        pokemonsRevealed[player] = pokemonsRevealed[player].map(p => p.name === pokemonName ? { ...p, item: item } : p);
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
        }

        // Update the ability of the Pokémon in pokemonsRevealed
        pokemonsRevealed[player] = pokemonsRevealed[player].map(p => 
          p.name === pokemonName ? { ...p, ability: ability } : p
        );
      }

      // Detect the usage of a move
      let moveMatch = line.match(/\|move\|(p1[ab]|p2[ab]): (.+)\|(.+?)\|(p1[ab]|p2[ab]): (.+)/);
      if (moveMatch) {
        const player = moveMatch[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = moveMatch[2];
        const move = moveMatch[3];
        const target = moveMatch[4];
 
        // Update the moveset of the Pokémon
        const pokemon = activePokemons[player].find(p => p && p.name === pokemonName);
        if (pokemon) {
          // Solo agrega el movimiento si no está ya en la lista
          if (!pokemon.moves.includes(move)) {
            pokemon.moves.push(move);
          }

          // También actualiza la lista de movimientos en pokemonsRevealed
          pokemonsRevealed[player] = pokemonsRevealed[player].map(p => p.name === pokemonName ? { ...p, moves: [...new Set([...p.moves, move])] } : p);
        }
      }
    }

    // Create the new entry in the database
    const newReplay = new Replay({
      player1,
      player2,
      winner: winnerMatch.trim(),
      loser: winnerMatch.trim() === player1 ? player2 : player1,
      date: new Date(replayData.uploadtime * 1000),
      pokemonsRevealed,
      faintedPokemons,
      turns
    });

    await newReplay.save();
    res.status(201).send(newReplay);

  } catch (error) {
    console.error("Error obtaining the data from the replay: ", error);
    res.status(400).send(error);
  }
});

async function run() {
  try {
    // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    //Initialize server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Error connecting to MongoDB: ", error);
  }
}

run().catch(console.dir);
