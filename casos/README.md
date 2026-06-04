# Casos de Estudio — ADM18 · Procesamiento de la Información

## Índice General

| Carpeta | Empresa | Uso | Docs | Formatos | Semanas |
|---------|---------|-----|:----:|----------|:-------:|
| `latambox/` | LatamBox S.A.S. (Colombia-USA) | Formativo | 12 | .eml .docx .xlsx .pdf | 1-13 |
| `envios_pacifico/` | Envíos del Pacífico S.A.S. (Colombia-Asia) | **Parcial 1** | 6 | .eml .docx .xlsx .pdf | 5 |
| `andesbox/` | AndesBox S.A.S. (Colombia-Chile-Perú) | **Parcial 2** | 5 | .eml .docx .xlsx .pdf | 10 |
| `globalbox/` | GlobalBox Connect S.A. (Colombia-Panamá-México) | **Examen Final** | 8 | .eml .docx .xlsx .pdf | 14 |

**Total:** 31 documentos × 4 formatos cada uno = **124 archivos**

## Formatos por Tipo de Documento

| Formato | Cuándo se usa | Para qué | ¿Editables? |
|---------|--------------|----------|:----------:|
| **.eml** | Correos electrónicos | Abrir con cliente de correo (Outlook, Mail). Enseña el formato real de email profesional. | ✅ Sí |
| **.docx** | Formularios, cartas, circulares, actas, memos | Abrir con Word. Enseña formato de documento administrativo editable. | ✅ Sí |
| **.xlsx** | Facturas, reportes, cotizaciones, declaraciones | Abrir con Excel. Enseña hojas de cálculo con tablas y fórmulas. | ✅ Sí |
| **.pdf** | Todos los documentos | Impresión y distribución. Versión estática de referencia. | ❌ No |
| **.md** | Fuente original | Documentación para el docente y la IA. No se entrega a estudiantes. | ✅ Sí |

## Cómo Usar Estos Documentos

1. **LatamBox:** Entregar progresivamente durante semanas 1-9 como material de clase.
2. **Envíos del Pacífico:** Entregar el día del Parcial 1 (Semana 5). Los 6 documentos.
3. **AndesBox:** Entregar el día del Parcial 2 (Semana 10). Los 5 documentos.
4. **GlobalBox Connect:** Entregar el día del Examen Final (Semana 14). Los 8 documentos.

## Regenerar Archivos

```bash
cd casos/
python3 _convertir_formatos.py    # regenera .eml, .docx, .xlsx desde .md
```

---

*ADM18 — Procesamiento de la Información en la Organización · IUB/Unibarranquilla · 2026*
