#!/usr/bin/env python3
"""
FIA Academy — Professional Certificate PDF Generator
Generates a high-quality certificate with:
- Academy logo + name + brand colors (navy + gold)
- Student name (large calligraphic)
- Course title
- Certificate number (verbatim)
- Issue date
- QR code (links to /verify?number=...)
- Code-128 barcode
- Gold seal / stamp
- Authorized signature line
"""
import sys
import os
import io
import qrcode
import reportlab
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode import code128
from reportlab.lib.utils import ImageReader

# Brand colors
NAVY = HexColor('#0B1635')
NAVY_LIGHT = HexColor('#1A2547')
GOLD = HexColor('#D4AF37')
GOLD_LIGHT = HexColor('#E5C158')
CREAM = HexColor('#FBF7EE')
GRAY = HexColor('#666666')

# Fonts — use Cairo if available, fall back to DejaVu
def register_fonts():
    fonts = {
        'Cairo':           '/home/z/my-project/.fonts/Cairo-Regular.ttf',
        'Cairo-Bold':      '/home/z/my-project/.fonts/Cairo-Bold.ttf',
        'Cairo-Black':     '/home/z/my-project/.fonts/Cairo-Black.ttf',
        'DejaVu':           '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'DejaVu-Bold':      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        'FreeSerif':        '/usr/share/fonts/truetype/freefont/FreeSerif.ttf',
        'FreeSerif-Bold':   '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf',
    }
    for name, path in fonts.items():
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
            except Exception as e:
                pass

register_fonts()

# Pick best available font
def font_for(weight='regular'):
    candidates = {
        'regular':  ['Cairo', 'DejaVu', 'FreeSerif'],
        'bold':     ['Cairo-Bold', 'DejaVu-Bold', 'FreeSerif-Bold'],
        'black':    ['Cairo-Black', 'DejaVu-Bold', 'FreeSerif-Bold'],
    }.get(weight, ['Cairo', 'DejaVu'])
    for c in candidates:
        try:
            pdfmetrics.getFont(c)
            return c
        except Exception:
            continue
    return 'Helvetica'

F_REG  = font_for('regular')
F_BOLD = font_for('bold')
F_BLCK = font_for('black')

# --- Helper: Arabic text shaping for ReportLab ---
# ReportLab doesn't shape Arabic. We use arabic_reshaper + python-bidi if available.
def shape_arabic(text):
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except Exception:
        # Fallback: just reverse the string (poor man's RTL)
        return text[::-1] if text else text


