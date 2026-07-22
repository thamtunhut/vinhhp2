# Dự án: Main-site (LINK_HUB)

## Tổng quan
Dashboard cá nhân dạng hub tổng hợp các công cụ tiện ích web do VinhHP2 phát triển.
**Kiến trúc: Multi-page** — mỗi tool là file HTML riêng biệt, `index.html` chỉ là hub điều hướng.
Không có backend, không có build system, không có npm. Deploy lên GitHub Pages + custom domain.

## Công nghệ sử dụng

| Thành phần | Chi tiết |
|---|---|
| Ngôn ngữ | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| CSS Framework | Tailwind CSS (CDN) — chỉ dùng trong `index.html` và `vnd.html` |
| Icon & Font | Google Fonts (Space Grotesk, Inter), Material Symbols Outlined |
| Thư viện QR | QRCode.js v1.0.0 (CDN: `cdnjs.cloudflare.com`) |
| Browser APIs | Clipboard API, Canvas API, FileReader API |
| Build System | **Không có** |
| Hosting | GitHub Pages — `https://thamtunhut.github.io/vinhhp2/` |
| Custom Domain | `https://vinhhp2.site/` |
| Repo | `https://github.com/thamtunhut/vinhhp2` |

## Cấu trúc thư mục

```
D:\Repo\Main-site/
├── index.html      (~270 dòng) — Hub dashboard, chỉ chứa UI điều hướng
├── QR.html         (~850 dòng) — QR Generator standalone
├── vnd.html        (~320 dòng) — VND Converter standalone
├── thumbnail.png              — OG image dùng cho social sharing
└── CLAUDE.md                  — File này
```

## Kiến trúc & Luồng điều hướng

```
index.html  (Hub)
  → <a href="QR.html">   OPEN  → QR.html   (QR Generator)
  → <a href="vnd.html">  OPEN  → vnd.html  (VND Converter)

QR.html  → <a href="index.html"> ← LINK_HUB
vnd.html → <a href="index.html"> ← LINK_HUB
```

**Không dùng SPA / view switching.** Mỗi trang là file HTML độc lập, điều hướng bằng `<a href>` thông thường.

## Cấu trúc từng file

### `index.html` — Hub dashboard
- Tailwind CSS CDN + custom theme (cyan accent, Space Grotesk, Inter)
- `<style>`: body dark `#0a0a0c`, `.glass-card`, `.neon-glow`, `#bg-canvas`
- Sidebar desktop + mobile bottom nav: dùng `<a href="QR.html">`, `<a href="vnd.html">`
- Cards: nút OPEN là `<a href="...">` (không phải button onclick)
- Open Graph meta tags: `og:title`, `og:description`, `og:image` (thumbnail.png), `og:url`
- `<canvas id="bg-canvas">` + particle network JS ở cuối file

### `QR.html` — QR Code Generator
- CSS thuần (không dùng Tailwind) — dark theme với CSS variables `--accent: #00f2ff`
- Google Fonts: Space Grotesk + Inter
- Back button: `<a href="index.html">` fixed top-left, cyan styled
- `<canvas id="bg-canvas">` + particle network JS
- Logic QR: QRCode.js → `buildFinalCanvas()` (2 bước: render thô → composite border + logo)
- **Logo overlay**: toggle bật/tắt nền logo + color picker để chọn màu nền
- JS IDs quan trọng: `qr-input`, `qr-size`, `qr-border`, `fg-color`, `bg-color`, `logo-upload-area`, `overlay-toggle`, `overlay-color`, `btn-generate`, `btn-download`, `btn-reset`

