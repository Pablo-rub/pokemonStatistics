import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Button,
  TextField,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios';
import LoginIcon from '@mui/icons-material/Login';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LoginDialog from "../components/LoginDialog";
import { filterAndSortGames, ClearFiltersButton } from '../utils/gameFilters';

function SavedGamesPage() {
  const { currentUser, clearSavedReplays } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsaving, setUnsaving] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [analyticsReplays, setAnalyticsReplays] = useState(() => {
    const st = localStorage.getItem('analyticsReplays');
    return st ? JSON.parse(st) : [];
  });
  const [addError, setAddError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const resetFilters = () => {
    setPlayerFilter('');
    setRatingFilter('all');
    setDateFilter('all');
    setFormatFilter('all');
    setPage(1);
  };

  useEffect(() => {
    localStorage.setItem('analyticsReplays', JSON.stringify(analyticsReplays));
  }, [analyticsReplays]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    axios.get(`/api/users/${currentUser.uid}/saved-replays`)
      .then(res => {
        const withTimestamps = res.data.map(game => ({
          ...game,
          ts: new Date(game.date).getTime()
        }));
        setGames(withTimestamps);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  const handleToggleAnalytics = id => {
    setAnalyticsReplays(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleUnsaveAll = async () => {
    if (!currentUser) return;
    try {
      await axios.delete(`/api/users/${currentUser.uid}/saved-replays`);
      setGames([]);
      setAnalyticsReplays([]);
      clearSavedReplays();      // ← actualiza contexto
    } catch (err) {
      console.error("Error unsaving all:", err);
    }
  };

  const handleConfirmUnsaveAll = async () => {
    setConfirmOpen(false);
    setUnsaving(true);
    await handleUnsaveAll();
    setUnsaving(false);
  };

  const sortedGames = filterAndSortGames(games, {
    sortBy, playerFilter, ratingFilter, dateFilter, formatFilter
  });

  const totalPages = Math.ceil(sortedGames.length / PAGE_SIZE);
  const pageGames = sortedGames.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  if (unsaving) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

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
          Saved Games
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
            Please sign in to see your saved replays
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
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (games.length === 0) {
    return (
      <Box 
        component="main"
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 3
        }}
      >
        <BookmarkBorderIcon sx={{ fontSize: 60, color: 'grey.500' }} />
        <Typography 
          variant="h5" 
          component="h1"
          align="center" 
          color="text.primary"
          gutterBottom
        >
          No saved replays yet
        </Typography>
        <Typography 
          variant="body1" 
          component="p"
          align="center" 
          color="text.primary"
        >
          Start saving replays by clicking the heart icon on any replay in the Public Games section
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/public-games')}
        >
          Browse Public Games
        </Button>
      </Box>
    );
  }

  return (
    <Box component="main" sx={{ padding: 2 }}>
      <Typography 
        component="h1"
        variant="h4" 
        gutterBottom
        sx={{ marginBottom: 2 }}
      >
        Saved Replays
      </Typography>
      <Typography 
        variant="subtitle1"
        component="p"
        sx={{ marginBottom: 2 }}
      >
        Total Saved: {games.length}
      </Typography>

      {/* Uncomment this section if you want to add a private replay URL input */}
      {/*
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            // Limita el ancho total del formulario de añadir replay
            width: { xs: '100%', sm: '60%', md: '45%', lg: '35%' }
          }}
        >
          <TextField
            label="Private Replay Url"
            variant="outlined"
            size="small"
            fullWidth
            value={privateReplayId}
            onChange={e => setPrivateReplayId(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={handleAddPrivateReplay}
            disabled={!privateReplayId}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add Replay
          </Button>
        </Box>
      </Box>
      */}

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Player"
          size="small"
          value={playerFilter}
          onChange={e => setPlayerFilter(e.target.value)}
        />
        <FormControl size="small">
          <InputLabel>Rating</InputLabel>
          <Select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} label="Rating">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="unknown">Unknown</MenuItem>
            <MenuItem value="1200+">&gt;1200</MenuItem>
            <MenuItem value="1500+">&gt;1500</MenuItem>
            <MenuItem value="1800+">&gt;1800</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Date</InputLabel>
          <Select value={dateFilter} onChange={e => setDateFilter(e.target.value)} label="Date">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="week">Last Week</MenuItem>
            <MenuItem value="month">Last Month</MenuItem>
            <MenuItem value="year">Last Year</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small">
          <InputLabel>Format</InputLabel>
          <Select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} label="Format">
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="[Gen 9] VGC 2025 Reg G (Bo3)">Reg G</MenuItem>
            <MenuItem value="[Gen 9] VGC 2025 Reg I (Bo3)">Reg I</MenuItem>
          </Select>
        </FormControl>
        <ClearFiltersButton onClear={resetFilters} />
      </Box>

      {addError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {addError}
        </Alert>
      )}

      {pageGames.map((game) => (
        <ReplayCard
          key={game.replay_id}
          game={game}
          showAnalyze
          showAnalytics
          onToggleAnalytics={handleToggleAnalytics}
          isInAnalytics={analyticsReplays.includes(game.replay_id)}
        />
      ))}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            color="secondary"
            size="small"
          />
        </Box>
      )}

      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          disabled={analyticsReplays.length < 2}
          onClick={() => navigate('/battle-analytics')}
        >
          View Analytics ({analyticsReplays.length})
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          disabled={games.length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Unsave All
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <DialogTitle>Confirm Unsave All</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove all saved replays? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmUnsaveAll}
          >
            Unsave All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SavedGamesPage;