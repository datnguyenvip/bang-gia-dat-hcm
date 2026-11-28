"""Trích dữ liệu từ các phụ lục Excel -> app/data/data.json (đơn vị: 1.000 đ/m2).
Đặt file xlsx vào raw/<thư mục>/ rồi chạy: python tools/extract.py"""
import openpyxl, glob, json, re, os, sys, unicodedata

def num(v):
    if isinstance(v, (int, float)): return v
    if isinstance(v, str):
        s = v.strip().replace(" ", "")
        if re.fullmatch(r"\d{1,3}(\.\d{3})+", s): return float(s.replace(".", ""))
        if re.fullmatch(r"[\d,]+", s):
            try: return float(s.replace(",", "."))
            except ValueError: return None
    return None

def txt(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v not in (None, "") else ""

OUT = "app/data/data.json"
DRY = "--dry" in sys.argv
FORCE = "--force" in sys.argv
files = sorted(glob.glob("raw/*/*.xlsx"))
if not files:
    sys.exit("LỖI: không tìm thấy file Excel nào trong raw/*/*.xlsx -> KHÔNG ghi đè " + OUT)
areas = []
bad = []   # dòng có dữ liệu nhưng không đọc được giá
for f in files:
    b = unicodedata.normalize("NFC", os.path.basename(f)).upper().replace("Ụ", "U")
    region = ("TP.HCM (cũ)" if re.match(r"PHU LUC II[^I]", b) else
              "Bình Dương (cũ)" if b.startswith("PHU LUC III") else
              "Bà Rịa - Vũng Tàu (cũ)" if b.startswith("PHU LUC IV") else "Khu công nghệ cao")
    wb = openpyxl.load_workbook(f, read_only=True, data_only=True)
    for ws in wb:
        rows = list(ws.iter_rows(values_only=True))
        hi = next((i for i, r in enumerate(rows[:15]) if r and any("TÊN ĐƯỜNG" in txt(c).upper() for c in r if c)), None)
        if hi is None: continue
        title = re.sub(r"^\s*\d+\s*[.\-]\s*", "", txt(ws.title))
        out = []; group = ""
        for ri, r in enumerate(rows[hi + 1:], start=hi + 2):
            r = list(r) + [None] * 8
            name = txt(r[1])
            if not name or name.startswith("("): continue
            p = [num(r[4]), num(r[5]), num(r[6])]
            if all(x is None for x in p):
                # tiêu đề nhóm chỉ khi các ô giá đều trống; ô giá có chữ/số lạ -> báo lỗi, không biến thành tên nhóm
                if any(txt(r[k]) for k in (4, 5, 6)):
                    bad.append(f"{os.path.basename(f)} | {ws.title} | dòng {ri}: {name} | giá đọc không được: {[txt(r[k]) for k in (4,5,6)]}")
                    continue
                group = name; continue
            if any(x is None for x in p):
                bad.append(f"{os.path.basename(f)} | {ws.title} | dòng {ri}: {name} | thiếu một phần giá {p}")
            out.append([name, txt(r[2]), txt(r[3]), *p, group])
        if out:
            areas.append({"id": len(areas), "name": title, "region": region, "rows": out})
print(len(areas), "khu vực,", sum(len(a["rows"]) for a in areas), "dòng")
if bad:
    print(f"CẢNH BÁO: {len(bad)} dòng lỗi giá:")
    for b in bad[:50]: print("  -", b)
regions = {a["region"] for a in areas}
if len(regions) < 4 and not FORCE:
    sys.exit(f"LỖI: chỉ có {len(regions)}/4 vùng dữ liệu (thiếu nguồn?) -> KHÔNG ghi đè. Dùng --force nếu đúng ý.")
if os.path.exists(OUT) and not FORCE:
    try:
        old = json.load(open(OUT, encoding="utf-8"))
        if len(areas) < 0.9 * len(old):
            sys.exit(f"LỖI: số khu vực giảm {len(old)} -> {len(areas)} -> KHÔNG ghi đè. Dùng --force nếu đúng ý.")
    except ValueError:
        pass
if DRY:
    sys.exit("--dry: không ghi file.")
os.makedirs("app/data", exist_ok=True)
tmp = OUT + ".tmp"
with open(tmp, "w", encoding="utf-8") as fp:
    json.dump(areas, fp, ensure_ascii=False, separators=(",", ":"))
os.replace(tmp, OUT)
print("Đã ghi", OUT)
