import React from "react";
import { Box, Typography } from "@mui/material";

//todo
//texto bienvenida explicativo

function HomePage() {
    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center"
            }}
        >
            <Typography variant="h4" textAlign="center">
                Welcome to the Pokémon Rankings App
            </Typography>
        </Box>

    );
}

export default HomePage;
