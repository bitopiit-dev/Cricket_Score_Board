"""Build public/downloads/bpl-2027-fixture.pdf from docs/fixture-bpl-2027.json.

Run from the project folder after any fixture change:
    python scripts/build-fixture-pdf.py
Needs: pip install reportlab pillow   (Windows: uses the Arial fonts in C:\\Windows\\Fonts)
"""
import datetime, json, os, re, tempfile
from PIL import Image, ImageDraw
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, Image as RLImage, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
FONTS = r'C:\Windows\Fonts'
pdfmetrics.registerFont(TTFont('R', os.path.join(FONTS, 'arial.ttf')))
pdfmetrics.registerFont(TTFont('B', os.path.join(FONTS, 'arialbd.ttf')))
pdfmetrics.registerFont(TTFont('C', os.path.join(FONTS, 'ARIALNB.TTF')))

NAVY = colors.HexColor('#0a0d1f'); RED = colors.HexColor('#e10a14'); GREEN = colors.HexColor('#00914a')
GOLD = colors.HexColor('#f5e400'); INK = colors.HexColor('#0f172a'); SUB = colors.HexColor('#5b6478')
ROW = colors.HexColor('#f3f5f9'); RULE = colors.HexColor('#dfe3ea')

fx = json.load(open(P('docs', 'fixture-bpl-2027.json'), encoding='utf-8'))

# Team name -> logo file, read from src/data/teams.ts
src = open(P('src', 'data', 'teams.ts'), encoding='utf-8').read()
teams = re.findall(r"name: '([^']+)',[^{}]*?group: '([AB])',[^{}]*?logo: '([^']+)'", src)
tmp = tempfile.mkdtemp()
logos, groups = {}, {'A': [], 'B': []}
for name, group, logo in teams:
    groups[group].append(name)
    im = Image.open(P('public', *logo.split('/'))).convert('RGBA')
    im = Image.alpha_composite(Image.new('RGBA', im.size, 'white'), im).resize((72, 72), Image.LANCZOS)
    m = Image.new('L', (288, 288), 0); ImageDraw.Draw(m).ellipse((2, 2, 286, 286), fill=255)
    im.putalpha(m.resize((72, 72), Image.LANCZOS))
    path = os.path.join(tmp, re.sub(r'\W+', '-', name) + '.png'); im.save(path); logos[name] = path

# Header logos, shrunk so the PDF stays small
def small(src_rel, w):
    im = Image.open(P('public', 'images', src_rel)).convert('RGBA')
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    out = os.path.join(tmp, src_rel); im.save(out, optimize=True); return out
BPL = small('bpl-2027-logo.png', 420)
BGL = small('bgl-sports-committee-logo.png', 150)

W, H = A4
def header(c, doc):
    c.saveState()
    c.setFillColor(NAVY); c.rect(0, H - 34 * mm, W, 34 * mm, stroke=0, fill=1)
    c.setFillColor(RED); c.rect(0, H - 35.5 * mm, W, 1.5 * mm, stroke=0, fill=1)
    c.setFillColor(GREEN); c.rect(0, H - 36.5 * mm, W, 1 * mm, stroke=0, fill=1)
    c.drawImage(BPL, 12 * mm, H - 31 * mm, width=50 * mm, height=24 * mm, mask='auto', preserveAspectRatio=True)
    c.drawImage(BGL, W - 28 * mm, H - 31.5 * mm, width=18 * mm, height=25 * mm, mask='auto', preserveAspectRatio=True)
    c.setFillColor(colors.white); c.setFont('C', 21)
    c.drawCentredString(W / 2 + 12 * mm, H - 17 * mm, 'BARIDHI PREMIER LEAGUE-2027')
    c.setFillColor(GOLD); c.setFont('B', 10.5)
    c.drawCentredString(W / 2 + 12 * mm, H - 24.5 * mm, 'OFFICIAL FIXTURE  \u2022  T-12  \u2022  48 MATCHES')
    c.setFillColor(SUB); c.setFont('R', 7.5)
    c.drawString(12 * mm, 9 * mm, 'BGL Sports Committee  \u2022  Times are Bangladesh time (BST). '
                 'Fixture may change; check the app for the latest.')
    c.drawRightString(W - 12 * mm, 9 * mm, f'Updated {UPDATED.day} {UPDATED:%b %Y}  \u2022  Page {doc.page}')
    c.setFillColor(colors.HexColor('#c9cfe6')); c.setFont('R', 8)
    c.drawCentredString(W / 2 + 12 * mm, H - 30 * mm, f'Updated {UPDATED.day} {UPDATED:%B %Y}')
    c.restoreState()

OUT = P('src', 'assets', 'bpl-2027-fixture.pdf')
UPDATED = datetime.date.today()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=12 * mm, rightMargin=12 * mm, topMargin=42 * mm,
                      bottomMargin=16 * mm, title='BPL-2027 Official Fixture',
                      author='BGL Sports Committee', subject='Baridhi Premier League-2027 fixture')
doc.addPageTemplates([PageTemplate(frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width,
                                                 doc.height, id='f')], onPage=header)])