def generate_certificate(
    student_name: str,
    course_title: str,
    certificate_number: str,
    issue_date: str,
    issued_by: str = 'أكاديمية المستقبل الدولية',
    output_path: str = None,
    verify_url: str = None,
    logo_path: str = None,
):
    """
    Generate a professional certificate PDF.
    Returns: bytes of the PDF if output_path is None, else None (writes to file).
    """
    # Page: landscape A4
    page_w, page_h = landscape(A4)  # 842 x 595

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    c.setTitle(f'FIA Certificate — {certificate_number}')
    c.setAuthor('FIA — Future International Academy')
    c.setSubject('Verified Professional Certificate')

    # ===== Background =====
    # Cream background
    c.setFillColor(CREAM)
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    # Outer navy border (thick)
    c.setStrokeColor(NAVY)
    c.setLineWidth(20)
    c.rect(15, 15, page_w - 30, page_h - 30, fill=0, stroke=1)

    # Inner gold border
    c.setStrokeColor(GOLD)
    c.setLineWidth(2)
    c.rect(25, 25, page_w - 50, page_h - 50, fill=0, stroke=1)

    # Decorative corner ornaments (small gold squares)
    corner_size = 8
    for (x, y) in [(25, 25), (page_w - 25 - corner_size, 25),
                   (25, page_h - 25 - corner_size), (page_w - 25 - corner_size, page_h - 25 - corner_size)]:
        c.setFillColor(GOLD)
        c.rect(x, y, corner_size, corner_size, fill=1, stroke=0)

    # ===== Header: Logo + Academy Name =====
    # Logo box (navy circle with gold "F")
    logo_size = 50
    logo_x = page_w / 2 - logo_size / 2
    logo_y = page_h - 95

    # Try to load external logo, else draw a gold navy circle
    logo_drawn = False
    if logo_path and os.path.exists(logo_path):
        try:
            img = ImageReader(logo_path)
            c.drawImage(img, logo_x, logo_y, width=logo_size, height=logo_size, mask='auto')
            logo_drawn = True
        except Exception:
            logo_drawn = False

    if not logo_drawn:
        # Draw a gold-bordered navy circle with white "F" inside
        c.setFillColor(NAVY)
        c.setStrokeColor(GOLD)
        c.setLineWidth(3)
        c.circle(page_w / 2, logo_y + logo_size / 2, logo_size / 2, fill=1, stroke=1)
        # "FIA" text in gold inside
        c.setFillColor(GOLD)
        c.setFont(F_BOLD, 14)
        c.drawCentredString(page_w / 2, logo_y + logo_size / 2 - 5, 'FIA')

    # Academy name (shaped Arabic)
    c.setFillColor(NAVY)
    c.setFont(F_BLCK, 26)
    c.drawCentredString(page_w / 2, logo_y - 35, shape_arabic(issued_by))

    # English subtitle
    c.setFillColor(GOLD)
    c.setFont(F_BOLD, 10)
    c.drawCentredString(page_w / 2, logo_y - 50, 'FUTURE INTERNATIONAL ACADEMY')

    # Decorative gold line under header
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(page_w / 2 - 100, logo_y - 58, page_w / 2 + 100, logo_y - 58)

    # ===== Body: Certificate text =====
    c.setFillColor(NAVY)
    c.setFont(F_REG, 14)
    c.drawCentredString(page_w / 2, logo_y - 95, shape_arabic('شهادة إتمام دورة معتمدة'))

    # "هذا يشهّد بأن"
    c.setFillColor(GRAY)
    c.setFont(F_REG, 11)
    c.drawCentredString(page_w / 2, logo_y - 115, shape_arabic('تشهد أكاديمية المستقبل الدولية بأن'))

    # Student name (large, gold)
    c.setFillColor(GOLD)
    c.setFont(F_BLCK, 36)
    c.drawCentredString(page_w / 2, logo_y - 160, student_name)

    # Underline student name
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    name_width = pdfmetrics.stringWidth(student_name, F_BLCK, 36)
    c.line(page_w / 2 - name_width / 2 - 20, logo_y - 168,
           page_w / 2 + name_width / 2 + 20, logo_y - 168)

    # "قد أتم بنجاح دورة"
    c.setFillColor(GRAY)
    c.setFont(F_REG, 11)
    c.drawCentredString(page_w / 2, logo_y - 195, shape_arabic('قد أتم بنجاح متطلبات دورة'))

    # Course title
    c.setFillColor(NAVY)
    c.setFont(F_BOLD, 18)
    c.drawCentredString(page_w / 2, logo_y - 220, shape_arabic(course_title))

    # ===== Footer: Date + Signature + Barcode + QR =====

    # Left side: Date
    c.setFillColor(GRAY)
    c.setFont(F_REG, 9)
    c.drawCentredString(150, 80, shape_arabic('تاريخ الإصدار'))
    c.setFillColor(NAVY)
    c.setFont(F_BOLD, 12)
    c.drawCentredString(150, 65, issue_date)

    # Center: Barcode (Code-128)
    barcode_value = certificate_number
    barcode_obj = code128.Code128(barcode_value, barWidth=0.7, barHeight=35)
    barcode_obj.drawOn(c, page_w / 2 - barcode_obj.width / 2, 70)
    # Barcode caption
    c.setFillColor(NAVY)
    c.setFont(F_BOLD, 9)
    c.drawCentredString(page_w / 2, 55, barcode_value)

    # Right side: Signature
    c.setFillColor(GRAY)
    c.setFont(F_REG, 9)
    c.drawCentredString(page_w - 150, 100, shape_arabic('توقيع الجهة المانوحة'))
    # Signature line
    c.setStrokeColor(NAVY)
    c.setLineWidth(1)
    c.line(page_w - 200, 88, page_w - 100, 88)
    # Authorized name
    c.setFillColor(NAVY)
    c.setFont(F_BOLD, 11)
    c.drawCentredString(page_w - 150, 75, shape_arabic('المدير التنفيذي'))

    # ===== Gold seal (bottom-left corner near signature) =====
    seal_x, seal_y = page_w - 130, 110
    seal_r = 30
    # Outer ring (gold)
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.setFillColor(white)
    c.circle(seal_x, seal_y, seal_r, fill=1, stroke=1)
    # Inner ring (navy)
    c.setStrokeColor(NAVY)
    c.setLineWidth(1)
    c.circle(seal_x, seal_y, seal_r - 5, fill=0, stroke=1)
    # Seal text
    c.setFillColor(NAVY)
    c.setFont(F_BOLD, 8)
    c.drawCentredString(seal_x, seal_y + 5, 'FIA')
    c.setFont(F_BOLD, 6)
    c.drawCentredString(seal_x, seal_y - 5, shape_arabic('معتمد'))
    # Star around the seal
    import math
    for i in range(8):
        angle = i * math.pi / 4
        sx = seal_x + math.cos(angle) * (seal_r + 4)
        sy = seal_y + math.sin(angle) * (seal_r + 4)
        c.setFillColor(GOLD)
        c.circle(sx, sy, 1.5, fill=1, stroke=0)

    # ===== QR code (left side, near date) =====
    qr_url = verify_url or f'https://fia.edu/verify?number={certificate_number}'
    qr = qrcode.QRCode(version=1, box_size=4, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(qr_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color='#0B1635', back_color='white')
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format='PNG')
    qr_buf.seek(0)
    qr_reader = ImageReader(qr_buf)
    qr_size = 50
    c.drawImage(qr_reader, 150 - qr_size / 2, 110, width=qr_size, height=qr_size, mask='auto')
    c.setFillColor(GRAY)
    c.setFont(F_REG, 7)
    c.drawCentredString(150, 103, shape_arabic('امسح للتحقق'))

    # ===== Footer ribbon (gold strip at the very bottom) =====
    c.setFillColor(GOLD)
    c.rect(50, 35, page_w - 100, 8, fill=1, stroke=0)

    # Bottom text: certificate number again + verify URL
    c.setFillColor(GRAY)
    c.setFont(F_REG, 8)
    c.drawCentredString(page_w / 2, 22, f'{shape_arabic("للتحقق:")} {qr_url}')

    # Watermark (very light) — diagonal text across the page
    c.saveState()
    c.translate(page_w / 2, page_h / 2)
    c.rotate(45)
    c.setFillColor(HexColor('#0B163510'))
    c.setFont(F_BLCK, 60)
    c.drawCentredString(0, 0, 'FIA')
    c.restoreState()

    c.showPage()
    c.save()

    pdf_bytes = buf.getvalue()
    if output_path:
        with open(output_path, 'wb') as f:
            f.write(pdf_bytes)
        return None
    return pdf_bytes


if __name__ == '__main__':
    if len(sys.argv) < 5:
        print('Usage: generate_certificate.py <student_name> <course_title> <cert_number> <issue_date> [output_path] [verify_url]')
        sys.exit(1)
    student = sys.argv[1]
    course = sys.argv[2]
    num = sys.argv[3]
    date = sys.argv[4]
    out = sys.argv[5] if len(sys.argv) > 5 else None
    url = sys.argv[6] if len(sys.argv) > 6 else None
    generate_certificate(student, course, num, date, output_path=out, verify_url=url)
    print(f'Certificate generated: {out}')
