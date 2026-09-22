# -*- coding: utf-8 -*-
"""Regenera los 12 documentos LatamBox (md + pdf). Uso:  python3 casos/latambox/_gen_documentos.py  (escribe en esta carpeta).\nRequiere: reportlab."""
# -*- coding: utf-8 -*-
"""
Generador de los 12 documentos del caso LatamBox (ADM18) en la plantilla
profesional LatamBox. Emite .pdf (entregable) y .md (fuente) por documento.

Diseño: banner navy full-bleed + línea "EXPEDIENTE DIDÁCTICO / ref" + secciones
con barra gris, filas etiqueta/valor, IDs resaltados y código de barras (AWB).
"""
import os, html
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, Flowable, KeepTogether)
from reportlab.graphics.barcode import code128

OUT = os.environ.get("OUTDIR", "/Users/diegodomingueztapia/Developer/github/dfdomin/adm18-material/casos/latambox")

W, H = A4
NAVY   = HexColor('#1B2A4A')
GOLD   = HexColor('#D4A017')
SECTBG = HexColor('#EDF0F4')
LINE   = HexColor('#D8DEE7')
TXT    = HexColor('#1F2933')
MUTED  = HexColor('#6B7280')
HL_B   = HexColor('#DCE7F7')   # azul
HL_G   = HexColor('#DCEFE0')   # verde
HL_L   = HexColor('#E7DEF7')   # lavanda
BANNER_H = 116

MARGIN = 42

def esc(t):
    return html.escape(str(t), quote=False)

def hl(text, kind='b'):
    c = {'b': '#DCE7F7', 'g': '#DCEFE0', 'l': '#E7DEF7'}[kind]
    return f'<font backColor="{c}">{esc(text)}</font>'

# ── estilos ───────────────────────────────────────────────────────────────
st_body  = ParagraphStyle('body', fontName='Helvetica', fontSize=8.8, leading=12.4, textColor=TXT)
st_bodyi = ParagraphStyle('bodyi', parent=st_body, fontName='Helvetica-Oblique', textColor=MUTED, fontSize=8.2)
st_label = ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=8.6, leading=11.6, textColor=NAVY)
st_value = ParagraphStyle('value', fontName='Helvetica', fontSize=8.6, leading=11.8, textColor=TXT)
st_th    = ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.4, leading=11, textColor=NAVY)
st_td    = ParagraphStyle('td', fontName='Helvetica', fontSize=8.4, leading=11, textColor=TXT)
st_note  = ParagraphStyle('note', fontName='Helvetica-Oblique', fontSize=7.4, leading=10, textColor=MUTED)
st_sig   = ParagraphStyle('sig', fontName='Helvetica', fontSize=8.6, leading=12, textColor=TXT)

class Bar(Flowable):
    def __init__(self, text, width):
        Flowable.__init__(self); self.text = text; self.width = width; self.height = 17
    def wrap(self, aw, ah):
        self.width = aw; return (aw, self.height)
    def draw(self):
        c = self.canv
        c.setFillColor(SECTBG); c.rect(0, 0, self.width, self.height, fill=1, stroke=0)
        c.setFillColor(GOLD);   c.rect(0, 0, 2.4, self.height, fill=1, stroke=0)
        c.setFillColor(NAVY); c.setFont('Helvetica-Bold', 9.4)
        c.drawString(7, 5.1, self.text)

class Barcode(Flowable):
    def __init__(self, value):
        Flowable.__init__(self)
        self.bc = code128.Code128(value, barHeight=30, barWidth=0.8, humanReadable=False)
    def wrap(self, aw, ah):
        return (self.bc.width, self.bc.height + 4)
    def draw(self):
        self.bc.drawOn(self.canv, 0, 4)

def kv_table(rows, label_w=135):
    data = []
    for label, value in rows:
        data.append([Paragraph(label, st_label), Paragraph(str(value), st_value)])
    t = Table(data, colWidths=[label_w, W - 2*MARGIN - label_w])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-2), 0.4, LINE),
        ('LINEBELOW', (0,-1), (-1,-1), 0.4, LINE),
    ]))
    return t

def grid_table(header, rows, col_widths=None, bold_first=False):
    data = [[Paragraph(str(h), st_th) for h in header]]
    for r in rows:
        data.append([Paragraph(str(c), st_td) for c in r])
    total = W - 2*MARGIN
    if col_widths is None:
        col_widths = [total/len(header)]*len(header)
    else:
        s = sum(col_widths)
        col_widths = [total*c/s for c in col_widths]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.6),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('LINEBELOW', (0,0), (-1,-1), 0.4, LINE),
    ]
    if bold_first:
        style.append(('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'))
    t.setStyle(TableStyle(style))
    return t

# ── layout de página ──────────────────────────────────────────────────────
class Doc(BaseDocTemplate):
    def __init__(self, path, meta):
        BaseDocTemplate.__init__(self, path, pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN, topMargin=BANNER_H+34, bottomMargin=48,
            title=meta['title_full'], author='LatamBox S.A.S.', subject='Caso didáctico ADM18')
        self.meta = meta
        frame = Frame(MARGIN, 46, W-2*MARGIN, H-BANNER_H-34-46, id='f',
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=self._deco)])

    def _deco(self, canv, doc):
        m = self.meta
        canv.saveState()
        canv.setFillColor(NAVY)
        canv.rect(0, H-BANNER_H, W, BANNER_H, fill=1, stroke=0)
        canv.setFillColor(GOLD)
        canv.rect(0, H-BANNER_H-2.5, W, 2.5, fill=1, stroke=0)
        canv.setFillColor(HexColor('#FFFFFF'))
        canv.setFont('Helvetica-Bold', 25)
        canv.drawString(MARGIN, H-46, m['brand'])
        canv.setFont('Helvetica-Bold', 14.5)
        canv.setFillColor(HexColor('#FFE9A8'))
        canv.drawString(MARGIN, H-72, m['num'] + ' · ' + m['title'])
        canv.setFillColor(HexColor('#C9D4E6'))
        canv.setFont('Helvetica', 9)
        canv.drawString(MARGIN, H-92, m['subtitle'])
        # línea expediente
        canv.setFillColor(MUTED); canv.setFont('Helvetica', 7.6)
        canv.drawString(MARGIN, H-BANNER_H-16, m['ref'])
        canv.setFont('Helvetica-Bold', 8.2); canv.setFillColor(NAVY)
        canv.drawRightString(W-MARGIN, H-BANNER_H-16, m['date'])
        canv.setStrokeColor(LINE); canv.setLineWidth(0.5)
        canv.line(MARGIN, H-BANNER_H-22, W-MARGIN, H-BANNER_H-22)
        # footer
        canv.setStrokeColor(LINE); canv.line(MARGIN, 38, W-MARGIN, 38)
        canv.setFillColor(MUTED); canv.setFont('Helvetica-Oblique', 6.6)
        canv.drawString(MARGIN, 29, 'Recreación didáctica del caso LatamBox. Datos adaptados; no es un documento comercial válido.')
        canv.setFont('Helvetica', 6.6)
        canv.drawRightString(W-MARGIN, 29, 'ADM18 · Procesamiento de la Información · IUB/Unibarranquilla 2026')
        canv.restoreState()

