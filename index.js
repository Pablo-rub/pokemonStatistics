
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
    turns: [{
      turnNumber: {type: Number, required: true},
      pokemonRevealed: {
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
      activePokemon: {
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
      faintedPokemon: {
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
        },
        terrain: {
          type: String,
          duration: Number
        },
        trickRoom: {
          duration: Number
        },
        tailwind: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        reflect: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        lightScreen: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        auroraVeil: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        safeguard: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        mist: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        spikes: {
          player1: {
            layers: Number
          },
          player2: {
            layers: Number
          }
        },
        toxicSpikes: {
          player1: {
            layers: Number
          },
          player2: {
            layers: Number
          }
        },
        stealthRock: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        stickyWeb: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        leechSeed: {
          player1: {
            amount: Number
          },
          player2: {
            amount: Number
          }
        },
        substitute: {
          player1: {
            hp: Number
          },
          player2: {
            hp: Number
          }
        },
        wish: {
          player1: {
            amount: Number
          },
          player2: {
            amount: Number
          }
        },
        futureSight: {
          player1: {
            damage: Number
          },
          player2: {
            damage: Number
          }
        },
        doomDesire: {
          player1: {
            damage: Number
          },
          player2: {
            damage: Number
          }
        },
        reflectType: {
          player1: {
            type: String
          },
          player2: {
            type: String
          }
        },
        transform: {
          player1: {
            pokemon: String
          },
          player2: {
            pokemon: String
          }
        },
        imposter: {
          player1: {
            pokemon: String
          },
          player2: {
            pokemon: String
          }
        },
        powerTrick: {
          player1: {
            pokemon: String
          },
          player2: {
            pokemon: String
          }
        },
        healBlock: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        embargo: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        torment: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        encore: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        disable: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        taunt: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        heal: {
          player1: {
            amount: Number
          },
          player2: {
            amount: Number
          }
        },
        wish: {
          player1: {
            amount: Number
          },
          player2: {
            amount: Number
          }
        },
        ingrain: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        aquaRing: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        magnetRise: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        telekinesis: {
          player1: {
            duration: Number
          },
          player2: {
            duration: Number
          }
        },
        magicRoom: {
          duration: Number
        },
        wonderRoom: {
          duration: Number
        },
        gravity: {
          duration: Number
        }
      }]
    }]
});

//Create the model for the replays
const Replay = mongoose.model('Replay', replaySchema);

//Path to save the replay
app.post('/replays', async (req, res) => {
    const replayUrl = req.body.url;
    try {
        //Obtaining the data from the JSON file in the URL
        const response = await axios.get(`${replayUrl}.json`);
        const replayData = response.data;

        //Extracting the data from the replay
        const [player1, player2] = replayData.players;
        const turns = []; 
        const log = replayData.log;
        let turnNumber = 1;

        for (let line of log) {
          const winMatch = line.match(/\|win\|([^\|]+)/);
          const turnMatch = line.match(/(\d+):/);

          if (turnMatch) {
            turnNumber = parseInt(turnMatch[1]);
            if (!turns[turnNumber - 1]) {
              turns[turnNumber - 1] = {
                turnNumber: turnNumber,
                pokemonRevealed: {
                  player1: [],
                  player2: []
                },
                activePokemon: {
                  player1: [],
                  player2: []
                },
                events: []
              };
            }
          }

          //Extract events and update turns
          if (line.includes('|switch|')) {
            const switchMatch = line.match(/\|switch\|([^\|]+)\|([^\|]+)\|/);
            if (switchMatch) {
              const player = switchMatch[1] === player1 ? 'player1' : 'player2';
              const pokemon = switchMatch[2];
              turns [turnNumber - 1].activePokemon[player].push({
                name: pokemon,
                moves: [],
                ability: '',
                item: '',
                remainingHp: 100
              });
            }
          }

          //Capture fainted events
          if (line.includes('|faint|')) {
            const faintMatch = line.match(/\|faint\|([^\|]+)\|([^\|]+)\|/);
            if (faintMatch) {
                const player = faintMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = faintMatch[2];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'faint',
                    pokemon: pokemon
                });
            }
          }

          //Capture move events
          if (line.includes('|move|')) {
            const moveMatch = line.match(/\|move\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (moveMatch) {
                const player = moveMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = moveMatch[2];
                const move = moveMatch[3];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'move',
                    pokemon: pokemon,
                    move: move
                });
            }
          }

          //Capture status events
          if (line.includes('|status|')) {
            const statusMatch = line.match(/\|status\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (statusMatch) {
                const player = statusMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = statusMatch[2];
                const status = statusMatch[3];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'status',
                    pokemon: pokemon,
                    status: status
                });
            }
          }

          //Capture stats changes events
          if (line.includes('|-boost|')) {
            const boostMatch = line.match(/\|-boost\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (boostMatch) {
                const player = boostMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = boostMatch[2];
                const stat = boostMatch[3];
                const boost = parseInt(boostMatch[4]);
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'boost',
                    pokemon: pokemon,
                    stat: stat,
                    boost: boost
                });
            }
          }

          //Capture damage events
          if (line.includes('|-damage|')) {
            const damageMatch = line.match(/\|-damage\|([^\|]+)\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (damageMatch) {
                const player = damageMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = damageMatch[2];
                const damage = parseInt(damageMatch[3]);
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'damage',
                    pokemon: pokemon,
                    damage: damage
                });
            }
          }

          //Capture item events
          if (line.includes('|-item|')) {
            const itemMatch = line.match(/\|-item\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (itemMatch) {
                const player = itemMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = itemMatch[2];
                const item = itemMatch[3];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'item',
                    pokemon: pokemon,
                    item: item
                });
            }
          }

          //Capture ability events
          if (line.includes('|-ability|')) {
            const abilityMatch = line.match(/\|-ability\|([^\|]+)\|([^\|]+)\|([^\|]+)\|/);
            if (abilityMatch) {
                const player = abilityMatch[1] === player1 ? 'player1' : 'player2';
                const pokemon = abilityMatch[2];
                const ability = abilityMatch[3];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'ability',
                    pokemon: pokemon,
                    ability: ability
                });
            }
          }

          //Capture weather events
          if (line.includes('|-weather|')) {
            const weatherMatch = line.match(/\|-weather\|([^\|]+)\|([^\|]+)\|/);
            if (weatherMatch) {
                const player = weatherMatch[1] === player1 ? 'player1' : 'player2';
                const weather = weatherMatch[2];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'weather',
                    weather: weather
                });
            }
          }

          //Capture field events
          if (line.includes('|-field|')) {
            const fieldMatch = line.match(/\|-field\|([^\|]+)\|([^\|]+)\|/);
            if (fieldMatch) {
                const player = fieldMatch[1] === player1 ? 'player1' : 'player2';
                const field = fieldMatch[2];
                turns[turnNumber - 1].events.push({
                    player: player,
                    event: 'field',
                    field: field
                });
            }
          }
        }

        //Creating the new entry in the database
        const newReplay = new Replay({
          player1,
          player2,
          winner: winMatch ? winMatch[1] : null,
          loser: winMatch ? (winMatch[1] === player1 ? player2 : player1) : null,
          date: new Date(replayData.uploadTime * 1000),
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
