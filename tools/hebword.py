#!/usr/bin/env python3
"""Buzz's Hebrew Word Rally helper (hebrew.html). Added 4 Oct 2026.

  tools/hebword.py bank                                   # word bank, marked by letters Alon knows (hebrew_tracker.done)
  tools/hebword.py add 2026-10-06 --word דגל [--word זהב] [--optional]   # append hb1 (hb2) for that day
  tools/hebword.py codes 2026-10-06                        # expected finish codes, e.g. "hb1 GT47"
  tools/hebword.py verify "hb1 GT47, hb2 RX12" [--date D]  # check codes Alon sent (today + yesterday by default)
  tools/hebword.py list

- Words must be in the bank in hebrew-engine.js (spelling, sounds and meanings are checked there + tests/hebrew.test.js).
  To add a new word: add it to WORDS in hebrew-engine.js and run `node tests/hebrew.test.js`.
- Allowed: all letters already learned, or at most ONE new letter (the game introduces it).
- code = TAG + 2 digits from sha256(f"{key}|{transliteration}"), key = sha256(f"{secret}|{date}|{id}")[:16];
  secret + expected codes live only in /workspace/alon/challenge-answers.json ("hebword" + answers[date][hbN]).
"""
import argparse, datetime, hashlib, json, os, re, secrets, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
CJ = os.path.join(REPO, "challenges.json"); AJ = os.path.join(os.path.dirname(REPO), "challenge-answers.json")
TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"]
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def code(key, ans): h = sha(f"{key}|{ans}"); return TAGS[int(h[0:2], 16) % 16] + str(int(h[2:6], 16) % 90 + 10)
def load(p): return json.load(open(p, encoding="utf-8"))
def dump(p, d):
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")
def today(): return subprocess.run(["date", "+%F"], capture_output=True, text=True, env={**os.environ, "TZ": "Australia/Sydney"}).stdout.strip()
def bank():
    js = f"const H=require({json.dumps(os.path.join(REPO, 'hebrew-engine.js'))});console.log(JSON.stringify(H.WORDS.map(x=>({{w:x.w,tr:x.tr,en:x.en,emoji:x.emoji,newLetter:x.newLetter,steps:H.buildWord(x.w).steps.length}}))))"
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
    if out.returncode: sys.exit("engine error: " + out.stderr)
    return {x["w"]: x for x in json.loads(out.stdout)}
def learned(): return load(AJ).get("hebrew_tracker", {}).get("done", [])
def used_words():
    return {c["word"]: c["date"] for c in load(CJ)["challenges"] if c.get("type") == "hebword"}

def cmd_bank(a):
    B, K, U = bank(), set(learned()), used_words()
    print("learned:", " ".join(sorted(K)))
    for w, x in B.items():
        new = [c for c in dict.fromkeys(w) if c not in K]
        tag = "OK  " if not new else ("NEW1" if len(new) == 1 else "LATER")
        print(f"{tag} {w:>5}  {x['tr']:<8} {x['emoji']} {x['en']:<14}" + (f" new letter {new[0]}" if len(new) == 1 else "") + (f"  (used {U[w]})" if w in U else ""))

