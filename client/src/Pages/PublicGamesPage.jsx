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

// todo
// accesible filters
// improve performance
// si no has iniciado sesion, no puedes guardar replay (pulsar corazon)

function PublicGamesPage() {
  // Estados actuales
  const [games, setGames] = useState([]);
  const [numGames, setNumGames] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para los valores de los filtros en el formulario
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Estados para los filtros activos (los que realmente se aplican)
  const [activeFilters, setActiveFilters] = useState({
    sortBy: "date DESC",
    playerFilter: "",
    ratingFilter: "all",
    dateFilter: "all"
  });

  const fetchPublicGames = useCallback(async (page, filters) => {
    try {
      setIsLoading(true);
      const response = await axios.get("http://localhost:5000/api/games", {
        params: { 
          page, 
          limit: itemsPerPage, 
          ...filters
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
  }, [itemsPerPage]);

  const applyFilters = () => {
    setCurrentPage(1);
    setActiveFilters({
      sortBy,
      playerFilter,
      ratingFilter,
      dateFilter
    });
  };

  const resetFilters = () => {
    setSortBy("date DESC");
    setPlayerFilter("");
    setRatingFilter("all");
    setDateFilter("all");
    setCurrentPage(1);
    setActiveFilters({
      sortBy: "date DESC",
      playerFilter: "",
      ratingFilter: "all",
      dateFilter: "all"
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
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2, 
          flexWrap: 'wrap',
          marginBottom: 2
        }}>
          {/* Sort dropdown */}
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              displayEmpty
              renderValue={(value) => `Sort by: ${value}`}
              size="small" // Añadido para igualar altura con otros elementos
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
            sx={{ 
              minWidth: 200,
              bgcolor: '#C7ADBE',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'transparent',
                },
              },
            }}
          />

          {/* Rating filter */}
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              displayEmpty
              renderValue={(value) => `Rating: ${value}`}
              size="small" // Añadido para igualar altura
            >
              <MenuItem value="all">All Ratings</MenuItem>
              <MenuItem value="unknown">Unknown</MenuItem>
              <MenuItem value="1200+">&gt;1200</MenuItem>
              <MenuItem value="1500+">&gt;1500</MenuItem>
              <MenuItem value="1800+">&gt;1800</MenuItem>
            </Select>
          </FormControl>

          {/* Date filter */}
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              displayEmpty
              renderValue={(value) => `Date: ${value}`}
              size="small" // Añadido para igualar altura
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>

          {/* Search button */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={applyFilters}
            sx={{ 
              height: '40px',
              bgcolor: '#C7ADBE',
              color: 'black',
              '&:hover': {
                bgcolor: '#B399AA',
              }
            }}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            onClick={resetFilters}
            sx={{ 
              height: '40px',
              borderColor: '#C7ADBE',
              color: '#C7ADBE',
              '&:hover': {
                borderColor: '#B399AA',
                bgcolor: 'transparent',
              }
            }}
          >
            Reset Filters
          </Button>
        </Box>
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