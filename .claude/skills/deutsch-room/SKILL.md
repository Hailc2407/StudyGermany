---
name: deutsch-room
description: Plan, build, test and publish lessons for the Deutsch Room German self-study site (repo Hailc2407/StudyGermany, https://hailc2407.github.io/StudyGermany/), which follows Schritte international Neu 1 (A1.1). Use when the owner asks for the next Lektion or buổi, or to change a lesson, a block type or the app.
---

# Deutsch Room lessons

The owner is Vietnamese, a beginner in German, self-studying with *Schritte international Neu 1*
(no class, no teacher), and strong in English. Reply in Vietnamese. The site teaches in Vietnamese and uses
English only as a bridge (≈ cognates, ⚠ traps such as wer = who).

## Rules that keep the site right

- **Original content only.** Follow the book's Lektion order, topics, grammar and vocabulary, but write the
  explanations, example sentences, dialogues and exercises yourself. Never copy book pages, exercise texts,
  dialogue transcripts or answer keys onto the site, and never commit the book's audio: the site is public.
  Point to the book instead (`book` block: page, track, what to do, where the answer key is in the
  Unterrichtsplan).
- Every noun has `art` (der/die/das) and `pl`; every verb has `forms`; add `syl` (stressed syllable in
  CAPITALS) for words of two or more syllables; give an own example `ex: [de, vi]` where it helps.
- Sessions are ~45–55 minutes: words → pronunciation → book task → grammar + exercises → dialogue →
  review/can-do/homework/done. A Lektion is 3–6 sessions; the last one ends with a `test`.
- Check the German carefully (gender, plural, verb forms, word order). Prefer a smaller lesson to a wrong one.

## Where things are

- Materials (owner's Mac): `~/Downloads/Schritte Internation Neu A1.1/` — `Schritte International neu 1.pdf`
  (scanned, no text layer; Kursbuch page N = PDF page N + 2; Arbeitsbuch page N = PDF page N + 88;
  Lernwortschatz from PDF page 174), `Schritte International neu 1_Unterichtsplan/` (teacher's plans with a
  text layer: section goals, track numbers, answers; Kopiervorlagen with Lektionstest + Lösungen), and the
  mp3 folders (Kursbuch 146 tracks: CD 1 = L1–L4, CD 2 = L5–L7; Arbeitsbuch 81 tracks).
- Data: `data/course.json` (set `ready: true` and `file` for a new Lektion) and `data/lN.json`
  (`sets[]` of words, `sessions[] → sections[] → blocks[]`). Block types and their fields are documented
  at the top of each renderer in `js/blocks.js`; `tools/check.mjs` lists them and checks the data.
- Track references: `"KB 1/9-10"` (Kursbuch CD 1, tracks 9–10), `"AB 6-12"` (Arbeitsbuch tracks).

## Flow: "làm Lektion N" / "làm buổi tiếp theo"

1. Read the Lektion in the Unterrichtsplan (`python3` + PyMuPDF `fitz`, text) and look at the Kursbuch,
   Arbeitsbuch and Lernwortschatz pages as images (render with `fitz` into the scratchpad and read them).
2. Plan the sessions briefly in the reply (sections, minutes), then build without waiting.
3. Write `data/lN.json`, set the Lektion `ready` in `data/course.json`, run `node tools/check.mjs` (ALL OK).
4. Run `node tools/check.mjs` (must print ALL OK). The owner does not want a browser test pass before pushing
   ("không cần test trước khi push"), so skip it unless the owner asks or JS/CSS changed; if JS must change, keep the
   edit small and syntax-check it. Optional: `python3 -m http.server 8790` and open the new sessions yourself.
5. If `app.css` or `js/*.js` changed, bump `?v=` in `index.html`.
6. Commit on a branch or `main` as the owner asks, push, and report what was added and what was (and was not) checked.
