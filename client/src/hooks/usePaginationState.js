import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Custom hook to manage pagination and filter state with persistence
 * Saves state to localStorage and URL query parameters
 * 
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} defaultState - Default state values
 * @returns {Object} State management utilities
 */
const usePaginationState = (storageKey, defaultState = {}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state from localStorage, URL params, or defaults
  const getInitialState = useCallback(() => {
    // First try URL params (highest priority)
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.has('page')) {
      const state = { ...defaultState };
      urlParams.forEach((value, key) => {
        if (key === 'page') {
          state[key] = parseInt(value, 10) || defaultState[key];
        } else {
          state[key] = value;
        }
      });
      return state;
    }

    // Then try localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields
        return { ...defaultState, ...parsed };
      }
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
    }

    // Fallback to defaults
    return defaultState;
  }, [storageKey, defaultState, location.search]);

  const [state, setState] = useState(getInitialState);

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  }, [state, storageKey]);

  // Update URL params when state changes (optional, for shareable links)
  const updateUrlParams = useCallback((newState) => {
    const params = new URLSearchParams();
    Object.entries(newState).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });
    
    const newSearch = params.toString();
    const currentSearch = location.search.slice(1); // Remove '?'
    
    // Only update if params changed
    if (newSearch !== currentSearch) {
      navigate(`${location.pathname}?${newSearch}`, { replace: true });
    }
  }, [navigate, location.pathname, location.search]);

  // Update state and URL
  const updateState = useCallback((updates) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      updateUrlParams(newState);
      return newState;
    });
  }, [updateUrlParams]);

  // Reset to default state
  const resetState = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(storageKey);
    navigate(location.pathname, { replace: true });
  }, [defaultState, storageKey, navigate, location.pathname]);

  // Clear storage (useful when unmounting)
  const clearStorage = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    state,
    updateState,
    resetState,
    clearStorage
  };
};

export default usePaginationState;