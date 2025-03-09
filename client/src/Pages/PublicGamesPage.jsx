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
} from "@mui/material";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";

//todo
//improve performance
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
  const [showSaved, setShowSaved] = useState('all');
  const { currentUser } = useAuth();

  // Estados para los filtros activos (los que realmente se aplican)
  const [activeFilters, setActiveFilters] = useState({
    sortBy: "date DESC",
    playerFilter: "",
    ratingFilter: "all",
    dateFilter: "all",
    showSaved: "all"
  });

  const fetchPublicGames = useCallback(async (page, filters) => {
    try {
      setIsLoading(true);
      const response = await axios.get("http://localhost:5000/api/games", {
        params: { 
          page, 
          limit: itemsPerPage, 
          ...filters,
          userId: currentUser?.uid,
          showSaved: filters.showSaved
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
  }, [itemsPerPage, currentUser]);

  const applyFilters = () => {
    setCurrentPage(1);
    setActiveFilters({
      sortBy,
      playerFilter,
      ratingFilter,
      dateFilter,
      showSaved
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
      showSaved: "all"
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
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Public Games
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        Total Replays:{' '}
        {isLoading ? (
          <CircularProgress size={20} sx={{ ml: 1 }} />
        ) : (
          numGames
        )}
      </Typography>

      {/* Filters row */}
        <Box variant="filter">
          {/* Sort dropdown */}
          <FormControl>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              displayEmpty
              renderValue={(value) => `Sort by: ${value}`}
            >
              <MenuItem value={"date DESC"}>Date Descending</MenuItem>
              <MenuItem value={"date ASC"}>Date Ascending</MenuItem>
              <MenuItem value={"rating DESC"}>Rating Descending</MenuItem>
              <MenuItem value={"rating ASC"}>Rating Ascending</MenuItem>
            </Select>
          </FormControl>

          {/* Player search */}
          <TextField
            placeholder="Search by player"
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            size="small"
          />

          {/* Rating filter */}
          <FormControl>
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              displayEmpty
              renderValue={(value) => `Rating: ${value}`}
            >
              <MenuItem value="all">All Ratings</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
              <MenuItem value="1200+">&gt;1200</MenuItem>
              <MenuItem value="1500+">&gt;1500</MenuItem>
              <MenuItem value="1800+">&gt;1800</MenuItem>
            </Select>
          </FormControl>

          {/* Date filter */}
          <FormControl>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              displayEmpty
              renderValue={(value) => `Date: ${value}`}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>

          {/* Show saved filter */}
          {currentUser && (
            <FormControl>
              <Select
                value={showSaved}
                onChange={(e) => setShowSaved(e.target.value)}
                displayEmpty
                renderValue={(value) => `Show: ${value}`}
              >
                <MenuItem value="all">All Replays</MenuItem>
                <MenuItem value="unsaved">Unsaved Only</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Apply button */}
          <Button
            variant="containedSuccess"
            onClick={applyFilters}
          >
            Apply Filters
          </Button>
          <Button
            variant="containedSecondary"
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </Box>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {games.map((game) => (
            <ReplayCard key={game.replay_id} game={game} />
          ))}
          {totalPages > 1 && (
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              sx={{ marginTop: 2, display: "flex", justifyContent: "center" }}
            />
          )}
        </>
      )}
    </Box>
  );
}

export default PublicGamesPage;