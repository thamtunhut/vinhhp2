# PSD View

Ứng dụng HTML chỉ để xem file Photoshop trên máy: ảnh gộp, cây layer, ảnh riêng của từng layer, kích thước, hệ màu, độ sâu màu, nội dung text và font được lưu trong PSD. File không được tải lên máy chủ và không bị sửa.

## Sử dụng trên Windows

1. Mở [index.html](index.html) bằng Edge hoặc Chrome. Có thể nhấp đúp file trong Explorer.
2. Bấm **Mở file PSD** hoặc kéo thả `.psd` / `.psb` vào cửa sổ.
3. Chọn một layer ở cột trái. Bấm **Layer riêng** để xem ảnh của layer đó. Dùng **Chi tiết** và **Fonts** ở cột phải để xem metadata.

Hai biểu tượng bảng ở hai đầu thanh công cụ thu gọn hoặc mở lại **Layers** và **Chi tiết** để dành chỗ cho ảnh. Zoom bằng nút **− / +**, nhập trực tiếp tỷ lệ phần trăm (2–3200%), cuộn chuột trên ảnh, hoặc dùng **Ctrl + − / +**. **Vừa khung** hay **Ctrl + 0** sẽ căn lại ảnh. Khi ảnh lớn hơn vùng xem, kéo ảnh để di chuyển.

Toàn bộ thư viện JavaScript đã nằm trong thư mục này, nên sau khi tải repo về, ứng dụng chạy offline. Không cần cài Photoshop, Python hay Node.js.

## Giới hạn hiện tại

- Ảnh tổng là ảnh gộp đã lưu trong PSD. Nếu file không có ảnh gộp, app không tự kết xuất lại toàn bộ hiệu ứng/layer như Photoshop.
- Bộ đọc ảnh hỗ trợ Bitmap, Grayscale, Indexed và RGB. Với CMYK, Lab, Multichannel hoặc Duotone, app chỉ đọc được thông tin cơ bản từ header và báo không hỗ trợ xem ảnh/layer.
- Font chỉ được liệt kê khi metadata của text layer chứa tên font. Danh sách này không xác nhận font đã cài trên Windows.
- PSD/PSB rất lớn có thể dùng nhiều bộ nhớ hoặc đọc chậm. Bộ đọc đặt giới hạn bộ nhớ mặc định 2 GB.
- Đây là trình xem chỉ đọc. Ứng dụng không có nút lưu hoặc chức năng chỉnh sửa PSD.

## Thành phần bên thứ ba

`ag-psd.bundle.js` là [ag-psd 31.0.2](https://www.npmjs.com/package/ag-psd), giấy phép MIT trong [AG_PSD_LICENSE.txt](AG_PSD_LICENSE.txt).
