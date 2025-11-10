const express = require('express');
const router = express.Router();
const bigQuery = require('../db/bigquery');
const pokemonCacheService = require('./pokemonCacheService');
const smogonStatsService = require('./smogonStatsService');

/**
 * Team Builder Service
 * Proporciona sugerencias y análisis de equipos basándose en:
 * - Composición actual del equipo
 * - Formato/regulación seleccionada
 * - Estadísticas de uso y sinergias del meta
 * 
 * OPTIMIZACIÓN: Usa Smogon Stats en lugar de BigQuery para mayor velocidad
 */

// Tipos de Pokémon y sus relaciones
const TYPE_CHART = {
  normal: { weaknesses: ['fighting'], resistances: [], immunities: ['ghost'] },
  fire: { weaknesses: ['water', 'ground', 'rock'], resistances: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immunities: [] },
  water: { weaknesses: ['electric', 'grass'], resistances: ['fire', 'water', 'ice', 'steel'], immunities: [] },
  electric: { weaknesses: ['ground'], resistances: ['electric', 'flying', 'steel'], immunities: [] },
  grass: { weaknesses: ['fire', 'ice', 'poison', 'flying', 'bug'], resistances: ['water', 'electric', 'grass', 'ground'], immunities: [] },
  ice: { weaknesses: ['fire', 'fighting', 'rock', 'steel'], resistances: ['ice'], immunities: [] },
  fighting: { weaknesses: ['flying', 'psychic', 'fairy'], resistances: ['bug', 'rock', 'dark'], immunities: [] },
  poison: { weaknesses: ['ground', 'psychic'], resistances: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immunities: [] },
  ground: { weaknesses: ['water', 'grass', 'ice'], resistances: ['poison', 'rock'], immunities: ['electric'] },
  flying: { weaknesses: ['electric', 'ice', 'rock'], resistances: ['grass', 'fighting', 'bug'], immunities: ['ground'] },
  psychic: { weaknesses: ['bug', 'ghost', 'dark'], resistances: ['fighting', 'psychic'], immunities: [] },
  bug: { weaknesses: ['fire', 'flying', 'rock'], resistances: ['grass', 'fighting', 'ground'], immunities: [] },
  rock: { weaknesses: ['water', 'grass', 'fighting', 'ground', 'steel'], resistances: ['normal', 'fire', 'poison', 'flying'], immunities: [] },
  ghost: { weaknesses: ['ghost', 'dark'], resistances: ['poison', 'bug'], immunities: ['normal', 'fighting'] },
  dragon: { weaknesses: ['ice', 'dragon', 'fairy'], resistances: ['fire', 'water', 'electric', 'grass'], immunities: [] },
  dark: { weaknesses: ['fighting', 'bug', 'fairy'], resistances: ['ghost', 'dark'], immunities: ['psychic'] },
  steel: { weaknesses: ['fire', 'fighting', 'ground'], resistances: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immunities: ['poison'] },
  fairy: { weaknesses: ['poison', 'steel'], resistances: ['fighting', 'bug', 'dark'], immunities: ['dragon'] }
};

/**
 * Obtener Pokémon disponibles en un formato específico
 * OPTIMIZADO: Usa exclusivamente Smogon Stats (NO requiere BigQuery)
 */
router.get('/available-pokemon', async (req, res) => {
  try {
    const { format } = req.query;

    if (!format) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    console.log(`📊 Fetching available Pokémon for format: ${format}`);
    console.log('   Strategy: Smogon Stats (primary and only)');

    // Obtener desde Smogon Stats
    const smogonPokemon = await smogonStatsService.getPokemonForFormat(format);
    
    if (!smogonPokemon || smogonPokemon.length === 0) {
      console.warn(`⚠️ No Pokémon found for format: ${format}`);
      return res.json({
        format,
        count: 0,
        pokemon: [],
        source: 'smogon',
        message: 'No data available for this format yet. Try a more common format like gen9vgc2025reggbo3'
      });
    }

    // Enriquecer con datos del caché local (tipos, sprites, stats)
    const pokemonDetails = await Promise.all(
      smogonPokemon.map(async (smogonData) => {
        const pokemon = await pokemonCacheService.getPokemon(smogonData.name);
        return pokemon ? {
          ...pokemon,
          usagePercent: smogonData.usagePercent,
          usageRank: smogonData.rank,
          source: 'smogon'
        } : null;
      })
    );

    // Filtrar nulls y ordenar por ranking
    const availablePokemon = pokemonDetails
      .filter(p => p !== null)
      .sort((a, b) => a.usageRank - b.usageRank);

    console.log(`✅ Found ${availablePokemon.length} Pokémon from Smogon`);

    return res.json({
      format,
      count: availablePokemon.length,
      pokemon: availablePokemon,
      source: 'smogon',
      cached: true
    });

  } catch (error) {
    console.error('❌ Error fetching available Pokémon:', error);
    
    // Respuesta de error más informativa
    const errorMessage = error.message.includes('404') 
      ? 'Format not found in Smogon Stats. Please verify the format name.'
      : error.message;

    res.status(500).json({ 
      error: 'Error fetching available Pokémon',
      message: errorMessage,
      format: req.query.format,
      suggestion: 'Try formats like: gen9vgc2025reggbo3, gen9ou, gen9doublesou'
    });
  }
});

