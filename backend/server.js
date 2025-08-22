const express = require("express");
const axios = require('axios');
const cors = require("cors");
const cheerio = require('cheerio');
const obtainGameDataRouter = require('./obtainGameData');
const fs = require('fs');
const bigQuery = require('./src/db/bigquery');
const gamesService = require('./src/services/gamesService');
const forumService = require('./src/services/forumService');
const victoriesService = require('./src/services/victoriesService');
const usersService = require('./src/services/usersService');
const turnAssistantService = require('./src/services/turnAssistantService');

require('dotenv').config();

const path = require('path');

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
const projectRoot = path.resolve(__dirname, '..');
const publicPath = path.join(projectRoot, 'public');

// Initialize express
const app = express();
app.use(cors());
app.use(express.json());

// Enable CORS for all requests
app.use(cors());

// Enable parsing of JSON bodies
app.use(express.json());

// Rutas para robots.txt y sitemap.xml (asegurar existencia física y fallback)
app.get('/robots.txt', (req, res) => {
  const filePath = path.join(__dirname, 'robots.txt'); // backend/robots.txt
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // fallback inline (si no hay archivo)
  res.type('text/plain').send(`User-agent: *
Allow: /

Sitemap: https://traineracademy.xyz/sitemap.xml`);
});

app.get('/sitemap.xml', (req, res) => {
  const filePath = path.join(__dirname, 'sitemap.xml'); // backend/sitemap.xml
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');

      // 1) Remove BOM if present
      content = content.replace(/^\uFEFF/, '');

      // 2) Remove any accidental filepath comments injected by tooling
      content = content.replace(/<!--\s*filepath:[\s\S]*?-->/gi, '');

      // 3) Strip any <script>...</script> and self-closing <script/> tags
      content = content.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      content = content.replace(/<script\s*\/>/gi, '');

      // 4) Remove any text before the XML declaration (keep only starting at <?xml)
      const xmlStart = content.indexOf('<?xml');
      if (xmlStart > 0) content = content.slice(xmlStart);

      // 5) Final trim and send as XML
      content = content.trim();
      res.set('Cache-Control', 'public, max-age=3600');
      return res.type('application/xml; charset=utf-8').send(content);
    } catch (err) {
      console.error('Error reading sitemap.xml:', err);
      return res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
    }
  }

  // fallback mínimo si no existe
  res.type('application/xml; charset=utf-8').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://traineracademy.xyz/</loc></url>
</urlset>`);
});

// Show when server is running
app.get('/api/status', (req, res) => {
    res.send('Server running');
});



app.use('/api/games', gamesService);

// Mount the obtainGameData router on the /api/replays path
app.use('/api/replays', obtainGameDataRouter);

// Mount the forumService router on the /api/forum path
app.use('/api/forum', forumService);

app.use('/api/victories', victoriesService);

app.use('/api/users', usersService);

app.use('/api/turn-assistant', turnAssistantService);



// Endpoint to get the list of months
app.get('/api/months', async (req, res) => {
    try {
        const response = await axios.get('https://www.smogon.com/stats/');
        const $ = cheerio.load(response.data);

        const months = new Set();
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                // Month format is YYYY-MM/
                const match = href.match(/(\d{4}-\d{2}(-DLC\d{1})?\/)/);
                if (match) {
                    months.add(match[1].replace('/', ''));
                }
            }
        });

        res.json(Array.from(months).sort().reverse());
    } catch (error) {
        console.error("Error fetching months:", error);
        res.status(500).send("Error fetching months");
    }
});

// Endpoint to get the list of formats for a given month
app.get('/api/formats/:month', async (req, res) => {
    const { month } = req.params;

    try {
        const response = await axios.get(`https://www.smogon.com/stats/${month}/`);
        const $ = cheerio.load(response.data);

        const formats = [];
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            // Format files end with .txt and are not compressed (.txt.gz)
            if (href && href.endsWith('.txt') && !href.endsWith('.txt.gz')) {
                formats.push(href.replace('.txt', ''));
            }
        });

        res.json(formats.reverse());
    } catch (error) {
        console.error("Error fetching formats:", error);
        res.status(500).send("Error fetching formats");
    }
});

