# 🔍 Guía de Implementación de SEO Dinámico

## ¿Qué hemos implementado?

Hemos añadido **SEO dinámico** para que cada página de tu SPA (Single Page Application) tenga sus propias meta tags, títulos y descripciones únicas para Google.

## 📦 Paquetes Instalados

```bash
npm install react-helmet-async
```

## 🏗️ Estructura Implementada

### 1. **Componente SEO Reutilizable** (`/src/components/SEO.jsx`)

Este componente gestiona dinámicamente:
- ✅ `<title>` de la página
- ✅ Meta description
- ✅ Meta keywords
- ✅ Canonical URL
- ✅ Open Graph tags (Facebook)
- ✅ Twitter Cards
- ✅ URL canónica basada en la ruta actual

### 2. **Wrapper Global** (`/src/index.js`)

Hemos envuelto la app con `<HelmetProvider>` para que funcione correctamente.

---

## 🎯 Cómo Usar el Componente SEO

### **Ejemplo Básico**

```jsx
import SEO from '../components/SEO';

function MyPage() {
  return (
    <>
      <SEO 
        title="Mi Página"
        description="Descripción única de esta página"
        keywords="palabra1, palabra2, palabra3"
      />
      
      {/* Resto del contenido de tu página */}
      <div>Contenido aquí...</div>
    </>
  );
}
```

### **Ejemplo con SEO Dinámico** (basado en parámetros)

```jsx
import SEO from '../components/SEO';
import { useParams } from 'react-router-dom';

function PokemonDetailPage() {
  const { nameOrId } = useParams();
  const [pokemon, setPokemon] = useState(null);

  // ... fetch pokemon data

  return (
    <>
      <SEO 
        title={pokemon ? `${pokemon.name} - Stats & Analysis` : 'Loading...'}
        description={pokemon 
          ? `Detailed stats, abilities, moves, and competitive analysis for ${pokemon.name}. Win rates, usage statistics, and optimal builds for VGC.`
          : 'Loading Pokémon details...'
        }
        keywords={pokemon 
          ? `${pokemon.name}, pokemon stats, ${pokemon.types?.join(', ')}, vgc analysis`
          : 'pokemon, vgc'
        }
      />
      
      {/* Resto del componente */}
    </>
  );
}
```

---

## 📄 Páginas Ya Implementadas

✅ **HomePage** - SEO estático para la home
✅ **PokemonListPage** - SEO dinámico basado en filtros y búsqueda
✅ **RankingsPage** - SEO dinámico basado en formato y tipo de ranking

---

## 📋 Páginas Pendientes de Implementar

Aquí tienes ejemplos de SEO para cada página restante:

### 1. **PokemonDetailPage** (`/pokemon/:nameOrId`)

```jsx
import SEO from '../components/SEO';

// Dentro del componente, después de cargar los datos:
<SEO 
  title={`${pokemon.name} - Stats & Competitive Analysis`}
  description={`Detailed competitive analysis for ${pokemon.name}. View stats, abilities, moves, win rates, and optimal builds for VGC battles.`}
  keywords={`${pokemon.name}, pokemon stats, ${pokemon.types?.join(' ')}, vgc ${pokemon.name}, competitive ${pokemon.name}`}
  image={pokemon.sprites?.front_default || undefined}
/>
```

### 2. **ForumPage** (`/forum`)

```jsx
<SEO 
  title="Community Forum"
  description="Join the Trainer Academy community. Discuss strategies, share replays, ask questions, and connect with other competitive Pokémon VGC players."
  keywords="pokemon forum, vgc community, pokemon discussion, competitive pokemon community"
/>
```

### 3. **ForumTopicPage** (`/forum/:topicId`)

```jsx
<SEO 
  title={`${topic.title} - Forum Discussion`}
  description={topic.description || `Join the discussion: ${topic.title}. Share your thoughts and strategies with the VGC community.`}
  keywords={`pokemon forum, ${topic.title}, vgc discussion, pokemon strategy`}
/>
```

