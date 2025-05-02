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
  MenuItem
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
  const { currentUser, save } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (!currentUser) {
    return (
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
        <Typography variant="h5" align="center">
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
        <Typography variant="h5" align="center" color="text.secondary">
          No saved replays yet
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary">
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
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Saved Replays
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
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
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={e => setSortBy(e.target.value)}
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

      <Button
        variant="contained"
        disabled={analyticsReplays.length < 2}
        onClick={() => navigate('/battle-analytics')}
        sx={{ mt: 2 }}
      >
        View Analytics ({analyticsReplays.length})
      </Button>
    </Box>
  );
}

export default SavedGamesPage;