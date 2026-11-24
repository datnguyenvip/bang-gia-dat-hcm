# Bảng giá đất TP.HCM

App tra cứu giá đất (Capacitor, web trong `app/`). Build bằng GitHub Actions.

## GitHub Secrets cần thêm (Settings → Secrets and variables → Actions)

**Android** (nếu bỏ trống sẽ ký bằng debug keystore để thử):
- `ANDROID_KEYSTORE_BASE64` – `base64 -w0 release.jks` (Windows: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks"))`)
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`

**iOS:**
- `IOS_CERT_P12_BASE64` – chứng chỉ Distribution `.p12` mã hóa base64
- `IOS_CERT_PASSWORD` – mật khẩu `.p12`
- `IOS_PROVISION_PROFILE_BASE64` – file `.mobileprovision` mã hóa base64

Bundle ID, Team ID và tên profile được workflow tự đọc từ provisioning profile.

**Variables (tuỳ chọn):** `APP_ID` (Android applicationId), `IOS_EXPORT_METHOD` (`app-store-connect` | `ad-hoc` | `release-testing`; mặc định `app-store-connect`).

## Chạy
Actions → *Build Android* / *Build iOS* → Run workflow. Tải file ở mục Artifacts.

## Cập nhật dữ liệu
Đặt Excel vào `raw/<thư mục>/` rồi chạy `python tools/extract.py`.
