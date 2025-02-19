const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer-core');
const { saveReplayToBigQuery } = require('./obtainGameDataDeploy');
const chromium = require('chrome-aws-lambda');

const bigQuery = new BigQuery();
// Configuración: si encuentras una replay existente, se para (puedes ajustar)
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

// Función para obtener enlaces de replay mediante Puppeteer
async function fetchReplayLinks(replaySearchUrl, format) {
  try {
    console.log("Launching browser with chrome-aws-lambda...");
    let browser = await launchBrowser();
    console.log("Browser launched successfully");

    let allReplayLinks = [];
    let pageNumber = 1;
    let hasReplays = true;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3;
    const PAGES_PER_BROWSER = 10;
    console.log("variables");

    while (hasReplays) {
      console.log("while");
      try {
        console.log("while try");
        if (!browser || pageNumber % PAGES_PER_BROWSER === 1) {
          console.log("while try if");
          if (browser) await browser.close();
          console.log("while try if close");
          try {
            browser = await launchBrowser();
            console.log("Launched new browser instance");
          } catch (launchError) {
            console.error("Error launching browser:", launchError);
            continue;
          }
        }

        const pageUrl = `${replaySearchUrl}&page=${pageNumber}`;
        console.log(`Fetching replays from page ${pageNumber}: ${pageUrl}`);
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0);
        console.log("New page created");

        let replayLinks = [];
        try {
          console.log("try 2");
          const maxRetries = 5;
          let attempts = 0;
          let navigated = false;

          while (attempts < maxRetries && !navigated) {
            try {
              console.log(`Navigation attempt ${attempts + 1} for page ${pageNumber}`);
              page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
              console.log(`Navigated to page ${pageNumber}`);

              // After basic navigation, wait for content
              try {
                const content = await page.evaluate(() => {
                  const list = document.querySelector('ul.linklist');
                  const panel = document.querySelector('.pfx-panel');
                  const body = document.querySelector('.pfx-body');
                  return list || panel || body;
                },);

                console.log(`Content found on page ${pageNumber}`);

                if (!content) {
                  throw new Error('No content found');
                }
                
                navigated = true;
                consecutiveFailures = 0;
                console.log(`Successfully navigated to page ${pageNumber}`);
              } catch (selectorError) {
                console.warn(`Selector not found, page might be empty or invalid`);
                // Consider this a successful navigation, but possibly empty page
                navigated = true;
                consecutiveFailures = 0;
              }
              
            } catch (navError) {
              attempts++;
              console.warn(`Navigation attempt ${attempts} failed: ${navError.message}`);
              
              if (navError.message.includes('ECONNRESET')) {
                console.warn('ECONNRESET detected. Restarting browser and retrying...');
                if (browser) await browser.close();
                browser = await launchBrowser();
                // optionally, re-create the page before retrying
                page = await browser.newPage();
                // continue to retry…
              }

              if (attempts < maxRetries) {
                // Exponential backoff with maximum wait time
                const waitTime = Math.min(2000 * Math.pow(2, attempts), 10000);
                console.log(`Waiting ${waitTime}ms before retry...`);
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
              if (browser) await browser.close();
              browser = await launchBrowser();
              consecutiveFailures = 0;
            }
            pageNumber++;
            continue;
          }
          
          // Extraer enlaces de replay
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
            if (browser) await browser.close();
            browser = await launchBrowser();
            consecutiveFailures = 0;
          }
          continue;
        } finally {
          try { if (!page.isClosed()) await page.close(); } catch (closeError) {
            console.error(`Error closing page ${pageNumber}: ${closeError.message}`);
          }
        }
        if (replayLinks.length === 0) {
          hasReplays = false;
        } else {
          // Process replays as we get them, page by page
          const foundExisting = await processReplays(replayLinks);
          if (foundExisting) {
            console.log("Found existing replay, stopping further pagination...");
            hasReplays = false;
          } else {
            allReplayLinks.push(...replayLinks);
            pageNumber++;
            await delay(1000);
          }
        }
      } catch (browserError) {
        console.error(`Browser error on page ${pageNumber}: ${browserError.message}`);
        if (browser) await browser.close();
        browser = null;
        await delay(5000);
      }
    }

    if (browser) await browser.close();
    console.log(`Total replays processed: ${allReplayLinks.length}`);
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

async function launchBrowser() {
  return await chromium.puppeteer.launch({
    args: [
      ...chromium.args,
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--no-sandbox',
      '--no-zygote',
      '--deterministic-fetch',
      '--disable-features=IsolateOrigins',
      '--disable-site-isolation-trials',
      '--single-process',
      '--no-zygote',
    ],
    defaultViewport: {
      width: 800,
      height: 600,
      deviceScaleFactor: 1
    },
    executablePath: await chromium.executablePath,
    headless: true,
    timeout: 120000,
  });
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