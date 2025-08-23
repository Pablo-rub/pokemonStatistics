import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Alert,
  AlertTitle,
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
  useTheme,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { useNavigate } from "react-router-dom";
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend 
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoginDialog from '../components/LoginDialog';
import LoginIcon from '@mui/icons-material/Login';

export default function BattleAnalyticsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [stats, setStats]     = useState(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);
  const [rivalPage, setRivalPage] = useState(1);
  const [rivalSortBy, setRivalSortBy] = useState('teamAppeared');
  const [rivalSortDir, setRivalSortDir] = useState('desc');
  const [yourSortBy, setYourSortBy] = useState('played');
  const [yourSortDir, setYourSortDir] = useState('desc');
  const RIVAL_PAGE_SIZE = 10;

  const replayIds = useMemo(
    () => JSON.parse(localStorage.getItem('analyticsReplays')) || [],
    []
  );

  useEffect(() => {
    if (replayIds.length < 2) {
      setError('insufficient');
      setLoading(false);
      return;
    }
    axios.post('/api/multistats', { replayIds })
      .then(res => setStats(res.data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [replayIds]);

  useEffect(() => {
    if (!loading && stats) {
      const your = Object.keys(stats.usageCounts).filter(n => n !== 'none');
      const totalUnique = new Set(your).size;
      if (totalUnique > 6) {
        setError('Error: The selected replays must share the same team of 6 Pokémon.');
      }
    }
  }, [loading, stats]);

  // If no user session, prompt to sign in
  if (!currentUser) {
    return (
      <Box
        component="main"
        sx={{ maxWidth: 800, mx: 'auto', mt: 8, p: 3 }}
      >
        <Typography
          component="h1"
          variant="h"
          gutterBottom
        >
          Battle Analytics
        </Typography>
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 3
          }}
        >
          <Typography component="h2" variant="h5" align="center">
            Please sign in to see your battle statistics.
          </Typography>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => setLoginDialogOpen(true)}
          >
            Sign In
          </Button>
          <LoginDialog 
            open={loginDialogOpen} 
            onClose={() => setLoginDialogOpen(false)}
            isSignUp={false}
          />
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ textAlign:'center', mt:8 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }
  if (error) {
    if (error === 'insufficient') {
      return (
        <Box
          component="main"
          sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}
        >
          <Typography
            component="h1"
            variant="h4"
            gutterBottom
          >
            Battle Analytics
          </Typography>
          <Alert 
            severity="info" 
            sx={{ 
              backgroundColor: 'rgba(25, 118, 210, 0.12)', 
              color: '#ffffff',
              border: '1px solid rgba(25, 118, 210, 0.5)',
              mb: 4
            }}
          >
            <AlertTitle sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              More Replays Needed
            </AlertTitle>
            <Typography sx={{ mb: 2 }}>
              You need at least 2 replays to view battle statistics. Saved replays are used to analyze your battle patterns and provide insights about your gameplay.
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<SaveIcon />}
                onClick={() => navigate('/saved-games')}
              >
                Go to Saved Games
              </Button>
              <Button 
                variant="outlined" 
                color="inherit"
                startIcon={<InfoIcon />}
                onClick={() => navigate('/public-games')}
                sx={{ borderColor: '#ffffff', color: '#ffffff' }}
              >
                Find Public Games
              </Button>
            </Box>
          </Alert>
          
          <Paper sx={{ p: 3, backgroundColor: '#221FC7', color: '#ffffff' }}>
            <Typography
              variant="subtitle1"
              component="p"
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              How Battle Analytics Works
            </Typography>
            <Typography paragraph>
              Battle Analytics helps you understand your gameplay patterns by analyzing your saved replays. Here's how to get started:
            </Typography>
            <ol>
              <Typography component="li" sx={{ mb: 1 }}>
                Go to the "Public Games" section to find interesting matches
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                Save the games you want to analyze by clicking the bookmark icon
              </Typography>
              <Typography component="li" sx={{ mb: 1 }}>
                Return to "Saved Games" and mark the replays you want to analyze
              </Typography>
              <Typography component="li">
                Come back to this page to see detailed statistics about your battles
              </Typography>
            </ol>
          </Paper>
        </Box>
      );
    }
    
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
    .sort((a, b) =>
      yourSortDir === 'desc'
        ? b[yourSortBy] - a[yourSortBy]
        : a[yourSortBy] - b[yourSortBy]
    );

  // Prepare raw rival Pokémon stats
  const rawRivalStats = Object.keys(stats.rivalTeamCounts)
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
    });

  const rivalStats = [...rawRivalStats].sort((a, b) =>
    rivalSortDir === 'desc'
      ? b[rivalSortBy] - a[rivalSortBy]
      : a[rivalSortBy] - b[rivalSortBy]
  );

  const rivalCount = rivalStats.length;
  const rivalPages = Math.ceil(rivalCount / RIVAL_PAGE_SIZE);
  const rivalPageData = rivalStats.slice(
    (rivalPage - 1) * RIVAL_PAGE_SIZE,
    rivalPage * RIVAL_PAGE_SIZE
  );

  // Prepare move usage stats
  // Sólo incluir mons realmente usados (según usageCounts) y normalizar nombres
  const usedNamesSet = new Set(
    Object.keys(stats.usageCounts)
      .filter(n => n && n !== 'none')
      .map(n => n.toLowerCase())
  );

  const moveStats = Object.entries(stats.moveCounts)
    .filter(([mon]) => usedNamesSet.has(String(mon).toLowerCase()))
    .map(([mon, moves]) => ({
      mon,
      moves: Object.entries(moves)
        .map(([mv, count]) => ({ mv, count }))
        .sort((a, b) => b.count - a.count)
    }));

  // Define a palette of colors to cycle through
