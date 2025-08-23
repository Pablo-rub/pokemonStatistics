const express = require('express');
const router = express.Router();

// Endpoint para obtener la lista de ítems (items)
router.get('/items', async (req, res) => {
    try {
        // Consulta PokeAPI para obtener hasta 1000 ítems (ajusta el limit según sea necesario)
        const response = await axios.get('https://pokeapi.co/api/v2/item?limit=10000');
        const items = response.data.results.map(item => ({
        // Formateamos el nombre para que aparezca con mayúsculas en cada palabra
        name: item.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: item.url
        }));
        res.json(items);
    } catch (error) {
        console.error("Error fetching items:", error);
        res.status(500).send("Error fetching items");
    }
});

// Endpoint para obtener la lista de habilidades (abilities)
router.get('/abilities', async (req, res) => {
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/ability?limit=1000');
        const abilities = response.data.results.map(ability => ({
        name: ability.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: ability.url
        }));
        res.json(abilities);
    } catch (error) {
        console.error("Error fetching abilities:", error);
        res.status(500).send("Error fetching abilities");
    }
});

// Endpoint para obtener la lista de movimientos (moves)
router.get('/moves', async (req, res) => {
    try {
        const response = await axios.get('https://pokeapi.co/api/v2/move?limit=1000');
        const moves = response.data.results.map(move => ({
        name: move.name
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
        url: move.url
        }));
        res.json(moves);
    } catch (error) {
        console.error("Error fetching moves:", error);
        res.status(500).send("Error fetching moves");
    }
});

module.exports = router;