const express = require('express');
const router = express.Router();
const axios = require('axios');
const pokemonCacheService = require('./pokemonCacheService');
const cacheRepo = require('./cache/cacheRepository');

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

// NUEVO ENDPOINT OPTIMIZADO: Obtener lista de Pokémon con tipos (desde caché)
router.get('/pokemon', async (req, res) => {
    console.log('📡 GET /api/pokemon - Request received (CACHED)');
    console.log('Query params:', req.query);
    
    try {
        const limit = parseInt(req.query.limit) || 1025;
        const offset = parseInt(req.query.offset) || 0;
        const types = req.query.types; // Filtro opcional de tipos
        
        // Obtener todos los Pokémon del caché
        let allPokemon = await pokemonCacheService.getAllPokemon();
        
        console.log(`✅ Loaded ${allPokemon.length} Pokémon from cache`);
        
        // Filtrar por tipos si se especifica
        if (types) {
            const typeArray = types.split(',').map(t => t.toLowerCase());
            allPokemon = allPokemon.filter(pokemon => 
                pokemon.types && pokemon.types.some(t => 
                    typeArray.includes(t.name.toLowerCase())
                )
            );
            console.log(`🔍 Filtered to ${allPokemon.length} Pokémon by types: ${types}`);
        }
        
        // Ordenar por ID
        allPokemon.sort((a, b) => a.id - b.id);
        
        // Aplicar paginación
        const start = offset;
        const end = offset + limit;
        const paginatedPokemon = allPokemon.slice(start, end);
        
        // Formatear respuesta (compatible con el formato anterior)
        const formattedPokemon = paginatedPokemon.map(pokemon => ({
            id: pokemon.id,
            name: pokemon.name,
            displayName: pokemon.displayName,
            sprite: pokemon.sprite,
            spriteShiny: pokemon.spriteShiny,
            officialArtwork: pokemon.officialArtwork,
            types: pokemon.types
        }));
        
        res.json({
            count: allPokemon.length,
            pokemon: formattedPokemon,
            cached: true,
            cacheStats: pokemonCacheService.getStats()
        });
        
    } catch (error) {
        console.error("❌ Error fetching Pokémon list:", error.message);
        res.status(500).json({ 
            error: "Error fetching Pokémon list",
            message: error.message
        });
    }
});

// Endpoint para obtener detalles de un Pokémon específico (desde caché)
router.get('/pokemon/:idOrName', async (req, res) => {
    try {
        const { idOrName } = req.params;
        console.log(`📡 GET /api/pokemon/${idOrName} (from cache)`);
        
        // Intentar obtener del caché primero
        let pokemon = await pokemonCacheService.getPokemon(idOrName);
        
        // Si no está en caché, obtener de PokeAPI directamente
        if (!pokemon) {
            console.log(`⚠️ Pokemon ${idOrName} not in cache, fetching from PokeAPI`);
            const response = await axios.get(
                `https://pokeapi.co/api/v2/pokemon/${idOrName.toLowerCase()}`
            );
            const data = response.data;
            
            pokemon = {
                id: data.id,
                name: data.name,
                displayName: data.name
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                height: data.height,
                weight: data.weight,
                types: data.types.map(t => ({
                    slot: t.slot,
                    name: t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)
                })),
                abilities: data.abilities.map(a => ({
                    name: a.ability.name
                        .split('-')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' '),
                    isHidden: a.is_hidden,
                    slot: a.slot
                })),
                stats: data.stats.map(s => ({
                    name: s.stat.name,
                    baseStat: s.base_stat,
                    effort: s.effort
                })),
                sprites: {
                    default: data.sprites.front_default,
                    shiny: data.sprites.front_shiny,
                    officialArtwork: data.sprites.other['official-artwork'].front_default
                }
            };
        }
        
        res.json(pokemon);
    } catch (error) {
        console.error(`❌ Error fetching Pokémon ${req.params.idOrName}:`, error.message);
        res.status(error.response?.status || 500).json({
            error: `Error fetching Pokémon details`,
            message: error.message
        });
    }
});

