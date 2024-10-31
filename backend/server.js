const { BigQuery } = require('@google-cloud/bigquery');
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cheerio = require('cheerio');

require('dotenv').config();

// Initialize express
const app = express();

// Enable CORS for all requests
app.use(cors());

// Enable parsing of JSON bodies
app.use(express.json());

// Initialize BigQuery
const bigquery = new BigQuery();

// Show when server is running
app.get('/', (req, res) => {
    res.send('Server running');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening in port number ${PORT}`);
});

// Endpoint to get the list of games
app.get('/api/public-games', async (req, res) => {
    try {
        const query = 'SELECT * FROM `pokemon-statistics.pokemon_replays.replays`';
        const [rows] = await bigquery.query(query);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching data from BigQuery:", error);
        res.status(500).send("Error retrieving data");
    }
});

// Endpoint to get the total number of games
app.get('/api/games/count', async (req, res) => {
    try {
        const query = 'SELECT COUNT(*) AS number_games FROM `pokemon-statistics.pokemon_replays.replays`';
        const [rows] = await bigquery.query(query);
        res.json({ numGames: rows[0].number_games });
    } catch (error) {
        console.error("Error fetching data from BigQuery:", error);
        res.status(500).send("Error retrieving data");
    }
});

// Endpoint to get the list of months
app.get('/api/months', async (req, res) => {
    try {
        const response = await axios.get('https://www.smogon.com/stats/');
        const $ = cheerio.load(response.data);

        const months = new Set();
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Month format is YYYY-MM/
                const match = href.match(/(\d{4}-\d{2}(-DLC\d{1})?\/)/);
                if (match) {
                    months.add(match[1].replace('/', ''));
                }
            }
        });

        res.json(Array.from(months).sort().reverse());
    } catch (error) {
        console.error("Error fetching months:", error);
        res.status(500).send("Error fetching months");
    }
});

// Endpoint to get the list of formats for a given month
app.get('/api/formats/:month', async (req, res) => {
    const { month } = req.params;

    try {
        const response = await axios.get(`https://www.smogon.com/stats/${month}/`);
        const $ = cheerio.load(response.data);

        const formats = [];
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            // Format files end with .txt and are not compressed (.txt.gz)
            if (href && href.endsWith('.txt') && !href.endsWith('.txt.gz')) {
                formats.push(href.replace('.txt', ''));
            }
        });

        res.json(formats.reverse());
    } catch (error) {
        console.error("Error fetching formats:", error);
        res.status(500).send("Error fetching formats");
    }
});

// Endpoint to get the rankings
app.get('/api/rankings', async (req, res) => {
    const { format, month } = req.query;

    if (!format || !month) {
        res.status(400).send("Missing format or month");
        return;
    }

    const url = `https://www.smogon.com/stats/${month}/${format}`;
    console.log("Fetching data from:", url);
    try {
        const response = await axios.get(url);
        res.send(response.data);
    } catch (error) {
        console.error("Error al obtener datos de Smogon:", error);
        res.status(500).send("Error al obtener datos de Smogon");
    }
});