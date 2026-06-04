# Copilot Instructions

## Contexto del repo
- Repositorio del modulo **ADM18 - Procesamiento de la Informacion en la Organizacion**.
- La fuente de verdad es, en este orden: `KNOWLEDGE_BASE.md`, `ADM18_Procesamiento_Informacion.md`, `BIBLIOGRAFIA_ACTUALIZADA_ADM18.md`, `fuentes_curso_ADM18.md`, `casos/`, `instrumentos/`, `semana-*/`, `docs/` y `memory/`.
- Las semanas 1-6 son prioridad alta cuando la tarea es de comprension, material de clase o prompts para NotebookLM.

## Arquitectura alta
- Sitio educativo estatico con paginas `index.html`, `semana-01/` a `semana-14/`, y paneles de apoyo como `progreso.html`, `notas.html`, `participacion.html` y `profesor.html`.
- Contenido pedagogico en Markdown para el curso, los casos, las rubricas y la base de conocimiento.
- Caso principal: **LatamBox**. Casos espejo: **Envios del Pacifico**, **AndesBox** y **GlobalBox Connect**.
- `KNOWLEDGE_BASE.md` y `KNOWLEDGE_BASE.html` deben mantenerse sincronizados.

## Comandos
- No hay comandos de build, test o lint definidos en el repositorio raiz.
- Si se necesita regenerar PDFs desde Markdown, usar `python instrumentos/_gen_pdf.py`.
- La validacion practica es abrir las paginas HTML o revisar los Markdown afectados; no existe un comando unico de prueba.

## Convenciones
- Responder en espanol, con bloques cortos y foco didactico.
- No inventar citas ni referencias: usar solo la bibliografia del repositorio.
- Mantener la alineacion semanal del curso:
  - RA1: semanas 1-3
  - RA2: semanas 4, 6 y 7
  - RA3: semanas 8-9
  - RA4: semanas 11-13
- Respetar GTC 185, Ley 594 de 2000, ISO 15489-1:2016 y la convencion de nombres `TIPO_Destinatario_Asunto_FECHA_VERSION.ext`.
- Reutilizar las 12 estrategias grupales ya definidas en `KNOWLEDGE_BASE.md`.
- Si se crea un archivo permanente nuevo, actualizar la tabla de referencias cruzadas en `KNOWLEDGE_BASE.md`.
- Cuando te pidan materiales para NotebookLM, crear un `.md` por video o semana, con la mini-sintesis del tema y el prompt dentro del mismo archivo.
