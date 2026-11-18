# StudyGermany: Deutsch Room

Phòng tự học tiếng Đức theo *Schritte international Neu 1* (A1.1), chạy trên GitHub Pages:
**https://hailc2407.github.io/StudyGermany/**

## Có gì

- **Lộ trình**: mỗi Lektion của sách chia thành 3–4 buổi khoảng 45 phút. Mỗi buổi: từ mới có giọng đọc,
  quy tắc phát âm, việc cần làm trong sách (trang, track), ngữ pháp giải thích bằng tiếng Việt, bài tập
  tự chấm, hội thoại mẫu để nghe – nói theo – đóng vai – ghi âm, và bài về nhà.
- **Từ vựng**: danh từ luôn kèm der/die/das (màu theo sách: der xanh dương, die đỏ, das xanh lá) và số nhiều;
  động từ kèm dạng chia; tìm kiếm bằng tiếng Đức hoặc tiếng Việt; học bằng thẻ lật.
- **Ôn tập**: lặp lại ngắt quãng (1, 2, 4, 7, 15, 30 ngày). Mỗi lần ôn đổi dạng câu hỏi: nghĩa, nghe,
  gõ lại, chọn der/die/das.
- **Cài đặt**: chọn giọng đọc tiếng Đức của máy, thêm audio của sách từ máy mình, sao lưu tiến độ.

Nội dung trên web là bài tự soạn theo thứ tự, chủ đề, ngữ pháp và từ vựng của sách; web không chứa trang
sách hay audio của sách. Audio gốc được phát từ file trên máy người học (lưu trong IndexedDB của trình
duyệt). Tiến độ lưu trong `localStorage` của trình duyệt, có nút sao lưu / khôi phục.

## Cấu trúc

```
index.html, app.css          khung trang và giao diện
js/core.js                   tiện ích, giọng đọc, audio của sách, ôn tập ngắt quãng, nạp dữ liệu
js/blocks.js                 các dạng bài (words, listenPick, rules, dialog, conj, gaps, order, fix, test…)
js/pages.js                  các trang: lộ trình, buổi học, từ vựng, ôn tập, cài đặt
data/course.json             danh sách Lektion (ready: true = đã có bài)
data/l1.json                 Lektion 1: các bộ từ (sets) và các buổi (sessions → sections → blocks)
tools/check.mjs              kiểm tra dữ liệu bài trước khi đăng
.claude/skills/deutsch-room  hướng dẫn Claude Code soạn Lektion tiếp theo
```

## Chạy thử ở máy

```bash
python3 -m http.server 8790        # trong thư mục repo, rồi mở http://localhost:8790/
node tools/check.mjs               # phải in ALL OK
```

Sau khi sửa `app.css` hoặc `js/*.js`, tăng số `?v=` trong `index.html` để trình duyệt tải bản mới.