// Modify the /api/rankings endpoint to fetch both sources
app.get('/api/rankings', async (req, res) => {
    const { format, month } = req.query;

    if (!format || !month) {
        res.status(400).send("Missing format or month");
        return;
    }

    try {
        // First fetch usage data for proper sorting
        const baseUrl = 'https://www.smogon.com/stats';
        const monthPath = `/${month}`;
        
        // 1. Fetch the usage data (no "moveset/" in the path)
        const usageUrl = `${baseUrl}${monthPath}/${format}.txt`;
        console.log('Fetching usage stats from URL:', usageUrl);
        
        const usageResponse = await axios.get(usageUrl);
        const usageData = parseUsageData(usageResponse.data);
        
        // 2. Fetch the moveset data for details
        const movesetUrl = `${baseUrl}${monthPath}/moveset/${format}.txt`;
        console.log('Fetching moveset data from URL:', movesetUrl);
        
        const movesetResponse = await axios.get(movesetUrl);
        const movesetData = parseMovesetText(movesetResponse.data);
        
        // 3. Combine the data, prioritizing the order from usage data
        const combinedData = combineData(usageData, movesetData);
        
        // Log para depuración
        console.log(`Sending data with ${Object.keys(combinedData.data).length} Pokémon entries`);
        // Opcional: log de ejemplo para el primer Pokémon
        if (Object.keys(combinedData.data).length > 0) {
            const firstPokemon = Object.keys(combinedData.data)[0];
            console.log(`Sample: ${firstPokemon} with usage ${combinedData.data[firstPokemon].usage}%`);
        }
        
        res.send(combinedData);
    } catch (error) {
        console.error("Error fetching data from Smogon:", error);
        console.error("Error details:", error.message);
        
        // Intentar con formato base si hay un error (sin -1760)
        try {
            if (format.includes('-')) {
                const baseFormat = format.split('-')[0];
                const baseUrl = 'https://www.smogon.com/stats';
                const monthPath = `/${month}`;
                
                // Try both sources with base format
                const usageUrl = `${baseUrl}${monthPath}/${baseFormat}.txt`;
                const movesetUrl = `${baseUrl}${monthPath}/moveset/${baseFormat}.txt`;
                
                console.log('Trying fallback usage URL:', usageUrl);
                
                const usageResponse = await axios.get(usageUrl);
                const usageData = parseUsageData(usageResponse.data);
                
                console.log('Trying fallback moveset URL:', movesetUrl);
                
                const movesetResponse = await axios.get(movesetUrl);
                const movesetData = parseMovesetText(movesetResponse.data);
                
                const combinedData = combineData(usageData, movesetData);
                
                res.send(combinedData);
                return;
            }
        } catch (fallbackError) {
            console.error("Fallback also failed:", fallbackError.message);
        }
        
        res.status(500).send("Error fetching data from Smogon");
    }
});

// Function to parse usage data from Smogon
function parseUsageData(text) {
    const usageData = [];
    const lines = text.split('\n');
    
    // Find the start of the data section
    let dataStartLine = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('| Rank | Pokemon') && lines[i].includes('| Usage %')) {
            dataStartLine = i + 2; // Start 2 lines after the header
            break;
        }
    }
    
    // Parse each data line
    for (let i = dataStartLine; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && !line.startsWith('+-')) {
            // Parse line like: "| 1 | Urshifu-Rapid-Strike | 32.27% |"
            const parts = line.split('|').filter(part => part.trim());
            if (parts.length >= 3) {
                const rank = parts[0].trim();
                const name = parts[1].trim();
                // Extract percentage without % symbol
                const usageMatch = parts[2].trim().match(/([0-9.]+)%/);
                if (usageMatch) {
                    const usagePercentage = parseFloat(usageMatch[1]);
                    usageData.push({
                        rank,
                        name,
                        usagePercentage
                    });
                }
            }
        }
        
        // Stop parsing when we reach the end of the data table
        if (line.startsWith('+-')) {
            const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
            if (!nextLine.startsWith('|')) {
                break;
            }
        }
    }
    
    return usageData;
}

// Function to combine usage data with moveset details
function combineData(usageData, movesetData) {
    const result = {
        data: {}
    };
    
    // First, add all Pokemon from the usage data to maintain the correct order
    for (const pokemon of usageData) {
        const movesetInfo = movesetData.data[pokemon.name] || {};
        
        // Create entry with usage data and any available moveset data
        result.data[pokemon.name] = {
            ...movesetInfo,
            // Keep the usage percentage as is - don't multiply again
            usage: pokemon.usagePercentage,
            rank: parseInt(pokemon.rank)
        };
    }
    
    return result;
}

