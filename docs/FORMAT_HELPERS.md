# Format Helpers - Utilidades de Formateo Reutilizables

## 📋 Descripción

Utilidades centralizadas para formatear datos de manera consistente en toda la aplicación. Evita duplicación de código y asegura formateo uniforme de formatos de batalla, nombres de Pokémon, fechas, etc.

## 🎯 Objetivo

Consolidar la lógica de formateo que estaba duplicada en múltiples componentes (`PublicGamesPage`, `SavedGamesPage`, `GameFilters`) en un único módulo reutilizable.

## 📁 Ubicación

```
client/src/utils/formatHelpers.js
```

## 🔧 Funciones Disponibles

### 1. `formatGameFormat(format)`

Formatea nombres de formatos de batalla para hacerlos legibles.

**Input:** `"gen9vgc2025reggbo3-1760"`  
**Output:** `"Gen 9 VGC 2025 Reg G Bo3 (1760+)"`

**Características:**
- Capitaliza generaciones (gen9 → Gen 9)
- Formatea VGC (vgc2025 → VGC 2025)
- Reconoce regulaciones (regg → Reg G)
- Separa rating si existe (-1760 → (1760+))
- Maneja formatos populares (OU, Ubers, Doubles, etc.)

**Uso:**
```jsx
import { formatGameFormat } from '../utils/formatHelpers';

<MenuItem value={format}>
  {formatGameFormat(format)}
</MenuItem>
```

---

### 2. `formatPokemonName(name)`

Formatea nombres de Pokémon (capitaliza y reemplaza guiones).

**Input:** `"landorus-therian"`  
**Output:** `"Landorus Therian"`

---

### 3. `formatDate(date, options)`

Formatea fechas a string legible usando Intl.DateTimeFormat.

**Parámetros:**
- `date`: Date, string o timestamp
- `options`: { locale, dateStyle, timeStyle }

**Ejemplo:**
```jsx
formatDate(new Date(), { dateStyle: 'medium', timeStyle: 'short' })
// "Nov 7, 2025, 3:45 PM"
```

---

### 4. `formatRating(rating)`

Formatea rating con colores según el nivel.

**Returns:**
```js
{
  value: 1750,
  color: '#ffa94d',    // Naranja
  tier: 'advanced'
}
```

**Tiers:**
- Expert: ≥1800 (Rojo)
- Advanced: ≥1700 (Naranja)
- Intermediate: ≥1600 (Amarillo)
- Beginner+: ≥1500 (Verde)
- Beginner: <1500 (Verde claro)
- Unrated: 0 (Gris)

---

### 5. `getTypeColor(type)`

Obtiene el color de fondo oficial para un tipo de Pokémon.

**Input:** `"fire"`  
**Output:** `"#F08030"`

---

### 6. `formatPercentage(value, options)`

Formatea porcentajes con decimales.

**Ejemplo:**
```jsx
formatPercentage(0.237, { decimals: 1 })  // "23.7%"
formatPercentage(45.6789, { decimals: 2 }) // "45.68%"
```

---

### 7. `truncateText(text, maxLength)`

Trunca texto largo agregando "...".

**Input:** `"Very long Pokemon description text"`  
**Output:** `"Very long Pokemon descrip..."`

---

### 8. `toSlug(text)`

Convierte texto a slug URL-friendly.

**Input:** `"Landorus Therian"`  
**Output:** `"landorus-therian"`

---

## 🔄 Componentes Actualizados

### Componentes que ahora usan `formatGameFormat`:

1. **GameFilters.jsx** (`client/src/components/filters/`)
   - Muestra formatos en el selector de filtros
   - Usado en PublicGamesPage y SavedGamesPage

2. **TeamBuilderPage.jsx** (`client/src/Pages/`)
   - Selector de formato/regulación
   - Muestra formatos VGC 2025 de manera legible

### Migración realizada:

**ANTES:** Función local duplicada
```jsx
// ❌ DUPLICADO en múltiples componentes
const formatRegulationName = (format) => {
  const match = format.match(/Reg ([A-Z])/i);
  if (match) return `Reg ${match[1].toUpperCase()}`;
  return format;
};
```

**DESPUÉS:** Import centralizado
```jsx
// ✅ REUTILIZABLE desde un único lugar
import { formatGameFormat } from '../../utils/formatHelpers';

<MenuItem value={format}>
  {formatGameFormat(format)}
</MenuItem>
```

---

## 📊 Ejemplos de Transformación

| Input Raw                    | Output Formateado                |
|------------------------------|----------------------------------|
| `gen9vgc2025reggbo3-1760`   | `Gen 9 VGC 2025 Reg G Bo3 (1760+)` |
| `gen9ou`                     | `Gen 9 OU`                       |
| `gen9doublesou-1500`        | `Gen 9 Doublesou (1500+)`        |
| `gen8vgc2021regg`           | `Gen 8 VGC 2021 Reg G`           |
| `gen9randombattle`          | `Gen 9 Random Battle`            |

---

## 🎨 Mantenimiento del Estilo

Todas las funciones mantienen el estilo visual consistente de la aplicación:
- Color primario: `#24cc9f`
- Fondo oscuro: `rgba(30, 30, 30, 0.9)`
- Texto: Blanco con opacidad variable
- Theme de Material-UI respetado

---

## ✅ Beneficios

1. **DRY Principle:** Elimina duplicación de código
2. **Consistencia:** Formateo uniforme en toda la app
3. **Mantenibilidad:** Un único lugar para actualizar lógica
4. **Testeable:** Funciones puras fáciles de testear
5. **Reutilizable:** Disponible para cualquier componente futuro
6. **Extensible:** Fácil agregar nuevas funciones de formateo

---

## 🔮 Uso Futuro

Estos helpers pueden ser utilizados en:
- Componentes de Pokémon Details
- Battle Analysis Page
- Rankings Page
- Cualquier lugar que muestre formatos o datos de juegos

---

## 📝 Notas Técnicas

- **Imports:** ES6 named exports
- **Tipos:** JavaScript puro (compatible con React)
- **Dependencies:** Ninguna (solo JavaScript nativo)
- **Performance:** Funciones ligeras y optimizadas
- **Error Handling:** Validación de inputs y fallbacks

---

## 🚀 Próximos Pasos

Considerar agregar:
- Formateo de nombres de moves/abilities
- Formateo de stats (HP, Attack, etc.)
- Formateo de weather/terrain conditions
- Formateo de items con sprites

---

**Última actualización:** Noviembre 7, 2025  
**Autor:** Team Pokemon Statistics