def build(d, meta):
    story = []
    for b in d:
        k = b[0]
        if k == 'section':
            story.append(Spacer(1, 7)); story.append(Bar(b[1], W-2*MARGIN))
            story.append(Spacer(1, 3)); story.append(kv_table(b[2]))
        elif k == 'table':
            story.append(Spacer(1, 7)); story.append(Bar(b[1], W-2*MARGIN))
            story.append(Spacer(1, 3)); story.append(grid_table(b[2], b[3], b[4] if len(b) > 4 else None))
        elif k == 'para':
            story.append(Spacer(1, 5)); story.append(Paragraph(b[1], st_body))
        elif k == 'note':
            story.append(Spacer(1, 4)); story.append(Paragraph(b[1], st_note))
        elif k == 'barcode':
            story.append(Spacer(1, 6)); story.append(Barcode(b[1]))
        elif k == 'sig':
            story.append(Spacer(1, 8))
            story.append(Paragraph('<b>' + esc(b[1][0]) + '</b>', st_sig))
            for line in b[1][1:]:
                story.append(Paragraph(esc(line), ParagraphStyle('x', parent=st_sig, fontSize=8, textColor=MUTED)))
        elif k == 'pagebreak':
            from reportlab.platypus import PageBreak
            story.append(PageBreak())
    Doc(os.path.join(OUT, meta['file'] + '.pdf'), meta).build(story)

def to_md(d):
    out = []
    for b in d:
        k = b[0]
        if k == 'section':
            out.append('### ' + b[1] + '\n')
            out.append('| Campo | Valor |')
            out.append('|-------|-------|')
            for a, c in b[2]:
                c = str(c).replace('\n', ' ')
                c = c.replace('<b>', '**').replace('</b>', '**')
                for s in ['<font backColor="#DCE7F7">', '<font backColor="#DCEFE0">', '<font backColor="#E7DEF7">', '</font>', '<u>', '</u>']:
                    c = c.replace(s, '')
                out.append(f'| {a} | {c} |')
            out.append('')
        elif k == 'table':
            out.append('### ' + b[1] + '\n')
            out.append('| ' + ' | '.join(str(x) for x in b[2]) + ' |')
            out.append('|' + '|'.join(['---']*len(b[2])) + '|')
            for r in b[3]:
                out.append('| ' + ' | '.join(str(x) for x in r) + ' |')
            out.append('')
        elif k == 'para':
            out.append(b[1] + '\n')
        elif k == 'note':
            out.append('*' + b[1] + '*\n')
        elif k == 'barcode':
            out.append('`[Código de barras: ' + b[1] + ']`\n')
        elif k == 'sig':
            out.append('\n'.join(['**' + b[1][0] + '**'] + list(b[1][1:])) + '\n')
    return '\n'.join(out)


# ── contenido ─────────────────────────────────────
# -*- coding: utf-8 -*-
"""Contenido corregido de los 12 documentos LatamBox + emisión md/pdf."""

DOCS = []

def meta(file, num, title, subtitle, ref, date, brand='LatamBox'):
    return dict(file=file, num=num, title=title, subtitle=subtitle, ref=ref, date=date,
                brand=brand, title_full=num + ' · ' + title + ' — LatamBox')

# ══════════════════════════════════════════════════════════════════════════
# 01 — Correo de bienvenida
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Encabezado del mensaje',[
   ('De','Carolina Méndez — Coordinadora de Atención al Cliente · servicio@latambox.com'),
   ('Para','[Nombre del cliente]'),
   ('Asunto','¡Bienvenido a LatamBox! Tu casillero virtual está activo'),
   ('Fecha','3 de febrero de 2026'),
 ]),
 ('para','Estimado/a [Nombre]:'),
 ('para','Gracias por elegir LatamBox. Tu casillero virtual en Miami, Florida, ya está activo y listo para recibir tus compras en Estados Unidos.'),
 ('table','Tus datos de casillero',['Campo','Valor'],[
   ['Dirección en USA','7850 NW 25th Street, Suite [Número de casillero]'],
   ['Ciudad / Estado / ZIP','Miami, FL 33122'],
   ['Teléfono de recepción','+1 (305) 555-01[Número]'],
   ['Código de cliente','LBX-[Número]'],
 ], None),
 ('table','¿Cómo funciona?',['Paso','Descripción'],[
   ['1. Compra','Compra en cualquier tienda de USA (Amazon, eBay, Walmart, etc.) y usa tu dirección de Miami como dirección de envío.'],
   ['2. Notificación','Cuando tu paquete llegue a nuestra bodega, recibirás un correo con fotos y peso.'],
   ['3. Vuelo','Todos los viernes despachamos vuelo a Colombia. Tu paquete viaja asegurado.'],
   ['4. Nacionalización','Gestionamos los trámites aduaneros por ti.'],
   ['5. Entrega','Recibes tu paquete en la puerta de tu casa en Colombia.'],
 ], [0.8,3]),
 ('table','Tarifas 2026',['Servicio','Valor'],[
   ['Afiliación anual','$0 (gratis)'],
   ['Recepción por paquete','USD $3.00'],
   ['Envío aéreo (por libra)','USD $2.50'],
   ['Nacionalización (por paquete)','USD $8.00'],
   ['Entrega local en Colombia','COP $12.000'],
   ['Seguro (opcional, 1% del valor declarado)','1%'],
 ], [2,1]),
 ('section','Próximos pasos',[
   ('Paso 1','Completa y firma el formulario de registro adjunto (documento 02). Verifica que todos tus datos estén correctos.'),
   ('Paso 2','Descarga nuestra app en latambox.com/app para seguir tus envíos.'),
   ('Paso 3','Guarda este correo: contiene tu número de casillero, que deberás usar en cada compra.'),
 ]),
 ('para','Si tienes dudas, responde a este correo o escríbenos por WhatsApp al +57 300 555 0123.'),
 ('sig',['Carolina Méndez','Coordinadora de Atención al Cliente','LatamBox S.A.S.','servicio@latambox.com']),
], meta('01_correo_bienvenida','01','CORREO DE BIENVENIDA','Registro y activación del casillero virtual','FR-REG-001','2026-02-03')))

# ══════════════════════════════════════════════════════════════════════════
# 02 — Formulario de registro
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('table','Datos personales',['Campo','Valor'],[
   ['Nombres completos',''],['Apellidos completos',''],
   ['Tipo de documento','CC [ ]   CE [ ]   Pasaporte [ ]'],
   ['Número de documento',''],['Fecha de nacimiento',''],['Nacionalidad',''],
 ], [2,3]),
 ('table','Datos de contacto',['Campo','Valor'],[
   ['Correo electrónico',''],['Teléfono celular',''],['Teléfono fijo (opcional)',''],
   ['Dirección de entrega en Colombia',''],['Ciudad',''],['Departamento',''],
 ], [2,3]),
 ('table','Datos del casillero',['Campo','Valor'],[
   ['¿Ha usado casillero virtual antes?','Sí [ ]   No [ ]'],
   ['¿Cómo conoció LatamBox?','Recomendación [ ]   Redes sociales [ ]   Google [ ]   Otro: ______'],
   ['Tipo de productos que planea traer','Tecnología [ ]   Ropa [ ]   Hogar [ ]   Salud [ ]   Otro: ______'],
 ], [2,3]),
 ('section','Autorización de tratamiento de datos',[
   ('[ ]','Autorizo a LatamBox S.A.S. el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013, con la finalidad exclusiva de prestar el servicio de casillero virtual, gestionar envíos, realizar cobros y enviar comunicaciones relacionadas con el servicio. Conozco que puedo ejercer mis derechos de acceso, corrección, supresión y revocatoria escribiendo a protecciondedatos@latambox.com.'),
   ('[ ]','Acepto los Términos y Condiciones del servicio, disponibles en www.latambox.com/terminos.'),
 ]),
 ('section','Firma y uso interno',[
   ('Firma del cliente','________________________________________'),
   ('Fecha','___ / ___ / 2026'),
 ]),
 ('table','Uso interno — No diligenciar',['Campo','Valor'],[
   ['Código de cliente asignado','LBX-______'],
   ['Número de casillero (Suite)','Suite ______'],
   ['Fecha de activación','___ / ___ / 2026'],
   ['Verificado por',''],
 ], [2,3]),
], meta('02_formulario_registro','02','FORMULARIO DE REGISTRO DE CLIENTE','Vinculación y control documental del cliente','FR-REG-001 · v3.2','2026-01-01')))

