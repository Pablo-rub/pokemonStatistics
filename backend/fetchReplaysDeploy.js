const { BigQuery } = require('@google-cloud/bigquery');
const axios = require("axios");
const cheerio = require("cheerio");
const { saveReplayToBigQuery } = require('./obtainGameDataDeploy');

const bigQuery = new BigQuery();

// Configuración: si encuentras una replay existente, se para (false) o se sigue (true)
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

    // Filtrar sólo los formatos VGC y devolver la lista completa
    const vgcBo3Formats = formats
      .filter(f => f.toLowerCase().includes("vgc"))
      .map(f => f.trim());

    if (!vgcBo3Formats.length) {
      throw new Error("No VGC BO3 formats found");
    }

    // Normalizar: quitar sufijo final si es numérico o '0' (ej. '-1500', '-0') para obtener el formato base
    const normalized = vgcBo3Formats.map(f => {
      const parts = f.split('-');
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last) || last === '0') {
        parts.pop();
        return parts.join('-');
      }
      return f;
    });

    // Devolver formatos base únicos, preservando orden
    return Array.from(new Set(normalized));
  } catch (error) {
    console.error("Error in getLatestFormat:", error);
    throw error;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchReplayLinks(formats) {
  try {
    const formatsToProcess = Array.isArray(formats) ? formats : [formats];
    const processedReplays = new Set();
    const stats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0
    };

    for (const format of formatsToProcess) {
      console.log(`\n====== Processing format: ${format} ======`);
      const searchBaseUrl = `https://replay.pokemonshowdown.com/search.json?format=${encodeURIComponent(format)}`;
      console.log(`Search URL: ${searchBaseUrl}`);

      let hasMoreReplays = true;
      let lastTimestamp = null;
      let pageCount = 0;

      while (hasMoreReplays) {
        try {
          let searchUrl = searchBaseUrl;
          if (lastTimestamp) searchUrl += `&before=${lastTimestamp}`;

          const response = await axios.get(searchUrl);
          const replays = response.data;

          if (!replays || !Array.isArray(replays) || replays.length === 0) {
            console.log(`No more replays for format ${format} (page ${pageCount})`);
            break;
          }

          pageCount++;
          hasMoreReplays = replays.length > 50;

          console.log(`Page ${pageCount}: Processing ${Math.min(50, replays.length)} replays...`);

          for (const replayMeta of replays.slice(0, 50)) {
            if (processedReplays.has(replayMeta.id)) {
              stats.skipped++;
              continue;
            }

            stats.total++;
            let logUrl = null;

            try {
              logUrl = `https://replay.pokemonshowdown.com/${replayMeta.id}.log`;
              const logResp = await axios.get(logUrl);
              
              const replayPayload = {
                replay_id: replayMeta.id,
                format,
                meta: replayMeta,
                log: logResp.data,
                source_url: logUrl
              };

              const result = await saveReplayToBigQuery(replayPayload);

              if (result && result.success) {
                processedReplays.add(replayMeta.id);
                stats.success++;
              } else {
                stats.failed++;
                console.warn(`Failed to save ${replayMeta.id}: ${result ? result.error : 'unknown error'}`);
              }

            } catch (err) {
              stats.failed++;
              console.error(`Error processing replay ${replayMeta.id} (${logUrl || 'unknown'}): ${err.message}`);
            }
          }

          const last = replays[replays.length - 1];
          lastTimestamp = last && (last.time || last.id) ? (last.time || last.id) : null;

          await delay(300);

        } catch (error) {
          console.error(`Error fetching replays for format ${format}:`, error.message);
          hasMoreReplays = false;
        }
      }

      console.log(`\n====== Format ${format} complete: ${pageCount} pages processed ======`);
    }

    console.log(`\n====== FINAL STATS ======`);
    console.log(`Total processed: ${stats.total}`);
    console.log(`Successful: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Skipped (duplicates): ${stats.skipped}`);
    console.log(`==========================\n`);

    return Array.from(processedReplays);
  } catch (error) {
    console.error("Error in fetchReplayLinks:", error);
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
      console.log('Latest formats:', formats);

      console.log('Starting to fetch replay links for all formats...');
      try {
        const processedReplays = await fetchReplayLinks(formats);
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