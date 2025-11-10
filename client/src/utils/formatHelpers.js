/**
 * Format Helpers
 * Utilidades reutilizables para formatear nombres de formatos, Pokémon, etc.
 */

/**
 * Formatea el nombre de un formato para mostrarlo de manera legible
 * Ejemplo: "gen9vgc2025reggbo3-1760" -> "Gen 9 VGC 2025 Reg G Bo3 (1760+)"
 * 
 * @param {string} format - Formato raw del replay
 * @returns {string} - Formato formateado y legible
 */
export const formatGameFormat = (format) => {
  if (!format) return 'Unknown Format';

  let formatted = format;

  // Separar rating si existe
  const parts = format.split('-');
  const hasRating = parts.length > 1 && /^\d+$/.test(parts[parts.length - 1]);
  const rating = hasRating ? parts.pop() : null;
  const baseFormat = parts.join('-');

  // Reemplazos específicos para VGC
  formatted = baseFormat
    .replace(/^gen(\d+)/, 'Gen $1 ')
    .replace(/vgc(\d{4})/, 'VGC $1 ')
    .replace(/regg/, 'Reg G ')
    .replace(/regf/, 'Reg F ')
    .replace(/rege/, 'Reg E ')
    .replace(/regd/, 'Reg D ')
    .replace(/regc/, 'Reg C ')
    .replace(/regb/, 'Reg B ')
    .replace(/rega/, 'Reg A ')
    .replace(/bo3/gi, 'Bo3')
    .replace(/bo1/gi, 'Bo1')
    .replace(/ou/gi, 'OU')
    .replace(/uu/gi, 'UU')
    .replace(/ru/gi, 'RU')
    .replace(/nu/gi, 'NU')
    .replace(/pu/gi, 'PU')
    .replace(/lc/gi, 'LC')
    .replace(/ubers/gi, 'Ubers')
    .replace(/doubles/gi, 'Doubles')
    .replace(/randombattle/gi, 'Random Battle');

  // Capitalizar primera letra de cada palabra si no está ya capitalizada
  formatted = formatted
    .split(' ')
    .map(word => {
      if (word && word[0] === word[0].toLowerCase() && word.length > 2) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ')
    .trim();

  // Agregar rating al final si existe
  if (rating) {
    formatted += ` (${rating}+)`;
  }

  return formatted;
};

/**
 * Formatea el nombre de un Pokémon (capitaliza y reemplaza guiones)
 * Ejemplo: "landorus-therian" -> "Landorus Therian"
 * 
 * @param {string} name - Nombre del Pokémon
 * @returns {string} - Nombre formateado
 */
export const formatPokemonName = (name) => {
  if (!name) return '';
  
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Formatea una fecha a string legible
 * 
 * @param {Date|string|number} date - Fecha a formatear
 * @param {Object} options - Opciones de formateo (locale, dateStyle, timeStyle)
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date, options = {}) => {
  const {
    locale = 'en-US',
    dateStyle = 'medium',
    timeStyle = 'short'
  } = options;

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeStyle
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formatea un número de rating con colores/estilos según el nivel
 * 
 * @param {number} rating - Rating del jugador
 * @returns {Object} - { value, color, tier }
 */
export const formatRating = (rating) => {
  if (!rating || rating === 0) {
    return {
      value: 'Unrated',
      color: '#888888',
      tier: 'unrated'
    };
  }

  let color = '#ffffff';
  let tier = 'beginner';

  if (rating >= 1800) {
    color = '#ff6b6b'; // Rojo - Expert
    tier = 'expert';
  } else if (rating >= 1700) {
    color = '#ffa94d'; // Naranja - Advanced
    tier = 'advanced';
  } else if (rating >= 1600) {
    color = '#ffd93d'; // Amarillo - Intermediate
    tier = 'intermediate';
  } else if (rating >= 1500) {
    color = '#6bcf7f'; // Verde - Beginner+
    tier = 'beginner-plus';
  } else {
    color = '#94d2bd'; // Verde claro - Beginner
    tier = 'beginner';
  }

  return {
    value: rating,
    color,
    tier
  };
};

/**
 * Trunca un texto largo agregando "..." al final
 * 
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Convierte un string a slug (URL-friendly)
 * Ejemplo: "Landorus Therian" -> "landorus-therian"
 * 
 * @param {string} text - Texto a convertir
 * @returns {string} - Slug generado
 */
export const toSlug = (text) => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Obtiene el color de fondo para un tipo de Pokémon
 * 
 * @param {string} type - Tipo del Pokémon
 * @returns {string} - Color hexadecimal
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

  return typeColors[type?.toLowerCase()] || '#777777';
};

/**
 * Formatea un porcentaje con decimales opcionales
 * 
 * @param {number} value - Valor a formatear (0-100 o 0-1)
 * @param {Object} options - Opciones (decimals, asDecimal)
 * @returns {string} - Porcentaje formateado
 */
export const formatPercentage = (value, options = {}) => {
  const { decimals = 1, asDecimal = false } = options;
  
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  // Si el valor está en formato decimal (0-1), convertir a porcentaje
  const percentage = asDecimal || value <= 1 ? value * 100 : value;
  
  return `${percentage.toFixed(decimals)}%`;
};
