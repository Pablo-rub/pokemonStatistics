import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Typography,
  Box,
  Pagination,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  InputLabel,
} from "@mui/material";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";

//todo
//filtrar por formato

function PublicGamesPage() {
  // Estados actuales
  const [games, setGames] = useState([]);
  const [numGames, setNumGames] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para los valores de los filtros en el formulario
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showSaved, setShowSaved] = useState("all");
  const { currentUser } = useAuth();

  // Estados para los filtros activos (los que realmente se aplican)
  const [activeFilters, setActiveFilters] = useState({
    sortBy: "date DESC",
    playerFilter: "",
    ratingFilter: "all",
    dateFilter: "all",
    showSaved: "all",
  });

  const fetchPublicGames = useCallback(
    async (page, filters) => {
      try {
        setIsLoading(true);
        const response = await axios.get("/api/games", {
          params: {
            page,
            limit: itemsPerPage,
            ...filters,
            userId: currentUser?.uid,
            showSaved: filters.showSaved,
          },
        });

        if (response.data) {
          setGames(response.data.games || []);
          setNumGames(response.data.total);
        }
      } catch (error) {
        console.error("Error fetching public games:", error);
        setGames([]);
        setNumGames(0);
      } finally {
        setIsLoading(false);
      }
    },
    [itemsPerPage, currentUser]
  );

  const applyFilters = () => {
    setCurrentPage(1);
    setActiveFilters({
      sortBy,
      playerFilter,
      ratingFilter,
      dateFilter,
      showSaved,
    });
  };

  const resetFilters = () => {
    setSortBy("date DESC");
    setPlayerFilter("");
    setRatingFilter("all");
    setDateFilter("all");
    setShowSaved("all");
    setCurrentPage(1);
    setActiveFilters({
      sortBy: "date DESC",
      playerFilter: "",
      ratingFilter: "all",
      dateFilter: "all",
      showSaved: "all",
    });
  };

  // Este useEffect ahora depende de activeFilters en lugar de los estados individuales
  useEffect(() => {
    fetchPublicGames(currentPage, activeFilters);
  }, [currentPage, activeFilters, fetchPublicGames]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const totalPages = Math.ceil((numGames || 0) / itemsPerPage);

  return (
    <Box sx={{ padding: { xs: 1, sm: 2 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Public Games
      </Typography>
      <Typography variant="subtitle1" component="p" sx={{ marginBottom: 2 }}>
        Total Replays:{" "}
        {isLoading ? (
          <CircularProgress size={20} sx={{ ml: 1 }} />
        ) : (
          numGames
        )}
      </Typography>

      {/* Filters row - improved with responsive Grid layout */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Sort dropdown */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <FormControl fullWidth size="small">
              <InputLabel 
                id="sort-by-label" 
                htmlFor="sort-by-select"
              >
                Sort by
              </InputLabel>
              <Select
                labelId="sort-by-label"
                inputProps={{
                  id: "sort-by-select",
                  "aria-labelledby": "sort-by-label",
                  style: { display: "none" }
                }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort by"
              >
                <MenuItem value={"date DESC"}>Date Descending</MenuItem>
                <MenuItem value={"date ASC"}>Date Ascending</MenuItem>
                <MenuItem value={"rating DESC"}>Rating Descending</MenuItem>
                <MenuItem value={"rating ASC"}>Rating Ascending</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Player search */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <TextField
              label="Search by player"
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
              size="small"
              fullWidth
            />
          </Grid>

          {/* Rating filter */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <FormControl fullWidth size="small">
              <InputLabel 
                id="rating-filter-label" 
                htmlFor="rating-filter-select"
              >
                Rating
              </InputLabel>
              <Select
                labelId="rating-filter-label"
                inputProps={{
                  id: "rating-filter-select",
                  "aria-labelledby": "rating-filter-label",
                  style: { display: "none" }
                }}
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                label="Rating"
              >
                <MenuItem value="all">All Ratings</MenuItem>
                <MenuItem value="unknown">Unknown</MenuItem>
                <MenuItem value="1200+">&gt;1200</MenuItem>
                <MenuItem value="1500+">&gt;1500</MenuItem>
                <MenuItem value="1800+">&gt;1800</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Date filter */}
          <Grid item xs={12} sm={6} md={4} lg={2}>
            <FormControl fullWidth size="small">
              <InputLabel 
                id="date-filter-label" 
                htmlFor="date-filter-select"
              >
                Date
              </InputLabel>
              <Select
                labelId="date-filter-label"
                inputProps={{
                  id: "date-filter-select",
                  "aria-labelledby": "date-filter-label",
                  style: { display: "none" }
                }}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                label="Date"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Last Week</MenuItem>
                <MenuItem value="month">Last Month</MenuItem>
                <MenuItem value="year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Show saved filter - only displayed for logged-in users */}
          {currentUser && (
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <FormControl fullWidth size="small">
                <InputLabel id="show-saved-label">Show</InputLabel>
                <Select
                  labelId="show-saved-label"
                  id="show-saved-select"
                  value={showSaved}
                  onChange={(e) => setShowSaved(e.target.value)}
                  label="Show"
                >
                  <MenuItem value="all">All Replays</MenuItem>
                  <MenuItem value="unsaved">Unsaved Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Action buttons */}
          <Grid
            item
            xs={12}
            sm={12}
            md={12}
            lg={currentUser ? 2 : 4}
            sx={{ display: "flex", gap: 1 }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={applyFilters}
              fullWidth
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                  backgroundColor: (theme) => theme.palette.primary.dark,
                }
              }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={resetFilters}
              fullWidth
              sx={{
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 1,
                  borderColor: (theme) => theme.palette.secondary.dark,
                  backgroundColor: 'rgba(156, 39, 176, 0.04)', // Slight purple background
                }
              }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Loading state */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Game cards */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {games.map((game) => (
              <ReplayCard key={game.replay_id} game={game} />
            ))}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 4, display: "flex", justifyContent: "center" }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

export default PublicGamesPage;