### 4. **SavedGamesPage** (`/saved-games`)

```jsx
<SEO 
  title="My Saved Games"
  description="View and manage your saved Pokémon VGC battle replays. Analyze your matches and track your competitive performance."
  keywords="saved battles, pokemon replays, my games, vgc replays, battle history"
/>
```

### 5. **PublicGamesPage** (`/public-games`)

```jsx
<SEO 
  title="Public Battle Replays"
  description="Browse and watch recent competitive Pokémon VGC matches. Learn from top players and discover new strategies."
  keywords="pokemon replays, vgc battles, competitive matches, pokemon showdown replays, vgc gameplay"
/>
```

### 6. **TurnAssistantPage** (`/turn-assistant`)

```jsx
<SEO 
  title="Turn Assistant - Battle Strategy Tool"
  description="Get real-time battle assistance for competitive Pokémon VGC. Analyze matchups, predict moves, and make optimal decisions during battles."
  keywords="battle assistant, vgc calculator, pokemon battle tool, turn prediction, competitive assistant"
/>
```

### 7. **BattleAnalyticsPage** (`/battle-analytics`)

```jsx
<SEO 
  title="Battle Analytics Dashboard"
  description="Deep dive into battle statistics and analytics. Analyze trends, win rates, and team compositions from competitive VGC matches."
  keywords="battle analytics, vgc statistics, pokemon data analysis, competitive analytics, battle insights"
/>
```

### 8. **AnalyzeBattlePage** (`/analyze-battle/:replayId`)

```jsx
<SEO 
  title={`Analyze Battle ${replayId}`}
  description={`Detailed analysis of battle replay ${replayId}. Review turn-by-turn decisions, team matchups, and key moments from this competitive VGC match.`}
  keywords={`battle analysis, replay ${replayId}, vgc analysis, match review, battle breakdown`}
/>
```

### 9. **ProfilePage** (`/profile`)

```jsx
<SEO 
  title="My Profile"
  description="Manage your Trainer Academy profile. View your statistics, saved battles, and customize your account settings."
  keywords="user profile, my account, trainer profile, vgc profile, account settings"
/>
```

### 10. **ContactPage** (`/contact`)

```jsx
<SEO 
  title="Contact Us"
  description="Get in touch with the Trainer Academy team. We're here to help with questions, feedback, or suggestions."
  keywords="contact, support, feedback, help, trainer academy contact"
/>
```

---

## 🚀 Próximos Pasos para COMPLETAR el SEO

### 1. **Añadir SEO a TODAS las páginas**

Copia los ejemplos de arriba en cada página correspondiente.

### 2. **Generar Sitemap XML** (Importante para Google)

Crea un archivo `/public/sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://traineracademy.xyz/</loc>
    <lastmod>2025-11-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/pokemon-list</loc>
    <lastmod>2025-11-10</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/rankings</loc>
    <lastmod>2025-11-10</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/public-games</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/forum</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/battle-analytics</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/turn-assistant</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://traineracademy.xyz/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

### 3. **Añadir robots.txt** (Si no lo tienes ya)

Ya tienes uno en `/backend/robots.txt`, asegúrate de tener uno también en `/public/robots.txt`:

```txt
User-agent: *
Allow: /

