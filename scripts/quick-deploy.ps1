# Script de deploy rapido a Cloud Run
# Construye la imagen y la despliega con la configuracion actualizada

param(
    [string]$ProjectId = "pokemon-statistics",
    [string]$Region = "us-central1",
    [string]$ServiceName = "pokemon-app"
)

Write-Host "Iniciando deploy a Cloud Run..." -ForegroundColor Cyan
Write-Host ""

# 1. Build con Cloud Build
Write-Host "1. Construyendo imagen con Cloud Build..." -ForegroundColor Yellow
$commitSha = git rev-parse --short HEAD

gcloud builds submit --config=cloudbuild.yaml --project=$ProjectId --substitutions=COMMIT_SHA=$commitSha

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en build. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build completado. Esperando deployment..." -ForegroundColor Green
Write-Host ""

# 2. Esperar a que el servicio este listo
Write-Host "2. Verificando estado del servicio..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

$status = gcloud run services describe $ServiceName --region=$Region --format="value(status.conditions[0].status)" --project=$ProjectId

Write-Host "   Estado: $status" -ForegroundColor $(if ($status -eq 'True') { 'Green' } else { 'Yellow' })

# 3. Obtener URL del servicio
$serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)" --project=$ProjectId
Write-Host ""
Write-Host "Servicio desplegado en: $serviceUrl" -ForegroundColor Green

Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Espera 1-2 minutos para que el servicio este completamente listo"
Write-Host "  2. Verifica el cache: .\scripts\verify-cache.ps1"
Write-Host "  3. Si el cache esta vacio, ejecuta:"
Write-Host "     Invoke-RestMethod -Method POST -Uri '$serviceUrl/api/pokemon-cache/refresh'"
Write-Host ""