# ══════════════════════════════════════════════════════════════════════════
# 03 — Factura de Amazon
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Emisor y destino',[
   ('Vendido por','Amazon.com Services LLC · 410 Terry Avenue North, Seattle, WA 98109-5210, USA'),
   ('Enviar a','[Nombre del cliente] c/o LatamBox — Suite [Número] · 7850 NW 25th Street, Miami, FL 33122, USA'),
   ('Pedido','114-8395627-0123456'),
   ('Fecha de factura','5 de febrero de 2026'),
   ('Método de pago','Visa terminada en 4592 · Pagado el 5 de febrero de 2026'),
 ]),
 ('table','Productos',['#','Descripción','Cant.','Precio unit.','Total'],[
   ['1','Apple AirPods Pro (2.ª generación) — audífonos inalámbricos','1','USD $249.99','USD $249.99'],
   ['2','Anker cargador USB-C 65 W — cargador rápido compacto','1','USD $35.99','USD $35.99'],
   ['3','Kindle Paperwhite (16 GB) — lector electrónico','1','USD $149.99','USD $149.99'],
 ], [0.4,4,0.7,1.3,1.3]),
 ('table','Resumen del pedido',['Concepto','Valor'],[
   ['Subtotal (3 artículos)','USD $435.97'],
   ['Envío y manejo','USD $0.00 (Prime)'],
   ['Impuesto de Florida (7%)','USD $30.52'],
   ['TOTAL PAGADO','USD $466.49'],
 ], [3,1]),
 ('table','Entrega',['Campo','Valor'],[
   ['Entrega estimada','8 de febrero de 2026'],
   ['Guía de rastreo (UPS)','1Z999AA10123456784'],
 ], [2,3]),
 ('para','<b>Nota para el cliente:</b> esta factura será requerida por la DIAN para la nacionalización y el cálculo de los impuestos de importación en Colombia. Consérvela. El valor declarado en aduana corresponde al subtotal de USD $435.97 (no incluye el impuesto de Florida). LatamBox usará esta factura como soporte de la Declaración de Valor ante la DIAN.'),
], meta('03_factura_amazon','03','FACTURA COMERCIAL DE AMAZON','Soporte de compra del cliente','PEDIDO 114-8395627-0123456','2026-02-05')))

# ══════════════════════════════════════════════════════════════════════════
# 04 — Notificación de llegada a bodega Miami
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Encabezado del mensaje',[
   ('De','Equipo de Operaciones — Miami · operaciones@latambox.com'),
   ('Para','[Nombre del cliente] — LBX-1029'),
   ('Asunto','Tu paquete llegó a Miami — seguimiento LBX-2026-00478'),
   ('Fecha','9 de febrero de 2026, 10:34 a. m.'),
 ]),
 ('para','Hola [Nombre]: tu paquete fue recibido en nuestra bodega de Miami, Florida.'),
 ('table','Detalles de la recepción',['Campo','Valor'],[
   ('Seguimiento LatamBox','LBX-2026-00478'),
   ('Seguimiento UPS original','1Z999AA10123456784'),
   ('Fecha de recepción','9 de febrero de 2026, 10:34 a. m.'),
   ('Recibido por','José Martínez — Operador de Bodega'),
   ('Peso registrado','2.3 lb (1.04 kg)'),
   ('Dimensiones','12" x 8" x 4"'),
   ('Contenido declarado','Electrónicos: AirPods, cargador, Kindle'),
   ('Valor declarado (factura)','USD $435.97'),
   ('Estado','Recibido — en espera de vuelo'),
   ('Condición del empaque','Buen estado — sin signos de daño'),
   ('Foto de recepción','Adjunta: img_20260209_1034.jpg'),
 ]),
 ('section','Próximos pasos',[
   ('1','Tu paquete será consolidado con otros envíos para el vuelo del viernes 13 de febrero de 2026.'),
   ('2','Recibirás otro correo cuando el paquete esté en vuelo hacia Colombia.'),
   ('3','La nacionalización toma entre 2 y 4 días hábiles después del arribo.'),
 ]),
 ('section','¿Necesitas algo?',[
   ('Corrección de valor','Si el valor declarado no coincide con tu factura, responde a este correo antes del jueves 12 de febrero.'),
   ('Seguro','Si deseas asegurar tu paquete (1% del valor = USD $4.36), confírmanos antes del jueves.'),
 ]),
 ('sig',['Equipo de Operaciones — Miami','LatamBox S.A.S.','operaciones@latambox.com']),
], meta('04_notificacion_llegada','04','NOTIFICACIÓN DE LLEGADA A BODEGA','Recepción en bodega Miami — aviso al cliente','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-09')))

# ══════════════════════════════════════════════════════════════════════════
# 05 — Declaración de valor
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Identificación de la declaración',[
   ('Referencia del ejercicio','DV-2026-00478'),
   ('Declarante','Carlos Andrés Martínez'),
   ('ID de cliente','<font backColor="#DCE7F7">LBX-1029</font>'),
   ('Envío LatamBox','<font backColor="#DCEFE0">LBX-2026-00478</font>'),
 ]),
 ('section','Compra que soporta el valor',[
   ('Proveedor','Amazon'),
   ('Pedido / soporte','114-8395627-0123456 (factura del documento 03)'),
   ('Mercancía','AirPods Pro 2, cargador Anker USB-C 65 W y Kindle Paperwhite 16 GB'),
   ('Uso declarado','Personal'),
 ]),
 ('table','Componente de valoración',['Concepto','Moneda','Valor'],[
   ['Mercancía / FOB','USD','435.97'],
   ['Flete para valoración (2.3 lb x USD $2.50)','USD','5.75'],
   ['Seguro (1% del valor declarado)','USD','4.36'],
   ['TOTAL CIF','USD','446.08'],
 ], [3,1,1]),
 ('table','Clasificación arancelaria',['Producto','Subpartida','Gravamen'],[
   ['AirPods Pro','8518.30.00.00','0% (TLC Colombia–EE. UU.)'],
   ['Cargador USB-C','8504.40.90.00','0% (TLC)'],
   ['Kindle Paperwhite','8543.70.99.00','0% (TLC)'],
 ], [2,1.4,2]),
 ('note','Todos los productos aplican al 0% de arancel bajo el TLC Colombia–EE. UU.; solo se liquida IVA del 19% sobre el valor CIF. La clasificación y la liquidación tributaria deben revisarse con sus soportes.'),
 ('section','Declaración del importador',[
   ('Texto','Declaro, para este ejercicio, que los valores corresponden al soporte de compra identificado. Autorizo la gestión documental del envío y la presentación de los soportes de valoración.'),
   ('Firma del declarante','________________________________________'),
   ('Fecha','12 de febrero de 2026'),
 ]),
], meta('05_declaracion_valor','05','DECLARACIÓN DE VALOR','Soporte de valoración — mercancía de compra por internet','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-12')))

