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
  MenuItem,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";
import axios from "axios";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BattleField from "../components/BattleField";

//todo
//arreglar movimientos
//mostrar si tera esta activado con el move
//ver que hacer con el mirror

function TurnAssistantPage() {
  const [selectedPokemon, setSelectedPokemon] = useState({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  
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
        setError('Failed to fetch available formats. Please try again later.');
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
    setError(null);
    
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
        setError('Failed to fetch Pokémon list for the selected format.');
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
      setError('Failed to fetch Pokémon list. Please try again later.');
    }
  };

  const handlePokemonSelect = (pokemonData) => {
    setSelectedPokemon(pokemonData);
    // Reset analysis and error when Pokémon change
    setAnalysisResults(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    // Ensure all four positions have a Pokémon selected
    const allSelected = Object.values(selectedPokemon).every(pokemon => pokemon !== null);
    
    if (!allSelected) {
      setError("Please select all four Pokémon before analyzing.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    
    try {
      // Make the API call to the backend
      const response = await axios.post("http://localhost:5000/api/turn-assistant/analyze", {
        pokemonData: selectedPokemon
      });
      
      if (response.data.matchingScenarios === 0) {
        setError("No matching battle scenarios found with these Pokémon. Try a different combination.");
        setAnalysisResults(null);
      } else {
        const data = response.data.data;
        
        // Transform the data for our UI
        const formattedResults = {
          moveOptions: data.allMoveOptions,
          winRate: data.winRate,
          matchingGames: data.totalGames,
          topStrategies: data.topCombinations.map(combo => ({
            move1: combo.move1,
            move2: combo.move2,
            pokemon1: combo.pokemon1,
            pokemon2: combo.pokemon2,
            winRate: combo.winRate,
            games: combo.games
          }))
        };
        
        setAnalysisResults(formattedResults);
      }
    } catch (error) {
      console.error("Error analyzing battle scenario:", error);
      setError("An error occurred while analyzing this battle scenario. Please try again.");
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
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
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

      {/* Results section - updated to show tables with all moves and win rates */}
      {analysisResults && (
        <Paper sx={{ mt: 4, p: 3, backgroundColor: '#221FC7' }}>
          <Typography variant="h5" gutterBottom>
            Analysis Results
          </Typography>
          
          <Typography variant="subtitle1">
            Based on {analysisResults.matchingGames} similar games, your win rate is approximately {analysisResults.winRate.toFixed(1)}%
          </Typography>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* Move options tables - one for each Pokémon */}
          <Typography variant="h6" gutterBottom>
            Available Moves & Win Rates
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: {xs: 'column', md: 'row'}, gap: 2, mb: 3 }}>
            {/* Your left Pokémon moves - with Tera integrated */}
            <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', flex: 1 }}>
              <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
                {selectedPokemon.topLeft}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>Move</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Win Rate</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Games</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysisResults.moveOptions[selectedPokemon.topLeft]?.length > 0 ? (
                    analysisResults.moveOptions[selectedPokemon.topLeft].map((move) => (
                      <TableRow key={move.move} sx={move.move.includes('(Tera)') ? { 
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      } : {}}>
                        <TableCell sx={{ 
                          color: move.move.includes('(Tera)') ? '#FFA500' : 'white',
                          fontWeight: move.move.includes('(Tera)') ? 'bold' : 'normal'
                        }}>
                          {move.move}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'white' }}>{move.winRate.toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ color: 'white' }}>{move.total}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ color: 'white', textAlign: 'center' }}>
                        No move data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Your right Pokémon moves - with Tera integrated */}
            <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', flex: 1 }}>
              <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold' }}>
                {selectedPokemon.topRight}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>Move</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Win Rate</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Games</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysisResults.moveOptions[selectedPokemon.topRight]?.length > 0 ? (
                    analysisResults.moveOptions[selectedPokemon.topRight].map((move) => (
                      <TableRow key={move.move} sx={move.move.includes('(Tera)') ? { 
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      } : {}}>
                        <TableCell sx={{ 
                          color: move.move.includes('(Tera)') ? '#FFA500' : 'white',
                          fontWeight: move.move.includes('(Tera)') ? 'bold' : 'normal'
                        }}>
                          {move.move}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'white' }}>{move.winRate.toFixed(1)}%</TableCell>
                        <TableCell align="right" sx={{ color: 'white' }}>{move.total}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ color: 'white', textAlign: 'center' }}>
                        No move data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
          
          {/* Top Combinations - which now include Tera information in the move names */}
          <Typography variant="h6" gutterBottom>
            Top Winning Combinations
          </Typography>
          
          {analysisResults.topStrategies.length > 0 ? (
            <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'white' }}>Move Combination</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Win Rate</TableCell>
                    <TableCell align="right" sx={{ color: 'white' }}>Games</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analysisResults.topStrategies.map((strategy, index) => (
                    <TableRow 
                      key={index} 
                      sx={strategy.move1.includes('(Tera)') || strategy.move2.includes('(Tera)') ? { 
                        backgroundColor: 'rgba(255, 255, 255, 0.15)'
                      } : {}}
                    >
                      <TableCell sx={{ color: 'white' }}>
                        <Box>
                          <Typography variant="body2" component="span" sx={{ 
                            fontWeight: 'bold',
                            display: 'block' 
                          }}>
                            {strategy.pokemon1}:
                          </Typography>
                          <Typography component="span" sx={{ 
                            color: strategy.move1.includes('(Tera)') ? '#FFA500' : 'white',
                            fontWeight: strategy.move1.includes('(Tera)') ? 'bold' : 'normal',
                            ml: 1
                          }}>
                            {strategy.move1}
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span" sx={{ 
                            fontWeight: 'bold',
                            display: 'block'
                          }}>
                            {strategy.pokemon2}:
                          </Typography>
                          <Typography component="span" sx={{ 
                            color: strategy.move2.includes('(Tera)') ? '#FFA500' : 'white',
                            fontWeight: strategy.move2.includes('(Tera)') ? 'bold' : 'normal',
                            ml: 1
                          }}>
                            {strategy.move2}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{strategy.winRate.toFixed(1)}%</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{strategy.games}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body2">
              Not enough data to determine effective move combinations
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default TurnAssistantPage;