def cmd_add(a):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.date): sys.exit("date must be YYYY-MM-DD")
    B, K, U = bank(), set(learned()), used_words()
    C, A = load(CJ), load(AJ)
    if any(c["date"] == a.date and c.get("type") == "hebword" for c in C["challenges"]) and not a.force:
        sys.exit(f"{a.date} already has Hebrew words (use --force to add more)")
    hw = A.setdefault("hebword", {})
    if "secret" not in hw: hw["secret"] = secrets.token_hex(16); print("created private hebword secret")
    ids = {c["id"] for c in C["challenges"] if c["date"] == a.date}
    n = 1
    for w in a.word:
        w = w.strip()
        if w not in B: sys.exit(f"{w} is not in the word bank (add it to hebrew-engine.js WORDS + run tests first)")
        new = [c for c in dict.fromkeys(w) if c not in K]
        if len(new) > 1: sys.exit(f"{w} has {len(new)} new letters {new}: max 1")
        if w in U and not a.force: sys.exit(f"{w} was already used on {U[w]} (use --force to repeat)")
        while f"hb{n}" in ids: n += 1
        cid = f"hb{n}"; ids.add(cid)
        x = B[w]; key = sha(f"{hw['secret']}|{a.date}|{cid}")[:16]
        e = {"date": a.date, "id": cid, "type": "hebword", "title": "Hebrew word rally", "word": w,
             "prompt": "Sound out this Hebrew word letter by letter (right to left!), then find out what it means.", "key": key, "points": a.points}
        if a.optional: e["optional"] = True
        C["challenges"].append(e)
        A["answers"].setdefault(a.date, {})[cid] = {"type": "hebword", "word": w, "answer": x["tr"], "meaning": x["en"], "code": code(key, x["tr"]),
                                                    "new_letter": new[0] if new else None, "points": a.points, "hint": f"{w} = {x['tr']} = {x['en']} {x['emoji']}"}
        print(f"added {a.date} {cid}: {w} = {x['tr']} = {x['en']} {x['emoji']}  ({x['steps']} steps)  code {cid} {code(key, x['tr'])}" +
              (f"  NEW LETTER {new[0]}: after he finishes, add it to hebrew_tracker.done" if new else "") + ("  (optional)" if a.optional else ""))
    dump(AJ, A); dump(CJ, C)
    print("challenges.json + challenge-answers.json updated (commit challenges.json only)")

def expected(date):
    B = bank(); out = {}
    for c in load(CJ)["challenges"]:
        if c["date"] == date and c.get("type") == "hebword":
            out[c["id"]] = (code(c["key"], B[c["word"]]["tr"]), c, B[c["word"]])
    return out
def cmd_codes(a):
    e = expected(a.date)
    if not e: print(f"no Hebrew words on {a.date}")
    for cid, (cd, c, x) in e.items(): print(f"{a.date} {cid}  {c['word']} = {x['tr']} = {x['en']}  code: {cid} {cd}  (+{c['points']}{' optional' if c.get('optional') else ''})")
def cmd_verify(a):
    t = a.date or today()
    dates = [a.date] if a.date else [t, (datetime.date.fromisoformat(t) - datetime.timedelta(days=1)).isoformat()]
    found = re.findall(r"\b(hb\s*\d+)\s*[:=-]?\s*([a-z]{2}\s*\d{2})\b", a.text, re.I)
    if not found: sys.exit("no hb codes found (expected e.g. 'hb1 GT47')")
    total = 0
    for cid, cd in found:
        cid = re.sub(r"\s+", "", cid).lower(); cd = re.sub(r"\s+", "", cd).upper(); hit = None
        for d in dates:
            e = expected(d)
            if cid in e and e[cid][0] == cd: hit = (d, e[cid]); break
        if hit: total += hit[1][1]["points"]; print(f"OK    {cid} {cd}  = {hit[0]} {hit[1][1]['word']} ({hit[1][2]['tr']}, {hit[1][2]['en']})  +{hit[1][1]['points']}")
        else: print(f"WRONG {cid} {cd}  (not a valid code for {', '.join(dates)})")
    print(f"total +{total}")
def cmd_list(a):
    for c in load(CJ)["challenges"]:
        if c.get("type") == "hebword": print(c["date"], c["id"], c["word"], "+%d" % c["points"], "optional" if c.get("optional") else "")

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); s = p.add_subparsers(dest="cmd", required=True)
x = s.add_parser("add"); x.add_argument("date"); x.add_argument("--word", action="append", required=True); x.add_argument("--points", type=int, default=10)
x.add_argument("--optional", action="store_true"); x.add_argument("--force", action="store_true"); x.set_defaults(f=cmd_add)
x = s.add_parser("codes"); x.add_argument("date"); x.set_defaults(f=cmd_codes)
x = s.add_parser("verify"); x.add_argument("text"); x.add_argument("--date"); x.set_defaults(f=cmd_verify)
s.add_parser("list").set_defaults(f=cmd_list); s.add_parser("bank").set_defaults(f=cmd_bank)
a = p.parse_args(); a.f(a)
