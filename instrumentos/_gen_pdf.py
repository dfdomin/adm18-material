"""Generate PDF from a single markdown file using fpdf2."""
import re, os, sys
from fpdf import FPDF

UNICODE_MAP = {
    '\u2014': '--', '\u2013': '-', '\u2018': "'", '\u2019': "'",
    '\u201c': '"', '\u201d': '"', '\u2026': '...', '\u00a0': ' ',
    '\u2022': '*', '\u00b7': '*', '\u2192': '->',
    '\u00e1': 'a', '\u00e9': 'e', '\u00ed': 'i', '\u00f3': 'o', '\u00fa': 'u',
    '\u00f1': 'n', '\u00c1': 'A', '\u00c9': 'E', '\u00cd': 'I', '\u00d3': 'O', '\u00da': 'U',
    '\u00d1': 'N', '\u00fc': 'u', '\u00bf': '', '\u00a1': '',
}

def clean(text):
    for k, v in UNICODE_MAP.items():
        text = text.replace(k, v)
    result = []
    for c in text:
        try:
            c.encode('latin-1')
            result.append(c)
        except UnicodeEncodeError:
            result.append('?')
    return ''.join(result)

class MPDF(FPDF):
    def __init__(self):
        super().__init__('P', 'mm', 'A4')
        self.set_auto_page_break(True, 20)
        self.add_page()

    def h1(self, t):
        t = clean(t)
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(26, 39, 68)
        self.multi_cell(0, 8, t)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def h2(self, t):
        t = clean(t)
        if self.get_y() > 260: self.add_page()
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(44, 94, 168)
        self.multi_cell(0, 6, t)
        self.ln(2)

    def h3(self, t):
        t = clean(t)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(30, 122, 62)
        self.multi_cell(0, 5, t)
        self.ln(1)

    def p(self, t):
        t = clean(t)
        if self.get_y() > 270: self.add_page()
        self.set_font('Helvetica', '', 8)
        self.set_text_color(32, 33, 36)
        self.multi_cell(0, 4, t)
        self.ln(1)

    def hr(self):
        self.ln(1)
        self.set_draw_color(200, 200, 200)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(1)

    def tbl(self, hdrs, rows):
        if self.get_y() > 260: self.add_page()
        nc = len(hdrs)
        cw = (self.w - self.l_margin - self.r_margin) / nc
        self.set_font('Helvetica', 'B', 6)
        self.set_fill_color(26, 39, 68)
        self.set_text_color(255, 255, 255)
        for h in hdrs:
            self.cell(cw, 4, clean(h)[:30], border=0, fill=True)
        self.ln()
        for i, row in enumerate(rows):
            if self.get_y() > 272: self.add_page()
            self.set_fill_color(248, 248, 248) if i % 2 == 0 else self.set_fill_color(255, 255, 255)
            self.set_text_color(32, 33, 36)
            self.set_font('Helvetica', '', 6)
            y0, x0 = self.get_y(), self.get_x()
            mh = 4
            for j, cell in enumerate(row):
                self.set_xy(x0 + j * cw, y0)
                self.multi_cell(cw, 3.5, clean(str(cell))[:60], border=0, fill=True)
                mh = max(mh, self.get_y() - y0)
            self.set_y(y0 + mh)
        self.ln(2)


def convert(md_path, pdf_path):
    with open(md_path) as f:
        content = f.read()
    pdf = MPDF()
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1; continue
        s = line.strip()
        if s.startswith('# '):         pdf.h1(s[2:]); i += 1
        elif s.startswith('## '):      pdf.h2(s[3:]); i += 1
        elif s.startswith('### '):     pdf.h3(s[4:]); i += 1
        elif s == '---':               pdf.hr(); i += 1
        elif s.startswith('|') and i+1 < len(lines) and '---' in lines[i+1]:
            tl = []; j = i
            while j < len(lines) and lines[j].strip().startswith('|'):
                tl.append(lines[j].strip()); j += 1
            if len(tl) >= 2:
                hdrs = [c.strip() for c in tl[0].split('|')[1:-1]]
                rows = [[c.strip() for c in l.split('|')[1:-1]] for l in tl[2:]]
                rows = [r for r in rows if len(r) == len(hdrs)]
                if hdrs and rows: pdf.tbl(hdrs, rows)
            i = j
        else:
            pl = []
            while i < len(lines) and lines[i].strip() and not any(
                lines[i].strip().startswith(c) for c in ['#','|','>','```']
            ) and lines[i].strip() != '---':
                pl.append(lines[i].strip()); i += 1
            if pl:
                txt = ' '.join(pl)
                txt = re.sub(r'\*\*(.*?)\*\*', r'\1', txt)
                txt = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', txt)
                txt = re.sub(r'`(.*?)`', r'\1', txt)
                pdf.p(txt)
    pdf.output(pdf_path)
    return os.path.getsize(pdf_path)


if __name__ == '__main__':
    md_path = sys.argv[1]
    pdf_path = sys.argv[2] if len(sys.argv) > 2 else md_path.replace('.md', '.pdf')
    sz = convert(md_path, pdf_path)
    print(f"  {os.path.basename(pdf_path)}: {sz:,} bytes")
