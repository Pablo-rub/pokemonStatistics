const { BigQuery } = require('@google-cloud/bigquery');
const fs = require('fs');
const path = require('path');

const keyFilePath = process.env.GOOGLE_KEY_FILE || process.env.BQ_KEYFILE || null;
const keyJson = process.env.BQ_KEY_JSON || process.env.GOOGLE_KEY_JSON || null;

const options = {};

// 1) Si se pasa path a fichero JSON (local, no comiteado)
if (keyFilePath) {
  // Normalize and check file exists before passing it to the client lib
  const normalized = path.resolve(keyFilePath);
  if (fs.existsSync(normalized)) {
    options.keyFilename = normalized;
    console.info('BigQuery using key file from:', normalized);
  } else {
    console.error('BigQuery key file not found at:', normalized, '\nFalling back to Application Default Credentials (ADC).');
  }
}

// 2) Si se pasa el JSON completo como variable (útil para CI/Secret Manager)
else if (keyJson) {
  try {
    const parsed = typeof keyJson === 'string' ? JSON.parse(keyJson) : keyJson;
    options.credentials = {
      client_email: parsed.client_email,
      private_key: parsed.private_key
    };
    if (parsed.project_id) options.projectId = parsed.project_id;
    console.info('BigQuery using credentials from BQ_KEY_JSON / GOOGLE_KEY_JSON env var.');
  } catch (err) {
    console.error('Invalid BQ key JSON in BQ_KEY_JSON / GOOGLE_KEY_JSON:', err.message);
  }
}

// 3) Si no hay options válidos, dejamos que la librería use ADC (Cloud Run / GCE / Cloud Build service account)
const bigQuery = Object.keys(options).length ? new BigQuery(options) : new BigQuery();

module.exports = bigQuery;
