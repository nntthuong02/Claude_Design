# Local Design Canvas

Canvas local giống Figma để xem các thiết kế UI do Claude Code sinh ra. Claude đọc context từ các dự án khác trên máy để hiểu design system, rồi tạo thiết kế chuẩn hơn. UI được ghi vào một thư mục output riêng, tách biệt với dự án.

## Cài đặt

```bash
npm install
```

## Chạy

```bash
npm run dev
```

Lệnh này chạy song song:
- **Server** (cổng 4321): API + theo dõi file + live-reload.
- **Canvas** (cổng 5175): tự mở trình duyệt hiện lưới thiết kế.

Khi Claude tạo/sửa file trong thư mục output, canvas tự reload — thẻ vừa đổi sẽ nháy sáng.

## Quy trình

1. Sửa `design.config.json`, trỏ `contextProjects[].path` tới (các) dự án bạn muốn Claude tham chiếu design system.
2. Trong Claude Code (mở tại thư mục này), chạy:
   ```
   /design màn hình đăng nhập với email + mật khẩu, nút Google
   ```
3. Claude đọc context → sinh HTML vào `designs/` → canvas hiện ngay.
4. Yêu cầu Claude chỉnh sửa cho tới khi ưng ("đổi màu nút thành xanh lá", "thêm phần footer"...).
5. Khi hài lòng, bảo Claude áp thiết kế vào dự án thật (bước này Claude chỉ làm khi bạn yêu cầu rõ ràng).

## Prompt thẳng trên canvas (không cần gõ trong terminal)

Canvas có ô nhập prompt ngay trên đầu. Gõ mô tả UI → Enter → prompt được đẩy vào hàng đợi `prompts/inbox.jsonl`. Để Claude tự nhận và xử lý, mở phiên Claude Code tại thư mục này và bảo:

```
Theo dõi prompts/inbox.jsonl. Mỗi khi có prompt pending mới, chạy /design với nội dung đó rồi đánh dấu đã xử lý.
```

Claude sẽ dùng Monitor chạy `prompts/watch.sh` — mỗi prompt bạn gửi từ browser sẽ hiện lên phiên Claude như một thông báo, Claude sinh thiết kế, canvas tự cập nhật. Bạn ngồi hẳn trên trình duyệt, không cần quay lại terminal.

> Lưu ý: đây là cầu nối local — browser không gọi thẳng Claude được (Claude Code sống trong terminal). Cần một phiên Claude Code đang mở và đang theo dõi inbox thì prompt mới được xử lý.

### Gửi ảnh & path dự án qua canvas

- **Ảnh**: bấm nút 📎 để chọn ảnh, hoặc **dán (Ctrl/Cmd+V) ảnh chụp màn hình thẳng vào ô prompt**. Thumbnail hiện ngay, ảnh lưu vào `prompts/attachments/` và Claude đọc để clone/tham chiếu.
- **Path dự án**: gõ thẳng đường dẫn tuyệt đối vào ô prompt (vd: "thiết kế theo style ở /Users/ban/my-app"). Claude sẽ đọc thư mục đó. Hoặc thêm cố định vào `contextProjects` trong `design.config.json`.

### Chỉnh sửa trực tiếp một thiết kế

Click vào một thẻ để phóng to → dưới đáy modal có ô prompt riêng. Gõ yêu cầu chỉnh sửa (kèm ảnh nếu muốn) → prompt gửi về Claude **có đính kèm tên file đó**, nên Claude biết là sửa đúng file đã có (đọc file → chỉ đổi phần yêu cầu → ghi đè), không tạo file mới. Canvas tự cập nhật ngay khi Claude sửa xong.

### Khung chat 2 chiều với Claude

Góc phải dưới canvas có khung chat nhỏ. Mỗi prompt bạn gửi và mỗi phản hồi của Claude đều hiện ở đây thành một luồng hội thoại:

- Claude POST phản hồi về `/api/reply` → hiện bong bóng bên trái.
- Nếu Claude **hỏi lại** (`kind:"question"`), bong bóng được làm nổi bật và bạn **trả lời thẳng trong ô chat** — không cần quay lại terminal.
- Câu trả lời của bạn đi qua đúng luồng prompt, Claude nhận được và xử lý tiếp.

Nhờ vậy vòng lặp thiết kế diễn ra hoàn toàn trên trình duyệt: bạn yêu cầu → Claude làm/hỏi lại → bạn xem kết quả + trả lời → lặp lại.

### Chất lượng thị giác "Claude Design"

