/* ==========================================================================
   Deutsch Room · core.js
   Helpers shared by blocks.js and pages.js: DOM builder, answer checking,
   storage (this browser only), German text-to-speech, the book's audio kept
   in IndexedDB, spaced repetition and data loading.
   ========================================================================== */
(() => {
  "use strict";
  const DR = (window.DR = window.DR || {});

  /* ---------- DOM ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const btn = (label, onclick, cls = "btn", title) =>
    h("button", { type: "button", class: cls, onclick, title: title || null, "aria-label": title || null }, label);
  const shuffle = (a) => {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const sample = (a, n) => shuffle(a).slice(0, n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = (html) => {
    const d = document.createElement("div");
    d.innerHTML = String(html);
    return d.textContent || "";
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- Answer checking ----------
     Case does not matter, ä = ae, ö = oe, ü = ue, ß = ss, punctuation is ignored. */
  function fold(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[’‘`´]/g, "'")
      .replace(/-/g, "")
      .replace(/[.,!?;:„“”"«»()…–—]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  const same = (a, b) => fold(a) === fold(b);
  /* Returns { ok, note }: note reminds about capital letters or ä/ö/ü/ß when they were left out. */
  function check(input, answers, opts = {}) {
    const val = String(input == null ? "" : input).trim().replace(/\s+/g, " ");
    for (const a of answers) {
      const good = opts.exact ? val.replace(/[.!?]$/, "") === String(a).replace(/[.!?]$/, "") : same(val, a);
      if (!good) continue;
      let note = "";
      if (!opts.exact && val) {
        if (/[äöüßÄÖÜ]/.test(a) && !/[äöüßÄÖÜ]/.test(val)) note = "Đúng! Viết chuẩn là: " + a;
        else if (/^[A-ZÄÖÜ]/.test(a) && /^[a-zäöü]/.test(val)) note = "Đúng! Nhớ viết hoa: " + a;
      }
      return { ok: true, note };
    }
    return { ok: false, note: "" };
  }

  /* ---------- Toast ---------- */
  let toastTimer = 0;
  function toast(text, ms = 2600) {
    let t = $(".toast");
    if (!t) t = document.body.appendChild(h("div", { class: "toast", role: "status" }));
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("on"), ms);
  }

  /* ---------- Storage (this browser only) ---------- */
  const PREFIX = "de.";
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem(PREFIX + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(PREFIX + k); } catch (e) {} },
    dump() {
      const out = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) out[k] = localStorage.getItem(k);
        }
      } catch (e) {}
      return out;
    },
    load(obj) {
      for (const [k, v] of Object.entries(obj || {})) {
        if (k.startsWith(PREFIX) && typeof v === "string") try { localStorage.setItem(k, v); } catch (e) {}
      }
    },
    clear() { Object.keys(this.dump()).forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} }); },
  };

  /* ---------- Dates (local time, YYYY-MM-DD) ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const dayStr = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => dayStr(new Date());
  const addDays = (n) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return dayStr(d);
  };

  /* ---------- German speech (browser voices) ---------- */
  const FEMALE = /anna|helena|petra|katja|marlene|vicki|hedda|amala|seraphina|louisa|elke|sandy|shelley|flo\b|grandma|google deutsch|tanja|ingrid|leni|gisela|kerstin/i;
  const MALE = /markus|yannick|conrad|killian|stefan|florian|jonas|martin|hans|reed|rocko|grandpa|eddy|ralf|christoph|bernd|kasper|klaus/i;
  const ROBOTIC = /eloquence|grandma|grandpa|rocko|shelley|sandy|reed|eddy|flo\b/i;
  function cleanSay(text) {
    return strip(text).replace(/…|\.\.\./g, " ").replace(/^\s*[–-]\s*/, "").replace(/\s+[–—]\s+/g, ", ").replace(/\s+/g, " ").trim();
  }
  let warned = false;
  const Speech = {
    supported: "speechSynthesis" in window,
    voices: [],
    de: [],
    chosen: null,
    rate: store.get("rate", 0.9),
    load() {
      if (!this.supported) return;
      this.voices = speechSynthesis.getVoices() || [];
      this.de = this.voices.filter((v) => /^de([-_]|$)/i.test(v.lang || ""));
      const saved = store.get("voice", "");
      this.chosen = this.de.find((v) => v.voiceURI === saved) || this.best(this.de) || null;
      document.dispatchEvent(new CustomEvent("dr-voices"));
    },
    score(v) {
      let s = 0;
      if (/de[-_]DE/i.test(v.lang)) s += 5;
      if (/natural|neural|online/i.test(v.name)) s += 6;
      if (/google/i.test(v.name)) s += 5;
      if (/premium|enhanced|plus|siri/i.test(v.name)) s += 4;
      if (FEMALE.test(v.name) || MALE.test(v.name)) s += 2;
      if (ROBOTIC.test(v.name)) s -= 8;
      return s;
    },
    best(list) { return list.slice().sort((a, b) => this.score(b) - this.score(a))[0]; },
    /* A voice for a dialogue role: f = woman, m = man, m2 = another man. */
    roleVoice(role) {
      // Robotic "Eloquence" voices (Eddy, Grandpa…) score below zero: better one good voice at another pitch.
      const pick = (re) => this.de.filter((v) => re.test(v.name) && !ROBOTIC.test(v.name)).sort((a, b) => this.score(b) - this.score(a));
      if (role === "f") {
        const f = pick(FEMALE);
        return { voice: f[0] || this.chosen, pitch: f[0] ? 1 : 1.15 };
      }
      const m = pick(MALE);
      if (role === "m2") return { voice: m[1] || m[0] || this.chosen, pitch: m[1] ? 1 : m[0] ? 0.92 : 0.82 };
      return { voice: m[0] || this.chosen, pitch: m[0] ? 1 : 0.88 };
    },
    say(text, opts = {}) {
      return new Promise((resolve) => {
        if (!this.supported) { toast("Trình duyệt này không có giọng đọc."); return resolve(false); }
        if (!this.voices.length) this.load();
        if (!this.de.length && !warned) { warned = true; toast("Máy chưa có giọng đọc tiếng Đức — xem hướng dẫn trong Cài đặt.", 4500); }
        const said = cleanSay(text);
        if (!said) return resolve(true);
        const u = new SpeechSynthesisUtterance(said);
        const v = opts.voice || this.chosen;
        u.lang = (v && v.lang) || "de-DE";
        if (v) u.voice = v;
        u.rate = opts.slow ? 0.62 : opts.rate || this.rate;
        u.pitch = opts.pitch || 1;
        let done = false;
        const finish = (ok) => { if (!done) { done = true; resolve(ok); } };
        u.onend = () => finish(true);
        u.onerror = () => finish(false);
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        // Some browsers never fire "end": give up after a generous estimate.
        setTimeout(() => finish(true), 3500 + (said.length * 120) / u.rate);
      });
    },
    stop() { if (this.supported) speechSynthesis.cancel(); },
  };
  if (Speech.supported) {
    Speech.load();
    speechSynthesis.addEventListener("voiceschanged", () => Speech.load());
  }
  const sayBtns = (text, slowToo = true) => h("span", { class: "say" },
    btn("🔊", (e) => { e.stopPropagation(); Speech.say(text); }, "icon-btn", "Nghe"),
    slowToo ? btn("🐢", (e) => { e.stopPropagation(); Speech.say(text, { slow: true }); }, "icon-btn", "Nghe chậm") : null);

  /* Letter names for spelling (what the voice should say). */
  const LETTERS = {
    A: "A", B: "Beh", C: "Zeh", D: "Deh", E: "E", F: "Eff", G: "Geh", H: "Ha", I: "I", J: "Jott", K: "Ka", L: "Ell", M: "Emm",
    N: "Enn", O: "O", P: "Peh", Q: "Ku", R: "Err", S: "Ess", T: "Teh", U: "U", V: "Fau", W: "Weh", X: "Ix", Y: "Ypsilon", Z: "Zett",
    "Ä": "Ä", "Ö": "Ö", "Ü": "Ü", "ß": "Eszett",
  };
  /* Vietnamese names are written without accents in German forms: Nguyễn → Nguyen. ä/ö/ü/ß stay. */
  function plainName(s) {
    const keep = { "ä": "\u0001", "ö": "\u0002", "ü": "\u0003", "Ä": "\u0004", "Ö": "\u0005", "Ü": "\u0006" };
    const back = Object.fromEntries(Object.entries(keep).map(([k, v]) => [v, k]));
    return String(s).replace(/[äöüÄÖÜ]/g, (c) => keep[c]).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[\u0001-\u0006]/g, (c) => back[c]).normalize("NFC");
  }
  function spellOut(word) {
    const chars = Array.from(plainName(word)).filter((c) => /[A-Za-zÄÖÜäöüß]/.test(c));
    return {
      shown: chars.map((c) => (c === "ß" ? "ß" : c.toUpperCase())).join(" – "),
      say: chars.map((c) => LETTERS[c === "ß" ? "ß" : c.toUpperCase()] || c).join(", "),
    };
  }

  /* ---------- The book's audio, kept in this browser (IndexedDB) ---------- */
  const Tracks = {
    db: null,
    have: new Set(),
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        if (!("indexedDB" in window)) return rej(new Error("no indexedDB"));
        const r = indexedDB.open("deutsch-room", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("tracks");
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      });
    },
    req(mode, fn) {
      return this.open().then((db) => new Promise((res, rej) => {
        const t = db.transaction("tracks", mode);
        const r = fn(t.objectStore("tracks"));
        t.oncomplete = () => res(r ? r.result : undefined);
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error || new Error("abort"));
      }));
    },
    async init() {
      try { (await this.req("readonly", (s) => s.getAllKeys())).forEach((k) => this.have.add(k)); } catch (e) {}
      return this.have.size;
    },
    get(key) { return this.req("readonly", (s) => s.get(key)); },
    has(key) { return this.have.has(key); },
    async clear() { await this.req("readwrite", (s) => s.clear()); this.have.clear(); },
    /* File names from the book's CDs: 301082_KB_L01_09.mp3 → KB-1-9 (CD 1, track 9); 301082_AB_L02_14.mp3 → AB-14. */
    keyOf(name) {
      const m = /(KB|AB)_L0?(\d)_0*(\d+)\.mp3$/i.exec(name || "");
      if (!m) return null;
      return m[1].toUpperCase() === "KB" ? `KB-${+m[2] <= 4 ? 1 : 2}-${+m[3]}` : `AB-${+m[3]}`;
    },
    /* "KB 1/1-8" or "AB 6-12" → [{ key, label }] */
    parse(ref) {
      const out = [];
      for (const part of String(ref || "").split(",")) {
        let m = /KB\s*(\d)\s*\/\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(part);
        if (m) {
          for (let i = +m[2]; i <= +(m[3] || m[2]); i++) out.push({ key: `KB-${m[1]}-${i}`, label: String(i), book: "KB", cd: +m[1] });
          continue;
        }
        m = /AB\s*(\d+)(?:\s*-\s*(\d+))?/i.exec(part);
        if (m) for (let i = +m[1]; i <= +(m[2] || m[1]); i++) out.push({ key: `AB-${i}`, label: String(i), book: "AB" });
      }
      return out;
    },
    refLabel(ref) {
      const t = this.parse(ref);
      if (!t.length) return "";
      const span = t.length > 1 ? t[0].label + "–" + t[t.length - 1].label : t[0].label;
      return t[0].book === "KB" ? `Kursbuch · CD ${t[0].cd} · track ${span}` : `Arbeitsbuch · track ${span}`;
    },
    async importFiles(files, onProgress) {
      const list = Array.from(files).filter((f) => this.keyOf(f.name));
      let n = 0, size = 0;
      for (const f of list) {
        const key = this.keyOf(f.name);
        const buf = await f.arrayBuffer();
        await this.req("readwrite", (s) => s.put(new Blob([buf], { type: "audio/mpeg" }), key));
        this.have.add(key);
        n++;
        size += f.size;
        if (onProgress) onProgress(n, list.length);
      }
      return { n, size, ignored: files.length - list.length };
    },
    counts() {
      let kb = 0, ab = 0;
      this.have.forEach((k) => { if (k.startsWith("KB")) kb++; else ab++; });
      return { kb, ab };
    },
  };

  /* A player for the book's tracks (from this browser's storage). */
  const players = new Set();
  function stopAllAudio(except) { players.forEach((a) => { if (a !== except) a.pause(); }); }
  function trackPlayer(ref, opts = {}) {
    const tracks = Tracks.parse(ref);
    const el = h("div", { class: "player" + (opts.small ? " small" : "") });
    const label = h("span", { class: "p-label" }, "🎧 " + Tracks.refLabel(ref));
    const ready = tracks.filter((t) => Tracks.has(t.key));
    if (!ready.length) {
      el.classList.add("off");
      el.append(label, h("span", { class: "p-note" }, "chưa có audio của sách trên máy này · ", h("a", { href: "#/settings" }, "thêm audio")));
      return el;
    }
    const audio = new Audio();
    audio.preload = "none";
    players.add(audio);
    let cur = -1, url = null, chain = false;
    const fmt = (t) => Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0");
    const chips = tracks.map((t, i) => {
      const ok = Tracks.has(t.key);
      return h("button", { type: "button", class: "p-chip", disabled: !ok, title: ok ? "Track " + t.label : "Chưa có file này", onclick: () => { chain = false; load(i, true); } }, t.label);
    });
    const play = btn("▶", () => toggle(), "p-btn p-play", "Phát / dừng");
    const all = tracks.length > 1 ? btn("▶ Phát hết", () => { chain = true; load(Math.max(0, cur), true); }, "btn small ghost") : null;
    const back = btn("↺5", () => { audio.currentTime = Math.max(0, audio.currentTime - 5); }, "p-btn", "Lùi 5 giây");
    const seek = h("input", { type: "range", class: "p-seek", min: 0, max: 1000, value: 0, "aria-label": "Vị trí" });
    const time = h("span", { class: "p-time" }, "0:00");
    const speed = h("select", { class: "p-speed", "aria-label": "Tốc độ" }, ["0.75", "0.9", "1"].map((s) => h("option", { value: s, selected: s === "1" }, s + "×")));
    speed.addEventListener("change", () => { audio.playbackRate = Number(speed.value); });
    seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration; });
    audio.addEventListener("timeupdate", () => {
      if (audio.duration) seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      time.textContent = fmt(audio.currentTime) + (audio.duration ? " / " + fmt(audio.duration) : "");
    });
    audio.addEventListener("play", () => { stopAllAudio(audio); Speech.stop(); play.textContent = "❚❚"; el.classList.add("on"); });
    audio.addEventListener("pause", () => { play.textContent = "▶"; el.classList.remove("on"); });
    audio.addEventListener("ended", () => {
      if (!chain) return;
      const next = tracks.findIndex((t, j) => j > cur && Tracks.has(t.key));
      if (next >= 0) load(next, true); else chain = false;
    });
    async function load(i, autoplay) {
      const t = tracks[i];
      if (!t || !Tracks.has(t.key)) return;
      if (i !== cur) {
        const blob = await Tracks.get(t.key);
        if (!blob) return toast("Không đọc được file audio này.");
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(blob);
        audio.src = url;
        cur = i;
        chips.forEach((c, j) => c.classList.toggle("on", j === i));
      }
      audio.playbackRate = Number(speed.value);
      if (autoplay) { try { await audio.play(); } catch (e) {} }
    }
    async function toggle() {
      if (cur < 0) { chain = tracks.length > 1; return load(tracks.findIndex((t) => Tracks.has(t.key)), true); }
      if (audio.paused) { audio.playbackRate = Number(speed.value); try { await audio.play(); } catch (e) {} } else audio.pause();
    }
    el.append(h("div", { class: "p-top" }, label, all), h("div", { class: "p-chips" }, chips), h("div", { class: "p-ctrl" }, play, back, seek, time, speed));
    return el;
  }

  /* ---------- Recorder (kept in memory only) ---------- */
  function recorder(label = "● Ghi âm") {
    let rec = null, chunks = [], url = null;
    const out = h("audio", { controls: true, class: "rec-audio", hidden: true });
    const go = btn(label, start, "btn small rec");
    async function start() {
      if (rec) { rec.stop(); return; }
      if (!navigator.mediaDevices || !window.MediaRecorder) return toast("Trình duyệt này không ghi âm được.");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        rec = new MediaRecorder(stream);
        chunks = [];
        rec.ondataavailable = (e) => chunks.push(e.data);
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          out.src = url;
          out.hidden = false;
          rec = null;
          go.textContent = "● Ghi lại";
          go.classList.remove("live");
        };
        rec.start();
        go.textContent = "■ Dừng ghi";
        go.classList.add("live");
      } catch (e) {
        toast("Không mở được micro. Hãy cho phép micro trong trình duyệt.");
      }
    }
    return h("span", { class: "recorder" }, go, out);
  }

  /* ---------- Spaced repetition ----------
     Boxes 1–6; a right answer moves a card up one box, a wrong one sends it back to box 1.
     Days until the next review, by box: */
  const INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  const SRS = {
    all() { return store.get("srs", {}); },
    save(d) { store.set("srs", d); document.dispatchEvent(new CustomEvent("dr-srs")); },
    add(keys) {
      const d = this.all();
      let n = 0;
      for (const k of keys) if (!d[k]) { d[k] = { b: 1, d: addDays(1), n: 0, w: 0, a: today() }; n++; }
      if (n) this.save(d);
      return n;
    },
    has(k) { return Boolean(this.all()[k]); },
    due() {
      const t = today(), d = this.all();
      return Object.keys(d).filter((k) => d[k].d <= t).sort((a, b) => (d[a].d < d[b].d ? -1 : d[a].d > d[b].d ? 1 : 0));
    },
    dueOn(day) { const d = this.all(); return Object.keys(d).filter((k) => d[k].d === day).length; },
    grade(k, ok) {
      const d = this.all();
      const c = d[k] || { b: 1, n: 0, w: 0, a: today() };
      c.n++;
      if (ok) { c.b = Math.min(c.b + 1, 6); c.d = addDays(INTERVALS[c.b]); } else { c.b = 1; c.w++; c.d = addDays(1); }
      d[k] = c;
      this.save(d);
    },
    level(k) { const c = this.all()[k]; return c ? c.b : 0; },
  };

  /* ---------- Course data ---------- */
  const Data = {
    course: null,
    leks: {},
    words: {},
    async getCourse() {
      if (!this.course) this.course = await fetchJSON("data/course.json");
      return this.course;
    },
    async getLek(id) {
      if (this.leks[id]) return this.leks[id];
      const c = await this.getCourse();
      const meta = c.lektionen.find((l) => l.id === id);
      if (!meta || !meta.ready) return null;
      const L = await fetchJSON(meta.file);
      L.setIndex = {};
      for (const s of L.sets) {
        L.setIndex[s.id] = s;
        for (const w of s.items) {
          w.key = L.id + "/" + w.id;
          w.set = s.id;
          w.lek = L.id;
          this.words[w.key] = w;
        }
      }
      this.leks[id] = L;
      return L;
    },
    async allLeks() {
      const c = await this.getCourse();
      const out = [];
      for (const l of c.lektionen) if (l.ready) out.push(await this.getLek(l.id));
      return out;
    },
    word(key) { return this.words[key]; },
  };
  async function fetchJSON(path) {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(path + " " + r.status);
    return r.json();
  }

  /* ---------- How a word is shown and said ---------- */
  const ART_CLASS = { der: "g-der", die: "g-die", das: "g-das" };
  function artOf(w) { return w.plOnly ? "pl" : w.art || ""; }
  function sayOf(w) {
    if (w.say) return w.say;
    if (w.kind === "noun" && w.art) return w.art + " " + w.de;
    return w.de;
  }
  function wordLabel(w, opts = {}) {
    const a = artOf(w);
    const art = a ? h("span", { class: "art " + (a === "pl" ? "g-pl" : ART_CLASS[a]) }, a === "pl" ? "die" : a) : null;
    return h("span", { class: "wl" + (a ? " has-art " + (a === "pl" ? "g-pl-word" : ART_CLASS[a] + "-word") : "") }, opts.noArt ? null : art, art && !opts.noArt ? " " : null, h("span", { class: "wl-de" }, w.de));
  }

  /* ---------- Wrong answers in the open session (for the "review" block) ---------- */
  const Missed = {
    map: new Map(),
    reset() { this.map = new Map(); },
    add(key, item) { if (key && !this.map.has(key)) this.map.set(key, item); },
    list() { return Array.from(this.map.values()); },
  };

  /* ---------- ä ö ü ß buttons above the focused text box ---------- */
  function umlautBar() {
    const bar = $("#umlaut");
    if (!bar) return;
    let target = null;
    const chars = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];
    bar.append(...chars.map((c) => h("button", {
      type: "button", class: "uml", tabindex: "-1",
      onpointerdown: (e) => e.preventDefault(),
      onmousedown: (e) => e.preventDefault(),
      onclick: () => {
        if (!target) return;
        const s = target.selectionStart == null ? target.value.length : target.selectionStart;
        const e2 = target.selectionEnd == null ? s : target.selectionEnd;
        target.setRangeText(c, s, e2, "end");
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.focus();
      },
    }, c)));
    const isText = (el) => el && el.matches && el.matches("input[type=text], input:not([type]), textarea") && !el.closest(".no-uml");
    function place() {
      if (!target || bar.hidden) return;
      const r = target.getBoundingClientRect();
      const bw = bar.offsetWidth, bh = bar.offsetHeight;
      let top = r.top - bh - 6;
      if (top < 60) top = r.bottom + 6;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - bw - 8));
      bar.style.top = top + window.scrollY + "px";
      bar.style.left = left + window.scrollX + "px";
    }
    document.addEventListener("focusin", (e) => {
      if (isText(e.target)) { target = e.target; bar.hidden = false; place(); }
    });
    document.addEventListener("focusout", () => {
      setTimeout(() => {
        const a = document.activeElement;
        if (!isText(a) && !(a && a.closest && a.closest("#umlaut"))) bar.hidden = true;
      }, 180);
    });
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", place);
  }

  /* Clicking any element with data-say reads it aloud. */
  document.addEventListener("click", (e) => {
    const s = e.target.closest && e.target.closest("[data-say]");
    if (s && !s.closest("button")) Speech.say(s.dataset.say);
  });

  Object.assign(DR, {
    $, $$, h, btn, shuffle, sample, esc, strip, wait, fold, same, check, toast, store, today, addDays,
    Speech, sayBtns, LETTERS, plainName, spellOut, Tracks, trackPlayer, stopAllAudio, recorder, SRS, Data,
    artOf, sayOf, wordLabel, ART_CLASS, Missed, umlautBar,
  });
})();
