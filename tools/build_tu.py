#!/usr/bin/env python3
"""Build tu/data/words.json for the topic vocabulary sub-site.

Inputs : data/l1..l7.json (words of Schritte Neu 1), tools/src/a1-part*.tsv (own entries for the Goethe A1 list),
         tools/src/goethe-heads.txt (headwords of the Goethe A1 Wortliste, to tag words as 🎯).
Output : tu/data/words.json  { topics: [...], words: { key: {...} } }
Run    : python3 -I tools/build_tu.py   (from the repo root)
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

TOPICS = [
    ("greet", "👋", "Chào hỏi & giới thiệu", "Chào, cảm ơn, xin lỗi, giới thiệu bản thân"),
    ("fam", "👨‍👩‍👧", "Gia đình & con người", "Gia đình, họ hàng, tình trạng hôn nhân, thông tin cá nhân"),
    ("land", "🌍", "Quốc gia & ngôn ngữ", "Nước, thành phố, tiếng nói, quê hương, phương hướng"),
    ("zahl", "🔢", "Số, tiền & đo lường", "Số đếm, đơn vị, độ, phần trăm"),
    ("zeit", "⏰", "Thời gian", "Giờ, thứ, tháng, mùa, các buổi trong ngày"),
    ("essen", "🍽️", "Ăn uống", "Thực phẩm, đồ uống, gọi món, nhà hàng"),
    ("shop", "🛒", "Mua sắm & quần áo", "Chợ, giá cả, cửa hàng, quần áo, trả tiền"),
    ("wohn", "🏠", "Nhà ở & đồ đạc", "Phòng, đồ đạc, thuê nhà, thiết bị"),
    ("tag", "☀️", "Một ngày của tôi", "Động từ thường ngày, động từ tách"),
    ("frei", "🎾", "Giải trí & sở thích", "Thời gian rảnh, thể thao, tiệc tùng, âm nhạc"),
    ("wetter", "🌤️", "Thời tiết & thiên nhiên", "Thời tiết, núi, biển, cây cối, động vật"),
    ("reise", "✈️", "Đi lại & du lịch", "Tàu xe, sân bay, khách sạn, tham quan"),
    ("dienst", "📮", "Dịch vụ, giấy tờ & liên lạc", "Bưu điện, ngân hàng, điện thoại, biểu mẫu, giấy tờ"),
    ("koerper", "🩺", "Cơ thể & sức khoẻ", "Bộ phận cơ thể, bệnh, bác sĩ"),
    ("lern", "📖", "Học tập", "Lớp học, khoá học, đồ dùng, ngôn ngữ"),
    ("beruf", "💼", "Công việc & nghề nghiệp", "Nghề, nơi làm việc, đồng nghiệp"),
    ("farbe", "🎨", "Tính từ & màu sắc", "Màu, kích cỡ, tính chất, cảm xúc"),
    ("klein", "🧩", "Từ nhỏ hay dùng", "Đại từ, giới từ, trạng từ, động từ khuyết, từ hỏi"),
    ("pruef", "📝", "Từ trong đề thi", "Ankreuzen, Antwortbogen, Aufgabe… những từ gặp trong đề"),
    ("perf", "⏮️", "Động từ ở Perfekt", "Thể quá khứ hoàn thành với haben và sein"),
]
TOPIC_IDS = [t[0] for t in TOPICS]
TOPIC_EN = {'greet': ('Greetings & introductions', 'Hello, thanks, sorry, introducing yourself'), 'fam': ('Family & people', 'Family, relatives, marital status, personal details'), 'land': ('Countries & languages', 'Countries, cities, languages, home, directions'), 'zahl': ('Numbers, money & measures', 'Numbers, units, degrees, per cent'), 'zeit': ('Time', 'Clock times, days, months, seasons, parts of the day'), 'essen': ('Food & drink', 'Food, drinks, ordering, restaurants'), 'shop': ('Shopping & clothes', 'Market, prices, shops, clothes, paying'), 'wohn': ('Home & furniture', 'Rooms, furniture, renting, appliances'), 'tag': ('My day', 'Everyday verbs, separable verbs'), 'frei': ('Free time & hobbies', 'Free time, sport, parties, music'), 'wetter': ('Weather & nature', 'Weather, mountains, sea, plants, animals'), 'reise': ('Transport & travel', 'Trains and buses, airport, hotel, sightseeing'), 'dienst': ('Services, forms & contact', 'Post office, bank, phone, forms, documents'), 'koerper': ('Body & health', 'Parts of the body, illness, the doctor'), 'lern': ('Learning', 'Class, courses, school things, languages'), 'beruf': ('Work & jobs', 'Jobs, workplace, colleagues'), 'farbe': ('Adjectives & colours', 'Colours, sizes, qualities, feelings'), 'klein': ('Little everyday words', 'Pronouns, prepositions, adverbs, modal verbs, question words'), 'pruef': ('Exam words', 'Ankreuzen, Antwortbogen, Aufgabe… words you meet in the exam'), 'perf': ('Verbs in the Perfekt', 'The past tense with haben and sein')}

SETMAP = {
    "l1/a": "greet", "l1/b": "greet", "l1/c": "land", "l1/c2": "land", "l1/d": "dienst", "l1/k": "pruef",
    "l2/a": "greet", "l2/b": "fam", "l2/c": "klein", "l2/n": "zahl", "l2/d": "fam", "l2/e": "land", "l2/e2": "land",
    "l3/a": "essen", "l3/b": "essen", "l3/n": "zahl", "l3/d": "shop", "l3/e": "essen", "l3/e2": "essen",
    "l4/a": "wohn", "l4/b": "farbe", "l4/b2": "wohn", "l4/c": "wohn", "l4/c2": "farbe", "l4/d": "zahl",
    "l4/d2": "wohn", "l4/d3": "wohn", "l4/e": "lern", "l4/e2": "klein",
    "l5/a": "tag", "l5/b": "zeit", "l5/c": "zeit", "l5/c2": "zeit", "l5/d": "zeit", "l5/d2": "frei", "l5/e": "dienst", "l5/e2": "frei",
    "l6/a": "wetter", "l6/b": "wetter", "l6/c": "essen", "l6/d": "klein", "l6/d2": "frei", "l6/e": "frei", "l6/f": "reise", "l6/f2": "beruf",
    "l7/a": "lern", "l7/a2": "frei", "l7/b": "lern", "l7/b2": "lern", "l7/c": "perf", "l7/d": "perf", "l7/e": "perf", "l7/e2": "frei",
    "l7/f": "lern", "l7/f2": "klein",
}


def ov(topic, ids):
    return {i: topic for i in ids.split()}


OVER = {}
for lek, groups in {
    "l1": {
        "klein": "aus was und nur aha von firma ein-bisschen moment nicht",
        "greet": "woher woher-kommen-sie woher-kommst-du ich-komme-aus kommen sprechen was-sprechen-sie ich-spreche wie-bitte bitte ich-buchstabiere vielen-dank tut-mir-leid",
        "dienst": "ist-da auf-wiederhoeren",
    },
    "l2": {
        "lern": "lernen lehrer lehrerin", "klein": "haben mein dein ihr-art liste falsch genau das-sind kennen also",
        "zeit": "pause jahr alter wie-alt wie-alt-sind-sie", "frei": "park",
        "zahl": "zahl nummer telefonnummer", "farbe": "alt", "beruf": "arzt aerztin polizei", "fam": "partner partnerin",
    },
    "l3": {
        "shop": "brauchen kaufen haben-wir haben-sie ich-brauche ja-natuerlich hier-bitte sonst-noch-etwas nein-tut-mir-leid",
        "klein": "ein kein was-ist-das wie-heisst-das das-ist-doch-kein helfen dann fuer einfach gern ganz tag teuer zum-beispiel gross",
        "wohn": "regal", "lern": "studieren",
    },
    "l4": {
        "farbe": "neu klein hell dunkel billig schoen haesslich lang hoch nett",
        "klein": "dort sag-mal wo-ist-denn das-ist-meine er-es-sie beispiel kostet-im-monat mal zu-hause meine-nummer suchen ab sofort maximal privat viel voll platz ziemlich egal lieben immer glauben besonders welch",
        "zeit": "monat", "dienst": "handy anruf", "beruf": "arbeit", "fam": "ehepaar", "zahl": "circa", "shop": "bezahlen",
        "lern": "buch heft stift computer tablet tagebuch hausaufgabe", "wohn": "schreibtisch schreibtischlampe schreibtischstuhl holz tv",
    },
    "l5": {
        "klein": "oder mit passen raten jeder doch ich-glaube moment plan", "frei": "musik hoeren spielen fernsehen party fussball kino chatten sport computerspiel film sehen museum",
        "farbe": "muede", "zeit": "frueh manchmal feiertag taeglich", "shop": "supermarkt kaufhaus", "beruf": "praesentation arbeiten",
        "lern": "deutschkurs intensivkurs", "fam": "mama papa erwachsene", "essen": "mittagessen cafe",
        "reise": "fahrrad schiff tour abfahrt", "land": "europa", "greet": "kennenlernen", "dienst": "geoeffnet",
    },
    "l6": {
        "frei": "ausflug wandern picknick gitarre fotografieren windsurfen segeln programm angebot mountainbike klettern roman krimi klub toll interessant",
        "reise": "auto fahren", "klein": "vergessen bringen heute viele steigen ueberall bleiben total lieblings mitte moeglichkeit plan",
        "dienst": "nachricht radio internet", "zahl": "grad", "land": "himmelsrichtung nord dach", "farbe": "schlecht wunderbar",
        "wetter": "heiss hund berg natur wald alpen insel", "fam": "freund freundin", "zeit": "herbst winter sommer fruehling jahreszeit oft",
        "pruef": "aufgabe", "beruf": "buero kunde kundin", "shop": "einkaufsliste",
    },
    "l7": {
        "zeit": "gestern frueher noch einmal-mal oefter nie ferien meistens",
        "lern": "fernunterricht ueben tipp unterricht stunde vokabel tandem-partner",
        "frei": "hula-hoop reifen schwingen reiten malen backen tennis klavier theater zeitung plakat comic saxofon",
        "klein": "weiter wieder funktionieren aussehen stimmen koennen senkrecht waagerecht kannst-du-gut was-mache-ich-falsch kannst-du-mir-helfen wollen wollen-wir was-willst-du ja-super nein-nicht-so-gern noe stress koenner hast-du-schon-mal ja-schon-einmal ja-schon-oefter nein-noch-nie ich-finde-den-tipp-wichtig nicht-so-wichtig das-habe-ich-schon-gemacht du-kannst",
        "dienst": "schicken sehr-geehrte mit-freundlichen-gruessen liebe-gruesse", "farbe": "kaputt schwer leicht cool", "wohn": "vase",
        "reise": "bus", "fam": "leute", "greet": "schoenen-tag-noch",
    },
}.items():
    for topic, ids in groups.items():
        for i in ids.split():
            OVER[lek + "/" + i] = topic
PERFEKT_EXCEPT = set()  # ids starting with p- in l7 stay in the perf topic via SETMAP


def fold(s):
    return (s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))


def head(de):
    s = re.sub(r"^(?:sich\s+)?(?:(?:der|die|das)\s+)", "", de.strip())
    return fold(re.split(r"[,(/]", s)[0].strip())


def slug(de):
    return re.sub(r"[^a-z0-9]+", "-", fold(de)).strip("-")


goethe = set(open("tools/src/goethe-heads.txt").read().split("\n")) - {""}
goethe_heads = {fold(h) for h in goethe}
goethe_tokens = set()
for h in goethe_heads:
    goethe_tokens.add(h)


def is_goethe(w):
    d = head(w["de"])
    if d in goethe_heads:
        return True
    toks = [t for t in re.split(r"[\s/]+", d) if t]
    return len(toks) == 1 and toks[0] in goethe_heads


words, order = {}, {t: [] for t in TOPIC_IDS}
seen = {}


def add(key, w, topic):
    k = head(w["de"]) + "|" + w["kind"] if w["kind"] != "phrase" else fold(w["de"])
    if k in seen:
        return False
    seen[k] = key
    if topic not in order:
        sys.exit("bad topic " + topic + " for " + key)
    words[key] = w
    order[topic].append(key)
    return True


# 1) words from the Schritte lessons
for f in sorted(glob.glob("data/l[0-9].json")):
    L = json.load(open(f))
    lid = L["id"]
    for s in L["sets"]:
        base = SETMAP[lid + "/" + s["id"]]
        for it in s["items"]:
            topic = OVER.get(lid + "/" + it["id"], base)
            if it["id"].startswith("p-"):
                topic = "perf"
            w = {k: it[k] for k in ("de", "art", "pl", "kind", "vi", "emoji", "syl", "note", "ex", "forms", "en", "plOnly", "aus", "say", "ans") if k in it}
            w["src"] = "Schritte L%d" % L["no"]
            if is_goethe(w):
                w["g"] = 1
            add(lid + "/" + it["id"], w, topic)

# 2) own entries for the Goethe A1 list
nnew = 0
KINDS = {"noun", "verb", "word", "phrase"}
for f in sorted(glob.glob("tools/src/a1-part*.tsv")):
    for ln, line in enumerate(open(f), 1):
        line = line.rstrip("\n")
        if not line.strip():
            continue
        p = line.split("|")
        topic, de = p[0].strip(), p[1].strip()
        ki = next((i for i in range(2, len(p)) if p[i].strip() in KINDS), None)
        if ki is None:
            sys.exit("%s:%d no kind" % (f, ln))
        art = p[2].strip() if ki > 2 else ""
        pl = p[3].strip() if ki > 3 else ""
        kind = p[ki].strip()
        rest = (p[ki + 1:] + [""] * 6)[:6]
        vi, exde, exvi, forms, emoji = [x.strip() for x in rest[:5]]
        w = {"de": de, "kind": kind, "vi": vi, "src": "Goethe A1", "g": 1}
        if kind == "noun":
            if de in ("Papiere", "Pommes frites"):
                art, w["plOnly"] = "die", True
            if not art:
                sys.exit("%s:%d noun without article: %s" % (f, ln, de))
            w["art"] = art
            if pl:
                w["pl"] = pl
        if kind == "verb" and forms:
            w["forms"] = forms
        if emoji:
            w["emoji"] = emoji
        if exde:
            w["ex"] = [exde, exvi]
        if add("a1/" + slug(de), w, topic):
            nnew += 1

# 2b) English: tools/src/en/*.tsv  key|meaning|example translation|note  (overrides the old short "en" hints)
for f in sorted(glob.glob("tools/src/en/*.tsv")):
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line:
            continue
        k, me, exen, noteen = line.split("|")
        if k not in words:
            sys.exit("en: unknown key " + k)
        w = words[k]
        w["en"] = me
        if w.get("ex") and exen:
            w["ex"] = w["ex"][:2] + [exen]
        if noteen:
            w["noteEn"] = noteen
missing = [k for k, w in words.items() if not w.get("en") or (w.get("ex") and len(w["ex"]) < 3)]
if missing:
    sys.exit("en: missing English for %d words, e.g. %s" % (len(missing), missing[:5]))

# keep verbs together, then words, nouns, phrases in the catch-all topic
RANK = {"verb": 0, "word": 1, "noun": 2, "phrase": 3}
order["klein"].sort(key=lambda k: RANK.get(words[k]["kind"], 4))

# 3) lessons: chunks of ~8–10 words, nouns/verbs/phrases keep source order
SIZE = 9
topics = []
for tid, emoji, title, desc in TOPICS:
    keys = order[tid]
    n = len(keys)
    if not n:
        continue
    parts = max(1, round(n / SIZE))
    base, extra = divmod(n, parts)
    lessons, i = [], 0
    for j in range(parts):
        m = base + (1 if j < extra else 0)
        lessons.append({"id": "%s-%d" % (tid, j + 1), "n": j + 1, "words": keys[i:i + m]})
        i += m
    topics.append({"id": tid, "emoji": emoji, "title": title, "desc": desc, "titleEn": TOPIC_EN[tid][0], "descEn": TOPIC_EN[tid][1], "count": n, "lessons": lessons})

os.makedirs("tu/data", exist_ok=True)
with open("tu/data/words.json", "w", encoding="utf-8") as fh:
    json.dump({"topics": topics, "words": words}, fh, ensure_ascii=False, separators=(",", ":"))
print("words", len(words), "(new from Goethe:", nnew, ") tagged Goethe:", sum(1 for w in words.values() if w.get("g")))
for t in topics:
    print("  %-7s %4d words  %2d lessons  %s" % (t["id"], t["count"], len(t["lessons"]), t["title"]))
print("bytes", os.path.getsize("tu/data/words.json"))