### `vnd.html` — Currency to Words (VND / USD)
- Tailwind CSS CDN + Google Fonts: Space Grotesk + Inter
- Dark glass card: inline style `background:rgba(14,18,26,.96)`, cyan border
- Back button: `<a href="index.html">` fixed top-left, cyan styled
- START button: cyan `#00f2ff`, text `#002022`
- `<canvas id="bg-canvas">` + particle network JS
- **Mode toggle** `#modeToggle` (`.mode-toggle-btn`, mặc định `vnd`): chuyển đổi giữa đọc số VND và USD, biến `currentMode` quyết định `handleAction()` gọi hàm convert nào
- **VND language toggle** `#vndLangSection` / `#vndLangToggle` (`.format-toggle-btn`): chỉ hiện khi `currentMode === "vnd"` (mặc định hiện sẵn vì VND là mode mặc định), cho chọn đọc số VND bằng tiếng Việt (`vi`, mặc định) hay tiếng Anh (`en`), biến `vndLang` dùng trong `handleAction()` để chọn `convertNumberToVietnameseWords()` hay `convertNumberToVNDEnglishWords()`
- **USD format toggle** `#usdFormatSection` / `#usdFormatToggle` (`.format-toggle-btn`): chỉ hiện khi `currentMode === "usd"`, cho chọn kiểu nhập số — `1,234.56` (US, mặc định, phẩy=nghìn/chấm=thập phân) hoặc `1.234,56` (EU, chấm=nghìn/phẩy=thập phân), biến `usdFormat` dùng trong `convertNumberToUSDWords()` để chuẩn hoá input trước khi parse
- Logic VND: BigInt arithmetic — **không đổi sang Number** (mất precision > 15 chữ số); parse bằng `replace(/[^0-9]/g, "")` nên `1,234,567` và `1.234.567` được hiểu giống nhau (cả dấu phẩy lẫn dấu chấm đều bị strip)
- Các hàm dựng số tiếng Anh dùng chung (`onesEn`, `tensEn`, `scaleEn`, `twoDigitWordsEn()`, `blockWordsEn()`, `integerWordsEn()`) — tham số `andMode` của `blockWordsEn()`/`integerWordsEn()` có 3 giá trị: `"always"` (luôn chèn "And" sau hàng trăm), `"never"` (không bao giờ), `"teens"` (chỉ chèn khi phần còn lại là số 1 từ 0-19, vd "five hundred and fifteen" nhưng "five hundred fifty-five" thì không)
- Logic USD (`convertNumberToUSDWords()`): tách phần dollars (BigInt) + cents (0-99) từ input đã chuẩn hoá; **Title Case toàn bộ** trong mọi trường hợp:
  - Cent = 0: `andMode="always"`, kết thúc `US Dollar`/`US Dollars` — vd `Twelve Thousand Five Hundred And Eleven US Dollars`
  - Cent ≠ 0: `andMode="never"`, cụm chục-đơn vị nối bằng dấu gạch ngang, kết thúc `Dollar(s) And <cents> Cent(s)` — vd `Two Thousand Three Hundred Thirteen Dollars And Eighty-Eight Cents`
  - Số ít khi bằng 1: `One US Dollar`, `One Dollar`, `One Cent`
  - Giới hạn phần nguyên 18 chữ số, giống VND (`intPart.length > 18` → lỗi)
- Logic VND-tiếng-Anh (`convertNumberToVNDEnglishWords()`): dùng `andMode="teens"`, sentence case (chỉ hoa chữ đầu câu, phần còn lại lowercase), kết thúc cố định `Vietnam Dong` (giữ hoa vì là danh từ riêng) — vd `Twenty-five million five hundred and fifteen thousand Vietnam Dong`; cùng giới hạn 18 chữ số
- MessageBox: JS thêm Tailwind classes `bg-green-50`/`bg-red-50` — được CSS override sang dark version

## Particle Network Background (dùng chung cả 3 file)

Mỗi file có `<canvas id="bg-canvas">` và IIFE JS particle network **giống hệt nhau** ở cuối file.

**Tính năng:**
- Các chấm cyan di chuyển và kết nối với nhau khi đủ gần (`MAX_DIST = 140`)
- **Mouse repel**: chấm tránh xa con trỏ (`MOUSE_DIST = 180`)
- **Gradient lines**: đường sáng nối từ cursor đến chấm lân cận
- **Click ripple**: sóng lan tỏa khi click, đẩy các chấm ra xa
- **Cursor glow**: chấm cyan nhỏ tại vị trí con trỏ

**Lưu ý khi sửa particle script**: script này trùng lặp trong cả 3 file — sửa thì phải sửa đồng bộ cả 3.

