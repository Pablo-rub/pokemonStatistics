import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Grid,
  useTheme
} from '@mui/material';

export default function BattleAnalyticsPage() {
  const theme = useTheme();
  const [stats, setStats]     = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

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

  // Prepare your Pokémon stats
  const yourStats = Object.keys(stats.usageCounts)
    .filter(name => name !== 'none')
    .map(name => {
      const played = stats.usageCounts[name] || 0;
      const wins   = stats.winCounts[name]   || 0;
      const losses = stats.lossCounts[name]  || 0;
      const tera   = stats.teraCount[name]   || 0;
      const teraWins = stats.teraWinCounts[name] || 0;
      return {
        name,
        played,
        wins,
        losses,
        winRate: played ? Math.round(wins / played * 100) : 0,
        tera,
        teraWinRate: tera ? Math.round(teraWins / tera * 100) : 0,
      };
    })
    .sort((a,b) => b.played - a.played);

  // Prepare rival Pokémon stats
  const rivalStats = Object.keys(stats.rivalTeamCounts)
    .filter(name => name !== 'none')
    .map(name => {
      const teamAppeared = stats.rivalTeamCounts[name] || 0;
      const usedInBattle = stats.rivalUsageCounts[name]  || 0;
      const wins = stats.rivalWinCounts[name] || 0;
      return {
        name,
        teamAppeared,
        usedInBattle,
        winRate: usedInBattle ? Math.round(wins / usedInBattle * 100) : 0
      };
    })
    .sort((a,b) => b.teamAppeared - a.teamAppeared);

  // Prepare move usage stats
  const moveStats = Object.entries(stats.moveCounts).map(([mon, moves]) => ({
    mon, moves: Object.entries(moves)
      .map(([mv, count]) => ({ mv, count }))
      .sort((a,b) => b.count - a.count)
  }));

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        bgcolor: theme.palette.primary.main,
        color: theme.palette.common.white,
        minHeight: '100vh'
      }}
    >
      <Typography variant="h4" gutterBottom>
        Analytics for {stats.player}
      </Typography>
      <Typography variant="subtitle2" gutterBottom>
        Replays analyzed: {replayIds.length}
      </Typography>

      <Divider sx={{ my:2, borderColor: theme.palette.primary.light }} />

      <Grid container spacing={4}>
        {/* Your Pokémon */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Your Pokémon
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ bgcolor: theme.palette.primary.dark }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: theme.palette.common.white }}>Pokémon</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Games</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Win %</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Tera Count</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Tera Win %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {yourStats.map(row => (
                  <TableRow key={row.name}>
                    <TableCell sx={{ color: theme.palette.common.white }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ color: theme.palette.common.white }}>{row.played}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${row.winRate}%`}
                        color={row.winRate >= 50 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ color: theme.palette.common.white }}>{row.tera}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${row.teraWinRate}%`}
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        {/* Rival Pokémon */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Rival Pokémon
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ bgcolor: theme.palette.primary.dark }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: theme.palette.common.white }}>Pokémon</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>In Team</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Used</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Win %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rivalStats.map(row => (
                  <TableRow key={row.name}>
                    <TableCell sx={{ color: theme.palette.common.white }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ color: theme.palette.common.white }}>{row.teamAppeared}</TableCell>
                    <TableCell align="center" sx={{ color: theme.palette.common.white }}>{row.usedInBattle}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${row.winRate}%`}
                        color={row.winRate >= 50 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>

      <Divider sx={{ my:4, borderColor: theme.palette.primary.light }} />

      {/* Move Usage Count */}
      <Typography variant="h6" gutterBottom>
        Move Usage Count
      </Typography>
      {moveStats.map(({ mon, moves }) => (
        <Box key={mon} sx={{ mb:3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {mon}
          </Typography>
          <TableContainer
            component={Paper}
            sx={{ bgcolor: theme.palette.primary.dark }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: theme.palette.common.white }}>Move</TableCell>
                  <TableCell align="center" sx={{ color: theme.palette.common.white }}>Times Used</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moves.map(({ mv, count }) => (
                  <TableRow key={mv}>
                    <TableCell sx={{ color: theme.palette.common.white }}>{mv}</TableCell>
                    <TableCell align="center" sx={{ color: theme.palette.common.white }}>{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Box>
  );
}