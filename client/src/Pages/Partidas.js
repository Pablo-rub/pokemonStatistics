import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import axios from "axios";

function Partidas() {
    const [totalPartidas, setTotalPartidas] = useState(null);

    useEffect(() => {
        const fectchTotalPartidas = async () => {
            try {
                const response = await axios.get("http://localhost:5000/api/partidas/count");
                console.log("Response:", response.data);
                setTotalPartidas(response.data.total);
            } catch (error) {
                console.error("Error fetching partidas:", error);
            }
        };

        fectchTotalPartidas();
    }, []);

    return (
        <div>
            <h1>Mis Partidas</h1>
            <Button href="/" variant="primary">Home</Button>
            <div>Total de Partidas: {totalPartidas !== null ? totalPartidas : "Cargando..."} </div>
        </div>
    );
}

export default Partidas;
