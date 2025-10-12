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

// Endpoint para obtener la lista de Pokémon (sin Mega Evoluciones)
router.get('/pokemon', async (req, res) => {
    console.log('Query params:', req.query);
    
    try {
        const limit = parseInt(req.query.limit) || 1025; // Gen 1-9
        const offset = parseInt(req.query.offset) || 0;
        
        console.log(`Fetching ${limit} Pokémon from PokeAPI (offset: ${offset})`);
        
        // Obtener lista básica de Pokémon (solo formas base)
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
        
        console.log(`✅ Successfully fetched ${pokemon.length} Pokémon`);
        
        res.json({
            count: response.data.count,
            pokemon: pokemon
        });
    } catch (error) {
        console.error("❌ Error fetching Pokémon list:", error.message);
        res.status(500).json({ 
            error: "Error fetching Pokémon list",
            message: error.message 
        });
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

// Nuevo endpoint para obtener todas las formas/varieties de un Pokémon
router.get('/pokemon-species/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching species data for: ${id}`);
        
        // Obtener la species (contiene info de varieties)
        const speciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
        const species = speciesResponse.data;
        
        // Obtener todas las variedades (formas alternativas)
        const varieties = await Promise.all(
            species.varieties.map(async (variety) => {
                try {
                    // Obtener datos detallados de cada forma
                    const varResponse = await axios.get(variety.pokemon.url);
                    const varData = varResponse.data;
                    
                    // Determinar el tipo de forma
                    let formType = 'default';
                    const formName = variety.pokemon.name.toLowerCase();
                    
                    if (formName.includes('-mega')) {
                        formType = 'mega';
                    } else if (formName.includes('-gmax') || formName.includes('-gigantamax')) {
                        formType = 'gigantamax';
                    } else if (formName.includes('-alola')) {
                        formType = 'alola';
                    } else if (formName.includes('-galar')) {
                        formType = 'galar';
                    } else if (formName.includes('-hisui')) {
                        formType = 'hisui';
                    } else if (formName.includes('-paldea')) {
                        formType = 'paldea';
                    } else if (formName.includes('-primal')) {
                        formType = 'primal';
                    } else if (!variety.is_default) {
                        formType = 'alternate';
                    }
                    
                    return {
                        id: varData.id,
                        name: variety.pokemon.name,
                        displayName: variety.pokemon.name
                            .split('-')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' '),
                        isDefault: variety.is_default,
                        formType: formType,
                        types: varData.types.map(t => ({
                            slot: t.slot,
                            name: t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)
                        })),
                        stats: varData.stats.map(s => ({
                            name: s.stat.name,
                            baseStat: s.base_stat,
                            effort: s.effort
                        })),
                        abilities: varData.abilities.map(a => ({
                            name: a.ability.name
                                .split('-')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' '),
                            isHidden: a.is_hidden,
                            slot: a.slot
                        })),
                        height: varData.height,
                        weight: varData.weight,
                        sprites: {
                            default: varData.sprites.front_default,
                            shiny: varData.sprites.front_shiny,
                            officialArtwork: varData.sprites.other?.['official-artwork']?.front_default || varData.sprites.front_default
                        }
                    };
                } catch (err) {
                    console.error(`Error fetching variety ${variety.pokemon.name}:`, err.message);
                    return null;
                }
            })
        );
        
        // Filtrar nulls y ordenar: default primero, luego por tipo
        const sortedVarieties = varieties
            .filter(v => v !== null)
            .sort((a, b) => {
                if (a.isDefault) return -1;
                if (b.isDefault) return 1;
                
                // Orden de preferencia de tipos
                const typeOrder = ['mega', 'primal', 'gigantamax', 'alola', 'galar', 'hisui', 'paldea', 'alternate'];
                return typeOrder.indexOf(a.formType) - typeOrder.indexOf(b.formType);
            });
        
        res.json({
            speciesId: species.id,
            name: species.name,
            displayName: species.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            varieties: sortedVarieties,
            generation: species.generation.name,
            isLegendary: species.is_legendary,
            isMythical: species.is_mythical
        });
    } catch (error) {
        console.error(`Error fetching species ${req.params.id}:`, error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Error fetching Pokémon species',
            message: error.message 
        });
    }
});

module.exports = router;