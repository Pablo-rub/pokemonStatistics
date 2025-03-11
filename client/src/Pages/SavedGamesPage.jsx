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
import axios from "axios";
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LoginIcon from '@mui/icons-material/Login';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginDialog from "../components/LoginDialog"; // Import LoginDialog

//todo
//subir partidas pasando url

function SavedGamesPage() {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0); // Add this state
  const [loginDialogOpen, setLoginDialogOpen] = useState(false); // Add this state

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    const fetchSavedGames = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/users/${currentUser.uid}/saved-replays`);
        setGames(response.data || []);
      } catch (error) {
        console.error("Error fetching saved games:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedGames();
  }, [currentUser, refreshKey]); // Add refreshKey to dependencies

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
          onClick={() => setLoginDialogOpen(true)} // Change this instead of navigating
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

  if (isLoading) {
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Saved Replays</Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        Total Saved: {games.length}
      </Typography>

      {games.map((game) => (
        <ReplayCard key={game.replay_id} game={game} />
      ))}
    </Box>
  );
}

export default SavedGamesPage;