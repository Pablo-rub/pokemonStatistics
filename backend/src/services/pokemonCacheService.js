const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../cache/pokemon-data.json');

// ✅ CAMBIO: De 24 horas a 30 días
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025; // Gen 1-9

class PokemonCacheService {
  constructor() {
    this.cache = null;
    this.lastUpdate = null;
    this.isInitializing = false;
    this.initPromise = null;
  }

  // Inicializar caché (desde archivo o API)
  async initializeCache() {
    // Evitar múltiples inicializaciones simultáneas
    if (this.isInitializing) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this._doInitialize();
    
    try {
      await this.initPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  async _doInitialize() {
    try {
      console.log('🔄 Initializing Pokemon cache...');
      
      // Intentar cargar desde archivo
      if (fs.existsSync(CACHE_FILE)) {
        const fileData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        const fileAge = Date.now() - fileData.timestamp;
        
        // ✅ Ahora compara contra 30 días en lugar de 24 horas
        if (fileAge < CACHE_DURATION) {
          this.cache = fileData.data;
          this.lastUpdate = fileData.timestamp;
          
          // ✅ Mejorar el log para mostrar días en lugar de horas
          const daysOld = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          console.log(`✅ Pokemon cache loaded from file (${Object.keys(this.cache).length} entries, ${daysOld} days old)`);
          return;
        } else {
          const daysOld = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          console.log(`⏰ Cache file is outdated (${daysOld} days old), will refresh`);
        }
      }
      
      // Si no existe o está desactualizado, actualizar
      await this.updateCache();
    } catch (error) {
      console.error('❌ Error initializing pokemon cache:', error);
      this.cache = {};
    }
  }

  // Actualizar caché completo desde PokeAPI
  async updateCache() {
    console.log('🔄 Updating pokemon cache from PokeAPI...');
    const startTime = Date.now();
    
    try {
      const newCache = {};
      const BATCH_SIZE = 50;
      const DELAY_BETWEEN_BATCHES = 100; // ms

      // Generar IDs del 1 al 1025
      const pokemonIds = Array.from({ length: MAX_POKEMON_ID }, (_, i) => i + 1);
      
      // Procesar en lotes
      for (let i = 0; i < pokemonIds.length; i += BATCH_SIZE) {
        const batchIds = pokemonIds.slice(i, i + BATCH_SIZE);
        const promises = batchIds.map(id => this.fetchPokemonData(id));
        
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const pokemon = result.value;
            newCache[pokemon.name] = pokemon;
          }
        });

        // Log de progreso
        const processed = Math.min(i + BATCH_SIZE, pokemonIds.length);
        const percentage = ((processed / pokemonIds.length) * 100).toFixed(1);
        console.log(`   Progress: ${percentage}% (${processed}/${pokemonIds.length})`);
        
        // Pausa entre lotes
        if (i + BATCH_SIZE < pokemonIds.length) {
          await this.delay(DELAY_BETWEEN_BATCHES);
        }
      }

      this.cache = newCache;
      this.lastUpdate = Date.now();

      // Guardar en archivo
      await this.saveCacheToFile();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Pokemon cache updated: ${Object.keys(newCache).length} entries in ${duration}s`);
    } catch (error) {
      console.error('❌ Error updating pokemon cache:', error);
      throw error;
    }
  }

  // Obtener datos de un Pokémon específico desde PokeAPI
  async fetchPokemonData(id) {
    try {
      const response = await axios.get(`${POKEAPI_BASE}/pokemon/${id}`, {
        timeout: 10000 // 10 segundos timeout
      });
      const data = response.data;

      return {
        id: data.id,
        name: data.name,
        displayName: this.formatName(data.name),
        types: data.types.map(t => ({
          slot: t.slot,
          name: t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)
        })),
        abilities: data.abilities.map(a => ({
          name: a.ability.name,
          isHidden: a.is_hidden,
          slot: a.slot
        })),
        stats: data.stats.map(s => ({
          name: s.stat.name,
          baseStat: s.base_stat
        })),
        sprite: data.sprites.front_default,
        spriteShiny: data.sprites.front_shiny,
        officialArtwork: data.sprites.other?.['official-artwork']?.front_default,
        height: data.height,
        weight: data.weight
      };
    } catch (error) {
      console.error(`Error fetching pokemon ${id}:`, error.message);
      return null;
    }
  }

  // Formatear nombre (capitalize y reemplazar guiones)
  formatName(name) {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Guardar caché en archivo JSON
  async saveCacheToFile() {
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data = {
        timestamp: this.lastUpdate,
        version: '1.0',
        count: Object.keys(this.cache).length,
        data: this.cache
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
      console.log('💾 Pokemon cache saved to file');
    } catch (error) {
      console.error('❌ Error saving cache to file:', error);
    }
  }

  // Obtener todos los Pokémon del caché
  async getAllPokemon() {
    if (!this.cache) {
      await this.initializeCache();
    }
    return Object.values(this.cache || {});
  }

  // Obtener un Pokémon específico por nombre o ID
  async getPokemon(nameOrId) {
    if (!this.cache) {
      await this.initializeCache();
    }
    
    const key = nameOrId.toString().toLowerCase();
    
    // Buscar por nombre
    if (this.cache[key]) {
      return this.cache[key];
    }
    
    // Buscar por ID
    const byId = Object.values(this.cache).find(p => p.id === parseInt(key));
    return byId || null;
  }

  // Verificar si necesita actualización
  needsUpdate() {
    if (!this.lastUpdate) return true;
    return Date.now() - this.lastUpdate > CACHE_DURATION;
  }

  // Obtener estadísticas del caché
  getStats() {
    const ageMs = this.lastUpdate ? Date.now() - this.lastUpdate : null;
    
    return {
      count: this.cache ? Object.keys(this.cache).length : 0,
      lastUpdate: this.lastUpdate,
      needsUpdate: this.needsUpdate(),
      // ✅ Ahora mostrar en días en lugar de minutos
      ageDays: ageMs ? Math.floor(ageMs / (24 * 60 * 60 * 1000)) : null,
      ageHours: ageMs ? Math.floor(ageMs / (60 * 60 * 1000)) : null,
      cacheExpiresDays: this.lastUpdate 
        ? Math.max(0, 30 - Math.floor(ageMs / (24 * 60 * 60 * 1000)))
        : null
    };
  }

  // Función auxiliar para delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const pokemonCacheService = new PokemonCacheService();

// Inicializar al cargar el módulo (background)
pokemonCacheService.initializeCache().catch(err => {
  console.error('Failed to initialize pokemon cache:', err);
});

module.exports = pokemonCacheService;