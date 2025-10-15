/**
 * Inspector script to capture full error details from a replay
 * Uses LOCAL version (obtainGameData.js) with enhanced error handling
 * Usage: node inspect-error.js <replay-id>
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { saveReplayToBigQuery } = require('./obtainGameData'); // ✅ LOCAL VERSION
const logger = require('./src/utils/logger');

async function inspectReplayError(replayId) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Error Inspector - Replay: ${replayId}`);
    logger.info(`${'='.repeat(60)}\n`);

    // Fetch replay data
    const logUrl = `https://replay.pokemonshowdown.com/${replayId}.log`;
    logger.info(`Fetching log...`);
    
    const logResponse = await axios.get(logUrl);
    logger.info(`✓ Log fetched (${logResponse.data.length} chars)`);

    // Fetch metadata
    const metaUrl = `https://replay.pokemonshowdown.com/${replayId}.json`;
    logger.info(`Fetching metadata...`);
    
    const metaResponse = await axios.get(metaUrl);
    logger.info(`✓ Metadata fetched`);

    // Prepare replay payload
    const replayPayload = {
      replay_id: replayId,
      format: metaResponse.data.format || 'unknown',
      meta: metaResponse.data,
      log: logResponse.data,
      source_url: logUrl
    };

    logger.info(`\nAttempting to save to BigQuery...`);
    
    // Save to BigQuery using LOCAL version (with full error capture)
    const result = await saveReplayToBigQuery(replayPayload);

    // Save full error details to file
    const errorFilePath = path.join(__dirname, `error-full-${replayId}.json`);
    fs.writeFileSync(errorFilePath, JSON.stringify(result, null, 2));
    
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Error details saved to: ${errorFilePath}`);
    logger.info(`${'='.repeat(60)}\n`);

    if (result && result.success) {
      logger.info(`✓ Replay saved successfully (unexpected)`);
    } else {
      logger.error(`✗ Error captured:`);
      logger.error(`  Error: ${result?.error || 'Unknown'}`);
      logger.error(`  Error Name: ${result?.errorName || 'N/A'}`);
      
      if (result?.details && Array.isArray(result.details)) {
        logger.error(`  Details count: ${result.details.length}`);
        
        result.details.forEach((detail, idx) => {
          logger.error(`\n  Detail ${idx + 1}:`);
          if (detail.errors) {
            detail.errors.forEach((err, errIdx) => {
              logger.error(`    Error ${errIdx + 1}:`);
              logger.error(`      Reason: ${err.reason}`);
              logger.error(`      Location: ${err.location}`);
              logger.error(`      Message: ${err.message}`);
            });
          }
        });
      }
      
      if (result?.response) {
        logger.error(`\n  Response insertErrors: ${result.response.insertErrors?.length || 0}`);
      }
    }

    logger.info(`\nFull error JSON written to: ${errorFilePath}`);
    logger.info(`Open this file to see complete error details including the problematic row data\n`);

  } catch (error) {
    logger.error(`\n${'='.repeat(60)}`);
    logger.error(`✗ CRITICAL ERROR IN INSPECTOR`);
    logger.error(`${'='.repeat(60)}`);
    logger.error(`Error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Get replay ID from command line
const replayId = process.argv[2];

if (!replayId) {
  console.error('Error: Please provide a replay ID');
  console.error('Usage: node inspect-error.js <replay-id>');
  console.error('Example: node inspect-error.js gen9vgc2025regh-2462071398');
  process.exit(1);
}

inspectReplayError(replayId);