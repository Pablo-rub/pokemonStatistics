# Script de verificacion para el entorno de PRE-PRODUCCION
param(
    [string]$ServiceUrl = "https://pokemon-app-pre-688897781023.us-central1.run.app",
    [string]$ServiceName = "pokemon-app-pre",
    [string]$Region = "us-central1"
)

Write-Host "Verificando estado del cache de Pokemon (PRE-PRODUCCION)..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar bucket GCS
Write-Host "1. Verificando bucket GCS..." -ForegroundColor Yellow
$bucketContent = gcloud storage ls gs://pokemon-statistics-cache/ --long 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Bucket accesible" -ForegroundColor Green
    if ($bucketContent -match "pokemon-data.json") {
        Write-Host "   Cache file encontrado: pokemon-data.json" -ForegroundColor Green
        $sizeMatch = ($bucketContent | Select-String "pokemon-data.json").Line
        if ($sizeMatch) {
            $size = ($sizeMatch -replace '\s+', ' ').Split(' ')[0]
            $sizeMB = [math]::Round($size / 1MB, 2)
            Write-Host "   Tamano: $sizeMB MB" -ForegroundColor Gray
        }
    } else {
        Write-Host "   Cache file NO encontrado (bucket vacio)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Error accediendo al bucket" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar Cloud Run (PRE)
Write-Host "2. Verificando Cloud Run (pokemon-app-pre)..." -ForegroundColor Yellow
$envVars = gcloud run services describe $ServiceName --region=$Region --format="value(spec.template.spec.containers[0].env)" 2>&1

if ($envVars -match "GCS_BUCKET") {
    Write-Host "   GCS_BUCKET configurado en Cloud Run" -ForegroundColor Green
    $gcsBucketValue = $envVars | Select-String -Pattern "GCS_BUCKET.*?pokemon-statistics-cache"
    if ($gcsBucketValue) {
        Write-Host "   Valor: pokemon-statistics-cache" -ForegroundColor Gray
    }
} else {
    Write-Host "   GCS_BUCKET NO configurado" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar endpoint de diagnostico
Write-Host "3. Verificando endpoint de diagnostico..." -ForegroundColor Yellow
Write-Host "   URL: $ServiceUrl/api/pokemon-cache/check" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$ServiceUrl/api/pokemon-cache/check" -Method Get -TimeoutSec 15
    
    Write-Host ""
    Write-Host "   Repository type: $($response.repository.type)" -ForegroundColor $(if ($response.repository.type -eq 'gcs') { 'Green' } else { 'Yellow' })
    Write-Host "   Health OK: $($response.repository.health.ok)" -ForegroundColor $(if ($response.repository.health.ok) { 'Green' } else { 'Red' })
    
    if ($response.repository.health.message) {
        Write-Host "   Message: $($response.repository.health.message)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "   Has Data: $($response.cache.hasData)" -ForegroundColor $(if ($response.cache.hasData) { 'Green' } else { 'Yellow' })
    Write-Host "   Pokemon Count: $($response.cache.dataCount)" -ForegroundColor Gray
    
    if ($response.cache.stats) {
        Write-Host "   Complete: $($response.cache.stats.isComplete)" -ForegroundColor $(if ($response.cache.stats.isComplete) { 'Green' } else { 'Yellow' })
        Write-Host "   Needs Update: $($response.cache.stats.needsUpdate)" -ForegroundColor Gray
    }
    
    if ($response.recommendations -and $response.recommendations.Count -gt 0) {
        Write-Host ""
        Write-Host "   Recomendaciones:" -ForegroundColor Yellow
        foreach ($rec in $response.recommendations) {
            Write-Host "   - [$($rec.level.ToUpper())] $($rec.message)" -ForegroundColor Yellow
            if ($rec.action) {
                Write-Host "     -> $($rec.action)" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "   Error conectando al servicio: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Verifica que el servicio este desplegado y accesible" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar logs recientes
Write-Host "4. Logs recientes (ultimos 10)..." -ForegroundColor Yellow
$logs = gcloud run services logs read $ServiceName --region=$Region --limit=10 --format="value(textPayload)" 2>&1 | Select-String -Pattern "GCS|cache|Pokemon" | Select-Object -First 5

if ($logs) {
    foreach ($log in $logs) {
        $logText = $log.ToString().Substring(0, [Math]::Min(100, $log.ToString().Length))
        Write-Host "   $logText..." -ForegroundColor Gray
    }
} else {
    Write-Host "   No hay logs relacionados con cache/GCS" -ForegroundColor Gray
}

Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

if ($envVars -match "GCS_BUCKET") {
    Write-Host "GCS_BUCKET en Cloud Run" -ForegroundColor Green
} else {
    Write-Host "GCS_BUCKET NO configurado" -ForegroundColor Red
    $allGood = $false
}

if ($bucketContent -match "pokemon-data.json") {
    Write-Host "Archivo de cache existe en GCS" -ForegroundColor Green
} else {
    Write-Host "Archivo de cache NO existe (necesita poblarse)" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

if ($allGood) {
    Write-Host "TODO OK - El cache deberia funcionar correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Si ves 'repo: file' en el endpoint, espera que Cloud Run se reinicie" -ForegroundColor Gray
    Write-Host "o fuerza un nuevo deploy haciendo commit y push." -ForegroundColor Gray
} else {
    Write-Host "ACCION REQUERIDA:" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not ($bucketContent -match "pokemon-data.json")) {
        Write-Host "1. Poblar el cache (tarda ~60 segundos):" -ForegroundColor White
        Write-Host "   Invoke-RestMethod -Method POST -Uri '$ServiceUrl/api/pokemon-cache/refresh'" -ForegroundColor Cyan
        Write-Host ""
    }
    
    Write-Host "2. Hacer commit y push para forzar redeploy:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Cyan
    Write-Host "   git commit -m 'fix: configure GCS cache properly'" -ForegroundColor Cyan
    Write-Host "   git push origin bug/Pokemon-List-in-Pro-Not-Saving-Cache" -ForegroundColor Cyan
}

Write-Host ""
