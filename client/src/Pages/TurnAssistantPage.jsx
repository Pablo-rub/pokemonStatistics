import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";

function TurnAssistantPage() {
    const [pokemon, setPokemon] = useState([]);

    useEffect(() => {
        const fetchPokemon = async () => {
            try {
                const examplePokemon = ["None", "Charizard", "Blastoise", "Venusaur", "Pikachu"];
                setPokemon(examplePokemon);
            } catch (error) {
                console.error("Error fetching Pokemon:", error);
            }
        };

        fetchPokemon();
    }, []);

    return (
        <div>
            <h1>Turn Assistant</h1>
            <Button href="/"> Home </Button>
            <p>
                Format:
                <select>
                    <option value="1"> [Gen 9] VGC 2024 Reg H (Bo3) </option>
                </select>
            </p>

            <p>
                Opponent's Pokemon 1:
                <select>
                    {pokemon.map((poke, index) => (
                        <option key={index} value={poke}>{poke}</option>
                    ))}
                </select>
                Object (optional):
                moves (optional):
            </p>

            <p>
                Opponent's Pokemon 2:
                <select>
                    {pokemon.map((poke, index) => (
                        <option key={index} value={poke}>{poke}</option>
                    ))}
                </select>
                Object (optional):
                moves (optional):
            </p>

            <p>
                Your Pokemon 1:
                <select>
                    {pokemon.map((poke, index) => (
                        <option key={index} value={poke}>{poke}</option>
                    ))}
                </select>
                Object (optional):
                moves (optional):
            </p>

            <p>
                Your Pokemon 2:
                <select>
                    {pokemon.map((poke, index) => (
                        <option key={index} value={poke}>{poke}</option>
                    ))}
                </select>
                Object (optional):
                moves (optional):
            </p>

            <p></p>
        </div>
    );
}

export default TurnAssistantPage;
