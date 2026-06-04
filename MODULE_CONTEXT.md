# MODULE_CONTEXT.md — {CODIGO_MODULO}

> **Plantilla de identidad del modulo.**
> Este archivo se carga al inicio de CADA sesion.
> Contiene los datos minimos necesarios para que la IA entienda
> en que modulo esta trabajando sin leer toda la base de conocimiento.
>
> **Instrucciones:** Copia esta plantilla a la carpeta del modulo,
> renombrala como MODULE_CONTEXT.md, y reemplaza todos los placeholders
> entre llaves {} con los datos reales del modulo.

---

## Identidad del Modulo

- **Codigo:** {CODIGO} (ej: ABC12 — codigo institucional del modulo)
- **Nombre:** {NOMBRE_COMPLETO} (ej: nombre oficial del modulo en el microcurriculo)
- **Institucion:** IUB / Unibarranquilla
- **Facultad:** {FACULTAD} (ej: Ciencias Economicas y Administrativas)
- **Nivel:** {NIVEL} (ej: Tecnica Profesional, Pregrado)
- **Programas:** {PROGRAMAS} (separados por coma)
- **Creditos/Horas:** {CREDITOS} creditos · {HORAS_TOTALES} h totales
  ({HAD} HAD + {HP} HP + {HTI} HTI semanal)
- **Docente disenador(a):** {NOMBRE_DOCENTE} ({FECHA_DISENO})
- **Idioma:** {IDIOMA} (materiales en este idioma; fuentes pueden ser en otro)

## Caso Integrador

- **Nombre:** {CASO_INTEGRADOR} (ej: nombre de la empresa o escenario ficticio del curso)
- **Descripcion breve:** {DESCRIPCION_CASO} (1-2 lineas)
- **Semanas que cubre:** {SEMANAS_CASO} (ej: 1-14)
- **Casos espejo para examenes:**
  - Parcial 1 (Sem {SEM_PARCIAL1}): {CASO_ESPEJO1}
  - Parcial 2 (Sem {SEM_PARCIAL2}): {CASO_ESPEJO2}
  - Final (Sem {SEM_FINAL}): {CASO_ESPEJO_FINAL}

## Estructura del Curso

### Resultados de Aprendizaje (RA)

| RA | Descripcion | Semanas | Evaluacion |
|----|-------------|---------|------------|
| RA1 | {DESC_RA1} | {SEM_RA1} | {EVAL_RA1} |
| RA2 | {DESC_RA2} | {SEM_RA2} | {EVAL_RA2} |
| RA3 | {DESC_RA3} | {SEM_RA3} | {EVAL_RA3} |
| RA4 | {DESC_RA4} | {SEM_RA4} | {EVAL_RA4} |

### Evaluaciones

| Semana | Tipo | Que evalua | Caso |
|--------|------|-----------|------|
| {SEM_PARCIAL1} | Parcial 1 | {RAS_PARCIAL1} | {CASO_ESPEJO1} |
| {SEM_PARCIAL2} | Parcial 2 | {RAS_PARCIAL2} | {CASO_ESPEJO2} |
| {SEM_FINAL} | Final | {RAS_FINAL} | {CASO_ESPEJO_FINAL} |

### Actividades con revision docente (MAX 2)

| Semana | Actividad | Tipo | Rubrica |
|--------|-----------|------|---------|
| {SEM_REV1} | {ACT_REV1} | {TIPO_REV1} | {RUBRICA_REV1} |
| {SEM_REV2} | {ACT_REV2} | {TIPO_REV2} | {RUBRICA_REV2} |

> **Regla:** Si hay mas de 2 actividades con revision docente, revisar si
> alguna puede convertirse en autocalificable.

## Stack Tecnologico

- **Frontend:** {FRONTEND} (default: HTML/CSS/JS vanilla)
- **Backend:** {BACKEND} (default: Supabase, o "ninguno" si es estatico)
- **Hosting:** {HOSTING} (default: GitHub Pages)
- **Build step:** {BUILD} (default: no — vanilla, sin compilacion)
- **Librerias adicionales:** {LIBS} (default: ninguna, o "fpdf2" para PDFs)

## Normas y Estandares del Modulo

| Norma/Estandar | Uso principal |
|----------------|---------------|
| {NORMA1} | {USO_NORMA1} |
| {NORMA2} | {USO_NORMA2} |
| {NORMA3} | {USO_NORMA3} |

## Estructura de Carpetas del Modulo

```
{CARPETA1}/   — {DESC_CARPETA1}
{CARPETA2}/   — {DESC_CARPETA2}
{CARPETA3}/   — {DESC_CARPETA3}
{CARPETA4}/   — {DESC_CARPETA4}
```

## Convencion de Nombres de Archivo

```
Formato: {FORMATO_NOMBRES}
Ejemplo: {EJEMPLO_NOMBRE}
```

## Documentos del Ecosistema del Caso

| # | Documento | Tipo | Semana | Funcion |
|---|-----------|------|:------:|---------|
| 1 | {DOC1} | {TIPO1} | {SEM1} | {FUNC1} |
| 2 | {DOC2} | {TIPO2} | {SEM2} | {FUNC2} |
| ... | ... | ... | ... | ... |

## Notas

### Relacion con RAs del Programa

{Si el modulo pertenece a un programa con RAs macro, describir la relacion.
Si no, indicar "No aplica — modulo independiente".}

### Sobre otros modulos

{Notas sobre modulos relacionados, migraciones, historial.}
{Indicar si este modulo es independiente o comparte estructura con otro.}

---

> **Archivo generado:** {FECHA} · {CODIGO} · IUB/Unibarranquilla
> **Actualizar al modificar:** semanas, rubricas, bibliografia, caso integrador.
