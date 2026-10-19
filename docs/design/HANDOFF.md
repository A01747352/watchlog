# Watchlog: handoff de diseño para Claude Code

Webapp personal para registrar películas, series y anime vistos, calificarlos y recibir recomendaciones. Uso: el autor y unos pocos amigos. Es un proyecto de portafolio: tiene que verse profesional y con personalidad.

**Stack:** Next.js (App Router) + Tailwind CSS v4 + shadcn/ui + next-themes + lucide-react. Datos de TMDB.

Las referencias visuales son los archivos `*.dc.html` del proyecto (ábrelos en el navegador): `Sistema de diseño`, `Biblioteca`, `Ficha`, `Buscar`, `Calificar`, `Para ti`. Están pendientes de diseño: Estadísticas, Login + onboarding y Perfil (ver §7).

---

## 1. Principios

- **Los pósters son protagonistas.** La UI es oscura, neutra y silenciosa, y solo los enmarca. Los degradados aparecen únicamente en los placeholders de póster.
- **Modo oscuro por defecto**, con modo claro completo.
- **Un solo acento cálido** (`--brand`, coral). Se usa en el foco, el ítem de navegación activo, la nota y el motivo de cada recomendación.
- **Botón primario = tinta invertida** (`--primary`: blanco en oscuro, casi negro en claro). No es de color.
- **Tipo de contenido = color + forma + texto, siempre los tres:** Película ■ cuadrado · Serie ● círculo · Anime ◆ rombo (cuadrado rotado 45°).
- Contraste AA, foco visible y todo usable con teclado.

## 2. Tokens

Copia `tokens.css` y `globals.css` del proyecto a `app/`. Los nombres siguen la convención de shadcn, así que los componentes de shadcn funcionan sin cambios.

- next-themes: `attribute="class"`, `themes={["dark","light"]}`, `defaultTheme="dark"`. `:root` ya contiene el tema oscuro y `.light` lo sobrescribe.

### Color (oklch; tono neutro 285, ligeramente frío)

| Token | Oscuro | Claro |
|---|---|---|
| background | 0.16 0.008 285 | 0.985 0.003 285 |
| card | 0.195 0.009 285 | 1 0 0 |
| popover | 0.215 0.01 285 | 1 0 0 |
| secondary | 0.245 0.01 285 | 0.955 0.005 285 |
| muted | 0.225 0.009 285 | 0.965 0.004 285 |
| accent (hover / activo) | 0.265 0.012 285 | 0.94 0.006 285 |
| border | 0.29 0.01 285 | 0.905 0.006 285 |
| input | 0.31 0.01 285 | 0.88 0.006 285 |
| foreground / primary | 0.965 0.004 285 | 0.2 0.01 285 |
| muted-foreground | 0.74 0.012 285 | 0.46 0.012 285 |
| subtle-foreground | 0.64 0.012 285 | 0.52 0.012 285 |
| brand / ring | 0.76 0.14 40 | 0.58 0.16 40 |
| destructive | 0.72 0.16 25 | 0.54 0.19 25 |
| type-movie | 0.82 0.12 80 | 0.52 0.12 70 |
| type-series | 0.80 0.11 225 | 0.50 0.12 235 |
| type-anime | 0.78 0.13 315 | 0.50 0.15 315 |
| status-watching | 0.80 0.14 155 | 0.50 0.13 155 |
| sidebar | 0.14 0.008 285 | 0.97 0.004 285 |

Colores de estado:
- `pending` y `paused` usan muted-foreground.
- `completed` usa foreground.
- `dropped` usa destructive.

### Tipografía (Google Fonts vía `next/font`)

- **Bricolage Grotesque**: titulares (`font-display`).
- **Geist**: interfaz (`font-sans`).
- **Geist Mono**: notas, años, episodios y contadores (`font-mono`).

| Estilo | Tamaño / interlineado | Peso | Tracking |
|---|---|---|---|
| display | 40/44 | 600 | -0.025em |
| h1 | 32/37 | 600 | -0.02em |
| h2 | 22/28 | 600 | -0.01em |
| h3 (Geist) | 17/23 | 600 | normal |
| body | 14/21 | normal | normal |
| small | 13/19 | normal | normal |
| caption / mono | 12 | 500 | normal |

Títulos de página: 34px en escritorio y 28px en móvil.

### Radios, espaciado y sombras

- **Radios:** xs 4 · sm 6 (badges) · md 8 (pósters, inputs) · lg 10 (botones) · xl 14 (paneles y cards) · 2xl 20 (diálogos) · full (chips y píldoras).
- **Espaciado:** base 4px. Lo más usado: 8, 12, 16, 20, 24, 32 y 40 (padding lateral del contenido en escritorio).
- **Sombras:** `shadow-sm`, `shadow-md` (cards elevadas), `shadow-lg` (diálogos, popovers, toasts) y `shadow-poster` (todos los pósters).

## 3. Layout

