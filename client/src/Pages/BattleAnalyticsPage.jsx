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
    </Box>
  );
}