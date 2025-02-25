const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const { saveReplayToBigQuery } = require('./obtainGameDataDeploy');

const bigQuery = new BigQuery();

// Configuración: si encuentras una replay existente, se para (false) o se sigue (true)
const CONTINUE_ON_EXISTING = false;

async function getLatestFormat() {
  try {
    // Se mantiene igual ya que necesitamos obtener el formato más reciente
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
    const vgcBo3Formats = formats.filter(f => f.toLowerCase().includes("vgc") && f.toLowerCase().includes("bo3"));
    if (!vgcBo3Formats.length) {
      throw new Error("No VGC BO3 formats found");
    }
    let latestFormat = vgcBo3Formats[vgcBo3Formats.length - 1];
    if (latestFormat.includes('-')) {
      latestFormat = latestFormat.split('-')[0];
    }
    return latestFormat;
  } catch (error) {
    console.error("Error in getLatestFormat:", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchReplayLinks(format) {
  try {
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
          console.log('No more replays found');
          break;
        }

        // Si hay 51 elementos, significa que hay más páginas
        hasMoreReplays = replays.length > 50;
        console.log(`Found ${replays.length} replays (${hasMoreReplays ? 'more pages available' : 'last page'})`);

        // Procesar solo los primeros 50 replays
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
              //console.log(`Processing replay ${replay.id}`);
              
              await saveReplayToBigQuery(replayResponse.data);
              processedReplays.add(replay.id);
              console.log(`Successfully saved replay ${replay.id}`);
              
              await delay(1000); // Pausa entre replays
            }
          } catch (error) {
            console.error(`Error processing replay ${replay.id}:`, error.message);
          }
        }

        // Si hay más páginas, actualizar el timestamp con el último replay procesado
        if (hasMoreReplays && replays.length >= 50) {
          lastTimestamp = replays[49].uploadtime;
          console.log(`Setting timestamp for next page: ${lastTimestamp}`);
          await delay(2000); // Pausa entre páginas
        }

      } catch (error) {
        console.error(`Error processing batch:`, error.message);
        if (error.response && error.response.status === 404) {
          hasMoreReplays = false;
        } else {
          await delay(5000); // Esperar más tiempo si hay un error
        }
      }
    }

    console.log(`Total replays processed: ${processedReplays.size}`);
    return Array.from(processedReplays);
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
      console.log('Getting latest format...');
      const format = await getLatestFormat();
      console.log('Latest format:', format);

      console.log('Starting to fetch replay links...');
      try {
        const processedReplays = await fetchReplayLinks(format);
        console.log(`Successfully processed ${processedReplays.length} replays`);
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