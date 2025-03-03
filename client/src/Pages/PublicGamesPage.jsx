import React, { useState, useEffect } from "react";
import axios from "axios";
import { Typography, Box, Pagination } from "@mui/material";
import ReplayCard from "../components/ReplayCard";

function PublicGamesPage() {
  const [games, setGames] = useState([]);
  const [numGames, setNumGames] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchTotalCount = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/games/count");
      setNumGames(response.data.numGames);
    } catch (error) {
      console.error("Error fetching total count:", error);
    }
  };

  const fetchPublicGames = async (page) => {
    try {
      const response = await axios.get("http://localhost:5000/api/games", {
        params: { page, limit: itemsPerPage },
      });
      setGames(response.data);
    } catch (error) {
      console.error("Error fetching public games:", error);
    }
  };

  useEffect(() => {
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchPublicGames(currentPage);
  }, [currentPage]);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const totalPages = numGames !== null ? Math.ceil(numGames / itemsPerPage) : 0;

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Public Games
      </Typography>
      <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
        Total Replays: {numGames === null ? "Cargando..." : numGames}
      </Typography>
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
    </Box>
  );
}

export default PublicGamesPage;