// NUEVO ENDPOINT: Forzar actualización del caché (admin/debug)
router.post('/pokemon-cache/refresh', async (req, res) => {
    try {
        console.log('🔄 Manual cache refresh requested');
        const result = await pokemonCacheService.updateCache();
        res.json({ 
            message: result.success ? 'Cache updated successfully' : 'Cache update incomplete',
            result,
            stats: pokemonCacheService.getStats()
        });
    } catch (error) {
        console.error('❌ Error refreshing cache:', error);
        res.status(500).json({ 
            error: 'Failed to refresh cache',
            message: error.message 
        });
    }
});

// NUEVO ENDPOINT: Obtener estadísticas del caché
router.get('/pokemon-cache/stats', (req, res) => {
    const stats = pokemonCacheService.getStats();
    res.json({
        ...stats,
        lastUpdateFormatted: stats.lastUpdate 
            ? new Date(stats.lastUpdate).toLocaleString() 
            : 'Never',
        // ✅ NUEVO: Advertencias si el caché está incompleto
        warnings: stats.isComplete ? [] : [
            `Cache is incomplete: ${stats.count}/${stats.expected} Pokemon (${stats.completionPercentage}%)`,
            'Consider running POST /api/pokemon-cache/refresh'
        ],
        status: stats.isUpdating ? 'updating' : 'ready'
    });
});

// NUEVO ENDPOINT: Check repo connectivity (GCS/Redis/File) - MEJORADO
router.get('/pokemon-cache/check', async (req, res) => {
    try {
        const repoName = cacheRepo.repoName || 'unknown';
        
        // Environment info
        const envInfo = {
            GCS_BUCKET: process.env.GCS_BUCKET || 'NOT_SET',
            REDIS_URL: process.env.REDIS_URL ? 'SET (hidden)' : 'NOT_SET',
            NODE_ENV: process.env.NODE_ENV || 'development',
            platform: process.env.K_SERVICE ? 'Cloud Run' : 'Local'
        };
        
        // Check repo health
        let checkResult = await cacheRepo.check().catch(e => ({ 
            ok: false, 
            message: e.message 
        }));

        // Check if data exists
        const loaded = await cacheRepo.load().catch(e => null);
        const hasData = loaded && loaded.count ? true : false;
        
        // Cache stats
        const cacheStats = pokemonCacheService.getStats();
        
        // Build response with detailed diagnostics
        const response = {
            timestamp: new Date().toISOString(),
            repository: {
                type: repoName,
                configured: repoName !== 'file' || process.env.GCS_BUCKET || process.env.REDIS_URL,
                health: checkResult
            },
            environment: envInfo,
            cache: {
                hasData,
                dataCount: loaded ? loaded.count : 0,
                dataTimestamp: loaded ? new Date(loaded.timestamp).toISOString() : null,
                stats: cacheStats
            },
            recommendations: []
        };
        
        // Add recommendations based on status
        if (repoName === 'file' && process.env.NODE_ENV === 'production') {
            response.recommendations.push({
                level: 'warning',
                message: 'Using local file cache in production. This is ephemeral on Cloud Run.',
                action: 'Set GCS_BUCKET=pokemon-statistics-cache environment variable in Cloud Run',
                command: 'Run: ./scripts/configure-cloud-run.ps1'
            });
        }
        
        if (repoName === 'gcs' && !checkResult.ok) {
            response.recommendations.push({
                level: 'error',
                message: 'GCS bucket configured but not accessible',
                action: 'Verify service account permissions and bucket existence',
                commands: [
                    'gcloud storage buckets describe gs://pokemon-statistics-cache',
                    'gcloud storage buckets add-iam-policy-binding gs://pokemon-statistics-cache --member="serviceAccount:pokemon-statistics@pokemon-statistics.iam.gserviceaccount.com" --role="roles/storage.objectAdmin"'
                ]
            });
        }
        
        if (!hasData && cacheStats.count === 0) {
            response.recommendations.push({
                level: 'info',
                message: 'Cache is empty. Trigger initial population.',
                action: 'POST /api/pokemon-cache/refresh to populate cache',
                note: 'This will take ~30-60 seconds to fetch all 1025 Pokemon from PokeAPI'
            });
        }
        
        res.json(response);
    } catch (err) {
        res.status(500).json({ 
            ok: false, 
            message: err.message,
            timestamp: new Date().toISOString()
        });
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