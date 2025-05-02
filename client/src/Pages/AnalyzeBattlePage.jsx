import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import PokemonSprite from "../components/PokemonSprite";
import TurnCard from "../components/TurnCard";

// todo
// moves for p2

const AnalyzeBattlePage = () => {
  const { replayId } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`/api/analyze-battle/${replayId}`)
      .then(res => setData(res.data))
      .catch(console.error);
  }, [replayId]);

  if (!data) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="common.white" gutterBottom>
        Battle Analysis: {data.replayId}
      </Typography>

      {data.hasInsufficientData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Some turns don't have enough data for accurate predictions. This happens when there are few or no similar scenarios in our database.
        </Alert>
      )}

      <Grid container spacing={4} sx={{ mb: 4 }}>
        {['p1','p2'].map((side, i) => (
          <Grid key={side} item xs={12} sm={6}>
            <Typography variant="h6" color="common.white" gutterBottom>
              Player {i+1} Team
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {data.teams[side].map(p =>
                <PokemonSprite key={p.name} pokemon={{ name: p.name }} />
              )}
            </Stack>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        {data.analysis
          .filter(turn => turn.turn_number !== 0)
          .map(turn => (
            <Grid key={turn.turn_number} item xs={12} sm={6} md={4}>
              <TurnCard turn={turn} />
            </Grid>
          ))
        }
      </Grid>
    </Box>
  );
};

export default AnalyzeBattlePage;