# ══════════════════════════════════════════════════════════════════════════
# 06 — Guía aérea (AWB) — crisis FL-2847
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('note','Consolidado de mayo: esta guía corresponde al vuelo FL-2847, cancelado por tormenta tropical. Es el insumo de la simulación de la semana 7.'),
 ('section','Identificación del transporte',[
   ('AWB maestro','<font backColor="#E7DEF7">420-88472109</font>'),
   ('Guías hijas (House)','HWB-2847-001 a HWB-2847-047'),
   ('Consolidado','LBX-2026-FL2847 (47 bultos · 12 clientes)'),
   ('Aerolínea','Avianca Cargo (AV)'),
   ('Vuelo','FL-2847 — CANCELADO por condiciones meteorológicas'),
   ('Ruta','Miami (MIA) - Barranquilla (BAQ) — Aeropuerto Ernesto Cortissoz'),
   ('Fecha programada','28 de mayo de 2026 · salida 14:00 EST / llegada 17:30 COT'),
   ('Estado actual','RETENIDO EN BODEGA MIA — 47 bultos sin reasignación de vuelo'),
 ]),
 ('section','Expedidor y destinatario',[
   ('Shipper / expedidor','LatamBox S.A.S. — Miami Warehouse · 7850 NW 25th Street, Suite 100, Miami, FL 33122 · José Martínez · +1 (305) 555-0100'),
   ('Consignee / destinatario','LatamBox S.A.S. — Oficina Colombia · Carrera 51B #82-254, Bodega 12, Parque Industrial, Barranquilla, Atlántico · Diego Ramírez · +57 310 555 0300'),
 ]),
 ('table','Detalles del envío consolidado',['Concepto','Valor'],[
   ['Naturaleza de la mercancía','Electrónicos de consumo, accesorios y ropa — no peligrosos'],
   ['Número de bultos','47 paquetes individuales (12 clientes)'],
   ['Peso bruto total','128.7 lb (58.4 kg)'],
   ['Peso volumen total','142.3 lb'],
   ['Peso tasable total','142.3 lb'],
   ['Tarifa por libra','USD $2.80'],
   ['Total flete contratado','USD $398.44'],
   ['Valor declarado total para transporte','USD $18,246.08'],
   ['Seguro de carga','USD $182.47 (incluido)'],
 ], [2,3]),
 ('table','Desglose por cliente (guías hijas)',['HWB','Cliente','Bultos','Peso (lb)','Valor declarado','Destino'],[
   ['001','LBX-1301 — María González','4','10.2','$446.08','Barranquilla'],
   ['002','LBX-1045 — Carlos Fuentes','3','8.7','$1,250.00','Barranquilla'],
   ['003','LBX-1078 — Ana Martínez (corporativo)','6','18.3','$3,840.00','Santa Marta'],
   ['004','LBX-1102 — Pedro Vargas','5','14.1','$920.00','Barranquilla'],
   ['005','LBX-1121 — Lucía Torres (corporativo)','5','15.6','$4,100.00','Cartagena'],
   ['006','LBX-1156 — Jorge Rincón','3','9.4','$780.00','Barranquilla'],
   ['007','LBX-1189 — Sandra Mejía','4','11.8','$640.00','Barranquilla'],
   ['008','LBX-1200 — TechImports S.A.S. (corporativo)','8','21.5','$5,200.00','Barranquilla'],
   ['009','LBX-1215 — Felipe Duarte','2','5.1','$320.00','Soledad'],
   ['010','LBX-1230 — Diana Ospina','3','7.3','$410.00','Barranquilla'],
   ['011','LBX-1248 — Roberto Ávila','2','3.8','$195.50','Puerto Colombia'],
   ['012','LBX-1270 — Natalia Cárdenas','2','2.9','$144.50','Barranquilla'],
   ['—','TOTAL (12 clientes)','47','128.7','$18,246.08','—'],
 ], [0.5,3,0.7,0.9,1.2,1.2]),
 ('section','Instrucciones de manejo',[
   ('[x]','Mantener temperatura ambiente (15 °C – 25 °C).'),
   ('[x]','No apilar más de 3 niveles.'),
   ('[x]','URGENTE: 3 clientes corporativos (003, 005, 008) requieren prioridad de entrega. Facturan $24,000 al año en conjunto.'),
   ('[ ]','Cadena de frío y material peligroso: no aplica.'),
 ]),
 ('table','Cargos',['Concepto','Monto (USD)','Pagado por'],[
   ['Flete aéreo (142.3 lb x $2.80)','$398.44','LatamBox (se cobra a clientes)'],
   ['Recargo por combustible (15%)','$59.77','LatamBox'],
   ['Tarifa de seguridad consolidada','$18.00','LatamBox'],
   ['Handling — origen (MIA, 47 x $1.00)','$47.00','LatamBox'],
   ['Total cargos contratados','$523.21','—'],
   ['Bodegaje MIA — acumulado 3 días ($120/día desde el 28 de mayo)','$360.00','NO PRESUPUESTADO'],
 ], [3,1,2]),
 ('section','Notas operativas urgentes',[
   ('28 mayo, 10:30','Avianca Cargo notifica la cancelación del FL-2847 por tormenta tropical en el Caribe.'),
   ('28 mayo, 11:00','47 bultos permanecen en bodega MIA. No se ha confirmado vuelo alternativo.'),
   ('28 mayo, 14:00','12 clientes notificados del retraso por correo automático. 8 han respondido exigiendo información.'),
   ('Contingencia','(a) esperar reprogramación de Avianca (48–72 h); (b) vuelo alternativo con Copa Airlines vía Panamá (USD $4,800); (c) fraccionar el envío: prioritarios por vuelo alternativo y el resto por ruta normal.'),
 ]),
 ('barcode','42088472109'),
 ('sig',['Firma del expedidor: José Martínez — 28/05/2026','Firma del transportista: Avianca Cargo — 28/05/2026 (vuelo cancelado, pendiente reprogramación)']),
], meta('06_guia_aerea_awb','06','GUÍA AÉREA CONSOLIDADA (AWB)','Air waybill — referencias del transporte · vuelo FL-2847','EXPEDIENTE DIDÁCTICO / FL-2847','2026-05-28','LatamBox Cargo')))

