const express = require("express");
const cors = require("cors");
const obtainGameDataRouter = require('./obtainGameData');
const fs = require('fs');

const gamesService = require('./src/services/gamesService');
const forumService = require('./src/services/forumService');
const victoriesService = require('./src/services/victoriesService');
const usersService = require('./src/services/usersService');
const turnAssistantService = require('./src/services/turnAssistantService');
const smogonService = require('./src/services/smogonService');
const pokeapiService = require('./src/services/pokeapiService');
const usageService = require('./src/services/usageService');
const analysisService = require('./src/services/analysisService');

require('dotenv').config();

const path = require('path');

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

app.use('/api/replays', obtainGameDataRouter);

app.use('/api/forum', forumService);

app.use('/api/victories', victoriesService);

app.use('/api/users', usersService);

app.use('/api/turn-assistant', turnAssistantService);

app.use('/api', smogonService);

app.use('/api', pokeapiService);

app.use('/api', usageService);





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