import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import SEO from "../components/SEO";

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
  
  // ✅ Estados TEMPORALES de filtros (en el formulario)
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ Estados ACTIVOS de filtros (aplicados)
  const [activeFilters, setActiveFilters] = useState({
    sortBy: "date DESC",
    playerFilter: "",
    ratingFilter: "all",
    dateFilter: "all",
    formatFilter: "all",
  });

  const [availableFormats, setAvailableFormats] = useState([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(true);

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

  // ✅ RESTAURADO: Función applyFilters (como PublicGamesPage)
  const applyFilters = () => {
    setPage(1);
    setActiveFilters({
      sortBy,
      playerFilter,
      ratingFilter,
      dateFilter,
      formatFilter,
    });
  };

  const resetFilters = () => {
    const defaultFilters = {
      sortBy: "date DESC",
      playerFilter: "",
      ratingFilter: "all",
      dateFilter: "all",
      formatFilter: "all",
    };
    
    // Actualizar estados temporales
    setSortBy(defaultFilters.sortBy);
    setPlayerFilter(defaultFilters.playerFilter);
    setRatingFilter(defaultFilters.ratingFilter);
    setDateFilter(defaultFilters.dateFilter);
    setFormatFilter(defaultFilters.formatFilter);
    
    // Actualizar estados activos
    setActiveFilters(defaultFilters);
    setPage(1);
  };

  useEffect(() => {
    localStorage.setItem('analyticsReplays', JSON.stringify(analyticsReplays));
  }, [analyticsReplays]);

  // ✅ Función para extraer fecha del formato {value: "..."}
  const extractDateValue = useCallback((dateField) => {
    if (dateField && typeof dateField === 'object' && dateField.value) {
      return dateField.value;
    }
    if (typeof dateField === 'string') {
      return dateField;
    }
    if (dateField instanceof Date) {
      return dateField.toISOString();
    }
    if (typeof dateField === 'number') {
      return new Date(dateField).toISOString();
    }
    return null;
  }, []);

  // ✅ Cargar juegos guardados
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    console.log('📡 Fetching saved replays...');
    
    axios.get(`/api/users/${currentUser.uid}/saved-replays`)
      .then(res => {
        console.log('📊 Raw API response:', res.data);
        
        if (res.data && res.data.length > 0) {
          console.log('📋 First game raw:', {
            replay_id: res.data[0].replay_id,
            date: res.data[0].date,
            dateType: typeof res.data[0].date,
            dateKeys: res.data[0].date ? Object.keys(res.data[0].date) : 'N/A'
          });
        }
        
        const withTimestamps = res.data.map(game => {
          const dateString = extractDateValue(game.date);
          const ts = dateString ? new Date(dateString).getTime() : 0;
          const isValid = ts > 0 && !isNaN(ts);
          
          if (!isValid) {
            console.warn(`⚠️ Invalid date for ${game.replay_id}:`, {
              originalDate: game.date,
              extractedString: dateString,
              parsedTimestamp: ts
            });
          }
          
          return {
            ...game,
            date: dateString || game.date,
            ts,
            _parsedDate: isValid ? new Date(ts).toISOString() : 'INVALID'
          };
        });
        
        setGames(withTimestamps);
        
        const validDates = withTimestamps.filter(g => g.ts > 0).length;
        const invalidDates = withTimestamps.filter(g => g.ts === 0).length;
        
        console.log('✅ Processed saved games:', {
          total: withTimestamps.length,
          validDates,
          invalidDates,
          successRate: `${((validDates / withTimestamps.length) * 100).toFixed(1)}%`,
          sample: withTimestamps.slice(0, 3).map(g => ({
            replay_id: g.replay_id,
            date: g.date,
            ts: g.ts,
            _parsedDate: g._parsedDate
          }))
        });
        
        if (invalidDates > 0) {
          console.error(`❌ ${invalidDates} games have invalid dates!`);
        }
      })
      .catch(err => console.error('❌ Error loading saved games:', err))
      .finally(() => setLoading(false));
  }, [currentUser, extractDateValue]);

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

  // ✅ CAMBIO: useMemo usa activeFilters (no estados temporales)
  const sortedGames = useMemo(() => {
    console.log('🔍 Filtering games with ACTIVE filters:', activeFilters);
    console.log('   Total games:', games.length);
    
    let filtered = [...games];

    // Player filter
    if (activeFilters.playerFilter.trim()) {
      const query = activeFilters.playerFilter.toLowerCase();
      filtered = filtered.filter(game => 
        game.player1?.toLowerCase().includes(query) ||
        game.player2?.toLowerCase().includes(query)
      );
      console.log('   After player filter:', filtered.length);
    }

    // Rating filter
    if (activeFilters.ratingFilter !== 'all') {
      if (activeFilters.ratingFilter === 'unknown') {
        filtered = filtered.filter(game => !game.rating || game.rating === 0);
      } else {
        const minRating = parseInt(activeFilters.ratingFilter.replace('+', ''));
        filtered = filtered.filter(game => game.rating && game.rating >= minRating);
      }
      console.log('   After rating filter:', filtered.length);
    }

    // Date filter (time range)
    if (activeFilters.dateFilter !== 'all') {
      const now = Date.now();
      const timeRanges = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000
      };
      const range = timeRanges[activeFilters.dateFilter];
      if (range) {
        const beforeFilter = filtered.length;
        filtered = filtered.filter(game => {
          const gameTime = game.ts || 0;
          return gameTime > 0 && (now - gameTime) <= range;
        });
        console.log(`   After date range filter: ${filtered.length} (from ${beforeFilter})`);
      }
    }

    // Format filter
    if (activeFilters.formatFilter !== 'all') {
      filtered = filtered.filter(game => game.format === activeFilters.formatFilter);
      console.log('   After format filter:', filtered.length);
    }

    // Sort
    const [field, order] = activeFilters.sortBy.split(' ');
    console.log(`   Sorting by: ${field} ${order}`);
    
    filtered.sort((a, b) => {
      let valA, valB;
      
      if (field === 'date') {
        valA = a.ts || 0;
        valB = b.ts || 0;
        
        if (filtered.indexOf(a) < 2) {
          console.log(`   Date comparison: ${a.replay_id} (${a._parsedDate}) vs ${b.replay_id} (${b._parsedDate})`);
          console.log(`       Timestamps: ${valA} vs ${valB}`);
        }
        
      } else if (field === 'rating') {
        valA = a.rating || 0;
        valB = b.rating || 0;
        
        if (filtered.indexOf(a) < 2) {
          console.log(`   Rating comparison: ${a.replay_id} (${valA}) vs ${b.replay_id} (${valB})`);
        }
      }

      return order === 'DESC' ? valB - valA : valA - valB;
    });
    
    console.log('   First 3 after sort:', filtered.slice(0, 3).map(g => ({
      replay_id: g.replay_id,
      ts: g.ts,
      _parsedDate: g._parsedDate,
      rating: g.rating
    })));

    console.log('✅ Final filtered count:', filtered.length);
    return filtered;
  }, [games, activeFilters]); // ✅ Depende de activeFilters, no de estados temporales

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
        <SEO 
          title="My Saved Games"
          description="View and manage your saved Pokémon VGC battle replays. Sign in to access your personal collection."
          keywords="saved battles, pokemon replays, my games, vgc replays, battle history, saved matches"
        />
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
        <SEO 
          title="Loading Saved Games..."
          description="Loading your saved Pokémon VGC battle replays."
          keywords="saved battles, loading"
        />
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
        <SEO 
          title="No Saved Games"
          description="You haven't saved any battle replays yet. Start saving replays to build your personal collection."
          keywords="saved battles, no games, pokemon replays"
        />
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
      <SEO 
        title={`My Saved Games (${games.length})`}
        description={`View and manage your ${games.length} saved Pokémon VGC battle replays. Analyze your matches and track your competitive performance.`}
        keywords={`saved battles, pokemon replays, my games, vgc replays, battle history, saved matches, ${games.length} replays`}
      />
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

      {/* ✅ RESTAURADO: onApply prop */}
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

      {sortedGames.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.primary">
            No replays match the current filters
          </Typography>
          <Button
            variant="outlined"
            onClick={resetFilters}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Box>
      ) : (
        <>
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
        </>
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