# ══════════════════════════════════════════════════════════════════════════
# 07 — Factura de flete — crisis
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Datos de facturación',[
   ('Emisor','LatamBox S.A.S. · NIT 901.234.567-8'),
   ('Factura','F-2026-05287 · Resolución DIAN 18764029876543 del 15/01/2026'),
   ('Consolidado','47 paquetes · 12 clientes'),
   ('Tracking maestro','LBX-2026-FL2847'),
   ('Fecha de emisión preliminar','28 de mayo de 2026'),
   ('Vuelo contratado','FL-2847 — AV (CANCELADO)'),
   ('Ruta','Miami (MIA) - Barranquilla (BAQ) — Aeropuerto Ernesto Cortissoz'),
 ]),
 ('table','Servicios contratados',['Código','Descripción','Cant.','Unidad','V. unit.','V. total'],[
   ['REC-01','Recepción en bodega Miami','47','Paquete','$3.00','$141.00'],
   ['FLT-01','Flete aéreo MIA-BAQ','142.3','Libra','$2.80','$398.44'],
   ['FSC-01','Recargo por combustible (15%)','1','Cargo','$59.77','$59.77'],
   ['HND-01','Handling — origen (MIA)','47','Paquete','$1.00','$47.00'],
   ['SEC-01','Tarifa de seguridad','1','Cargo','$18.00','$18.00'],
   ['NAC-01','Nacionalización — trámite DIAN (12 declaraciones)','12','Trámite','$8.00','$96.00'],
   ['SEG-01','Seguro de carga (1% del valor declarado)','1','Cargo','$182.47','$182.47'],
   ['—','Total servicios contratados','—','—','—','$942.68'],
 ], [0.8,3,0.7,0.9,1,1]),
 ('table','Sobrecostos por contingencia (no presupuestados)',['Código','Descripción','Cant.','Unidad','V. unit.','V. total'],[
   ['BOD-01','Bodegaje MIA — día 1 (28 mayo)','47','Paquete','$2.55','$119.85'],
   ['BOD-02','Bodegaje MIA — día 2 (29 mayo)','47','Paquete','$2.55','$119.85'],
   ['BOD-03','Bodegaje MIA — día 3 (30 mayo)','47','Paquete','$2.55','$119.85'],
   ['BOD-P','Bodegaje proyectado día 4+ (si no hay vuelo)','47/día','Paquete/día','$2.55','$119.85/día'],
 ], [0.8,3,0.7,0.9,1,1]),
 ('table','Opciones de vuelo alternativo (cotizadas el 28 de mayo, 10:45 a. m.)',['Op.','Aerolínea','Ruta','Costo adicional','Tiempo estimado','Riesgo'],[
   ['A','Esperar Avianca','MIA-BAQ','USD $0.00','48–72 horas','Alto — sin fecha confirmada'],
   ['B','Copa Airlines','MIA-PTY-BAQ','USD $4,800.00','Entrega 29 mayo','Bajo — cupo confirmado'],
   ['C','Fraccionado','20 prioritarios (Copa) + 27 esperan Avianca','USD $2,200.00','Mixto','Medio — clientes no prioritarios molestos'],
 ], [0.6,1.5,2,1.2,1.2,1.8]),
 ('table','Resumen financiero',['Concepto','USD','COP (TRM $4,105)'],[
   ['Servicios contratados','$942.68','$3,869,701'],
   ['Sobrecostos acumulados (3 días de bodegaje)','$359.55','$1,475,953'],
   ['Opción B — vuelo alternativo Copa (si se aprueba)','$4,800.00','$19,704,000'],
   ['Costo total proyectado (con Opción B)','$6,102.23','$25,049,654'],
   ['IVA (19%)','$1,159.42','$4,759,419'],
   ['GRAN TOTAL ESTIMADO (Opción B)','≈ $7,261.65','≈ $29,809,073'],
 ], [3,1,1.3]),
 ('table','Impacto por cliente (clientes corporativos en riesgo)',['Cliente','Paq.','Valor declarado','Facturación anual','Riesgo'],[
   ['003 — Ana Martínez','6','$3,840','$8,000/año','ALTO'],
   ['005 — Lucía Torres','5','$4,100','$8,000/año','ALTO'],
   ['008 — TechImports S.A.S.','8','$5,200','$8,000/año','ALTO'],
   ['TOTAL 3 corporativos','19','$13,140','$24,000/año','—'],
 ], [2,0.6,1.1,1.2,0.8]),
 ('note','Análisis costo-beneficio: el costo del vuelo alternativo (Opción B: $4,800) es cinco veces menor que la pérdida anual potencial de los tres clientes corporativos ($24,000). Incluso si solo uno se retira, el costo de la inacción supera el costo de la solución.'),
 ('section','Instrucciones de pago',[
   ('Transferencia','Bancolombia, cuenta corriente #123-456789-01 a nombre de LatamBox S.A.S.'),
   ('PSE','www.latambox.com/pagar'),
   ('Aprobación urgente','María Vargas (Financiero) debe autorizar el gasto extraordinario antes de las 4:00 p. m. del 28 de mayo.'),
 ]),
 ('section','Observaciones urgentes',[
   ('Costo creciente','El bodegaje se acumula a $119.85 por día. Cada día sin decisión cuesta.'),
   ('Cupo','La Opción B (Copa Airlines) tiene cupo garantizado solo hasta las 2:00 p. m. del 28 de mayo.'),
   ('Riesgo estructural','Los tres clientes corporativos representan el 40% de la facturación de LatamBox.'),
   ('Acción de Operaciones','Diego Ramírez debe confirmar la disponibilidad de cupo con Copa Airlines.'),
 ]),
], meta('07_factura_flete','07','FACTURA DE FLETE','Servicios logísticos internacionales — contingencia FL-2847','EXPEDIENTE DIDÁCTICO / FL-2847','2026-05-28')))