- **Escritorio (≥1024):** sidebar fija de 240px a la izquierda y contenido a la derecha con padding de 40px.
  - Sidebar: logo, navegación (Biblioteca, Para ti, Buscar, Estadísticas), sección "Colección" con conteo por tipo y tarjeta de usuario (enlace a Perfil) abajo.
  - Ítem activo: fondo `accent` e icono en `brand`.
- **Móvil:** barra inferior con 4 ítems y objetivos ≥48px.
  - Las acciones (registrar, tema) van en la cabecera de cada pantalla, con botones de 44×44.
- **Pie TMDB obligatorio en todas las pantallas:**
  - Placeholder del logo (76×26) + el texto "Este producto usa la API de TMDB, pero no está respaldado ni certificado por TMDB."
  - Donde se muestre "dónde verlo", añade "Disponibilidad de streaming por JustWatch".
  - En móvil va al final del scroll.

## 4. Componentes

**TypeBadge** `{type: 'movie'|'series'|'anime', variant: 'inline'|'pill'}`
- Inline: forma de 7px + etiqueta en color de tipo, peso 600.
- Pill: fondo `color-mix(type 14%, transparent)`.

**StatusBadge** `{status, variant: 'outline'|'onPoster'}`

| Estado | Icono lucide |
|---|---|
| Pendiente | clock |
| Viendo | play |
| Terminado | check |
| En pausa | pause |
| Abandonado | x |

- Outline: píldora con borde y texto en color de estado.
- onPoster: fondo `rgb(12 12 16/.72)`, blur de 6px y texto blanco en ambos temas. Si el estado es Viendo, muestra `E18/28`.

**TitleCard** `{title, type, year, rating?, status, progress?, view: 'grid'|'list'}`
- Grid:
  - Póster 2:3 con radio 8 y `shadow-poster`.
  - Badge de estado arriba a la izquierda, solo si el estado no es Terminado.
  - `★ 9.5` en mono arriba a la derecha, solo si tiene nota.
  - Barra de progreso de 3px abajo (verde de estado), solo si está en Viendo o En pausa.
  - Debajo: título en una línea con elipsis, y TypeBadge inline · año.
  - Hover: translateY(-3px). Toda la tarjeta es un `<button>`/`<Link>` con `aria-label` completo.
- List: fila de grid con columnas `52px | título + géneros | tipo | año | estado | progreso | nota`.
- Skeleton: bloques `muted` con pulso de opacidad (1.6s).

**RatingInput** `{value, onChange}`: nota de 1 a 10 en pasos de 0.5.
- Número grande en Bricolage, color `brand` + "/10" + palabra.
- Palabras: Terrible, Muy mala, Mala, Floja, Regular, Correcta, Buena, Muy buena, Excelente, Obra maestra.
- 10 celdas que se rellenan parcialmente. Clic en la mitad izquierda de una celda = x.5. Al pasar el ratón se previsualiza la nota.
- `role="slider"`, aria-valuemin 1, aria-valuemax 10 y aria-valuetext ("8.5 de 10, Muy buena").
- Teclado: ←/↓ −0.5 · →/↑ +0.5 · 1–9 directo · 0 o End = 10 · Home = 1.
- En móvil, botones −/+ a los lados de la barra.

**EpisodeProgress** `{watched, total}`
- Segmentado (una celda por episodio) hasta 52 episodios; a partir de ahí, barra continua.
- Texto "Episodio X de N" + porcentaje o "Faltan N · ~h".
- Acciones: "−" y "Vi el siguiente". Al llegar al total, el estado pasa a Terminado.

**SearchBar**
- Altura 40 en la cabecera (con `⌘K`) y 56 en la página de búsqueda.
- Al recibir foco: borde `ring` + halo de 3px.
- Resultados en un `listbox` con el primero preseleccionado.

**FilterBar**
- Tipo: control segmentado excluyente (Todo / Películas / Series / Anime, con conteos).
- Género, año (por décadas) y nota (9+, 8+, 7+, Sin nota): desplegables tipo píldora (shadcn Select).
- Estado: chips con icono y conteo.
- Un filtro activo lleva borde `foreground` (chip relleno con tinta). Aparece "Limpiar filtros" cuando hay alguno activo.
- En móvil: segmentado de tipo + chips con scroll horizontal + botón "Filtros" (sheet) con contador en `brand`.

**RecommendationCard** `{title, type, year, genres, reason, reasonKind, blurb, match}`
- Motivo arriba, en `brand`, con icono según el tipo:

| Tipo de motivo | Icono | Ejemplo |
|---|---|---|
| Nota | sparkles | "Porque calificaste Frieren con 9.5" |
| Viendo | play | "Porque estás viendo Severance" |
| Amigo | users | "Ana le dio 9.5 · coincidís en un 82%" |
| Género | chart-column | "Tu género con mejor nota: Drama" |

- Acciones:
  - "Añadir": el botón pasa a "En pendientes ✓" (secundario).
  - "Descartar": la tarjeta se colapsa en "Descartado · Deshacer".
