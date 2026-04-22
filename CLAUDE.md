# Dự án: Main-site (LINK_HUB)

## Tổng quan
Dashboard cá nhân dạng hub tổng hợp các công cụ tiện ích web do VinhHP2 phát triển. Project là một **Single-Page Application (SPA) thuần HTML/CSS/JS trong một file duy nhất** — không có backend, không có build system, không có npm. Deploy lên GitHub Pages.

Khi có tool mới: thêm card vào hub và thêm view mới trong `index.html`, sau đó push lên GitHub.

## Công nghệ sử dụng

| Thành phần | Chi tiết |
|---|---|
| Ngôn ngữ | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| CSS Framework | Tailwind CSS (CDN) với plugins `forms`, `container-queries` |
| Icon & Font | Google Fonts (Space Grotesk, Inter), Material Symbols Outlined |
| Thư viện QR | QRCode.js v1.0.0 (CDN: `cdnjs.cloudflare.com`) |
| Browser APIs | Clipboard API, Canvas API, FileReader API |
| Build System | **Không có** |
| Hosting | GitHub Pages |

## Cấu trúc thư mục

```
D:\Repo\Main-site/
├── index.html   (~1100 dòng) — SPA duy nhất chứa tất cả
├── QR.html      (file gốc, giữ làm tham khảo)
├── vnd.html     (file gốc, giữ làm tham khảo)
└── CLAUDE.md    — File này
```

> `QR.html` và `vnd.html` là file gốc standalone. Logic và UI của chúng đã được **tích hợp hoàn toàn vào `index.html`**.

## Kiến trúc & Luồng dữ liệu

`index.html` là một SPA với 3 view, chuyển đổi bằng JS thuần:

```
View: #view-hub  (mặc định, dark theme)
  → onclick="showView('qr')"  → View: #view-qr  (purple gradient)
  → onclick="showView('vnd')" → View: #view-vnd  (light gray)

Mỗi view có nút "← LINK_HUB" → showView('hub')
```

**Cơ chế view switching:**
```javascript
function showView(name) {
  document.body.classList.remove('in-qr', 'in-vnd');
  if (name !== 'hub') document.body.classList.add('in-' + name);
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + name).classList.remove('hidden');
  window.scrollTo(0, 0);
}
```

Body class điều khiển background: mặc định = dark hub; `in-qr` = purple gradient; `in-vnd` = light gray.

## Cấu trúc bên trong index.html

### CSS (trong `<style>` duy nhất)
1. **Hub theme**: body dark, `.glass-card`, `.neon-glow`
2. **Back button**: `.back-btn` — fixed top-left, xuất hiện trong tool views
3. **QR tool CSS**: `:root` purple variables + `body.in-qr` overrides + tất cả QR classes (`.card`, `.card-header`, `.form-col`, `.preview-col`, v.v.)
4. **VND tool CSS**: `body.in-vnd` + `#view-vnd` layout

### HTML (3 views)
- `#view-hub` — Hub dashboard (header, sidebar, cards, mobile nav)
- `#view-qr` — QR Generator đầy đủ (back button + card)
- `#view-vnd` — VND Converter đầy đủ (back button + card)

### JavaScript (cuối file)
1. `showView(name)` — view switching
2. IIFE QR tool — toàn bộ logic QR (character counter, canvas, logo overlay, download)
3. IIFE VND tool — toàn bộ logic VND (readThreeDigits, convertNumberToVietnameseWords, handleAction)

## Các file quan trọng

### `index.html` — điểm duy nhất cần chỉnh sửa
- **Hub cards**: tìm comment `<!-- Card: QR Generator -->` và `<!-- Card: VND Converter -->` để thêm card mới
- **Views**: thêm `<div id="view-TENTOOLS" class="view hidden">` sau view cuối cùng
- **Back button trong view mới**: `<button class="back-btn" onclick="showView('hub')">← LINK_HUB</button>`
- **Body class cho background tool mới**: thêm `body.in-TENTOOLS { background: ...; }` vào CSS
- **showView()**: không cần sửa — tự động hoạt động với view id mới

## Cài đặt & Chạy project

```bash
# Không cần cài đặt gì. Mở trực tiếp:
start index.html

# Hoặc dùng local server (cần cho VND Clipboard API):
npx serve .
# Truy cập: http://localhost:3000
```

