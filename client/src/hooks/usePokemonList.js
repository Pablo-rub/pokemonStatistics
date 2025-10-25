import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and manage Pokémon list with types
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Number of Pokémon to fetch
 * @param {Array} options.types - Array of Pokémon types to filter
 * @returns {Object} Pokémon list data and loading state
 */
export const usePokemonList = ({ limit = 1025, types = [] } = {}) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  useEffect(() => {
    const fetchPokemon = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams();
        params.append('limit', limit);
        
        if (types && types.length > 0) {
          params.append('types', types.join(','));
        }
        
        console.log('🔄 Fetching Pokemon list with params:', params.toString());
        
        const response = await axios.get(`/api/pokemon?${params.toString()}`);
        
        setPokemonList(response.data.pokemon || []);
        setCacheInfo(response.data.cacheStats || null);
        
        console.log('✅ Pokemon list loaded:', {
          count: response.data.pokemon?.length,
          cached: response.data.cached,
          cacheAge: response.data.cacheStats?.ageMinutes
        });
        
      } catch (err) {
        console.error('❌ Error fetching Pokemon:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, [limit, types]); // Re-fetch cuando cambien los filtros

  return { pokemonList, loading, error, cacheInfo };
};

// ✅ SOLUCIÓN: Agregar export default para compatibilidad con imports default
export default usePokemonList;