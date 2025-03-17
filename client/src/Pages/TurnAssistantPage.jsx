import React, { useState, useEffect } from 'react';
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
import BattleConditionsDialog from '../components/BattleConditionsDialog';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

//todo
//ver que hacer con el mirror
//boton ir para arriba
//better item list
//que los select se desplieguen para abajo
//moves
//boton limpiar

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

  // Estado para el dialog de Battle Conditions  
  const [battleDialogOpen, setBattleDialogOpen] = useState(false);

  // Estado extendido para condiciones de batalla, incluyendo side effects
  const [battleConditions, setBattleConditions] = useState({
    weather: "",
    field: "",
    room: "",
    sideEffects: {
      yourSide: {},
      opponentSide: {}
    }
  });

  const handlePokemonSelect = (pokemonData) => {
    // Simply update the selected Pokémon without checking for duplicates
    setSelectedPokemon(pokemonData);
    
    // Reset analysis results whenever Pokémon are changed
    setAnalysisResults(null);
    
    // Clear any existing error
    setError(null);
  };

  const handleAnalyze = async () => {
    // Ensure all four positions have a Pokémon selected
    const allSelected = 
      selectedPokemon.topLeft && 
      selectedPokemon.topRight && 
      selectedPokemon.bottomLeft && 
      selectedPokemon.bottomRight;
    
    if (!allSelected) {
      setError("Please select all four Pokémon before analyzing.");
      return;
    }
    
    // Check for duplicate selections
    if (selectedPokemon.topLeft.name === selectedPokemon.topRight.name) {
      setError("You cannot use the same Pokémon twice on your team. Please select different Pokémon.");
      return;
    }
    
    if (selectedPokemon.bottomLeft.name === selectedPokemon.bottomRight.name) {
      setError("Your opponent cannot use the same Pokémon twice. Please select different Pokémon for the opponent.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    
    try {
      // Make the API call to the backend
      const response = await axios.post("http://localhost:5000/api/turn-assistant/analyze", {
        pokemonData: selectedPokemon,
        battleConditions: battleConditions
      });
      
      if (response.data) {
        setAnalysisResults({
          matchingGames: response.data.matchingScenarios || 0,
          winRate: response.data.data?.winRate || 0,
          allMoveOptions: response.data.data?.allMoveOptions || {},
          topCombinations: response.data.data?.topCombinations || []
        });
      } else {
        setError("No analysis data returned from server.");
      }
    } catch (error) {
      console.error("Error analyzing scenarios:", error);
      if (error.response && error.response.data) {
        setError(error.response.data.error || "Error analyzing scenarios.");
      } else {
        setError("Error connecting to server. Please try again later.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

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

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Turn Assistant
      </Typography>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Select a format and Pokémon to get strategic recommendations
      </Typography>
      
      {/* Format selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <FormControl sx={{ minWidth: 250, flexGrow: 1 }}>
          <InputLabel id="format-select-label" sx={{ color: 'white' }}>Format</InputLabel>
          <Select
            labelId="format-select-label"
            value={selectedFormat}
            onChange={(e) => handleFormatChange(e)}
            label="Format"
            disabled={isLoadingFormats}
            sx={{
              color: 'white',
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'white',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'white',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'white',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              }
            }}
            MenuProps={{
              anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
              transformOrigin: { vertical: 'top', horizontal: 'left' },
              getContentAnchorEl: null
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
      
      {isLoadingFormats ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Solo se usa un BattleField */}
          <BattleField 
            onPokemonSelect={handlePokemonSelect}
            pokemonList={pokemonList}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => setBattleDialogOpen(true)}
              startIcon={<SettingsIcon />}
              sx={{ mb: 1, width: '200px', fontSize: '0.875rem', marginTop: '1rem' }}
            >
              Battle Conditions
            </Button>
            <Button
              variant="containedSuccess"
              color="primary"
              onClick={handleAnalyze}
              disabled={analyzing}
              startIcon={analyzing ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              sx={{ py: 1, px: 4 }}
            >
              {analyzing ? "Analyzing..." : "Analyze Battle"}
            </Button>

            <Button
              variant="containedCancel"
              color="error"
              onClick={() => setSelectedFormat('')}
              startIcon={<DeleteOutlineIcon />}
              sx={{ py: 1, px: 4, mt: 1 }}
            >
              Reset
            </Button>

            {error && (
              <Alert 
                severity="error" 
                sx={{
                  mt: 2,
                  width: '100%',
                  maxWidth: '400px',
                  textAlign: 'center',
                  backgroundColor: '#E9A5A5', // rojo (puedes ajustar al tono deseado)
                  color: '#000000'            // texto negro
                }}
              >
                {error}
              </Alert>
            )}
          </Box>

          <BattleConditionsDialog
            open={battleDialogOpen}
            onClose={() => setBattleDialogOpen(false)}
            battleConditions={battleConditions}
            setBattleConditions={setBattleConditions}
          />
        </>
      )}
      
      {/* Analysis Results */}
      {analysisResults && (
        <Paper sx={{ mt: 5, p: 3, backgroundColor: '#221FC7' }}>
          <Typography variant="h5" gutterBottom>
            Analysis Results
          </Typography>
          
          <Typography variant="body1" paragraph>
            Based on {analysisResults.matchingGames} similar scenarios, your win rate is approximately {analysisResults.winRate.toFixed(1)}%.
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Check that allMoveOptions exists before trying to render */}
          {analysisResults.allMoveOptions && selectedPokemon.topLeft && selectedPokemon.topRight && (
            <>
              <Typography variant="h6" gutterBottom >
                Move Options
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
                {/* First Pokémon's moves */}
                <TableContainer component={Paper} sx={{ flex: 1, backgroundColor: '#221FC7' }}>
                  <Typography variant="subtitle2" sx={{ p: 1 }}>
                    {selectedPokemon.topLeft.name} {selectedPokemon.topLeft.item ? `(${selectedPokemon.topLeft.item})` : ''}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Move</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Win Rate</TableCell>
                        <TableCell align="right">Games</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Make sure the array exists before mapping */}
                      {Array.isArray(analysisResults.allMoveOptions[selectedPokemon.topLeft.name]) && analysisResults.allMoveOptions[selectedPokemon.topLeft.name].map((move) => (
                        <TableRow key={move.move}>
                          <TableCell>{move.move}</TableCell>
                          <TableCell align="right">{move.winRate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{move.total}</TableCell>
                        </TableRow>
                      ))}
                      {/* Handle case when no moves exist */}
                      {(!analysisResults.allMoveOptions[selectedPokemon.topLeft.name] || 
                        !Array.isArray(analysisResults.allMoveOptions[selectedPokemon.topLeft.name]) || 
                        analysisResults.allMoveOptions[selectedPokemon.topLeft.name].length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">No move data available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Second Pokémon's moves */}
                <TableContainer component={Paper} sx={{ flex: 1, backgroundColor: '#221FC7' }}>
                  <Typography variant="subtitle2" sx={{ p: 1 }}>
                    {selectedPokemon.topRight.name} {selectedPokemon.topRight.item ? `(${selectedPokemon.topRight.item})` : ''}
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Move</TableCell>
                        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>Win Rate</TableCell>
                        <TableCell align="right">Games</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Make sure the array exists before mapping */}
                      {Array.isArray(analysisResults.allMoveOptions[selectedPokemon.topRight.name]) && analysisResults.allMoveOptions[selectedPokemon.topRight.name].map((move) => (
                        <TableRow key={move.move}>
                          <TableCell>{move.move}</TableCell>
                          <TableCell align="right">{move.winRate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{move.total}</TableCell>
                        </TableRow>
                      ))}
                      {/* Handle case when no moves exist */}
                      {(!analysisResults.allMoveOptions[selectedPokemon.topRight.name] || 
                        !Array.isArray(analysisResults.allMoveOptions[selectedPokemon.topRight.name]) || 
                        analysisResults.allMoveOptions[selectedPokemon.topRight.name].length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">No move data available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              <Typography variant="h6" gutterBottom>
                Best Combinations
              </Typography>
              
              <TableContainer component={Paper} sx={{ backgroundColor: '#221FC7' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{selectedPokemon.topLeft.name}</TableCell>
                      <TableCell>{selectedPokemon.topRight.name}</TableCell>
                      <TableCell align="right">Win Rate</TableCell>
                      <TableCell align="right">Games</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysisResults.topCombinations && analysisResults.topCombinations.length > 0 ? (
                      analysisResults.topCombinations.map((combo, index) => (
                        <TableRow key={index}>
                          <TableCell>{combo.move1}</TableCell>
                          <TableCell>{combo.move2}</TableCell>
                          <TableCell align="right">{combo.winRate.toFixed(1)}%</TableCell>
                          <TableCell align="right">{combo.games}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No combination data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}

export default TurnAssistantPage;
