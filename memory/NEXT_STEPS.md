# NEXT_STEPS.md — ADM18 Course Web Application

**Ultima actualizacion**: 2026-05-31
**Sprint activo**: S7 — Correcciones post-revision + mobile-first + deploy
**S0-S6**: ✅ Completados

> Las tareas estan ordenadas por prioridad y dependencia. Cada tarea es
> atomica (< 1 hora). Una tarea tiene criterio de done verificable.

---

## Sprint S7 — Correcciones y Deploy

### ⬜ S7-01 — Reconstruir barra de progreso en index.html

**Archivo**: `index.html`
**Prioridad**: CRITICA
**Depende de**: Analizar "Falta seguir ese estilo.png"

Reemplazar la barra de progreso actual (una barra fina unica) por 14
pills/circulos numerados del 1 al 14.

**Especificacion**:
- Cada pill es un circulo de ~40px con el numero de la semana adentro
- Color por estado:
  - `var(--border)` gris claro — pendiente
  - `var(--gold)` dorado — en progreso (quiz iniciado, no enviado)
  - `var(--success)` verde con check — completado
- Semanas 5, 10, 14 tienen borde `var(--error)` rojo (examen)
- Tooltip al hover: "Semana 3 — Clases, usos y componentes — 4/5 (80%)"
- Contador: "X de 14 semanas completadas"
- Datos desde localStorage `adm18_progress` y `adm18_scores`
- Responsive: en mobile se apilan en 2 filas de 7; en desktop, 1 fila

**Criterio de done**:
- [ ] Los 14 pills se renderizan al cargar la pagina
- [ ] Colores correctos segun datos en localStorage
- [ ] Tooltip funcional
- [ ] Sin datos en localStorage: todos grises con "0 de 14"

---

### ⬜ S7-02 — Agregar seccion "Material de Estudio" en index.html

**Archivo**: `index.html`
**Prioridad**: CRITICA
**Depende de**: S7-01

Agregar una seccion debajo del hero (y arriba del grid de semanas) con
acceso directo a recursos del curso.

**Especificacion**:
- Titulo: "Material de Estudio"
- 4 tarjetas en grid (2 columnas mobile, 4 desktop):
  1. "Documentos del Caso" → link a `casos/latambox/`
  2. "Normas y Estandares" → links a GTC 185, Ley 594/2000, ISO 15489
  3. "Rubricas de Evaluacion" → links a PI1-PI4 PDFs
  4. "Bibliografia" → link a BIBLIOGRAFIA_ACTUALIZADA_ADM18.md
- Cada tarjeta con icono, titulo, descripcion breve y boton "Acceder"

**Criterio de done**:
- [ ] Seccion visible entre hero y week grid
- [ ] 4 tarjetas con links funcionales
- [ ] Estilo consistente con el resto de la pagina

---

### ⬜ S7-03 — Analizar imagen de referencia y ajustar estilo

**Archivo**: `index.html`, `css/iub-tokens.css`
**Prioridad**: ALTA
**Depende de**: ninguna

La imagen "Falta seguir ese estilo.png" (2520x1366px, en raiz del proyecto)
es la referencia visual que el docente quiere para el landing.

**Especificacion**:
- Abrir la imagen y extraer: paleta de colores, layout, tipografia,
  espaciado, estructura de componentes
- Comparar con el index.html actual
- Ajustar CSS para que el landing coincida con la referencia
- Documentar diferencias encontradas

**Criterio de done**:
- [ ] Imagen analizada (colores, layout, componentes)
- [ ] Ajustes aplicados al CSS
- [ ] Landing visualmente consistente con la referencia

---

### ⬜ S7-04 — Auditar mobile-first en todas las paginas

**Archivos**: `*.html`, `css/iub-tokens.css`
**Prioridad**: ALTA
**Depende de**: S7-01, S7-02, S7-03

Verificar que las 19 paginas HTML funcionan correctamente a 320px de ancho.

**Especificacion**:
- Abrir cada pagina en viewport 320x568 (iPhone SE)
- Verificar: no hay scroll horizontal
- Verificar: texto legible sin zoom
- Verificar: botones y links tienen touch target >= 44x44px
- Verificar: tablas tienen scroll horizontal si son muy anchas (`.table-responsive`)
- Verificar: nav colapsa correctamente en mobile
- Corregir issues encontrados