Mỗi task gửi từ canvas tự đính kèm `prompts/design-guidelines.md` — bộ quy tắc buộc Claude vẽ đẹp thay vì UI code thô:

- **Icon vẽ bằng SVG thật** (line icon kiểu Lucide/SF Symbols), tuyệt đối không dùng emoji làm icon.
- **Illustration bằng hình khối SVG + gradient**, không dùng emoji minh hoạ.
- **Chiều sâu**: shadow nhiều lớp, gradient mượt, viền mảnh, glass blur.
- **Animation tinh tế**: fade/slide-in, shimmer, pulse, progress ring, hover micro-interaction.
- **Typography & spacing** chuẩn hệ 4/8pt.

Sửa `prompts/design-guidelines.md` để tinh chỉnh phong cách chung. File này là nguồn chuẩn dùng cho cả lệnh `/design` trong terminal lẫn prompt từ browser.

## Vibe một dự án mới (từ con số 0)

Khi bắt đầu một dự án hoàn toàn mới, bạn chưa có design system để tham chiếu. Có 2 cách:

### Cách A — Để Claude tự tạo design system rồi bám theo

1. **Bỏ trống context**: mở `design.config.json`, để `contextProjects` là mảng rỗng:
   ```json
   { "outputDir": "designs", "contextProjects": [] }
   ```
   Không có context hợp lệ, Claude sẽ tự dựng một design system hiện đại, sạch và nói rõ nó dùng gì.

2. **Chốt "nguồn chân lý" ngay từ thiết kế đầu**: yêu cầu Claude tạo một trang style guide trước:
   ```
   /design style guide cho app quản lý chi tiêu: bảng màu, typography, nút, input, card, badge — phong cách tối giản, hiện đại
   ```
   File này (`designs/style-guide.html`) trở thành chuẩn cho mọi màn hình sau.

3. **Trỏ context về chính thư mục designs**: sau khi có style guide, sửa config để Claude bám theo nó ở các lần sau:
   ```json
   {
     "outputDir": "designs",
     "contextProjects": [
       {
         "name": "self",
         "path": ".",
         "notes": "Dự án mới. Bám theo style-guide.html làm chuẩn design system.",
         "include": ["designs/style-guide.html"]
       }
     ]
   }
   ```
   Từ đây mỗi `/design` mới sẽ đọc lại style guide và giữ nhất quán màu/font/component.

4. **Vibe tiếp các màn hình**: `/design màn hình danh sách giao dịch`, `/design form thêm chi tiêu`... Tất cả tự khớp style.

### Cách B — Mô tả vibe bằng lời, không cần style guide riêng

Nếu muốn nhanh, mô tả phong cách thẳng trong prompt và Claude giữ nhất quán qua các file:
```
/design landing page SaaS, phong cách: nền tối, accent tím, bo góc lớn, font Inter, nhiều khoảng trắng
```
Rồi các màn sau nhắc lại "giữ nguyên phong cách như landing page". Cách này linh hoạt nhưng kém ổn định hơn Cách A khi dự án lớn dần.

### Khi ưng ý → khởi tạo repo thật

Khi đã có bộ thiết kế hài lòng trong `designs/`, bảo Claude:
```
Tạo dự án <Next.js / Vite+React / ...> mới tại <đường dẫn>, chuyển các thiết kế trong designs/ thành component thật, tách design tokens (màu/font/spacing) ra tailwind.config.
```
Claude chỉ tạo/ghi vào đường dẫn dự án mới khi bạn yêu cầu rõ ràng — canvas này vẫn chỉ là nơi phác thảo.

## design.config.json

| Trường | Ý nghĩa |
|--------|---------|
| `outputDir` | Thư mục Claude ghi file UI (mặc định `designs`) |
| `contextProjects[].name` | Tên hiển thị trên canvas |
| `contextProjects[].path` | Đường dẫn tuyệt đối tới dự án khác trên máy |
| `contextProjects[].include` | Glob các file Claude nên đọc để hiểu design system |
| `contextProjects[].notes` | Ghi chú cho Claude về dự án đó |

Có thể thêm nhiều dự án context. Sửa file này, canvas cập nhật ngay không cần restart.

## Cấu trúc

```
server/index.js     API + chokidar watcher + SSE live-reload
canvas/             Vite + React app (grid, modal phóng to, viewport preset)
designs/            Nơi Claude ghi UI (HTML + Tailwind CDN)
.claude/commands/   Slash command /design
design.config.json  Cấu hình context + output
```