## Thêm tool mới — checklist

1. Tạo file `TENTOOLS.html` mới (copy cấu trúc từ `vnd.html` làm template)
2. Thêm card vào grid trong `index.html` (copy pattern card hiện tại)
3. Đổi link OPEN: `<a href="TENTOOLS.html">`
4. Thêm nav item vào sidebar và mobile bottom nav trong `index.html`
5. Thêm back button `<a href="index.html">` vào `TENTOOLS.html`
6. Thêm particle network canvas + script vào `TENTOOLS.html`
7. Push lên GitHub

## Quy tắc bất biến

- **KHÔNG** tạo file JS/CSS riêng — mỗi tool tự chứa HTML/CSS/JS trong 1 file
- **KHÔNG** dùng npm, build tools, hay framework nào ngoài Tailwind CDN
- **KHÔNG** thêm backend — mọi xử lý phải client-side
- **KHÔNG** sửa logic/chức năng của tool khi chỉ cần sửa UI

## Cài đặt & Chạy local

```bash
# Mở trực tiếp (QR hoạt động, VND clipboard có thể lỗi):
start index.html

# Dùng local server (cần cho VND Clipboard API):
npx serve .
# Truy cập: http://localhost:3000
```

> **Lưu ý:** VND Clipboard API chỉ hoạt động trên HTTPS hoặc localhost.

## Deploy lên GitHub

```bash
git add .
git commit -m "mô tả thay đổi"
git push
# GitHub Pages tự động deploy sau ~30 giây
```

## Trạng thái hiện tại

**Đang hoạt động:**
- ✅ Hub dashboard — responsive, sidebar desktop + mobile nav, particle background
- ✅ QR Generator — dark theme, tạo QR, overlay logo (toggle + color picker), download PNG
- ✅ Currency to Words — dark theme, toggle VND/USD (mặc định VND), VND hỗ trợ đọc tiếng Việt/tiếng Anh, USD hỗ trợ 2 định dạng số (`1,234.56` / `1.234,56`), paste số → convert → copy chữ
- ✅ Particle network — mouse repel, gradient lines, click ripple, cursor glow (cả 3 trang)
- ✅ Custom domain — `https://vinhhp2.site/`
- ✅ Open Graph — thumbnail hiển thị khi share link trên Zalo/mạng xã hội

**Hạn chế đã biết:**
- VND Clipboard API không hoạt động trên `file://`
- Tailwind + QRCode.js + Google Fonts cần kết nối internet (CDN)
- Particle script bị trùng lặp trong 3 file — sửa phải sync tay

## Ghi chú kỹ thuật quan trọng

- **QR pipeline 2 bước**: QRCode.js render canvas thô → `buildFinalCanvas()` composite border + logo + bg color. Không sửa một bước mà không hiểu cả pipeline
- **Logo overlay toggle**: `#overlay-toggle` (checkbox) + `#overlay-color` (color input) — `overlayLogo()` kiểm tra `overlayToggle.checked` trước khi vẽ nền
- **VND BigInt**: toàn bộ số học dùng `BigInt` — không đổi sang `Number`
- **USD parsing**: `usdFormat === "eu"` thì bỏ hết dấu chấm (phân cách nghìn) rồi đổi dấu phẩy còn lại thành dấu chấm thập phân, trước khi tách `dollars`/`cents` — sửa `convertNumberToUSDWords()` phải test cả 2 format
- **VND/USD messageBox**: JS thêm class Tailwind light (`bg-green-50`, `text-green-800`...) — CSS override bằng `!important` sang màu dark tương ứng
- **CSS variables QR**: `--accent: #00f2ff`, `--card-bg`, `--input-bg`, `--text`, v.v. — thay đổi màu sắc QR tool qua đây
- **Particle canvas z-index**: `z-index: 0`, `pointer-events: none` — content phải có `position: relative; z-index: 1` để nổi trên canvas

## Ngữ cảnh nghiệp vụ
- Tool nội bộ cá nhân của VinhHP2, deploy GitHub Pages
- Currency-to-words tool phục vụ đọc số tiền VND/USD (kế toán/tài chính)
- QR tool có overlay logo cho branding
