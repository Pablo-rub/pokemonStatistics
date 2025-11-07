# Script para monitorear el estado del deploy en pre-produccion
param(
    [string]$ServiceName = "pokemon-app-pre",
    [string]$Region = "us-central1",
    [int]$TimeoutMinutes = 10
)

Write-Host "Monitoreando deploy de $ServiceName..." -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$timeout = $startTime.AddMinutes($TimeoutMinutes)

# Obtener la revision actual
$currentRevision = gcloud run services describe $ServiceName --region=$Region --format="value(status.latestReadyRevisionName)" 2>$null

if ($currentRevision) {
    Write-Host "Revision actual: $currentRevision" -ForegroundColor Gray
}

Write-Host "Esperando nueva revision..." -ForegroundColor Yellow
Write-Host ""

$lastCheckedRevision = $currentRevision
$checkCount = 0

while ((Get-Date) -lt $timeout) {
    $checkCount++
    
    # Obtener el estado actual
    $latestRevision = gcloud run services describe $ServiceName --region=$Region --format="value(status.latestCreatedRevisionName)" 2>$null
    $readyRevision = gcloud run services describe $ServiceName --region=$Region --format="value(status.latestReadyRevisionName)" 2>$null
    
    if ($latestRevision -ne $lastCheckedRevision) {
        Write-Host "[$checkCount] Nueva revision detectada: $latestRevision" -ForegroundColor Yellow
        
        if ($readyRevision -eq $latestRevision) {
            Write-Host ""
            Write-Host "DEPLOY COMPLETADO!" -ForegroundColor Green
            Write-Host "Revision lista: $readyRevision" -ForegroundColor Green
            Write-Host ""
            
            # Obtener URL del servicio
            $serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)" 2>$null
            Write-Host "URL del servicio: $serviceUrl" -ForegroundColor Cyan
            Write-Host ""
            
            # Verificar cache
            Write-Host "Verificando cache..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            
            try {
                $cacheCheck = Invoke-RestMethod -Uri "$serviceUrl/api/pokemon-cache/check" -Method Get -TimeoutSec 15
                Write-Host "  Repository: $($cacheCheck.repository.type)" -ForegroundColor $(if ($cacheCheck.repository.type -eq 'gcs') { 'Green' } else { 'Yellow' })
                Write-Host "  Health OK: $($cacheCheck.repository.health.ok)" -ForegroundColor $(if ($cacheCheck.repository.health.ok) { 'Green' } else { 'Red' })
                Write-Host "  Has Data: $($cacheCheck.cache.hasData)" -ForegroundColor $(if ($cacheCheck.cache.hasData) { 'Green' } else { 'Yellow' })
                
                if (-not $cacheCheck.cache.hasData) {
                    Write-Host ""
                    Write-Host "El cache esta vacio. Para poblarlo, ejecuta:" -ForegroundColor Yellow
                    Write-Host "  Invoke-RestMethod -Method POST -Uri '$serviceUrl/api/pokemon-cache/refresh'" -ForegroundColor White
                }
            } catch {
                Write-Host "  Error verificando cache: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            exit 0
        } else {
            Write-Host "[$checkCount] Revision en progreso... (latest: $latestRevision, ready: $readyRevision)" -ForegroundColor Gray
        }
        
        $lastCheckedRevision = $latestRevision
    } else {
        Write-Host "[$checkCount] Esperando nueva revision... (actual: $currentRevision)" -ForegroundColor Gray
    }
    
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "TIMEOUT alcanzado despues de $TimeoutMinutes minutos" -ForegroundColor Red
Write-Host "El deploy puede estar tardando mas de lo esperado." -ForegroundColor Yellow
Write-Host ""
Write-Host "Revisa el estado manualmente:" -ForegroundColor Cyan
Write-Host "  gcloud run services describe $ServiceName --region=$Region" -ForegroundColor White
Write-Host ""
