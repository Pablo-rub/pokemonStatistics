const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

// Initialize BigQuery (no need for keyFilename in Cloud Functions)
const bigQuery = new BigQuery();

// Set to true to process all replays, false to stop on first existing replay
const CONTINUE_ON_EXISTING = false;

async function getLatestFormat() {
    try {
        // Get data directly from Smogon instead of local server
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
        
        // Get formats for latest month
        const formatsResponse = await axios.get(`https://www.smogon.com/stats/${latestMonth}/`);
        const formats = [];
        const $formats = cheerio.load(formatsResponse.data);
        
        $formats('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href && href.endsWith('.txt') && !href.endsWith('.txt.gz')) {
                formats.push(href.replace('.txt', ''));
            }
        });

        // Filter VGC BO3 formats
        const vgcBo3Formats = formats.filter(f => 
            f.toLowerCase().includes("vgc") && 
            f.toLowerCase().includes("bo3")
        );

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

// Example of using the function to build the replay search URL:
async function getReplaySearchUrl() {
  try {
    const { month, format } = await getLatestFormat();
    console.log("Month: ", month, ", format: ", format);

    // Construct the URL
    const searchUrl = `https://replay.pokemonshowdown.com/?format=${format}`;
    //console.log("Using replay search URL:", searchUrl);
      
    return { replaySearchUrl: searchUrl, format };
  } catch (error) {
    console.error(error);
  }
}

// Función de retardo
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Modify fetchReplayLinks to stop when finding existing replays
async function fetchReplayLinks() {
  try {
    const { replaySearchUrl, format } = await getReplaySearchUrl();
    let allReplayLinks = [];
    let pageNumber = 1;
    let hasReplays = true;
    let browser = null;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    const PAGES_PER_BROWSER = 10;
    
    while (hasReplays) {
      try {
        if (!browser || pageNumber % PAGES_PER_BROWSER === 1) {
          if (browser) {
            await browser.close();
          }
          browser = await puppeteer.launch({
            headless: true,
            userDataDir: './puppeteer_tmp'
          });
        }

        const pageUrl = `${replaySearchUrl}&page=${pageNumber}`;
        console.log(`Fetching replays from: ${pageUrl}`);
        
        const page = await browser.newPage();
        let replayLinks = [];
        
        try {
          const maxRetries = 5; // Aumentado de 3 a 5
          let attempts = 0;
          let navigated = false;
          
          while (attempts < maxRetries && !navigated) {
            try {
              // Aumentar el timeout a 45 segundos
              await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 45000 });
              navigated = true;
              consecutiveFailures = 0; // Resetear contador de fallos si la navegación tiene éxito
            } catch (navError) {
              if (navError.message.includes("Requesting main frame too early")) {
                attempts++;
                const waitTime = Math.min(2000 * Math.pow(2, attempts), 10000); // Backoff exponencial
                console.warn(`Main frame not ready on page ${pageNumber} (attempt ${attempts}), waiting ${waitTime}ms...`);
                await delay(waitTime);
              } else {
                throw navError;
              }
            }
          }
          
          if (!navigated) {
            consecutiveFailures++;
            console.error(`Failed to navigate page ${pageNumber} after ${maxRetries} attempts.`);
            
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              console.log(`Too many consecutive failures. Restarting browser...`);
              if (browser) {
                await browser.close();
              }
              browser = await puppeteer.launch({
                headless: true,
                userDataDir: './puppeteer_tmp'
              });
              consecutiveFailures = 0;
              continue; // Reintentar la misma página con el nuevo navegador
            }
            
            pageNumber++; // Solo avanzar si no hemos alcanzado el máximo de fallos consecutivos
            continue;
          }

          // Resto del código para extraer los enlaces...
          replayLinks = await page.evaluate((format) => {
            return Array.from(document.querySelectorAll('ul.linklist li a.blocklink'))
              .map(a => a.getAttribute('href'))
              .filter(href => href && href.startsWith(format))
              .map(href => `https://replay.pokemonshowdown.com/${href}`);
          }, format);

          console.log(`Found ${replayLinks.length} replays on page ${pageNumber}`);

        } catch (error) {
          console.error(`Error processing page ${pageNumber}: ${error.message}`);
          consecutiveFailures++;
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            if (browser) {
              await browser.close();
            }
            browser = await puppeteer.launch({
              headless: true,
              userDataDir: './puppeteer_tmp'
            });
            consecutiveFailures = 0;
          }
          continue;
        } finally {
          try {
            if (!page.isClosed()) await page.close();
          } catch (closeError) {
            console.error(`Error closing page ${pageNumber}: ${closeError.message}`);
          }
        }

        // Procesar resultados...
        if (replayLinks.length === 0) {
          hasReplays = false;
        } else {
          allReplayLinks.push(...replayLinks);
          
          // Process this batch of links
          const foundExisting = await processReplays(replayLinks);
          if (foundExisting) {
            console.log("Found existing replay, stopping pagination...");
            hasReplays = false;
          } else {
            pageNumber++;
            await delay(1000);
          }
        }

      } catch (browserError) {
        console.error(`Browser error on page ${pageNumber}: ${browserError.message}`);
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.error('Error closing browser:', closeError.message);
          }
        }
        browser = null;
        await delay(5000);
      }
    }
    
    if (browser) {
      await browser.close();
    }
    
    console.log(`Total replays found: ${allReplayLinks.length}`);
    return allReplayLinks;
  } catch (error) {
    console.error("Error fetching replay links on all pages:", error);
    throw error;
  }
}

async function processReplays(replayLinks) {
    try {
        let foundExisting = false;

        for (const url of replayLinks) {
            const parts = url.split('/');
            let replayId = parts[parts.length - 1].replace('.json', '');

            try {
                // Check if replay exists in BigQuery directly
                const query = `SELECT replay_id FROM \`pokemon-statistics.pokemon_replays.replays\` WHERE replay_id = '${replayId}'`;
                const [rows] = await bigQuery.query(query);

                if (rows.length > 0) {
                    console.log(`Replay ${replayId} already exists in the database.`);
                    if (!CONTINUE_ON_EXISTING) {
                        foundExisting = true;
                        break;
                    }
                    continue;
                }

                // Get replay data and process it
                const response = await axios.get(`${url}.json`);
                const replayData = response.data;
                
                // Process and save the replay data to BigQuery
                await saveReplayToBigQuery(replayData);
                console.log("Processing replay:", url);
            } catch (postError) {
                console.error(`Error processing replay ${replayId}:`, postError.message);
            }
        }

        return foundExisting;
    } catch (error) {
        console.error("Error processing replays:", error);
        throw error;
    }
}

// Cloud Function entry point
exports.fetchReplaysDaily = async (req, res) => {
    try {
        const replayLinks = await fetchReplayLinks();
        console.log('Successfully fetched and processed replays.');
        res.status(200).send('Replays fetched and processed successfully.');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error fetching and processing replays: ${error.message}`);
    }
};