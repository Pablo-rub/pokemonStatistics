# Scripts de Configuracion y Mantenimiento

Esta carpeta contiene scripts de PowerShell para configurar y mantener el sistema de cache de Pokemon.

## Scripts Disponibles

### 1. `configure-cloud-run.ps1`
**Proposito:** Configurar Cloud Run con las variables de entorno necesarias para el cache GCS

**Uso:**
```powershell
.\scripts\configure-cloud-run.ps1
```

**Que hace:**
- Verifica que el bucket `pokemon-statistics-cache` existe
- Configura permisos IAM para el service account
- Actualiza Cloud Run con `GCS_BUCKET=pokemon-statistics-cache`
- Muestra la configuracion actual

**Cuando usarlo:**
- Primera vez configurando el proyecto
- Despues de crear un nuevo servicio de Cloud Run
- Si el cache no funciona y ves "repo: file" en los diagnosticos

---

### 2. `verify-cache.ps1`
**Proposito:** Verificar el estado actual del sistema de cache

**Uso:**
```powershell
.\scripts\verify-cache.ps1
```

**Que verifica:**
- ✅ Bucket GCS existe y es accesible
- ✅ Archivo `pokemon-data.json` existe en el bucket
- ✅ Variable `GCS_BUCKET` configurada en Cloud Run
- ✅ Endpoint de diagnostico responde correctamente
- ✅ Estado del repositorio (file/gcs/redis)

**Cuando usarlo:**
- Para diagnosticar problemas del cache
- Despues de configurar Cloud Run
- Para verificar que todo funciona correctamente

---

### 3. `quick-deploy.ps1`
**Proposito:** Deploy rapido a Cloud Run usando Cloud Build

**Uso:**
```powershell
.\scripts\quick-deploy.ps1
```

**Que hace:**
- Construye la imagen Docker con Cloud Build
- Despliega a Cloud Run
- Muestra URL del servicio
- Proporciona proximos pasos

**Cuando usarlo:**
- Despues de hacer cambios en el codigo
- Para actualizar el servicio en produccion

---

## Flujo de Trabajo Recomendado

### Primera Configuracion

1. **Configurar Cloud Run:**
   ```powershell
   .\scripts\configure-cloud-run.ps1
   ```

2. **Hacer deploy:**
   ```powershell
   .\scripts\quick-deploy.ps1
   ```

3. **Verificar configuracion:**
   ```powershell
   .\scripts\verify-cache.ps1
   ```

4. **Poblar cache (si esta vacio):**
   ```powershell
   $url = "https://traineracademy.xyz"
   Invoke-RestMethod -Method POST -Uri "$url/api/pokemon-cache/refresh"
   ```

5. **Verificar nuevamente:**
   ```powershell
   .\scripts\verify-cache.ps1
   ```

### Mantenimiento Regular

**Verificar estado del cache:**
```powershell
.\scripts\verify-cache.ps1
```

**Actualizar cache manualmente:**
```powershell
Invoke-RestMethod -Method POST -Uri "https://traineracademy.xyz/api/pokemon-cache/refresh"
```

**Ver logs recientes:**
```powershell
gcloud run services logs read pokemon-app --region=us-central1 --limit=50
```

### Troubleshooting

**Problema: Cache no se guarda**
```powershell
# 1. Verificar configuracion
.\scripts\verify-cache.ps1

# 2. Si GCS_BUCKET no esta configurado
.\scripts\configure-cloud-run.ps1

# 3. Hacer redeploy
.\scripts\quick-deploy.ps1
```

**Problema: Servicio usa 'file' en lugar de 'gcs'**
```powershell
# Verificar que GCS_BUCKET esta configurado
gcloud run services describe pokemon-app --region=us-central1 --format="yaml(spec.template.spec.containers[0].env)"

# Si no aparece, configurar
.\scripts\configure-cloud-run.ps1
```

**Problema: Permisos negados en GCS**
```powershell
# Agregar permisos al service account
gcloud storage buckets add-iam-policy-binding gs://pokemon-statistics-cache `
  --member="serviceAccount:pokemon-statistics@pokemon-statistics.iam.gserviceaccount.com" `
  --role="roles/storage.objectAdmin"
```

---

## Comandos Utiles

### Ver variables de entorno en Cloud Run
```powershell
gcloud run services describe pokemon-app --region=us-central1 --format="table(spec.template.spec.containers[0].env)"
```

### Ver contenido del bucket
```powershell
gcloud storage ls gs://pokemon-statistics-cache/ --long
```

### Descargar cache local (para debug)
```powershell
gcloud storage cp gs://pokemon-statistics-cache/pokemon-data.json ./pokemon-data-backup.json
```

### Ver logs en tiempo real
```powershell
gcloud run services logs tail pokemon-app --region=us-central1
```

### Eliminar cache (para forzar refresh)
```powershell
gcloud storage rm gs://pokemon-statistics-cache/pokemon-data.json
```

---

## Referencias

- Documentacion completa: `../docs/CACHE_SETUP.md`
- Arquitectura del cache: `../backend/src/services/cache/`
- Endpoints de API: `../backend/src/services/pokeapiService.js`

