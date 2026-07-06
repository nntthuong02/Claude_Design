# Local Design Canvas — hướng dẫn cho Claude Code

Đây là một **canvas thiết kế local**: người dùng gõ prompt trên trình duyệt, Claude Code (bạn) vẽ thiết kế HTML, canvas tự cập nhật. Bạn CHÍNH LÀ "máy chủ vẽ" — không có API cloud nào.

## Kiến trúc (đọc để hiểu luồng)

```
Browser canvas ──POST /api/prompt──> server local (Express :4321)
                                          │ ghi prompts/inbox.jsonl
                                          ▼
                              watch.sh phát hiện dòng mới
                                          │
                                          ▼
                              BẠN (Claude) nhận qua Monitor → vẽ file .html
                                          │ ghi vào designs/
                                          ▼
                              server watch designs/ → SSE → canvas reload
```

Chiều ngược lại: bạn POST `http://localhost:4321/api/reply` để hiện câu trả lời/câu hỏi trong khung chat trên canvas.

## KHI BẮT ĐẦU PHIÊN LÀM VIỆC — làm ngay 2 việc này

**1. Kiểm tra server đã chạy chưa** (người dùng phải tự chạy `npm run dev`):
```bash
curl -s http://localhost:4321/api/designs >/dev/null && echo "server OK" || echo "server chưa chạy — nhắc người dùng: npm run dev"
```
KHÔNG tự khởi động server bằng `node server/index.js` chạy nền — để người dùng chạy `npm run dev` độc quyền, tránh xung đột cổng (EADDRINUSE).

**2. Bật watcher để nhận prompt từ canvas** — dùng công cụ Monitor (persistent) chạy `prompts/watch.sh`. Đây là mắt xích giúp bạn nhận prompt người dùng gõ trên trình duyệt. Nếu không bật, bạn sẽ KHÔNG biết khi có prompt mới.

## Khi nhận prompt từ canvas (dòng `NEW_PROMPT`)

Watcher in ra: `NEW_PROMPT id=... :: <prompt> :: EDIT=<file> :: IMAGES=<path> :: GUIDELINES=<path>`

1. Nếu prompt bị cắt, đọc đầy đủ từ `prompts/inbox.jsonl` theo `id`.
2. Luôn đọc `prompts/design-guidelines.md` trước khi vẽ (icon SVG thật, không emoji, có animation, polish như Claude Design).
3. Nếu có `EDIT=<file>`: đọc file trong `designs/` đó, chỉ sửa phần yêu cầu, ghi đè — không tạo file mới.
4. Nếu có `IMAGES=<path>`: **ảnh lưu trên đĩa thường KHÔNG đọc được qua tool Read** trong phiên. Nếu Read ra rỗng, báo người dùng dán ảnh thẳng vào chat Claude Code (terminal) thay vì canvas.
5. Vẽ/sửa file trong `designs/`, đặt tên kebab-case.
6. Đánh dấu prompt `done` trong `inbox.jsonl` và POST tóm tắt về `/api/reply` (kind:"message"), hoặc hỏi lại (kind:"question"). Text tiếng Việt, ngắn gọn.

## Lệnh `/design`
Chi tiết quy trình đầy đủ ở `.claude/commands/design.md`. File `prompts/design-guidelines.md` là nguồn chuẩn về chất lượng thị giác, dùng chung cho cả lệnh terminal lẫn prompt từ browser.

## Lưu ý
- Chỉ ghi thiết kế vào `designs/` (theo `outputDir` trong `design.config.json`). KHÔNG áp vào code dự án context trừ khi người dùng yêu cầu rõ.
- Mỗi file HTML phải tự chứa (Tailwind qua CDN), mở độc lập được trong trình duyệt.
