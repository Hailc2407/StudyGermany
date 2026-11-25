(() => {
  "use strict";
  const DR = window.DR;
  const { $, h, btn, shuffle, check, toast, store, today, Speech, sayBtns, wordLabel, sayOf, fold } = DR;

  const MIN = 60000, DAY = 86400000;
  const INTERVAL = { 1: 10 * MIN, 2: DAY, 3: 3 * DAY, 4: 7 * DAY, 5: 15 * DAY };
  const MASTER = 30 * DAY;
  const REVIEW_BATCH = 15;
  const AUTO_NEXT = 5000;

  let D = null;
  let tok = 0;
  const CANCEL = { cancelled: true };
  const alive = (my) => { if (my !== tok) throw CANCEL; };
  const sayLater = (text, ms = 250) => { const my = tok; setTimeout(() => { if (my === tok) Speech.say(text); }, ms); };
  let ALL = [];
  const TOPIC_OF = {};
  const BY_KIND = {};

  let prog = store.get("tu.prog", {});
  let done = store.get("tu.done", {});
  let log = store.get("tu.log", {});
  const settings = Object.assign({ goal: 10, unlockAll: false, autoplay: true, lang: "vi" }, store.get("tu.set", {}));
  const saveProg = () => { store.set("tu.prog", prog); refreshBadge(); };
  const saveDone = () => store.set("tu.done", done);
  const saveSet = () => store.set("tu.set", settings);

  const LANGS = window.TU_LANG;
  if (!LANGS[settings.lang]) settings.lang = "vi";
  let T = LANGS[settings.lang];
  const EN = () => settings.lang === "en";
  const mean = (w) => (EN() ? w.en || w.vi : w.vi);
  const exTr = (w) => (EN() ? w.ex[2] || w.ex[1] : w.ex[1]);
  const noteOf = (w) => (EN() ? w.noteEn : w.note);
  const tTitle = (t) => (EN() ? t.titleEn || t.title : t.title);
  const tDesc = (t) => (EN() ? t.descEn || t.desc : t.desc);
  const ML = () => T.htmlLang;
  function trNote(note) {
    if (!note || !EN()) return note;
    let m = note.match(/^Đúng! Viết chuẩn là: (.*)$/);
    if (m) return T.noteSpelling(m[1]);
    m = note.match(/^Đúng! Nhớ viết hoa: (.*)$/);
    return m ? T.noteCapital(m[1]) : note;
  }
  const say = (text, slowToo = true) => {
    const el = sayBtns(text, slowToo);
    const b = el.querySelectorAll("button");
    if (b[0]) { b[0].title = T.say; b[0].setAttribute("aria-label", T.say); }
    if (b[1]) { b[1].title = T.slow; b[1].setAttribute("aria-label", T.slow); }
    return el;
  };
  function applyChrome() {
    document.documentElement.lang = T.htmlLang;
    document.title = T.pageTitle;
    document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = T[el.dataset.t]; });
    document.querySelectorAll("[data-t-title]").forEach((el) => { el.title = T[el.dataset.tTitle]; el.setAttribute("aria-label", T[el.dataset.tTitle]); });
  }
  function setLang(lang) {
    if (!LANGS[lang] || lang === settings.lang) return;
    if (document.querySelector(".tu-stage") && !confirm(T.exitLesson)) return;
    settings.lang = lang;
    T = LANGS[lang];
    saveSet();
    applyChrome();
    route();
  }

  function bump(field, n = 1) {
    const d = (log[today()] = log[today()] || { n: 0, r: 0 });
    d[field] = (d[field] || 0) + n;
    store.set("tu.log", log);
  }
  const lvOf = (k) => (prog[k] ? prog[k].lv : 0);
  function learn(keys) {
    let fresh = 0;
    const now = Date.now();
    for (const k of keys) {
      if (!prog[k]) { prog[k] = { lv: 1, due: now + INTERVAL[1], n: 0, w: 0, t: now }; fresh++; }
    }
    saveProg();
    return fresh;
  }
  function grade(k, ok) {
    const p = prog[k];
    if (!p) return;
    const now = Date.now();
    p.n = (p.n || 0) + 1;
    if (ok) {
      if (p.lv >= 5) p.due = now + MASTER; else { p.lv++; p.due = now + INTERVAL[p.lv]; }
    } else {
      p.w = (p.w || 0) + 1;
      p.lv = Math.max(1, p.lv - 2);
      p.due = now + INTERVAL[1];
    }
    saveProg();
  }
  function noteWrong(k) { if (prog[k]) { prog[k].w = (prog[k].w || 0) + 1; saveProg(); } }
  const dueKeys = () => Object.keys(prog).filter((k) => D.words[k] && prog[k].due <= Date.now()).sort((a, b) => prog[a].due - prog[b].due);
  const hardKeys = () => Object.keys(prog).filter((k) => D.words[k] && (prog[k].w || 0) >= 2 && prog[k].lv <= 3).sort((a, b) => prog[b].w - prog[a].w);
  const starKeys = () => Object.keys(prog).filter((k) => D.words[k] && prog[k].star);
  function streak() {
    let n = 0;
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const day = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
    const active = (x) => { const e = log[day(x)]; return e && (e.n || 0) + (e.r || 0) > 0; };
    if (!active(d)) d.setDate(d.getDate() - 1);
    while (active(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function refreshBadge() {
    const b = $("#due-badge");
    if (!b || !D) return;
    const n = dueKeys().length;
    b.hidden = n === 0;
    b.textContent = n > 99 ? "99+" : n;
  }
  function untilText(ms) {
    if (ms < 90 * MIN) return T.min(Math.max(1, Math.round(ms / MIN)));
    if (ms < 36 * 3600000) return T.hour(Math.round(ms / 3600000));
    return T.day(Math.round(ms / DAY));
  }

  const topicOf = (id) => D.topics.find((t) => t.id === id);
  const lessonOf = (lid) => { const t = topicOf(String(lid).split("-")[0]); return t ? { t, l: t.lessons.find((l) => l.id === lid) } : null; };
  function unlocked(t, l) {
    if (settings.unlockAll || l.n === 1) return true;
    return Boolean(done[t.id + "-" + (l.n - 1)]);
  }
  const topicStats = (t) => {
    let seen = 0, solid = 0;
    for (const l of t.lessons) for (const k of l.words) { const v = lvOf(k); if (v) seen++; if (v >= 4) solid++; }
    return { seen, solid, total: t.count };
  };
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const bar = (p, cls = "") => h("div", { class: "bar-prog " + cls }, h("span", { style: "width:" + Math.min(100, p) + "%" }));
  const norm = (s) => fold(String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d"));
  const lvDots = (lv) => h("span", { class: "tu-lv", title: T.lv[lv], "aria-label": T.lv[lv] }, [1, 2, 3, 4, 5].map((i) => h("i", { class: i <= lv ? "on l" + lv : "" })));
  const mount = (...kids) => { const a = $("#app"); a.replaceChildren(...kids.flat().filter(Boolean)); };

  function plLine(w) {
    if (w.kind !== "noun") return null;
    if (w.plOnly) return h("div", { class: "tu-sub" }, T.onlyPlural);
    if (w.pl) return h("div", { class: "tu-sub" }, T.plural, h("span", { class: "pl-word" }, "die " + w.pl));
    return h("div", { class: "tu-sub muted" }, T.noPlural);
  }
  function exLine(w) {
    if (!w.ex) return null;
    return h("div", { class: "tu-ex" }, h("div", { class: "tu-ex-de", lang: "de" }, w.ex[0], " ", say(w.ex[0], false)), h("div", { class: "tu-ex-vi", lang: ML() }, exTr(w)));
  }
  function srcTags(w) {
    return h("span", { class: "tu-tags" }, h("span", { class: "tu-tag" }, w.src), w.g ? h("span", { class: "tu-tag goethe", title: T.goetheTag }, "🎯 Goethe A1") : null);
  }
  function reveal(w) {
    return h("div", { class: "tu-reveal" },
      h("div", { class: "tu-reveal-top" }, w.emoji ? h("span", { class: "tu-emo" }, w.emoji) : null, wordLabel(w), " ", say(sayOf(w))),
      plLine(w), w.forms ? h("div", { class: "tu-sub" }, w.forms) : null, h("div", { class: "tu-vi", lang: ML() }, mean(w)), exLine(w));
  }

  function row(k, opts = {}) {
    const w = D.words[k], p = prog[k];
    const star = btn(p && p.star ? "★" : "☆", () => {
      if (!prog[k]) { toast(T.starFirst); return; }
      prog[k].star = prog[k].star ? 0 : 1;
      saveProg();
      star.textContent = prog[k].star ? "★" : "☆";
      star.classList.toggle("on", Boolean(prog[k].star));
    }, "icon-btn tiny tu-star" + (p && p.star ? " on" : ""), T.starTitle);
    return h("div", { class: "tu-row" },
      h("div", { class: "tu-row-main" },
        w.emoji ? h("span", { class: "tu-emo" }, w.emoji) : h("span", { class: "tu-emo ph" }, "·"),
        h("div", { class: "tu-row-text" },
          h("div", { class: "tu-de" }, wordLabel(w), w.pl && !w.plOnly ? h("span", { class: "muted small" }, " · Pl. " + w.pl) : null, w.g ? h("span", { class: "tu-g", title: T.goetheTag }, " 🎯") : null),
          h("div", { class: "tu-vi", lang: ML() }, mean(w)),
          opts.ex && w.ex ? h("div", { class: "tu-ex-de small muted", lang: "de" }, w.ex[0]) : null,
          opts.topic ? h("span", { class: "tu-tag" }, tTitle(topicOf(opts.topic))) : null)),
      h("div", { class: "tu-row-act" }, lvDots(lvOf(k)), say(sayOf(w), false), star));
  }

  function home() {
    const nDue = dueKeys().length;
    const todayN = (log[today()] || {}).n || 0;
    const st = streak();
    const known = ALL.filter((k) => lvOf(k)).length;
    const goethe = ALL.filter((k) => D.words[k].g);
    const goetheSeen = goethe.filter((k) => lvOf(k)).length;
    let next = null;
    const last = Object.entries(done).sort((a, b) => b[1].at - a[1].at)[0];
    if (last) { const f = lessonOf(last[0]); const nl = f && f.l && f.t.lessons[f.l.n]; if (nl) next = { t: f.t, l: nl }; }
    if (!next) for (const t of D.topics) { const l = t.lessons.find((x) => !done[x.id] && unlocked(t, x)); if (l) { next = { t, l }; break; } }

    mount(
      h("section", { class: "tu-hero" },
        h("h1", {}, T.heroTitle),
        h("p", { class: "muted" }, T.heroText),
        h("div", { class: "tu-stats" },
          stat("🔥", st, T.statStreak),
          stat("🎯", todayN + "/" + settings.goal, T.statToday, pct(todayN, settings.goal)),
          stat("🔁", nDue, T.statDue),
          stat("📚", known + "/" + ALL.length, T.statKnown, pct(known, ALL.length))),
        h("div", { class: "actions" },
          nDue ? h("a", { class: "btn big", href: "#/review" }, T.reviewN(nDue)) : null,
          next ? h("a", { class: "btn big" + (nDue ? " ghost" : ""), href: "#/l/" + next.l.id }, T.continueAt(next.t.emoji + " " + tTitle(next.t), next.l.n)) : null),
        h("p", { class: "small muted" }, "🎯 Goethe A1: ", h("b", {}, goetheSeen + "/" + goethe.length), T.goetheLine, bar(pct(goetheSeen, goethe.length)))),
      h("div", { class: "tu-grid" }, D.topics.map((t) => {
        const s = topicStats(t);
        const lessonsDone = t.lessons.filter((l) => done[l.id]).length;
        return h("a", { class: "tu-topic", href: "#/t/" + t.id },
          h("div", { class: "tu-topic-top" }, h("span", { class: "tu-topic-emo", "aria-hidden": "true" }, t.emoji), h("span", { class: "tu-topic-n" }, T.lessonsDone(lessonsDone, t.lessons.length))),
          h("h3", {}, tTitle(t)), h("p", { class: "small muted" }, tDesc(t)),
          bar(pct(s.seen, s.total)), h("div", { class: "small muted" }, T.topicLine(s.seen, s.total, s.solid)));
      })));
    function stat(emoji, val, label, p) {
      return h("div", { class: "tu-stat" }, h("div", { class: "tu-stat-top" }, h("span", { "aria-hidden": "true" }, emoji), h("b", {}, String(val))), h("div", { class: "small muted" }, label), p != null ? bar(p) : null);
    }
  }

  function topicPage(tid) {
    const t = topicOf(tid);
    if (!t) return notFound();
    const s = topicStats(t);
    const all = h("details", { class: "tu-all" }, h("summary", {}, T.seeAll(t.count)), h("div", { class: "tu-list" }, t.lessons.flatMap((l) => l.words).map((k) => row(k))));
    mount(
      h("p", { class: "crumb" }, h("a", { href: "#/" }, T.allTopics)),
      h("section", { class: "tu-hero slim" },
        h("h1", {}, t.emoji + " " + tTitle(t)), h("p", { class: "muted" }, tDesc(t)),
        bar(pct(s.seen, s.total)), h("div", { class: "small muted" }, T.topicLine(s.seen, s.total, s.solid))),
      h("div", { class: "tu-lessons" }, t.lessons.map((l) => {
        const open = unlocked(t, l), d = done[l.id];
        const prev = l.words.slice(0, 5).map((k) => D.words[k].de).join(" · ") + (l.words.length > 5 ? " …" : "");
        return h("div", { class: "tu-lesson" + (open ? "" : " locked") + (d ? " done" : "") },
          h("div", { class: "tu-lesson-n" }, d ? "✓" : open ? String(l.n) : "🔒"),
          h("div", { class: "tu-lesson-body" }, h("h3", {}, T.lesson(l.n), h("span", { class: "muted small" }, " · " + T.nWords(l.words.length))),
            h("p", { class: "small muted" }, open ? h("span", { lang: "de" }, prev) : T.finishFirst(l.n - 1)),
            d ? h("div", { class: "small" }, T.lastTime(d.acc), lvAvg(l)) : null),
          open ? h("a", { class: "btn" + (d ? " ghost" : ""), href: "#/l/" + l.id }, d ? T.redo : T.learnBtn) : null);
      })),
      all);
    function lvAvg(l) {
      const solid = l.words.filter((k) => lvOf(k) >= 3).length;
      return T.solidOf(solid, l.words.length);
    }
  }

  function makeStage(title, total, onExit) {
    const prog_ = h("span", { class: "tu-prog-fill" });
    const label = h("span", { class: "tu-prog-label small muted" });
    const q = h("div", { class: "tu-q" });
    const el = h("div", { class: "tu-stage" },
      h("div", { class: "tu-stage-bar" }, btn("✕", onExit, "icon-btn", T.exit), h("div", { class: "tu-prog" }, prog_), label),
      h("div", { class: "tu-stage-title muted small" }, title), q);
    return {
      el, q,
      set(done_, total_) { prog_.style.width = pct(done_, total_) + "%"; label.textContent = done_ + "/" + total_; },
      show(...kids) { q.replaceChildren(...kids.flat().filter(Boolean)); window.scrollTo({ top: 0 }); },
    };
  }

  function keyHandler(map) {
    const my = tok;
    const fn = (e) => {
      if (my !== tok) { document.removeEventListener("keydown", fn); return; }
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) { if (e.key !== "Enter") return; }
      const f = map[e.key];
      if (f) { e.preventDefault(); f(); }
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }
  const listenBox = (text) => h("div", { class: "tu-listen" }, btn(T.listen, () => Speech.say(text), "btn big"), btn("🐢", () => Speech.say(text, { slow: true }), "icon-btn", T.slow));

  function mcQ(st, o) {
    return new Promise((res) => {
      let locked = false, off = null, timer = 0;
      const fb = h("div", { class: "tu-fb", hidden: true });
      const opts = o.options.map((op, i) => {
        const b = h("button", { type: "button", class: "tu-opt", onclick: () => pick(b, op) }, h("span", { class: "tu-opt-n" }, String(i + 1)), op.node);
        b._val = op.val;
        return b;
      });
      function finish(ok) { clearTimeout(timer); if (off) off(); res(ok); }
      function pick(b, op) {
        if (locked) return;
        locked = true;
        const ok = op.val === o.correct;
        b.classList.add(ok ? "ok" : "bad");
        if (!ok) opts.find((x) => x._val === o.correct).classList.add("ok");
        fb.hidden = false;
        fb.className = "tu-fb " + (ok ? "good" : "miss");
        fb.replaceChildren(h("div", { class: "tu-fb-title" }, ok ? T.correct : T.wrong), reveal(o.w), btn(T.next, () => finish(ok), "btn"));
        Speech.say(sayOf(o.w));
        if (ok) { const my = tok; timer = setTimeout(() => { if (my === tok) finish(true); }, AUTO_NEXT); }
      }
      const map = { Enter: () => { if (locked) finish(fb.classList.contains("good")); } };
      opts.forEach((b, i) => { map[String(i + 1)] = () => b.click(); });
      off = keyHandler(map);
      st.show(h("div", { class: "tu-prompt" }, o.head), o.say ? listenBox(o.say) : null,
        h("div", { class: "tu-opts" + (o.cols ? " cols" : "") }, opts), fb);
      if (o.say) sayLater(o.say);
    });
  }

  function typeQ(st, o) {
    return new Promise((res) => {
      let off = null, hinted = false, locked = false;
      const input = h("input", { type: "text", class: "tu-input", lang: "de", autocomplete: "off", autocapitalize: "none", spellcheck: "false", "aria-label": T.typeAria, placeholder: T.typePh });
      const fb = h("div", { class: "tu-fb", hidden: true });
      const hintBox = h("div", { class: "tu-hint small muted" });
      const go = btn(T.check, submit, "btn");
      const hintBtn = btn(T.hint, () => {
        hinted = true;
        const a = o.answers[0];
        hintBox.textContent = T.hintText(a.slice(0, Math.min(2, a.length)), a.length);
        input.focus();
      }, "btn ghost small");
      const skip = btn(T.dontKnow, () => finishWith(false, "skip"), "btn ghost small");
      let ended = false;
      function finish(ok) { if (ended) return; ended = true; if (off) off(); res(ok); }
      function finishWith(ok, why, note) {
        if (locked) return;
        locked = true;
        input.disabled = true; go.disabled = true; hintBtn.disabled = true; skip.disabled = true;
        const good = ok && !hinted;
        fb.hidden = false;
        fb.className = "tu-fb " + (good ? "good" : "miss");
        fb.replaceChildren(...[
          h("div", { class: "tu-fb-title" }, ok ? (hinted ? T.okHinted : T.correct) : why === "skip" ? T.answerIs : T.wrongAnswerIs),
          note ? h("div", { class: "small" }, trNote(note)) : null, reveal(o.w), btn(T.next, () => finish(good), "btn")].filter(Boolean));
        Speech.say(sayOf(o.w));
        if (good) { const my = tok; setTimeout(() => { if (my === tok) finish(true); }, AUTO_NEXT); }
      }
      function submit() {
        if (locked) return;
        if (!input.value.trim()) return;
        const r = check(input.value, o.answers);
        finishWith(r.ok, "wrong", r.note);
      }
      off = keyHandler({ Enter: () => { if (locked) finish(fb.classList.contains("good")); else submit(); } });
      st.show(h("div", { class: "tu-prompt" }, o.head), o.say ? listenBox(o.say) : null,
        input, h("div", { class: "actions" }, go, hintBtn, skip), hintBox, fb);
      setTimeout(() => input.focus(), 50);
      if (o.say) sayLater(o.say);
    });
  }

  function pairsQ(st, keys) {
    return new Promise((res) => {
      const errors = new Set();
      let sel = null, left = keys.length;
      const L = shuffle(keys), R = shuffle(keys);
      const mk = (k, side) => {
        const w = D.words[k];
        const b = h("button", { type: "button", class: "tu-pair " + side, onclick: () => click(b) }, side === "l" ? wordLabel(w) : h("span", { lang: ML() }, mean(w)));
        b._k = k;
        return b;
      };
      const lb = L.map((k) => mk(k, "l")), rb = R.map((k) => mk(k, "r"));
      function click(b) {
        if (b.classList.contains("done")) return;
        if (b.classList.contains("l")) {
          lb.forEach((x) => x.classList.remove("sel"));
          sel = b; b.classList.add("sel");
          Speech.say(sayOf(D.words[b._k]));
          return;
        }
        if (!sel) { toast(T.pickLeft); return; }
        if (sel._k === b._k) {
          sel.classList.remove("sel"); sel.classList.add("done"); b.classList.add("done");
          sel = null; left--;
          if (!left) fin.hidden = false, fin.focus();
        } else {
          errors.add(sel._k); errors.add(b._k);
          b.classList.add("bad"); sel.classList.add("bad");
          const a = sel;
          setTimeout(() => { b.classList.remove("bad"); a.classList.remove("bad"); }, 450);
        }
      }
      const fin = btn(T.next, () => res(errors), "btn big");
      fin.hidden = true;
      st.show(h("div", { class: "tu-prompt" }, T.pairsPrompt), h("div", { class: "tu-pairs" }, h("div", { class: "col" }, lb), h("div", { class: "col" }, rb)), h("div", { class: "actions center" }, fin));
    });
  }

  function answersOf(w) {
    const out = new Set();
    const de = w.de.replace(/^\(sich\)\s*/, "").trim();
    out.add(de);
    if (/^sich\s/.test(de)) out.add(de.replace(/^sich\s+/, ""));
    de.split(/\s*\/\s*/).forEach((x) => x && out.add(x.trim()));
    if (w.kind === "noun" && w.art && !w.plOnly) out.add(w.art + " " + de);
    return Array.from(out);
  }
  function distractors(w, n, get, pool) {
    const seen = new Set([norm(get(w))]);
    const out = [];
    const lists = [pool.filter((k) => D.words[k].kind === w.kind), BY_KIND[w.kind] || [], ALL];
    for (const list of lists) {
      for (const k of shuffle(list)) {
        if (out.length >= n) break;
        if (k === w.key) continue;
        const v = norm(get(D.words[k]));
        if (seen.has(v)) continue;
        seen.add(v); out.push(k);
      }
      if (out.length >= n) break;
    }
    return out;
  }
  const deOf = (w) => w.de;
  const emo = (w) => (w.emoji ? h("div", { class: "tu-big-emo", "aria-hidden": "true" }, w.emoji) : null);
  function qMeaning(st, k, pool) {
    const w = D.words[k];
    const opts = shuffle([k, ...distractors(w, 3, mean, pool)]).map((x) => ({ val: x, node: h("span", { lang: ML() }, mean(D.words[x])) }));
    return mcQ(st, { head: [h("div", { class: "tu-cap" }, T.qMeaning), emo(w), h("div", { class: "tu-big" }, wordLabel(w), " ", say(sayOf(w), false))], options: opts, correct: k, w });
  }
  function qReverse(st, k, pool) {
    const w = D.words[k];
    const opts = shuffle([k, ...distractors(w, 3, deOf, pool)]).map((x) => ({ val: x, node: wordLabel(D.words[x]) }));
    return mcQ(st, { head: [h("div", { class: "tu-cap" }, T.qReverse), emo(w), h("div", { class: "tu-big", lang: ML() }, mean(w))], options: opts, correct: k, w });
  }
  function qListen(st, k, pool) {
    const w = D.words[k];
    const opts = shuffle([k, ...distractors(w, 3, deOf, pool)]).map((x) => ({ val: x, node: wordLabel(D.words[x], { noArt: true }) }));
    return mcQ(st, { head: h("div", { class: "tu-cap" }, T.qListen), say: sayOf(w), options: opts, correct: k, w, cols: true });
  }
  function qArticle(st, k) {
    const w = D.words[k];
    const opts = ["der", "die", "das"].map((a) => ({ val: a, node: h("span", { class: "art g-" + a }, a) }));
    return mcQ(st, { head: [h("div", { class: "tu-cap" }, T.qArticle), emo(w), h("div", { class: "tu-big" }, wordLabel(w, { noArt: true }), " ", say(w.de, false)), h("div", { class: "tu-sub", lang: ML() }, mean(w))], options: opts, correct: w.art, w, cols: true });
  }
  function qType(st, k) {
    const w = D.words[k];
    return typeQ(st, { head: [h("div", { class: "tu-cap" }, T.qType), emo(w), h("div", { class: "tu-big", lang: ML() }, mean(w)), w.kind === "noun" && w.art ? h("div", { class: "tu-sub muted" }, T.qTypeNoun) : null], answers: answersOf(w), w });
  }
  function qTypeListen(st, k) {
    const w = D.words[k];
    return typeQ(st, { head: h("div", { class: "tu-cap" }, T.qTypeListen), say: sayOf(w), answers: answersOf(w), w });
  }
  const canSpeak = () => Speech.supported;

  async function runQueue(st, tasks, offset, total, onFirst, my) {
    const queue = tasks.slice();
    let n = offset;
    while (queue.length) {
      const t = queue.shift();
      st.set(n, total);
      const ok = await t.run(st);
      alive(my);
      if (!t.tries) { t.tries = 0; if (onFirst) onFirst(t, ok); }
      t.tries++;
      if (ok || t.tries >= 2) n++; else queue.push(t);
    }
  }

  async function lessonPage(lid) {
    const f = lessonOf(lid);
    if (!f || !f.l) return notFound();
    const { t, l } = f;
    if (!unlocked(t, l)) { toast(T.lockedToast); location.hash = "#/t/" + t.id; return; }
    const my = tok;
    const keys = l.words.slice();
    const pool = t.lessons.flatMap((x) => x.words);
    const st = makeStage(t.emoji + " " + tTitle(t) + " · " + T.lesson(l.n), 1, () => { if (confirm(T.exitLesson)) location.hash = "#/t/" + t.id; });
    mount(st.el);

    let loopOn = false;
    for (let i = 0; i < keys.length; i++) {
      st.set(i, keys.length);
      await new Promise((go) => {
        const w = D.words[keys[i]];
        const note = noteOf(w);
        const card = h("div", { class: "tu-card" },
          emo(w), h("div", { class: "tu-big" }, wordLabel(w), " ", say(sayOf(w))),
          w.syl ? h("div", { class: "tu-sub" }, T.stress, h("b", {}, w.syl)) : null, plLine(w), w.forms ? h("div", { class: "tu-sub" }, w.forms) : null,
          h("div", { class: "tu-vi big", lang: ML() }, mean(w)), !EN() && w.en ? h("div", { class: "tu-sub muted", lang: "en" }, "EN: " + w.en) : null, exLine(w),
          note ? h("div", { class: "why", lang: ML() }, note) : null, srcTags(w));
        let off = null, loopTimer = 0;
        const stopLoop = () => clearInterval(loopTimer);
        const startLoop = () => { stopLoop(); const me = tok; loopTimer = setInterval(() => { if (me !== tok || !loopBtn.isConnected) stopLoop(); else Speech.say(sayOf(w)); }, 3000); };
        const paintLoop = () => { loopBtn.classList.toggle("on", loopOn); loopBtn.setAttribute("aria-pressed", String(loopOn)); loopBtn.textContent = loopOn ? T.loopOn : T.loopOff; };
        const loopBtn = btn("", () => {
          loopOn = !loopOn; paintLoop();
          if (loopOn) { Speech.say(sayOf(w)); startLoop(); } else { stopLoop(); Speech.stop(); }
        }, "btn ghost tu-loop");
        paintLoop();
        const next = btn(i === keys.length - 1 ? T.toExercises : T.nextWord, () => { stopLoop(); off(); go(); }, "btn big");
        const prev = i ? btn(T.prev, () => { stopLoop(); off(); i -= 2; go(); }, "btn ghost") : null;
        off = keyHandler({ Enter: () => next.click(), ArrowRight: () => next.click(), ArrowLeft: () => prev && prev.click(), r: () => loopBtn.click(), R: () => loopBtn.click() });
        st.show(h("div", { class: "tu-cap" }, T.cardCap(i + 1, keys.length)), card, h("div", { class: "actions center" }, loopBtn), h("div", { class: "actions center" }, prev, next));
        if (loopOn) { sayLater(sayOf(w)); startLoop(); }
        else if (settings.autoplay) sayLater(sayOf(w));
      });
      alive(my);
    }

    const nouns = keys.filter((k) => D.words[k].kind === "noun" && D.words[k].art && !D.words[k].plOnly);
    const pairGroups = [];
    { const ks = shuffle(keys); while (ks.length) { let n = ks.length === 6 ? 3 : Math.min(5, ks.length); if (ks.length - n === 1) n++; pairGroups.push(ks.splice(0, n)); } }
    const total = keys.length * (canSpeak() ? 5 : 4) + nouns.length;
    const stat = { n: 0, ok: 0 };
    const wrongKeys = new Set();
    const onFirst = (t_, ok) => { stat.n++; if (ok) stat.ok++; else { wrongKeys.add(t_.key); } };
    let at = 0;
    const round = async (tasks) => { if (!tasks.length) return; await runQueue(st, tasks, at, total, onFirst, my); at += tasks.length; };
    const mk = (fn) => (k) => ({ key: k, run: (s) => fn(s, k, pool) });
    await round(shuffle(keys).map(mk(qMeaning)));
    if (canSpeak()) await round(shuffle(keys).map(mk(qListen)));
    await round(shuffle(nouns).map(mk(qArticle)));
    for (const g of pairGroups) {
      const errs = await pairsQ(st, g);
      alive(my);
      stat.n += g.length; stat.ok += g.length - errs.size; errs.forEach((k) => wrongKeys.add(k));
      at += g.length; st.set(Math.min(at, total), total);
    }
    await round(shuffle(keys).map(mk(qReverse)));
    await round(shuffle(keys).map(mk(qType)));

    const fresh = learn(keys);
    wrongKeys.forEach(noteWrong);
    const acc = pct(stat.ok, stat.n);
    done[l.id] = { at: Date.now(), acc };
    saveDone();
    if (fresh) bump("n", fresh);
    const nextL = t.lessons[l.n];
    mount(h("section", { class: "tu-summary" },
      h("div", { class: "tu-big-emo" }, acc >= 85 ? "🎉" : acc >= 60 ? "👍" : "💪"),
      h("h1", {}, T.doneLesson(l.n, tTitle(t))),
      h("p", { class: "score " + (acc >= 85 ? "good" : acc >= 60 ? "mid" : "low") }, T.firstTry(acc, stat.ok, stat.n)),
      h("p", { class: "muted" }, fresh ? T.freshText(fresh) : T.alreadyQueued),
      wrongKeys.size ? h("div", {}, h("h3", {}, T.watchWords), h("div", { class: "tu-list" }, Array.from(wrongKeys).map((k) => row(k)))) : null,
      h("div", { class: "actions center" },
        nextL ? h("a", { class: "btn big", href: "#/l/" + nextL.id }, T.lesson(nextL.n) + " →") : h("a", { class: "btn big", href: "#/t/" + t.id }, T.topicDone),
        h("a", { class: "btn ghost", href: "#/t/" + t.id }, T.backTopic), h("a", { class: "btn ghost", href: "#/" }, T.allTopicsBtn))));
  }

  function reviewTask(k, pool) {
    const w = D.words[k], lv = lvOf(k);
    let fn;
    if (lv <= 1) fn = qMeaning;
    else if (lv === 2) fn = canSpeak() && Math.random() < 0.5 ? qListen : qReverse;
    else if (lv === 3) fn = w.kind === "noun" && w.art && !w.plOnly && Math.random() < 0.6 ? qArticle : qReverse;
    else if (lv === 4) fn = qType;
    else fn = canSpeak() ? qTypeListen : qType;
    return { key: k, run: (s) => fn(s, k, pool) };
  }
  async function reviewPage(mode) {
    let keys;
    if (mode === "hard") keys = hardKeys();
    else if (mode === "star") keys = starKeys();
    else keys = dueKeys();
    if (!keys.length) {
      const future = Object.keys(prog).filter((k) => D.words[k]).map((k) => prog[k].due).sort((a, b) => a - b)[0];
      mount(h("section", { class: "tu-hero slim center" }, h("div", { class: "tu-big-emo" }, "✅"),
        h("h1", {}, mode === "hard" ? T.noHard : mode === "star" ? T.noStar : T.noDue),
        h("p", { class: "muted" }, mode ? T.hardExplain : future ? T.nextDue(untilText(future - Date.now())) : T.learnFirst),
        h("div", { class: "actions center" }, h("a", { class: "btn big", href: "#/" }, T.pickTopic))));
      return;
    }
    const my = tok;
    const batch = keys.slice(0, mode ? 20 : REVIEW_BATCH);
    const pool = ALL;
    const st = makeStage(T.review, batch.length, () => { if (confirm(T.exitReview)) location.hash = "#/"; });
    mount(st.el);
    const stat = { n: 0, ok: 0 };
    const tasks = shuffle(batch).map((k) => reviewTask(k, pool));
    await runQueue(st, tasks, 0, batch.length, (t, ok) => { stat.n++; if (ok) stat.ok++; grade(t.key, ok); bump("r"); }, my);
    const rest = mode ? 0 : dueKeys().length;
    const acc = pct(stat.ok, stat.n);
    mount(h("section", { class: "tu-summary" },
      h("div", { class: "tu-big-emo" }, "🔁"),
      h("h1", {}, T.reviewedN(batch.length)),
      h("p", { class: "score " + (acc >= 85 ? "good" : acc >= 60 ? "mid" : "low") }, T.firstTryShort(acc, stat.ok, stat.n)),
      h("div", { class: "tu-list" }, batch.map((k) => row(k))),
      h("div", { class: "actions center" },
        rest ? h("a", { class: "btn big", href: "#/review" }, T.moreReview(rest)) : null,
        h("a", { class: "btn ghost", href: "#/" }, T.home), h("a", { class: "btn ghost", href: "#/book" }, T.seeBook))));
  }

  const bookState = { scope: "all", sel: "due" };
  function bookPage() {
    const scoped = ALL.filter((k) => bookState.scope === "all" || D.words[k].g);
    const count = [0, 0, 0, 0, 0, 0];
    scoped.forEach((k) => count[lvOf(k)]++);
    const mx = Math.max(1, ...count.slice(1));
    const inScope = new Set(scoped);
    const sets = {
      due: { label: T.setDue, keys: dueKeys().filter((k) => inScope.has(k)) },
      hard: { label: T.setHard, keys: hardKeys().filter((k) => inScope.has(k)) },
      star: { label: T.setStar, keys: starKeys().filter((k) => inScope.has(k)) },
      l0: { label: T.setNew, keys: scoped.filter((k) => lvOf(k) === 0) },
    };
    for (let i = 1; i <= 5; i++) sets["l" + i] = { label: T.lv[i], keys: scoped.filter((k) => lvOf(k) === i) };
    const cur = sets[bookState.sel] || sets.due;
    const listBox = h("div", { class: "tu-list" });
    const paint = () => {
      const shown = cur.keys.slice(0, 120);
      listBox.replaceChildren(...(shown.length ? shown.map((k) => row(k, { topic: TOPIC_OF[k] })) : [h("p", { class: "muted" }, T.emptySet)]),
        ...(cur.keys.length > 120 ? [h("p", { class: "muted small" }, T.first120)] : []));
    };
    const chips = (obj, key) => h("div", { class: "chips" }, obj.map(([id, label]) => h("button", { type: "button", class: "chip" + (bookState[key] === id ? " on" : ""), onclick: () => { bookState[key] = id; bookPage(); } }, label)));
    mount(
      h("section", { class: "tu-hero slim" }, h("h1", {}, T.bookTitle),
        h("p", { class: "muted" }, T.bookText),
        chips([["all", T.chipAll(ALL.length)], ["goethe", T.chipGoethe(ALL.filter((k) => D.words[k].g).length)]], "scope")),
      h("div", { class: "tu-bars", role: "group", "aria-label": T.barsAria }, [1, 2, 3, 4, 5].map((i) =>
        h("button", { type: "button", class: "tu-barcol" + (bookState.sel === "l" + i ? " on" : ""), onclick: () => { bookState.sel = "l" + i; bookPage(); } },
          h("span", { class: "tu-barnum" }, String(count[i])), h("span", { class: "tu-barfill l" + i, style: "height:" + Math.max(4, Math.round((count[i] / mx) * 100)) + "%" }), h("span", { class: "tu-barlab" }, T.lv[i])))),
      h("p", { class: "small muted" }, T.bookLine(count[0], sets.due.keys.length, sets.hard.keys.length)),
      chips([["due", T.chipDue(sets.due.keys.length)], ["hard", T.chipHard(sets.hard.keys.length)], ["star", T.chipStar(sets.star.keys.length)], ["l0", T.chipNew(count[0])]], "sel"),
      h("h3", {}, T.listHead(cur.label, cur.keys.length)),
      cur.keys.length && (bookState.sel === "hard" || bookState.sel === "star") ? h("div", { class: "actions" }, h("a", { class: "btn small", href: "#/review/" + bookState.sel }, T.reviewThese)) : null,
      listBox);
    paint();
  }

  const searchState = { q: "", scope: "all" };
  let searchIndex = null;
  function searchPage() {
    if (!searchIndex) searchIndex = ALL.map((k) => { const w = D.words[k]; return [k, norm([w.de, w.pl || "", w.vi, w.en || "", w.ex ? w.ex[0] : ""].join(" "))]; });
    const out = h("div", { class: "tu-list" });
    const info = h("p", { class: "small muted" });
    const input = h("input", { type: "search", class: "tu-input", value: searchState.q, placeholder: T.searchPh, "aria-label": T.searchAria });
    const chips = h("div", { class: "chips" });
    const paint = () => {
      const q = norm(searchState.q.trim());
      chips.replaceChildren(...[["all", T.scopeAll], ["goethe", T.scopeGoethe], ["learned", T.scopeLearned]].map(([id, label]) => h("button", { type: "button", class: "chip" + (searchState.scope === id ? " on" : ""), onclick: () => { searchState.scope = id; paint(); } }, label)));
      const hits = searchIndex.filter(([k, s]) => (!q || s.includes(q)) && (searchState.scope === "all" || (searchState.scope === "goethe" ? D.words[k].g : lvOf(k) > 0)));
      if (q) hits.sort((a, b) => (norm(D.words[a[0]].de).startsWith(q) ? 0 : 1) - (norm(D.words[b[0]].de).startsWith(q) ? 0 : 1));
      info.textContent = T.hits(hits.length);
      out.replaceChildren(...hits.slice(0, 80).map(([k]) => row(k, { ex: true, topic: TOPIC_OF[k] })));
    };
    let timer = 0;
    input.addEventListener("input", () => { searchState.q = input.value; clearTimeout(timer); timer = setTimeout(paint, 120); });
    mount(h("section", { class: "tu-hero slim" }, h("h1", {}, T.searchTitle), input, chips), info, out);
    paint();
  }

  function settingsPage() {
    const langSel = h("div", { class: "chips", role: "group", "aria-label": T.language }, [["vi", "🇻🇳 " + T.langVi], ["en", "🇬🇧 " + T.langEn]].map(([id, label]) =>
      h("button", { type: "button", class: "chip" + (settings.lang === id ? " on" : ""), "aria-pressed": String(settings.lang === id), onclick: () => setLang(id) }, label)));
    const voices = Speech.de;
    const voiceSel = h("select", { class: "tu-input", "aria-label": T.voice }, voices.length ? voices.map((v) => h("option", { value: v.voiceURI, selected: Speech.chosen && Speech.chosen.voiceURI === v.voiceURI }, v.name + " (" + v.lang + ")")) : [h("option", {}, T.noVoice)]);
    voiceSel.addEventListener("change", () => { store.set("voice", voiceSel.value); Speech.load(); Speech.say("Guten Tag!"); });
    const rate = h("input", { type: "range", min: "0.6", max: "1.1", step: "0.05", value: String(Speech.rate), "aria-label": T.rate });
    rate.addEventListener("change", () => { Speech.rate = Number(rate.value); store.set("rate", Speech.rate); Speech.say("Ich lerne Deutsch."); });
    const goal = h("select", { class: "tu-input", "aria-label": T.goal }, [5, 10, 15, 20, 30].map((n) => h("option", { value: n, selected: n === settings.goal }, T.goalOpt(n))));
    goal.addEventListener("change", () => { settings.goal = Number(goal.value); saveSet(); toast(T.goalSaved); });
    const unlock = h("input", { type: "checkbox", checked: settings.unlockAll });
    unlock.addEventListener("change", () => { settings.unlockAll = unlock.checked; saveSet(); });
    const auto = h("input", { type: "checkbox", checked: settings.autoplay });
    auto.addEventListener("change", () => { settings.autoplay = auto.checked; saveSet(); });
    const file = h("input", { type: "file", accept: "application/json", hidden: true });
    file.addEventListener("change", async () => {
      try {
        const obj = JSON.parse(await file.files[0].text());
        if (!confirm(T.restoreAsk)) return;
        store.load(obj);
        toast(T.restored);
        setTimeout(() => location.reload(), 700);
      } catch (e) { toast(T.badFile); }
    });
    mount(h("section", { class: "tu-hero slim" }, h("h1", {}, T.settingsTitle)),
      h("div", { class: "tu-set" },
        h("div", { class: "tu-set-row" }, h("span", {}, T.language), langSel),
        h("label", {}, h("span", {}, T.goal), goal),
        h("label", { class: "inline" }, unlock, h("span", {}, T.unlockAll)),
        h("label", { class: "inline" }, auto, h("span", {}, T.autoplay)),
        h("label", {}, h("span", {}, T.voice), voiceSel),
        h("label", {}, h("span", {}, T.rate), rate),
        h("p", { class: "small muted" }, T.voiceNote),
        DR.Sync ? DR.Sync.panel({ cls: "tu-sync", heading: "h3" }) : null,
        h("div", { class: "actions" },
          btn(T.backup, () => {
            const obj = {};
            Object.entries(store.dump()).forEach(([k, v]) => { if (k.startsWith("de.tu.")) obj[k] = v; });
            const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: "application/json" })), download: "tu-vung-" + today() + ".json" });
            document.body.append(a); a.click(); a.remove();
          }, "btn ghost"),
          btn(T.restore, () => file.click(), "btn ghost"), file,
          btn(T.reset, () => {
            if (!confirm(T.resetAsk)) return;
            ["tu.prog", "tu.done", "tu.log"].forEach((k) => store.del(k));
            prog = {}; done = {}; log = {};
            toast(T.resetDone); refreshBadge(); settingsPage();
          }, "btn ghost danger"))));
  }

  function notFound() {
    mount(h("section", { class: "tu-hero slim center" }, h("h1", {}, T.notFound), h("div", { class: "actions center" }, h("a", { class: "btn", href: "#/" }, T.home))));
  }

  async function route() {
    const my = ++tok;
    Speech.stop();
    const [a, b] = location.hash.replace(/^#\/?/, "").split("/");
    const navId = { t: "home", l: "home", review: "review", book: "book", search: "search", settings: "settings" }[a] || "home";
    document.querySelectorAll(".nav a").forEach((x) => x.classList.toggle("on", x.dataset.nav === navId));
    try {
      if (!D) {
        mount(h("p", { class: "loading" }, T.loading));
        const r = await fetch("data/words.json?v=2", { cache: "no-cache" });
        if (!r.ok) throw new Error("words.json " + r.status);
        D = await r.json();
        ALL = Object.keys(D.words);
        for (const t of D.topics) for (const l of t.lessons) for (const k of l.words) TOPIC_OF[k] = t.id;
        for (const k of ALL) { D.words[k].key = k; (BY_KIND[D.words[k].kind] = BY_KIND[D.words[k].kind] || []).push(k); }
        refreshBadge();
        setInterval(refreshBadge, 30000);
      }
      if (my !== tok) return;
      if (a === "t") topicPage(b);
      else if (a === "l") await lessonPage(b);
      else if (a === "review") await reviewPage(b);
      else if (a === "book") bookPage();
      else if (a === "search") searchPage();
      else if (a === "settings") settingsPage();
      else home();
    } catch (e) {
      if (e === CANCEL) return;
      console.error(e);
      mount(h("p", { class: "loading" }, T.loadFail));
    }
  }

  $("#t-theme").addEventListener("click", () => {
    const t = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    store.set("theme", t);
  });
  $("#t-lang").addEventListener("click", () => setLang(EN() ? "vi" : "en"));
  document.addEventListener("dr-sync", () => {
    prog = store.get("tu.prog", {});
    done = store.get("tu.done", {});
    log = store.get("tu.log", {});
    refreshBadge();
    if (D && !document.querySelector(".tu-stage")) route();
  });
  applyChrome();
  DR.umlautBar();
  window.addEventListener("hashchange", route);
  route();
})();
