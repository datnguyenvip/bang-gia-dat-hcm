"""Trích dữ liệu từ các phụ lục Excel -> app/data/data.json (đơn vị: 1.000 đ/m2).
Đặt file xlsx vào raw/<thư mục>/ rồi chạy: python tools/extract.py"""
import openpyxl, glob, json, re, os, unicodedata

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

areas = []
for f in sorted(glob.glob("raw/*/*.xlsx")):
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
        for r in rows[hi + 1:]:
            r = list(r) + [None] * 8
            name = txt(r[1])
            if not name or name.startswith("("): continue
            p = [num(r[4]), num(r[5]), num(r[6])]
            if all(x is None for x in p):
                group = name; continue
            out.append([name, txt(r[2]), txt(r[3]), *p, group])
        if out:
            areas.append({"id": len(areas), "name": title, "region": region, "rows": out})
print(len(areas), sum(len(a["rows"]) for a in areas))
os.makedirs("app/data", exist_ok=True)
with open("app/data/data.json", "w", encoding="utf-8") as fp:
    json.dump(areas, fp, ensure_ascii=False, separators=(",", ":"))
