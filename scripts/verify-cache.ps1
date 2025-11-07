# Script de verificacion rapida del cache GCS
param(
    [string]$ServiceUrl = "https://traineracademy.xyz"
)

Write-Host "Verificando estado del cache de Pokemon..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar bucket GCS
Write-Host "1. Verificando bucket GCS..." -ForegroundColor Yellow
$bucketContent = gcloud storage ls gs://pokemon-statistics-cache/ --long 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   Bucket accesible" -ForegroundColor Green
    if ($bucketContent -match "pokemon-data.json") {
        Write-Host "   Cache file encontrado: pokemon-data.json" -ForegroundColor Green
        $size = ($bucketContent | Select-String "pokemon-data.json").Line -replace '\s+', ' ' | ForEach-Object { $_.Split(' ')[0] }
        Write-Host "   Tamano: $size bytes" -ForegroundColor Gray
    } else {
        Write-Host "   Cache file NO encontrado (bucket vacio)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   Error accediendo al bucket" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar Cloud Run
Write-Host "2. Verificando Cloud Run..." -ForegroundColor Yellow
$envVars = gcloud run services describe pokemon-app --region=us-central1 --format="value(spec.template.spec.containers[0].env)" 2>&1

if ($envVars -match "GCS_BUCKET") {
    Write-Host "   GCS_BUCKET configurado en Cloud Run" -ForegroundColor Green
} else {
    Write-Host "   GCS_BUCKET NO configurado" -ForegroundColor Red
    Write-Host "   Ejecuta: .\scripts\configure-cloud-run.ps1" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar endpoint de diagnostico
Write-Host "3. Verificando endpoint de diagnostico..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$ServiceUrl/api/pokemon-cache/check" -Method Get -TimeoutSec 10
    
    Write-Host "   Repository type: $($response.repository.type)" -ForegroundColor $(if ($response.repository.type -eq 'gcs') { 'Green' } else { 'Yellow' })
    Write-Host "   Health OK: $($response.repository.health.ok)" -ForegroundColor $(if ($response.repository.health.ok) { 'Green' } else { 'Red' })
    Write-Host "   Has Data: $($response.cache.hasData)" -ForegroundColor $(if ($response.cache.hasData) { 'Green' } else { 'Yellow' })
    Write-Host "   Pokemon Count: $($response.cache.dataCount)" -ForegroundColor Gray
    
    if ($response.recommendations.Count -gt 0) {
        Write-Host ""
        Write-Host "   Recomendaciones:" -ForegroundColor Yellow
        foreach ($rec in $response.recommendations) {
            Write-Host "   - [$($rec.level)] $($rec.message)" -ForegroundColor Yellow
            Write-Host "     Action: $($rec.action)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   Error conectando al servicio: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host ""

if ($bucketContent -match "pokemon-data.json" -and $envVars -match "GCS_BUCKET") {
    Write-Host "TODO CONFIGURADO CORRECTAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "El cache deberia funcionar. Si ves 'repo: file' en el endpoint," -ForegroundColor Gray
    Write-Host "espera 1-2 minutos para que Cloud Run se reinicie." -ForegroundColor Gray
} else {
    Write-Host "CONFIGURACION INCOMPLETA" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejecuta estos comandos:" -ForegroundColor Yellow
    Write-Host "  1. .\scripts\configure-cloud-run.ps1" -ForegroundColor White
    if (-not ($bucketContent -match "pokemon-data.json")) {
        Write-Host "  2. Invoke-RestMethod -Method POST -Uri '$ServiceUrl/api/pokemon-cache/refresh'" -ForegroundColor White
    }
}

Write-Host ""
