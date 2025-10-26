const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../cache/pokemon-data.json');

// ✅ CAMBIO: De 24 horas a 30 días
const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';
const MAX_POKEMON_ID = 1025; // Gen 1-9

// ✅ NUEVAS CONSTANTES: Configuración de reintentos y rate limiting
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 segundos
const BATCH_SIZE = 30; // Reducido de 50 a 30 para evitar rate limits
const DELAY_BETWEEN_BATCHES = 500; // Aumentado de 100ms a 500ms
const REQUEST_TIMEOUT = 15000; // Aumentado de 10s a 15s

class PokemonCacheService {
  constructor() {
    this.cache = null;
    this.lastUpdate = null;
    this.isInitializing = false;
    this.initPromise = null;
    this.isUpdating = false; // ✅ NUEVO: Evitar actualizaciones simultáneas
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
        
        // ✅ NUEVO: Validar que el caché tenga todos los Pokémon
        const cacheCount = Object.keys(fileData.data || {}).length;
        const isComplete = cacheCount >= MAX_POKEMON_ID;
        
        // ✅ CAMBIO: Cargar caché aunque esté desactualizado si está completo
        // Actualizar en background si es necesario
        if (isComplete) {
          this.cache = fileData.data;
          this.lastUpdate = fileData.timestamp;
          
          const daysOld = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          console.log(`✅ Pokemon cache loaded from file (${cacheCount}/${MAX_POKEMON_ID} entries, ${daysOld} days old)`);
          
          // Si está desactualizado, actualizar en background SIN bloquear
          if (fileAge >= CACHE_DURATION) {
            console.log('⏰ Cache is outdated, scheduling background update...');
            this.scheduleBackgroundUpdate();
          }
          
          return;
        } else {
          const daysOld = Math.floor(fileAge / (24 * 60 * 60 * 1000));
          console.log(`⚠️ Cache incomplete (${cacheCount}/${MAX_POKEMON_ID}), will refresh`);
        }
      }
      
