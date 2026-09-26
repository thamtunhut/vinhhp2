# PSD View — hướng dẫn làm việc trong repo

## Mục tiêu và phạm vi

- Đây là ứng dụng HTML/JavaScript chạy ngay trong Edge hoặc Chrome trên Windows để **xem** PSD/PSB. Không có chức năng sửa hoặc lưu lại file Photoshop.
- File được chọn bằng File API hoặc kéo thả, rồi đọc trong tab trình duyệt. Hiện không có backend, API, tài khoản, quá trình upload hay bước build.
- Ưu tiên giữ ứng dụng chạy offline bằng cách mở `index.html` trực tiếp. Đừng thêm phụ thuộc mạng cho luồng xem file nếu không thật cần thiết.
- Giao diện hiện dùng tiếng Việt và tập trung diện tích cho ảnh. Giữ hai bảng Layers/Chi tiết có thể ẩn độc lập, thanh thông tin trên cùng gọn, và thao tác zoom/pan dễ dùng.

## Bản đồ file hiện tại

| File | Vai trò |
| --- | --- |
| `index.html` | Điểm vào; cấu trúc ba cột, thanh công cụ, trình chọn file, nạp CSS và JavaScript. |
| `app.js` | Toàn bộ trạng thái ứng dụng, đọc PSD, dựng cây layer, metadata, font, ảnh xem trước, zoom/pan và sự kiện UI. |
| `styles.css` | Kiểu giao diện nền, hiện được viết gọn trên một dòng. |
| `enhancements.css` | Các lớp kiểu ghi đè cho bảng ẩn/hiện, zoom, thanh trên và bố cục đáp ứng. File này được nạp sau `styles.css`. |
| `ag-psd.bundle.js` | Bản thư viện ag-psd 31.0.2 đã đưa vào repo để chạy offline. Giấy phép ở `AG_PSD_LICENSE.txt`. |
| `README.md` | Hướng dẫn người dùng và giới hạn tính năng. |
| `KV.psd` | File PSD thực tế, lớn khoảng 399 MB, có 422 layer trong lần kiểm tra gần nhất. Xem là dữ liệu người dùng; không sửa, ghi đè, nén lại hoặc đưa lên dịch vụ ngoài. |

Repo hiện không có `package.json`, bộ test tự động hay thư mục `.git`. Kiểm tra lại tình trạng này trước khi viết hướng dẫn hoặc chọn quy trình phát triển mới.

## Luồng đọc và giới hạn kỹ thuật

1. `openFile()` trong `app.js` đọc `File.arrayBuffer()`. `headerFrom()` kiểm tra chữ ký `8BPS` rồi đọc phiên bản, kích thước, số kênh, độ sâu và hệ màu từ 26 byte đầu.
2. `agPsd.readPsd(buffer, { useRawData: true, skipThumbnail: true })` đọc cây layer và metadata, giữ dữ liệu ảnh thô để giải mã khi xem. `getCompositeCanvas()` lấy ảnh gộp; `getLayerCanvas()` lấy ảnh layer được chọn.
3. Cây layer hỗ trợ nhóm, tìm kiếm và chọn layer. Text và font lấy từ metadata `layer.text.style` / `styleRuns`; tên font trong PSD **không** chứng minh font đã cài trên Windows.
4. Ảnh tổng là ảnh gộp lưu trong file. App không tự kết xuất lại toàn bộ hiệu ứng, blend và layer như Photoshop.
5. Bộ đọc ảnh hiện hỗ trợ Bitmap, Grayscale, Indexed và RGB. Khi thư viện không đọc được hệ màu như CMYK/Lab/Multichannel/Duotone, app chỉ hiển thị thông tin header và thông báo giới hạn; đừng trình bày đó là xem đầy đủ file.
6. File lớn có thể ngốn nhiều RAM. Giữ cách giải mã ảnh theo nhu cầu; tránh giải mã trước toàn bộ ảnh layer hoặc tạo thêm nhiều bản sao của buffer/canvas. Thư viện hiện đặt giới hạn bộ nhớ đọc mặc định 2 GB.

## Quy ước khi phát triển tiếp

- Đọc checkout và `README.md` hiện tại trước khi sửa; đừng dựa vào giả định từ repo khác hoặc phiên bản cũ.
- Giữ luồng xem chỉ đọc. Không thêm thao tác ghi PSD, gửi file ra mạng hay phụ thuộc Photoshop khi người dùng chưa yêu cầu.
- Dữ liệu từ PSD như tên layer, nội dung text và tên font là dữ liệu không tin cậy. Đưa vào DOM bằng `textContent` hoặc hàm escape `html()` đang dùng; không nối thẳng vào `innerHTML`.
- Nếu thay thư viện, ghi rõ phiên bản, nguồn và giấy phép; cập nhật `README.md` cùng các giới hạn thật sự của phiên bản mới. Không sửa trực tiếp bundle bên thứ ba để triển khai tính năng ứng dụng.
- Khi chỉnh giao diện, kiểm tra cả trạng thái chưa mở file, đã mở file, một hoặc hai bảng bị ẩn, zoom vừa khung và zoom lớn cần kéo ảnh. Giữ nhãn truy cập (`aria-label`, `aria-expanded`, `aria-controls`) cho nút biểu tượng.
- Phân biệt kiểm tra với PSD mẫu tự tạo và kiểm tra với file Photoshop thực tế. Không tuyên bố đã kiểm tra một loại file/tính năng khi chưa mở nó.

## Chạy và kiểm tra

- Người dùng chỉ cần mở `index.html` trong Edge/Chrome. Nếu cần server cục bộ để thử trong trình duyệt tự động, có thể chạy `python -m http.server 8765 --bind 127.0.0.1`; đây không phải thành phần của ứng dụng.
- Sau khi sửa JavaScript, chạy `node --check app.js` để bắt lỗi cú pháp.
- Khi sửa luồng đọc hoặc giao diện chính, thử mở PSD mẫu nhỏ trước, rồi mở `KV.psd` nếu cần xác nhận với file thực tế. Kiểm tra ảnh tổng, số layer, font/metadata, hai nút ẩn/hiện và zoom. Không dùng `KV.psd` như đầu ra thử nghiệm.
