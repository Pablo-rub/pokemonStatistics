/**
 * Dynamic Sitemap Generator
 * 
 * This script generates a sitemap including all individual Pokémon pages
 * Run this script periodically to update the sitemap with fresh data
 * 
 * Usage: node generateSitemap.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = 'https://traineracademy.xyz';
const OUTPUT_PATH = path.join(__dirname, 'sitemap.xml');

// Static pages with their priorities
const staticPages = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/pokemon-list', changefreq: 'weekly', priority: '0.9' },
  { url: '/rankings', changefreq: 'daily', priority: '0.9' },
  { url: '/public-games', changefreq: 'daily', priority: '0.8' },
  { url: '/battle-analytics', changefreq: 'weekly', priority: '0.7' },
  { url: '/forum', changefreq: 'daily', priority: '0.7' },
  { url: '/turn-assistant', changefreq: 'weekly', priority: '0.6' },
  { url: '/saved-games', changefreq: 'weekly', priority: '0.5' },
  { url: '/profile', changefreq: 'weekly', priority: '0.4' },
  { url: '/contact', changefreq: 'monthly', priority: '0.3' },
];

// Generate Pokemon URLs (1-1025 for all generations)
const generatePokemonUrls = () => {
  const urls = [];
  
  // Add by ID (1-1025)
  for (let i = 1; i <= 1025; i++) {
    urls.push({
      url: `/pokemon/${i}`,
      changefreq: 'monthly',
      priority: '0.7'
    });
  }
  
  return urls;
};

// Generate XML content
const generateSitemapXML = (pages) => {
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  pages.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${SITE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>\n';
  
  return xml;
};

// Main function
const generateSitemap = async () => {
  try {
    console.log('🗺️  Generating sitemap...');
    
    // Combine static and dynamic pages
    const pokemonUrls = generatePokemonUrls();
    const allPages = [...staticPages, ...pokemonUrls];
    
    console.log(`📄 Total pages: ${allPages.length}`);
    console.log(`   - Static pages: ${staticPages.length}`);
    console.log(`   - Pokémon pages: ${pokemonUrls.length}`);
    
    // Generate XML
    const xml = generateSitemapXML(allPages);
    
    // Write to file
    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    
    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📁 Location: ${OUTPUT_PATH}`);
    console.log(`\n🔗 Remember to:`);
    console.log(`   1. Submit to Google Search Console`);
    console.log(`   2. Add to robots.txt: Sitemap: ${SITE_URL}/sitemap.xml`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
};

// Run the generator
generateSitemap();

module.exports = { generateSitemap };