const PIE_COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];

  return (
    <Box component="main" sx={{ p: 2 }}>
      <Typography 
        component="h1"
        variant="h4"
        gutterBottom
      >
        Battle Analytics
      </Typography>
      <Box
        sx={{
          p: { xs: 2, md: 4 },
          bgcolor: theme.palette.primary.main,
          color: theme.palette.common.white,
          minHeight: '100vh'
        }}
      >
        <Typography variant="h6" component="p" gutterBottom>
          Analytics for {stats.player}
        </Typography>
        <Typography variant="body2" component="p" gutterBottom>
          Replays analyzed: {replayIds.length}
        </Typography>

        <Divider sx={{ my:2, borderColor: theme.palette.primary.light }} />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl size="small">
            <InputLabel>Your Sort By</InputLabel>
            <Select
              value={yourSortBy}
              label="Your Sort By"
              onChange={e => setYourSortBy(e.target.value)}
            >
              <MenuItem value="played">Games</MenuItem>
              <MenuItem value="winRate">Win Rate</MenuItem>
              <MenuItem value="tera">Tera Count</MenuItem>
              <MenuItem value="teraWinRate">Tera Win Rate</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Direction</InputLabel>
            <Select
              value={yourSortDir}
              label="Direction"
              onChange={e => setYourSortDir(e.target.value)}
            >
              <MenuItem value="desc">Desc</MenuItem>
              <MenuItem value="asc">Asc</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Grid container spacing={4}>
          {/* Your Pokémon */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" component="p" gutterBottom>
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
            {/* Sort control */}
            <Box
              sx={{
                mb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
            <Typography variant="h6" component="p" gutterBottom>
              Rival Pokémon
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small">
                <InputLabel
                  id="rival-sort-by-label"
                  htmlFor="rival-sort-by-select"
                >
                  Sort by
                </InputLabel>
                <Select
                  labelId="rival-sort-by-label"
                  inputProps={{
                    id: "rival-sort-by-select",
                    'aria-labelledby': 'rival-sort-by-label',
                    style: { display: 'none' }
                  }}
                  value={rivalSortBy}
                  onChange={e => setRivalSortBy(e.target.value)}
                  label="Sort by"
                >
                  <MenuItem value="teamAppeared">In Team</MenuItem>
                  <MenuItem value="usedInBattle">Used</MenuItem>
                  <MenuItem value="winRate">Win %</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small">
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={rivalSortDir}
                    onChange={e => setRivalSortDir(e.target.value)}
                    label="Direction"
                  >
                    <MenuItem value="desc">Desc</MenuItem>
                    <MenuItem value="asc">Asc</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

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
                  {rivalPageData.map(row => (
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

            {/* Pagination controls */}
            {rivalPages > 1 && (
              <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
                <Pagination
                  count={rivalPages}
                  page={rivalPage}
                  onChange={(e, v) => setRivalPage(v)}
                  color="secondary"
                  size="small"
                />
              </Box>
            )}
          </Grid>
        </Grid>

        <Divider sx={{ my:4, borderColor: theme.palette.primary.light }} />

        <Typography variant="h6" component="p" gutterBottom>
          Move Usage Distribution
        </Typography>

        <Grid container spacing={4}>
          {moveStats.map(({ mon, moves }) => {
            // Total count of times this mon's moves were used
            const totalUses = moves.reduce((sum, mv) => sum + mv.count, 0);

            return (
              <Grid key={mon} item xs={12} sm={6} md={4}>
                <Typography
                  variant="body1"
                  component="p"
                  gutterBottom
                >
                  {mon}
                </Typography>
                <Paper sx={{ p:2, bgcolor: theme.palette.primary.dark }}>
                  {totalUses > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={moves}
                          dataKey="count"
                          nameKey="mv"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                        >
                          {moves.map((entry, idx) => (
                            <Cell 
                              key={`cell-${mon}-${idx}`} 
                              fill={PIE_COLORS[idx % PIE_COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value, name) => [`${value}`, name]}
                          separator=": "
                          contentStyle={{
                            backgroundColor: theme.palette.primary.main,
                            border: 'none',
                            borderRadius: 8,
                            padding: '8px'
                          }}
                          itemStyle={{ color: theme.palette.common.white }}
                        />
                        <RechartsLegend 
                          verticalAlign="bottom" 
                          layout="horizontal"
                          wrapperStyle={{ 
                            color: theme.palette.common.white,
                            paddingTop: 10
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box
                      sx={{
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography color="common.white" variant="body2">
                        No move usage data available
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
}