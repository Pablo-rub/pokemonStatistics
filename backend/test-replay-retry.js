/**
 * Test script to retry failed replays with detailed logging
 * Uses LOCAL version (obtainGameData.js)
 * Usage: node test-replay-retry.js <replay-id> [max-retries]
 */

require('dotenv').config();

const axios = require('axios');
const { saveReplayToBigQuery } = require('./obtainGameData'); // ✅ LOCAL VERSION
const logger = require('./src/utils/logger');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testReplayWithRetry(replayId, maxRetries = 3) {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    attempt++;
    
    try {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Attempt ${attempt}/${maxRetries} - Replay: ${replayId}`);
      logger.info(`${'='.repeat(60)}\n`);

      // Fetch replay data
      const logUrl = `https://replay.pokemonshowdown.com/${replayId}.log`;
      logger.info(`Fetching log from: ${logUrl}`);
      
      const logResponse = await axios.get(logUrl);
      logger.info(`✓ Log fetched successfully`);

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

      logger.info(`\nAttempt ${attempt}: Saving to BigQuery...`);
      const result = await saveReplayToBigQuery(replayPayload);

      if (result && result.success) {
        logger.info(`\n${'='.repeat(60)}`);
        logger.info(`✓ SUCCESS on attempt ${attempt}`);
        logger.info(`${'='.repeat(60)}\n`);
        return true;
      } else {
        logger.warn(`\nAttempt ${attempt} failed:`);
        logger.warn(`  Error: ${result?.error || 'Unknown error'}`);
        
        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt; // Exponential backoff
          logger.info(`Waiting ${waitTime}ms before retry...`);
          await delay(waitTime);
        }
      }

    } catch (error) {
      logger.error(`\nAttempt ${attempt} encountered error:`);
      logger.error(`  ${error.message}`);
      
      if (attempt < maxRetries) {
        const waitTime = 2000 * attempt;
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
      }
    }
  }

  logger.error(`\n${'='.repeat(60)}`);
  logger.error(`✗ FAILED after ${maxRetries} attempts`);
  logger.error(`${'='.repeat(60)}\n`);
  return false;
}

// Get replay ID and max retries from command line
const replayId = process.argv[2];
const maxRetries = parseInt(process.argv[3]) || 3;

if (!replayId) {
  console.error('Error: Please provide a replay ID');
  console.error('Usage: node test-replay-retry.js <replay-id> [max-retries]');
  console.error('Example: node test-replay-retry.js gen9vgc2025regh-2462071398 5');
  process.exit(1);
}

testReplayWithRetry(replayId, maxRetries)
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    logger.error('Critical error:', error);
    process.exit(1);
  });