#!/usr/bin/env node
/* Checks the lesson data before publishing:  node tools/check.mjs
   Prints every problem found and exits with 1 if there is any. */
import { readFileSync } from "node:fs";

const KNOWN = new Set(["text", "tip", "table", "words", "listenPick", "rules", "hearPick", "book", "dialog", "conj", "gaps", "choice",
  "sort", "order", "fix", "timeGreet", "alphabet", "letterPick", "spell", "spellMe", "form", "profile", "test", "review", "cando",
  "checklist", "done", "numbers", "numHear", "numWrite", "tree", "priceHear", "priceWrite"]);
const fold = (s) => String(s).toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/-/g, "").replace(/[.,!?;:„“”"()…–—]/g, " ").replace(/\s+/g, " ").trim();
const problems = [];
const bad = (where, msg) => problems.push(where + ": " + msg);
const trackRef = /^(KB\s*\d\s*\/\s*\d+(\s*-\s*\d+)?|AB\s*\d+(\s*-\s*\d+)?)(\s*,\s*(KB\s*\d\s*\/\s*\d+(\s*-\s*\d+)?|AB\s*\d+(\s*-\s*\d+)?))*$/i;

const course = JSON.parse(readFileSync("data/course.json", "utf8"));
for (const meta of course.lektionen.filter((l) => l.ready)) {
  const L = JSON.parse(readFileSync(meta.file, "utf8"));
  const ids = new Set();
  const sets = new Map(L.sets.map((s) => [s.id, s]));
  L.setIndexCheck = Object.fromEntries(L.sets.map((s) => [s.id, s.items.filter((w) => w.emoji).length]));
  for (const s of L.sets) for (const w of s.items) {
    const at = `${L.id}/${s.id}/${w.id}`;
    if (ids.has(w.id)) bad(at, "id lặp lại");
    ids.add(w.id);
    if (!w.de || !w.vi || !w.kind) bad(at, "thiếu de, vi hoặc kind");
    if (w.kind === "noun" && !["der", "die", "das"].includes(w.art)) bad(at, "danh từ thiếu der/die/das");
    if (w.art && !["der", "die", "das"].includes(w.art)) bad(at, "art lạ: " + w.art);
    if (w.ex && (!Array.isArray(w.ex) || w.ex.length !== 2)) bad(at, "ex phải là [tiếng Đức, tiếng Việt]");
  }
  for (const S of L.sessions) {
    if (S.set && !sets.has(S.set)) bad(`${L.id}/${S.id}`, "không có bộ từ " + S.set);
    for (const sec of S.sections) sec.blocks.forEach((b, bi) => {
      const at = `${L.id}/buổi ${S.id}/${sec.id}/#${bi + 1} ${b.type}`;
      if (!KNOWN.has(b.type)) return bad(at, "dạng bài không có trong blocks.js");
      if ((b.type === "words" || b.type === "listenPick") && !sets.has(b.set)) bad(at, "không có bộ từ " + b.set);
      if (b.tracks && !trackRef.test(b.tracks)) bad(at, "tracks viết sai: " + b.tracks);
      if (b.type === "choice") b.items.forEach((it, i) => {
        if (!(it.a >= 0 && it.a < it.opts.length)) bad(at, `câu ${i + 1}: a ngoài khoảng`);
        if (new Set(it.opts).size !== it.opts.length) bad(at, `câu ${i + 1}: lựa chọn bị trùng`);
      });
      if (b.type === "gaps") b.items.forEach((it, i) => {
        const n = it.q.split("___").length - 1;
        if (n < 1) return bad(at, `câu ${i + 1}: không có ___`);
        const answers = n > 1 ? it.a : [it.a];
        if (!Array.isArray(answers) || answers.length !== n || !answers.every((x) => Array.isArray(x) && x.length)) bad(at, `câu ${i + 1}: a không khớp số chỗ trống`);
        const choices = it.opts ? (n > 1 ? it.opts : [it.opts]) : b.bank ? answers.map(() => b.bank) : null;
        if (choices) answers.forEach((a, k) => { if (!a.some((x) => choices[k] && choices[k].includes(x))) bad(at, `câu ${i + 1}: đáp án không có trong danh sách chọn`); });
      });
      if (b.type === "sort") b.items.forEach((it, i) => { if (!(it.c >= 0 && it.c < b.cats.length)) bad(at, `thẻ ${i + 1}: c ngoài khoảng`); });
      if (b.type === "order") b.items.forEach((it, i) => {
        if (it.chunks.length < 2) bad(at, `câu ${i + 1}: cần ít nhất 2 cụm`);
        if (it.v != null && !(it.v >= 0 && it.v < it.chunks.length)) bad(at, `câu ${i + 1}: v ngoài khoảng`);
      });
      if (b.type === "fix") b.items.forEach((it, i) => {
        if (it.err == null) return;
        const words = it.s.split(" ").map(fold), err = it.err.split(" ").map(fold);
        const found = words.some((w, k) => err.every((e, m) => words[k + m] === e));
        if (!found) bad(at, `câu ${i + 1}: chữ sai „${it.err}“ không có trong câu`);
        if (!Array.isArray(it.fix) || !it.fix.length) bad(at, `câu ${i + 1}: thiếu fix`);
      });
      if (b.type === "hearPick") b.items.forEach((it, i) => {
        if (fold(it.opts[it.a || 0]) !== fold(it.say)) bad(at, `câu ${i + 1}: đáp án đúng khác với từ được đọc`);
      });
      if (b.type === "test") b.items.forEach((it, i) => {
        if (!["mc", "type", "listen", "listenmc"].includes(it.k)) bad(at, `câu ${i + 1}: k lạ`);
        if ((it.k === "mc" || it.k === "listenmc") && !(it.a >= 0 && it.a < it.opts.length)) bad(at, `câu ${i + 1}: a ngoài khoảng`);
        if ((it.k === "type" || it.k === "listen") && !(Array.isArray(it.a) && it.a.length)) bad(at, `câu ${i + 1}: thiếu đáp án`);
        if (it.k.startsWith("listen") && !it.say) bad(at, `câu ${i + 1}: thiếu say`);
      });
      if (b.type === "tree") b.rows.forEach((r, i) => r.people.forEach((p, j) => {
        if (!p.rel || !p.name) bad(at, `hàng ${i + 1}, người ${j + 1}: thiếu rel hoặc name`);
        if (p.art && !["der", "die", "das"].includes(p.art)) bad(at, `hàng ${i + 1}, người ${j + 1}: art lạ`);
      }));
      if ((b.type === "numHear" || b.type === "numWrite") && b.min != null && b.max != null && b.min >= b.max) bad(at, "min phải nhỏ hơn max");
      if ((b.type === "numHear" || b.type === "numWrite") && b.pool && (!Array.isArray(b.pool) || b.pool.length < 4)) bad(at, "pool cần ít nhất 4 số");
      if (b.type === "numbers" && b.values && (!Array.isArray(b.values) || !b.values.length)) bad(at, "values rỗng");
      if (b.type === "listenPick" && b.by === "emoji" && L.setIndexCheck[b.set] < 4) bad(at, "bộ từ " + b.set + " có ít hơn 4 từ có emoji");
      if (b.type === "numHear" && b.mode && !["single", "phone"].includes(b.mode)) bad(at, "mode lạ: " + b.mode);
      if (b.type === "numWrite" && b.mode && b.mode !== "read") bad(at, "mode lạ: " + b.mode);
      if (b.type === "dialog") b.lines.forEach((ln, i) => { if (!ln.scene && (!ln.de || !ln.vi || !ln.who)) bad(at, `dòng ${i + 1}: thiếu who, de hoặc vi`); });
      if (b.type === "conj") b.verbs.forEach((v) => { if (v.forms.length !== b.persons.length) bad(at, v.inf + ": số dạng chia khác số ngôi"); });
      if (b.type === "form") b.cards.forEach((c, i) => c.fields.forEach((f) => { if (!Array.isArray(f) || !Array.isArray(f[1]) || !f[1].length) bad(at, `danh thiếp ${i + 1}: field sai`); }));
    });
  }
  console.log(`${L.id}: ${L.sets.reduce((n, s) => n + s.items.length, 0)} từ, ${L.sessions.length} buổi`);
}
if (problems.length) {
  console.log(problems.length + " lỗi:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("ALL OK");