// Function to parse moveset data from Smogon with correct teammate and spread handling
function parseMovesetText(text) {
    const pokemonData = {};
    
    try {
        // Modified regex to only match actual Pokémon headers
        const pokemonRegex = /\+[-]{40,}\+\s*\n\s*\| ([^|]+?) \|\s*\n\s*\+[-]{40,}\+/g;
        
        // Get all Pokémon header positions
        const pokemonPositions = [];
        let match;
        while ((match = pokemonRegex.exec(text)) !== null) {
            pokemonPositions.push({
                name: match[1].trim(),
                position: match.index
            });
        }
        
        // Process each Pokémon block
        for (let i = 0; i < pokemonPositions.length; i++) {
            const pokemonName = pokemonPositions[i].name;
            
            // Skip "Checks and Counters" section headers
            if (pokemonName === "Checks and Counters") continue;
            
            const startPos = pokemonPositions[i].position;
            const endPos = (i < pokemonPositions.length - 1) ? 
                            pokemonPositions[i + 1].position : 
                            text.length;
            
            const pokemonBlock = text.substring(startPos, endPos);
            
            // Initialize data structure
            const data = {
                rawCount: 0,
                avgWeight: 0,
                viabilityCeiling: 0,
                usage: 0,
                Abilities: {},
                Items: {},
                Spreads: {},
                Moves: {},
                "Tera Types": {},
                Teammates: {},
                "Checks and Counters": {}
            };
            
            // Extract basic data
            const rawCountMatch = pokemonBlock.match(/\| Raw count: (\d+)/);
            if (rawCountMatch) {
                data.rawCount = parseInt(rawCountMatch[1]);
            }
            
            const weightMatch = pokemonBlock.match(/\| Avg\. weight: ([0-9.e-]+)/);
            if (weightMatch) {
                data.avgWeight = parseFloat(weightMatch[1]);
                data.usage = parseFloat((data.avgWeight * 100).toFixed(2)); // Convert to percentage
            }
            
            const ceilingMatch = pokemonBlock.match(/\| Viability Ceiling: (\d+)/);
            if (ceilingMatch) {
                data.viabilityCeiling = parseInt(ceilingMatch[1]);
            }
            
            // Process each section separately
            const sectionHeaders = [
                "Abilities", 
                "Items", 
                "Spreads", 
                "Moves", 
                "Tera Types", 
                "Teammates", 
                "Checks and Counters"
            ];
            
            for (const section of sectionHeaders) {
                // Find the section start position
                const sectionStartIndex = pokemonBlock.indexOf(`| ${section}`);
                if (sectionStartIndex === -1) continue;
                
                // Find the section end position (next section or end of block)
                let sectionEndIndex = pokemonBlock.length;
                for (const nextSection of sectionHeaders) {
                    if (nextSection === section) continue;
                    
                    const nextSectionIndex = pokemonBlock.indexOf(`| ${nextSection}`, sectionStartIndex);
                    if (nextSectionIndex !== -1 && nextSectionIndex < sectionEndIndex) {
                        sectionEndIndex = nextSectionIndex;
                    }
                }
                
                // Extract section content
                const sectionContent = pokemonBlock.substring(sectionStartIndex, sectionEndIndex);
                const sectionLines = sectionContent.split('\n');
                
                // Process each line in the section
                for (let j = 1; j < sectionLines.length; j++) { // Skip the header line
                    const line = sectionLines[j].trim();
                    if (!line || !line.includes('%') || !line.includes('|')) continue;
                    
                    let match;
                    if (section === "Spreads") {
                        match = line.match(/\|\s*([^|]+?)\s+([0-9.]+)%/);
                    } else if (section === "Teammates") {
                        match = line.match(/\|\s*([^|0-9]+?)\s+([0-9.]+)%/);
                    } else {
                        match = line.match(/\|\s*([^|0-9]+?)\s+([0-9.]+)%/);
                    }
                    
                    if (match) {
                        const name = match[1].trim();
                        const percentage = parseFloat(match[2]);
                        data[section][name] = percentage;
                    }
                }
            }
            
            // Store processed data
            pokemonData[pokemonName] = data;
        }
    } catch (error) {
        console.error("Error parsing moveset data:", error);
        console.error(error.stack);
    }
    
    return { data: pokemonData };
}

app.get('/api/items', async (req, res) => {
  try {
    // Consulta PokeAPI para obtener hasta 1000 ítems (ajusta el limit según sea necesario)
    const response = await axios.get('https://pokeapi.co/api/v2/item?limit=10000');
    const items = response.data.results.map(item => ({
      // Formateamos el nombre para que aparezca con mayúsculas en cada palabra
      name: item.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: item.url
    }));
    res.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).send("Error fetching items");
  }
});

// Endpoint para obtener la lista de habilidades (abilities)
app.get('/api/abilities', async (req, res) => {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/ability?limit=1000');
    const abilities = response.data.results.map(ability => ({
      name: ability.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: ability.url
    }));
    res.json(abilities);
  } catch (error) {
    console.error("Error fetching abilities:", error);
    res.status(500).send("Error fetching abilities");
  }
});