# ══════════════════════════════════════════════════════════════════════════
# 08 — Correo de nacionalización (alerta DIAN) — crisis
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Encabezado del mensaje',[
   ('De','Diana Ramírez — Analista de Comercio Exterior · comercioexterior@latambox.com'),
   ('Para','Diego Ramírez (Jefe de Operaciones)'),
   ('Copia','Carlos Mendoza (Gerente General); Lucía Fuentes (Atención al Cliente); María Vargas (Financiero)'),
   ('Asunto','URGENTE — Bloqueo en nacionalización: 3 declaraciones rechazadas, 47 paquetes retenidos (FL-2847)'),
   ('Fecha','28 de mayo de 2026, 9:15 a. m.'),
 ]),
 ('para','Diego: te escribo con carácter urgente. La situación con el vuelo FL-2847 es más grave de lo estimado. El problema no es solo la cancelación del vuelo por tormenta: <b>tenemos tres declaraciones de valor rechazadas por la DIAN</b> y esto está bloqueando todo el trámite de los 47 paquetes.'),
 ('table','Estado del trámite aduanero (28 de mayo, 9:00 a. m.)',['Etapa','Estado','Fecha','Responsable'],[
   ['Recepción en depósito aduanero','Completado','27 mayo','Agente aduanero'],
   ['Verificación documental preliminar','Con observaciones','28 mayo','DIAN — Ernesto Cortissoz'],
   ['Liquidación de tributos','BLOQUEADA','—','3 declaraciones rechazadas'],
   ['Pago de impuestos','Pendiente','—','—'],
   ['Levante / autorización de salida','Pendiente','—','—'],
 ], [2.4,1.5,0.9,1.6]),
 ('table','Declaraciones de valor rechazadas',['#','HWB','Cliente','Valor declarado','Error detectado'],[
   ['1','003','Ana Martínez','$3,840.00','Valor declarado $2,100 inferior a la factura real ($5,940). La DIAN exige rectificación.'],
   ['2','005','Lucía Torres','$4,100.00','Partida arancelaria incorrecta: declarado como electrónicos de consumo (8517.12) cuando la factura indica equipos de telecomunicación (8517.62).'],
   ['3','008','TechImports S.A.S.','$5,200.00','La factura comercial no coincide con la guía aérea: el AWB declara 8 bultos y la factura detalla 11 ítems en 8 cajas. La DIAN pide desglose por ítem.'],
 ], [0.4,0.7,1.4,1.2,4]),
 ('table','Otras inconsistencias detectadas',['Documento','Inconsistencia','Impacto'],[
   ['AWB 420-88472109','Declara 47 bultos consolidados, pero no todas las guías hijas son verificables por separado.','La DIAN puede exigirlas una a una: demora adicional de 24–48 h.'],
   ['Factura de flete F-2026-05287','No desglosa la nacionalización por cliente; solo un monto consolidado de $96.00.','La DIAN puede pedir facturación individualizada por declaración.'],
   ['5 de 12 declaraciones','La TRM usada ($4,020) no coincide con la TRM del día de la declaración ($4,105).','Diferencia acumulada de ≈ USD $18 en impuestos; puede generar ajuste.'],
 ], [1.4,3,2.4]),
 ('table','Impacto acumulado',['Concepto','Cantidad'],[
   ['Paquetes totales retenidos','47'],
   ['Clientes afectados directamente','12'],
   ['Declaraciones rechazadas (críticas)','3'],
   ['Clientes corporativos en riesgo (facturación $24,000/año)','3'],
   ['Demora adicional estimada por los rechazos','3–5 días hábiles'],
   ['Llamadas de queja recibidas hasta las 9 a. m.','12'],
   ['Correos de reclamo formal','8 (4 verbales + 4 escritos)'],
 ], [4,1.2]),
 ('section','Muestra de quejas recibidas',[
   ('Ana Martínez','"Llevo tres días sin información sobre mi paquete. Pedí un monitor para mi empresa y tengo al equipo detenido. Si no me dan una fecha cierta hoy, cancelo mi cuenta corporativa."'),
   ('TechImports S.A.S.','"Somos clientes desde hace 18 meses. Es la tercera vez en seis meses que un envío se retrasa por problemas documentales. Exijo una reunión con gerencia."'),
 ]),
 ('section','Próximos pasos urgentes (requieren acción hoy)',[
   ('Operaciones — Diego Ramírez','Rectificar las tres declaraciones de valor rechazadas. Necesita las facturas originales (Amazon, Best Buy y Newegg). Tiempo estimado: 4–6 horas.'),
   ('Atención al Cliente — Lucía Fuentes','Contactar a los 12 clientes afectados antes de las 5:00 p. m. con un mensaje unificado. Priorizar a los corporativos (003, 005, 008). No prometer fechas que no se puedan cumplir.'),
   ('Financiero — María Vargas','Revisar el impacto de los ajustes de TRM y de la posible retención adicional por partida arancelaria incorrecta.'),
   ('Gerencia — Carlos Mendoza','Convocar reunión de emergencia: ¿esperamos la reprogramación de Avianca o contratamos vuelo alternativo? ¿Quién asume el costo?'),
 ]),
 ('note','Nota final: la DIAN indicó que, si las rectificaciones no se presentan en 48 horas, los 47 paquetes podrían clasificarse como abandono legal y pasar a subasta.'),
], meta('08_correo_nacionalizacion','08','NACIONALIZACIÓN','Aviso interno — estado del trámite de importación (alerta DIAN)','EXPEDIENTE DIDÁCTICO / FL-2847','2026-05-28')))

# ══════════════════════════════════════════════════════════════════════════
# 09 — Comprobante de impuestos
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Identificación del soporte',[
   ('Entidad','Dirección de Impuestos y Aduanas Nacionales (DIAN) — comprobante de pago de tributos aduaneros'),
   ('Declaración','23098765432109-8'),
   ('Recibo de pago','9876543210-20260218'),
   ('Transacción','BCB-20260219-00456789'),
   ('Declarante','LatamBox S.A.S. — NIT 901.234.567-8'),
   ('Importador','Carlos Andrés Martínez — LBX-1029'),
   ('Aduana de ingreso','Barranquilla — Aeropuerto Ernesto Cortissoz'),
   ('Modalidad','Importación definitiva — tráfico postal y envíos urgentes (Decreto 1165/2019, art. 257)'),
 ]),
 ('table','Liquidación de tributos',['Concepto','Base gravable (USD)','Tarifa','Monto (USD)'],[
   ['Arancel ad valorem','$435.97','0% (TLC)','$0.00'],
   ['IVA (19% sobre el CIF)','$446.08','19%','$84.76'],
   ['Total tributos','—','—','$84.76'],
 ], [2,1.5,1,1.2]),
 ('table','Conversión a pesos colombianos',['Concepto','Valor'],[
   ['TRM del día (18 de febrero de 2026)','$4,015.32'],
   ['Total tributos en COP','$340,339'],
   ['Comisión de la agencia de aduanas LatamBox','$25,000'],
   ['TOTAL A PAGAR (COP)','$365,339'],
 ], [4,1.5]),
 ('table','Estado del pago',['Campo','Valor'],[
   ['Fecha de liquidación','18 de febrero de 2026'],
   ['Fecha de pago','19 de febrero de 2026'],
   ['Medio de pago','Transferencia electrónica — Bancolombia'],
   ['Estado','PAGADO'],
 ], [2,3]),
 ('section','Autorización de levante',[
   ('Fecha de levante','20 de febrero de 2026'),
   ('Funcionario que autoriza','Inspector DIAN — Carlos Andrés Gómez'),
   ('Código de levante','LV-2026-0987654'),
   ('Depósito de salida','Almaviva S.A. — Bodega 7, Barranquilla'),
 ]),
 ('note','Observaciones: el valor declarado coincide con la factura comercial presentada. Los productos clasifican para desgravación total bajo el TLC Colombia–EE. UU. (0% de arancel); no requieren registro ni visto bueno de otra entidad. El levante se genera en un plazo máximo de 24 horas después del pago.'),
 ('note','Este comprobante acredita que los impuestos de importación fueron pagados en su totalidad. Consérvelo junto con la factura de Amazon como soporte de la legalidad de la mercancía en Colombia (Decreto 1165 de 2019, art. 265).'),
], meta('09_comprobante_impuestos','09','COMPROBANTE DE IMPUESTOS','Soporte de pago — tributos de importación','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-19')))

# ══════════════════════════════════════════════════════════════════════════
# 10 — Guía de entrega local (POD)
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Datos del envío',[
   ('Remitente','LatamBox S.A.S. — Bodega Barranquilla'),
   ('Dirección de origen','Carrera 51B #82-254, Bodega 12, Parque Industrial, Barranquilla, Atlántico'),
   ('Destinatario','Carlos Andrés Martínez — [Nombre del cliente]'),
   ('Dirección de entrega','[Dirección del cliente en Colombia] · Barranquilla'),
   ('Seguimiento LatamBox','LBX-2026-00478'),
   ('Guía local','DOM-2026-01543'),
 ]),
 ('table','Detalles del paquete',['Campo','Valor'],[
   ['Contenido declarado','Electrónicos: AirPods, cargador, Kindle'],
   ['Peso','2.3 lb (1.04 kg)'],
   ['Dimensiones','12" x 8" x 4"'],
   ['Valor declarado (transporte)','USD $446.08 · COP $1.791.154'],
   ['Tipo de empaque','Caja de cartón corrugado con protección interna'],
   ['Instrucciones especiales','Entregar únicamente al destinatario con documento de identidad'],
 ], [2,3]),
 ('table','Ruta de entrega',['Fecha','Hora','Evento','Ubicación'],[
   ['21 feb 2026','08:15','Recolectado en bodega','Barranquilla'],
   ['21 feb 2026','09:40','En ruta de entrega','Zona de despacho'],
   ['21 feb 2026','11:20','Entregado','[Dirección de entrega]'],
 ], [1,0.8,1.6,2]),
 ('table','Confirmación de entrega',['Campo','Valor'],[
   ['Recibido por','[Nombre del cliente] (Carlos Andrés Martínez)'],
   ['Documento de identidad','CC [Número] — verificado'],
   ['Fecha de entrega','21 de febrero de 2026'],
   ['Hora de entrega','11:20 a. m.'],
   ['Estado del paquete al entregar','Buen estado — sin daños visibles'],
   ['Firma del destinatario','________________________________________'],
   ['Entregado por','Juan Carlos Peña — Mensajero LatamBox, ID MSJ-0187'],
 ], [2,3]),
 ('table','Novedades (si aplica)',['Campo','Valor'],[
   ['¿Hubo novedad?','No'],
   ['¿Se contactó al cliente antes?','Sí — llamada a las 10:45 a. m.'],
   ['¿Segundo intento requerido?','No'],
   ['Observaciones','El cliente recibió conforme y verificó el contenido frente a la guía.'],
 ], [2,3]),
 ('note','Este documento es el soporte oficial de entrega (Proof of Delivery / POD). En caso de reclamo por paquete no recibido, es la evidencia de que la entrega se realizó conforme al contrato de servicio.'),
], meta('10_guia_entrega_local','10','GUÍA DE ENTREGA LOCAL','Proof of delivery — entrega a domicilio en Colombia','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-21')))

