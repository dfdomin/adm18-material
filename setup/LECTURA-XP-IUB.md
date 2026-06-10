# Política IUB — XP por lectura (tiempo en pantalla)

## ¿Por qué hay puntos por leer?

En los cuatro módulos (ADM18, TGA04, TGA05, TD) **parte de la nota formativa** se construye con participación semanal. La lectura guiada del material cuenta como participación: no basta abrir la página; hay que **permanecer en cada sección el tiempo mínimo** con la pestaña visible.

## Referencias externas (síntesis)

| Fuente | Recomendación aplicable |
|--------|-------------------------|
| [Level Up Classroom — Reading XP](https://levelupclassroom.wordpress.com/2026/02/27/gamifying-reading-assignments/) | **1 página = 1 XP**; bonos por hitos; multiplicador si hay comprensión (quiz). |
| [University of Waterloo — Gamification](https://uwaterloo.ca/centre-for-teaching-excellence/catalogs/tip-sheets/gamification-and-game-based-learning) | Puntos flexibles por tareas opcionales; lectura/preparación como actividades con XP. |
| [JITE systematic review 2020–2024](https://www.informingscience.org/Publications/5394) | Badges y progreso visible por secciones; lectura gamificada mejora engagement. |
| Regla académica IUB (cortes) | **40 % formativo / 60 % evaluación** → la lectura alimenta el bloque formativo. |

## Cifras adoptadas en IUB

| Concepto | Valor |
|----------|-------|
| Cupo XP semanal típico | **100 pts** (algunas semanas TGA04/TD usan 50–55 según actividades) |
| XP máximo por **lectura** | **51 XP** (~**40–51 %** del cupo 100) |
| XP restante | Quiz, laboratorios, retos, asistencia registrada |
| Método | `IntersectionObserver` + temporizador acumulado (solo pestaña activa) |
| Umbral visibilidad | 30 % del bloque en viewport |

### Tabla estándar TGA / TD (secciones con `id`)

| Sección (`id`) | Tiempo mín. | XP |
|----------------|-------------|-----|
| `mision` | 20 s | 5 |
| `teoria` | 60 s | 15 |
| `python` | 40 s | 10 |
| `actividad` | 30 s | 8 |
| `interactivo` | 30 s | 8 |
| `quiz` (lectura del bloque) | 20 s | 5 |
| **Total lectura** | | **51 XP** |

### Tabla ADM18 (secciones con `id`)

| Sección (`id`) | Tiempo mín. | XP |
|----------------|-------------|-----|
| `mision` | 20 s | 5 |
| `contenido` | 60 s | 15 |
| `actividades` | 30 s | 8 |
| `bibliografia` | 20 s | 5 |
| **Total lectura** | | **33 XP** |

> El quiz ADM18 (`QuizEngine`) suma aparte hasta 100 % de la semana.

## Implementación en código

- `js/reading-xp-policy.js` — panel informativo + detección de secciones.
- `js/reading-tracker.js` — otorga XP vía `PT.addXP` / auto-sync.
- Cada `semana*/index.html` incluye el aviso automático al cargar.

## Mensaje al estudiante (resumen)

> **📖 Puntos por lectura:** al estudiar cada sección con calma ganas XP que cuentan para tu nota formativa. Mira el cuadro azul al inicio de la semana: indica **segundos mínimos** y **XP por sección**. El quiz y las actividades suman el resto del cupo semanal.