// Endpoint para obtener la lista de movimientos (moves)
app.get('/api/moves', async (req, res) => {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/move?limit=1000');
    const moves = response.data.results.map(move => ({
      name: move.name
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' '),
      url: move.url
    }));
    res.json(moves);
  } catch (error) {
    console.error("Error fetching moves:", error);
    res.status(500).send("Error fetching moves");
  }
});

// Endpoint: Team usage statistics grouped by month
app.get('/api/teams/usage', async (req, res) => {
  try {
    const {
      format: formatParam,
      month: monthParam,
      page = '1',
      limit = '12',
      sortBy = 'usage',
      sortDir = 'desc'
    } = req.query;
    const pageInt  = parseInt(page,  10);
    const limitInt = parseInt(limit, 10);
    const offset   = (pageInt - 1) * limitInt;

    if (!formatParam) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    // extraer rating mínimo (p.ej. “1760” de “gen9vgc2025reggbo3-1760”)
    let minRating = 0;
    let formatName = formatParam;
    const parts = formatParam.split('-');
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      minRating = parseInt(last, 10);
      parts.pop();
      formatName = parts.join('-');
    }

    const query = `
      WITH team_stats AS (
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          ARRAY_TO_STRING(
            ARRAY(
              SELECT LOWER(p.name)
              FROM UNNEST(teams.p1) AS p
              ORDER BY LOWER(p.name)
            ), ';'
          ) AS team,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player1 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
        GROUP BY month, team
        UNION ALL
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          ARRAY_TO_STRING(
            ARRAY(
              SELECT LOWER(p.name)
              FROM UNNEST(teams.p2) AS p
              ORDER BY LOWER(p.name)
            ), ';'
          ) AS team,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player2 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
        GROUP BY month, team
      )
      SELECT
        month,
        team,
        SUM(total_games) AS total_games,
        SUM(wins) AS wins,
        ROUND(SUM(wins)/SUM(total_games)*100, 2) AS win_rate
      FROM team_stats
      GROUP BY month, team
      ORDER BY month ASC, win_rate DESC
    `;

    const [rows] = await bigQuery.query({
      query,
      params: { formatName, minRating }
    });

    // Group rows by team and build history array
    const teamMap = {};
    rows.forEach(({ month, team, total_games, wins, win_rate }) => {
      if (!teamMap[team]) {
        teamMap[team] = { name: team, history: [] };
      }
      teamMap[team].history.push({
        month,
        usage: win_rate,
        total_games,
        wins
      });
    });

    // Build full team array with history and current‐month stats
    const teams = Object.values(teamMap).map(t => {
      t.history.sort((a,b) => a.month.localeCompare(b.month));
      // find record for the selected month
      const rec = t.history.find(h => h.month === monthParam) || { usage:0, total_games:0, wins:0 };
      t.monthly_usage       = rec.usage;
      t.monthly_total_games = rec.total_games;
      t.monthly_wins        = rec.wins;
      return t;
    });

    // sort by monthly_usage or monthly_total_games
    teams.sort((a,b) => {
      const dir = sortDir.toLowerCase()==='asc'?1:-1;
      const field = sortBy==='total_games'?'monthly_total_games':'monthly_usage';
      return dir*(a[field] - b[field]);
    });

    // apply pagination
    const paged = teams.slice(offset, offset + limitInt);
    res.json({ teams: paged, total: teams.length });
  } catch (error) {
    console.error("Error fetching team usage:", error);
    res.status(500).json({ error: "Error fetching team usage" });
  }
});

