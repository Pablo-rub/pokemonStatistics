const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const { saveReplayToBigQuery } = require('./obtainGameDataDeploy');

const bigQuery = new BigQuery();

// Configuración: si encuentras una replay existente, se para (false) o se sigue (true)
const CONTINUE_ON_EXISTING = false;

async function getLatestFormat() {
  try {
    // Se obtiene directamente desde Smogon (sin endpoints locales)
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
    return { month: latestMonth, format: latestFormat };
  } catch (error) {
    console.error("Error in getLatestFormat:", error);
    throw error;
  }
}

async function getReplaySearchUrl() {
  try {
    const { month, format } = await getLatestFormat();
    console.log("Month:", month, ", format:", format);
    const searchUrl = `https://replay.pokemonshowdown.com/?format=${format}`;
    return { replaySearchUrl: searchUrl, format };
  } catch (error) {
    console.error("Error in getReplaySearchUrl:", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Función para obtener enlaces de replay mediante axios y cheerio
async function fetchReplayLinks(replaySearchUrl, format) {
  try {
    let allReplayLinks = [];
    let pageNumber = 1;
    let hasReplays = true;
    
    while (hasReplays) {
      try {
        const pageUrl = `${replaySearchUrl}&page=${pageNumber}`;
        console.log(`Fetching replays from page ${pageNumber}: ${pageUrl}`);

        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);
        
        // Extraer enlaces de replay usando cheerio
        const replayLinks = $('ul.linklist li a.blocklink')
          .map((_, element) => {
            const href = $(element).attr('href');
            return href && href.startsWith(format) 
              ? `https://replay.pokemonshowdown.com/${href}`
              : null;
          })
          .get()
          .filter(Boolean);

        console.log(`Found ${replayLinks.length} replays on page ${pageNumber}`);

        if (replayLinks.length === 0) {
          hasReplays = false;
        } else {
          const foundExisting = await processReplays(replayLinks);
          if (foundExisting) {
            console.log("Found existing replay, stopping further pagination...");
            hasReplays = false;
          } else {
            allReplayLinks.push(...replayLinks);
            pageNumber++;
            await delay(1000); // Mantener el delay para no sobrecargar el servidor
          }
        }
      } catch (error) {
        console.error(`Error processing page ${pageNumber}:`, error.message);
        await delay(5000); // Esperar antes de reintentar
      }
    }

    console.log(`Total replays processed: ${allReplayLinks.length}`);
    return allReplayLinks;
  } catch (error) {
    console.error("Error fetching replay links:", error);
    throw error;
  }
}

async function processReplays(replayLinks) {
  try {
    let foundExisting = false;

    for (const url of replayLinks) {
      const parts = url.split('/');
      const replayId = parts[parts.length - 1].replace('.json', '');
      
      try {
        // Check if replay exists in BigQuery
        const query = `SELECT replay_id FROM \`pokemon-statistics.pokemon_replays.replays\` WHERE replay_id = '${replayId}'`;
        const [rows] = await bigQuery.query(query);
        
        if (rows.length > 0) {
          console.log(`Replay ${replayId} already exists in database`);
          if (!CONTINUE_ON_EXISTING) {
            foundExisting = true;
            break; // Exit the loop immediately
          }
          continue;
        }

        // If replay doesn't exist, process it
        const response = await axios.get(`${url}.json`);
        console.log(`Fetched data for replay ${replayId}`);
        await saveReplayToBigQuery(response.data);
        console.log(`Successfully saved replay ${replayId} to BigQuery`);
      } catch (error) {
        console.error(`Error processing replay ${replayId}:`, error.message);
      }
    }

    return foundExisting;
  } catch (error) {
    console.error("Error in processReplays:", error);
    throw error;
  }
}

// In the same file, update the entry point
exports.fetchReplaysDaily = async (req, res) => {
  console.log('Starting fetchReplaysDaily at:', new Date().toISOString());
  res.status(200).send('Processing started');
  
  (async () => {
    try {
      console.log('Getting replay search URL...');
      const { replaySearchUrl, format } = await getReplaySearchUrl();
      console.log('Obtained search URL:', replaySearchUrl, 'for format:', format);

      console.log('Starting to fetch replay links...');
      try {
        const replayLinks = await fetchReplayLinks(replaySearchUrl, format);
        console.log(`Found ${replayLinks.length} replay links`);
      } catch (fetchError) {
        console.error('Error in fetchReplayLinks:', fetchError);
        throw fetchError;
      }
    } catch (error) {
      console.error('Critical error in async processing:', error);
      // Log the full error stack for better debugging
      console.error('Error stack:', error.stack);
    }
  })();
};