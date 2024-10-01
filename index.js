
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
      faintedPokemons: {
        player1: [{
          name: String,
          turnFainted: Number
        }],
        player2: [{
          name: String,
          turnFainted: Number
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
      if (switchMatchesG) {
        const player = switchMatchesG[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = switchMatchesG[2]; // Pokémon name
        const remainingHp = parseInt(switchMatchesG[6]); // Remaining HP
            
        // Assign to the correct slot in the activePokemons array
        const slot = switchMatchesG[1].endsWith('a') ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
            
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
      } else if (switchMatchesNG) {
        const player = switchMatchesNG[1].startsWith('p1') ? 'player1' : 'player2';
        const pokemonName = switchMatchesNG[2]; // Pokémon name
        const remainingHp = parseInt(switchMatchesNG[6]); // Remaining HP
            
        // Assign to the correct slot in the activePokemons array
        const slot = switchMatchesNG[1].endsWith('a') ? 0 : 1; // 'a' -> slot 0, 'b' -> slot 1
            
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

      // Optionally: Capture other events like moves, damage, etc. here
    }

    // Create the new entry in the database
    const newReplay = new Replay({
      player1,
      player2,
      winner: winnerMatch.trim(),
      loser: winnerMatch.trim() === player1 ? player2 : player1,
      date: new Date(replayData.uploadtime * 1000),
      pokemonsRevealed,
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
