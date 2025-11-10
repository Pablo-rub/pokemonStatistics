# Team Builder - Nueva Funcionalidad

## 📋 Descripción

Sistema de construcción y optimización de equipos Pokémon competitivos con dos modos de operación:

### Modo 1: Sugerencias (< 6 Pokémon)
- **Objetivo**: Ayudar a completar un equipo parcial
- **Funcionamiento**: 
  - Selecciona 1-5 Pokémon de tu preferencia
  - El sistema analiza la cobertura de tipos del equipo
  - Sugiere Pokémon que complementen las debilidades
  - Considera sinergia, balance defensivo y popularidad en el meta

### Modo 2: Optimización (≥ 6 Pokémon)
- **Objetivo**: Encontrar la mejor combinación de 6 Pokémon
- **Funcionamiento**:
  - Selecciona 6 o más Pokémon candidatos
  - El sistema evalúa todas las combinaciones posibles (o una muestra inteligente)
  - Calcula un score basado en múltiples criterios
  - Presenta las 5 mejores combinaciones con análisis detallado

## 🏗️ Arquitectura

### Backend
**Archivo**: `backend/src/services/teamBuilderService.js`

**Endpoints principales**:
1. `GET /api/team-builder/available-pokemon`
   - Obtiene Pokémon disponibles en una regulación específica
   - Parámetros: `format` (ej: "gen9vgc2025reggbo3")
   - **OPTIMIZADO**: Usa Smogon Stats (caché 30 días) con fallback a BigQuery

2. `POST /api/team-builder/suggest-pokemon`
   - Genera sugerencias para completar equipo
   - Body: `{ team: Array<Pokemon>, format: string, limit: number }`
   - Algoritmo de scoring basado en cobertura de tipos

3. `POST /api/team-builder/optimize-team`
   - Optimiza combinación de 6 entre N Pokémon
   - Body: `{ pokemon: Array<Pokemon>, format: string, limit: number }`
   - Evalúa combinaciones con algoritmo heurístico

**Sistema de scoring**:
- **Diversidad de tipos** (30%): Más tipos = mejor cobertura
- **Balance defensivo** (40%): Menos debilidades críticas
- **Resistencias** (20%): Cobertura de tipos comunes del meta
- **Inmunidades** (10%): Ventaja táctica
- **Stats base** (ajustado): Calidad individual de Pokémon
- **Popularidad meta**: Bonus por Pokémon frecuentes

### Frontend

**Componentes**:

1. **`TeamBuilderPage.jsx`** - Página principal
   - Selector de formato/regulación
   - Stepper de progreso (3 pasos)
   - Panel de selección de Pokémon
   - Panel de equipo actual con contador
   - Botones de acción (Analizar/Limpiar)

2. **`PokemonSelector.jsx`** - Selector de Pokémon
   - Grid responsivo con cards de Pokémon
   - Búsqueda por nombre/ID/tipo
   - Selección múltiple con checkboxes
   - Filtrado en tiempo real
   - Sprites animados

3. **`TeamSuggestions.jsx`** - Resultados
   - Modo sugerencias: Cards con Pokémon individuales + razones
   - Modo optimización: Accordions con equipos completos + análisis
   - Visualización de cobertura de tipos
   - Fortalezas, debilidades y recomendaciones

**Rutas**:
- Ruta: `/team-builder`
- Ícono: `<GroupsIcon />`
- Posición en sidebar: Entre "Turn Assistant" y "Pokemon List"

## 🎨 Diseño y UX

**Paleta de colores mantenida**:
- Primary: `#24cc9f` (verde agua)
- Background: `rgba(30, 30, 30, 0.9)` (oscuro transparente)
- Accent: Colores de tipos Pokémon estándar
- Text: Blanco con opacidades variables

**Características UX**:
- **Responsive**: Adaptado a móvil, tablet y desktop
- **Feedback visual**: Loading states, progress indicators
- **Validación**: Alertas informativas según contexto
- **Sticky panel**: Panel de equipo actual fijo en scroll
- **Animaciones**: Fade in para cards, transiciones suaves
- **Accesibilidad**: aria-labels, contraste adecuado

## 📊 Criterios de Evaluación

### Para Sugerencias
1. **Cobertura defensiva**: Resiste/inmune a debilidades del equipo
2. **Diversidad**: Aporta tipos nuevos
3. **Meta relevance**: Popularidad en formato actual
4. **Sinergia implícita**: Stats y habilidades complementarias

### Para Optimización
1. **Score global** (0-100+):
   - Tipos diversos
   - Pocas debilidades compartidas
   - Buenas resistencias
   - Inmunidades estratégicas
   - Stats competitivos

2. **Análisis cualitativo**:
   - Fortalezas identificadas
   - Debilidades críticas
   - Recomendaciones de mejora

## 🔄 Flujo de Usuario

1. **Selección de formato**
   - Usuario elige regulación (VGC 2025 Reg G, etc.)
   - Sistema carga Pokémon disponibles desde BigQuery

2. **Selección de Pokémon**
   - Usuario busca y selecciona Pokémon
   - Búsqueda instantánea por texto
   - Visual feedback de selección

3. **Análisis**
   - Sistema determina modo automáticamente (< 6 o ≥ 6)
   - Loading state durante procesamiento
   - Resultados presentados con análisis detallado

4. **Revisión de resultados**
   - Sugerencias ordenadas por relevancia
   - Equipos optimizados con scores
   - Análisis expandible por equipo

## 🚀 Próximas Mejoras Potenciales

1. **Análisis de movimientos**: Considerar cobertura ofensiva
2. **Sinergias específicas**: Weather, terrain, trick room
3. **Histórico de equipos**: Guardar equipos favoritos
4. **Comparación directa**: Comparar dos equipos side-by-side
5. **Meta insights**: Stats de victorias por composición
6. **Exportar equipo**: Formato Pokémon Showdown
7. **Importar equipo**: Desde Showdown paste

## 📝 Notas Técnicas

- **Performance**: Optimización con combinaciones > 12 Pokémon usa sampling
- **Cache**: Aprovecha pokemonCacheService existente
- **BigQuery**: Queries parametrizadas para seguridad
- **Type safety**: Validaciones en backend y frontend
- **Error handling**: Manejo robusto de errores de red/BD

## 🧪 Testing

**Manual testing checklist**:
- [ ] Selector de formato carga correctamente
- [ ] Pokémon se filtran por formato
- [ ] Búsqueda funciona (nombre/ID/tipo)
- [ ] Selección múltiple funciona
- [ ] Modo sugerencia (1-5 Pokémon) genera resultados
- [ ] Modo optimización (6+ Pokémon) genera combinaciones
- [ ] Resultados son relevantes y útiles
- [ ] UI responsive en móvil
- [ ] Loading states son claros
- [ ] Errores se muestran apropiadamente
