import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and manage Pokémon list
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Number of Pokémon to fetch
 * @param {number} options.offset - Offset for pagination
 * @returns {Object} Pokémon list data and loading state
 */
const usePokemonList = ({ limit = 1025, offset = 0 } = {}) => {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPokemonList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use relative URL - proxy will handle it in development
      // In production, both frontend and backend are served from same origin
      const response = await axios.get('/api/pokemon', {
        params: { limit, offset }
      });

      setPokemonList(response.data.pokemon);
      setTotalCount(response.data.count);
    } catch (err) {
      console.error('Error fetching Pokémon list:', err);
      setError(err.response?.data?.message || err.message || 'Error loading Pokémon list');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchPokemonList();
  }, [fetchPokemonList]);

  const refetch = useCallback(() => {
    fetchPokemonList();
  }, [fetchPokemonList]);

  return {
    pokemonList,
    loading,
    error,
    totalCount,
    refetch
  };
};

export default usePokemonList;