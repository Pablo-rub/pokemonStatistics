import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Button,
  TextField,
  Alert,
  Pagination
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios';
import LoginIcon from '@mui/icons-material/Login';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LoginDialog from "../components/LoginDialog";

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

  useEffect(() => {
    localStorage.setItem('analyticsReplays', JSON.stringify(analyticsReplays));
  }, [analyticsReplays]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    axios.get(`/api/users/${currentUser.uid}/saved-replays`)
      .then(res => setGames(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [currentUser]);

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
      setGames(prev => [game, ...prev]);
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

  const totalPages = Math.ceil(games.length / PAGE_SIZE);
  const pageGames = games.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" sx={{ marginBottom: 2 }}>
        Saved Replays
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        Total Saved: {games.length}
      </Typography>

      {/* Add Private Replay */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
        >
          Add Replay
        </Button>
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