team_st = ParagraphStyle('t', fontName='B', fontSize=8.6, leading=10.5, textColor=INK)
slot_st = ParagraphStyle('p', parent=team_st, fontName='R', textColor=SUB)
small_st = ParagraphStyle('s', fontName='R', fontSize=8, leading=10, textColor=INK)
sec_st = ParagraphStyle('sec', fontName='C', fontSize=13, leading=16, textColor=INK, spaceBefore=6, spaceAfter=3)
hdr_st = ParagraphStyle('h', fontName='B', fontSize=7.8, textColor=colors.white, leading=9.5)
grp_st = ParagraphStyle('gh', fontName='C', fontSize=11.5, textColor=colors.white, leading=13)

PAD0 = [('VALIGN', (0, 0), (-1, -1), 'MIDDLE')] + [(k, (0, 0), (-1, -1), 0) for k in
        ('LEFTPADDING', 'RIGHTPADDING', 'TOPPADDING', 'BOTTOMPADDING')]
def team_cell(name):
    if name not in logos:  # a slot such as "Group A – 1st"
        return Paragraph(name, slot_st)
    t = Table([[RLImage(logos[name], 5.6 * mm, 5.6 * mm), Paragraph(name.replace('&', '&amp;'), team_st)]],
              colWidths=[7 * mm, None])
    t.setStyle(TableStyle(PAD0)); return t

story = []
g = Table([[Paragraph('GROUP A', grp_st), Paragraph('GROUP B', grp_st)]] +
          [[team_cell(a), team_cell(b)] for a, b in zip(groups['A'], groups['B'])],
          colWidths=[doc.width / 2 - 2 * mm] * 2)
g.setStyle(TableStyle([('BACKGROUND', (0, 0), (0, 0), RED), ('BACKGROUND', (1, 0), (1, 0), GREEN),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ROW]), ('BOX', (0, 0), (0, -1), .6, RULE),
    ('BOX', (1, 0), (1, -1), .6, RULE), ('LEFTPADDING', (0, 0), (-1, -1), 6), ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')]))
story += [g, Spacer(1, 4 * mm)]

cw = [11 * mm, 10 * mm, 22 * mm, 17 * mm]
cw += [(doc.width - sum(cw)) / 2] * 2
STAGES = [('Group Stage', lambda s: s.startswith('Group'), 'red bar = Group A, green bar = Group B'),
          ('Super Six', lambda s: s == 'Super Six', ''),
          ('Semi-Finals & Final', lambda s: s.startswith('Semi') or s == 'Final',
           'SF-1: 1st vs 4th, SF-2: 2nd vs 3rd of Super Six')]
for title, pred, note in STAGES:
    ms = [m for m in fx if pred(m['stage'])]
    data = [[Paragraph(h, hdr_st) for h in ['NO.', 'DAY', 'DATE', 'TIME', 'TEAM A', 'TEAM B']]]
    style = [('BACKGROUND', (0, 0), (-1, 0), NAVY), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
             ('LEFTPADDING', (0, 0), (-1, -1), 5), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
             ('TOPPADDING', (0, 0), (-1, -1), 3.2), ('BOTTOMPADDING', (0, 0), (-1, -1), 3.2),
             ('LINEBELOW', (0, 1), (-1, -1), .4, RULE)]
    prev = None
    for i, m in enumerate(ms, 1):
        dt = datetime.datetime.strptime(m['date'] + ' ' + m['time'], '%Y-%m-%d %H:%M')
        data.append([Paragraph(f"<b>{m['match']}</b>", small_st), Paragraph(dt.strftime('%a'), small_st),
                     Paragraph(dt.strftime('%d %b %Y'), small_st),
                     Paragraph(dt.strftime('%I:%M %p').lstrip('0'), small_st),
                     team_cell(m['teamA']), team_cell(m['teamB'])])
        if prev and m['date'] != prev:
            style.append(('LINEABOVE', (0, i), (-1, i), .9, colors.HexColor('#b8c0cc')))
        prev = m['date']
        if m['stage'] in ('Group A', 'Group B'):
            style.append(('LINEBEFORE', (0, i), (0, i), 3, RED if m['stage'] == 'Group A' else GREEN))
        if m['stage'] == 'Final': style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#fff8c2')))
        if m['stage'].startswith('Semi'): style.append(('BACKGROUND', (0, i), (-1, i), ROW))
    t = Table(data, colWidths=cw, repeatRows=1); t.setStyle(TableStyle(style))
    extra = f'  <font name="R" size="8" color="#5b6478">{note}</font>' if note else ''
    story += [Paragraph(title.upper() + extra, sec_st), t, Spacer(1, 3 * mm)]
doc.build(story)
# Also at the old address (public/downloads/), so links shared before the switch still get the new file.
import shutil
os.makedirs(P('public', 'downloads'), exist_ok=True)
shutil.copyfile(OUT, P('public', 'downloads', 'bpl-2027-fixture.pdf'))
# The Fixtures page names the download after this date, so a new PDF never looks like the old one.
json.dump({'updated': UPDATED.isoformat()},
          open(P('src', 'assets', 'bpl-2027-fixture.json'), 'w', encoding='utf-8'))
print('Wrote', OUT, os.path.getsize(OUT) // 1024, 'KB, updated', UPDATED)
