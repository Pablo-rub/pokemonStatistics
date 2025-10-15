/**
 * Test script to process a single replay ID with detailed logging
 * Uses LOCAL version (obtainGameData.js) with full error handling
 * Usage: node test-single-replay.js <replay-id>
 */

require('dotenv').config();

const axios = require('axios');
const { saveReplayToBigQuery } = require('./obtainGameData'); // ✅ LOCAL VERSION
const logger = require('./src/utils/logger');

async function testSingleReplay(replayId) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Testing replay: ${replayId}`);
    logger.info(`${'='.repeat(60)}\n`);

    // Fetch replay data
    const logUrl = `https://replay.pokemonshowdown.com/${replayId}.log`;
    logger.info(`Fetching log from: ${logUrl}`);
    
    const logResponse = await axios.get(logUrl);
    logger.info(`✓ Log fetched successfully (${logResponse.data.length} chars)`);

    // Fetch metadata
    const metaUrl = `https://replay.pokemonshowdown.com/${replayId}.json`;
    logger.info(`Fetching metadata from: ${metaUrl}`);
    
    const metaResponse = await axios.get(metaUrl);
    logger.info(`✓ Metadata fetched successfully`);

    // Prepare replay payload
    const replayPayload = {
      replay_id: replayId,
      format: metaResponse.data.format || 'unknown',
      meta: metaResponse.data,
      log: logResponse.data,
      source_url: logUrl
    };

    logger.info(`\nPrepared payload:`);
    logger.info(`  - Replay ID: ${replayPayload.replay_id}`);
    logger.info(`  - Format: ${replayPayload.format}`);
    logger.info(`  - Log length: ${replayPayload.log.length} chars`);

    // Save to BigQuery using LOCAL version
    logger.info(`\nSaving to BigQuery...`);
    const result = await saveReplayToBigQuery(replayPayload);

    logger.info(`\n${'='.repeat(60)}`);
    if (result && result.success) {
      logger.info(`✓ SUCCESS: Replay saved to BigQuery`);
      logger.info(`${'='.repeat(60)}\n`);
      process.exit(0);
    } else {
      logger.error(`✗ FAILED: Replay not saved`);
      logger.error(`Error: ${result?.error || 'Unknown error'}`);
      if (result?.details) {
        logger.error(`Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      logger.info(`${'='.repeat(60)}\n`);
      process.exit(1);
    }

  } catch (error) {
    logger.error(`\n${'='.repeat(60)}`);
    logger.error(`✗ CRITICAL ERROR`);
    logger.error(`${'='.repeat(60)}`);
    logger.error(`Error: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    logger.error(`${'='.repeat(60)}\n`);
    process.exit(1);
  }
}

// Get replay ID from command line
const replayId = process.argv[2];

if (!replayId) {
  console.error('Error: Please provide a replay ID');
  console.error('Usage: node test-single-replay.js <replay-id>');
  console.error('Example: node test-single-replay.js gen9vgc2025regh-2462071398');
  process.exit(1);
}

testSingleReplay(replayId);