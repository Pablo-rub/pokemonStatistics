/**
 * Official Pokémon type colors and utilities
 */

export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic',
  'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
];

/**
 * Get official color for a Pokémon type
 * @param {string} type - Type name
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
 * Get type icon/emoji (optional, for future use)
 * @param {string} type - Type name
 * @returns {string} Emoji or icon
 */
export const getTypeIcon = (type) => {
  const typeIcons = {
    normal: '⚪',
    fire: '🔥',
    water: '💧',
    electric: '⚡',
    grass: '🌿',
    ice: '❄️',
    fighting: '👊',
    poison: '☠️',
    ground: '⛰️',
    flying: '🕊️',
    psychic: '🔮',
    bug: '🐛',
    rock: '🪨',
    ghost: '👻',
    dragon: '🐉',
    dark: '🌙',
    steel: '⚙️',
    fairy: '🧚'
  };
  return typeIcons[type.toLowerCase()] || '❓';
};

/**
 * Check if a Pokémon matches the type filter
 * @param {Object} pokemon - Pokémon object with types array
 * @param {Array<string>} selectedTypes - Array of selected type names
 * @param {string} filterMode - 'AND' or 'OR'
 * @returns {boolean} Whether the Pokémon matches the filter
 */
export const matchesTypeFilter = (pokemon, selectedTypes, filterMode = 'OR') => {
  // Debug log
  console.log('🔍 matchesTypeFilter called:', {
    pokemonName: pokemon?.displayName || pokemon?.name,
    pokemonTypes: pokemon?.types,
    selectedTypes,
    filterMode
  });

  // Si no hay filtros seleccionados, mostrar todos
  if (!selectedTypes || selectedTypes.length === 0) {
    console.log('✅ No filter applied - showing all');
    return true;
  }

  // Validar que el Pokémon tenga tipos
  if (!pokemon.types || !Array.isArray(pokemon.types) || pokemon.types.length === 0) {
    console.warn('⚠️ Pokémon has no types:', pokemon);
    return false;
  }

  // Extraer nombres de tipos del Pokémon (normalizar a minúsculas)
  const pokemonTypeNames = pokemon.types.map(t => {
    const typeName = typeof t === 'string' ? t : t.name;
    return typeName.toLowerCase();
  });

  // Normalizar tipos seleccionados a minúsculas
  const selectedTypesLower = selectedTypes.map(t => t.toLowerCase());

  console.log('   Pokemon type names:', pokemonTypeNames);
  console.log('   Selected types (lower):', selectedTypesLower);

  let matches = false;

  if (filterMode === 'AND') {
    // El Pokémon debe tener TODOS los tipos seleccionados
    matches = selectedTypesLower.every(type => pokemonTypeNames.includes(type));
    console.log('   AND mode result:', matches);
  } else {
    // El Pokémon debe tener AL MENOS UNO de los tipos seleccionados (OR)
    matches = selectedTypesLower.some(type => pokemonTypeNames.includes(type));
    console.log('   OR mode result:', matches);
  }

  return matches;
};