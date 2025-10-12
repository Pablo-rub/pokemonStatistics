const express = require('express');
const router = express.Router();
const axios = require('axios');

// Endpoint para obtener la lista de ítems (items)
router.get('/items', async (req, res) => {
    try {
        // Consulta PokeAPI para obtener hasta 1000 ítems (ajusta el limit según sea necesario)
        const response = await axios.get('https://pokeapi.co/api/v2/item?limit=10000');
        const items = response.data.results.map(item => ({
        // Formateamos el nombre para que aparezca con mayúsculas en cada palabra
        name: item.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: item.url
        }));
        res.json(items);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Error fetching items");
    }
});

// Endpoint para obtener la lista de habilidades (abilities)
router.get('/abilities', async (req, res) => {
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/ability?limit=1000');
        const abilities = response.data.results.map(ability => ({
        name: ability.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: ability.url
        }));
        res.json(abilities);
    } catch (error) {
        console.error("Error fetching abilities:", error);
        res.status(500).send("Error fetching abilities");
    }
});

// Endpoint para obtener la lista de movimientos (moves)
router.get('/moves', async (req, res) => {
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/move?limit=1000');
        const moves = response.data.results.map(move => ({
        name: move.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: move.url
        }));
        res.json(moves);
    } catch (error) {
        console.error("Error fetching moves:", error);
        res.status(500).send("Error fetching moves");
    }
});

// Endpoint para obtener la lista de Pokémon
router.get('/pokemon', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1025; // Gen 1-9
        const offset = parseInt(req.query.offset) || 0;
        
        // Obtener lista básica de Pokémon
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
        
        // Formatear los datos para incluir información útil
        const pokemon = response.data.results.map((mon, index) => {
            // Extraer el ID del URL
            const id = mon.url.split('/').filter(Boolean).pop();
            
            return {
                id: parseInt(id),
                name: mon.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('-'),
                displayName: mon.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
                spriteShiny: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`,
                officialArtwork: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
            };
        });
        
        res.json({
            count: response.data.count,
            pokemon: pokemon
        });
    } catch (error) {
        console.error("Error fetching Pokémon list:", error);
        res.status(500).send("Error fetching Pokémon list");
    }
});

// Endpoint para obtener detalles de un Pokémon específico
router.get('/pokemon/:idOrName', async (req, res) => {
    try {
        const { idOrName } = req.params;
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName.toLowerCase()}`);
        
        const pokemon = response.data;
        
        // Formatear datos relevantes
        const formattedData = {
            id: pokemon.id,
            name: pokemon.name,
            displayName: pokemon.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            height: pokemon.height,
            weight: pokemon.weight,
            types: pokemon.types.map(t => ({
                slot: t.slot,
                name: t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)
            })),
            abilities: pokemon.abilities.map(a => ({
                name: a.ability.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                isHidden: a.is_hidden,
                slot: a.slot
            })),
            stats: pokemon.stats.map(s => ({
                name: s.stat.name,
                baseStat: s.base_stat,
                effort: s.effort
            })),
            sprites: {
                default: pokemon.sprites.front_default,
                shiny: pokemon.sprites.front_shiny,
                officialArtwork: pokemon.sprites.other['official-artwork'].front_default
            }
        };
        
        res.json(formattedData);
    } catch (error) {
        console.error(`Error fetching Pokémon ${req.params.idOrName}:`, error.message);
        res.status(error.response?.status || 500).send(`Error fetching Pokémon details`);
    }
});

module.exports = router;