      // Si no existe o está incompleto, actualizar BLOQUEANDO
      await this.updateCache();
    } catch (error) {
      console.error('❌ Error initializing pokemon cache:', error);
      this.cache = {};
    }
  }

  // ✅ NUEVO: Actualización en background sin bloquear requests
  scheduleBackgroundUpdate() {
    if (this.isUpdating) {
      console.log('⚠️ Update already in progress, skipping...');
      return;
    }

    // Esperar 5 segundos antes de empezar (dar tiempo a que arranque el servidor)
    setTimeout(async () => {
      try {
        console.log('🔄 Starting background cache update...');
        await this.updateCache();
        console.log('✅ Background cache update completed');
      } catch (error) {
        console.error('❌ Background update failed:', error);
      }
    }, 5000);
  }

  // ✅ NUEVA FUNCIÓN: Fetch con reintentos automáticos
  async fetchWithRetry(id, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.fetchPokemonData(id);
      } catch (error) {
        if (attempt === retries) {
          console.error(`❌ Failed to fetch Pokemon ${id} after ${retries} attempts:`, error.message);
          return null;
        }
        
        console.warn(`⚠️ Retry ${attempt}/${retries} for Pokemon ${id}: ${error.message}`);
        await this.delay(RETRY_DELAY * attempt); // Exponential backoff
      }
    }
    return null;
  }

  // Actualizar caché completo desde PokeAPI
  async updateCache() {
    if (this.isUpdating) {
      console.log('⚠️ Update already in progress, skipping...');
      return { success: false, message: 'Update already in progress' };
    }

    this.isUpdating = true;
    console.log('🔄 Updating pokemon cache from PokeAPI...');
    console.log(`   Settings: BATCH_SIZE=${BATCH_SIZE}, DELAY=${DELAY_BETWEEN_BATCHES}ms, TIMEOUT=${REQUEST_TIMEOUT}ms`);
    const startTime = Date.now();
    
    try {
      const newCache = {};
      let successCount = 0;
      let failCount = 0;

      // Generar IDs del 1 al 1025
      const pokemonIds = Array.from({ length: MAX_POKEMON_ID }, (_, i) => i + 1);
      
      // Procesar en lotes
      for (let i = 0; i < pokemonIds.length; i += BATCH_SIZE) {
        const batchIds = pokemonIds.slice(i, i + BATCH_SIZE);
        
        // ✅ CAMBIO: Usar fetchWithRetry en lugar de fetchPokemonData directo
        const promises = batchIds.map(id => this.fetchWithRetry(id));
        
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const pokemon = result.value;
            newCache[pokemon.name] = pokemon;
            successCount++;
          } else {
            failCount++;
            const failedId = batchIds[index];
            console.error(`❌ Failed to cache Pokemon ID ${failedId}`);
          }
        });

        // Log de progreso mejorado
        const processed = Math.min(i + BATCH_SIZE, pokemonIds.length);
        const percentage = ((processed / pokemonIds.length) * 100).toFixed(1);
        console.log(`   Progress: ${percentage}% (${processed}/${pokemonIds.length}) - ✓ ${successCount} | ✗ ${failCount}`);
        
        // Pausa entre lotes (rate limiting)
        if (i + BATCH_SIZE < pokemonIds.length) {
          await this.delay(DELAY_BETWEEN_BATCHES);
        }
      }

      // ✅ NUEVO: Validar que se obtuvieron todos los Pokémon
      const finalCount = Object.keys(newCache).length;
      if (finalCount < MAX_POKEMON_ID) {
        console.warn(`⚠️ WARNING: Only cached ${finalCount}/${MAX_POKEMON_ID} Pokemon (${failCount} failures)`);
        console.warn('   Cache may be incomplete. Consider running refresh again.');
        
        // ✅ NO actualizar caché si está incompleto y ya teníamos uno completo
        if (this.cache && Object.keys(this.cache).length >= MAX_POKEMON_ID) {
          console.warn('   Keeping existing complete cache instead of incomplete update');
          return {
            success: false,
            count: finalCount,
            expected: MAX_POKEMON_ID,
            failures: failCount,
            message: 'Update incomplete, kept existing cache'
          };
        }
      } else {
        console.log(`✅ All ${finalCount} Pokemon cached successfully!`);
      }

      // ✅ Solo actualizar si el nuevo caché es válido
      this.cache = newCache;
      this.lastUpdate = Date.now();

      // Guardar en archivo
      await this.saveCacheToFile();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Pokemon cache update completed: ${finalCount} entries in ${duration}s`);
      
      return {
        success: finalCount === MAX_POKEMON_ID,
        count: finalCount,
        expected: MAX_POKEMON_ID,
        failures: failCount
      };
    } catch (error) {
      console.error('❌ Error updating pokemon cache:', error);
      throw error;
    } finally {
      this.isUpdating = false;
    }
  }

  // Obtener datos de un Pokémon específico desde PokeAPI
  async fetchPokemonData(id) {
    try {
      const response = await axios.get(`${POKEAPI_BASE}/pokemon/${id}`, {
        timeout: REQUEST_TIMEOUT,
        // ✅ NUEVO: Headers para mejor comportamiento con rate limits
        headers: {
          'User-Agent': 'Pokemon-Statistics-App/1.0'
        }
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
      // ✅ MEJORADO: Logging más detallado de errores
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Timeout fetching pokemon ${id}`);
      } else if (error.response?.status === 429) {
        throw new Error(`Rate limited on pokemon ${id}`);
      } else if (error.response?.status === 404) {
        throw new Error(`Pokemon ${id} not found`);
      }
      throw new Error(`Network error for pokemon ${id}: ${error.message}`);
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
      console.log(`💾 Pokemon cache saved to file (${data.count} entries)`);
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
    
    // ✅ NUEVO: También verificar si el caché está incompleto
    const cacheCount = this.cache ? Object.keys(this.cache).length : 0;
    const isIncomplete = cacheCount < MAX_POKEMON_ID;
    
    return (Date.now() - this.lastUpdate > CACHE_DURATION) || isIncomplete;
  }

  // Obtener estadísticas del caché
  getStats() {
    const ageMs = this.lastUpdate ? Date.now() - this.lastUpdate : null;
    const cacheCount = this.cache ? Object.keys(this.cache).length : 0;
    const isComplete = cacheCount >= MAX_POKEMON_ID;
    
    return {
      count: cacheCount,
      expected: MAX_POKEMON_ID,
      isComplete: isComplete,
      completionPercentage: ((cacheCount / MAX_POKEMON_ID) * 100).toFixed(1),
      lastUpdate: this.lastUpdate,
      needsUpdate: this.needsUpdate(),
      isUpdating: this.isUpdating,
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