**Criterio de done**:
- [ ] 19/19 paginas sin scroll horizontal a 320px
- [ ] Touch targets >= 44px en todos los elementos interactivos
- [ ] Tablas anchas usan `.table-responsive`

---

### ⬜ S7-05 — Verificar WCAG 2.1 AA

**Archivo**: `css/iub-tokens.css`
**Prioridad**: MEDIA
**Depende de**: S7-04

Verificar contraste de color en todos los pares texto/fondo definidos
en los design tokens.

**Especificacion**:
- `--text-primary` (#1a1a1a) sobre `--bg-card` (#ffffff): ratio ≥ 4.5:1
- `--text-on-dark` (#ffffff) sobre `--primary` (#1E2843): ratio ≥ 4.5:1
- `--text-on-gold` (#1E2843) sobre `--gold` (#FFDF2D): ratio ≥ 4.5:1
- Verificar tambien: badges, alerts, botones, quiz options
- Si algun par falla, ajustar el color hasta cumplir

**Criterio de done**:
- [ ] Todos los pares texto/fondo cumplen ratio ≥ 4.5:1 (AA) o ≥ 3:1 (large text)

---

### ⬜ S7-06 — Generar PDFs de instrumentos nuevos

**Archivos**: `instrumentos/*.md`
**Prioridad**: MEDIA
**Depende de**: ninguna

Los instrumentos creados en S6 (PI1, PI2, PI4, Parcial1, Final) tienen
su .md pero no su .pdf. El script `_gen_pdf.py` tiene un bug con lineas
que empiezan con `>`.

**Especificacion**:
- Opcion A: Corregir `_gen_pdf.py` para manejar lineas `>`
- Opcion B: Usar pandoc via terminal: `pandoc archivo.md -o archivo.pdf --pdf-engine=weasyprint`
- Opcion C: Usar el modulo fpdf2 directamente desde Python con un script nuevo
- Generar PDF para: PI1, PI2, PI4, Parcial1, Final, PLO_CE_RA1, RA2, RA4, RA5

**Criterio de done**:
- [ ] 9 PDFs nuevos generados en `instrumentos/`
- [ ] Cada PDF es legible y conserva el formato de tablas

---

### ⬜ S7-07 — Configurar GitHub Pages

**Archivo**: `.github/workflows/deploy.yml` (o configuracion de repo)
**Prioridad**: BAJA
**Depende de**: S7-01 a S7-06

Publicar el sitio en GitHub Pages para que sea accesible via URL publica.

**Especificacion**:
- Configurar GitHub Pages en el repo (Settings → Pages → Branch: main, folder: /)
- Verificar que `index.html` se sirve como pagina principal
- Verificar que las rutas `semana-NN/` funcionan
- (Opcional) Configurar dominio personalizado

**Criterio de done**:
- [ ] URL publica funcional
- [ ] Navegacion entre semanas funciona
- [ ] Documentos del caso accesibles

---

### ⬜ S7-08 — Actualizar KNOWLEDGE_BASE.md

**Archivo**: `KNOWLEDGE_BASE.md`, `KNOWLEDGE_BASE.html`
**Prioridad**: BAJA
**Depende de**: S7-07

Actualizar la base de conocimiento con la estructura final de la aplicacion
web y regenerar el HTML.

**Criterio de done**:
- [ ] KNOWLEDGE_BASE.md refleja el estado final del proyecto
- [ ] KNOWLEDGE_BASE.html regenerado
- [ ] Tabla de referencias cruzadas actualizada

---

## Resumen de Dependencias

```
S7-03 (imagen ref) ──┐
                     ├──→ S7-01 (progress bar) ──┐
                     │                           ├──→ S7-04 (mobile audit)
                     └──→ S7-02 (material) ──────┘        │
                                                           ├──→ S7-05 (WCAG)
                                                           │
S7-06 (PDFs) ─────────────────────────────────────────────┤
                                                           │
                                                           └──→ S7-07 (deploy) ──→ S7-08 (KB update)
```

---

## Issues No Bloqueantes (post-S7)

- Configurar proyecto Supabase y credenciales en `js/supabase-client.js`
- Agregar meta tags para SEO y redes sociales
- Crear `manifest.json` para PWA (installable en smartphone)
- Agregar Service Worker para caching offline
- Internacionalizar quizzes (espanol + ingles si el modulo lo requiere)
- Migrar system-prompt.txt y SKILL.md originales a v2 en todos los modulos

---

> **Archivo generado:** 2026-05-31 · ADM18 · IUB/Unibarranquilla