# ══════════════════════════════════════════════════════════════════════════
# 11 — Correo de confirmación de entrega
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Encabezado del mensaje',[
   ('De','Carolina Méndez — Coordinadora de Atención al Cliente · servicio@latambox.com'),
   ('Para','[Nombre del cliente] — LBX-1029'),
   ('Asunto','Entregado — tu paquete LBX-2026-00478 ya está en tus manos'),
   ('Fecha','21 de febrero de 2026'),
 ]),
 ('para','Hola [Nombre]: ¡tu paquete fue entregado exitosamente!'),
 ('table','Resumen del envío',['Etapa','Fecha','Estado'],[
   ['Compra en Amazon','5 feb 2026','Completado'],
   ['Recepción en Miami','9 feb 2026','Completado'],
   ['Vuelo MIA - BAQ','13 feb 2026','Completado'],
   ['Nacionalización DIAN','16–19 feb 2026','Completado'],
   ['Entrega en tu domicilio','21 feb 2026','Completado'],
 ], [2.4,1.2,1]),
 ('table','Detalles de la entrega',['Campo','Valor'],[
   ['Tiempo total del proceso','16 días (desde la compra hasta la entrega)'],
   ['Seguimiento','LBX-2026-00478'],
   ['Guía local','DOM-2026-01543'],
   ['Entregado por','Juan Carlos Peña'],
   ['Recibido','21 de febrero de 2026, 11:20 a. m.'],
 ], [2,3]),
 ('section','¿Todo en orden?',[
   ('Encuesta','Cuéntanos cómo fue tu experiencia (1 minuto): www.latambox.com/encuesta/LBX-2026-00478'),
   ('Novedades','Si algo no salió bien, responde a este correo o escríbenos al WhatsApp +57 300 555 0123. Tenemos 48 horas hábiles para resolver cualquier novedad.'),
 ]),
 ('para','Gracias por confiar en LatamBox. Esperamos acompañarte en tu próxima compra.'),
 ('sig',['Carolina Méndez','Coordinadora de Atención al Cliente','LatamBox S.A.S.','servicio@latambox.com']),
], meta('11_correo_confirmacion_entrega','11','CONFIRMACIÓN DE ENTREGA','Notificación de cierre de la distribución','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-21')))

# ══════════════════════════════════════════════════════════════════════════
# 12 — Encuesta y queja
# ══════════════════════════════════════════════════════════════════════════
DOCS.append(([
 ('section','Identificación de la evaluación',[
   ('Cliente','[Nombre del cliente] — LBX-1029'),
   ('Envío LatamBox','LBX-2026-00478'),
   ('Encuesta enviada','21 de febrero de 2026 · plazo: 7 días'),
   ('Código','FR-SAT-001'),
 ]),
 ('table','Sección A — Experiencia general (escala 1 a 5)',['Pregunta','Respuesta'],[
   ['¿Cómo calificarías tu experiencia general con LatamBox?','5'],
   ['¿Qué tan claro fue el proceso de seguimiento?','4'],
   ['¿Recomendarías LatamBox a un amigo o familiar?','5'],
 ], [4,1]),
 ('table','Sección B — Evaluación por etapa',['Etapa','Valoración','Comentario'],[
   ['Registro y activación del casillero','Excelente','Muy rápido: en 10 minutos ya tenía mi dirección.'],
   ['Recepción en Miami','Regular','El correo de notificación llegó 2 días después. Pensé que se había perdido.'],
   ['Vuelo y transporte','Excelente','Sin problemas.'],
   ['Nacionalización y aduana','Excelente','Todo claro; me explicaron los impuestos.'],
   ['Entrega local','Excelente','El mensajero llamó antes de llegar.'],
 ], [2,1,3]),
 ('table','Sección C — Comunicación',['Pregunta','Respuesta'],[
   ['¿Recibiste todos los correos de notificación?','No. No recibí el correo de llegada a Miami hasta 2 días después; tuve que llamar a soporte.'],
   ['¿El lenguaje de los correos fue claro?','Sí, fue claro.'],
   ['¿Qué mejorarías de la comunicación?','Recibir notificaciones por WhatsApp, no solo por correo.'],
 ], [2,3]),
 ('section','Sección D — Comentario abierto',[
   ('Comentario','"En general, muy buen servicio. Me gusta que todo el trámite aduanero lo hagan ustedes. Lo único malo fue el retraso en la notificación de llegada a Miami: por dos días no supe si mi paquete había llegado. Sugiero activar notificaciones por WhatsApp apenas el paquete sea escaneado en bodega. De resto, todo excelente."'),
 ]),
 ('table','Registro de la queja (uso interno)',['Campo','Valor'],[
   ['Radicado','Q-2026-00192'],
   ['Fecha de registro','22 de febrero de 2026'],
   ['Canal de recepción','Encuesta de satisfacción (Sección C)'],
   ['Categoría','Comunicación — retraso en las notificaciones'],
   ['Tracking relacionado','LBX-2026-00478'],
   ['Descripción','El cliente no recibió la notificación de llegada a Miami en el momento del escaneo; el correo llegó 2 días después y tuvo que llamar a soporte.'],
   ['Impacto','Medio — generó incertidumbre sobre el paradero del paquete durante 48 horas'],
   ['Área responsable','Operaciones Miami / TI (sistema de notificaciones)'],
   ['Acción inmediata','Verificar el sistema de notificaciones automáticas y escalar a TI si hay una falla en el envío de correos.'],
   ['Sugerencia del cliente','Activar notificaciones por WhatsApp en tiempo real al escanear el paquete en bodega.'],
 ], [2,3]),
], meta('12_encuesta_y_queja','12','ENCUESTA Y QUEJA','Evaluación del servicio y seguimiento','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-22')))


# ══════════════════════════════════════════════════════════════════════════
# VERSIONES PARA LA SEMANA 3 (flujo normal de febrero · envío LBX-2026-00478)
# Los archivos base 06/07/08 quedan como versión crisis FL-2847 (semana 7).
# ══════════════════════════════════════════════════════════════════════════

