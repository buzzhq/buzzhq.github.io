#!/usr/bin/env python3
"""Buzz's Hebrew SENTENCES helper (sentence mode of hebrew.html). Added 17 Oct 2026.

  tools/hebsentence.py bank                                     # sentence bank: OK / NEW1 (one new letter vs hebrew_tracker.done) / LATER, + used dates
  tools/hebsentence.py add 2026-10-19 --sentence "זה דג גדול" [--optional] [--points 15]   # append hs1 for that day
  tools/hebsentence.py codes 2026-10-19                          # expected finish codes, e.g. "hs1 GT47"
  tools/hebsentence.py verify "hs1 GT47" [--date D]              # check codes Alon sent (today + yesterday)
  tools/hebsentence.py list

- Sentences must be in SENTENCES in hebrew-engine.js (checked by tests/hebsentence.test.js). Max ONE new letter.
- code = TAG + 2 digits from sha256(f"{key}|{transliteration}") e.g. "ha-dov ohev dvash"; secret + expected codes only in
  /workspace/alon/challenge-answers.json ("hebsentence" + answers[date][hsN]). Never commit that file.
"""
import argparse, datetime, json, os, secrets, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _daily import *

def bank():
    js = f"const H=require({json.dumps(os.path.join(REPO, 'hebrew-engine.js'))});console.log(JSON.stringify(H.SENTENCES.map(x=>({{id:x.id,text:x.text,tr:x.tr,en:x.en,emoji:x.emoji,newLetter:x.newLetter,steps:H.buildSentence(x.text).steps.length}}))))"
    return {x["text"]: x for x in node(js)}
def learned(): return load(AJ).get("hebrew_tracker", {}).get("done", [])
def used(): return {c["sentence"]: c["date"] for c in load(CJ)["challenges"] if c.get("type") == "hebsentence"}
def new_letters(text, K): return [c for c in dict.fromkeys(text.replace(" ", "")) if c not in K]

def cmd_bank(a):
    B, K, U = bank(), set(learned()), used()
    print("learned:", " ".join(sorted(K)))
    for t, x in B.items():
        n = new_letters(t, K); tag = "OK  " if not n else ("NEW1" if len(n) == 1 else "LATER")
        print(f"{tag} {x['id']} {t:>16}  {x['tr']:<24} {x['emoji']} {x['en']:<30}" + (f" new letter {n[0]}" if len(n) == 1 else "") + (f"  (used {U[t]})" if t in U else ""))

def cmd_add(a):
    check_date(a.date)
    B, K, U = bank(), set(learned()), used()
    C, A = load(CJ), load(AJ)
    if any(c["date"] == a.date and c.get("type") == "hebsentence" for c in C["challenges"]) and not a.force:
        sys.exit(f"{a.date} already has a Hebrew sentence (use --force to add another)")
    t = " ".join(a.sentence.split())
    if t not in B: sys.exit(f"{t} is not in the sentence bank (add it to SENTENCES in hebrew-engine.js + run node tests/hebsentence.test.js)")
    n = new_letters(t, K)
    if len(n) > 1: sys.exit(f"{t} has {len(n)} new letters {n}: max 1")
    if t in U and not a.force:
        if (datetime.date.fromisoformat(a.date) - datetime.date.fromisoformat(U[t])).days < 14: sys.exit(f"{t} was used on {U[t]} (less than 2 weeks ago; --force to repeat)")
    hs = A.setdefault("hebsentence", {})
    if "secret" not in hs: hs["secret"] = secrets.token_hex(16); print("created private hebsentence secret")
    ids = {c["id"] for c in C["challenges"] if c["date"] == a.date}; k = 1
    while f"hs{k}" in ids: k += 1
    cid = f"hs{k}"; x = B[t]; key = sha(f"{hs['secret']}|{a.date}|{cid}")[:16]
    e = {"date": a.date, "id": cid, "type": "hebsentence", "title": "Hebrew sentence rally", "sentence": t,
         "prompt": "Read this Hebrew sentence word by word, letter by letter (right to left!), then work out what it means.", "key": key, "points": a.points}
    if a.optional: e["optional"] = True
    C["challenges"].append(e)
    cd = code(key, x["tr"])
    A["answers"].setdefault(a.date, {})[cid] = {"type": "hebsentence", "sentence": t, "answer": x["tr"], "meaning": x["en"], "code": cd,
        "new_letter": n[0] if n else None, "points": a.points, "hint": f"{t} = {x['tr']} = {x['en']} {x['emoji']}"}
    dump(AJ, A); dump(CJ, C)
    print(f"added {a.date} {cid}: {t} = {x['tr']} = {x['en']} {x['emoji']}  ({x['steps']} steps)  code {cid} {cd}" +
          (f"  NEW LETTER {n[0]}: after he finishes, add it to hebrew_tracker.done" if n else "") + ("  (optional)" if a.optional else ""))
    print("challenges.json + challenge-answers.json updated (commit challenges.json only)")

def expected(date):
    B = bank(); out = {}
    for c in load(CJ)["challenges"]:
        if c["date"] == date and c.get("type") == "hebsentence" and c["sentence"] in B:
            x = B[c["sentence"]]; out[c["id"]] = (code(c["key"], x["tr"]), c["points"], (c, x))
    return out
def cmd_codes(a):
    e = expected(a.date)
    if not e: print(f"no Hebrew sentences on {a.date}")
    for cid, (cd, pts, (c, x)) in e.items(): print(f"{a.date} {cid}  {c['sentence']} = {x['tr']} = {x['en']}  code: {cid} {cd}  (+{pts}{' optional' if c.get('optional') else ''})")
def cmd_verify(a): verify(a.text, a.date, "hs", expected, lambda i: f"{i[0]['sentence']} ({i[1]['tr']} = {i[1]['en']})")
def cmd_list(a):
    for c in load(CJ)["challenges"]:
        if c.get("type") == "hebsentence": print(c["date"], c["id"], c["sentence"], "+%d" % c["points"], "optional" if c.get("optional") else "")

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); s = p.add_subparsers(dest="cmd", required=True)
x = s.add_parser("add"); x.add_argument("date"); x.add_argument("--sentence", required=True); x.add_argument("--points", type=int, default=15)
x.add_argument("--optional", action="store_true"); x.add_argument("--force", action="store_true"); x.set_defaults(f=cmd_add)
x = s.add_parser("codes"); x.add_argument("date"); x.set_defaults(f=cmd_codes)
x = s.add_parser("verify"); x.add_argument("text"); x.add_argument("--date"); x.set_defaults(f=cmd_verify)
s.add_parser("list").set_defaults(f=cmd_list); s.add_parser("bank").set_defaults(f=cmd_bank)
a = p.parse_args(); a.f(a)
