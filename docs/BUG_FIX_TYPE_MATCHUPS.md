# Bug Fix: Type Matchups Calculation

## Problema Identificado

**Fecha:** 11 de Noviembre, 2025  
**Reportado en:** Pokémon Detail Page - Type Matchups Tab  
**Ejemplo:** Skuntank (Poison/Dark) mostraba x2 de daño contra ataques Psychic cuando debería ser inmune (x0)

## Causa Raíz

El problema estaba en el uso del operador OR lógico (`||`) en lugar del operador nullish coalescing (`??`) para valores por defecto en las funciones de cálculo de ventajas de tipos.

### Código Problemático

```javascript
const multiplier = typeMatchup?.[defendingType.toLowerCase()] || 1;
```

### Problema

En JavaScript, el valor `0` es considerado "falsy", por lo que cuando un tipo tiene inmunidad (multiplicador = 0), la expresión `0 || 1` evaluaba a `1` en lugar de `0`.

**Ejemplo:**
- Skuntank tiene tipos: Poison + Dark
- Psychic vs Poison: 2x (super efectivo)
- Psychic vs Dark: 0x (inmune)
- Cálculo erróneo: 2 * (0 || 1) = 2 * 1 = 2x ❌
- Cálculo correcto: 2 * (0 ?? 1) = 2 * 0 = 0x ✓

## Solución Implementada

Se reemplazó el operador `||` por el operador nullish coalescing `??` en dos funciones:

### 1. `calculateDefensiveMatchups` (línea 182)

**Antes:**
```javascript
const multiplier = typeMatchup?.[defendingType.toLowerCase()] || 1;
```

**Después:**
```javascript
const multiplier = typeMatchup?.[defendingType.toLowerCase()] ?? 1;
```

### 2. `calculateOffensiveMatchups` (línea 210)

**Antes:**
```javascript
matchups[defendingType] = typeChart[defendingType] || 1;
```

**Después:**
```javascript
matchups[defendingType] = typeChart[defendingType] ?? 1;
```

## Diferencia entre `||` y `??`

| Operador | Valores que activan el default | Comportamiento con `0` |
|----------|-------------------------------|------------------------|
| `\|\|`   | Todos los falsy (0, false, "", null, undefined, NaN) | `0 \|\| 1` = `1` ❌ |
| `??`     | Solo null y undefined | `0 ?? 1` = `0` ✓ |

## Casos de Prueba Verificados

1. **Skuntank (Poison/Dark)**
   - Psychic: 0x ✓ (antes: 2x ❌)

2. **Gengar (Ghost/Poison)**
   - Normal: 0x ✓
   - Fighting: 0x ✓

3. **Flygon (Ground/Dragon)**
   - Electric: 0x ✓

## Archivos Modificados

- `client/src/utils/typeMatchups.js`
  - Línea 182: Fix en `calculateDefensiveMatchups`
  - Línea 210: Fix en `calculateOffensiveMatchups`

## Impacto

- ✅ Corrige todos los cálculos de inmunidad de tipos
- ✅ No afecta cálculos normales (1x, 2x, 4x, 0.5x, 0.25x)
- ✅ Sin breaking changes
- ✅ Compatible con la implementación existente

## Lecciones Aprendidas

Al trabajar con valores numéricos que pueden ser `0` de forma válida, siempre usar el operador nullish coalescing (`??`) en lugar del operador OR (`||`) para valores por defecto.

## Referencias

- [MDN: Nullish coalescing operator (??)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [MDN: Logical OR (||)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)
