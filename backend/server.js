const express = require('express');
const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config();

// Crear una instancia de Express
const app = express();


// Parsear JSON en las peticiones
app.use(express.json());

// Crear una instancia de BigQuery
const bigquery = new BigQuery();

// Definir una ruta de prueba para comprobar que el servidor está funcionando
app.get('/', (req, res) => {
    res.send('Servidor en funcionamiento');
});

// Ruta para realizar una consulta simple a BigQuery
app.get('/api/partidas/count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS numero_partidas FROM `pokemon-statistics.pokemon_replays.replays`';
        const [rows] = await bigquery.query(query);
        res.json({ total: rows[0].numero_partidas });
    } catch (error) {
        console.error("Error fetching data from BigQuery:", error);
        res.status(500).send("Error retrieving data");
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
