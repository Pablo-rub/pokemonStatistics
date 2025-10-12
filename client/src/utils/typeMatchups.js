/**
 * Type matchup chart for Pokémon
 * Each key is the attacking type, values are defending types with their effectiveness
 */
const TYPE_CHART = {
  normal: {
    rock: 0.5,
    ghost: 0,
    steel: 0.5
  },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2
  },
  water: {
    fire: 2,
    water: 0.5,
    grass: 0.5,
    ground: 2,
    rock: 2,
    dragon: 0.5
  },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5
  },
  psychic: {
    fighting: 2,
    poison: 2,
    psychic: 0.5,
    dark: 0,
    steel: 0.5
  },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5
  },
  ghost: {
    normal: 0,
    psychic: 2,
    ghost: 2,
    dark: 0.5
  },
  dragon: {
    dragon: 2,
    steel: 0.5,
    fairy: 0
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    fairy: 0.5
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5
  }
};

/**
 * Calculate defensive type matchups for a Pokémon
 * Returns how much damage each attacking type does TO this Pokémon
 * 
 * @param {Array<string>} pokemonTypes - The defending Pokémon's types
 * @returns {Object} Matchups organized by effectiveness category
 */
export const calculateDefensiveMatchups = (pokemonTypes) => {
  const allTypes = Object.keys(TYPE_CHART);
  const matchups = {};

  // Calculate effectiveness of each attacking type against this Pokémon
  allTypes.forEach(attackingType => {
    let effectiveness = 1;

    // Apply type chart for each of the Pokémon's types
    pokemonTypes.forEach(defendingType => {
      const typeMatchup = TYPE_CHART[attackingType];
      const multiplier = typeMatchup?.[defendingType.toLowerCase()] || 1;
      effectiveness *= multiplier;
    });

    matchups[attackingType] = effectiveness;
  });

  // Categorize by effectiveness
  return categorizeMatchups(matchups);
};

/**
 * Calculate offensive type matchups for a Pokémon
 * Returns how much damage this Pokémon's types do TO other types
 * 
 * @param {Array<string>} pokemonTypes - The attacking Pokémon's types
 * @returns {Object} Matchups organized by effectiveness category for each type
 */
export const calculateOffensiveMatchups = (pokemonTypes) => {
  const result = {};

  pokemonTypes.forEach(attackingType => {
    const typeKey = attackingType.toLowerCase();
    const typeChart = TYPE_CHART[typeKey] || {};
    const allTypes = Object.keys(TYPE_CHART);
    const matchups = {};

    // For each defending type, get the effectiveness
    allTypes.forEach(defendingType => {
      matchups[defendingType] = typeChart[defendingType] || 1;
    });

    result[attackingType] = categorizeMatchups(matchups);
  });

  return result;
};

/**
 * Helper function to categorize matchups by effectiveness
 * 
 * @param {Object} matchups - Raw matchup data (type: multiplier)
 * @returns {Object} Categorized matchups
 */
const categorizeMatchups = (matchups) => {
  const result = {
    quadruple: [],      // 4x
    double: [],         // 2x
    neutral: [],        // 1x
    half: [],           // 0.5x
    quarter: [],        // 0.25x
    immune: []          // 0x
  };

  Object.entries(matchups).forEach(([type, effectiveness]) => {
    if (effectiveness === 4) result.quadruple.push(type);
    else if (effectiveness === 2) result.double.push(type);
    else if (effectiveness === 1) result.neutral.push(type);
    else if (effectiveness === 0.5) result.half.push(type);
    else if (effectiveness === 0.25) result.quarter.push(type);
    else if (effectiveness === 0) result.immune.push(type);
  });

  return result;
};

/**
 * Get a color for the type badge
 * 
 * @param {string} type - The type name
 * @returns {string} Hex color code
 */
export const getTypeColor = (type) => {
  const typeColors = {
    normal: '#A8A878',
    fire: '#F08030',
    water: '#6890F0',
    electric: '#F8D030',
    grass: '#78C850',
    ice: '#98D8D8',
    fighting: '#C03028',
    poison: '#A040A0',
    ground: '#E0C068',
    flying: '#A890F0',
    psychic: '#F85888',
    bug: '#A8B820',
    rock: '#B8A038',
    ghost: '#705898',
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC'
  };
  return typeColors[type.toLowerCase()] || '#68A090';
};

/**
 * Get effectiveness label and color
 * 
 * @param {string} category - The effectiveness category
 * @returns {Object} Label and color for the category
 */
export const getEffectivenessInfo = (category) => {
  const info = {
    quadruple: { label: '4×', color: '#DC2626', bgColor: 'rgba(220, 38, 38, 0.1)' },
    double: { label: '2×', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)' },
    neutral: { label: '1×', color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
    half: { label: '½×', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.1)' },
    quarter: { label: '¼×', color: '#059669', bgColor: 'rgba(5, 150, 105, 0.1)' },
    immune: { label: '0×', color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)' }
  };
  return info[category] || info.neutral;
};