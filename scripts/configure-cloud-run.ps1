# Script para configurar Cloud Run con todas las variables de entorno necesarias
# Incluye la configuración del bucket GCS para el caché de Pokémon

param(
    [string]$ServiceName = "pokemon-app",
    [string]$Region = "us-central1",
    [string]$ProjectId = "pokemon-statistics",
    [string]$GcsBucket = "pokemon-statistics-cache"
)

Write-Host "🔧 Configurando Cloud Run Service: $ServiceName" -ForegroundColor Cyan
Write-Host "   Project: $ProjectId" -ForegroundColor Gray
Write-Host "   Region: $Region" -ForegroundColor Gray
Write-Host "   GCS Bucket: $GcsBucket" -ForegroundColor Gray
Write-Host ""

# Verificar que el bucket existe
Write-Host "📦 Verificando bucket GCS..." -ForegroundColor Yellow
$bucketExists = gcloud storage buckets describe "gs://$GcsBucket" --format="value(name)" 2>$null

if (-not $bucketExists) {
    Write-Host "❌ Error: El bucket gs://$GcsBucket no existe" -ForegroundColor Red
    Write-Host "   Créalo con: gcloud storage buckets create gs://$GcsBucket --location=US" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Bucket encontrado: gs://$GcsBucket" -ForegroundColor Green

# Verificar permisos de la service account
Write-Host ""
Write-Host "🔐 Verificando permisos IAM..." -ForegroundColor Yellow
$serviceAccount = "$ProjectId@$ProjectId.iam.gserviceaccount.com"

# Obtener los bindings actuales
$bindings = gcloud storage buckets get-iam-policy "gs://$GcsBucket" --format=json | ConvertFrom-Json

$hasStorageAdmin = $false
foreach ($binding in $bindings.bindings) {
    if ($binding.role -eq "roles/storage.objectAdmin") {
        if ($binding.members -contains "serviceAccount:$serviceAccount") {
            $hasStorageAdmin = $true
            break
        }
    }
}

if (-not $hasStorageAdmin) {
    Write-Host "⚠️  Service account no tiene permisos. Agregando roles/storage.objectAdmin..." -ForegroundColor Yellow
    gcloud storage buckets add-iam-policy-binding "gs://$GcsBucket" `
        --member="serviceAccount:$serviceAccount" `
        --role="roles/storage.objectAdmin"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Permisos agregados correctamente" -ForegroundColor Green
    } else {
        Write-Host "❌ Error agregando permisos" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Service account ya tiene permisos correctos" -ForegroundColor Green
}

# Actualizar Cloud Run con la variable de entorno GCS_BUCKET
Write-Host ""
Write-Host "☁️  Actualizando Cloud Run service..." -ForegroundColor Yellow

gcloud run services update $ServiceName `
    --region=$Region `
    --set-env-vars="GCS_BUCKET=$GcsBucket" `
    --project=$ProjectId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cloud Run actualizado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error actualizando Cloud Run" -ForegroundColor Red
    exit 1
}

# Mostrar la configuración actual
Write-Host ""
Write-Host "📋 Configuración actual:" -ForegroundColor Cyan
gcloud run services describe $ServiceName --region=$Region --format="table(spec.template.spec.containers[0].env)" --project=$ProjectId | Where-Object { $_ -match "GCS_BUCKET" }

Write-Host ""
Write-Host "Configuracion completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "   1. El servicio se reiniciara automaticamente con la nueva configuracion"
Write-Host "   2. Espera 1-2 minutos y visita: https://your-service-url/api/pokemon-cache/check"
Write-Host "   3. Verifica que el repo sea 'gcs' y que check.ok sea true"
Write-Host "   4. Para forzar la actualizacion del cache: POST /api/pokemon-cache/refresh"
Write-Host ""
