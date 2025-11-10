# Optimización: Smogon Stats vs BigQuery

## 📊 Comparación de Rendimiento

### ⚡ Velocidad

| Método | Tiempo Estimado | Costo |
|--------|----------------|-------|
| **Smogon Stats** | ~500ms (primera vez)<br>~10ms (caché) | Gratis |
| **BigQuery** | ~2-5 segundos | $0.005-0.02 por query |

### 💰 Costos Mensuales (1000 consultas)

- **Smogon**: $0 (gratis)
- **BigQuery**: $5-20 (depende del tamaño de la tabla)

---

## 🔧 Implementación

### Estrategia Híbrida (Actual)

```
┌─────────────────────────────────────┐
│   GET /available-pokemon?format=X   │
└─────────────────┬───────────────────┘
                  │
                  ▼
        ┌─────────────────┐
        │ Try Smogon Stats│
        └────────┬─────────┘
                 │
          ┌──────┴──────┐
          │             │
    ✅ Success      ❌ Failed
          │             │
          ▼             ▼
   Return data   Try BigQuery
                      │
                ┌─────┴──────┐
                │            │
          ✅ Success    ❌ Failed
                │            │
                ▼            ▼
         Return data   Return error
```

### Flujo de Caché

```
Request → Check Memory Cache → Valid? → Return
                ↓ (expired/missing)
         Fetch from Smogon → Parse → Cache (30 días) → Return
                ↓ (failed)
         Fetch from BigQuery → Format → Return
```

---

## 🎯 Ventajas de Smogon Stats

### 1. **Velocidad Superior**
- Sin queries a base de datos
- Archivos de texto simples
- Caché en memoria (24h)

### 2. **Datos Oficiales**
- Estadísticas del meta real de Smogon
- Incluye rankings y porcentajes de uso
- Actualizados mensualmente

### 3. **Sin Costos**
- No consume cuota de BigQuery
- Sin límites de requests
- Gratis e ilimitado

### 4. **Cobertura Completa**
- Todos los Pokémon del meta
- No depende de tus replays guardados
- Datos desde 2014 disponibles

### 5. **Información Adicional**
- `usagePercent`: % de uso en el meta
- `rank`: Posición en el ranking
- Puedes usar diferentes niveles de rating (0, 1500, 1760)

---

## 📋 Formato de Datos

### Smogon Stats Response
```javascript
{
  rank: 1,
  name: "flutter-mane",
  displayName: "Flutter Mane",
  usagePercent: 45.678
}
```

### Enriquecido con Cache
```javascript
{
  id: 987,
  name: "flutter-mane",
  displayName: "Flutter Mane",
  types: [{ name: "Ghost" }, { name: "Fairy" }],
  sprite: "...",
  usagePercent: 45.678,
  usageRank: 1,
  source: "smogon"
}
```

---

## 🔍 Mapeo de Formatos

### Ejemplo 1: VGC 2025 Reg G
```
Input:  "gen9vgc2025reggbo3"
Output: https://www.smogon.com/stats/2025-01/gen9vgc2025reggbo3-1500.txt
```

### Ejemplo 2: VGC 2024 Reg F
```
Input:  "gen9vgc2024regf"
Output: https://www.smogon.com/stats/2024-08/gen9vgc2024regf-1500.txt
```

### Lógica de Búsqueda
1. Extraer año del formato (ej: "2025")
2. Buscar meses de ese año en Smogon
3. Probar formato en cada mes (más reciente primero)
4. Intentar ratings: 0, 1500, 1760
5. Retornar primero que funcione

---

## 🛡️ Robustez

### Fallback a BigQuery
Si Smogon falla (raro), automáticamente usa BigQuery:
- Servicio de Smogon caído
- Formato no encontrado en Smogon
- Error de red
- Timeout

### Caché Persistente
Incluso si Smogon falla, el caché en memoria persiste:
- Válido por 30 días (1 mes)
- Se usa caché expirado si no hay red
- No pierde datos entre requests

---

## 📊 Casos de Uso

### Team Builder (✅ Optimizado)
- **Antes**: Query a BigQuery cada vez
- **Ahora**: Smogon → Caché 30 días → BigQuery fallback
- **Mejora**: 80-90% más rápido

### Posibles Optimizaciones Futuras

#### Rankings Page
```javascript
// Obtener top Pokémon del meta
const topPokemon = await smogonStatsService.getPokemonForFormat('gen9vgc2025reggbo3');
const top10 = topPokemon.slice(0, 10);
```

#### Turn Assistant
```javascript
// Filtrar Pokémon por popularidad
const metaPokemon = await smogonStatsService.getPokemonForFormat(format);
const viable = metaPokemon.filter(p => p.usagePercent > 1.0);
```

---

## 🧪 Testing

### Verificar Estado
```bash
GET /api/team-builder/smogon-status
```

**Response:**
```json
{
  "status": "operational",
  "smogonReachable": true,
  "cache": {
    "months": { "cached": true, "count": 120 },
    "formats": { "cached": 5 },
    "pokemon": { "cached": 3 }
  }
}
```

### Limpiar Caché
```bash
POST /api/team-builder/clear-cache
```

### Test Manual
```bash
GET /api/team-builder/available-pokemon?format=gen9vgc2025reggbo3
```

---

## 📈 Métricas de Éxito

### Antes (BigQuery)
- ⏱️ Latencia: 2-5 segundos
- 💰 Costo: ~$0.01 por request
- 📊 Cobertura: Depende de replays guardados
- 🔄 Caché: No implementado

### Después (Smogon)
- ⏱️ Latencia: 500ms primera vez, 10ms caché
- 💰 Costo: $0 (gratis)
- 📊 Cobertura: 100% del meta oficial
- 🔄 Caché: 30 días en memoria

### Mejora Estimada
- **90% más rápido** (caché)
- **100% reducción de costos**
- **Mejor experiencia de usuario**

---

## 🔮 Próximos Pasos

### Opcional: Persistir Caché
Si el tráfico crece, considerar:
- Redis para caché compartido
- Google Cloud Storage para backup
- Base de datos local para histórico

### Monitoreo
Agregar métricas:
- Tasa de aciertos de caché
- Fallbacks a BigQuery
- Tiempos de respuesta
- Errores de Smogon

---

## ✅ Conclusión

**Recomendación: Usar Smogon Stats como fuente principal**

Ventajas superan con creces:
- ⚡ Mucho más rápido
- 💰 Sin costos
- 🎯 Datos oficiales
- 🛡️ Fallback robusto
- 📊 Mejor UX

BigQuery sigue siendo útil para:
- Análisis de tus propios replays
- Estadísticas personalizadas
- Datos históricos específicos
