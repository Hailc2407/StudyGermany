(() => {
  "use strict";
  const DR = window.DR;
  if (!DR) return;
  const { h, btn, store, toast } = DR;

  const CFG_KEY = "dr.sync";
  const FILE = "deutsch-room-sync.json";
  const API = "https://api.github.com";
  const SKIP = new Set(["de.voice", "de.rate", "de.theme", "de.me"]);
  const isSynced = (k) => typeof k === "string" && k.startsWith("de.") && !SKIP.has(k);
  const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=gist&description=Deutsch%20Room%20sync";

  function readCfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; } catch (e) { return {}; } }
  let cfg = readCfg();
  const saveCfg = () => { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {} };
  const on = () => Boolean(cfg.token);

  function localSnap() {
    const o = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (isSynced(k)) o[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    return o;
  }
  function writeLocal(snap) {
    try {
      Object.keys(localSnap()).forEach((k) => { if (!(k in snap)) localStorage.removeItem(k); });
      for (const [k, v] of Object.entries(snap)) if (isSynced(k) && typeof v === "string") localStorage.setItem(k, v);
    } catch (e) {}
  }
  const sameSnap = (a, b) => {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
  };

  const parse = (s) => { try { return JSON.parse(s); } catch (e) { return undefined; } };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const BAD_KEY = new Set(["__proto__", "constructor", "prototype"]);
  function perItem(a, b, pick) {
    const out = {};
    for (const k of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if (BAD_KEY.has(k)) continue;
      out[k] = k in a && k in b ? pick(a[k], b[k]) : k in a ? a[k] : b[k];
    }
    return out;
  }
  const moreReviews = (x, y) => (isObj(y) && (y.n || 0) > ((isObj(x) && x.n) || 0) ? y : x);
  const maxFields = (x, y) => {
    const o = Object.assign({}, y, x);
    for (const k of Object.keys(o)) if (typeof (x || {})[k] === "number" && typeof (y || {})[k] === "number") o[k] = Math.max(x[k], y[k]);
    return o;
  };
  const RULES = {
    "de.srs": (a, b) => perItem(a, b, moreReviews),
    "de.tu.prog": (a, b) => perItem(a, b, moreReviews),
    "de.tu.done": (a, b) => perItem(a, b, (x, y) => ((y && y.at) || 0) > ((x && x.at) || 0) ? y : x),
    "de.tu.log": (a, b) => perItem(a, b, maxFields),
    "de.progress": (a, b) => perItem(a, b, (x, y) => (x && x.done ? x : y)),
    "de.tests": (a, b) => perItem(a, b, (x, y) => {
      const newer = ((y && y.date) || "") > ((x && x.date) || "") ? y : x;
      return Object.assign({}, newer, { best: Math.max((x && x.best) || 0, (y && y.best) || 0) });
    }),
    "de.check": (a, b) => perItem(a, b, (x, y) => x || y),
    "de.cando": (a, b) => perItem(a, b, (x) => x),
  };
  function merge(a, b) {
    const out = {};
    for (const k of [...Object.keys(b), ...Object.keys(a)]) if (isSynced(k)) out[k] = k in a ? a[k] : b[k];
    for (const k of Object.keys(a)) {
      if (!(k in b) || a[k] === b[k] || !RULES[k]) continue;
      const x = parse(a[k]), y = parse(b[k]);
      if (isObj(x) && isObj(y)) out[k] = JSON.stringify(RULES[k](x, y));
    }
    return out;
  }

  async function gh(path, opts = {}) {
    const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + cfg.token };
    if (opts.body) headers["Content-Type"] = "application/json";
    let r;
    try { r = await fetch(API + path, Object.assign({}, opts, { headers, cache: "no-store" })); } catch (e) { throw Object.assign(new Error("net"), { kind: "net" }); }
    if (r.status === 403 && r.headers.get("x-ratelimit-remaining") === "0") throw Object.assign(new Error("rate limit"), { kind: "net" });
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error("auth " + r.status), { kind: "auth" });
    if (r.status === 404) throw Object.assign(new Error("gone"), { kind: "gone" });
    if (!r.ok) throw Object.assign(new Error("GitHub " + r.status), { kind: "net" });
    return r.status === 204 ? null : r.json();
  }
  async function findGist() {
    for (let p = 1; p <= 10; p++) {
      const list = await gh("/gists?per_page=100&page=" + p);
      const g = list.find((x) => x.files && x.files[FILE]);
      if (g) return g.id;
      if (list.length < 100) break;
    }
    return "";
  }
  async function readRemote() {
    const g = await gh("/gists/" + cfg.gist);
    const f = g.files && g.files[FILE];
    if (!f) return null;
    let text = f.content;
    if (f.truncated && f.raw_url) text = await (await fetch(f.raw_url, { cache: "no-store" })).text();
    const data = parse(text);
    if (!data || data.app !== "deutsch-room-sync" || !isObj(data.store)) return null;
    const clean = {};
    for (const [k, v] of Object.entries(data.store)) if (isSynced(k) && typeof v === "string") clean[k] = v;
    return Object.assign({}, data, { store: clean });
  }
  async function writeRemote(snap) {
    const rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const content = JSON.stringify({ app: "deutsch-room-sync", v: 1, rev, savedAt: new Date().toISOString(), store: snap });
    const body = { files: { [FILE]: { content } } };
    if (cfg.gist) await gh("/gists/" + cfg.gist, { method: "PATCH", body: JSON.stringify(body) });
    else {
      body.description = "Deutsch Room — tiến độ học (web tự đồng bộ, đừng sửa tay)";
      body.public = false;
      const g = await gh("/gists", { method: "POST", body: JSON.stringify(body) });
      cfg.gist = g.id;
    }
    return rev;
  }

  let edits = 0, busy = null, again = false, timer = 0, state = on() ? (cfg.err ? "err" : "ok") : "off";
  function setState(s) { state = s; document.dispatchEvent(new CustomEvent("dr-sync-state", { detail: s })); }
  function sync() {
    if (!on()) return Promise.resolve();
    if (busy) { again = true; return busy; }
    busy = run().finally(() => { busy = null; if (again) { again = false; sync(); } });
    return busy;
  }
  async function run() {
    const e0 = edits;
    setState("busy");
    try {
      if (!cfg.gist) { cfg.gist = await findGist(); saveCfg(); }
      let remote = null;
      if (cfg.gist) {
        try { remote = await readRemote(); } catch (e) { if (e.kind !== "gone") throw e; cfg.gist = ""; cfg.rev = ""; }
      }
      const local = localSnap();
      const remoteNew = Boolean(remote) && remote.rev !== cfg.rev;
      let next = local, push = false;
      if (!remote || cfg.force) push = true;
      else if (remoteNew && !cfg.dirty) next = remote.store;
      else if (remoteNew) { next = merge(local, remote.store); push = !sameSnap(next, remote.store); }
      else push = Boolean(cfg.dirty);
      if (edits !== e0) { again = true; setState("ok"); return; }
      const changedLocal = !sameSnap(local, next);
      if (changedLocal) writeLocal(next);
      cfg.rev = push ? await writeRemote(next) : remote.rev;
      cfg.dirty = edits !== e0;
      cfg.force = false;
      cfg.at = Date.now();
      cfg.err = "";
      saveCfg();
      setState("ok");
      if (changedLocal) document.dispatchEvent(new CustomEvent("dr-sync"));
    } catch (e) {
      cfg.err = e.kind === "auth" ? "auth" : "net";
      saveCfg();
      setState("err");
    }
  }

  const orig = { set: store.set, del: store.del, load: store.load, clear: store.clear };
  function touched(force) {
    if (!on()) return;
    edits++;
    cfg.dirty = true;
    if (force) cfg.force = true;
    saveCfg();
    clearTimeout(timer);
    timer = setTimeout(sync, 4000);
  }
  store.set = function (k, v) { orig.set.call(store, k, v); if (isSynced("de." + k)) touched(false); };
  store.del = function (k) { orig.del.call(store, k); if (isSynced("de." + k)) touched(true); };
  store.load = function (obj) { orig.load.call(store, obj); touched(true); };
  store.clear = function () { orig.clear.call(store); touched(true); };

  document.addEventListener("visibilitychange", () => {
    if (!on()) return;
    if (document.visibilityState === "hidden") { if (cfg.dirty) { clearTimeout(timer); sync(); } }
    else if (Date.now() - (cfg.at || 0) > 20000) sync();
  });
  window.addEventListener("online", () => { if (on() && cfg.err) sync(); });
  if (on()) setTimeout(sync, 300);

  const TOKEN_RE = /^(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})$/;
  async function connect(token) {
    token = token.trim();
    if (!TOKEN_RE.test(token)) throw Object.assign(new Error("format"), { kind: "format" });
    cfg = { token, gist: "", rev: "", dirty: true, force: false };
    try {
      const r = await fetch(API + "/gists?per_page=1", { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token }, cache: "no-store" });
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error("auth"), { kind: "auth" });
      if (!r.ok) throw Object.assign(new Error("net"), { kind: "net" });
      const scopes = r.headers.get("x-oauth-scopes");
      if (scopes != null && scopes.split(",").map((x) => x.trim()).filter(Boolean).some((x) => x !== "gist")) throw Object.assign(new Error("scope"), { kind: "scope" });
    } catch (e) {
      cfg = {};
      throw e.kind ? e : Object.assign(new Error("net"), { kind: "net" });
    }
    saveCfg();
    await sync();
  }
  function disconnect() { cfg = {}; try { localStorage.removeItem(CFG_KEY); } catch (e) {} setState("off"); }

  const TEXT = {
    vi: {
      title: "☁️ Đồng bộ giữa các thiết bị",
      intro: "Dùng chung tiến độ trên điện thoại, máy tính… qua một gist bí mật trong tài khoản GitHub của bạn. Đồng bộ cả web chính và trang từ vựng; giọng đọc, tốc độ, sáng/tối và bài tự giới thiệu (tên, tuổi…) vẫn để riêng từng máy.",
      steps: ["Mở trang tạo mã của GitHub (cần đăng nhập GitHub):", "Chỉ tích quyền „gist“, chọn thời hạn (ví dụ 1 năm), bấm Generate token rồi chép mã (bắt đầu bằng ghp_).", "Dán mã vào ô dưới và bấm Kết nối. Làm giống vậy trên mỗi thiết bị (có thể dùng lại cùng một mã)."],
      link: "Tạo mã GitHub ↗", ph: "Dán mã GitHub (ghp_…)", connect: "Kết nối", connecting: "Đang kết nối…",
      warn: "Mã chỉ lưu trong trình duyệt này và chỉ có quyền với gist. Đừng kết nối trên máy dùng chung. Lỡ lộ mã thì vào GitHub → Settings → Developer settings → Tokens để xoá.",
      ok: (t) => "✓ Đã đồng bộ lúc " + t + ".", busy: "Đang đồng bộ…", never: "Chưa đồng bộ lần nào.",
      errAuth: "✗ Mã không dùng được nữa (sai, bị xoá hoặc hết hạn). Hãy tạo mã mới rồi kết nối lại.",
      errNet: "✗ Chưa đồng bộ được (mất mạng?). Web sẽ tự thử lại.",
      now: "🔄 Đồng bộ ngay", gist: "Xem gist ↗", off: "Ngắt kết nối trên máy này",
      offAsk: "Ngắt đồng bộ trên máy này? Tiến độ vẫn giữ nguyên ở máy này và trong gist.", offDone: "Đã ngắt đồng bộ.",
      badToken: "Mã không đúng hoặc thiếu quyền gist.", badFormat: "Đây không phải mã GitHub (mã bắt đầu bằng ghp_ hoặc github_pat_).",
      badScope: "Mã này có nhiều quyền hơn mức cần (ví dụ quyền repo). Hãy tạo mã mới chỉ tích „gist“ cho an toàn.", netFail: "Không kết nối được GitHub. Kiểm tra mạng rồi thử lại.", done: "Đã kết nối và đồng bộ.",
    },
    en: {
      title: "☁️ Sync between devices",
      intro: "Share your progress across phone, laptop… through a secret gist in your GitHub account. Syncs both the main site and the vocabulary pages; voice, speed, light/dark mode and your self-introduction (name, age…) stay per device.",
      steps: ["Open GitHub's token page (you need to be signed in to GitHub):", "Tick only the “gist” scope, pick an expiry (e.g. 1 year), click Generate token and copy it (it starts with ghp_).", "Paste it below and click Connect. Do the same on each device (the same token works)."],
      link: "Create a GitHub token ↗", ph: "Paste your GitHub token (ghp_…)", connect: "Connect", connecting: "Connecting…",
      warn: "The token is stored only in this browser and can only touch gists. Don't connect on a shared computer. If it leaks, delete it under GitHub → Settings → Developer settings → Tokens.",
      ok: (t) => "✓ Synced at " + t + ".", busy: "Syncing…", never: "Not synced yet.",
      errAuth: "✗ The token no longer works (wrong, revoked or expired). Create a new one and connect again.",
      errNet: "✗ Couldn't sync (offline?). It will try again by itself.",
      now: "🔄 Sync now", gist: "View gist ↗", off: "Disconnect this device",
      offAsk: "Stop syncing on this device? Your progress stays on this device and in the gist.", offDone: "Sync turned off.",
      badToken: "That token is wrong or lacks the gist scope.", badFormat: "That isn't a GitHub token (it starts with ghp_ or github_pat_).",
      badScope: "This token can do more than needed (e.g. repo access). Create a new one with only “gist” ticked, to be safe.", netFail: "Couldn't reach GitHub. Check your connection and try again.", done: "Connected and synced.",
    },
  };
  function panel(opts = {}) {
    const T = TEXT[(document.documentElement.lang || "vi").slice(0, 2)] || TEXT.vi;
    const box = h("section", { class: "sync-box " + (opts.cls || "") });
    const time = (ms) => new Date(ms).toLocaleString(T === TEXT.en ? "en-GB" : "vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
    function paint() {
      if (!box.isConnected && box.dataset.painted) { document.removeEventListener("dr-sync-state", paint); return; }
      box.dataset.painted = "1";
      const head = h(opts.heading || "h2", {}, T.title);
      if (!on()) {
        const input = h("input", { type: "password", class: "sync-input no-uml", placeholder: T.ph, autocomplete: "off", autocapitalize: "none", spellcheck: "false", "aria-label": T.ph });
        const go = btn(T.connect, async () => {
          if (!input.value.trim()) { input.focus(); return; }
          go.disabled = true; go.textContent = T.connecting;
          try { await connect(input.value); toast(T.done); }
          catch (e) { toast(e.kind === "auth" ? T.badToken : e.kind === "format" ? T.badFormat : e.kind === "scope" ? T.badScope : T.netFail); }
          input.value = "";
          paint();
        }, "btn");
        box.replaceChildren(head, h("p", { class: "muted" }, T.intro),
          h("ol", { class: "sync-steps" },
            h("li", {}, T.steps[0], " ", h("a", { href: TOKEN_URL, target: "_blank", rel: "noopener" }, T.link)),
            h("li", {}, T.steps[1]), h("li", {}, T.steps[2])),
          h("div", { class: "sync-row" }, input, go),
          h("p", { class: "small muted" }, T.warn));
        return;
      }
      const status = state === "busy" ? T.busy : cfg.err === "auth" ? T.errAuth : cfg.err ? T.errNet : cfg.at ? T.ok(time(cfg.at)) : T.never;
      box.replaceChildren(head, h("p", { class: "muted" }, T.intro),
        h("p", { class: "sync-status" + (cfg.err ? " bad" : "") }, status),
        h("div", { class: "actions" },
          btn(T.now, () => sync(), "btn ghost"),
          cfg.gist ? h("a", { class: "btn ghost", href: "https://gist.github.com/" + cfg.gist, target: "_blank", rel: "noopener" }, T.gist) : null,
          btn(T.off, () => { if (confirm(T.offAsk)) { disconnect(); toast(T.offDone); paint(); } }, "btn ghost danger")));
    }
    document.addEventListener("dr-sync-state", paint);
    paint();
    return box;
  }

  DR.Sync = { sync, panel, connect, disconnect, merge, get on() { return on(); } };
})();
