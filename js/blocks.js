(() => {
  "use strict";
  const { $$, h, btn, shuffle, sample, esc, wait, check, fold, toast, store, today, Speech, sayBtns, LETTERS, plainName,
    spellOut, trackPlayer, recorder, SRS, artOf, sayOf, wordLabel, Missed } = window.DR;
  const B = {};

  function scoreLine() {
    const el = h("p", { class: "score", hidden: true });
    return {
      el,
      set(ok, total, extra = "") {
        el.hidden = false;
        el.className = "score " + (ok === total ? "good" : ok / total >= 0.6 ? "mid" : "low");
        el.textContent = `${ok}/${total} đúng${extra}` + (ok === total ? " 🎉" : "");
      },
    };
  }
  const textInput = (attrs = {}) => h("input", Object.assign({ type: "text", class: "gap-in", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }, attrs));
  const levelText = (b) => (b <= 0 ? "Chưa ôn" : b <= 2 ? "Đang học" : b <= 4 ? "Đã nhớ" : "Nhớ chắc");

  function wordCard(w) {
    const lvl = SRS.level(w.key);
    const a = artOf(w);
    return h("article", { class: "wcard" + (a ? " wc-" + (a === "pl" ? "pl" : a) : "") },
      h("div", { class: "wc-head" }, h("span", { class: "wc-title" }, w.emoji ? h("span", { class: "wc-emoji", "aria-hidden": "true" }, w.emoji) : null, wordLabel(w)), sayBtns(sayOf(w))),
      w.pl ? h("div", { class: "wc-pl" }, h("span", { class: "muted small" }, "số nhiều "), h("span", { class: "say-inline pl-word", "data-say": "die " + w.pl }, "die " + w.pl))
        : w.kind === "noun" && !w.plOnly ? h("div", { class: "wc-pl muted small" }, "chỉ có số ít") : null,
      w.forms ? h("div", { class: "wc-forms say-inline", "data-say": w.forms.replace(/·/g, ","), title: "Bấm để nghe" }, w.forms) : null,
      w.syl ? h("div", { class: "wc-syl", title: "Phần in HOA là âm tiết được nhấn mạnh" }, w.syl) : null,
      h("div", { class: "wc-vi hide-q", lang: "vi" }, w.vi),
      w.en ? h("div", { class: "wc-en hide-q" }, w.en) : null,
      w.aus ? h("div", { class: "wc-aus" }, h("span", { class: "say-inline", "data-say": "Ich komme " + w.aus + "." }, "Ich komme " + w.aus + ".")) : null,
      w.ex ? h("div", { class: "wc-ex" }, h("span", { class: "say-inline", "data-say": w.exSay || w.ex[0] }, w.ex[0]), h("span", { class: "wc-ex-vi hide-q", lang: "vi" }, w.ex[1])) : null,
      w.note ? h("div", { class: "wc-note hide-q" }, "💡 " + w.note) : null,
      lvl ? h("span", { class: "wc-lvl lvl-" + lvl, title: levelText(lvl) }) : null);
  }

  function playList(words) {
    let token = null;
    const b = btn("▶ Nghe cả bộ", async () => {
      if (token) { token = null; Speech.stop(); b.textContent = "▶ Nghe cả bộ"; return; }
      const me = (token = {});
      b.textContent = "⏹ Dừng";
      for (const w of words) {
        if (token !== me) return;
        await Speech.say(sayOf(w));
        await wait(900);
      }
      if (token === me) { token = null; b.textContent = "▶ Nghe cả bộ"; }
    }, "btn small ghost");
    return b;
  }

  function flash(words, opts = {}) {
    if (!words.length) return;
    const total = words.length;
    let queue = shuffle(words), again = new Set(), known = 0, flipped = false;
    let dir = store.get("flashDir", "de");
    const ov = h("div", { class: "overlay", role: "dialog", "aria-modal": "true", "aria-label": "Thẻ từ" });
    const box = h("div", { class: "flash" });
    ov.append(box);
    document.body.append(ov);
    document.body.classList.add("noscroll");
    function close() {
      ov.remove();
      document.body.classList.remove("noscroll");
      Speech.stop();
      document.removeEventListener("keydown", onKey);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape") close();
      else if (!queue.length) return;
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); flip(); }
      else if (e.key === "ArrowRight" && flipped) answer(true);
      else if (e.key === "ArrowLeft" && flipped) answer(false);
    }
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    function flip() {
      if (flipped) return;
      flipped = true;
      box.classList.add("flipped");
      if (dir === "vi") Speech.say(sayOf(queue[0]));
    }
    function answer(ok) {
      const w = queue.shift();
      if (ok) known++;
      else if (!again.has(w.key)) { again.add(w.key); queue.push(w); }
      render();
    }
    function render() {
      box.textContent = "";
      box.classList.remove("flipped");
      flipped = false;
      const head = h("div", { class: "fl-head" },
        h("span", { class: "muted small" }, opts.title || "Thẻ từ"),
        h("span", { class: "fl-count" }, Math.min(total - queue.length + 1, total) + " / " + total + (again.size ? " · ôn lại " + again.size : "")),
        btn("✕", close, "icon-btn", "Đóng"));
      if (!queue.length) return end(head);
      const w = queue[0];
      const front = dir === "de"
        ? h("div", { class: "fl-front" }, w.emoji ? h("div", { class: "fl-emoji" }, w.emoji) : null, h("div", { class: "fl-word" }, wordLabel(w)), sayBtns(sayOf(w)))
        : h("div", { class: "fl-front" }, w.emoji ? h("div", { class: "fl-emoji" }, w.emoji) : null, h("div", { class: "fl-vi", lang: "vi" }, w.vi), w.kind === "noun" ? h("div", { class: "muted small" }, "(nhớ cả der/die/das)") : null);
      const back = h("div", { class: "fl-back" },
        dir === "de" ? h("div", { class: "fl-vi", lang: "vi" }, w.vi) : h("div", { class: "fl-word" }, wordLabel(w), sayBtns(sayOf(w))),
        w.pl ? h("div", { class: "muted small" }, "số nhiều: die " + w.pl) : null,
        w.forms ? h("div", { class: "muted small" }, w.forms) : null,
        w.ex ? h("div", { class: "fl-ex" }, h("span", { class: "say-inline", "data-say": w.exSay || w.ex[0] }, w.ex[0]), h("span", { class: "muted", lang: "vi" }, w.ex[1])) : null);
      const card = h("div", { class: "fl-card", onclick: (e) => { if (!e.target.closest("button,[data-say]")) flip(); } }, front, back);
      const tools = h("div", { class: "fl-tools" },
        h("div", { class: "fl-flip" }, btn("Lật thẻ (Space)", flip, "btn")),
        h("div", { class: "fl-grade" },
          btn("😕 Chưa nhớ", () => answer(false), "btn ghost bad-btn"),
          btn("🙂 Nhớ rồi", () => answer(true), "btn good-btn")));
      const dirBtn = btn(dir === "de" ? "Đức → Việt" : "Việt → Đức", () => { dir = dir === "de" ? "vi" : "de"; store.set("flashDir", dir); render(); }, "btn small ghost", "Đổi chiều thẻ");
      box.append(head, card, tools, h("div", { class: "fl-foot" }, dirBtn, h("span", { class: "muted small" }, "Phím: Space lật · → nhớ · ← chưa nhớ")));
      if (dir === "de") Speech.say(sayOf(w));
    }
    function end(head) {
      const keys = words.map((w) => w.key);
      const fresh = keys.filter((k) => !SRS.has(k));
      box.append(head, h("div", { class: "fl-end" },
        h("p", { class: "fl-big" }, "🎉 Xong!"),
        h("p", {}, `Nhớ ngay từ lần đầu: ${known}/${total} thẻ.`),
        fresh.length ? h("p", { class: "muted small" }, `Thêm ${fresh.length} từ vào Ôn tập để web nhắc bạn ôn lại vào ngày mai, 2 ngày, 4 ngày, 1 tuần…`) : h("p", { class: "muted small" }, "Các từ này đã có trong Ôn tập."),
        h("div", { class: "actions center" },
          fresh.length ? btn("➕ Thêm vào Ôn tập", () => { SRS.add(fresh); toast("Đã thêm " + fresh.length + " từ vào Ôn tập."); close(); }, "btn") : null,
          btn("↻ Học lại", () => { queue = shuffle(words); again = new Set(); known = 0; render(); }, "btn ghost"),
          btn("Đóng", close, "btn ghost"))));
    }
    render();
  }

  B.text = (b) => h("div", { class: "text", html: b.html });
  B.tip = (b) => h("aside", { class: "tip" }, b.title ? h("strong", {}, b.title) : null, h("div", { html: b.html }));
  B.table = (b) => h("div", { class: "table-wrap" }, h("table", {},
    b.head ? h("thead", {}, h("tr", {}, b.head.map((c) => h("th", { html: c })))) : null,
    h("tbody", {}, b.rows.map((r) => h("tr", {}, r.map((c, i) => {
      if (b.say !== i) return h("td", { html: c });
      const txt = window.DR.strip(c);
      return h("td", {}, h("span", { class: "say-inline", "data-say": txt, html: c }));
    }))))));

  B.words = (b, ctx) => {
    const set = ctx.L.setIndex[b.set];
    if (!set) return h("p", { class: "muted" }, "Không tìm thấy bộ từ " + b.set);
    const words = set.items;
    const grid = b.compact
      ? h("div", { class: "wlist" }, words.map((w) => h("div", { class: "wrow" }, btn("🔊", () => Speech.say(sayOf(w)), "icon-btn tiny", "Nghe"), w.emoji ? h("span", { class: "wrow-emoji" }, w.emoji) : null, wordLabel(w), h("span", { class: "wrow-vi hide-q", lang: "vi" }, w.vi), w.note ? h("span", { class: "wrow-note muted small hide-q" }, w.note) : null)))
      : h("div", { class: "wgrid" }, words.map(wordCard));
    const hide = btn("🙈 Ẩn nghĩa", () => {
      const on = grid.classList.toggle("quiz");
      hide.textContent = on ? "👁 Hiện nghĩa" : "🙈 Ẩn nghĩa";
      if (on) toast("Tự nhớ nghĩa, rồi bấm vào thẻ để xem.");
    }, "btn small ghost");
    grid.addEventListener("click", (e) => {
      if (!grid.classList.contains("quiz") || e.target.closest("button,[data-say]")) return;
      const card = e.target.closest(".wcard,.wrow");
      if (card) card.classList.toggle("open");
    });
    const inSrs = () => words.every((w) => SRS.has(w.key));
    const addBtn = btn("", () => {
      const n = SRS.add(words.map((w) => w.key));
      toast(n ? "Đã thêm " + n + " từ vào Ôn tập." : "Các từ này đã có trong Ôn tập.");
      paintAdd();
    }, "btn small ghost");
    const paintAdd = () => { addBtn.textContent = inSrs() ? "✓ Đã có trong Ôn tập" : "➕ Thêm vào Ôn tập"; addBtn.disabled = inSrs(); };
    paintAdd();
    const bar = h("div", { class: "wbar" },
      h("span", { class: "muted small" }, words.length + " từ"),
      playList(words), hide,
      btn("🃏 Học bằng thẻ", () => flash(words, { title: set.title, onClose: paintAdd }), "btn small"),
      addBtn);
    const body = h("div", { class: "words" }, bar, grid);
    if (b.collapsed) return h("details", { class: "fold" }, h("summary", {}, b.title || set.title), body);
    return body;
  };

  B.listenPick = (b, ctx) => {
    const set = ctx.L.setIndex[b.set];
    const em = b.by === "emoji";
    const pool = em ? set.items.filter((w) => w.emoji) : set.items;
    const qs = sample(pool, Math.min(b.n || 8, pool.length));
    const sc = scoreLine();
    let ok = 0, done = 0;
    const show = (x) => (em ? x.emoji : x.vi);
    const rows = qs.map((w, i) => {
      const others = sample(pool.filter((x) => x.key !== w.key && show(x) !== show(w)), 3);
      const opts = shuffle([w, ...others]);
      const reveal = h("span", { class: "reveal", hidden: true }, wordLabel(w));
      const row = h("div", { class: "lp-q" },
        h("div", { class: "lp-head" }, h("b", {}, i + 1 + "."), btn("🔊 Nghe", () => Speech.say(sayOf(w)), "btn small"), btn("🐢", () => Speech.say(sayOf(w), { slow: true }), "icon-btn", "Nghe chậm"), reveal),
        h("div", { class: "lp-opts" + (em ? " emojis" : "") }, opts.map((o) => h("button", { type: "button", class: "pick" + (em ? " emoji" : ""), lang: em ? null : "vi", onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          done++;
          const right = o.key === w.key;
          if (right) ok++;
          else Missed.add("lp:" + (em ? "e:" : "") + w.key, { type: "choice", q: "<span class='say-inline' data-say='" + esc(sayOf(w)) + "'>🔊 " + esc(w.de) + "</span> " + (em ? "— hình nào?" : "nghĩa là gì?"), opts: opts.map((x) => esc(show(x))), a: opts.indexOf(w) });
          e.currentTarget.classList.add(right ? "ok" : "bad");
          $$(".pick", row)[opts.indexOf(w)].classList.add("ok");
          reveal.hidden = false;
          if (done === qs.length) sc.set(ok, done);
        } }, show(o)))));
      return row;
    });
    const wrap = h("div", { class: "listen-pick" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.listenPick(b, ctx)), "btn small ghost")));
    return wrap;
  };

  B.rules = (b) => h("div", { class: "rules" }, b.items.map((r) => h("div", { class: "rule" },
    h("div", { class: "rule-t" }, r.t),
    h("div", { class: "rule-vi", lang: "vi", html: r.vi }),
    h("div", { class: "rule-ex" }, r.ex.map((x) => {
      const [de, vi] = x.split("|");
      return h("button", { type: "button", class: "ex-chip", onclick: () => Speech.say(de) }, h("span", { class: "ex-de" }, de), vi ? h("span", { class: "ex-vi", lang: "vi" }, vi) : null);
    })))));

  B.hearPick = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const rows = b.items.map((it, i) => {
      const right = it.opts[it.a || 0];
      const opts = shuffle(it.opts);
      const row = h("div", { class: "hp-row" },
        h("b", {}, i + 1 + "."),
        btn("🔊", () => Speech.say(it.say), "btn small", "Nghe"),
        btn("🐢", () => Speech.say(it.say, { slow: true }), "icon-btn", "Nghe chậm"),
        h("span", { class: "hp-opts" }, opts.map((o) => h("button", { type: "button", class: "pick", onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          n++;
          const good = o === right;
          if (good) ok++;
          else Missed.add("hp:" + it.say, { type: "choice", q: "<span class='say-inline' data-say='" + esc(it.say) + "'>🔊 Bấm nghe</span> — viết thế nào?", opts, a: opts.indexOf(right) });
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[opts.indexOf(right)].classList.add("ok");
          if (n === b.items.length) sc.set(ok, n);
        } }, o))));
      return row;
    });
    return h("div", { class: "hear-pick" }, rows, sc.el);
  };

  B.book = (b) => h("div", { class: "book" },
    h("div", { class: "book-head" }, "📘 ", b.kb ? "Kursbuch tr. " + b.kb : "Sách", b.ab ? " · Arbeitsbuch tr. " + b.ab : ""),
    b.tracks ? trackPlayer(b.tracks) : null,
    b.steps ? h("ol", { class: "book-steps" }, b.steps.map((s) => h("li", { html: s }))) : null,
    b.key ? h("p", { class: "book-key", html: "🔑 " + b.key }) : null);

  B.dialog = (b) => {
    let running = null;
    const speakLine = (ln, slow) => {
      const rv = Speech.roleVoice(ln.v || "m");
      return Speech.say(ln.say || ln.de, { voice: rv.voice, pitch: rv.pitch, slow });
    };
    const rows = b.lines.map((ln) => {
      if (ln.scene) return h("div", { class: "dl-scene" }, ln.scene);
      const viEl = h("div", { class: "dl-vi", lang: "vi", hidden: true }, ln.vi);
      const bar = h("div", { class: "dl-bar", hidden: true }, h("span"));
      const row = h("div", { class: "dl-row role-" + (ln.v || "m") },
        h("div", { class: "dl-who" }, ln.who),
        h("div", { class: "dl-body" }, h("div", { class: "dl-de" }, ln.de), viEl, bar),
        h("div", { class: "dl-tools" },
          btn("🔊", () => { stop(); speakLine(ln); }, "icon-btn", "Nghe câu này"),
          btn("🐢", () => { stop(); speakLine(ln, true); }, "icon-btn", "Nghe chậm"),
          btn("VI", () => { viEl.hidden = !viEl.hidden; }, "icon-btn vi-t", "Nghĩa tiếng Việt")));
      row.line = ln;
      row.viEl = viEl;
      row.bar = bar;
      return row;
    });
    const lines = rows.filter((r) => r.line);
    const people = [...new Set(lines.map((r) => r.line.who))];
    const pauseFor = (ln) => 1400 + (ln.de.split(/\s+/).length * 520);
    function countdown(row, ms, token) {
      return new Promise((res) => {
        row.bar.hidden = false;
        const fill = row.bar.firstChild;
        fill.style.transition = "none";
        fill.style.width = "0%";
        requestAnimationFrame(() => { fill.style.transition = "width " + ms + "ms linear"; fill.style.width = "100%"; });
        const t0 = Date.now();
        const tick = setInterval(() => {
          if (running !== token || Date.now() - t0 >= ms) { clearInterval(tick); row.bar.hidden = true; res(); }
        }, 100);
      });
    }
    function clearMarks() { lines.forEach((r) => r.classList.remove("now", "yours")); }
    function stop() { running = null; Speech.stop(); clearMarks(); lines.forEach((r) => { r.bar.hidden = true; }); }
    async function run(mode, me) {
      stop();
      const token = (running = {});
      for (const row of lines) {
        if (running !== token) return;
        clearMarks();
        row.classList.add("now");
        row.scrollIntoView({ block: "nearest", behavior: "smooth" });
        if (mode === "role" && row.line.who === me) {
          row.classList.add("yours");
          await countdown(row, pauseFor(row.line), token);
          if (running !== token) return;
          row.classList.remove("yours");
          await speakLine(row.line);
        } else {
          await speakLine(row.line);
          if (running !== token) return;
          if (mode === "shadow") { row.classList.add("yours"); await countdown(row, pauseFor(row.line), token); }
          else await wait(350);
        }
      }
      if (running === token) { running = null; clearMarks(); }
    }
    const wrap = h("div", { class: "dialog" });
    const hideBtn = btn("Ẩn chữ", () => {
      const on = wrap.classList.toggle("no-text");
      hideBtn.textContent = on ? "Hiện chữ" : "Ẩn chữ";
    }, "btn small ghost", "Ẩn chữ tiếng Đức để luyện nghe");
    const viBtn = btn("Hiện nghĩa", () => {
      const show = lines.some((r) => r.viEl.hidden);
      lines.forEach((r) => { r.viEl.hidden = !show; });
      viBtn.textContent = show ? "Ẩn nghĩa" : "Hiện nghĩa";
    }, "btn small ghost");
    const role = h("select", { class: "sel role-sel", "aria-label": "Đóng vai" },
      h("option", { value: "" }, "🎭 Đóng vai…"), people.map((p) => h("option", { value: p }, p)));
    role.addEventListener("change", () => { if (role.value) { toast("Bạn nói phần của " + role.value + ". Đến lượt bạn, câu sẽ sáng lên."); run("role", role.value); } });
    const tools = h("div", { class: "dl-toolbar" },
      btn("▶ Nghe cả bài", () => run("all"), "btn small"),
      btn("🗣 Nói theo", () => run("shadow"), "btn small ghost", "Máy đọc từng câu rồi dừng cho bạn nhắc lại"),
      role,
      btn("⏹", () => { stop(); role.value = ""; }, "icon-btn", "Dừng"),
      hideBtn, viBtn, recorder());
    wrap.append(tools, h("div", { class: "dl-lines" }, rows));
    return wrap;
  };

  function markEnding(v, form) {
    let tail = "";
    if (v.sep && form.endsWith(" " + v.sep)) { tail = " <span class='sep'>" + esc(v.sep) + "</span>"; form = form.slice(0, -(v.sep.length + 1)); }
    if (v.stem && form.startsWith(v.stem) && form.length > v.stem.length) return esc(v.stem) + "<b>" + esc(form.slice(v.stem.length)) + "</b>" + tail;
    return "<b>" + esc(form) + "</b>" + tail;
  }
  B.conj = (b) => {
    const P = b.persons;
    const fields = [];
    const table = h("table", { class: "conj" },
      h("thead", {}, h("tr", {}, h("th", {}), b.verbs.map((v) => h("th", {}, h("span", { class: "say-inline", "data-say": v.inf }, v.inf), h("div", { class: "muted small", lang: "vi" }, v.vi))))),
      h("tbody", {}, P.map((p, pi) => h("tr", {}, h("th", {}, p), b.verbs.map((v) => {
        const inp = textInput({ class: "gap-in conj-in", "aria-label": p + " – " + v.inf });
        const ans = h("span", { class: "conj-ans", hidden: true });
        const cell = h("td", {}, inp, ans);
        fields.push({ inp, ans, v, p, form: v.forms[pi] });
        inp.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          const i = fields.findIndex((f) => f.inp === inp);
          const next = fields[i + 1];
          if (next) next.inp.focus(); else checkAll();
        });
        return cell;
      })))));
    const sc = scoreLine();
    function checkAll() {
      let ok = 0;
      for (const f of fields) {
        const r = check(f.inp.value, [f.form]);
        f.inp.classList.toggle("ok", r.ok);
        f.inp.classList.toggle("bad", !r.ok);
        if (r.ok) ok++;
        else if (f.inp.value.trim()) Missed.add("conj:" + f.p + f.v.inf, { type: "gap", q: f.p + " ___ <span class='muted'>(" + esc(f.v.inf) + ")</span>", a: [[f.form]] });
        f.ans.hidden = r.ok && !r.note;
        f.ans.innerHTML = r.ok ? "✓ " + markEnding(f.v, f.form) : "→ " + markEnding(f.v, f.form);
      }
      sc.set(ok, fields.length);
    }
    const drillBox = h("div", { class: "drill", hidden: true });
    function drill() {
      drillBox.hidden = false;
      drillBox.textContent = "";
      const rounds = Array.from({ length: 10 }, () => {
        const v = b.verbs[Math.floor(Math.random() * b.verbs.length)];
        const pi = Math.floor(Math.random() * P.length);
        return { v, p: P[pi], form: v.forms[pi] };
      });
      let i = 0, ok = 0;
      const q = h("div", { class: "drill-q" });
      const inp = textInput({ class: "gap-in drill-in", "aria-label": "Dạng đúng" });
      const fb = h("div", { class: "drill-fb" });
      const go = btn("Kiểm tra", () => step(), "btn small");
      const sc2 = scoreLine();
      function show() { q.innerHTML = `<span class="muted">${i + 1}/10</span> <b>${esc(rounds[i].p)}</b> + <i>${esc(rounds[i].v.inf)}</i> → ?`; inp.value = ""; inp.classList.remove("ok", "bad"); inp.focus(); }
      function step() {
        const r = rounds[i];
        if (inp.dataset.wait) { delete inp.dataset.wait; i++; fb.textContent = ""; if (i >= rounds.length) return finish(); return show(); }
        const res = check(inp.value, [r.form]);
        if (res.ok) ok++;
        inp.classList.add(res.ok ? "ok" : "bad");
        fb.innerHTML = (res.ok ? "✓ " : "✗ ") + esc(r.p) + " " + markEnding(r.v, r.form) + (res.note ? " · " + esc(res.note) : "");
        Speech.say(r.p + " " + r.form);
        inp.dataset.wait = 1;
        go.textContent = i === rounds.length - 1 ? "Xem kết quả" : "Câu tiếp →";
      }
      function finish() { drillBox.textContent = ""; sc2.set(ok, rounds.length); drillBox.append(sc2.el, btn("↻ Luyện tiếp", drill, "btn small ghost")); }
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") step(); });
      drillBox.append(q, h("div", { class: "drill-row" }, inp, go), fb);
      show();
    }
    return h("div", { class: "conj-wrap" },
      h("div", { class: "table-wrap" }, table),
      h("div", { class: "actions" },
        btn("Kiểm tra", checkAll, "btn"),
        btn("Xem đáp án", () => fields.forEach((f) => { f.ans.hidden = false; f.ans.innerHTML = "→ " + markEnding(f.v, f.form); }), "btn ghost"),
        btn("Làm lại", () => fields.forEach((f) => { f.inp.value = ""; f.inp.classList.remove("ok", "bad"); f.ans.hidden = true; sc.el.hidden = true; }), "btn ghost"),
        btn("⚡ Luyện nhanh 10 câu", drill, "btn ghost"),
        sc.el),
      drillBox);
  };

  B.gaps = (b) => {
    const sc = scoreLine();
    const fields = [];
    const list = h("ol", { class: "gap-list" }, b.items.map((it) => {
      const parts = it.q.split("___");
      const n = parts.length - 1;
      const answers = n > 1 ? it.a : [it.a];
      const li = h("li", {}, h("span", { html: parts[0] }));
      for (let k = 0; k < n; k++) {
        const choices = it.opts ? (n > 1 ? it.opts[k] : it.opts) : b.bank;
        const input = choices
          ? h("select", { class: "sel" }, h("option", { value: "" }, "…"), choices.map((w) => h("option", { value: w }, w)))
          : textInput({ size: it.size || Math.max(6, Math.max(...answers[k].map((x) => x.length)) + 1), "aria-label": "Chỗ trống" });
        fields.push({ input, a: answers[k], li, it, choices });
        li.append(input, h("span", { html: parts[k + 1] || "" }));
        if (!choices) input.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          const i = fields.findIndex((f) => f.input === input);
          const next = fields.slice(i + 1).find((f) => !f.choices);
          if (next) next.input.focus(); else checkAll();
        });
      }
      li.append(h("span", { class: "ans", hidden: true }, " ✓ " + answers.map((a) => a.join(" / ")).join(" · ")));
      li.append(h("span", { class: "gap-note", hidden: true }));
      return li;
    }));
    function checkAll() {
      let ok = 0;
      fields.forEach((f) => {
        const r = check(f.input.value, f.a);
        if (r.ok) ok++;
        else if (f.input.value) Missed.add("gap:" + f.it.q, { type: "gap", q: f.it.q, a: f.it.q.split("___").length > 2 ? f.it.a : [f.it.a], opts: f.choices ? [f.choices] : null });
        f.input.classList.toggle("ok", r.ok);
        f.input.classList.toggle("bad", !r.ok);
        const note = f.li.querySelector(".gap-note");
        note.hidden = !r.note;
        note.textContent = r.note ? " " + r.note : "";
      });
      sc.set(ok, fields.length);
    }
    return h("div", { class: "gaps" },
      b.bank ? h("div", { class: "bank" }, b.bank.map((w) => h("span", { class: "chip static" }, w))) : null,
      list,
      h("div", { class: "actions" },
        btn("Kiểm tra", checkAll, "btn"),
        btn("Xem đáp án", () => $$(".ans", list).forEach((a) => { a.hidden = false; }), "btn ghost"),
        sc.el));
  };

  B.choice = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const rows = b.items.map((it, i) => {
      const right = it.opts[it.a];
      const opts = it.keep ? it.opts.slice() : shuffle(it.opts);
      const why = h("div", { class: "why", hidden: true, html: it.why || "" });
      const row = h("div", { class: "ch-row" },
        h("p", { class: "ch-q", html: i + 1 + ". " + it.q }),
        h("div", { class: "ch-opts" }, opts.map((o) => h("button", { type: "button", class: "pick", html: o, onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          n++;
          const good = o === right;
          if (good) ok++;
          else Missed.add("ch:" + it.q, { type: "choice", q: it.q, opts, a: opts.indexOf(right), why: it.why });
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[opts.indexOf(right)].classList.add("ok");
          why.hidden = !it.why;
          if (n === b.items.length) sc.set(ok, n);
        } }))),
        why);
      return row;
    });
    return h("div", { class: "choice" }, rows, sc.el);
  };

  B.sort = (b) => {
    const sc = scoreLine();
    let sel = null, ok = 0, done = 0;
    const pool = h("div", { class: "sort-pool" });
    const cols = b.cats.map((c, ci) => {
      const list = h("div", { class: "sort-list" });
      const col = h("div", { class: "sort-col" + (b.gender ? " gcol g-col-" + c : ""), onclick: () => place(ci) }, h("div", { class: "sort-head", html: c }), list);
      col.list = list;
      return col;
    });
    const items = shuffle(b.items).map((it) => {
      const el = h("button", { type: "button", class: "sort-card", html: it.t, onclick: (e) => {
        if (el.dataset.done) return;
        e.stopPropagation();
        if (sel) sel.classList.remove("sel");
        sel = sel === el ? null : el;
        if (sel) sel.classList.add("sel");
      } });
      el.it = it;
      return el;
    });
    items.forEach((el) => pool.append(el));
    function place(ci) {
      if (!sel) { toast("Bấm chọn một thẻ trước, rồi bấm vào cột."); return; }
      const el = sel, it = el.it;
      sel = null;
      el.classList.remove("sel");
      el.dataset.done = 1;
      done++;
      const good = ci === it.c;
      if (good) ok++;
      else Missed.add("sort:" + it.t, { type: "choice", q: (b.gender ? "___ " : "") + it.t, opts: b.cats, a: it.c, why: it.why });
      el.classList.add(good ? "ok" : "bad");
      if (b.gender) { el.classList.add("g-" + b.cats[it.c] + "-word"); Speech.say(b.cats[it.c] + " " + window.DR.strip(it.t)); }
      cols[it.c].list.append(h("div", { class: "sort-item" }, el, !good ? h("div", { class: "sort-why" }, "✗ " + (it.why || "Cột đúng: " + window.DR.strip(b.cats[it.c]))) : null));
      if (done === b.items.length) sc.set(ok, done);
    }
    return h("div", { class: "sort" }, h("p", { class: "muted small" }, "Bấm vào một thẻ, rồi bấm vào cột đúng."), pool, h("div", { class: "sort-cols" + (b.cats.length >= 3 ? " three" : "") }, cols), sc.el);
  };

  B.order = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const rows = b.items.map((it, i) => {
      const N = it.chunks.length;
      const sentence = it.chunks.join(" ");
      let pool = shuffle(it.chunks.map((c, k) => k));
      for (let tries = 0; N > 1 && pool.every((k, j) => k === j) && tries < 10; tries++) pool = shuffle(pool);
      let built = [];
      const slots = h("div", { class: "ord-slots" });
      const bank = h("div", { class: "ord-bank" });
      const res = h("div", { class: "ord-res", hidden: true });
      const row = h("div", { class: "ord-row" },
        h("p", { class: "ord-q" }, h("b", {}, i + 1 + ". "), it.vi ? h("span", { lang: "vi" }, it.vi) : null),
        slots, bank, res);
      function paint() {
        slots.textContent = "";
        bank.textContent = "";
        for (let s = 0; s < N; s++) {
          const k = built[s];
          slots.append(h("button", { type: "button", class: "slot" + (s === it.v ? " v2-slot" : "") + (s === it.p ? " p-slot" : "") + (k == null ? " empty" : ""),
            onclick: () => { if (row.dataset.done || k == null) return; built.splice(s, 1); paint(); } },
            h("span", { class: "slot-n" }, s === it.v ? (s + 1) + " · động từ" : s === it.p ? (s + 1) + " · tiền tố" : String(s + 1)), k == null ? "" : it.chunks[k]));
        }
        pool.filter((k) => !built.includes(k)).forEach((k) => bank.append(h("button", { type: "button", class: "chunk",
          onclick: () => { if (row.dataset.done) return; built.push(k); paint(); if (built.length === N) checkIt(); } }, it.chunks[k])));
      }
      function checkIt() {
        row.dataset.done = 1;
        n++;
        const good = built.every((k, s) => k === s);
        if (good) { ok++; Speech.say(sentence); } else Missed.add("ord:" + sentence, { type: "gap", q: "(" + esc(it.chunks.join(" / ")) + ") → ___", a: [[sentence]] });
        row.classList.add(good ? "ord-ok" : "ord-bad");
        res.hidden = false;
        res.textContent = "";
        res.append(h("span", { html: (good ? "✓ " : "✗ Đúng là: ") + "<b>" + esc(sentence) + "</b>" }), " ", btn("🔊", () => Speech.say(sentence), "icon-btn tiny", "Nghe"));
        if (!good) res.append(" ", btn("Thử lại", () => { delete row.dataset.done; row.classList.remove("ord-ok", "ord-bad"); built = []; res.hidden = true; n--; paint(); }, "btn small ghost"));
        if (n === b.items.length) sc.set(ok, n);
      }
      paint();
      return row;
    });
    return h("div", { class: "order" }, h("p", { class: "muted small" }, "Bấm các cụm theo đúng thứ tự. Bấm vào ô đã xếp để gỡ ra."), rows, sc.el);
  };

  B.fix = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const rows = b.items.map((it, i) => {
      const words = it.s.split(" ");
      const spans = words.map((w) => h("span", { class: "fx-w", onclick: (e) => { if (!row.dataset.done) e.currentTarget.classList.toggle("on"); } }, w));
      const sent = h("span", { class: "fx-s" });
      spans.forEach((sp, k) => { sent.append(sp); if (k < spans.length - 1) sent.append(" "); });
      const input = textInput({ class: "gap-in wide", placeholder: "sửa thành… (để trống = xoá)" });
      const res = h("div", { class: "fx-res", hidden: true });
      const fixShown = (it.fix || []).map((f) => (f === "" ? "(xoá đi)" : f)).join(" / ");
      const finish = (good, msg) => {
        row.dataset.done = 1;
        n++;
        if (good) ok++;
        else Missed.add("fix:" + it.s, { type: "choice", q: "Câu này có lỗi không? <i>" + esc(it.s) + "</i>", opts: it.err ? ["Có: " + esc(it.err) + " → " + esc(fixShown), "Câu đúng"] : ["Câu đúng", "Có lỗi"], a: 0, why: it.why });
        row.classList.add(good ? "fx-ok" : "fx-bad");
        res.hidden = false;
        res.innerHTML = (good ? "✓ " : "✗ ") + msg + (it.why ? "<br><span class='muted'>" + it.why + "</span>" : "");
        if (it.err) {
          const errW = it.err.split(" ").map(fold);
          for (let k = 0; k + errW.length <= words.length; k++) {
            if (errW.every((x, m) => fold(words[k + m]) === x)) { for (let m = 0; m < errW.length; m++) spans[k + m].classList.add("err"); break; }
          }
        }
        if (n === b.items.length) sc.set(ok, n);
      };
      const checkBtn = btn("Kiểm tra", () => {
        if (row.dataset.done) return;
        const picked = spans.filter((x) => x.classList.contains("on")).map((x) => fold(x.textContent)).join(" ");
        if (!it.err) return finish(false, "Câu này không có lỗi — lẽ ra bấm „Câu đúng“.");
        if (!picked) { toast("Bấm vào chữ sai trước đã."); return; }
        const rightSpot = picked === fold(it.err);
        const val = input.value.trim();
        const del = (it.fix || []).includes("") && (!val || /^[-–—x]$|^xo[aá]$/i.test(val));
        const rightFix = del || (val && (it.fix || []).some((f) => f && (it.exact ? f === val : fold(f) === fold(val))));
        finish(rightSpot && rightFix, rightSpot && rightFix ? "Đúng: <b>" + esc(it.err) + "</b> → <b>" + esc(fixShown) + "</b>" : "Đáp án: <b>" + esc(it.err) + "</b> → <b>" + esc(fixShown) + "</b>");
      }, "btn small");
      const okBtn = btn("Câu đúng", () => {
        if (row.dataset.done) return;
        finish(!it.err, it.err ? "Câu này có lỗi: <b>" + esc(it.err) + "</b> → <b>" + esc(fixShown) + "</b>" : "Đúng, câu này không có lỗi.");
      }, "btn small ghost");
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") checkBtn.click(); });
      const row = h("div", { class: "fx-row" },
        it.ctx ? h("div", { class: "fx-ctx muted small", lang: "vi" }, it.ctx) : null,
        h("div", {}, h("b", {}, i + 1 + ". "), sent),
        h("div", { class: "fx-tools" }, input, checkBtn, okBtn), res);
      return row;
    });
    return h("div", { class: "fixit" }, h("p", { class: "muted small" }, "Bấm vào chữ sai, gõ cách sửa rồi bấm Kiểm tra. Nếu câu không sai, bấm „Câu đúng“."), rows, sc.el);
  };

  const GREET = ["Guten Morgen!", "Guten Tag!", "Guten Abend!", "Gute Nacht!", "Hallo!", "Tschüs!", "Auf Wiedersehen!"];
  const SITS = [
    { s: "bạn gặp bà hàng xóm (lịch sự)", r: [[6, 0, 9, 45], [11, 30, 16, 45], [18, 30, 22, 0]], a: (m) => (m < 11 * 60 ? "Guten Morgen!" : m < 18 * 60 ? "Guten Tag!" : "Guten Abend!"), no: ["Hallo!"],
      why: (a) => a === "Guten Morgen!" ? "Buổi sáng, lịch sự → Guten Morgen." : a === "Guten Tag!" ? "Ban ngày, lịch sự → Guten Tag." : "Buổi tối, khi gặp → Guten Abend (không phải Gute Nacht)." },
    { s: "bạn gặp bạn thân", r: [[7, 0, 21, 0]], a: () => "Hallo!", no: ["Guten Morgen!", "Guten Tag!", "Guten Abend!"], why: () => "Gặp bạn bè → Hallo." },
    { s: "bạn chào sếp để ra về", r: [[16, 0, 18, 0]], a: () => "Auf Wiedersehen!", no: ["Tschüs!", "Gute Nacht!"], why: () => "Chia tay, lịch sự → Auf Wiedersehen." },
    { s: "bạn chia tay bạn thân", r: [[9, 0, 20, 30]], a: () => "Tschüs!", no: ["Auf Wiedersehen!", "Gute Nacht!"], why: () => "Chia tay bạn bè → Tschüs." },
    { s: "bạn đi ngủ, chào mẹ", r: [[21, 30, 23, 30]], a: () => "Gute Nacht!", no: ["Tschüs!", "Auf Wiedersehen!"], why: () => "Trước khi đi ngủ → Gute Nacht." },
  ];
  B.timeGreet = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const N = b.n || 8;
    const rows = Array.from({ length: N }, (x, i) => {
      const sit = SITS[i < SITS.length ? i : Math.floor(Math.random() * SITS.length)];
      const r = sit.r[Math.floor(Math.random() * sit.r.length)];
      const from = r[0] * 60 + r[1], to = r[2] * 60 + r[3];
      const m = from + Math.floor(Math.random() * ((to - from) / 15 + 1)) * 15;
      const clock = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
      const right = sit.a(m);
      const opts = shuffle([right, ...sample(GREET.filter((g) => g !== right && !sit.no.includes(g)), 3)]);
      const why = h("div", { class: "why", hidden: true }, sit.why(right));
      const row = h("div", { class: "tg-row" },
        h("div", { class: "tg-q" }, h("span", { class: "clock" }, "🕒 " + clock), h("span", { lang: "vi" }, " — " + sit.s + ". Bạn nói:")),
        h("div", { class: "ch-opts" }, opts.map((o) => h("button", { type: "button", class: "pick", onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          n++;
          const good = o === right;
          if (good) ok++;
          else Missed.add("tg:" + clock + sit.s, { type: "choice", q: "🕒 " + clock + " — " + sit.s + ":", opts, a: opts.indexOf(right), why: sit.why(right) });
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[opts.indexOf(right)].classList.add("ok");
          why.hidden = false;
          Speech.say(right);
          if (n === N) sc.set(ok, n);
        } }, o))), why);
      return row;
    });
    const wrap = h("div", { class: "time-greet" }, shuffle(rows), h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.timeGreet(b)), "btn small ghost")));
    return wrap;
  };

  const ALPHA = [["A", "a"], ["B", "be"], ["C", "tse"], ["D", "de"], ["E", "e"], ["F", "ef"], ["G", "ge"], ["H", "ha"], ["I", "i"], ["J", "jot"], ["K", "ka"], ["L", "el"], ["M", "em"],
    ["N", "en"], ["O", "o"], ["P", "pe"], ["Q", "ku"], ["R", "er"], ["S", "es"], ["T", "te"], ["U", "u"], ["V", "fau"], ["W", "we"], ["X", "iks"], ["Y", "ypsilon"], ["Z", "tsett"],
    ["Ä", "ä"], ["Ö", "ö"], ["Ü", "ü"], ["ß", "eszett"]];
  const TRICKY = { E: "đọc „ê“, không phải „i“", I: "đọc „i“, không phải „ai“", A: "đọc „a“, không phải „ây“", J: "„jót“", V: "„phao“", W: "„vê“", Y: "„üp-xi-lon“", Z: "„txét“", C: "„txê“", Q: "„cu“", "ß": "„ét-txét“", H: "„ha“", G: "„ghê“", R: "„e-r“" };
  B.alphabet = () => {
    let token = null;
    const tiles = ALPHA.map(([L, name]) => h("button", { type: "button", class: "ab-tile" + (TRICKY[L] ? " tricky" : ""), title: TRICKY[L] || "", onclick: () => Speech.say(LETTERS[L]) },
      h("span", { class: "ab-l" }, L === "ß" ? "ß" : L + L.toLowerCase()), h("span", { class: "ab-n" }, name)));
    const all = btn("▶ Nghe cả bảng", async () => {
      if (token) { token = null; Speech.stop(); all.textContent = "▶ Nghe cả bảng"; return; }
      const me = (token = {});
      all.textContent = "⏹ Dừng";
      for (let i = 0; i < ALPHA.length; i++) {
        if (token !== me) return;
        tiles.forEach((t) => t.classList.remove("now"));
        tiles[i].classList.add("now");
        await Speech.say(LETTERS[ALPHA[i][0]]);
        await wait(250);
      }
      tiles.forEach((t) => t.classList.remove("now"));
      if (token === me) { token = null; all.textContent = "▶ Nghe cả bảng"; }
    }, "btn small ghost");
    return h("div", { class: "alphabet" }, h("div", { class: "actions" }, all, h("span", { class: "muted small" }, "Chữ có chấm cam là chữ hay đọc nhầm.")), h("div", { class: "ab-grid" }, tiles));
  };
  const CONFUSE = { E: ["I", "A", "Ä"], I: ["E", "J", "Y"], A: ["E", "R", "H"], J: ["G", "Y", "I"], V: ["W", "F", "U"], W: ["V", "B", "U"], Y: ["J", "Ü", "I"], Z: ["C", "S", "T"],
    C: ["Z", "S", "T"], Q: ["K", "U", "G"], G: ["J", "K", "D"], H: ["A", "K", "R"], R: ["A", "E", "H"], "Ü": ["U", "Y", "I"], "Ö": ["O", "E", "U"], "Ä": ["E", "A", "I"], "ß": ["S", "Z", "B"] };
  B.letterPick = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const N = b.n || 10;
    const letters = sample(Object.keys(CONFUSE), N);
    const rows = letters.map((L, i) => {
      const opts = shuffle([L, ...CONFUSE[L]]);
      const row = h("div", { class: "hp-row" }, h("b", {}, i + 1 + "."), btn("🔊", () => Speech.say(LETTERS[L]), "btn small", "Nghe"),
        h("span", { class: "hp-opts" }, opts.map((o) => h("button", { type: "button", class: "pick letter", onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          n++;
          const good = o === L;
          if (good) ok++;
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[opts.indexOf(L)].classList.add("ok");
          if (n === N) sc.set(ok, n);
        } }, o))));
      return row;
    });
    const wrap = h("div", { class: "hear-pick" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.letterPick(b)), "btn small ghost")));
    return wrap;
  };
  B.spell = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const words = sample(b.words, Math.min(b.n || 6, b.words.length));
    const rows = words.map((w, i) => {
      const sp = spellOut(w);
      const input = textInput({ class: "gap-in", size: 12, "aria-label": "Từ bạn nghe được" });
      const res = h("span", { class: "sp-res" });
      const go = () => {
        if (row.dataset.done) return;
        if (!input.value.trim()) return toast("Gõ từ bạn nghe được trước đã.");
        row.dataset.done = 1;
        n++;
        const good = check(input.value, [w]).ok;
        if (good) ok++;
        input.classList.add(good ? "ok" : "bad");
        res.textContent = (good ? " ✓ " : " ✗ ") + w + "  (" + sp.shown + ")";
        Speech.say(w);
        if (n === words.length) sc.set(ok, n);
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const row = h("div", { class: "sp-row" }, h("b", {}, i + 1 + "."),
        btn("🔊 Nghe đánh vần", () => Speech.say(sp.say, { rate: 0.8 }), "btn small"),
        btn("🐢", () => Speech.say(sp.say, { slow: true }), "icon-btn", "Nghe chậm"),
        input, btn("Kiểm tra", go, "btn small ghost"), res);
      return row;
    });
    const wrap = h("div", { class: "spell" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.spell(b)), "btn small ghost")));
    return wrap;
  };
  B.spellMe = () => {
    const me = store.get("me", {});
    const input = textInput({ class: "gap-in wide", value: [me.first, me.last].filter(Boolean).join(" "), placeholder: "Ví dụ: Nguyễn Thu Hà", "aria-label": "Tên của bạn" });
    const out = h("div", { class: "spell-out" });
    function show() {
      out.textContent = "";
      const parts = input.value.trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return;
      const plain = parts.map(plainName).join(" ");
      if (plain !== parts.join(" ")) out.append(h("p", { class: "muted small" }, "Ở Đức, tên thường viết không dấu: ", h("b", {}, plain)));
      parts.forEach((p) => {
        const sp = spellOut(p);
        out.append(h("div", { class: "sp-me" }, h("b", {}, plainName(p)), h("span", { class: "sp-letters" }, sp.shown),
          btn("🔊", () => Speech.say(sp.say, { rate: 0.8 }), "icon-btn", "Nghe đánh vần"), btn("🐢", () => Speech.say(sp.say, { slow: true }), "icon-btn", "Nghe chậm")));
      });
    }
    input.addEventListener("input", show);
    show();
    return h("div", { class: "spell-me" }, h("label", { class: "muted small" }, "Gõ họ tên của bạn:"), input, out,
      h("p", { class: "muted small" }, "Nói to theo: ", h("i", {}, "Ich buchstabiere: …"), " rồi đọc từng chữ cái."));
  };

  const ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf",
    "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
  const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];
  function numWord(n) {
    if (n < 20) return ONES[n];
    if (n < 100) {
      const t = Math.floor(n / 10), o = n % 10;
      return o === 0 ? TENS[t] : (o === 1 ? "ein" : ONES[o]) + "und" + TENS[t];
    }
    if (n < 1000) {
      const c = Math.floor(n / 100), r = n % 100;
      return (c === 1 ? "hundert" : ONES[c] + "hundert") + (r ? numWord(r) : "");
    }
    if (n < 1000000) {
      const th = Math.floor(n / 1000), r = n % 1000;
      return (th === 1 ? "tausend" : numWord(th).replace(/eins$/, "ein") + "tausend") + (r ? numWord(r) : "");
    }
    return n === 1000000 ? "eine Million" : String(n);
  }
  function numVariants(n) {
    const base = numWord(n);
    const out = new Set([base]);
    const ein = (t) => t.replace(/(^|tausend)hundert/g, "$1einhundert");
    const tau = (t) => t.replace(/^tausend/, "eintausend");
    [ein(base), tau(base), ein(tau(base))].forEach((t) => out.add(t));
    return [...out];
  }
  const fmtNum = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const NUMW = Array.from({ length: 21 }, (x, i) => numWord(i));
  const NUM_TRICKY = new Set([6, 7, 11, 12, 16, 17, 30, 60, 70]);
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const numRange = (b) => [b.min == null ? 0 : b.min, b.max == null ? 20 : b.max];
  const pickNum = (b) => (b.pool ? b.pool[rnd(0, b.pool.length - 1)] : rnd(...numRange(b)));

  B.numbers = (b = {}) => {
    let token = null;
    const values = b.values || Array.from({ length: 21 }, (x, i) => i);
    const tiles = values.map((v) => h("button", { type: "button", class: "ab-tile" + (NUM_TRICKY.has(v) ? " tricky" : ""), onclick: () => Speech.say(numWord(v)) },
      h("span", { class: "ab-l" }, fmtNum(v)), h("span", { class: "ab-n" }, numWord(v))));
    const all = btn("▶ Nghe cả bảng", async () => {
      if (token) { token = null; Speech.stop(); all.textContent = "▶ Nghe cả bảng"; return; }
      const me = (token = {});
      all.textContent = "⏹ Dừng";
      for (let i = 0; i < values.length; i++) {
        if (token !== me) return;
        tiles.forEach((t) => t.classList.remove("now"));
        tiles[i].classList.add("now");
        await Speech.say(numWord(values[i]));
        await wait(300);
      }
      tiles.forEach((t) => t.classList.remove("now"));
      if (token === me) { token = null; all.textContent = "▶ Nghe cả bảng"; }
    }, "btn small ghost");
    return h("div", { class: "alphabet" }, h("div", { class: "actions" }, all, h("span", { class: "muted small" }, "Chấm cam = số hay đọc hoặc viết nhầm.")), h("div", { class: "ab-grid" + (b.wide ? " wide" : "") }, tiles));
  };

  function numOptions(x, lo, hi) {
    const first = [];
    const r = x % 100, base = x - r;
    if (r >= 13 && r <= 19) first.push(base + (r - 10) * 10);
    if (r >= 30 && r <= 90 && r % 10 === 0) first.push(base + r / 10 + 10);
    if (r >= 21 && r <= 99 && r % 10 !== 0) first.push(base + (r % 10) * 10 + Math.floor(r / 10));
    const more = x >= 100 ? [x - 1, x + 1, x - 10, x + 10, x - 100, x + 100] : [x - 1, x + 1, x - 10, x + 10];
    if (x >= 100) {
      const d = String(x);
      for (let i = 0; i < d.length - 1; i++) {
        if (d[i] === d[i + 1]) continue;
        const t = d.slice(0, i) + d[i + 1] + d[i] + d.slice(i + 2);
        if (t[0] !== "0") more.push(+t);
      }
      if (x >= 1000) { more.push(x * 10); if (x % 10 === 0) more.push(x / 10); }
    }
    const ok = (n) => n >= lo && n <= hi && n !== x;
    const out = [];
    for (const n of [...first, ...shuffle(more)]) if (ok(n) && !out.includes(n)) out.push(n);
    while (out.length < 3) { const v = rnd(lo, hi); if (ok(v) && !out.includes(v)) out.push(v); }
    return shuffle([x, ...out.slice(0, 3)]);
  }
  const DIGITW = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
  function digitsQ(b) {
    const sizes = b.groups || (b.mobile ? [4, 3, 3] : [3, 3]);
    const flat = (b.mobile ? "01" + [5, 6, 7][rnd(0, 2)] + rnd(0, 9) : "") + Array.from({ length: sizes.reduce((a, c) => a + c, 0) - (b.mobile ? 4 : 0) }, () => rnd(0, 9)).join("");
    const cut = (t) => { let i = 0; return sizes.map((n) => { const part = t.slice(i, i + n); i += n; return part; }); };
    const say = (t) => cut(t).map((g) => g.split("").map((c) => DIGITW[+c]).join(" ")).join(", ");
    const opts = new Map([[flat, 1]]);
    for (let guard = 0; opts.size < 4 && guard < 120; guard++) {
      const a = flat.split("");
      const i = rnd(b.mobile ? 4 : 0, a.length - 2);
      if (Math.random() < 0.6) { if (a[i] !== a[i + 1]) [a[i], a[i + 1]] = [a[i + 1], a[i]]; }
      else a[i] = String((+a[i] + rnd(1, 9)) % 10);
      opts.set(a.join(""), 1);
    }
    const list = shuffle([...opts.keys()]);
    return { say: say(flat), shown: cut(flat).join(" "), rate: 0.75, opts: list.map((t) => cut(t).join(" ")), right: list.indexOf(flat) };
  }
  function phoneOptions(seq) {
    const out = new Map([[seq.join(" "), seq]]);
    for (let guard = 0; out.size < 4 && guard < 80; guard++) {
      const alt = seq.slice();
      const i = Math.floor(Math.random() * alt.length);
      if (Math.random() < 0.5) alt[i] = alt[i] <= 10 ? alt[i] + 10 : alt[i] - 10;
      else { const j = (i + 1) % alt.length; [alt[i], alt[j]] = [alt[j], alt[i]]; }
      out.set(alt.join(" "), alt);
    }
    return shuffle([...out.values()]);
  }
  function hearRound(b, makeQ, again) {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const N = b.n || 8;
    const rows = Array.from({ length: N }, (x, i) => {
      const q = makeQ();
      const reveal = h("span", { class: "reveal", hidden: true }, q.shown);
      const row = h("div", { class: "hp-row" }, h("b", {}, i + 1 + "."),
        btn("🔊", () => Speech.say(q.say, { rate: q.rate }), "btn small", "Nghe"),
        btn("🐢", () => Speech.say(q.say, { slow: true }), "icon-btn", "Nghe chậm"),
        h("span", { class: "hp-opts" }, q.opts.map((o, j) => h("button", { type: "button", class: "pick letter", onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          n++;
          const good = j === q.right;
          if (good) ok++;
          else Missed.add("hr:" + q.say, { type: "choice", q: "<span class='say-inline' data-say='" + esc(q.say) + "'>🔊 Bấm nghe</span> — nghe được gì?", opts: q.opts, a: q.right });
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[q.right].classList.add("ok");
          reveal.hidden = false;
          if (n === N) sc.set(ok, n);
        } }, o))),
        reveal);
      return row;
    });
    return h("div", { class: "hear-pick" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => again(), "btn small ghost")));
  }
  B.numHear = (b) => {
    const phone = b.mode === "phone";
    const digits = b.mode === "digits";
    const [lo, hi] = b.pool ? [0, Math.max(100, ...b.pool)] : numRange(b);
    const wrap = hearRound(b, () => {
      if (digits) return digitsQ(b);
      const seq = phone ? Array.from({ length: 3 }, () => rnd(0, 20)) : [pickNum(b)];
      const opts = phone ? phoneOptions(seq) : numOptions(seq[0], lo, hi).map((v) => [v]);
      const key = seq.join(" ");
      const show = (o) => (phone ? o.join(" ") : fmtNum(o[0]));
      return { say: seq.map(numWord).join(", "), shown: seq.map(numWord).join(phone ? " · " : ""), rate: phone ? 0.75 : undefined,
        opts: opts.map(show), right: opts.findIndex((o) => o.join(" ") === key) };
    }, () => wrap.replaceWith(B.numHear(b)));
    return wrap;
  };
  B.numWrite = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const N = b.n || 8;
    const read = b.mode === "read";
    const [lo, hi] = numRange(b);
    const pool = b.pool ? b.pool.slice() : Array.from({ length: hi - lo + 1 }, (x, i) => lo + i);
    const nums = shuffle(pool).slice(0, N);
    const rows = nums.map((x, i) => {
      const input = textInput({ size: read ? 9 : 26, "aria-label": "Câu trả lời" });
      const res = h("span", { class: "sp-res" });
      const answers = read ? [String(x)] : numVariants(x);
      const go = () => {
        if (row.dataset.done) return;
        if (!input.value.trim()) return toast("Gõ câu trả lời trước đã.");
        row.dataset.done = 1;
        n++;
        const raw = input.value.trim();
        const typed = read ? raw.replace(/[.\s]/g, "") : raw.replace(/\s+/g, "");
        const r = check(typed, read ? answers : answers.map((a) => a.replace(/\s+/g, "")));
        if (r.ok && !read && typed !== raw && !/\s/.test(numWord(x))) r.note = "Số Đức viết liền thành một từ: " + numWord(x);
        if (r.ok) ok++;
        else Missed.add("nw:" + x + read, { type: "gap", q: (read ? esc(numWord(x)) : fmtNum(x)) + " = ___", a: [answers] });
        input.classList.add(r.ok ? "ok" : "bad");
        res.textContent = (r.ok ? " ✓ " : " ✗ ") + fmtNum(x) + " = " + numWord(x) + (r.note ? "  · " + r.note : "");
        Speech.say(numWord(x));
        if (n === N) sc.set(ok, n);
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const row = h("div", { class: "sp-row" }, h("b", {}, i + 1 + "."),
        h("span", { class: "nw-q" }, read ? h("span", { class: "say-inline", "data-say": numWord(x) }, numWord(x)) : fmtNum(x)),
        h("span", {}, "="), input, btn("Kiểm tra", go, "btn small ghost"), res);
      return row;
    });
    const wrap = h("div", { class: "spell" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.numWrite(b)), "btn small ghost")));
    return wrap;
  };

  const eu = (n) => (n === 1 ? "ein" : numWord(n));
  function priceWords(e, c) {
    if (e === 0) return (c === 1 ? "ein" : numWord(c)) + " Cent";
    if (c === 0) return eu(e) + " Euro";
    return eu(e) + " Euro " + numWord(c);
  }
  const priceFmt = (e, c) => e + "," + String(c).padStart(2, "0") + " €";
  const CENTS = [5, 10, 15, 20, 25, 29, 30, 35, 39, 40, 45, 49, 50, 55, 59, 60, 65, 69, 70, 75, 79, 80, 85, 89, 90, 95, 99];
  function randPrice(maxEuro) {
    const e = rnd(0, maxEuro);
    let c = Math.random() < 0.15 ? 0 : CENTS[rnd(0, CENTS.length - 1)];
    if (e === 0 && c === 0) c = 50;
    return [e, c];
  }
  function priceOptions(e, c) {
    const out = new Map([[priceFmt(e, c), [e, c]]]);
    const swapped = c >= 1 && c % 11 !== 0 ? [e, (c % 10) * 10 + Math.floor(c / 10)] : null;
    const alts = [[e + 1, c], [Math.max(e - 1, 0), c], [e, c <= 49 ? c + 50 : c - 50], [e === 0 ? 1 : e, c]];
    for (const [e2, c2] of [...(swapped ? [swapped] : []), ...shuffle(alts)]) {
      if (out.size >= 4) break;
      if (c2 >= 0 && c2 <= 99 && !(e2 === 0 && c2 === 0)) out.set(priceFmt(e2, c2), [e2, c2]);
    }
    while (out.size < 4) { const [e3, c3] = randPrice(Math.max(e + 3, 5)); out.set(priceFmt(e3, c3), [e3, c3]); }
    return shuffle([...out.values()]);
  }
  B.priceHear = (b) => {
    const wrap = hearRound(b, () => {
      const [e, c] = randPrice(b.maxEuro == null ? 20 : b.maxEuro);
      const opts = priceOptions(e, c).map((o) => priceFmt(o[0], o[1]));
      return { say: priceWords(e, c), shown: priceWords(e, c), opts, right: opts.indexOf(priceFmt(e, c)) };
    }, () => wrap.replaceWith(B.priceHear(b)));
    return wrap;
  };
  B.priceWrite = (b) => {
    const sc = scoreLine();
    let ok = 0, n = 0;
    const N = b.n || 6;
    const rows = Array.from({ length: N }, (x, i) => {
      const [e, c] = randPrice(b.maxEuro == null ? 20 : b.maxEuro);
      const words = priceWords(e, c);
      const answers = e > 0 && c > 0 ? [words, words + " Cent"] : [words];
      const input = textInput({ size: 30, "aria-label": "Giá bằng chữ" });
      const res = h("span", { class: "sp-res" });
      const go = () => {
        if (row.dataset.done) return;
        if (!input.value.trim()) return toast("Gõ câu trả lời trước đã.");
        row.dataset.done = 1;
        n++;
        const r = check(input.value, answers);
        if (r.ok) ok++;
        else Missed.add("pw:" + priceFmt(e, c), { type: "gap", q: priceFmt(e, c) + " = ___", a: [answers] });
        input.classList.add(r.ok ? "ok" : "bad");
        res.textContent = (r.ok ? " ✓ " : " ✗ ") + words + (r.note ? "  · " + r.note : "");
        Speech.say(words);
        if (n === N) sc.set(ok, n);
      };
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); });
      const row = h("div", { class: "sp-row" }, h("b", {}, i + 1 + "."), h("span", { class: "nw-q" }, priceFmt(e, c)), h("span", {}, "="), input, btn("Kiểm tra", go, "btn small ghost"), res);
      return row;
    });
    const wrap = h("div", { class: "spell" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.priceWrite(b)), "btn small ghost")));
    return wrap;
  };

  const HW = ["", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
  const pad2 = (n) => String(n).padStart(2, "0");
  const digital = (h24, m) => pad2(h24) + ":" + pad2(m);
  const wrapH = (x) => ((x % 24) + 24) % 24;
  const wrapM = (x) => ((x % 60) + 60) % 60;
  const h12 = (h24) => (h24 % 12 === 0 ? 12 : h24 % 12);
  function timePrivate(h24, m) {
    const h = h12(h24), nx = (h % 12) + 1;
    if (m === 0) return [(h === 1 ? "ein" : HW[h]) + " Uhr", HW[h]];
    if (m >= 1 && m <= 4) return ["kurz nach " + HW[h]];
    if (m >= 56) return ["kurz vor " + HW[nx], "gleich " + HW[nx]];
    const t = {
      5: ["fünf nach " + HW[h]], 10: ["zehn nach " + HW[h]], 15: ["Viertel nach " + HW[h]],
      20: ["zwanzig nach " + HW[h], "zehn vor halb " + HW[nx]], 25: ["fünf vor halb " + HW[nx]], 30: ["halb " + HW[nx]],
      35: ["fünf nach halb " + HW[nx]], 40: ["zwanzig vor " + HW[nx], "zehn nach halb " + HW[nx]], 45: ["Viertel vor " + HW[nx]],
      50: ["zehn vor " + HW[nx]], 55: ["fünf vor " + HW[nx]],
    };
    return t[m] || [];
  }
  function timeOfficial(h24, m) {
    return (h24 === 1 ? "ein" : numWord(h24)) + " Uhr" + (m ? " " + numWord(m) : "");
  }
  const timePhrases = (style, h24, m) => (style === "official" ? [timeOfficial(h24, m)] : timePrivate(h24, m));
  const STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  function randTime(b, style) {
    const mins = b.minutes || (b.kurz ? STEPS.concat([58, 2]) : STEPS);
    const [h0, h1] = b.hours || (style === "official" ? [0, 23] : [1, 12]);
    return [rnd(h0, h1), mins[rnd(0, mins.length - 1)]];
  }
  const timeKey = (style, t) => (style === "official" ? digital(t[0], t[1]) : digital(t[0] % 12, t[1]));
  const timeShown = (style, t) => (style === "official" ? digital(t[0], t[1]) : digital(h12(t[0]), t[1]));
  function timeDistractors(style, h24, m) {
    const c = [[h24, wrapM(60 - m)], [h24 + 1, m], [h24 - 1, m], [h24, m + 5], [h24, m - 5], [h24, m + 10], [h24, m - 10]];
    if (style === "official") c.push([h24 + 12, m], [h24 - 12, m]);
    const seen = new Set([timeKey(style, [h24, m])]);
    const out = [];
    for (const [hh, mm] of shuffle(c)) {
      const t = [wrapH(hh), wrapM(mm)];
      const k = timeKey(style, t);
      if (!seen.has(k) && timePhrases(style, t[0], t[1]).length) { seen.add(k); out.push(t); }
    }
    while (out.length < 3) { const t = [rnd(0, 23), STEPS[rnd(0, 11)]]; const k = timeKey(style, t); if (!seen.has(k)) { seen.add(k); out.push(t); } }
    return out.slice(0, 3);
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs = {}) {
    const e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
    return e;
  }
  function clockSvg(h24, m, size = 110) {
    const svg = svgEl("svg", { viewBox: "0 0 100 100", width: size, height: size, class: "clock-svg", role: "img", "aria-label": digital(h12(h24), m) });
    svg.append(svgEl("circle", { cx: 50, cy: 50, r: 47, class: "cl-face" }));
    const at = (deg, r) => [(50 + r * Math.sin((deg * Math.PI) / 180)).toFixed(2), (50 - r * Math.cos((deg * Math.PI) / 180)).toFixed(2)];
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0;
      const [x1, y1] = at(i * 6, big ? 40 : 43.5), [x2, y2] = at(i * 6, 46);
      svg.append(svgEl("line", { x1, y1, x2, y2, class: "cl-tick", "stroke-width": big ? 1.6 : 0.6 }));
    }
    for (let k = 1; k <= 12; k++) {
      const [x, y] = at(k * 30, 32);
      const t = svgEl("text", { x, y: (+y + 3).toFixed(2), class: "cl-num" });
      t.textContent = String(k);
      svg.append(t);
    }
    const hand = (deg, len, w, cls) => { const [x, y] = at(deg, len); return svgEl("line", { x1: 50, y1: 50, x2: x, y2: y, "stroke-width": w, "stroke-linecap": "round", class: cls }); };
    svg.append(hand(((h24 % 12) + m / 60) * 30, 22, 3.4, "cl-hour"), hand(m * 6, 34, 2.2, "cl-min"), svgEl("circle", { cx: 50, cy: 50, r: 2.6, class: "cl-pin" }));
    return svg;
  }

  B.clockLab = (b = {}) => {
    let h24 = b.h == null ? 7 : b.h, m = b.m == null ? 45 : b.m;
    const MINS = [0, 2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58];
    const face = h("div", { class: "cl-face-wrap" });
    const dig = h("div", { class: "cl-digital" });
    const privText = h("span", { class: "cl-text" }), privAlt = h("span", { class: "cl-alt muted small" });
    const offText = h("span", { class: "cl-text" });
    const hs = h("select", { class: "sel", "aria-label": "Giờ", onchange: () => { h24 = +hs.value; paint(); } },
      Array.from({ length: 24 }, (x, i) => h("option", { value: String(i) }, pad2(i) + " giờ")));
    const ms = h("select", { class: "sel", "aria-label": "Phút", onchange: () => { m = +ms.value; paint(); } },
      MINS.map((x) => h("option", { value: String(x) }, pad2(x) + " phút" + (x === 2 ? " (kurz nach)" : x === 58 ? " (kurz vor)" : ""))));
    let pText = "", oText = "";
    function paint() {
      hs.value = String(h24);
      ms.value = String(m);
      face.textContent = "";
      face.append(clockSvg(h24, m, 160));
      dig.textContent = digital(h24, m);
      const p = timePrivate(h24, m);
      pText = "Es ist " + p[0] + ".";
      oText = "Es ist " + timeOfficial(h24, m) + ".";
      privText.textContent = pText;
      privAlt.textContent = m === 20 || m === 40 || m >= 56 ? "cũng đúng: " + p.slice(1).join(" · ") : "";
      offText.textContent = oText;
    }
    const step = (dm) => {
      const base = h24 * 60 + Math.round(m / 5) * 5;
      const t = (((base + dm) % 1440) + 1440) % 1440;
      h24 = Math.floor(t / 60);
      m = t % 60;
      paint();
    };
    const randomize = () => { h24 = rnd(0, 23); m = STEPS[rnd(0, 11)]; paint(); };
    const line = (tag, text, alt) => h("div", { class: "cl-line" }, h("span", { class: "cl-tag", lang: "vi" }, tag), text, alt || null,
      btn("🔊", () => Speech.say(text.textContent), "icon-btn tiny", "Nghe"), btn("🐢", () => Speech.say(text.textContent, { slow: true }), "icon-btn tiny", "Nghe chậm"));
    const wrap = h("div", { class: "clock-lab" }, face,
      h("div", { class: "cl-side" },
        h("div", { class: "cl-controls" }, hs, ms, btn("−5′", () => step(-5), "btn small ghost"), btn("+5′", () => step(5), "btn small ghost"), btn("🎲 Ngẫu nhiên", randomize, "btn small ghost")),
        dig,
        line("Thường ngày", privText, privAlt),
        line("Chính thức", offText)));
    paint();
    return wrap;
  };

  B.clockPick = (b) => {
    const mode = b.mode || "read";
    const N = b.n || 6;
    const sc = scoreLine();
    let ok = 0, done = 0;
    const used = new Set();
    const rows = Array.from({ length: N }, (x, i) => {
      const style = b.style === "mixed" ? (Math.random() < 0.5 ? "private" : "official") : b.style || "private";
      let t, guard = 0;
      do { t = randTime(b, style); } while (used.has(style + timeKey(style, t)) && ++guard < 40);
      used.add(style + timeKey(style, t));
      const [h24, m] = t;
      const right = timePhrases(style, h24, m)[0];
      const opts = shuffle([t, ...timeDistractors(style, h24, m)]);
      const rightIdx = opts.findIndex((o) => timeKey(style, o) === timeKey(style, t));
      const shown = timeShown(style, t);
      const sayText = "Es ist " + right + ".";
      const textOf = (o) => timePhrases(style, o[0], o[1])[0];
      const asClock = mode === "hear" && style === "private";
      const reveal = h("span", { class: "reveal", hidden: true }, shown + " · Es ist " + right);
      const head = mode === "read"
        ? h("div", { class: "cl-q" }, style === "private" ? clockSvg(h24, m, 92) : h("span", { class: "cl-digital small" }, shown), h("span", { class: "muted", lang: "vi" }, "Es ist …"))
        : h("div", { class: "cl-q" }, btn("🔊", () => Speech.say(sayText, { rate: 0.85 }), "btn small", "Nghe"), btn("🐢", () => Speech.say(sayText, { slow: true }), "icon-btn", "Nghe chậm"),
          h("span", { class: "muted small", lang: "vi" }, style === "official" ? "(giờ chính thức)" : "(giờ thường ngày)"));
      const row = h("div", { class: "hp-row cl-row" }, h("b", {}, i + 1 + "."), head,
        h("span", { class: "hp-opts" }, opts.map((o, j) => h("button", { type: "button", class: "pick" + (asClock ? " clock-opt" : ""), "data-time": timeShown(style, o), onclick: (e) => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          done++;
          const good = j === rightIdx;
          if (good) ok++;
          else Missed.add("cp:" + mode + style + shown, mode === "read"
            ? { type: "choice", q: "🕒 " + shown + " — Es ist …", opts: opts.map(textOf), a: rightIdx }
            : { type: "choice", q: "<span class='say-inline' data-say='" + esc(sayText) + "'>🔊 Bấm nghe</span> — mấy giờ?", opts: opts.map((x) => timeShown(style, x)), a: rightIdx });
          e.currentTarget.classList.add(good ? "ok" : "bad");
          $$(".pick", row)[rightIdx].classList.add("ok");
          reveal.hidden = false;
          Speech.say(sayText);
          if (done === N) sc.set(ok, done);
        } }, mode === "read" ? textOf(o) : asClock ? clockSvg(o[0], o[1], 78) : timeShown(style, o)))),
        reveal);
      return row;
    });
    const wrap = h("div", { class: "hear-pick clock-pick" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.clockPick(b)), "btn small ghost")));
    return wrap;
  };

  B.timeWrite = (b) => {
    const mode = b.mode || "words";
    const N = b.n || 6;
    const sc = scoreLine();
    let ok = 0, n = 0;
    const used = new Set();
    const rows = Array.from({ length: N }, (x, i) => {
      const style = b.style === "mixed" ? (Math.random() < 0.5 ? "private" : "official") : b.style || "private";
      let t, guard = 0;
      do { t = randTime(b, style); } while (used.has(style + timeKey(style, t)) && ++guard < 40);
      used.add(style + timeKey(style, t));
      const [h24, m] = t;
      const phrases = timePhrases(style, h24, m);
      const shown = timeShown(style, t);
      const okMinutes = (style === "official" ? [h24] : [h24 % 12, (h24 % 12) + 12]).map((hh) => hh * 60 + m);
      const input = textInput({ size: mode === "digits" ? 8 : 34, "aria-label": "Câu trả lời" });
      const res = h("span", { class: "sp-res" });
      const go = () => {
        if (row.dataset.done) return;
        const raw = input.value.trim();
        if (!raw) return toast("Gõ câu trả lời trước đã.");
        row.dataset.done = 1;
        n++;
        let good = false, note = "";
        if (mode === "digits") {
          const mm = raw.match(/^(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*uhr)?$/i);
          good = !!mm && okMinutes.includes(+mm[1] * 60 + +mm[2]);
        } else {
          const r = check(raw.replace(/^es\s+ist\s+/i, ""), phrases);
          good = r.ok;
          note = r.note || "";
        }
        if (good) ok++;
        else Missed.add("tw:" + mode + style + shown, { type: "gap", q: mode === "digits" ? "Es ist " + esc(phrases[0]) + " = ___" : shown + " (" + (style === "official" ? "chính thức" : "thường ngày") + ") → Es ist ___", a: [mode === "digits" ? [shown] : phrases] });
        input.classList.add(good ? "ok" : "bad");
        res.textContent = (good ? " ✓ " : " ✗ ") + shown + " = " + phrases[0] + (phrases.length > 1 && style === "private" && (m === 20 || m === 40 || m >= 56) ? "  (cũng đúng: " + phrases.slice(1).join(" / ") + ")" : "") + (note ? "  · " + note : "");
        Speech.say("Es ist " + phrases[0] + ".");
        if (n === N) sc.set(ok, n);
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      const kind = h("span", { class: "muted small", lang: "vi" }, style === "official" ? "(chính thức)" : "(thường ngày)");
      const question = mode === "digits"
        ? h("span", { class: "nw-q cl-phrase" }, h("span", { class: "say-inline", "data-say": "Es ist " + phrases[0] + "." }, "Es ist " + phrases[0] + "."))
        : h("span", { class: "nw-q" }, shown);
      const row = h("div", { class: "sp-row cl-row" }, h("b", {}, i + 1 + "."),
        mode === "words" && style === "private" && b.clock !== false ? clockSvg(h24, m, 64) : null,
        question, kind, h("span", {}, "="), input, btn("Kiểm tra", go, "btn small ghost"), res);
      return row;
    });
    const wrap = h("div", { class: "spell" }, rows, h("div", { class: "actions" }, sc.el, btn("↻ Lượt khác", () => wrap.replaceWith(B.timeWrite(b)), "btn small ghost")));
    return wrap;
  };

  B.tree = (b) => h("div", { class: "ftree" }, b.rows.map((r) => h("div", { class: "ft-gen" },
    h("div", { class: "ft-label muted small", lang: "vi" }, r.label),
    h("div", { class: "ft-row" }, r.people.map((p) => h("button", { type: "button", class: "ft-card " + (p.art ? "ft-" + p.art : "ft-me"), onclick: () => Speech.say(p.say || p.rel) },
      h("span", { class: "ft-rel" }, p.art ? h("span", { class: "art g-" + p.art }, p.art) : null, p.art ? " " : "", p.rel),
      h("span", { class: "ft-name" }, p.name)))))));

  B.form = (b) => {
    const sc = scoreLine();
    const fields = [];
    const cards = b.cards.map((c, ci) => h("div", { class: "form-card" },
      h("div", { class: "vcard-wrap", html: c.html }),
      h("div", { class: "form-fields" }, h("div", { class: "form-title" }, "Formular " + (ci + 1)), c.fields.map(([label, ans]) => {
        const inp = textInput({ class: "gap-in wide", "aria-label": label });
        const res = h("span", { class: "ans", hidden: true }, " ✓ " + ans[0]);
        fields.push({ inp, ans, res });
        return h("label", { class: "form-row" }, h("span", { class: "form-label" }, label), inp, res);
      }))));
    return h("div", { class: "form-block" }, cards, h("div", { class: "actions" },
      btn("Kiểm tra", () => {
        let ok = 0;
        fields.forEach((f) => {
          const r = check(f.inp.value, f.ans);
          if (r.ok) ok++;
          f.inp.classList.toggle("ok", r.ok);
          f.inp.classList.toggle("bad", !r.ok);
        });
        sc.set(ok, fields.length);
      }, "btn"),
      btn("Xem đáp án", () => fields.forEach((f) => { f.res.hidden = false; }), "btn ghost"),
      sc.el));
  };

  const COUNTRIES = [["Vietnam", "aus Vietnam"], ["Deutschland", "aus Deutschland"], ["Österreich", "aus Österreich"], ["die Schweiz", "aus der Schweiz"], ["China", "aus China"],
    ["Japan", "aus Japan"], ["Südkorea", "aus Südkorea"], ["Thailand", "aus Thailand"], ["Laos", "aus Laos"], ["Kambodscha", "aus Kambodscha"], ["die USA", "aus den USA"]];
  const LANGS = [["Vietnamesisch", "tiếng Việt"], ["Englisch", "tiếng Anh"], ["Chinesisch", "tiếng Trung"], ["Japanisch", "tiếng Nhật"], ["Koreanisch", "tiếng Hàn"], ["Französisch", "tiếng Pháp"], ["Russisch", "tiếng Nga"], ["Spanisch", "tiếng Tây Ban Nha"]];
  const joinUnd = (a) => (a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " und " + a[a.length - 1]);
  B.profile = (b = {}) => {
    const ext = Boolean(b.ext);
    const me = Object.assign({ first: "", last: "", country: "Vietnam", city: "", langs: ["Vietnamesisch", "Englisch"], age: "", home: "", status: "ledig", kids: 0 }, store.get("me", {}));
    const first = textInput({ class: "gap-in wide", value: me.first, placeholder: "Thu Hà", "aria-label": "Vorname" });
    const last = textInput({ class: "gap-in wide", value: me.last, placeholder: "Nguyễn", "aria-label": "Familienname" });
    const country = h("select", { class: "sel", "aria-label": "Land" }, COUNTRIES.map(([c]) => h("option", { value: c, selected: c === me.country }, c)));
    const city = textInput({ class: "gap-in wide", value: me.city, placeholder: "Hanoi", "aria-label": "Stadt" });
    const langBoxes = LANGS.map(([l, vi]) => h("label", { class: "chk" }, h("input", { type: "checkbox", value: l, checked: me.langs.includes(l) }), " " + l + " ", h("span", { class: "muted small", lang: "vi" }, "(" + vi + ")")));
    const age = h("input", { type: "number", min: 0, max: 120, inputmode: "numeric", class: "gap-in", value: me.age, placeholder: "20", "aria-label": "Alter" });
    const home = textInput({ class: "gap-in wide", value: me.home, placeholder: "Berlin", "aria-label": "Wohnort" });
    const status = h("select", { class: "sel", "aria-label": "Familienstand" }, ["ledig", "verheiratet", "geschieden", "verwitwet"].map((s) => h("option", { value: s, selected: s === me.status }, s)));
    const kids = h("input", { type: "number", min: 0, max: 10, inputmode: "numeric", class: "gap-in", value: me.kids, "aria-label": "Kinder" });
    const out = h("div", { class: "intro-text" });
    let lines = [];
    function build() {
      const f = plainName(first.value.trim()) || "…", l = plainName(last.value.trim()) || "…";
      const aus = (COUNTRIES.find(([c]) => c === country.value) || COUNTRIES[0])[1];
      const c = plainName(city.value.trim());
      const langs = langBoxes.map((x) => x.firstChild).filter((x) => x.checked).map((x) => x.value).filter((x) => x !== "Deutsch");
      const sp = spellOut(l === "…" ? "" : l);
      const ageN = ext ? parseInt(age.value, 10) || 0 : 0;
      const wohn = ext ? plainName(home.value.trim()) : "";
      const kidsN = ext ? Math.max(0, Math.min(20, parseInt(kids.value, 10) || 0)) : 0;
      lines = [
        { de: `Hallo! Ich heiße ${f} ${l}.` },
        { de: `Mein Vorname ist ${f}, mein Familienname ist ${l}.` },
        l !== "…" ? { de: `Ich buchstabiere: ${sp.shown}.`, say: `Ich buchstabiere: ${sp.say}.` } : null,
        ext && ageN > 0 && ageN < 120 ? { de: `Ich bin ${ageN <= 20 ? NUMW[ageN] : ageN} Jahre alt.` } : null,
        { de: `Ich komme ${aus}` + (c ? `, aus ${c}.` : ".") },
        ext && c ? { de: `Ich bin in ${c} geboren.` } : null,
        ext && wohn ? { de: `Ich wohne in ${wohn}.` } : null,
        ext ? { de: `Ich bin ${status.value}.` } : null,
        ext ? { de: kidsN === 0 ? "Ich habe keine Kinder." : kidsN === 1 ? "Ich habe ein Kind." : `Ich habe ${NUMW[kidsN]} Kinder.` } : null,
        { de: `Ich spreche ${joinUnd([...langs, "ein bisschen Deutsch"])}.` },
      ].filter(Boolean);
      out.textContent = "";
      lines.forEach((ln) => out.append(h("p", { class: "intro-line" }, h("span", {}, ln.de), btn("🔊", () => Speech.say(ln.say || ln.de), "icon-btn tiny", "Nghe"))));
      const upd = { first: first.value.trim(), last: last.value.trim(), country: country.value, city: city.value.trim(), langs: langBoxes.map((x) => x.firstChild).filter((x) => x.checked).map((x) => x.value) };
      if (ext) Object.assign(upd, { age: age.value, home: home.value.trim(), status: status.value, kids: kids.value });
      store.set("me", Object.assign(store.get("me", {}), upd));
    }
    [first, last, city, age, home, kids].forEach((x) => x.addEventListener("input", build));
    [country, status].forEach((x) => x.addEventListener("change", build));
    langBoxes.forEach((x) => x.firstChild.addEventListener("change", build));
    let token = null;
    async function readAll(shadow) {
      token = {};
      const me2 = token;
      const ps = $$(".intro-line", out);
      for (let i = 0; i < lines.length; i++) {
        if (token !== me2) return;
        ps.forEach((p) => p.classList.remove("now"));
        ps[i].classList.add("now");
        await Speech.say(lines[i].say || lines[i].de);
        if (shadow) await wait(1500 + lines[i].de.split(/\s+/).length * 550); else await wait(300);
      }
      ps.forEach((p) => p.classList.remove("now"));
    }
    build();
    return h("div", { class: "profile" },
      h("div", { class: "profile-form" },
        h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Vorname ", h("span", { class: "muted small", lang: "vi" }, "(tên)")), first),
        h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Familienname ", h("span", { class: "muted small", lang: "vi" }, "(họ)")), last),
        h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Land ", h("span", { class: "muted small", lang: "vi" }, "(nước)")), country),
        h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Stadt ", h("span", { class: "muted small", lang: "vi" }, "(thành phố quê / nơi sinh)")), city),
        ext ? [
          h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Alter ", h("span", { class: "muted small", lang: "vi" }, "(tuổi)")), age),
          h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Wohnort ", h("span", { class: "muted small", lang: "vi" }, "(nơi đang ở)")), home),
          h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Familienstand ", h("span", { class: "muted small", lang: "vi" }, "(hôn nhân)")), status),
          h("label", { class: "form-row" }, h("span", { class: "form-label" }, "Kinder ", h("span", { class: "muted small", lang: "vi" }, "(số con)")), kids),
        ] : null,
        h("div", { class: "form-row" }, h("span", { class: "form-label" }, "Sprachen ", h("span", { class: "muted small", lang: "vi" }, "(ngôn ngữ)")), h("div", { class: "chk-list" }, langBoxes))),
      h("div", { class: "intro-card" }, h("div", { class: "intro-head" }, "Das bin ich!"), out,
        h("div", { class: "actions" },
          btn("▶ Nghe cả bài", () => readAll(false), "btn small"),
          btn("🗣 Nói theo", () => readAll(true), "btn small ghost"),
          btn("⏹", () => { token = null; Speech.stop(); }, "icon-btn", "Dừng"),
          recorder())));
  };

  B.test = (b, ctx) => {
    const wrap = h("div", { class: "test" });
    function build() {
      wrap.textContent = "";
      const rows = b.items.map((it, i) => {
        const row = h("div", { class: "t-row" });
        row.it = it;
        const head = h("div", { class: "t-q" }, h("b", {}, i + 1 + ". "), h("span", { html: it.q }));
        if (it.say) head.append(" ", btn("🔊", () => Speech.say(it.say, { rate: it.k === "listen" ? 0.8 : undefined }), "icon-btn", "Nghe"));
        row.append(head);
        if (it.k === "mc" || it.k === "listenmc") {
          const right = it.opts[it.a];
          const opts = it.keep ? it.opts.slice() : shuffle(it.opts);
          row.right = opts.indexOf(right);
          row.opts = opts;
          row.picked = -1;
          row.append(h("div", { class: "ch-opts" }, opts.map((o, j) => h("button", { type: "button", class: "pick", html: o, onclick: (e) => {
            if (wrap.dataset.done) return;
            row.picked = j;
            $$(".pick", row).forEach((p) => p.classList.remove("sel"));
            e.currentTarget.classList.add("sel");
          } }))));
        } else {
          row.input = textInput({ class: "gap-in wide", "aria-label": "Câu trả lời" });
          row.append(h("div", { class: "t-in" }, row.input));
        }
        row.append(h("div", { class: "why", hidden: true }));
        return row;
      });
      const sc = scoreLine();
      const submit = btn("Nộp bài", () => {
        if (wrap.dataset.done) return;
        const empty = rows.filter((r) => (r.input ? !r.input.value.trim() : r.picked < 0)).length;
        if (empty && !confirm("Còn " + empty + " câu chưa làm. Vẫn nộp bài?")) return;
        wrap.dataset.done = 1;
        let ok = 0;
        rows.forEach((r) => {
          const it = r.it;
          let good;
          if (r.input) {
            good = check(r.input.value, it.a).ok;
            r.input.classList.add(good ? "ok" : "bad");
          } else {
            good = r.picked === r.right;
            const ps = $$(".pick", r);
            if (r.picked >= 0) ps[r.picked].classList.add(good ? "ok" : "bad");
            ps[r.right].classList.add("ok");
          }
          if (good) ok++;
          else Missed.add("test:" + it.q + (it.say || ""), r.input
            ? { type: "gap", q: (it.say ? "<span class='say-inline' data-say='" + esc(it.say) + "'>🔊 Nghe</span> " : "") + it.q + (it.q.includes("___") ? "" : " ___"), a: [it.a] }
            : { type: "choice", q: it.q, opts: r.opts, a: r.right, why: it.why });
          const why = r.querySelector(".why");
          why.hidden = false;
          why.innerHTML = (good ? "✓ Đúng" : "✗ Đáp án: <b>" + esc(r.input ? it.a[0] : window.DR.strip(it.opts[it.a])) + "</b>") + (it.why ? " — " + it.why : "");
          r.classList.add(good ? "t-ok" : "t-bad");
        });
        sc.set(ok, rows.length);
        const tests = store.get("tests", {});
        const id = b.id || ctx.key;
        const prev = tests[id] || {};
        tests[id] = { last: ok, total: rows.length, best: Math.max(ok, prev.best || 0), date: today() };
        store.set("tests", tests);
        submit.hidden = true;
        redo.hidden = false;
        sc.el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, "btn");
      const redo = btn("↻ Làm lại", () => { delete wrap.dataset.done; build(); }, "btn ghost");
      redo.hidden = true;
      const best = (store.get("tests", {})[b.id || ctx.key] || {}).best;
      wrap.append(...[best != null ? h("p", { class: "muted small" }, "Điểm cao nhất của bạn: " + best + "/" + b.items.length) : null,
        ...rows, h("div", { class: "actions" }, submit, redo, sc.el)].filter(Boolean));
    }
    build();
    return wrap;
  };

  B.review = () => {
    const box = h("div", { class: "review-box" });
    const go = btn("🔁 Làm lại các câu sai", () => {
      box.textContent = "";
      const items = Missed.list();
      if (!items.length) { box.append(h("p", { class: "muted" }, "Chưa có câu sai nào trong buổi này. Tuyệt!")); return; }
      const sc = scoreLine();
      let ok = 0, n = 0;
      const tick = (good) => { n++; if (good) ok++; if (n === items.length) sc.set(ok, n); };
      box.append(h("p", { class: "muted small" }, items.length + " câu"), ...items.map((it, i) => {
        if (it.type === "choice") {
          const why = h("div", { class: "why", hidden: true, html: it.why || "" });
          const row = h("div", { class: "rv-row" }, h("p", { html: i + 1 + ". " + it.q }),
            h("div", { class: "ch-opts" }, it.opts.map((o, j) => h("button", { type: "button", class: "pick", html: o, onclick: (e) => {
              if (row.dataset.done) return;
              row.dataset.done = 1;
              e.currentTarget.classList.add(j === it.a ? "ok" : "bad");
              $$(".pick", row)[it.a].classList.add("ok");
              why.hidden = !it.why;
              tick(j === it.a);
            } }))), why);
          return row;
        }
        const parts = it.q.split("___");
        const fields = [];
        const p = h("p", {}, h("b", {}, i + 1 + ". "), h("span", { html: parts[0] }));
        for (let k = 0; k < Math.max(1, parts.length - 1); k++) {
          const choices = it.opts && it.opts[k];
          const input = choices ? h("select", { class: "sel" }, h("option", { value: "" }, "…"), choices.map((w) => h("option", { value: w }, w))) : textInput();
          fields.push(input);
          p.append(input, h("span", { html: parts[k + 1] || "" }));
        }
        const res = h("span", { class: "ans" });
        const row = h("div", { class: "rv-row" }, p, btn("Kiểm tra", () => {
          if (row.dataset.done) return;
          row.dataset.done = 1;
          const goods = fields.map((f, k) => check(f.value, it.a[k] || []).ok);
          fields.forEach((f, k) => f.classList.add(goods[k] ? "ok" : "bad"));
          res.textContent = " ✓ " + it.a.map((a) => a.join(" / ")).join(" · ");
          tick(goods.every(Boolean));
        }, "btn small"), res);
        return row;
      }), sc.el);
    }, "btn");
    return h("div", { class: "review" }, go, box);
  };

  B.cando = (b, ctx) => {
    const saved = store.get("cando", {});
    const faces = [["😕", "Chưa"], ["🙂", "Tạm được"], ["😃", "Chắc chắn"]];
    return h("div", { class: "cando" }, b.items.map((t, i) => {
      const key = ctx.key + ":" + i;
      const btns = faces.map(([f, label], v) => h("button", { type: "button", class: "face" + (saved[key] === v ? " on" : ""), title: label, "aria-label": label, onclick: (e) => {
        const all = store.get("cando", {});
        all[key] = v;
        store.set("cando", all);
        e.currentTarget.parentElement.querySelectorAll(".face").forEach((x, j) => x.classList.toggle("on", j === v));
      } }, f));
      return h("div", { class: "cando-row" }, h("span", { html: t }), h("span", { class: "faces" }, btns));
    }));
  };
  B.checklist = (b, ctx) => {
    const saved = store.get("check", {});
    return h("ul", { class: "checklist" }, b.items.map((it, i) => {
      const key = ctx.key + ":" + i;
      const t = typeof it === "string" ? it : it.t;
      const box = h("input", { type: "checkbox", checked: Boolean(saved[key]), onchange: (e) => { const all = store.get("check", {}); all[key] = e.target.checked; store.set("check", all); } });
      return h("li", {}, h("label", {}, box, h("span", { html: t })), it.tracks ? trackPlayer(it.tracks, { small: true }) : null);
    }));
  };
  B.done = (b, ctx) => {
    const wrap = h("div", { class: "done-box" });
    function paint() {
      wrap.textContent = "";
      const prog = store.get("progress", {});
      const p = prog[ctx.key];
      const sets = ctx.L.sets.filter((s) => s.session === ctx.S.id && !s.bonus);
      const keys = sets.flatMap((s) => s.items.map((w) => w.key));
      const next = ctx.L.sessions[ctx.L.sessions.indexOf(ctx.S) + 1];
      if (p && p.done) {
        wrap.append(h("p", { class: "done-ok" }, "✓ Bạn đã hoàn thành buổi này ngày " + p.done.split("-").reverse().join("/") + "."),
          h("div", { class: "actions" }, next ? h("a", { class: "btn", href: "#/" + ctx.L.id + "/" + next.id }, "Buổi tiếp: " + next.title + " →") : h("a", { class: "btn", href: "#/" }, "Về lộ trình"),
            h("a", { class: "btn ghost", href: "#/review" }, "Ôn tập")));
        return;
      }
      wrap.append(h("p", {}, keys.length ? "Học xong buổi này? Bấm hoàn thành — " + keys.length + " từ mới sẽ vào mục Ôn tập, và web sẽ nhắc bạn ôn lại vào ngày mai." : "Học xong buổi này? Bấm hoàn thành để lưu tiến độ."),
        btn("✓ Hoàn thành buổi học", () => {
          const all = store.get("progress", {});
          all[ctx.key] = { done: today() };
          store.set("progress", all);
          const n = SRS.add(keys);
          toast(n ? "Tuyệt! Đã thêm " + n + " từ vào Ôn tập." : "Tuyệt! Đã lưu tiến độ.");
          paint();
        }, "btn big"));
    }
    paint();
    return wrap;
  };

  function renderBlock(b, ctx) {
    const make = B[b.type];
    let body;
    try {
      body = make ? make(b, ctx) : h("p", { class: "muted" }, "[chưa hỗ trợ dạng bài: " + b.type + "]");
    } catch (e) {
      console.error(e);
      body = h("p", { class: "muted" }, "Không hiển thị được phần này.");
    }
    if (b.collapsed) return h("div", { class: "block block-" + b.type }, body);
    const after = b.type === "table" || b.type === "conj";
    const vi = b.vi ? h("div", { class: "note-vi", lang: "vi", html: b.vi }) : null;
    return h("div", { class: "block block-" + b.type },
      b.title && b.type !== "tip" ? h("h3", { class: "block-title", html: b.title }) : null,
      b.task ? h("p", { class: "task", lang: "vi", html: b.task }) : null,
      after ? null : vi, body, after ? vi : null);
  }

  Object.assign(window.DR, { B, renderBlock, wordCard, flash, playList, scoreLine, levelText });
})();
