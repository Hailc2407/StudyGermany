/* ==========================================================================
   Deutsch Room · pages.js
   Routes: #/ (lộ trình) · #/l1 (một Lektion) · #/l1/2 (một buổi) · #/vocab[/l1/a] · #/review · #/settings
   ========================================================================== */
(() => {
  "use strict";
  const DR = window.DR;
  const { $, $$, h, btn, shuffle, sample, esc, wait, check, fold, toast, store, today, addDays, Speech, sayBtns,
    Tracks, trackPlayer, stopAllAudio, SRS, Data, artOf, sayOf, wordLabel, Missed, renderBlock, wordCard, flash, levelText } = DR;
  const app = $("#app");

  const progress = () => store.get("progress", {});
  const sessionDone = (L, S) => Boolean((progress()[L.id + "/" + S.id] || {}).done);
  function nextSession(leks) {
    for (const L of leks) for (const S of L.sessions) if (!sessionDone(L, S)) return { L, S };
    return null;
  }
  const fmtDate = (d) => d.split("-").reverse().join("/");
  const lekName = (L) => L.label || "Lektion " + L.no;
  function page(title, ...kids) {
    document.title = title ? title + " · Deutsch Room" : "Deutsch Room";
    app.textContent = "";
    app.append(...kids.flat().filter(Boolean));
    window.scrollTo(0, 0);
  }
  function voiceWarning() {
    if (!Speech.supported) return h("aside", { class: "tip warn" }, h("strong", {}, "Trình duyệt này không đọc được tiếng Đức"), h("div", {}, "Hãy mở trang bằng Chrome, Edge hoặc Safari bản mới."));
    if (Speech.voices.length && !Speech.de.length) return h("aside", { class: "tip warn" }, h("strong", {}, "Máy chưa có giọng đọc tiếng Đức"), h("div", { html: "Các nút 🔊 sẽ không đọc đúng. Xem cách thêm giọng Đức trong <a href='#/settings'>Cài đặt</a>." }));
    return null;
  }

  /* ---------- Home: the path through the book ---------- */
  async function home() {
    const course = await Data.getCourse();
    const leks = await Data.allLeks();
    const due = SRS.due().length;
    const nxt = nextSession(leks);
    const total = Object.keys(SRS.all()).length;
    const todayBox = h("section", { class: "today" },
      h("div", { class: "today-card" + (due ? " hot" : "") },
        h("span", { class: "kicker" }, "Ôn tập hôm nay"),
        h("strong", {}, due ? due + " thẻ đến hạn" : total ? "Không có thẻ đến hạn 🎉" : "Chưa có thẻ nào"),
        h("span", { class: "muted small" }, due ? "Ôn trước, học bài mới sau — khoảng 10 phút." : total ? "Ngày mai có " + SRS.dueOn(addDays(1)) + " thẻ." : "Học xong một buổi, từ mới sẽ vào đây."),
        due ? h("a", { class: "btn", href: "#/review" }, "Ôn ngay →") : null),
      h("div", { class: "today-card" },
        h("span", { class: "kicker" }, nxt ? "Học tiếp" : "Hoàn thành"),
        h("strong", {}, nxt ? lekName(nxt.L) + " · Buổi " + nxt.S.no + ": " + nxt.S.title : "Bạn đã học hết các buổi hiện có 🎉"),
        h("span", { class: "muted small", lang: "vi" }, nxt ? nxt.S.vi + " · ~" + nxt.S.minutes + " phút" : "Bài tiếp theo sẽ sớm có."),
        nxt ? h("a", { class: "btn", href: "#/" + nxt.L.id + "/" + nxt.S.id }, "Học tiếp →") : null));
    const path = h("section", { class: "path" }, h("h2", {}, "Lộ trình"), course.lektionen.map((meta) => {
      const L = leks.find((x) => x.id === meta.id);
      if (!L) return h("div", { class: "lek-card soon" }, h("span", { class: "lek-no" }, meta.no), h("div", {}, h("strong", {}, meta.title), h("div", { class: "muted small", lang: "vi" }, meta.vi + " · sắp có")));
      const done = L.sessions.filter((S) => sessionDone(L, S)).length;
      const best = (store.get("tests", {})[L.id] || {}).best;
      const testTotal = ((L.sessions.flatMap((S) => S.sections.flatMap((s) => s.blocks))).find((b) => b.type === "test") || { items: [] }).items.length;
      return h("div", { class: "lek-card" },
        h("a", { class: "lek-no", href: "#/" + L.id }, L.no),
        h("div", { class: "lek-body" },
          h("a", { class: "lek-title", href: "#/" + L.id }, L.title),
          h("div", { class: "muted small", lang: "vi" }, L.vi + " · " + done + "/" + L.sessions.length + " buổi" + (best != null ? " · kiểm tra " + best + "/" + testTotal : "")),
          h("div", { class: "bar-prog" }, h("span", { style: "width:" + Math.round((done / L.sessions.length) * 100) + "%" })),
          h("ol", { class: "sess-list" }, L.sessions.map((S) => h("li", {}, h("a", { class: "sess-link" + (sessionDone(L, S) ? " done" : ""), href: "#/" + L.id + "/" + S.id },
            h("span", { class: "sess-check" }, sessionDone(L, S) ? "✓" : S.no), h("span", { class: "sess-title" }, S.title), h("span", { class: "muted small sess-vi", lang: "vi" }, S.vi), h("span", { class: "muted small" }, "~" + S.minutes + "′")))))));
    }));
    page("", h("div", { class: "home" },
      h("section", { class: "hero" },
        h("p", { class: "kicker" }, course.book),
        h("h1", {}, "Deutsch Room"),
        h("p", { class: "lead", lang: "vi" }, "Phòng tự học tiếng Đức: học theo sách, nghe giọng Đức, ôn từ vựng mỗi ngày.")),
      voiceWarning(), todayBox, path,
      h("aside", { class: "tip" }, h("strong", {}, "Mỗi ngày nên học thế nào?"),
        h("ol", {}, h("li", {}, "Ôn tập 10–15 phút (các thẻ đến hạn)."), h("li", {}, "Học một buổi mới khoảng 45 phút — hoặc chia làm hai lần."), h("li", {}, "Làm bài trong Arbeitsbuch theo mục „Bài về nhà“."))),
      h("p", { class: "muted small foot-note" }, "Tiến độ, thẻ ôn tập và audio của sách chỉ lưu trong trình duyệt trên máy này. Có thể sao lưu trong ", h("a", { href: "#/settings" }, "Cài đặt"), ".")));
  }

  /* ---------- One Lektion ---------- */
  async function lektion(id) {
    const L = await Data.getLek(id);
    if (!L) return home();
    page(lekName(L), h("div", { class: "lek-page" },
      h("p", { class: "muted small" }, h("a", { href: "#/" }, "← Lộ trình")),
      h("p", { class: "kicker" }, lekName(L)),
      h("h1", {}, L.title),
      h("p", { class: "lead", lang: "vi" }, L.vi),
      h("p", { class: "muted small" }, "📘 " + L.book),
      h("h2", {}, "Các buổi học"),
      h("div", { class: "sess-cards" }, L.sessions.map((S) => h("a", { class: "sess-card" + (sessionDone(L, S) ? " done" : ""), href: "#/" + L.id + "/" + S.id },
        h("span", { class: "kicker" }, "Buổi " + S.no + " · ~" + S.minutes + " phút" + (sessionDone(L, S) ? " · ✓ xong" : "")),
        h("strong", {}, S.title), h("span", { class: "muted small", lang: "vi" }, S.vi), h("span", { class: "muted small" }, "📘 " + S.book)))),
      L.sets.length ? h("h2", {}, "Từ vựng của bài") : null,
      L.sets.length ? h("div", { class: "set-links" }, L.sets.map((s) => h("a", { class: "chip big", href: "#/vocab/" + L.id + "/" + s.id }, s.title + " (" + s.items.length + ")"))) : null,
      (L.audio || []).length ? h("h2", {}, "Audio của sách") : null,
      (L.audio || []).length ? h("p", { class: "muted small" }, "Phát từ file trên máy bạn (thêm trong ", h("a", { href: "#/settings" }, "Cài đặt"), ").") : null,
      (L.audio || []).map((ref) => [trackPlayer(ref), h("div", { style: "height:10px" })])));
  }

  /* ---------- One session ---------- */
  async function session(lid, sid) {
    const L = await Data.getLek(lid);
    const S = L && L.sessions.find((x) => x.id === sid);
    if (!S) return L ? lektion(lid) : home();
    Missed.reset();
    const ctx = { L, S, key: L.id + "/" + S.id };
    const i = L.sessions.indexOf(S);
    const prev = L.sessions[i - 1], next = L.sessions[i + 1];
    const toc = h("nav", { class: "toc", "aria-label": "Các phần" }, S.sections.map((s, k) =>
      h("a", { href: "#", class: "toc-item", "data-sec": "s-" + s.id, onclick: (e) => { e.preventDefault(); document.getElementById("s-" + s.id).scrollIntoView({ behavior: "smooth" }); } },
        h("span", { class: "toc-n" }, k + 1), h("span", { class: "toc-t" }, s.title), h("span", { class: "toc-m" }, s.minutes + "′"))));
    const head = h("header", { class: "lesson-head" },
      h("p", { class: "kicker" }, h("a", { href: "#/" + L.id }, lekName(L)), " · Buổi " + S.no + " · ~" + S.minutes + " phút", sessionDone(L, S) ? " · ✓ đã xong" : ""),
      h("h1", {}, S.title),
      h("p", { class: "lead", lang: "vi" }, S.vi),
      h("p", { class: "muted small" }, "📘 " + S.book),
      h("div", { class: "objectives" }, h("h2", {}, "Sau buổi này bạn có thể…"), h("ul", {}, S.goals.map((g) => h("li", { html: g })))),
      voiceWarning());
    const sections = S.sections.map((s, k) => h("section", { class: "section", id: "s-" + s.id },
      h("div", { class: "sec-head" }, h("span", { class: "sec-n" }, String(k + 1).padStart(2, "0")), h("h2", {}, s.title), h("span", { class: "sec-min" }, "~" + s.minutes + " phút")),
      s.intro ? h("p", { class: "sec-intro", html: s.intro }) : null,
      s.blocks.map((b) => renderBlock(b, ctx))));
    const foot = h("footer", { class: "lesson-foot" },
      prev ? h("a", { href: "#/" + L.id + "/" + prev.id }, "← Buổi " + prev.no + ": " + prev.title) : h("a", { href: "#/" }, "← Lộ trình"),
      next ? h("a", { href: "#/" + L.id + "/" + next.id }, "Buổi " + next.no + ": " + next.title + " →") : h("a", { href: "#/review" }, "Ôn tập →"));
    page("Buổi " + S.no + ": " + S.title, h("div", { class: "lesson" }, toc, h("div", { class: "lesson-main" }, head, sections, foot)));
    const items = $$(".toc-item", toc);
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) items.forEach((a) => a.classList.toggle("on", a.dataset.sec === en.target.id));
    }), { rootMargin: "-35% 0px -60% 0px" });
    $$(".section", app).forEach((s) => io.observe(s));
  }

  /* ---------- Vocabulary: every set, search, flashcards ---------- */
  async function vocab(lid, sid) {
    const leks = await Data.allLeks();
    const sets = leks.flatMap((L) => L.sets.map((s) => ({ L, s })));
    const all = sets.flatMap(({ s }) => s.items);
    const srs = SRS.all();
    const inSrs = all.filter((w) => srs[w.key]).length;
    const solid = all.filter((w) => srs[w.key] && srs[w.key].b >= 5).length;
    let cur = sets.find((x) => x.L.id === lid && x.s.id === sid) || null;
    const body = h("div", { class: "vocab-body" });
    const search = h("input", { type: "search", class: "gap-in wide search no-uml", placeholder: "Tìm từ tiếng Đức hoặc tiếng Việt…", "aria-label": "Tìm từ" });
    const chips = h("div", { class: "set-links" });
    function paintChips() {
      chips.textContent = "";
      chips.append(h("button", { type: "button", class: "chip" + (!cur ? " on" : ""), onclick: () => { cur = null; history.replaceState(null, "", "#/vocab"); paint(); } }, "Tất cả (" + all.length + ")"),
        ...sets.map((x) => h("button", { type: "button", class: "chip" + (cur === x ? " on" : ""), onclick: () => { cur = x; search.value = ""; history.replaceState(null, "", "#/vocab/" + x.L.id + "/" + x.s.id); paint(); } },
          "L" + x.L.no + " · " + x.s.title + " (" + x.s.items.length + ")")));
    }
    function row(w) {
      const lvl = SRS.level(w.key);
      return h("div", { class: "wrow" }, btn("🔊", () => Speech.say(sayOf(w)), "icon-btn tiny", "Nghe"), w.emoji ? h("span", { class: "wrow-emoji" }, w.emoji) : null, wordLabel(w),
        w.pl ? h("span", { class: "muted small" }, "· die " + w.pl) : null,
        h("span", { class: "wrow-vi", lang: "vi" }, w.vi),
        h("span", { class: "wc-lvl inline lvl-" + lvl, title: levelText(lvl) }));
    }
    function paint() {
      paintChips();
      body.textContent = "";
      const q = fold(search.value);
      if (q) {
        const hits = all.filter((w) => fold(w.de).includes(q) || fold(w.vi).includes(q) || (w.pl && fold(w.pl).includes(q)) || fold(window.DR.plainName(w.vi)).includes(fold(window.DR.plainName(search.value))));
        body.append(h("p", { class: "muted small" }, hits.length + " kết quả"), h("div", { class: "wlist" }, hits.map(row)));
        return;
      }
      if (cur) {
        body.append(h("h2", {}, lekName(cur.L) + " · " + cur.s.title), renderBlock({ type: "words", set: cur.s.id }, { L: cur.L, S: null, key: "vocab" }));
        return;
      }
      body.append(h("div", { class: "actions" }, btn("🃏 Học bằng thẻ: 20 từ ngẫu nhiên", () => flash(sample(all, 20), { title: "20 từ ngẫu nhiên" }), "btn small")),
        ...leks.flatMap((L) => L.sets.map((s) => h("div", { class: "vgroup" }, h("h3", {}, "L" + L.no + " · " + s.title + (s.bonus ? " (thêm)" : "")), h("div", { class: "wlist" }, s.items.map(row))))));
    }
    search.addEventListener("input", paint);
    page("Từ vựng", h("div", { class: "vocab-page" },
      h("h1", {}, "Từ vựng"),
      h("p", { class: "muted" }, all.length + " từ · " + inSrs + " từ đang ôn · " + solid + " từ nhớ chắc"),
      h("p", { class: "muted small" }, "Chấm màu: ", h("span", { class: "wc-lvl inline lvl-0" }), " chưa ôn · ", h("span", { class: "wc-lvl inline lvl-1" }), " đang học · ", h("span", { class: "wc-lvl inline lvl-3" }), " đã nhớ · ", h("span", { class: "wc-lvl inline lvl-5" }), " nhớ chắc"),
      search, chips, body));
    paint();
  }

  /* ---------- Review: spaced repetition ---------- */
  function modeFor(w, n) {
    if (w.art && !w.plOnly) return ["art", "listen", "type", "mean"][n % 4];
    const short = w.de.replace(/…/g, "").trim().length <= 22;
    return (short ? ["mean", "listen", "type"] : ["mean", "listen"])[n % (short ? 3 : 2)];
  }
  const answerOf = (w) => (w.ans ? w.ans : w.art && !w.plOnly && w.kind === "noun" ? w.art + " " + w.de : w.plOnly ? "die " + w.de : w.de).replace(/…/g, "").trim();
  async function review() {
    await Data.allLeks();
    const srs = SRS.all();
    const keys = Object.keys(srs).filter((k) => Data.word(k));
    const dueKeys = SRS.due().filter((k) => Data.word(k));
    const wrap = h("div", { class: "review-page" });
    const intro = h("div", {},
      h("h1", {}, "Ôn tập"),
      h("p", { class: "muted", lang: "vi" }, "Web nhắc lại mỗi từ vào đúng lúc bạn sắp quên: sau 1 ngày, 2 ngày, 4 ngày, 1 tuần, 2 tuần, 1 tháng. Trả lời sai thì từ đó quay lại từ đầu."));
    if (!keys.length) {
      page("Ôn tập", wrap);
      wrap.append(intro, h("aside", { class: "tip" }, h("strong", {}, "Chưa có thẻ nào"), h("div", { html: "Học một buổi rồi bấm <b>✓ Hoàn thành buổi học</b> ở cuối trang, hoặc bấm <b>➕ Thêm vào Ôn tập</b> ở một bộ từ. <a href='#/l1/1'>Bắt đầu Buổi 1 →</a>" })));
      return;
    }
    const counts = [0, 0, 0];
    keys.forEach((k) => { const b = srs[k].b; counts[b <= 2 ? 0 : b <= 4 ? 1 : 2]++; });
    const stats = h("div", { class: "rv-stats" },
      h("div", {}, h("b", {}, dueKeys.length), h("span", {}, "đến hạn hôm nay")),
      h("div", {}, h("b", {}, SRS.dueOn(addDays(1))), h("span", {}, "ngày mai")),
      h("div", {}, h("b", {}, counts[0]), h("span", {}, "đang học")),
      h("div", {}, h("b", {}, counts[1] + counts[2]), h("span", {}, "đã nhớ")));
    const stage = h("div", { class: "rv-stage" });
    const startBtn = dueKeys.length
      ? btn("▶ Bắt đầu ôn (" + Math.min(dueKeys.length, 40) + " thẻ)", () => run(dueKeys.slice(0, 40).map(Data.word.bind(Data)), true), "btn big")
      : h("p", { class: "muted" }, "Hôm nay không còn thẻ đến hạn 🎉");
    const extra = btn("Luyện thêm 10 thẻ (không đổi lịch ôn)", () => run(sample(keys, 10).map(Data.word.bind(Data)), false), "btn ghost");
    wrap.append(...[intro, voiceWarning(), stats, h("div", { class: "actions" }, startBtn, extra), stage].filter(Boolean));
    page("Ôn tập", wrap);

    function run(words, graded) {
      stats.hidden = true;
      $$(".actions", wrap)[0].hidden = true;
      const total = words.length;
      let queue = words.slice(), again = new Set(), right = 0, done = 0;
      const pool = Object.values(Data.words);
      function next() {
        stage.textContent = "";
        if (!queue.length) return finish();
        const w = queue[0];
        const first = !again.has(w.key);
        const n = (SRS.all()[w.key] || { n: 0 }).n;
        const mode = modeFor(w, n);
        const bar = h("div", { class: "rv-prog" }, h("span", { style: "width:" + Math.round((done / total) * 100) + "%" }));
        const card = h("div", { class: "rv-card" });
        const fb = h("div", { class: "rv-fb", hidden: true });
        const go = btn("Tiếp →", () => { document.removeEventListener("keydown", onKey); next(); }, "btn");
        go.hidden = true;
        function onKey(e) {
          if (e.key === "Enter" && !go.hidden) { e.preventDefault(); go.click(); }
        }
        document.addEventListener("keydown", onKey);
        function settle(ok, extraNote) {
          queue.shift();
          if (first) {
            done++;
            if (ok) right++;
            if (graded) SRS.grade(w.key, ok);
          }
          if (!ok && first) { again.add(w.key); queue.push(w); }
          fb.hidden = false;
          fb.className = "rv-fb " + (ok ? "good" : "bad");
          fb.textContent = "";
          fb.append(...[h("div", { class: "rv-res" }, ok ? "✓ Đúng" : "✗ Chưa đúng"), h("div", { class: "rv-word" }, w.emoji ? h("span", { class: "rv-emoji" }, w.emoji) : null, wordLabel(w), sayBtns(sayOf(w))),
            h("div", { lang: "vi" }, w.vi), w.pl ? h("div", { class: "muted small" }, "số nhiều: die " + w.pl) : null,
            extraNote ? h("div", { class: "muted small" }, extraNote) : null].filter(Boolean));
          Speech.say(sayOf(w));
          go.hidden = false;
          go.focus();
        }
        if (mode === "art") {
          card.append(h("p", { class: "rv-ask", lang: "vi" }, "der, die hay das?"), h("div", { class: "rv-big" }, "___ " + w.de), h("p", { class: "muted", lang: "vi" }, w.vi),
            h("div", { class: "rv-arts" }, ["der", "die", "das"].map((a) => h("button", { type: "button", class: "pick art-btn g-" + a + "-btn", onclick: (e) => {
              if (card.dataset.done) return;
              card.dataset.done = 1;
              e.currentTarget.classList.add(a === w.art ? "ok" : "bad");
              settle(a === w.art);
            } }, a))));
        } else if (mode === "type") {
          const input = h("input", { type: "text", class: "gap-in wide rv-in", autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-label": "Gõ từ tiếng Đức" });
          const isNoun = w.art && w.kind === "noun";
          const ok = btn("Kiểm tra", () => {
            if (card.dataset.done) return;
            if (!input.value.trim()) return toast("Gõ câu trả lời trước đã.");
            card.dataset.done = 1;
            const ans = answerOf(w);
            const r = check(input.value, [ans]);
            let note = r.note;
            if (!r.ok && isNoun && check(input.value, [w.de]).ok) note = "Đúng từ, nhưng thiếu mạo từ: " + ans;
            input.classList.add(r.ok ? "ok" : "bad");
            settle(r.ok, note);
          }, "btn");
          input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !card.dataset.done) { e.stopPropagation(); ok.click(); } });
          card.append(h("p", { class: "rv-ask", lang: "vi" }, "Viết bằng tiếng Đức" + (isNoun ? " (kèm der/die/das)" : "") + ":"), h("div", { class: "rv-big", lang: "vi" }, w.vi), h("div", { class: "rv-type" }, input, ok));
          setTimeout(() => input.focus(), 50);
        } else if (mode === "listen") {
          const opts = shuffle([w, ...sample(pool.filter((x) => x.key !== w.key && x.vi !== w.vi && (x.kind === w.kind || Math.random() < 0.3)), 3)]);
          card.append(h("p", { class: "rv-ask", lang: "vi" }, "Nghe rồi chọn nghĩa:"),
            h("div", { class: "rv-big" }, btn("🔊 Nghe", () => Speech.say(sayOf(w)), "btn"), " ", btn("🐢", () => Speech.say(sayOf(w), { slow: true }), "icon-btn", "Nghe chậm")),
            h("div", { class: "ch-opts col" }, opts.map((o) => h("button", { type: "button", class: "pick", lang: "vi", onclick: (e) => {
              if (card.dataset.done) return;
              card.dataset.done = 1;
              e.currentTarget.classList.add(o === w ? "ok" : "bad");
              $$(".pick", card)[opts.indexOf(w)].classList.add("ok");
              settle(o === w);
            } }, o.vi))));
          setTimeout(() => Speech.say(sayOf(w)), 250);
        } else {
          const show = btn("Hiện nghĩa", () => {
            show.hidden = true;
            meaning.hidden = false;
            grade.hidden = false;
          }, "btn");
          const meaning = h("div", { class: "rv-mean", lang: "vi", hidden: true }, w.vi);
          const grade = h("div", { class: "actions center", hidden: true },
            btn("😕 Quên rồi", () => { if (!card.dataset.done) { card.dataset.done = 1; settle(false); } }, "btn ghost"),
            btn("🙂 Nhớ", () => { if (!card.dataset.done) { card.dataset.done = 1; settle(true); } }, "btn"));
          card.append(h("p", { class: "rv-ask", lang: "vi" }, "Từ này nghĩa là gì?"), h("div", { class: "rv-big" }, wordLabel(w), " ", sayBtns(sayOf(w))), show, meaning, grade);
          setTimeout(() => Speech.say(sayOf(w)), 250);
        }
        stage.append(bar, h("p", { class: "muted small" }, (done + 1 > total ? total : done + (first ? 1 : 0)) + " / " + total + (again.size ? " · ôn lại " + again.size : "")), card, fb, h("div", { class: "actions center" }, go));
      }
      function finish() {
        stage.textContent = "";
        stage.append(h("div", { class: "rv-end" },
          h("p", { class: "fl-big" }, "🎉 Xong buổi ôn!"),
          h("p", {}, "Đúng ngay lần đầu: " + right + "/" + total + "."),
          graded ? h("p", { class: "muted" }, "Ngày mai có " + SRS.dueOn(addDays(1)) + " thẻ đến hạn.") : null,
          h("div", { class: "actions center" }, h("a", { class: "btn", href: "#/" }, "Về lộ trình"), btn("Ôn tiếp", () => review(), "btn ghost"))));
      }
      next();
    }
  }

  /* ---------- Settings ---------- */
  async function settings() {
    const voiceSel = h("select", { class: "sel", "aria-label": "Giọng đọc" });
    function paintVoices() {
      voiceSel.textContent = "";
      if (!Speech.de.length) voiceSel.append(h("option", { value: "" }, "— không tìm thấy giọng tiếng Đức —"));
      Speech.de.forEach((v) => voiceSel.append(h("option", { value: v.voiceURI, selected: Speech.chosen === v }, v.name + " (" + v.lang + ")")));
    }
    paintVoices();
    document.addEventListener("dr-voices", paintVoices);
    voiceSel.addEventListener("change", () => {
      store.set("voice", voiceSel.value);
      Speech.chosen = Speech.de.find((v) => v.voiceURI === voiceSel.value) || Speech.chosen;
      Speech.say("Guten Tag! Ich heiße Anna.");
    });
    const rateSel = h("select", { class: "sel", "aria-label": "Tốc độ đọc" }, [["0.75", "Chậm"], ["0.9", "Vừa"], ["1", "Bình thường"]].map(([v, t]) => h("option", { value: v, selected: Number(v) === Speech.rate }, t)));
    rateSel.addEventListener("change", () => { Speech.rate = Number(rateSel.value); store.set("rate", Speech.rate); Speech.say("Woher kommen Sie?"); });

    const audioStatus = h("p", { class: "audio-status" });
    const paintAudio = () => {
      const c = Tracks.counts();
      audioStatus.textContent = c.kb || c.ab ? `Đã lưu trên máy này: ${c.kb}/146 track Kursbuch · ${c.ab}/81 track Arbeitsbuch.` : "Chưa có audio của sách trên máy này.";
    };
    paintAudio();
    const prog = h("p", { class: "muted small" });
    async function importFrom(files) {
      if (!files || !files.length) return;
      prog.textContent = "Đang lưu…";
      try {
        const r = await Tracks.importFiles(files, (i, n) => { prog.textContent = `Đang lưu ${i}/${n}…`; });
        prog.textContent = r.n ? `Xong: ${r.n} track (${Math.round(r.size / 1048576)} MB).` + (r.ignored ? ` Bỏ qua ${r.ignored} file không phải audio của sách.` : "") : "Không thấy file nào tên dạng 301082_KB_L01_01.mp3.";
      } catch (e) {
        prog.textContent = "Không lưu được (có thể máy hết chỗ hoặc trình duyệt chặn): " + (e && e.name ? e.name : e);
      }
      paintAudio();
    }
    const dirInput = h("input", { type: "file", webkitdirectory: true, multiple: true, hidden: true, onchange: (e) => importFrom(e.target.files) });
    const fileInput = h("input", { type: "file", accept: ".mp3,audio/mpeg", multiple: true, hidden: true, onchange: (e) => importFrom(e.target.files) });

    const importBackup = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || data.app !== "deutsch-room") throw new Error("not a backup");
        if (!confirm("Thay tiến độ hiện tại bằng bản sao lưu này?")) return;
        store.clear();
        store.load(data.store);
        toast("Đã khôi phục tiến độ.");
        refreshBadge();
      } catch (err) { toast("File này không phải bản sao lưu của Deutsch Room."); }
    } });

    page("Cài đặt", h("div", { class: "settings" },
      h("h1", {}, "Cài đặt"),
      h("section", { class: "set-sec" }, h("h2", {}, "🔊 Giọng đọc tiếng Đức"),
        h("div", { class: "form-row" }, h("span", { class: "form-label" }, "Giọng"), voiceSel, btn("Thử", () => Speech.say("Guten Tag! Ich heiße Anna. Ich komme aus Deutschland."), "btn small ghost")),
        h("div", { class: "form-row" }, h("span", { class: "form-label" }, "Tốc độ"), rateSel),
        h("details", { class: "fold" + (Speech.de.length ? "" : " open-warn"), open: !Speech.de.length }, h("summary", {}, "Không có giọng Đức? Cách thêm"),
          h("ul", { lang: "vi" },
            h("li", {}, h("b", {}, "iPhone/iPad: "), "Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Đức → tải giọng (ví dụ Anna)."),
            h("li", {}, h("b", {}, "Android: "), "Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Công cụ của Google → cài dữ liệu giọng Tiếng Đức."),
            h("li", {}, h("b", {}, "Windows: "), "Settings → Time & Language → Speech → Add voices → Deutsch. Hoặc dùng trình duyệt Edge (có sẵn giọng Đức trực tuyến)."),
            h("li", {}, h("b", {}, "Mac: "), "System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → German.")),
          h("p", { class: "muted small" }, "Thêm xong, tải lại trang này."))),
      h("section", { class: "set-sec" }, h("h2", {}, "🎧 Audio của sách"),
        h("p", { lang: "vi" }, "Web không chứa audio của sách (vì có bản quyền). Bạn chọn thư mục mp3 của sách trên máy mình một lần; trình duyệt sẽ giữ một bản trong máy, không tải lên mạng."),
        audioStatus,
        h("div", { class: "actions" },
          btn("📁 Chọn thư mục mp3…", () => dirInput.click(), "btn"),
          btn("🎵 Chọn file mp3…", () => fileInput.click(), "btn ghost"),
          btn("Xoá audio đã lưu", async () => { if (confirm("Xoá toàn bộ audio của sách đã lưu trong trình duyệt?")) { await Tracks.clear(); paintAudio(); toast("Đã xoá."); } }, "btn ghost"),
          dirInput, fileInput),
        prog,
        h("p", { class: "muted small", lang: "vi" }, "Chọn thư mục „301082_Schritte int. Neu 1 mp3s Kursbuch“ (và thư mục Arbeitsbuch nếu muốn). Trên điện thoại không chọn được thư mục thì dùng „Chọn file mp3“ và chọn nhiều file một lúc (Kursbuch Lektion 1 là các file 301082_KB_L01_01 … 26).")),
      DR.Sync ? DR.Sync.panel({ cls: "set-sec" }) : null,
      h("section", { class: "set-sec" }, h("h2", {}, "💾 Tiến độ"),
        h("p", { class: "muted", lang: "vi" }, "Tiến độ học, thẻ ôn tập và bài tự giới thiệu lưu trong trình duyệt này (và trong gist nếu bạn bật đồng bộ ở trên). Bản sao lưu là một file để bạn tự giữ."),
        h("div", { class: "actions" },
          btn("⬇ Tải bản sao lưu", () => {
            const blob = new Blob([JSON.stringify({ app: "deutsch-room", date: today(), store: store.dump() }, null, 1)], { type: "application/json" });
            const a = h("a", { href: URL.createObjectURL(blob), download: "deutsch-room-" + today() + ".json" });
            document.body.append(a);
            a.click();
            a.remove();
          }, "btn ghost"),
          btn("⬆ Khôi phục từ file…", () => importBackup.click(), "btn ghost"),
          btn("Xoá toàn bộ tiến độ", () => {
            if (!confirm("Xoá toàn bộ tiến độ, thẻ ôn tập và bài tự giới thiệu? Không hoàn tác được.")) return;
            const theme = store.get("theme", null);
            store.clear();
            if (theme) store.set("theme", theme);
            refreshBadge();
            toast("Đã xoá tiến độ.");
          }, "btn ghost danger"),
          importBackup))));
  }

  /* ---------- Frame: nav, badge, theme, routing ---------- */
  function refreshBadge() {
    const b = $("#due-badge");
    if (!b) return;
    const n = SRS.due().length;
    b.hidden = !n;
    b.textContent = n > 99 ? "99+" : String(n);
  }
  document.addEventListener("dr-srs", refreshBadge);
  // progress arrived from another device (js/sync.js): redraw pages that only show it, never a running exercise
  document.addEventListener("dr-sync", () => {
    refreshBadge();
    const p = location.hash.replace(/^#\/?/, "");
    if (!p || p === "settings" || /^[lw]\d+$/.test(p)) route();
  });
  function markNav(name) { $$("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === name)); }

  async function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    Speech.stop();
    stopAllAudio();
    $$(".overlay").forEach((o) => o.remove());
    document.body.classList.remove("noscroll");
    try {
      if (!parts.length) { markNav("home"); await home(); }
      else if (parts[0] === "vocab") { markNav("vocab"); await vocab(parts[1], parts[2]); }
      else if (parts[0] === "review") { markNav("review"); await review(); }
      else if (parts[0] === "settings") { markNav("settings"); await settings(); }
      else if (/^[lw]\d+$/.test(parts[0])) { markNav("home"); await (parts[1] ? session(parts[0], parts[1]) : lektion(parts[0])); }
      else { markNav("home"); await home(); }
    } catch (e) {
      console.error(e);
      page("Lỗi", h("p", { class: "loading" }, "Không tải được bài học. Hãy tải lại trang (trang phải mở qua http/https, không mở trực tiếp file)."));
    }
    refreshBadge();
  }

  $("#t-theme").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    store.set("theme", t);
  });
  DR.umlautBar();
  window.addEventListener("hashchange", route);
  Tracks.init().finally(route);
})();