// Endpoint: Lead usage statistics grouped by month
app.get('/api/leads/usage', async (req, res) => {
  try {
    const {
      format: formatParam,
      month: monthParam,
      page = '1',
      limit = '12',
      sortBy = 'win_rate',
      sortDir = 'desc'
    } = req.query;
    const pageInt  = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset   = (pageInt - 1) * limitInt;

    if (!formatParam) {
      return res.status(400).json({ error: 'Format parameter is required' });
    }

    // extraer rating mínimo (ej. “1760” de “gen9vgc2025reggbo3-1760”)
    let minRating = 0;
    const parts = formatParam.split('-');
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      minRating = parseInt(last, 10);
      parts.pop();
    }

    const query = `
      WITH lead_stats AS (
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          /* first two starters on player1 side */
          CONCAT(
            LOWER(teams.p1[OFFSET(0)].name), ';',
            LOWER(teams.p1[OFFSET(1)].name)
          ) AS lead,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player1 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
          AND ARRAY_LENGTH(teams.p1) >= 2   -- need two starting Pokémon
        GROUP BY month, lead
        UNION ALL
        SELECT
          FORMAT_TIMESTAMP('%Y-%m', date) AS month,
          /* first two starters on player2 side */
          CONCAT(
            LOWER(teams.p2[OFFSET(0)].name), ';',
            LOWER(teams.p2[OFFSET(1)].name)
          ) AS lead,
          COUNT(*) AS total_games,
          SUM(CASE WHEN winner = player2 THEN 1 ELSE 0 END) AS wins
        FROM \`pokemon-statistics.pokemon_replays.replays\`
        WHERE LOWER(format) LIKE '%vgc%'
          AND LOWER(format) LIKE '%2025%'
          AND LOWER(format) LIKE '%bo3%'
          AND (rating IS NULL OR rating >= @minRating)
          AND ARRAY_LENGTH(teams.p2) >= 2   -- need two starting Pokémon
        GROUP BY month, lead
      )
      SELECT
        month,
        lead,
        SUM(total_games) AS total_games,
        SUM(wins)       AS wins,
        ROUND(SUM(wins)/SUM(total_games)*100, 2) AS win_rate
      FROM lead_stats
      GROUP BY month, lead
      ORDER BY month ASC, win_rate DESC
    `;

    const [rows] = await bigQuery.query({ query, params: { minRating } });

    // Group rows by lead and build history
    const leadMap = {};
    rows.forEach(({ month, lead, total_games, wins, win_rate }) => {
      if (!leadMap[lead]) leadMap[lead] = { name: lead, history: [] };
      leadMap[lead].history.push({
        month,
        total_games,
        wins,
        usage: win_rate
      });
    });

    // Assemble array, extract stats for monthParam, sort & paginate
    let leads = Object.values(leadMap).map(l => {
      l.history.sort((a,b) => a.month.localeCompare(b.month));
      const rec = l.history.find(h => h.month === monthParam) || { usage:0, total_games:0, wins:0 };
      l.monthly_usage       = rec.usage;
      l.monthly_total_games = rec.total_games;
      l.monthly_wins        = rec.wins;
      return l;
    });
    const totalItems = leads.length;
    leads.sort((a,b) => {
      const dir = sortDir.toLowerCase()==='asc'?1:-1;
      const field = sortBy==='total_games'? 'monthly_total_games' : 'monthly_usage';
      return dir * (a[field] - b[field]);
    });
    const paged = leads.slice(offset, offset + limitInt);
    res.json({ leads: paged, total: totalItems });
  } catch (error) {
    console.error("Error fetching lead usage:", error);
    res.status(500).json({ error: "Error fetching leads usage" });
  }
});

