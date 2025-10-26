import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Box,
  CircularProgress,
  Button,
  Alert,
  Pagination,
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
import GameFilters from "../components/filters/GameFilters";

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
  
  // Estados de filtros
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Estados para formatos disponibles
  const [availableFormats, setAvailableFormats] = useState([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(true);

  // Fetch formatos disponibles
  const fetchAvailableFormats = useCallback(async () => {
    try {
      setIsLoadingFormats(true);
      const response = await axios.get("/api/games/formats");
      
      if (response.data && response.data.formats) {
        setAvailableFormats(response.data.formats);
      }
    } catch (error) {
      console.error("Error fetching available formats:", error);
      setAvailableFormats([]);
    } finally {
      setIsLoadingFormats(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableFormats();
  }, [fetchAvailableFormats]);

  const applyFilters = () => {
    setPage(1);
    // Los filtros se aplican automáticamente en el useMemo de sortedGames
  };

  const resetFilters = () => {
    setSortBy("date DESC");
    setPlayerFilter("");
    setRatingFilter("all");
    setDateFilter("all");
    setFormatFilter("all");
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
      clearSavedReplays();
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

  // Función de filtrado mejorada (basada en gameFilters.js)
  const filterGames = (games, filters) => {
    let filtered = [...games];

    // Player filter
    if (filters.playerFilter.trim()) {
      const query = filters.playerFilter.toLowerCase();
      filtered = filtered.filter(game => 
        game.player1?.toLowerCase().includes(query) ||
        game.player2?.toLowerCase().includes(query)
      );
    }

    // Rating filter
    if (filters.ratingFilter !== 'all') {
      if (filters.ratingFilter === 'unknown') {
        filtered = filtered.filter(game => !game.rating || game.rating === 0);
      } else {
        const minRating = parseInt(filters.ratingFilter.replace('+', ''));
        filtered = filtered.filter(game => game.rating && game.rating >= minRating);
      }
    }

    // Date filter
    if (filters.dateFilter !== 'all') {
      const now = Date.now();
      const timeRanges = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      const range = timeRanges[filters.dateFilter];
      if (range) {
        filtered = filtered.filter(game => now - game.ts <= range);
      }
    }

    // Format filter
    if (filters.formatFilter !== 'all') {
      filtered = filtered.filter(game => game.format === filters.formatFilter);
    }

    // Sort
    const [field, order] = filters.sortBy.split(' ');
    filtered.sort((a, b) => {
      let valA, valB;
      
      if (field === 'date') {
        valA = a.ts || 0;
        valB = b.ts || 0;
      } else if (field === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
      }

      return order === 'DESC' ? valB - valA : valA - valB;
    });

    return filtered;
  };

  const sortedGames = filterGames(games, {
    sortBy,
    playerFilter,
    ratingFilter,
    dateFilter,
    formatFilter
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
          variant="h4"
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
        {sortedGames.length !== games.length && (
          <span style={{ marginLeft: 8, color: 'text.secondary' }}>
            (Showing {sortedGames.length})
          </span>
        )}
      </Typography>

      {/* Componente de filtros reutilizable */}
      <GameFilters
        sortBy={sortBy}
        onSortByChange={setSortBy}
        playerFilter={playerFilter}
        onPlayerFilterChange={setPlayerFilter}
        ratingFilter={ratingFilter}
        onRatingFilterChange={setRatingFilter}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        formatFilter={formatFilter}
        onFormatFilterChange={setFormatFilter}
        availableFormats={availableFormats}
        isLoadingFormats={isLoadingFormats}
        showSavedFilter={false}
        onApply={applyFilters}
        onReset={resetFilters}
        compact={true}
      />

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