import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText
} from '@mui/material';

export default function BattleAnalyticsPage() {
  const [stats, setStats]     = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  // Carga los IDs que guardaste en localStorage
  const replayIds = JSON.parse(localStorage.getItem('analyticsReplays')) || [];

  useEffect(() => {
    if (replayIds.length < 2) {
      setError('Necesitas al menos 2 replays para ver estadísticas');
      setLoading(false);
      return;
    }
    axios.post('/api/multistats', { replayIds })
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ textAlign:'center', mt:8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error" sx={{ m:4 }}>{error}</Alert>;
  }

  // Si stats aún no llegó, evita crash
  const teamAndMoves = stats?.teamAndMoves || [];

  // 1) Conteo de apariciones de cada poke (1 por replay) en todos los equipos
  const appearanceCounts = teamAndMoves.reduce((acc, { teams }) => {
    // Un Set con los 6+6 pokémones de esta partida (p1 + p2)
    const uniquePokes = new Set([
      ...(teams.p1 || []),
      ...(teams.p2 || [])
    ]);
    // Sumar 1 por cada poke de este Set
    uniquePokes.forEach(poke => {
      acc[poke] = (acc[poke] || 0) + 1;
    });
    return acc;
  }, {});

  return (
    <Box sx={{ p:4 }}>
      <Typography variant="h4" gutterBottom>
        Battle Analytics
      </Typography>

      <Typography variant="subtitle2" gutterBottom>
        Replays analizadas: {replayIds.length}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Player: {stats.player}
      </Typography>

      <Typography variant="h6">Pokémon Usage:</Typography>
      <pre>{JSON.stringify(stats.pokemonUsage, null,2)}</pre>

      <Typography variant="h6" sx={{ mt:2 }}>Opponent Pokémon Usage:</Typography>
      <List dense>
        {Object.entries(appearanceCounts).map(([poke, cnt]) => (
          <ListItem key={poke} sx={{ py:0 }}>
            <ListItemText primary={`${poke}: ${cnt}/${replayIds.length}`} />
          </ListItem>
        ))}
      </List>

      <Typography variant="h6" sx={{ mt:2 }}>Moves Usage:</Typography>
      <pre>{JSON.stringify(stats.moveUsage, null,2)}</pre>

      <Typography variant="h6" sx={{ mt:2 }}>Team and Moves:</Typography>
      <pre>{JSON.stringify(stats.teamAndMoves, null,2)}</pre>
    </Box>
  );
}