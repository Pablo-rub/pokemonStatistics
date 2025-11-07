# Configuración de Triggers de Cloud Build

## Problema Detectado

Tienes dos triggers escuchando la misma rama `bug/Pokemon-List-in-Pro-Not-Saving-Cache`:

1. ✅ `rmgpgab-pokemon-app-pre-...` → Deploy a `pokemon-app-pre` (PRE)
2. ❌ `rmgpgab-pokemon-app-...` → Deploy a `pokemon-app` (PROD) - **INCORRECTO**

El trigger 2 debería escuchar solo `main`.

## Solución

### Opción 1: Desde la consola web (Recomendado)

1. Ve a: https://console.cloud.google.com/cloud-build/triggers?project=pokemon-statistics

2. Busca el trigger: `rmgpgab-pokemon-app-us-central1-Pablo-rub-pokemonStatistics-lke`

3. Haz clic en **Edit**

4. En la sección **Source**, cambia:
   - **Branch:** De `^bug/Pokemon-List-in-Pro-Not-Saving-Cache$` a `^main$`

5. Guarda los cambios

### Opción 2: Usando gcloud (más complejo)

```powershell
# 1. Exportar configuración actual
gcloud builds triggers export rmgpgab-pokemon-app-us-central1-Pablo-rub-pokemonStatistics-lke --destination=trigger-config.yaml --project=pokemon-statistics

# 2. Editar el archivo trigger-config.yaml manualmente
# Cambiar: branch: ^bug/Pokemon-List-in-Pro-Not-Saving-Cache$
# Por: branch: ^main$

# 3. Importar la configuración corregida
gcloud builds triggers import --source=trigger-config.yaml --project=pokemon-statistics
```

### Opción 3: Deshabilitar el trigger duplicado

Si prefieres simplemente deshabilitarlo:

```powershell
gcloud builds triggers disable rmgpgab-pokemon-app-us-central1-Pablo-rub-pokemonStatistics-lke --project=pokemon-statistics
```

## Configuración Correcta Final

Después de la corrección, deberías tener:

| Trigger | Rama | Servicio | Estado |
|---------|------|----------|--------|
| `rmgpgab-pokemon-app-pre-...` | `bug/Pokemon-List-in-Pro-Not-Saving-Cache` | `pokemon-app-pre` | ✅ Activo |
| `rmgpgab-pokemon-app-...` | `main` | `pokemon-app` | ✅ Activo |
| `pokemon-statistics` | `main` | `pokemon-app` | ⚠️ Duplicado? |

**Nota:** Parece que tienes dos triggers para `main` → `pokemon-app`. Considera deshabilitar uno de ellos.

## Verificación

Después de corregir, verifica con:

```powershell
gcloud builds triggers list --format="table(name,github.push.branch,description)" --project=pokemon-statistics
```

Deberías ver:

```
NAME                            BRANCH                                      DESCRIPTION
rmgpgab-pokemon-app-pre-...     ^bug/Pokemon-List-in-Pro-Not-Saving-Cache$  Build and deploy to pokemon-app-pre
rmgpgab-pokemon-app-...         ^main$                                      Build and deploy to pokemon-app
pokemon-statistics              ^main$                                      (duplicado?)
```