- Afinidad en mono a la derecha.

**StatCard**
- Etiqueta (12px, muted), valor (Bricolage 30) con unidad en mono, y variación o subtexto debajo.
- Variante con gráfico de barras mensual: el mes actual va en `brand` y el resto en `secondary`.

**Estados** (cada pantalla con datos):
- Vacío: icono en cuadro de 56px, título h2, texto y CTA primaria.
- Cargando: skeletons con la forma del contenido final.
- Error: icono `circle-alert` en destructive, `role="alert"` y botón "Reintentar".
- Sin resultados de filtros: botón "Limpiar filtros".

**Toast** (añadido / deshacer): popover con `shadow-lg`. Contiene la miniatura, el título, "Añadido como {estado}", un botón "Calificar" en `brand` y "Deshacer".

## 5. Pantallas

1. **Biblioteca** (`/`)
   - Cabecera: búsqueda, tema y "Registrar".
   - h1 + resumen ("20 títulos · 312 h vistas · nota media 8.8").
   - Conmutador Pósters/Lista y orden: Añadidos recientemente / Mi nota / Título A–Z / Año.
   - FilterBar y grid de 6 columnas en 1440 (3 en móvil).
   - Estados: normal / cargando / vacío / error / sin resultados.
2. **Ficha** (`/title/[type]/[id]`)
   - Backdrop de 420px que se funde con el fondo.
   - Grid de 3 columnas: póster 220 | contenido | panel lateral 300.
   - Contenido: TypeBadge, h1 48px, metadatos en mono, géneros, sinopsis, EpisodeProgress (solo en series y anime), mi reseña (cita en Bricolage) con etiquetas, y reparto/estudio en avatares circulares.
   - Panel lateral: mi nota + "Calificar", select de estado, "Registrar re-visionado", dónde verlo (proveedores de TMDB/JustWatch por región), historial con línea de tiempo y ficha técnica.
   - Móvil: backdrop de 300px con el póster superpuesto, tarjetas Mi nota y Estado lado a lado, y después las secciones apiladas.
3. **Buscar** (`/search`, y también `⌘K` como CommandDialog)
   - Resultados mezclados por tipo con pestañas y conteos.
   - Cada resultado tiene "Pendiente" (secundario) y "Visto" (primario), que registran en un clic. Si el título ya está en la biblioteca, muestra su estado.
   - Atajos: ↑↓, ↵ = visto, P = pendiente, ⇧↵ = abrir ficha.
   - Sin texto escrito: búsquedas recientes.
   - Objetivo: registrar algo en menos de 10 segundos (buscar → Visto → calificar opcional desde el toast).
4. **Calificar**: Dialog de 560px en escritorio y Sheet inferior en móvil.
   - RatingInput, reseña corta (máx. 280, contador que se vuelve rojo a partir de 260), checkbox de spoilers, etiquetas conmutables + "Nueva", fecha ("Visto hoy"), y "Cancelar" / "Guardar nota".
5. **Para ti** (`/for-you`)
   - Filtro por tipo y grid de 2 columnas de RecommendationCard (lista en móvil).
   - "Afinar gustos" lleva al onboarding.
   - Estado vacío: "No hay más por ahora".

## 6. Accesibilidad

- `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` en todo.
- Grupos de filtros con `role="group"` + `aria-pressed`. Pestañas de búsqueda con `role="tablist"`.
- Las formas de tipo y los iconos de estado son decorativos (`aria-hidden`); el texto siempre está presente.
- Todo el texto sobre fondo cumple 4.5:1. Sobre pósters se usan badges oscuros fijos con texto blanco.
- Objetivos táctiles en móvil ≥44px (≥48px en la barra inferior).

## 7. Pendiente de diseñar

Sigue el mismo sistema en estas pantallas:

- **Estadísticas:** horas vistas, títulos terminados, nota media y racha (StatCards); actividad por mes (barras); géneros favoritos (barras horizontales); reparto por tipo; distribución de notas; top de títulos. Filtro de periodo: año / todo.
- **Login + onboarding:** Google y enlace mágico por email. Después, calificar 10–15 títulos populares (grid de pósters con nota rápida y "No lo vi") con un progreso visible del tipo "7 de 10".
- **Perfil:** avatar, nombre, fecha de alta, resumen de estadísticas, 4 favoritos, amigos con % de afinidad, actividad reciente y ajustes (tema, idioma, región de streaming, privacidad, exportar datos, cerrar sesión).

## 8. Notas de implementación

- Imágenes: `image.tmdb.org`. Usa `w342` para pósters de grid, `w780`/`w1280` para backdrops y `next/image` con `sizes`.
- Placeholder de póster mientras carga: fondo `muted` y luego la imagen con fade.
- Las notas se guardan como número con un decimal (`numeric(3,1)`, entre 1 y 10, paso 0.5).
- Estados (enum): `pending | watching | completed | paused | dropped`.
- Re-visionados: una tabla `watches` (title_id, date, rating?) para el historial.