Sitemap: https://traineracademy.xyz/sitemap.xml
```

### 4. **Server-Side Rendering (SSR) - OPCIONAL pero RECOMENDADO**

Para que Google indexe correctamente las páginas dinámicas, considera:

**Opción A:** Migrar a **Next.js** (React con SSR nativo)
**Opción B:** Usar **Prerendering** con herramientas como:
- `react-snap` (genera HTML estático de tus rutas)
- `react-helmet-async` + servidor Node con SSR

**Opción C:** Usar **Dynamic Rendering** en tu servidor:
- Detectar bots de Google
- Servir HTML renderizado para bots
- Servir SPA normal para usuarios

---

## 🔍 Cómo Verificar que Funciona

### 1. **En el navegador**

Visita diferentes páginas y verifica que el título cambia:
- Home: "Home | Trainer Academy"
- Rankings: "Usage Rankings - gen9vgc2025regj | Trainer Academy"
- Pokémon List: "All Pokémon - Complete Database | Trainer Academy"

### 2. **En el código fuente**

Haz clic derecho → "Ver código fuente" y busca:
```html
<title>Tu Título Aquí | Trainer Academy</title>
<meta name="description" content="Tu descripción aquí">
```

### 3. **Con Google Search Console**

1. Ve a [Google Search Console](https://search.google.com/search-console)
2. Añade tu sitio
3. Usa la herramienta "Inspección de URLs"
4. Pega una URL (ej: `https://traineracademy.xyz/pokemon-list`)
5. Haz clic en "Probar URL activa"
6. Verifica que Google ve el contenido correcto

### 4. **Con Facebook Debugger**

Prueba las Open Graph tags:
https://developers.facebook.com/tools/debug/

---

## 📊 Mejores Prácticas de SEO

### **Títulos**
- ✅ Máximo 60 caracteres
- ✅ Incluir keywords principales
- ✅ Formato: "Página Específica | Nombre del Sitio"

### **Descripciones**
- ✅ Entre 150-160 caracteres
- ✅ Incluir call-to-action
- ✅ Descripción única por página

### **Keywords**
- ✅ 5-10 keywords relevantes
- ✅ Separadas por comas
- ✅ Evitar keyword stuffing

### **URLs**
- ✅ Limpias y descriptivas
- ✅ Usa parámetros de query solo cuando sea necesario
- ✅ Ejemplo: `/pokemon/pikachu` mejor que `/p?id=25`

---

## 🎓 Recursos Adicionales

- [React Helmet Async Docs](https://github.com/staylor/react-helmet-async)
- [Google SEO Starter Guide](https://developers.google.com/search/docs/beginner/seo-starter-guide)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

---

## ✅ Checklist de Implementación

- [x] Instalar `react-helmet-async`
- [x] Configurar `HelmetProvider` en `index.js`
- [x] Crear componente `SEO.jsx`
- [x] Implementar SEO en HomePage
- [x] Implementar SEO en PokemonListPage
- [x] Implementar SEO en RankingsPage
- [ ] Implementar SEO en PokemonDetailPage
- [ ] Implementar SEO en ForumPage
- [ ] Implementar SEO en ForumTopicPage
- [ ] Implementar SEO en SavedGamesPage
- [ ] Implementar SEO en PublicGamesPage
- [ ] Implementar SEO en TurnAssistantPage
- [ ] Implementar SEO en BattleAnalyticsPage
- [ ] Implementar SEO en AnalyzeBattlePage
- [ ] Implementar SEO en ProfilePage
- [ ] Implementar SEO en ContactPage
- [ ] Crear/actualizar sitemap.xml
- [ ] Verificar robots.txt
- [ ] Testear con Google Search Console
- [ ] Testear con Facebook Debugger
- [ ] Considerar SSR/Prerendering para mejor indexación

---

## 🤔 ¿Tienes Dudas?

**P: ¿Por qué Google sigue mostrando el título viejo?**
R: Google tarda días/semanas en re-indexar. Usa Google Search Console para forzar una re-indexación.

**P: ¿Necesito SSR obligatoriamente?**
R: No es obligatorio, pero **muy recomendado** para SPAs con contenido dinámico. React Helmet funciona bien para usuarios y redes sociales, pero los bots de Google pueden tener problemas con JavaScript.

**P: ¿Puedo tener diferentes imágenes de Open Graph por página?**
R: ¡Sí! Pasa el parámetro `image` al componente SEO:
```jsx
<SEO 
  title="Pikachu"
  image="https://example.com/pikachu.png"
/>
```

**P: ¿Cómo hago SEO dinámico para Pokémon individuales?**
R: Ya está en los ejemplos arriba. Usa los datos del Pokémon para generar títulos y descripciones únicas.
