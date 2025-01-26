import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import axios from "axios";

function Games() {
    const [numGames, setNumGames] = useState(null);
    const [games, setGames] = useState([]);

    useEffect(() => {
        const fectchNumGames = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/games/count");
                console.log("Response:", response);
                setNumGames(response.data.numGames);
            } catch (error) {
                console.error("Error fetching Games:", error);
            }
        };
        fectchNumGames();

        const fetchGames = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/public-games");
                console.log("Response:", response);
                setGames(response.data);
            } catch (error) {
                console.error("Error fetching Games:", error);
            }
        };
        fetchGames();
    }, []);

    return (
        <div>
            <h1>My Games</h1>
            <Button href="/" variant="primary">Home</Button>
            <div>Total number of games: {numGames !== null ? numGames : "Loading..."} </div>
            <ul>
                {games.map((game, index) => (
                    <li key={index}>
                        <h3>Game ID: {game.replay_id}</h3>
                        <p>Format: {game.format}</p>
                        <p>Player 1: {game.player1} vs Player 2: {game.player2}</p>
                        <p>Winner: {game.winner}</p>
                        <p>Date: {new Date(game.date).toLocaleDateString()}</p>
                        <h4>Turns:</h4>
                        <ul>
                            {game.turns.map((turn, turnIndex) => (
                                <li key={turnIndex}>
                                    <p>Turn {turn.turn_number}:</p>
                                    <div>Fainted Pokemons Player 1: {turn.fainted_pokemon.player1.join(", ")}</div>
                                    <div>Fainted Pokemons de Player 2: {turn.fainted_pokemon.player2.join(", ")}</div>
                                    <div>Field: {turn.field?.terrain || "None"}</div>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Games;
