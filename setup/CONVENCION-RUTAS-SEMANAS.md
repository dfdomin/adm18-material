# Convención de rutas de semanas · IUB

## Nombre estándar (objetivo)

| Elemento | Formato canónico | Ejemplo |
|----------|------------------|---------|
| Etiqueta visible | `Semana NN` (dos dígitos) | Semana 01 |
| Carpeta en disco | `semana-NN/` | `semana-01/` |
| URL GitHub Pages | `.../semana-NN/` | `.../semana-01/` |
| Clave localStorage | `{prefix}_progress:{offering}:{N}` | semana número 1–14 |

## Estado actual por módulo

| Módulo | Carpetas hoy | Migración |
|--------|--------------|-----------|
| ADM18 | ✅ `semana-01/` … `semana-14/` | Referencia canónica |
| TGA04 | `semana1/` … `semana15/` | Renombrar + redirects (fase futura) |
| TGA05 | `semana1/` … `semana14/` | Idem |
| TD | `semana1/` … `semana8/` (9–14 pendientes) | Idem |

Los archivos `setup/enlaces/*-semanas.md` usan **siempre Semana 01, 02…** en la tabla, con el enlace real que funciona hoy.

## Sincronización automática a Supabase

| Módulo | Disparador |
|--------|------------|
| ADM18 | Enviar quiz → `QuizEngine.submit` → `syncAdm18Scores` |
| TGA04, TGA05, TD | Responder quiz / ganar XP → `PT.save` / `PT.addXP` → `week-auto-sync.js` → `syncWeekProgress` |

No se requiere botón **☁️ Guardar** para persistir (el botón puede quedar como reintento manual).
