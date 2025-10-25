/**
 * Helper function to navigate to Pokemon detail page
 * Ensures we always have a valid identifier
 * 
 * @param {Object} pokemon - Pokemon object
 * @param {Function} navigate - React Router navigate function
 * @returns {boolean} - true if navigation was successful
 */
export const navigateToPokemon = (pokemon, navigate) => {
  if (!pokemon) {
    console.error('[Navigation] Pokemon object is undefined');
    return false;
  }

  // Priority: id > name
  const identifier = pokemon.id || pokemon.name;

  if (!identifier) {
    console.error('[Navigation] Pokemon has no valid identifier:', pokemon);
    return false;
  }

  console.log('[Navigation] Navigating to pokemon:', identifier);
  navigate(`/pokemon/${identifier}`);
  return true;
};

/**
 * Get a valid identifier from a pokemon object
 * @param {Object} pokemon - Pokemon object
 * @returns {string|number|null} - Valid identifier or null
 */
export const getPokemonIdentifier = (pokemon) => {
  if (!pokemon) return null;
  return pokemon.id || pokemon.name || null;
};