# 06-FEB — Guía aérea (AWB) del envío de febrero
DOCS.append(([
 ('note','Flujo normal de febrero: guía del envío individual LBX-2026-00478 dentro del consolidado de LatamBox. Versión para la semana 3.'),
 ('section','Identificación del transporte',[
   ('Guía aérea (House)','HWB-2847-001'),
   ('AWB maestro del consolidado','<font backColor="#E7DEF7">420-88472109</font>'),
   ('Envío LatamBox','<font backColor="#DCEFE0">LBX-2026-00478</font>'),
   ('ID de cliente','<font backColor="#DCE7F7">LBX-1029</font>'),
   ('Aerolínea','Avianca Cargo (AV)'),
   ('Vuelo','AV-2847 — viernes 13 de febrero de 2026'),
   ('Ruta','Miami (MIA) - Barranquilla (BAQ) — Aeropuerto Ernesto Cortissoz'),
   ('Estado','Recibido en bodega MIA — programado para el vuelo del 13 de febrero'),
 ]),
 ('section','Origen y destino',[
   ('Remitente','LatamBox S.A.S. — Miami Warehouse · 7850 NW 25th Street, Suite 100, Miami, FL 33122'),
   ('Destinatario','Carlos Andrés Martínez'),
   ('Destino final','Barranquilla, Colombia'),
   ('Servicio','Transporte internacional consolidado'),
 ]),
 ('table','Detalles del envío',['Concepto','Valor'],[
   ['Mercancía','Compra por internet (electrónicos de consumo) — no peligrosa'],
   ['Bultos','1'],
   ['Peso bruto','2.3 lb (1.04 kg)'],
   ['Peso tasable','2.3 lb'],
   ['Valor declarado para transporte','USD $446.08'],
   ['Seguro de carga (1% del valor declarado)','USD $4.36'],
 ], [2,3]),
 ('section','Instrucciones de manejo',[
   ('[x]','Mantener temperatura ambiente (15 °C – 25 °C).'),
   ('[x]','No apilar más de 3 niveles.'),
   ('[x]','Frágil — el paquete contiene electrónicos (AirPods, cargador, Kindle).'),
   ('[ ]','Cadena de frío y material peligroso: no aplica.'),
 ]),
 ('note','El AWB maestro corresponde al consolidado de LatamBox; la guía hija (HWB-2847-001) identifica este envío individual dentro del conjunto.'),
 ('barcode','42088472109'),
 ('sig',['Expedido por: LatamBox S.A.S. — Bodega Miami, 13/02/2026']),
], meta('06_guia_aerea_awb_feb','06','GUÍA AÉREA CONSOLIDADA (AWB)','Air waybill — referencias del transporte · envío de febrero','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-13','LatamBox Cargo')))

# 07-FEB — Factura de flete del envío de febrero
DOCS.append(([
 ('section','Datos de facturación',[
   ('Emisor','LatamBox S.A.S. · NIT 901.234.567-8'),
   ('Factura','F-2026-00478 · Resolución DIAN 18764029876543 del 15/01/2026'),
   ('Envío LatamBox','<font backColor="#DCEFE0">LBX-2026-00478</font>'),
   ('ID de cliente','<font backColor="#DCE7F7">LBX-1029</font>'),
   ('Fecha de emisión','19 de febrero de 2026'),
   ('Vuelo','AV-2847 del 13 de febrero de 2026'),
   ('Ruta','Miami (MIA) - Barranquilla (BAQ) — Aeropuerto Ernesto Cortissoz'),
 ]),
 ('table','Servicios facturados (tarifas 2026)',['Código','Descripción','Cant.','Unidad','V. unit.','V. total'],[
   ['REC-01','Recepción en bodega Miami','1','Paquete','USD $3.00','USD $3.00'],
   ['FLT-01','Flete aéreo MIA-BAQ','2.3','Libra','USD $2.50','USD $5.75'],
   ['NAC-01','Nacionalización — trámite DIAN','1','Trámite','USD $8.00','USD $8.00'],
   ['SEG-01','Seguro de carga (1% del valor declarado)','1','Cargo','USD $4.36','USD $4.36'],
   ['—','Subtotal servicios','—','—','—','USD $21.11'],
   ['ENT-01','Entrega local en Colombia','1','Envío','COP $12.000','COP $12.000'],
 ], [0.8,3,0.7,0.9,1.1,1.1]),
 ('table','Total a pagar',['Concepto','Valor'],[
   ['Servicios internacionales (USD)','USD $21.11'],
   ['Entrega local (COP)','COP $12.000'],
   ['TRM aplicada (19 de febrero de 2026)','$4,015.32'],
   ['Total en pesos (servicios convertidos + entrega)','COP $96.763'],
 ], [3.4,1.6]),
 ('table','Estado del pago',['Campo','Valor'],[
   ['Fecha de pago','19 de febrero de 2026'],
   ['Medio de pago','Transferencia electrónica — Bancolombia'],
   ['Estado','PAGADO'],
 ], [2,3]),
 ('note','Facturación individual por envío. Al no presentarse contingencia, no se aplican sobrecostos de bodegaje ni recargos por vuelo alternativo.'),
], meta('07_factura_flete_feb','07','FACTURA DE FLETE','Servicios logísticos internacionales — envío de febrero','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-19')))

# 08-FEB — Correo de nacionalización al cliente (envío de febrero)
DOCS.append(([
 ('section','Encabezado del mensaje',[
   ('De','Aduanas — LatamBox · aduanas@latambox.com'),
   ('Para','Carlos Andrés Martínez <carlos.martinez@example.com>'),
   ('Asunto','Trámite de nacionalización finalizado'),
   ('Fecha','20 de febrero de 2026'),
 ]),
 ('section','Identificación del envío',[
   ('ID de cliente','<font backColor="#DCE7F7">LBX-1029</font>'),
   ('Envío LatamBox','<font backColor="#DCEFE0">LBX-2026-00478</font>'),
   ('AWB maestro','420-88472109'),
   ('Guía hija','HWB-2847-001'),
   ('Declaración','23098765432109-8'),
   ('Soporte de pago','CP-2026-00478'),
   ('Tributos pagados','COP $365.339'),
   ('Referencia de levante','LV-2026-0987654'),
   ('Fecha de levante','20 de febrero de 2026'),
 ]),
 ('table','Soportes del trámite',['Documento','Estado'],[
   ['Factura comercial de Amazon (#114-8395627-0123456)','Recibida'],
   ['Declaración de valor (DV-2026-00478)','Presentada'],
   ['Comprobante de impuestos (CP-2026-00478)','Pagado'],
   ['Autorización de levante (LV-2026-0987654)','Otorgada'],
 ], [3,2]),
 ('para','Hola, Carlos: el pago de tributos quedó registrado y el envío cuenta con levante. Continuaremos con su distribución a Barranquilla. Conserva este correo junto con la declaración de valor y el comprobante de impuestos; la guía local permitirá consultar la etapa de entrega.'),
 ('note','Adaptación didáctica del aviso de nacionalización del envío de febrero. Este correo comunica al cliente el cierre del trámite aduanero.'),
], meta('08_correo_nacionalizacion_feb','08','NACIONALIZACIÓN','Aviso al cliente — estado del trámite de importación','EXPEDIENTE DIDÁCTICO / LBX-2026-00478','2026-02-20')))

if __name__ == '__main__':
    for data, m in DOCS:
        build(data, m)
        with open(os.path.join(OUT, m['file'] + '.md'), 'w', encoding='utf-8') as f:
            head = '# Caso LatamBox — Documento %s de 12\n## %s\n\n' % (
                m['num'], m['title'].title())
            f.write(head + to_md(data) + '\n\n*%s* · \n' % m['ref'])
        print('OK', m['file'])
    print('TOTAL', len(DOCS))
