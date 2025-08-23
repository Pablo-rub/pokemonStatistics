const { BigQuery } = require('@google-cloud/bigquery');

const keyFilename = process.env.GOOGLE_KEY_FILE || process.env.BQ_KEYFILE || null;
const options = keyFilename ? { keyFilename } : {};

const bigQuery = new BigQuery({
    keyFilename: "D:/tfg/pokemonStatistics/credentials.json",
});

module.exports = bigQuery;
