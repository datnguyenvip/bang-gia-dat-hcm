"""Ảnh Google Play cho thiết bị gập: 1:1, 4:3 (ngang), 10:16 (dọc), 3:4 (dọc)."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = r"C:\Users\Dat Nguyen\Downloads\BangGiaDatHCM_AppStore\Anh_AppStore_1320x2868"
OUT = r"G:\App Viet\bangia_dat\assets\googleplay\foldable"
os.makedirs(OUT, exist_ok=True)

def font(size, bold=True):
    p = r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"
    return ImageFont.truetype(p, size)

def gradient(w, h):
    g = Image.new("RGB", (2, 2))
    g.putdata([(7, 70, 52), (11, 107, 79), (11, 107, 79), (16, 163, 122)])
    return g.resize((w, h), Image.BICUBIC)

def rounded(img, r):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, *img.size), r, fill=255)
    o = img.convert("RGBA"); o.putalpha(m); return o

def phone_img(name, h):
    im = Image.open(f"{SRC}\\{name}").convert("RGB")
    c = im.crop((int(im.width * .115), int(im.height * .225), int(im.width * .885), int(im.height * .94)))
    w = round(c.width * h / c.height)
    return c.resize((w, h), Image.LANCZOS)

def paste_phone(bg, img, x, y):
    w, h = img.size
    r = max(20, w // 12)
    sh = Image.new("RGBA", (w + 120, h + 120), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((60, 75, w + 60, h + 75), r, fill=(0, 0, 0, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(26))
    bg.paste(sh, (x - 60, y - 60), sh)
    rr = rounded(img, r)
    bg.paste(rr, (x, y), rr)

def make(name, W, H, title, sub, shots, ph_h, y_ph, tsize):
    bg = gradient(W, H)
    d = ImageDraw.Draw(bg)
    tw = d.textlength(title, font=font(tsize))
    d.text(((W - tw) / 2, int(H * .045)), title, font=font(tsize), fill="white")
    sw = d.textlength(sub, font=font(int(tsize * .5), False))
    d.text(((W - sw) / 2, int(H * .045) + int(tsize * 1.35)), sub, font=font(int(tsize * .5), False), fill=(214, 240, 230))
    imgs = [phone_img(s, ph_h) for s in shots]
    gap = int(W * .03)
    total = sum(i.width for i in imgs) + gap * (len(imgs) - 1)
    if total > W * .90:                       # co lại cho vừa khung, không bị cắt
        k = W * .90 / total
        ph_h = int(ph_h * k)
        imgs = [phone_img(s, ph_h) for s in shots]
        total = sum(i.width for i in imgs) + gap * (len(imgs) - 1)
    y_ph = int(H * .17) + (H - int(H * .17) - ph_h) // 2 - int(H * .02)
    x = (W - total) // 2
    for i in imgs:
        paste_phone(bg, i, x, y_ph)
        x += i.width + gap
    bg.save(f"{OUT}\\{name}_{W}x{H}.png", optimize=True)
    print(name, bg.size, os.path.getsize(f"{OUT}\\{name}_{W}x{H}.png") // 1024, "KB")

# 1:1 màn hình mở
make("fold_1x1_mo", 2000, 2000, "Tra cứu giá đất TP.HCM", "Tìm đường • Xem đoạn • Tính theo diện tích",
     ["01_Tra_cuu_TPHCM.png", "03_Chi_tiet.png", "04_Tinh_dien_tich.png"], 1420, 440, 112)
# 4:3 màn hình mở (ngang)
make("fold_4x3_mo", 2400, 1800, "Tra cứu giá đất TP.HCM", "Bảng giá đất TP.HCM, Bình Dương, Bà Rịa - Vũng Tàu",
     ["01_Tra_cuu_TPHCM.png", "02_Tim_kiem.png", "03_Chi_tiet.png", "04_Tinh_dien_tich.png"], 1180, 460, 110)
# 10:16 màn hình ngoài (dọc)
make("fold_10x16_ngoai", 1200, 1920, "Tra cứu giá đất", "Tìm đường, xem đoạn, tính theo diện tích",
     ["03_Chi_tiet.png"], 1480, 330, 92)
# 3:4 dọc (tùy chọn)
make("fold_3x4_mo", 1500, 2000, "Giá đất TP.HCM", "Tra cứu nhanh theo phường / xã",
     ["01_Tra_cuu_TPHCM.png", "04_Tinh_dien_tich.png"], 1400, 450, 104)
