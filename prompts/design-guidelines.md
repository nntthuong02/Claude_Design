# Design Guidelines — chất lượng "Claude Design"

Đây là chỉ dẫn BẮT BUỘC cho mọi thiết kế sinh từ canvas. Server tự đính kèm khi gửi task về Claude. Mục tiêu: thiết kế polished như Claude Design, không phải UI code thô.

## 1. Icon — vẽ SVG thật, KHÔNG emoji
- TUYỆT ĐỐI không dùng emoji (🏠🗑️✨🎬) làm icon giao diện hay illustration.
- Tự viết `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">` — phong cách line icon Lucide/SF Symbols.
- Nét đồng đều, bo tròn, cân đối. Nhiều icon thì gom `<symbol>` + `<use>`.

## 2. Illustration — hình khối SVG, không emoji
- "Ảnh mẫu" = `<div>` gradient tinh tế + overlay ánh sáng + chiều sâu, KHÔNG phải emoji 🏞️.
- Minh hoạ = blob/gradient mesh/hình khối bo tròn tự vẽ.

## 3. Chiều sâu & tinh tế
- Shadow nhiều lớp (layered), không shadow đen bệt.
- Gradient điểm dừng mượt; viền 1px màu nhạt; bo góc nhất quán theo scale.
- backdrop-blur cho hiệu ứng kính.

## 4. Typography
- Nạp font thật qua Google Fonts (Inter/Manrope/... hợp brand).
- Phân cấp rõ: cỡ, độ đậm, letter-spacing âm nhẹ ở tiêu đề lớn.

## 5. Animation tinh tế (bắt buộc có, không loè loẹt)
- `@keyframes`: fade/slide-in khi vào màn, shimmer skeleton, pulse loading, progress ring, hover micro-interaction.
- Ưu tiên transform/opacity. Có thể cho nền gradient dịch chuyển chậm.

## 6. Bố cục
- Spacing hệ 4/8pt, canh lề nhất quán, khoảng trắng thoáng, không nhồi nhét.

Mỗi màn phải nhìn như ảnh chụp từ app thật đã polish, sẵn sàng lên App Store.