/**
 * Analizar cobertura de tipos del equipo actual
 */
function analyzeTeamCoverage(team) {
  const teamTypes = new Set();
  const teamWeaknesses = {};
  const teamResistances = {};
  const teamImmunities = {};

  // Recopilar todos los tipos del equipo
  team.forEach(pokemon => {
    if (pokemon.types) {
      pokemon.types.forEach(typeObj => {
        const typeName = typeObj.name.toLowerCase();
        teamTypes.add(typeName);
      });
    }
  });

  // Calcular debilidades, resistencias e inmunidades del equipo
  const allTypes = Object.keys(TYPE_CHART);
  
  allTypes.forEach(attackingType => {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;

    team.forEach(pokemon => {
      if (!pokemon.types) return;

      const pokemonTypes = pokemon.types.map(t => t.name.toLowerCase());
      let effectiveness = 1;

      pokemonTypes.forEach(defenseType => {
        const typeData = TYPE_CHART[defenseType];
        if (!typeData) return;

        if (typeData.immunities.includes(attackingType)) {
          effectiveness = 0;
        } else if (typeData.weaknesses.includes(attackingType)) {
          effectiveness *= 2;
        } else if (typeData.resistances.includes(attackingType)) {
          effectiveness *= 0.5;
        }
      });

      if (effectiveness === 0) immuneCount++;
      else if (effectiveness > 1) weakCount++;
      else if (effectiveness < 1) resistCount++;
    });

    if (weakCount > 0) teamWeaknesses[attackingType] = weakCount;
    if (resistCount > 0) teamResistances[attackingType] = resistCount;
    if (immuneCount > 0) teamImmunities[attackingType] = immuneCount;
  });

  return {
    types: Array.from(teamTypes),
    weaknesses: teamWeaknesses,
    resistances: teamResistances,
    immunities: teamImmunities
  };
}

/**
 * Sugerir Pokémon para completar el equipo (< 6)
 */
