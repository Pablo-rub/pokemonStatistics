# 📦 Guía de Configuración del Caché de Pokémon

## Problema

El sistema de caché de Pokémon está diseñado para almacenar datos de 1,025 Pokémon en **Google Cloud Storage (GCS)** para persistencia entre reinicios del contenedor. Si el caché no funciona, puede deberse a:

1. ❌ Variable de entorno `GCS_BUCKET` no configurada en Cloud Run
2. ❌ Permisos IAM incorrectos en el bucket
3. ❌ El bucket no existe
4. ❌ Service account sin acceso al bucket

## Arquitectura del Sistema de Caché

```
┌─────────────────────────────────────────────┐
│         Pokemon Cache Service               │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │      Cache Repository (Factory)       │  │
│  │                                       │  │
│  │  Priority:                            │  │
│  │  1. Redis (if REDIS_URL set)         │  │
│  │  2. GCS (if GCS_BUCKET set)          │  │
│  │  3. Local File (fallback, ephemeral) │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  Stores: pokemon-data.json                  │
│  Contains: 1,025 Pokemon with types,        │
│            sprites, stats, abilities        │
│  Size: ~5-7 MB                              │
│  Duration: 30 days                          │
└─────────────────────────────────────────────┘
```

## Solución Rápida (Automatizada)

### Opción 1: Script PowerShell (Recomendado)

```powershell
# Desde la raíz del proyecto
cd d:\tfg\pokemonStatistics
.\scripts\configure-cloud-run.ps1
```

Este script:
- ✅ Verifica que el bucket `pokemon-statistics-cache` existe
- ✅ Configura permisos IAM automáticamente
- ✅ Actualiza Cloud Run con `GCS_BUCKET=pokemon-statistics-cache`
- ✅ Muestra el estado de la configuración

### Opción 2: Comandos Manuales

```powershell
# 1. Verificar que el bucket existe
gcloud storage buckets describe gs://pokemon-statistics-cache

# 2. Configurar permisos (reemplaza el service account si es diferente)
gcloud storage buckets add-iam-policy-binding gs://pokemon-statistics-cache `
  --member="serviceAccount:pokemon-statistics@pokemon-statistics.iam.gserviceaccount.com" `
  --role="roles/storage.objectAdmin"

# 3. Actualizar Cloud Run
gcloud run services update pokemon-app `
  --region=us-central1 `
  --set-env-vars="GCS_BUCKET=pokemon-statistics-cache" `
  --project=pokemon-statistics

# 4. Verificar configuración
gcloud run services describe pokemon-app `
  --region=us-central1 `
  --format="table(spec.template.spec.containers[0].env)" `
  --project=pokemon-statistics
```

## Verificación

### 1. Verificar Estado del Caché (Frontend)

Visita el endpoint de diagnóstico:
```
https://your-app-url/api/pokemon-cache/check
```

**Respuesta esperada cuando funciona:**
```json
{
  "timestamp": "2025-11-07T...",
  "repository": {
    "type": "gcs",
    "configured": true,
    "health": {
      "ok": true,
      "message": "GCS bucket is accessible (write/read/delete succeeded)",
      "bucketName": "pokemon-statistics-cache"
    }
  },
  "environment": {
    "GCS_BUCKET": "pokemon-statistics-cache",
    "REDIS_URL": "NOT_SET",
    "NODE_ENV": "production"
  },
  "cache": {
    "hasData": true,
    "dataCount": 1025,
    "dataTimestamp": "2025-11-07T...",
    "stats": {
      "count": 1025,
      "isComplete": true,
      "needsUpdate": false
    }
  },
  "recommendations": []
}
```

**Respuesta cuando NO funciona:**
```json
{
  "repository": {
    "type": "file",
    "configured": false,
    "health": { "ok": false }
  },
  "recommendations": [
    {
      "level": "warning",
      "message": "Using local file cache in production. This is ephemeral on Cloud Run.",
      "action": "Set GCS_BUCKET=pokemon-statistics-cache environment variable"
    }
  ]
}
```

### 2. Verificar Logs de Cloud Run

```powershell
# Ver logs recientes
gcloud run services logs read pokemon-app --region=us-central1 --limit=50

# Buscar mensajes del caché
gcloud run services logs read pokemon-app --region=us-central1 --limit=100 | Select-String "GCS|cache"
```

**Logs esperados al iniciar (correcto):**
```
✅ GCS Repository initialized with bucket: pokemon-statistics-cache
cacheRepository: selected repo=gcs; check={"ok":true,...}
✅ GCS: Loaded cache from gs://pokemon-statistics-cache/pokemon-data.json (1025 Pokemon)
```

**Logs cuando falla (incorrecto):**
```
⚠️  GCS_BUCKET environment variable not set. GCS repository will not be available.
cacheRepository: using local file repository. On Cloud Run this is ephemeral
```

### 3. Verificar Contenido del Bucket

