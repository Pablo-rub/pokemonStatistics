const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const { saveReplayToBigQuery } = require('./obtainGameDataDeploy');

const bigQuery = new BigQuery();
const CONTINUE_ON_EXISTING = false;

async function getLatestFormat() {
  try {
    const response = await axios.get('https://www.smogon.com/stats/');
    const $ = cheerio.load(response.data);
    const months = new Set();
    
    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href) {
        const match = href.match(/(\d{4}-\d{2}(-DLC\d{1})?\/)/);
        if (match) {
          months.add(match[1].replace('/', ''));
        }
      }
    });
    
    const latestMonth = Array.from(months).sort().reverse()[0];
    const formatsResponse = await axios.get(`https://www.smogon.com/stats/${latestMonth}/`);
    const formats = [];
    const $formats = cheerio.load(formatsResponse.data);
    
    $formats('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.endsWith('.txt') && !href.endsWith('.txt.gz')) {
        formats.push(href.replace('.txt', ''));
      }
    });
    
    const vgcBo3Formats = formats.filter(f => 
      f.toLowerCase().includes("vgc") && f.toLowerCase().includes("bo3")
    );
    
    if (!vgcBo3Formats.length) {
      throw new Error("No VGC BO3 formats found");
    }
    
    const uniqueFormats = new Set();
    vgcBo3Formats.forEach(format => {
      const baseFormat = format.replace(/-\d+$/, '');
      uniqueFormats.add(baseFormat);
    });
    
    const formatsArray = Array.from(uniqueFormats).sort();
    console.log('Latest VGC BO3 formats:', formatsArray.join(', '));
    
    return formatsArray;
  } catch (error) {
    console.error("Error in getLatestFormat:", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== AÑADIR: Array para rastrear errores =====
async function fetchReplayLinks(formats) {
  try {
    let totalProcessed = 0;
    const failedReplays = []; // ← NUEVO: Rastrear replays fallidos
    
    for (const format of formats) {
      console.log(`\n=== Processing format: ${format} ===`);
      
      let hasMoreReplays = true;
      let processedReplays = new Set();
      let lastTimestamp = null;

      while (hasMoreReplays) {
        try {
          let searchUrl = `https://replay.pokemonshowdown.com/search.json?format=${format}`;
          if (lastTimestamp) {
            searchUrl += `&before=${lastTimestamp}`;
          }
          console.log(`Fetching replays from: ${searchUrl}`);

          const response = await axios.get(searchUrl);
          const replays = response.data;

          if (!replays || !Array.isArray(replays) || replays.length === 0) {
            console.log(`No more replays found for ${format}`);
            break;
          }

          hasMoreReplays = replays.length > 50;
          console.log(`Found ${replays.length} replays (${hasMoreReplays ? 'more pages available' : 'last page'})`);

          for (const replay of replays.slice(0, 50)) {
            try {
              const query = `SELECT replay_id FROM \`pokemon-statistics.pokemon_replays.replays\` WHERE replay_id = '${replay.id}'`;
              const [rows] = await bigQuery.query(query);

              if (rows.length > 0) {
                console.log(`Replay ${replay.id} already exists in database`);
                if (!CONTINUE_ON_EXISTING) {
                  hasMoreReplays = false;
                  break;
                }
                continue;
              }

              if (!processedReplays.has(replay.id)) {
                const replayUrl = `https://replay.pokemonshowdown.com/${replay.id}.json`;
                const replayResponse = await axios.get(replayUrl);
                console.log(`Processing replay ${replay.id}`);
                
                // ===== MODIFICAR: Capturar errores detallados =====
                try {
                  await saveReplayToBigQuery(replayResponse.data);
                  processedReplays.add(replay.id);
                  totalProcessed++;
                  console.log(`Successfully saved replay ${replay.id}`);
                } catch (saveError) {
                  // ===== NUEVO: Registrar el fallo con detalles =====
                  const errorDetails = {
                    replayId: replay.id,
                    format: format,
                    error: saveError.message || 'Unknown error',
                    errorName: saveError.name || 'Error',
                    timestamp: new Date().toISOString()
                  };
                  
                  failedReplays.push(errorDetails);
                  console.error(`Failed to save replay ${replay.id}: ${saveError.message}`);
                }
                
                await delay(1000);
              }
            } catch (error) {
              console.log(`Error processing replay ${replay.id}:`, error.message);
              
              // ===== NUEVO: Registrar también errores de fetch =====
              failedReplays.push({
                replayId: replay.id,
                format: format,
                error: error.message || 'Failed to fetch replay data',
                errorName: error.name || 'Error',
                timestamp: new Date().toISOString()
              });
            }
          }

          if (hasMoreReplays && replays.length >= 50) {
            lastTimestamp = replays[49].uploadtime;
            console.log(`Setting timestamp for next page: ${lastTimestamp}`);
            await delay(2000);
          }

        } catch (error) {
          console.error(`Error processing batch:`, error.message);
          if (error.response && error.response.status === 404) {
            hasMoreReplays = false;
          } else {
            await delay(5000);
          }
        }
      }
      
      console.log(`Finished processing ${format}: ${processedReplays.size} replays saved`);
    }

    // ===== NUEVO: Mostrar resumen de errores al final =====
    console.log(`\n${'='.repeat(80)}`);
    console.log(`EXECUTION SUMMARY`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Total replays processed successfully: ${totalProcessed}`);
    console.log(`Total replays failed: ${failedReplays.length}`);
    
    if (failedReplays.length > 0) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`FAILED REPLAYS (${failedReplays.length}):`);
      console.log(`${'='.repeat(80)}\n`);
      
      // Agrupar por tipo de error
      const errorsByType = {};
      failedReplays.forEach(failed => {
        const errorKey = failed.errorName;
        if (!errorsByType[errorKey]) {
          errorsByType[errorKey] = [];
        }
        errorsByType[errorKey].push(failed);
      });
      
      // Mostrar agrupados por tipo de error
      Object.keys(errorsByType).forEach(errorType => {
        const replays = errorsByType[errorType];
        console.log(`\n--- ${errorType} (${replays.length} replays) ---`);
        replays.forEach((failed, idx) => {
          console.log(`${idx + 1}. Replay ID: ${failed.replayId}`);
          console.log(`   Format: ${failed.format}`);
          console.log(`   Error: ${failed.error}`);
          console.log(`   Time: ${failed.timestamp}`);
          console.log(`   URL: https://replay.pokemonshowdown.com/${failed.replayId}`);
          console.log('');
        });
      });
      
      // Listar solo los IDs para fácil copy-paste
      console.log(`${'='.repeat(80)}`);
      console.log(`FAILED REPLAY IDs (for easy copy-paste):`);
      console.log(`${'='.repeat(80)}`);
      failedReplays.forEach(failed => {
        console.log(failed.replayId);
      });
    } else {
      console.log(`\n✓ All replays processed successfully!`);
    }
    
    console.log(`\n${'='.repeat(80)}\n`);
    
    return { totalProcessed, failedReplays };
  } catch (error) {
    console.error("Error fetching replay links:", error);
    throw error;
  }
}

exports.fetchReplaysDaily = async (req, res) => {
  console.log('Starting fetchReplaysDaily at:', new Date().toISOString());
  res.status(200).send('Processing started');
  
  (async () => {
    try {
      console.log('Getting latest formats...');
      const formats = await getLatestFormat();
      console.log(`Found ${formats.length} format(s) to process:`, formats.join(', '));

      console.log('Starting to fetch replay links...');
      try {
        const result = await fetchReplayLinks(formats); // ← Ahora devuelve objeto
        console.log(`\nFINAL SUMMARY:`);
        console.log(`- Successfully processed: ${result.totalProcessed} replays`);
        console.log(`- Failed: ${result.failedReplays.length} replays`);
        console.log(`- Formats processed: ${formats.length}`);
      } catch (fetchError) {
        console.error('Error in fetchReplayLinks:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Critical error in async processing:', error);
      console.error('Error stack:', error.stack);
    }
  })();
};