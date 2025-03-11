import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress
} from "@mui/material";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BattleField from "../components/BattleField";

//todo
//analyze battle e icono blanco
//select format
//order de los pokemon del select por porcentaje de uso en ese formato

function TurnAssistantPage() {
  const [selectedPokemon, setSelectedPokemon] = useState({
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

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
      <Typography variant="subtitle1" sx={{ mb: 4 }}>
        Select the Pokémon on the field to get strategic recommendations.
      </Typography>

      {/* Battle field with Pokémon selection */}
      <BattleField onPokemonSelect={handlePokemonSelect} />

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
