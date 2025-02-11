const axios = require("axios");
const cheerio = require("cheerio");

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
      console.log("Using replay search URL:", searchUrl);
      return searchUrl;
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchReplayLinks() {
    try {
      // Await the URL string returned by getReplaySearchUrl()
      const replaySearchUrl = await getReplaySearchUrl();
      // Fetch the HTML page from Pokemon Showdown replays
      const response = await axios.get(replaySearchUrl);
      const html = response.data;
      const $ = cheerio.load(html);
      const replayLinks = [];
      
      // Assuming replay links are in <a> tags and hrefs start with "/"
      $("a").each((index, element) => {
        const href = $(element).attr("href");
        if (href && href.startsWith("/")) {
          const fullUrl = `https://replay.pokemonshowdown.com${href}`;
          replayLinks.push(fullUrl);
        }
      });
      return replayLinks;
    } catch (error) {
      console.error("Error fetching replay links:", error);
      throw error;
    }
}

async function processReplays() {
  try {
    const replayLinks = await fetchReplayLinks();
    console.log("Found replay links:", replayLinks);

    // For each replay, we can call obtainGameData (either by invoking its function or via HTTP POST).
    for (const url of replayLinks) {
      // await axios.post("http://localhost:5000/replays", { url });
      console.log("Would process replay:", url);
    }
  } catch (error) {
    console.error("Error processing replays:", error);
  }
}

processReplays();