import React from "react";
import { Button } from "react-bootstrap";

function HomePage() {
    return (
        <div>
            <h1>Home Page</h1>
            <p>Welcome to Pokemon Statistics</p>
            <Button href="/partidas" variant="primary">Pokemons</Button>
        </div>
    );
}

export default HomePage;
