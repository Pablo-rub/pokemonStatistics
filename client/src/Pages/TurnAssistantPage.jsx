import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import axios from "axios";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BattleField from "../components/BattleField";

function TurnAssistantPage() {
  const [selectedPokemon, setSelectedPokemon] = useState({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  
  // States for format selection
  const [formats, setFormats] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [isLoadingFormats, setIsLoadingFormats] = useState(false);
  const [pokemonList, setPokemonList] = useState([]);
  
  // Fetch available formats when component mounts
  useEffect(() => {
    const fetchFormatsAndPokemon = async () => {
      try {
        // Get the most recent month first
        const monthsResponse = await axios.get('http://localhost:5000/api/months');
        if (!monthsResponse.data || monthsResponse.data.length === 0) {
          console.error('No months available');
          return;
        }
        
        // Filter for months from 2025 only
        const months2025 = monthsResponse.data.filter(month => month.startsWith('2025-'));
        if (months2025.length === 0) {
          console.error('No 2025 months available');
          return;
        }
        
        const latestMonth = months2025[0]; // Months should be sorted newest first
        
        // Fetch formats for the latest month
        setIsLoadingFormats(true);
        const formatsResponse = await axios.get(`http://localhost:5000/api/formats/${latestMonth}`);
        
        if (formatsResponse.data && formatsResponse.data.length > 0) {
          // Filter for VGC formats from 2025 only and exclude BO3 formats
          const currentYearVgcFormats = formatsResponse.data.filter(format => {
            // Must include 'vgc' and include '2025'
            const isVgc = format.toLowerCase().includes('vgc');
            const isCurrent = format.toLowerCase().includes('2025');
            const isNotBo3 = !format.toLowerCase().includes('bo3');
            
            return isVgc && isCurrent && isNotBo3;
          });
          
          // Map to store formats with display name and API name
          const formatMap = new Map();
          
          // Process each format to remove any duplicate formats with different ratings
          currentYearVgcFormats.forEach(format => {
            // Get the base format name without rating suffix
            const baseName = format.replace(/-\d+$/, '');
            
            // Store in map to eliminate duplicates
            formatMap.set(baseName, {
              displayName: baseName,
              apiName: format
            });
          });
          
          // Convert map values to array for state
          const cleanedFormats = Array.from(formatMap.values());
          setFormats(cleanedFormats);
          
          // Select first format and fetch its Pokémon
          if (cleanedFormats.length > 0) {
            setSelectedFormat(cleanedFormats[0].apiName);
            fetchPokemonList(latestMonth, cleanedFormats[0].apiName);
          }
        }
      } catch (error) {
        console.error('Error fetching formats:', error);
      } finally {
        setIsLoadingFormats(false);
      }
    };
    
    fetchFormatsAndPokemon();
  }, []);
  
  // Handle format change
  const handleFormatChange = (event) => {
    const newFormat = event.target.value;
    setSelectedFormat(newFormat);
    
    // Need to fetch the latest month again since we're not storing it
    const fetchLatestMonth = async () => {
      try {
        const monthsResponse = await axios.get('http://localhost:5000/api/months');
        if (monthsResponse.data && monthsResponse.data.length > 0) {
          // Filter for 2025 months only
          const months2025 = monthsResponse.data.filter(month => month.startsWith('2025-'));
          if (months2025.length > 0) {
            const latestMonth = months2025[0];
            fetchPokemonList(latestMonth, newFormat);
          }
        }
      } catch (error) {
        console.error('Error fetching latest month:', error);
      }
    };
    
    fetchLatestMonth();
  };
  
  // Fetch Pokémon list for the selected format
  const fetchPokemonList = async (month, format) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/rankings`, {
        params: { month, format }
      });
      
      if (response.data && response.data.data) {
        const pokemonNames = Object.keys(response.data.data);
        setPokemonList(pokemonNames);
      }
    } catch (error) {
      console.error('Error fetching Pokémon list:', error);
    }
  };

  const handlePokemonSelect = (pokemonData) => {
    setSelectedPokemon(pokemonData);
    // Reset analysis when Pokémon change
    setAnalysisResults(null);
  };

  const handleAnalyze = async () => {
    // Ensure all four positions have a Pokémon selected
    const allSelected = Object.values(selectedPokemon).every(pokemon => pokemon !== null);
    
    if (!allSelected) {
      alert("Please select all four Pokémon before analyzing.");
      return;
    }

    setAnalyzing(true);
    
    try {
      // Here you would make an API call to your backend
      // For now, we'll simulate a delay and return mock data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAnalysisResults({
        yourRecommendedMoves: {
          [selectedPokemon.topLeft]: ["Water Spout", "Protect"],
          [selectedPokemon.topRight]: ["Tera", "Close Combat"]
        },
        winRate: 65.3,
        matchingGames: 42,
        topStrategies: [
          { move1: "Water Spout", move2: "Close Combat", winRate: 72.1, games: 18 },
          { move1: "Protect", move2: "Close Combat", winRate: 64.5, games: 15 },
          { move1: "Water Spout", move2: "Protect", winRate: 55.3, games: 9 }
        ]
      });
    } catch (error) {
      console.error("Error analyzing battle scenario:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Turn Assistant
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Select a format and Pokémon to get strategic recommendations
      </Typography>
      
      {/* Format selector */}
      <Box sx={{ display: 'flex', mb: 4 }}>
        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel id="format-select-label" sx={{ color: 'white' }}>Format</InputLabel>
          <Select
            labelId="format-select-label"
            value={selectedFormat}
            label="Format"
            onChange={handleFormatChange}
            disabled={isLoadingFormats || formats.length === 0}
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'white',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              }
            }}
          >
            {formats.map((format) => (
              <MenuItem key={format.apiName} value={format.apiName}>
                {format.displayName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Battle field with Pokémon selection */}
      <BattleField 
        onPokemonSelect={handlePokemonSelect} 
        pokemonList={pokemonList}
      />

      {/* Analyze button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Button 
          variant="containedSuccess" 
          size="large"
          startIcon={analyzing ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
          onClick={handleAnalyze}
          disabled={analyzing || !Object.values(selectedPokemon).every(pokemon => pokemon !== null)}
        >
          {analyzing ? "Analyzing..." : "Analyze Battle"}
        </Button>
      </Box>

      {/* Results section */}
      {analysisResults && (
        <Paper sx={{ mt: 4, p: 3, backgroundColor: '#221FC7' }}>
          <Typography variant="h5" gutterBottom>
            Analysis Results
          </Typography>
          
          <Typography variant="subtitle1">
            Based on {analysisResults.matchingGames} similar games, your win rate is approximately {analysisResults.winRate.toFixed(1)}%
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          <Typography variant="h6" gutterBottom>
            Recommended Moves
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              {selectedPokemon.topLeft}: {analysisResults.yourRecommendedMoves[selectedPokemon.topLeft].join(" or ")}
            </Typography>
            <Typography variant="subtitle2">
              {selectedPokemon.topRight}: {analysisResults.yourRecommendedMoves[selectedPokemon.topRight].join(" or ")}
            </Typography>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          <Typography variant="h6" gutterBottom>
            Top Winning Combinations
          </Typography>
          
          {analysisResults.topStrategies.map((strategy, index) => (
            <Box key={index} sx={{ mb: 1 }}>
              <Typography variant="body2">
                {strategy.move1} + {strategy.move2}: {strategy.winRate.toFixed(1)}% win rate 
                ({strategy.games} games)
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

export default TurnAssistantPage;