// Analyze battle endpoint
app.get('/api/analyze-battle/:replayId', async (req, res) => {
  const { replayId } = req.params;
  try {
    // 1) Fetch teams + turns
    const query = `
      SELECT teams, turns
      FROM \`pokemon-statistics.pokemon_replays.replays\`
      WHERE replay_id = @replayId
    `;
    const [rows] = await bigQuery.query({ query, params: { replayId } });
    if (!rows.length) return res.status(404).json({ error: 'Replay not found' });
    const { teams, turns } = rows[0];

    // 2) For each turn, build payload with the actual on-field Pokémon objects
    const analysis = await Promise.all(turns.map(async turn => {
      // active pokemon
      const rawP1 = turn.moves_done?.player1 || [];
      const rawP2 = turn.moves_done?.player2 || [];
      const moveUsedP1 = rawP1.map(m => m?.trim() || '').join(', ');
      const moveUsedP2 = rawP2.map(m => m?.trim() || '').join(', ');

      // Get active Pokémon names from starts_with
      const activeP1Names = turn.starts_with?.player1 || [];
      const activeP2Names = turn.starts_with?.player2 || [];

      // Find the detailed Pokémon data for each active Pokémon
      const topLeftPokemon = activeP1Names[0] ? 
        turn.revealed_pokemon.player1.find(p => p.name === activeP1Names[0]) : null;
      
      const topRightPokemon = activeP1Names[1] ? 
        turn.revealed_pokemon.player1.find(p => p.name === activeP1Names[1]) : null;
      
      const bottomLeftPokemon = activeP2Names[0] ? 
        turn.revealed_pokemon.player2.find(p => p.name === activeP2Names[0]) : null;
      
      const bottomRightPokemon = activeP2Names[1] ? 
        turn.revealed_pokemon.player2.find(p => p.name === activeP2Names[1]) : null;

      // Create minimal Pokémon objects with at least names if detailed data isn't available
      const pokemonData = {
        topLeft: topLeftPokemon || (activeP1Names[0] ? { name: activeP1Names[0] } : null),
        topRight: topRightPokemon || (activeP1Names[1] ? { name: activeP1Names[1] } : null),
        bottomLeft: bottomLeftPokemon || (activeP2Names[0] ? { name: activeP2Names[0] } : null),
        bottomRight: bottomRightPokemon || (activeP2Names[1] ? { name: activeP2Names[1] } : null),
      };

      // battle conditions
      const battleConditions = {
        weather:    turn.weather?.condition || "",
        field:      turn.field?.terrain   || "",
        room:       turn.room?.condition    || "",
        sideEffects: {
        yourSide: {
          tailwind:  turn.tailwind?.player1  || false,
          reflect:   turn.screens?.reflect?.player1    || false,
          lightscreen: turn.screens?.lightscreen?.player1 || false,
          auroraveil:  turn.screens?.auroraveil?.player1  || false
        },
        opponentSide: {
          tailwind:  turn.tailwind?.player2  || false,
          reflect:   turn.screens?.reflect?.player2    || false,
          lightscreen: turn.screens?.lightscreen?.player2 || false,
          auroraveil:  turn.screens?.auroraveil?.player2  || false
        }
      },
      entryHazards:       { yourSide: {}, opponentSide: {} }
    };

      // teams
      const yourTeam     = teams.p1 || [];
      const opponentTeam = teams.p2 || [];

      // Prepare the body for P1 perspective
      const bodyP1 = { pokemonData, battleConditions, yourTeam, opponentTeam };

      // Also prepare a swapped version for P2 perspective
      const swapSides = bc => ({
        weather:            bc.weather,
        field:              bc.field,
        room:               bc.room,
        sideEffects: {
          yourSide:         bc.sideEffects.opponentSide,
          opponentSide:     bc.sideEffects.yourSide
        },
        entryHazards:        { yourSide: bc.entryHazards.opponentSide,   opponentSide: bc.entryHazards.yourSide }
      });

      const bodyP2 = {
        // swap the four slots so TA treats P2 as "your"
        pokemonData: {
          topLeft:    pokemonData.bottomLeft,
          topRight:   pokemonData.bottomRight,
          bottomLeft: pokemonData.topLeft,
          bottomRight:pokemonData.topRight
        },
        battleConditions: swapSides(battleConditions),
        yourTeam:        opponentTeam,
        opponentTeam:    yourTeam
      };

      try {
        // llamamos a TA para P1 y P2
        const [res1, res2] = await Promise.all([
          axios.post(`${API_URL}/api/turn-assistant/analyze`, bodyP1),
          axios.post(`${API_URL}/api/turn-assistant/analyze`, bodyP2)
        ]);

        const ta1 = res1.data;
        const ta2 = res2.data;

        // normaliza winRate de P1
        const raw     = ta1.data?.winRate ?? 0;
        const winRate = raw > 1 ? raw / 100 : raw;
        const hasData = ta1.matchingScenarios > 0;

        // ← aquí: extrae allMoveOptions del objeto `data`
        const opts1 = ta1.data?.allMoveOptions || {};
        const opts2 = ta2.data?.allMoveOptions || {};
        const allMoveOptions = { ...opts1, ...opts2 };

        // opcional: log para verificar
        console.log(`Turn ${turn.turn_number} opts1:`, Object.keys(opts1));
        console.log(`Turn ${turn.turn_number} opts2:`, Object.keys(opts2));
        console.log(`Turn ${turn.turn_number} merged:`, Object.keys(allMoveOptions));

        return {
          turn_number:    turn.turn_number,
          activePokemon:  { p1: activeP1Names, p2: activeP2Names },
          moveUsedP1,
          moveUsedP2,
          winProbP1:      hasData ? winRate     : null,
          winProbP2:      hasData ? 1 - winRate : null,
          noData:         !hasData,
          scenarioCount:  ta1.matchingScenarios || 0,
          state:          battleConditions,
          allMoveOptions
        };
      } catch (error) {
        console.error(`Error analyzing turn ${turn.turn_number}:`, error);
        return {
          turn_number:   turn.turn_number,
          activePokemon: { p1: activeP1Names, p2: activeP2Names },
          moveUsedP1,
          moveUsedP2,
          winProbP1:    null,
          winProbP2:    null,
          noData:       true,
          scenarioCount: 0,
          allMoveOptions:{}
        };
      }
    }));

    return res.json({ replayId, teams, analysis });
  }
  catch (err) {
    console.error('Error in /api/analyze-battle:', err);
    return res.status(500).json({ error: 'Error analyzing battle' });
  }
});

