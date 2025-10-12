import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and manage Pokémon list with types
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
    console.log('🔄 usePokemonList: Starting fetch...');
    setLoading(true);
    setError(null);

    try {
      // Fetch Pokémon list with types from backend
      const response = await axios.get('/api/pokemon', {
        params: { limit, offset }
      });

      console.log('✅ usePokemonList: Received response:', {
        count: response.data.count,
        pokemonCount: response.data.pokemon?.length,
        firstPokemon: response.data.pokemon?.[0]
      });

      // Validar que la respuesta tenga la estructura esperada
      if (!response.data.pokemon || !Array.isArray(response.data.pokemon)) {
        throw new Error('Invalid response format: missing pokemon array');
      }

      // Validar que al menos algunos Pokémon tengan tipos
      const pokemonWithTypes = response.data.pokemon.filter(p => p.types && p.types.length > 0);
      console.log(`✅ usePokemonList: ${pokemonWithTypes.length}/${response.data.pokemon.length} Pokémon have types`);

      if (pokemonWithTypes.length === 0) {
        console.warn('⚠️ usePokemonList: No Pokémon have types! This will cause filter issues.');
      }

      setPokemonList(response.data.pokemon);
      setTotalCount(response.data.count);
      
      console.log('✅ usePokemonList: State updated successfully');
      
    } catch (err) {
      console.error('❌ usePokemonList: Error fetching Pokémon list:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setError(err.response?.data?.message || err.message || 'Error loading Pokémon list');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchPokemonList();
  }, [fetchPokemonList]);

  const refetch = useCallback(() => {
    console.log('🔄 usePokemonList: Manual refetch triggered');
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