```powershell
# Listar archivos en el bucket
gcloud storage ls gs://pokemon-statistics-cache/ --long

# Ver detalles del archivo de caché
gcloud storage ls gs://pokemon-statistics-cache/pokemon-data.json --long
```

**Resultado esperado:**
```
     5842156  2025-11-07T...  gs://pokemon-statistics-cache/pokemon-data.json
TOTAL: 1 objects, 5842156 bytes (5.57 MiB)
```

## Forzar Actualización del Caché

Si el caché está vacío o incompleto:

```bash
curl -X POST https://your-app-url/api/pokemon-cache/refresh
```

O desde PowerShell:
```powershell
Invoke-RestMethod -Method POST -Uri "https://your-app-url/api/pokemon-cache/refresh"
```

Esto:
- Descarga datos de los 1,025 Pokémon desde PokeAPI
- Tarda aproximadamente 30-60 segundos
- Guarda el resultado en GCS automáticamente

## Troubleshooting

### Problema: `repo=file` en producción

**Síntoma:** El endpoint `/api/pokemon-cache/check` muestra `"type": "file"`

**Causa:** La variable `GCS_BUCKET` no está configurada

**Solución:**
```powershell
.\scripts\configure-cloud-run.ps1
```

---

### Problema: `check.ok = false` con `GCS_BUCKET` configurado

**Síntoma:** 
```json
{
  "health": {
    "ok": false,
    "message": "Permission denied"
  }
}
```

**Causa:** Service account sin permisos en el bucket

**Solución:**
```powershell
gcloud storage buckets add-iam-policy-binding gs://pokemon-statistics-cache `
  --member="serviceAccount:pokemon-statistics@pokemon-statistics.iam.gserviceaccount.com" `
  --role="roles/storage.objectAdmin"
```

---

### Problema: Caché vacío después de configurar

**Síntoma:** `"hasData": false`, `"dataCount": 0`

**Causa:** El caché nunca se ha poblado

**Solución:**
```bash
# Forzar refresh (tarda ~60 segundos)
curl -X POST https://your-app-url/api/pokemon-cache/refresh
```

Luego verifica:
```bash
curl https://your-app-url/api/pokemon-cache/stats
```

Debe mostrar:
```json
{
  "count": 1025,
  "isComplete": true,
  "needsUpdate": false
}
```

---

### Problema: Caché se pierde al reiniciar

**Síntoma:** Cada reinicio del contenedor elimina el caché

**Causa:** Usando `file` repository en lugar de `gcs`

**Solución:** Configurar `GCS_BUCKET` (ver arriba)

---

## Arquitectura de Archivos

```
backend/
├── src/
│   └── services/
│       ├── pokemonCacheService.js      # Lógica principal del caché
│       ├── pokeapiService.js            # Endpoints de API
│       └── cache/
│           ├── cacheRepository.js       # Factory (selecciona Redis/GCS/File)
│           ├── gcsRepository.js         # Implementación GCS ⭐
│           ├── redisRepository.js       # Implementación Redis
│           └── fileRepository.js        # Fallback local (ephemeral)
│
scripts/
└── configure-cloud-run.ps1              # Script de configuración automática ⭐

docs/
└── CACHE_SETUP.md                       # Este archivo
```

## Variables de Entorno

| Variable | Valor | Dónde configurar | Propósito |
|----------|-------|------------------|-----------|
| `GCS_BUCKET` | `pokemon-statistics-cache` | Cloud Run | Habilitar persistencia en GCS |
| `REDIS_URL` | `redis://...` (opcional) | Cloud Run | Caché más rápido (opcional) |
| `NODE_ENV` | `production` | Cloud Run | Indicador de entorno |

## Endpoints de Diagnóstico

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/pokemon-cache/check` | GET | Diagnóstico completo con recomendaciones |
| `/api/pokemon-cache/stats` | GET | Estadísticas del caché actual |
| `/api/pokemon-cache/refresh` | POST | Forzar actualización desde PokeAPI |
| `/api/pokemon` | GET | Obtener lista de Pokémon (usa caché) |

## Checklist de Implementación

- [ ] 1. Verificar que el bucket `pokemon-statistics-cache` existe
- [ ] 2. Ejecutar `.\scripts\configure-cloud-run.ps1`
- [ ] 3. Esperar 1-2 minutos para que se reinicie el servicio
- [ ] 4. Visitar `/api/pokemon-cache/check` y verificar `"type": "gcs"` y `"ok": true`
- [ ] 5. Si `hasData: false`, ejecutar POST `/api/pokemon-cache/refresh`
- [ ] 6. Verificar que el bucket contenga `pokemon-data.json`
- [ ] 7. Probar que `/api/pokemon` devuelve 1025 Pokémon rápidamente

## Contacto y Soporte

Para problemas adicionales:
1. Verificar logs de Cloud Run
2. Ejecutar `/api/pokemon-cache/check` y revisar `recommendations`
3. Verificar permisos IAM del service account
4. Asegurar que el proyecto GCP tiene billing habilitado

---

**Última actualización:** 2025-11-07
