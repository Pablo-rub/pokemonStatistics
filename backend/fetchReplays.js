const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');

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

async function fetchReplayLinks() {
  try {
    const { replaySearchUrl, format } = await getReplaySearchUrl();
    console.log("Fetching replays from:", replaySearchUrl);
  
    // Fetch the HTML page from Pokemon Showdown replays using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(replaySearchUrl, { waitUntil: 'networkidle0' });
      
    // Scrape the replay links from the page
    const replayLinks = await page.evaluate((format) => {
      return Array.from(document.querySelectorAll('ul.linklist li a.blocklink'))
        .map(a => a.getAttribute('href'))
        .filter(href => href && href.startsWith(format))
        .map(href => `https://replay.pokemonshowdown.com/${href}`);
    }, format);
      
    console.log(replayLinks);
    await browser.close();
  
    console.log(`Found ${replayLinks.length} replays matching format ${format}`);
    return replayLinks;
  } catch (error) {
    console.error("Error fetching replay links:", error);
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