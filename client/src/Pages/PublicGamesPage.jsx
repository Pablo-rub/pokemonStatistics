import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Typography,
  Box,
  Pagination,
  CircularProgress,
} from "@mui/material";
import ReplayCard from "../components/ReplayCard";
import { useAuth } from "../contexts/AuthContext";
import GameFilters from "../components/filters/GameFilters";

function PublicGamesPage() {
  const [games, setGames] = useState([]);
  const [numGames, setNumGames] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  
  const [availableFormats, setAvailableFormats] = useState([]);
  const [isLoadingFormats, setIsLoadingFormats] = useState(true);

  // Estados para los valores de los filtros en el formulario
  const [sortBy, setSortBy] = useState("date DESC");
  const [playerFilter, setPlayerFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [showSaved, setShowSaved] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const { currentUser } = useAuth();

  // Estados para los filtros activos
  const [activeFilters, setActiveFilters] = useState({
    sortBy: "date DESC",
    playerFilter: "",
    ratingFilter: "all",
    dateFilter: "all",
    showSaved: "all",
    formatFilter: "all",
  });

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

  const fetchPublicGames = useCallback(
    async (page, filters) => {
      try {
        setIsLoading(true);
        const response = await axios.get("/api/games", {
          params: {
            page,
            limit: itemsPerPage,
            sortBy: filters.sortBy,
            playerFilter: filters.playerFilter,
            ratingFilter: filters.ratingFilter,
            dateFilter: filters.dateFilter,
            showSaved: filters.showSaved,
            format: filters.formatFilter,
            userId: currentUser?.uid,
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
      formatFilter,
    });
  };

  const resetFilters = () => {
    setSortBy("date DESC");
    setPlayerFilter("");
    setRatingFilter("all");
    setDateFilter("all");
    setShowSaved("all");
    setFormatFilter("all");
    setCurrentPage(1);
    setActiveFilters({
      sortBy: "date DESC",
      playerFilter: "",
      ratingFilter: "all",
      dateFilter: "all",
      showSaved: "all",
      formatFilter: "all",
    });
  };

  useEffect(() => {
    fetchPublicGames(currentPage, activeFilters);
  }, [currentPage, activeFilters, fetchPublicGames]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const totalPages = Math.ceil((numGames || 0) / itemsPerPage);

  return (
    <Box component="main" sx={{ padding: { xs: 1, sm: 2 } }}>
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
        showSaved={showSaved}
        onShowSavedChange={setShowSaved}
        showSavedFilter={!!currentUser}
        onApply={applyFilters}
        onReset={resetFilters}
      />

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