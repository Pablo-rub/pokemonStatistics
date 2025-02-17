const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

// hacer que pase de pagina
// hacer que cuando detecte una url que ya esta en la base de datos, detenga el proceso

async function getLatestFormat() {
    // it should has vgc and bo3
    try {
      // Get the list of months from the backend
      const monthsRes = await axios.get("http://localhost:5000/api/months");
      const months = monthsRes.data; // already sorted reverse (latest first)
      if (!months.length) {
        throw new Error("No months available");
      }
      const latestMonth = months[0];
  
      // Get the list of formats for the latest month
      const formatsRes = await axios.get(`http://localhost:5000/api/formats/${latestMonth}`);
      const formats = formatsRes.data;
      
      // Filter formats that include "vgc" and "bo3"
      const vgcBo3Formats = formats.filter(f => f.toLowerCase().includes("vgc") && f.toLowerCase().includes("bo3"));
      if (!vgcBo3Formats.length) {
        throw new Error("No VGC BO3 formats found");
      }
      
      // Select the last format from the filtered list and remove the trailing attribute after "-"
      let latestFormat = vgcBo3Formats[vgcBo3Formats.length - 1];
      if (latestFormat.includes('-')) {
        latestFormat = latestFormat.split('-')[0];
      }
  
      return { month: latestMonth, format: latestFormat };
    } catch (error) {
      console.error("Error in getLatestVgcBo3Format:", error);
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
          pageNumber++;
          await delay(1000); // Esperar 1 segundo entre páginas exitosas
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

async function processReplays() {
  try {
    const replayLinks = await fetchReplayLinks();

    for (const url of replayLinks) {
      // Extract the replay ID from the URL.
      const parts = url.split('/');
      let replayId = parts[parts.length - 1].replace('.json', ''); // Remove .json if present

      // Check if the replay already exists in the database.
      const checkResponse = await axios.get(`http://localhost:5000/api/games/${replayId}`);
      if (checkResponse.data.exists) {
        console.log(`Replay ${replayId} already exists in the database.`);
        continue;
      }

      try {
        // Process replay by triggering obtainGameData via POST.
        await axios.post("http://localhost:5000/api/replays", { url });
        console.log("Processing replay:", url);
      } catch (postError) {
        // Log the error and continue with the next replay.
        console.error(`Error processing replay ${replayId}:`, postError.message);
      }
    }
  } catch (error) {
    console.error("Error processing replays:", error);
  }
}

processReplays();