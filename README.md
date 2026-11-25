# Deutsch Room

Ứng dụng web tự học tiếng Đức trình độ A1 theo giáo trình *Schritte international Neu 1* (A1.1). Ứng dụng là một trang tĩnh, không cần máy chủ, được triển khai trên GitHub Pages.

**Demo:** https://hailc2407.github.io/StudyGermany/

## Tính năng

### Lộ trình theo giáo trình

- Mỗi Lektion được chia thành 3–6 buổi học, mỗi buổi khoảng 45–65 phút.
- Mỗi buổi gồm: từ mới có giọng đọc, quy tắc phát âm, hướng dẫn bài làm trong sách (trang, track), giải thích ngữ pháp bằng tiếng Việt, bài tập tự chấm, hội thoại mẫu (nghe, nói theo, đóng vai, ghi âm) và bài về nhà.
- Mục Wiederholung 1–7 ôn tổng hợp Band 1: 3 buổi ôn và bài kiểm tra cuối Band 1 gồm 60 câu. Mỗi câu sai có liên kết tới buổi cần học lại.

### Từ vựng và ôn tập

- Danh từ luôn kèm mạo từ der/die/das và dạng số nhiều. Màu theo sách: der xanh dương, die đỏ, das xanh lá.
- Động từ kèm bảng chia. Hỗ trợ tìm kiếm bằng tiếng Đức hoặc tiếng Việt, và học bằng thẻ lật.
- Ôn tập ngắt quãng theo các mốc 1, 2, 4, 7, 15 và 30 ngày. Dạng câu hỏi thay đổi mỗi lần ôn: nghĩa, nghe, gõ lại, chọn der/die/das.

### Từ vựng theo chủ đề (`/tu/`)

- 1.245 từ chia thành 20 chủ đề (ăn uống, đi lại, nhà ở, thời gian…). Mỗi chủ đề gồm các bài khoảng 9 từ, mở dần theo thứ tự.
- Mỗi bài gồm: thẻ học, hỏi nghĩa, nghe chọn từ, chọn der/die/das, ghép cặp và gõ lại.
- Ôn ngắt quãng 5 mức, sổ tay thống kê, tìm kiếm và mục tiêu mỗi ngày.
- Gồm từ của Schritte Neu 1 và khoảng 350 từ của danh sách Goethe-Zertifikat A1 (nhãn 🎯).
- Giao diện, nghĩa, bản dịch câu ví dụ và ghi chú có thể chuyển giữa tiếng Việt và tiếng Anh (nút EN trên thanh trên cùng hoặc trong Cài đặt).
- Giọng đọc dùng giọng tổng hợp của trình duyệt, không cần file audio. Tiến độ lưu riêng, dưới khoá `de.tu.*`.

### Cài đặt và đồng bộ

- Chọn giọng đọc tiếng Đức, thêm audio của sách từ máy người học, sao lưu và khôi phục tiến độ.
- Đồng bộ tiến độ giữa các thiết bị qua một gist bí mật (Cài đặt → ☁️ Đồng bộ). Cần một mã truy cập GitHub chỉ có quyền `gist`.

## Dữ liệu và bản quyền

- Nội dung là bài tự soạn, bám theo thứ tự, chủ đề, ngữ pháp và từ vựng của sách. Repo không chứa trang sách hay audio của sách.
- Audio gốc được phát từ file trên máy người học và lưu trong IndexedDB của trình duyệt.
- Tiến độ học lưu trong `localStorage` của trình duyệt, có chức năng sao lưu và khôi phục.

## Cấu trúc thư mục

| Đường dẫn | Mô tả |
| --- | --- |
| `index.html`, `app.css` | Khung trang và giao diện |
| `js/boot.js` | Chạy đầu tiên: chặn nhúng trong frame của site khác, đặt giao diện sáng/tối và ngôn ngữ |
| `js/core.js` | Tiện ích, giọng đọc, audio của sách, ôn tập ngắt quãng, nạp dữ liệu |
| `js/blocks.js` | Các dạng bài (words, listenPick, rules, dialog, conj, gaps, order, fix, numbers, priceHear, test…) |
| `js/pages.js` | Các trang: lộ trình, buổi học, từ vựng, ôn tập, cài đặt |
| `js/sync.js` | Đồng bộ tiến độ giữa các thiết bị qua gist bí mật |
| `data/course.json` | Danh sách Lektion (`ready: true` nghĩa là đã có bài) |
| `data/l1.json`, `l2.json`, … | Từng Lektion: các bộ từ (`sets`) và các buổi (`sessions` → `sections` → `blocks`) |
| `data/w1.json` | Wiederholung 1–7: mục ôn không có bộ từ (`sets` rỗng), id bắt đầu bằng `w` |
| `tu/` | Phần từ vựng theo chủ đề: `index.html`, `app.js`, `lang.js` (chữ giao diện vi/en), `tu.css`, `data/words.json` |
| `tools/build_tu.py` | Tạo `tu/data/words.json` từ `data/l*.json`, `tools/src/a1-part*.tsv` (từ Goethe A1) và `tools/src/en/*.tsv` (tiếng Anh) |
| `tools/check.mjs` | Kiểm tra dữ liệu bài và dữ liệu từ vựng trước khi đăng |
| `.claude/skills/deutsch-room` | Hướng dẫn Claude Code soạn Lektion tiếp theo |

## Chạy trên máy

Yêu cầu: Python 3 và Node.js.

```bash
# Chạy máy chủ tĩnh trong thư mục repo, rồi mở http://localhost:8790/
python3 -m http.server 8790

# Kiểm tra dữ liệu, kết quả phải là ALL OK
node tools/check.mjs

# Tạo lại dữ liệu từ vựng theo chủ đề
python3 tools/build_tu.py
```

## Triển khai

Đẩy lên nhánh `main`, GitHub Pages sẽ tự phát hành. Sau khi sửa `app.css` hoặc `js/*.js`, tăng số `?v=` của file tương ứng trong `index.html` để trình duyệt tải bản mới thay vì dùng bản cache.