router.post('/suggest-pokemon', async (req, res) => {
  try {
    const { team, format, limit = 10 } = req.body;

    if (!team || !Array.isArray(team)) {
      return res.status(400).json({ error: 'Team array is required' });
    }

    if (team.length >= 6) {
      return res.status(400).json({ error: 'Team is already complete (6 Pokémon)' });
    }

    console.log(`💡 Suggesting Pokémon to complete team (${team.length}/6)`);

    // Obtener Pokémon disponibles en el formato
    let availablePokemon;
    if (format) {
      const pokemonQuery = await router.handle(
        { query: { format }, method: 'GET' },
        { json: (data) => { availablePokemon = data.pokemon; } }
      );
    } else {
      availablePokemon = await pokemonCacheService.getAllPokemon();
    }

    // Analizar el equipo actual
    const coverage = analyzeTeamCoverage(team);
    const teamPokemonNames = team.map(p => p.name.toLowerCase());

    // Calcular score para cada Pokémon disponible
    const suggestions = availablePokemon
      .filter(pokemon => !teamPokemonNames.includes(pokemon.name.toLowerCase()))
      .map(pokemon => {
        let score = 0;
        
        // Bonus por cubrir debilidades del equipo
        if (pokemon.types) {
          pokemon.types.forEach(typeObj => {
            const type = typeObj.name.toLowerCase();
            const typeData = TYPE_CHART[type];
            
            if (typeData) {
              // +10 puntos por cada resistencia a tipos que son debilidad del equipo
              Object.keys(coverage.weaknesses).forEach(weakType => {
                if (typeData.resistances.includes(weakType)) {
                  score += 10 * coverage.weaknesses[weakType];
                }
                if (typeData.immunities.includes(weakType)) {
                  score += 15 * coverage.weaknesses[weakType];
                }
              });
            }
          });
        }

        // Bonus por diversidad de tipos
        if (pokemon.types) {
          const hasNewType = pokemon.types.some(typeObj => 
            !coverage.types.includes(typeObj.name.toLowerCase())
          );
          if (hasNewType) score += 5;
        }

        // Bonus por estadísticas de uso en el meta (si disponible)
        // Funciona con usageCount (BigQuery) o usagePercent (Smogon)
        if (pokemon.usageCount) {
          score += Math.log10(pokemon.usageCount + 1) * 2;
        } else if (pokemon.usagePercent) {
          score += pokemon.usagePercent * 0.5; // Convertir % a puntos
        }

        // Bonus por stats totales
        if (pokemon.stats) {
          const totalStats = pokemon.stats.reduce((sum, stat) => sum + stat.baseStat, 0);
          score += totalStats / 100;
        }

        return {
          pokemon,
          score: Math.round(score * 100) / 100,
          reasoning: generateReasoning(pokemon, coverage)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`✅ Generated ${suggestions.length} suggestions`);

    res.json({
      teamSize: team.length,
      suggestions,
      teamCoverage: coverage
    });

  } catch (error) {
    console.error('❌ Error generating suggestions:', error);
    res.status(500).json({ 
      error: 'Error generating suggestions',
      message: error.message 
    });
  }
});

/**
 * Generar razonamiento para una sugerencia
 */
function generateReasoning(pokemon, coverage) {
  const reasons = [];

  if (pokemon.types) {
    pokemon.types.forEach(typeObj => {
      const type = typeObj.name.toLowerCase();
      const typeData = TYPE_CHART[type];
      
      if (typeData) {
        // Resistencias importantes
        const importantResistances = typeData.resistances.filter(resType => 
          coverage.weaknesses[resType]
        );
        
        if (importantResistances.length > 0) {
          reasons.push(`Resists ${importantResistances.join(', ')} (team weaknesses)`);
        }

        // Inmunidades importantes
        const importantImmunities = typeData.immunities.filter(immType => 
          coverage.weaknesses[immType]
        );
        
        if (importantImmunities.length > 0) {
          reasons.push(`Immune to ${importantImmunities.join(', ')} (team weaknesses)`);
        }
      }

      // Nuevos tipos
      if (!coverage.types.includes(type)) {
        reasons.push(`Adds ${type} type coverage`);
      }
    });
  }

  if (pokemon.usageCount && pokemon.usageCount > 100) {
    reasons.push(`Popular in meta (${pokemon.usageCount} uses)`);
  } else if (pokemon.usagePercent && pokemon.usagePercent > 5) {
    reasons.push(`Popular in meta (${pokemon.usagePercent.toFixed(1)}% usage)`);
  }

  return reasons.slice(0, 3); // Top 3 razones
}

/**
 * Analizar y recomendar mejor combinación de 6 entre más Pokémon (≥ 6)
 */
router.post('/optimize-team', async (req, res) => {
  try {
    const { pokemon, format, limit = 5 } = req.body;

    if (!pokemon || !Array.isArray(pokemon)) {
      return res.status(400).json({ error: 'Pokemon array is required' });
    }

    if (pokemon.length < 6) {
      return res.status(400).json({ error: 'Need at least 6 Pokémon to optimize' });
    }

    console.log(`🔍 Optimizing team from ${pokemon.length} Pokémon`);

    // Si hay muchos Pokémon (>12), usar heurística simple
    // Si hay pocos (6-12), evaluar todas las combinaciones
    let teamCombinations;

    if (pokemon.length <= 12) {
      // Generar todas las combinaciones de 6
      teamCombinations = generateCombinations(pokemon, 6);
      console.log(`📊 Evaluating ${teamCombinations.length} combinations`);
    } else {
      // Usar sampling aleatorio con heurística
      teamCombinations = generateSampledCombinations(pokemon, 6, Math.min(limit * 10, 100));
      console.log(`📊 Evaluating ${teamCombinations.length} sampled combinations`);
    }

    // Evaluar cada combinación
    const evaluatedTeams = teamCombinations.map(team => {
      const coverage = analyzeTeamCoverage(team);
      const score = evaluateTeamScore(team, coverage, format);
      
      return {
        team,
        score,
        coverage,
        analysis: generateTeamAnalysis(team, coverage)
      };
    }).sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`✅ Top ${evaluatedTeams.length} combinations found`);

    res.json({
      totalPokemon: pokemon.length,
      combinations: evaluatedTeams
    });

  } catch (error) {
    console.error('❌ Error optimizing team:', error);
    res.status(500).json({ 
      error: 'Error optimizing team',
      message: error.message 
    });
  }
});

/**
 * Generar todas las combinaciones de k elementos de un array
 */
function generateCombinations(arr, k) {
  if (k === 1) return arr.map(item => [item]);
  if (k === arr.length) return [arr];
  
  const combinations = [];
  
  function combine(start, combo) {
    if (combo.length === k) {
      combinations.push([...combo]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  
  combine(0, []);
  return combinations;
}

/**
 * Generar combinaciones aleatorias con heurística
 */
function generateSampledCombinations(arr, k, samples) {
  const combinations = new Set();
  const maxAttempts = samples * 3; // Evitar bucle infinito
  let attempts = 0;

  while (combinations.size < samples && attempts < maxAttempts) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    const combination = shuffled.slice(0, k);
    const key = combination.map(p => p.id).sort().join(',');
    combinations.add(key);
    attempts++;
  }

  // Convertir keys de vuelta a arrays de Pokémon
  return Array.from(combinations).map(key => {
    const ids = key.split(',').map(id => parseInt(id));
    return ids.map(id => arr.find(p => p.id === id));
  });
}

/**
 * Evaluar el score de un equipo
 */
function evaluateTeamScore(team, coverage, format) {
  let score = 0;

  // 1. Diversidad de tipos (max 30 puntos)
  score += coverage.types.length * 2;

  // 2. Balance de debilidades (max 40 puntos)
  const weaknessCount = Object.keys(coverage.weaknesses).length;
  const maxWeaknesses = Object.keys(TYPE_CHART).length;
  const weaknessScore = (1 - (weaknessCount / maxWeaknesses)) * 40;
  score += weaknessScore;

  // 3. Cobertura de resistencias (max 20 puntos)
  const resistanceCount = Object.keys(coverage.resistances).length;
  score += (resistanceCount / maxWeaknesses) * 20;

  // 4. Inmunidades (max 10 puntos)
  const immunityCount = Object.keys(coverage.immunities).length;
  score += immunityCount * 2;

  // 5. Stats totales promedio (ajustado, max 15 puntos)
  const avgStats = team.reduce((sum, pokemon) => {
    if (!pokemon.stats) return sum;
    const total = pokemon.stats.reduce((s, stat) => s + stat.baseStat, 0);
    return sum + total;
  }, 0) / team.length;
  score += (avgStats / 600) * 15; // 600 es un buen promedio

  // 6. Popularidad en meta (si disponible, max 10 puntos)
  // Funciona con usageCount (BigQuery) o usagePercent (Smogon)
  const avgUsage = team.reduce((sum, p) => {
    if (p.usageCount) return sum + p.usageCount;
    if (p.usagePercent) return sum + (p.usagePercent * 100); // Normalizar %
    return sum;
  }, 0) / team.length;
  
  if (avgUsage > 0) {
    score += Math.min(Math.log10(avgUsage + 1) * 2, 10);
  }

  return Math.round(score * 100) / 100;
}

/**
 * Generar análisis detallado del equipo
 */
function generateTeamAnalysis(team, coverage) {
  const analysis = {
    strengths: [],
    weaknesses: [],
    recommendations: []
  };

  // Fortalezas
  if (coverage.types.length >= 8) {
    analysis.strengths.push(`Excellent type diversity (${coverage.types.length} types)`);
  }

  const immunityCount = Object.keys(coverage.immunities).length;
  if (immunityCount >= 3) {
    analysis.strengths.push(`Strong immunity coverage (${immunityCount} types)`);
  }

  // Debilidades
  const criticalWeaknesses = Object.entries(coverage.weaknesses)
    .filter(([type, count]) => count >= 4)
    .map(([type]) => type);

  if (criticalWeaknesses.length > 0) {
    analysis.weaknesses.push(`Critical weakness to: ${criticalWeaknesses.join(', ')}`);
  }

  const missingResistances = Object.keys(TYPE_CHART)
    .filter(type => !coverage.resistances[type] && !coverage.immunities[type]);

  if (missingResistances.length > 10) {
    analysis.weaknesses.push(`Limited defensive coverage`);
  }

  // Recomendaciones
  if (coverage.types.length < 6) {
    analysis.recommendations.push('Consider more type diversity');
  }

  if (criticalWeaknesses.length > 0) {
    analysis.recommendations.push(`Add Pokémon resistant to ${criticalWeaknesses[0]}`);
  }

  return analysis;
}

/**
 * DIAGNÓSTICO: Verificar estado del servicio de Smogon Stats
 */
router.get('/smogon-status', async (req, res) => {
  try {
    const cacheStats = smogonStatsService.getCacheStats();
    
    // Intentar obtener meses disponibles
    let monthsAvailable = false;
    let monthsError = null;
    
    try {
      const months = await smogonStatsService.getAvailableMonths();
      monthsAvailable = months && months.length > 0;
    } catch (error) {
      monthsError = error.message;
    }
    
    res.json({
      status: monthsAvailable ? 'operational' : 'degraded',
      smogonReachable: monthsAvailable,
      cache: cacheStats,
      error: monthsError,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DIAGNÓSTICO: Limpiar caché de Smogon (admin/debug)
 */
router.post('/clear-cache', (req, res) => {
  try {
    smogonStatsService.clearCache();
    res.json({ 
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to clear cache',
      message: error.message 
    });
  }
});

module.exports = router;
