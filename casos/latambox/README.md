# LatamBox — 12 Documentos del Ecosistema
## Caso Integrador · ADM18 · Semanas 1-13

**Empresa ficticia:** LatamBox S.A.S. — Casillero virtual Colombia-USA
**Uso:** Actividades formativas semanales (no calificables directamente, construyen competencia para los parciales)

| # | Documento | Tipo | Semana | Clase documental |
|---|-----------|------|:------:|------------------|
| 1 | `01_correo_bienvenida.md` | Correo electrónico | 1 | Comunicación externa |
| 2 | `02_formulario_registro.md` | Formulario | 1 | Soporte operativo |
| 3 | `03_factura_amazon.md` | Factura comercial | 1 | Soporte de valor |
| 4 | `04_notificacion_llegada.md` | Correo electrónico | 2 | Comunicación operativa |
| 5 | `05_declaracion_valor.md` | Declaración aduanera | 2 | Soporte legal |
| 6 | `06_guia_aerea_awb.md` (crisis) · `06_guia_aerea_awb_feb.md` (normal) | Guía aérea (AWB) | **7** / 3 | Soporte operativo |
| 7 | `07_factura_flete.md` (crisis) · `07_factura_flete_feb.md` (normal) | Factura de servicio | **7** / 3 | Soporte financiero |
| 8 | `08_correo_nacionalizacion.md` (crisis) · `08_correo_nacionalizacion_feb.md` (normal) | Correo electrónico | **7** / 3 | Comunicación / soporte legal |
| 9 | `09_comprobante_impuestos.md` | Comprobante DIAN | 3 | Soporte financiero |
| 10 | `10_guia_entrega_local.md` | Guía de entrega (POD) | 2 | Soporte operativo |
| 11 | `11_correo_confirmacion_entrega.md` | Correo electrónico | 2 | Comunicación externa |
| 12 | `12_encuesta_y_queja.md` | Encuesta + Queja | 8 | Decisión / mejora |

## Variantes de los documentos 06, 07 y 08

Estos tres documentos existen en **dos versiones** porque las semanas 2–4 usan el **flujo normal de
febrero** y la semana 7 (y 6/8/11/13) usan la **crisis FL-2847 de mayo**:

| Versión | Archivos | Episodio | Semanas |
|---------|----------|----------|---------|
| Normal (febrero) | `*_feb.pdf` / `*_feb.md` | Envío individual `LBX-2026-00478` — operación normal | 2, 3 |
| Crisis (mayo) | `06_guia_aerea_awb`, `07_factura_flete`, `08_correo_nacionalizacion` (sin sufijo) | Consolidado `LBX-2026-FL2847` — 47 bultos, 12 clientes, vuelo cancelado | 6, 7, 8, 11, 12, 13 |

No renombrar los archivos sin sufijo: la semana 7 (simulación de reunión de emergencia) depende de ellos.

## Variantes de práctica GTC 185 (detección de errores)

Para las semanas que trabajan la GTC 185 como lista de verificación:

| Archivo | Uso | Contenido |
|---------|-----|-----------|
| `01_correo_bienvenida_errores.*` | Semana 4 | Correo con errores inyectados (sin membrete, sin fecha, sin firma, sin datos del casillero, tono informal) |
| `08_correo_nacionalizacion_errores.*` | Semanas 4 y 6 | Correo con errores inyectados (asunto vago, sin trazabilidad, un solo párrafo, tono acusatorio, mayúsculas, sin firma con cargo, datos erróneos) |
| `11_correo_confirmacion_entrega_errores.*` | Semana 4 | Correo con errores inyectados (sin asunto, sin fecha, sin datos de entrega, sin firma, tono seco) |
| `08_correo_nacionalizacion_mejorado.*` | Semana 6 | Versión corregida del doc 08 con la sección "Mejoras aplicadas frente a la versión con errores (GTC 185)" |

Las versiones `_errores` se renderizan en formato simple (pandoc, sin membrete) **a propósito**, para que
los defectos sean visibles; no "mejorarlas" con la plantilla institucional. Se regeneran con:

```bash
cd casos/latambox
for f in 01_correo_bienvenida_errores 08_correo_nacionalizacion_errores 11_correo_confirmacion_entrega_errores; do
  pandoc "$f.md" -o "$f.pdf" --pdf-engine=xelatex -V geometry:margin=2.5cm -V fontsize=11pt
done
```

`08_correo_nacionalizacion_mejorado` sí se genera con `_gen_documentos.py`.

**Formato:** Markdown (`.md`) editable + PDF con diseño institucional (banner LatamBox, secciones e
IDs resaltados). Los 12 documentos base y las 3 variantes `_feb` se regeneran con
`python3 casos/latambox/_gen_documentos.py` (requiere `reportlab`).
