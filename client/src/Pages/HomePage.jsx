import React from "react";
import { Button } from "react-bootstrap";

function HomePage() {
    return (
        <div>
            <h1>Home Page</h1>
            <p>Welcome to Pokemon Statistics</p>
            <Button href="/turn-assistant" variant="primary">Turn Assistant</Button> <br />
            <Button href="/my-games" variant="primary">My Games</Button> <br />
            <Button href="/public-games" variant="primary">Public Games</Button> <br />
            <Button href="/rankings" variant="primary">Rankings</Button> <br />
        </div>
    );
}

export default HomePage;