// Endpoint para estadísticas de múltiples replays
app.post('/api/multistats', async (req, res) => {
  try {
    const { replayIds } = req.body;
    if (!Array.isArray(replayIds) || replayIds.length < 2) {
      return res.status(400).json({ error: 'At least two replay IDs are required' });
    }

    // 1) Obtener los jugadores de cada replay
    const playerQuery = `
      SELECT replay_id, player1, player2
      FROM \`pokemon-statistics.pokemon_replays.replays\`
      WHERE replay_id IN UNNEST(@ids)
    `;
    const [playerRows] = await bigQuery.query({
      query: playerQuery,
      params: { ids: replayIds }
    });
    if (playerRows.length !== replayIds.length) {
      return res
        .status(404)
        .json({ error: 'One or more replay IDs not found in the database' });
    }

    // 2) Calcular intersección para hallar el jugador común
    let comunes = new Set([playerRows[0].player1, playerRows[0].player2]);
    for (let i = 1; i < playerRows.length; i++) {
      const { player1, player2 } = playerRows[i];
      comunes = new Set(
        [...comunes].filter(p => p === player1 || p === player2)
      );
      if (comunes.size === 0) break;
    }
    if (comunes.size !== 1) {
      return res.status(400).json({ error: 'There is no single common player across all replays' });
    }
    const [player] = [...comunes];

    // 3) Obtener "teams" y "turns" de esas replays
    const dataQuery = `
      SELECT replay_id, teams, turns, winner, player1, player2
      FROM \`pokemon-statistics.pokemon_replays.replays\`
      WHERE replay_id IN UNNEST(@ids)
    `;
    const [dataRows] = await bigQuery.query({
      query: dataQuery,
      params: { ids: replayIds }
    });

    // 0) Determinar los movesets de los Pokémon del jugador común (suponiendo todas las replays comparten equipo)
    const firstMeta = playerRows.find(r => r.replay_id === dataRows[0].replay_id);
    const firstSide = firstMeta.player1 === player ? 'p1' : 'p2';
    const firstTeam = dataRows[0].teams?.[firstSide] || [];
    const teamMovesets = {};
    for (const mon of firstTeam) {
      if (mon.name && Array.isArray(mon.moves)) {
        teamMovesets[mon.name] = mon.moves;
      }
    }

    // 1) Inicializar contador de uso de cada movimiento por Pokémon
    const moveCounts = {};
    for (const [name, moves] of Object.entries(teamMovesets)) {
      moveCounts[name] = {};
      for (const mv of moves) {
        moveCounts[name][mv] = 0;
      }
    }

    // Inicializar contadores
    const usageCounts        = {};
    const winCounts          = {};
    const lossCounts         = {};
    const teraCount          = {};
    const teraWinCounts      = {};
    const rivalUsageCounts   = {};
    const rivalWinCounts     = {};
    const rivalTeamCounts    = {};    // NUEVO: apariciones en equipo rival
    const leadCounts         = {};
    const leadWinCounts      = {};
    const leadPairCounts     = {};
    const leadPairWinCounts  = {};

    for (const row of dataRows) {
      const meta      = playerRows.find(r => r.replay_id === row.replay_id);
      const side      = meta.player1 === player ? 'p1' : 'p2';
      const playerKey = side.replace('p','player');  // 'player1' o 'player2'

      // CONTAR EQUIPO RIVAL (independiente de combate)
      const rivalTeamList = row.teams?.[side === 'p1' ? 'p2' : 'p1'] || [];
      const names = rivalTeamList
        .map(mon => mon.name)
        .filter(n => typeof n === 'string' && n !== 'none');
      for (const name of new Set(names)) {
        rivalTeamCounts[name] = (rivalTeamCounts[name] || 0) + 1;
      }

      // NUEVO: Contar leads de esta partida (turno 1)
      if (row.turns.length > 0) {
        const firstTurn = row.turns.find(t => t.turn_number === 1) || row.turns[0];
        const leads = (firstTurn.starts_with?.[playerKey] || [])
          .filter(name => name && name !== 'none');
        const uniqueLeads = [...new Set(leads)];

        // Conteo individual y victorias tras lead
        uniqueLeads.forEach(mon => {
          leadCounts[mon] = (leadCounts[mon] || 0) + 1;
          if (row.winner === player) {
            leadWinCounts[mon] = (leadWinCounts[mon] || 0) + 1;
          }
        });

        // Conteo de pareja y victorias tras esa pareja
        if (uniqueLeads.length === 2) {
          const [a, b] = uniqueLeads.sort();
          const key = `${a}|${b}`;
          leadPairCounts[key] = (leadPairCounts[key] || 0) + 1;
          if (row.winner === player) {
            leadPairWinCounts[key] = (leadPairWinCounts[key] || 0) + 1;
          }
        }
      }

      const seenThisReplay      = new Set();
      const rivalSeenThisReplay = new Set();
      const teraPokemonThisReplay = new Set();

      if (Array.isArray(row.turns)) {
        for (const turn of row.turns) {
          // Verificar Pokémon activos del jugador común
          if (turn.starts_with && turn.starts_with[playerKey]) {
            const activeAtStart = turn.starts_with[playerKey];
            for (const monName of activeAtStart) {
              if (monName && monName !== 'none' && typeof monName === 'string') {
                seenThisReplay.add(monName);
              }
            }
          }
          
          // Verificar Pokémon activos del RIVAL
          if (turn.starts_with && turn.starts_with[side === 'p1' ? 'player2' : 'player1']) {
            const rivalActiveAtStart = turn.starts_with[side === 'p1' ? 'player2' : 'player1'];
            for (const monName of rivalActiveAtStart) {
              if (monName && monName !== 'none' && typeof monName === 'string') {
                rivalSeenThisReplay.add(monName);
              }
            }
          }
          
          // Verificar en revealed_pokemon para jugador común y registrar terastalizaciones
          if (turn.revealed_pokemon && turn.revealed_pokemon[playerKey]) {
            for (const pokemon of turn.revealed_pokemon[playerKey]) {
              if (pokemon && pokemon.name && pokemon.name !== 'none') {
                // Añadir a Pokémon vistos
                seenThisReplay.add(pokemon.name);
                
                // Verificar si el Pokémon ha terastalizado (condición más flexible)
                if (pokemon.tera && 
                   (pokemon.tera.active === true || 
                    pokemon.tera.active === 'true' || 
                    pokemon.tera.active === 1)) {
                  teraPokemonThisReplay.add(pokemon.name);
                }
              }
            }
          }
          
          // Verificar en revealed_pokemon para RIVAL
          if (turn.revealed_pokemon && turn.revealed_pokemon[side === 'p1' ? 'player2' : 'player1']) {
            for (const pokemon of turn.revealed_pokemon[side === 'p1' ? 'player2' : 'player1']) {
              if (pokemon && pokemon.name && pokemon.name !== 'none') {
                rivalSeenThisReplay.add(pokemon.name);
              }
            }
          }

          // Contar movimientos usados por cada Pokémon
          const actions = turn.moves_done?.[playerKey] || [];
          for (const action of actions) {
            // Normalizamos la descripción de la acción
            const actNorm = action
              .toLowerCase()
              .replace(/\s+/g, '')
              .replace(/[^a-z0-9]/g, '');

            // Para cada Pokémon y sus movimientos
            for (const [monName, moves] of Object.entries(teamMovesets)) {
              for (const mv of moves) {
                const mvNorm = mv
                  .toLowerCase()
                  .replace(/\s+/g, '')
                  .replace(/[^a-z0-9]/g, '');

                // Si aparece el nombre del movimiento, lo contamos
                if (actNorm.includes(mvNorm)) {
                  moveCounts[monName][mv] = (moveCounts[monName][mv] || 0) + 1;
                }
              }
            }
          }
        }
      }

      // Contar apariciones, victorias y derrotas
      for (const mon of seenThisReplay) {
        usageCounts[mon] = (usageCounts[mon] || 0) + 1;
        if (row.winner === player)   winCounts[mon]   = (winCounts[mon]   || 0) + 1;
        else                         lossCounts[mon]  = (lossCounts[mon]  || 0) + 1;
      }

      // CONTAR TERASTALIZACIONES y CUÁNTAS DE ESAS PARTIDAS SE GANARON
      for (const mon of teraPokemonThisReplay) {
        teraCount[mon] = (teraCount[mon] || 0) + 1;
        if (row.winner === player) {
          teraWinCounts[mon] = (teraWinCounts[mon] || 0) + 1;
        }
      }

      // CONTAR uso rival en combate
      for (const mon of rivalSeenThisReplay) {
        rivalUsageCounts[mon] = (rivalUsageCounts[mon] || 0) + 1;
        if (row.winner !== player) {
          rivalWinCounts[mon] = (rivalWinCounts[mon] || 0) + 1;
        }
      }
    }

    return res.json({
      player,
      usageCounts,
      winCounts,
      lossCounts,
      teraCount,
      teraWinCounts,
      rivalUsageCounts,
      rivalWinCounts,
      rivalTeamCounts,      // <-- nuevo campo
      leadCounts,
      leadWinCounts,
      leadPairCounts,
      leadPairWinCounts,
      moveCounts    // <-- aquí están los conteos de cada movimiento
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use(express.static(publicPath));

const clientBuildPath = path.join(projectRoot, 'client', 'build');
// Redirección a HTTPS en producción (opcional pero recomendable)
if (process.env.NODE_ENV === 'production') {
  app.enable('trust proxy');
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}
// Servir estáticos del cliente
app.use(express.static(clientBuildPath));

// Si no encuentra una ruta API, devuelve el index.html (para React Router)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).send('Not found');
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
  console.log(`Public path: ${publicPath}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});