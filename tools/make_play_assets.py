"""Tạo ảnh Google Play từ bộ ảnh App Store.
 - Ảnh màn hình điện thoại: 1080x2160 (tỉ lệ 1:2, đúng giới hạn Play)
 - Ảnh đầu trang (feature graphic): 1024x500
"""
import os, glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = r"C:\Users\Dat Nguyen\Downloads\BangGiaDatHCM_AppStore\Anh_AppStore_1320x2868"
OUT = r"G:\App Viet\bangia_dat\assets\googleplay"
os.makedirs(OUT + r"\screenshots", exist_ok=True)

# ---------- Ảnh màn hình 1080x2160 ----------
W, H = 1080, 2160
for i, f in enumerate(sorted(glob.glob(SRC + r"\*.png")), 1):
    im = Image.open(f).convert("RGB")
    nw = round(im.width * H / im.height)          # ~994
    body = im.resize((nw, H), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H))
    x0 = (W - nw) // 2
    # nền hai bên: kéo giãn cột biên để liền màu với nền gradient
    left = body.crop((0, 0, 1, H)).resize((x0, H), Image.BILINEAR)
    right = body.crop((nw - 1, 0, nw, H)).resize((W - x0 - nw, H), Image.BILINEAR)
    canvas.paste(left, (0, 0)); canvas.paste(body, (x0, 0)); canvas.paste(right, (x0 + nw, 0))
    name = os.path.basename(f).replace(".png", "")
    canvas.save(f"{OUT}\\screenshots\\play_{name}_1080x2160.png", optimize=True)

# ---------- Ảnh đầu trang 1024x500 ----------
FW, FH = 1024, 500
g = Image.new("RGB", (2, 2))
g.putdata([(7, 70, 52), (11, 107, 79), (11, 107, 79), (16, 163, 122)])
bg = g.resize((FW, FH), Image.BICUBIC)

def font(size, bold=True):
    for p in (r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
              r"C:\Windows\Fonts\arialbd.ttf"):
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.load_default()

d = ImageDraw.Draw(bg)

def rounded(img, r):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, *img.size), r, fill=255)
    out = img.convert("RGBA"); out.putalpha(m); return out

# biểu tượng
icon = Image.open(r"G:\App Viet\bangia_dat\assets\icon-only.png").convert("RGB").resize((150, 150), Image.LANCZOS)
bg.paste(rounded(icon, 34), (56, 70), rounded(icon, 34))
d.text((56, 245), "Giá đất HCM", font=font(64), fill="white")
d.text((58, 330), "Tra cứu bảng giá đất TP.HCM", font=font(28, False), fill=(214, 240, 230))
d.text((58, 372), "Tìm đường • Xem đoạn • Tính theo diện tích", font=font(22, False), fill=(170, 222, 205))
d.rounded_rectangle((58, 424, 344, 462), 19, fill=(255, 255, 255))
d.text((78, 428), "Dữ liệu bảng giá đất 2025", font=font(21), fill=(11, 107, 79))

# hai khung điện thoại (cắt phần giao diện thật từ ảnh 02 và 03)
def phone(path, x, y, w, h):
    im = Image.open(path).convert("RGB")
    # vùng điện thoại trong ảnh App Store (bỏ tiêu đề phía trên và chân trang)
    crop = im.crop((int(im.width * .115), int(im.height * .225), int(im.width * .885), int(im.height * .94)))
    crop = crop.resize((w, round(crop.height * w / crop.width)), Image.LANCZOS).crop((0, 0, w, h))
    shadow = Image.new("RGBA", (w + 60, h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((30, 40, w + 30, h + 40), 36, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    bg.paste(shadow, (x - 30, y - 30), shadow)
    bg.paste(rounded(crop, 34), (x, y), rounded(crop, 34))

phone(SRC + r"\03_Chi_tiet.png", 560, 62, 200, 438)
phone(SRC + r"\01_Tra_cuu_TPHCM.png", 790, 100, 200, 400)
bg.save(OUT + r"\play_feature_graphic_1024x500.png", optimize=True)
bg.save(OUT + r"\play_feature_graphic_1024x500.jpg", quality=95)
print("OK")
for f in sorted(glob.glob(OUT + r"\**\*.*", recursive=True)):
    im = Image.open(f); print(os.path.relpath(f, OUT), im.size, im.mode, os.path.getsize(f) // 1024, "KB")
