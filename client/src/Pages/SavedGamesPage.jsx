import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios';
import LoginIcon from '@mui/icons-material/Login';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LoginDialog from "../components/LoginDialog";

function SavedGamesPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Añadir estado para controlar el diálogo de login
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  // Estado con persistencia en localStorage
  const [analyticsReplays, setAnalyticsReplays] = useState(() => {
    const st = localStorage.getItem('analyticsReplays');
    return st ? JSON.parse(st) : [];
  });
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

      {games.map((game, index) => (
        <ReplayCard
          key={game.replay_id}
          game={game}
          showAnalyze
          showAnalytics
          onToggleAnalytics={handleToggleAnalytics}
          isInAnalytics={analyticsReplays.includes(game.replay_id)}
        />
      ))}
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