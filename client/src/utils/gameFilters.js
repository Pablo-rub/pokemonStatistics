/**
 * Función unificada para filtrar y ordenar juegos/replays
 * @param {Array} games - Array de juegos
 * @param {Object} filters - Objeto con filtros
 * @returns {Array} - Array filtrado y ordenado
 */
export const filterAndSortGames = (games, filters) => {
  let filtered = [...games];

  // Player filter
  if (filters.playerFilter?.trim()) {
    const query = filters.playerFilter.toLowerCase();
    filtered = filtered.filter(game => 
      game.player1?.toLowerCase().includes(query) ||
      game.player2?.toLowerCase().includes(query)
    );
  }

  // Rating filter
  if (filters.ratingFilter && filters.ratingFilter !== 'all') {
    if (filters.ratingFilter === 'unknown') {
      filtered = filtered.filter(game => !game.rating || game.rating === 0);
    } else {
      const minRating = parseInt(filters.ratingFilter.replace('+', ''));
      filtered = filtered.filter(game => game.rating && game.rating >= minRating);
    }
  }

  // Date filter
  if (filters.dateFilter && filters.dateFilter !== 'all') {
    const now = Date.now();
    const timeRanges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    };
    const range = timeRanges[filters.dateFilter];
    if (range && games[0]?.ts) {
      filtered = filtered.filter(game => now - game.ts <= range);
    }
  }

  // Format filter
  if (filters.formatFilter && filters.formatFilter !== 'all') {
    filtered = filtered.filter(game => game.format === filters.formatFilter);
  }

  // Sort
  if (filters.sortBy) {
    const [field, order] = filters.sortBy.split(' ');
    filtered.sort((a, b) => {
      let valA, valB;
      
      if (field === 'date') {
        valA = a.ts || new Date(a.date).getTime() || 0;
        valB = b.ts || new Date(b.date).getTime() || 0;
      } else if (field === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }

      return order === 'DESC' ? valB - valA : valA - valB;
    });
  }

  return filtered;
};