> **Lưu ý:** VND tool dùng Clipboard API — chỉ hoạt động trên HTTPS hoặc localhost. Mở `file://` sẽ lỗi quyền clipboard.

## Quy tắc phát triển

### Thêm tool mới — checklist:
1. Thêm card vào grid trong `#view-hub` (copy pattern card hiện tại, đổi `onclick="showView('TENTOOLS')"`)
2. Thêm `<div id="view-TENTOOLS" class="view hidden">` với back button
3. Thêm CSS cho background: `body.in-TENTOOLS { background: ...; background-image: none; }`
4. Thêm JS logic vào IIFE ở cuối file (hoặc IIFE riêng)
5. Thêm nav item vào sidebar (desktop) và mobile bottom nav

### Quy tắc bất biến:
- **KHÔNG** tạo file JS/CSS riêng — tất cả ở trong `index.html`
- **KHÔNG** dùng npm, build tools, hay framework nào ngoài Tailwind CDN
- **KHÔNG** thêm backend — mọi xử lý phải client-side
- QR.html và vnd.html chỉ giữ làm backup tham khảo, không deploy riêng

### CSS:
- Hub dùng Tailwind utility class + custom classes trong `<style>`
- Tailwind config tùy chỉnh khai báo trong `<script id="tailwind-config">`
- CSS tool mới nên scope vào `body.in-TENTOOLS` để tránh conflict

## Trạng thái hiện tại

**Đang hoạt động:**
- ✅ Hub dashboard — responsive, sidebar desktop + mobile nav
- ✅ QR Generator — tạo QR, overlay logo, download PNG — STABLE
- ✅ VND Converter — paste số → convert → copy chữ — STABLE
- ✅ View switching — chuyển tab mượt, back button, body class override

**Hạn chế đã biết:**
- VND Clipboard API không hoạt động trên `file://`
- Tailwind + QRCode.js cần kết nối internet (CDN)
- `index.html` sẽ ngày càng lớn khi thêm tool — chấp nhận được cho personal project

## Thay đổi gần nhất

- **Tích hợp QR.html và vnd.html vào index.html** — tạo SPA một file duy nhất
- View switching bằng `showView()` + body class mechanism
- Sidebar có 3 nav items: Dashboard / QR Generator / VND Converter
- Mobile bottom nav: Dash / QR / VND
- OPEN buttons trong hub cards hoạt động (trước đây là `<button>` không có action)
- Cập nhật System Metrics: "Tools: 2 ACTIVE", "Hosting: GITHUB"
- Xóa `tools.json` và `api.php` (không còn cần admin system)

## TODO / Việc cần làm tiếp

- [ ] Khởi tạo git và push lên GitHub
- [ ] Cấu hình GitHub Pages (Settings → Pages → main branch)
- [ ] Thêm tool mới khi có nhu cầu (edit trực tiếp index.html)
- [ ] Cân nhắc thêm URL hash routing (`#qr`, `#vnd`) để share link tool cụ thể

## Ghi chú quan trọng cho Claude

### Khi thêm tool mới
Tool mới nên là một view độc lập (`#view-TENTOOLS`) với:
- Back button `.back-btn`
- Background riêng qua `body.in-TENTOOLS` class
- JS logic trong IIFE riêng để tránh conflict biến

### Kỹ thuật quan trọng
- **QR pipeline 2 bước**: QRCode.js render canvas thô → `buildFinalCanvas()` composite border + logo + bg color. Đừng sửa một bước mà không hiểu cả pipeline
- **VND dùng BigInt**: đừng đổi sang Number thông thường (mất precision > 15 chữ số)
- **CSS select {}**: selector global trong QR CSS — nếu thêm `<select>` vào hub sẽ bị ảnh hưởng bởi QR styles (màu tím). Cần scope nếu xảy ra
- **body.classList**: `showView()` dùng `classList.remove('in-qr', 'in-vnd')` — nếu thêm tool mới phải thêm class của nó vào dòng remove này

### Ngữ cảnh nghiệp vụ
- Đây là tool nội bộ cá nhân của VinhHP2, deploy GitHub Pages
- VND tool phục vụ đọc số tiền (kế toán/tài chính)
- QR tool có overlay logo cho branding
