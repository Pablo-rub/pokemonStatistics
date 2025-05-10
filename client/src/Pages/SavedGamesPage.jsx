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

// todo
// sort by date

function SavedGamesPage() {
  const { currentUser, save, unsave } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unsaving, setUnsaving] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [analyticsReplays, setAnalyticsReplays] = useState(() => {
    const st = localStorage.getItem('analyticsReplays');
    return st ? JSON.parse(st) : [];
  });
  const [privateReplayId, setPrivateReplayId] = useState('');
  const [addError, setAddError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [sortBy, setSortBy] = useState("date DESC");
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const handleAddPrivateReplay = async () => {
    if (!privateReplayId) return;

    // extract replay ID from full URL
    const lastSegment = privateReplayId.trim().split('/').pop();
    const id = lastSegment?.split('-').pop();

    if (!id) {
      setAddError('Invalid replay URL');
      return;
    }

    try {
      setAddError('');
      const { data: game } = await axios.get(`/api/games/${id}`);
      await axios.post(`/api/users/${currentUser.uid}/saved-replays`, { replayId: id });
      
      // Añadir timestamp al juego antes de guardarlo en el estado
      const gameWithTimestamp = {
        ...game,
        ts: new Date(game.date).getTime()
      };
      
      setGames(prev => [gameWithTimestamp, ...prev]);
      save(id);
      setPrivateReplayId('');
    } catch (err) {
      if (err.response?.status === 404) {
        setAddError('Replay not found');
      } else {
        console.error(err);
        setAddError('Error adding replay');
      }
    }
  };

  const handleUnsaveAll = async () => {
    if (!currentUser) return;
    try {
      await Promise.all(
        games.map(g => unsave(g.replay_id))
      );
      setGames([]);
      setAnalyticsReplays([]);
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

  const sortedGames = [...games].sort((a, b) => {
    switch (sortBy) {
      case "date ASC":
        return a.ts - b.ts;
      case "date DESC":
        return b.ts - a.ts;
      case "rating ASC":
        return (a.rating || 0) - (b.rating || 0);
      case "rating DESC":
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
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

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3
        }}
      >
        {/* Add Private Replay (left side) */}
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

        {/* Sort control (right side) */}
        <FormControl size="small" sx={{ minWidth: 160, ml: 2 }}>
          <InputLabel
            id="saved-sort-by-label"
            htmlFor="saved-sort-by-select"
          >
            Sort by
          </InputLabel>
          <Select
            labelId="saved-sort-by-label"
            inputProps={{
              id: "saved-sort-by-select",
              "aria-labelledby": "saved-sort-by-label",
              style: { display: 'none' }
            }}
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            label="Sort by"
          >
            <MenuItem value="date DESC">Date ↓</MenuItem>
            <MenuItem value="date ASC">Date ↑</MenuItem>
            <MenuItem value="rating DESC">Rating ↓</MenuItem>
            <MenuItem value="rating ASC">Rating ↑</MenuItem>
          </Select>
        </FormControl>
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