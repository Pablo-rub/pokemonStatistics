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
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import LoginIcon from '@mui/icons-material/Login';
import LoginDialog from "../components/LoginDialog";

function SavedGamesPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return setLoading(false);
    const colRef = collection(db, 'users', currentUser.uid, 'savedReplays');
    const unsub = onSnapshot(colRef, snap => {
      setGames(snap.docs.map(d => d.data()));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

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
        <ReplayCard key={index} game={game} />
      ))}
    </Box>
  );
}

export default SavedGamesPage;