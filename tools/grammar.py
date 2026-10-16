#!/usr/bin/env python3
"""Buzz's Sentence Detective helper (grammar.html). Added 17 Oct 2026.

  tools/grammar.py bank [--level N]                         # question bank by level (1 noun/verb/adj/adv, 2 +pronoun/prep/conj, 3 +subject/object) + used dates
  tools/grammar.py add 2026-10-19 --q g19 --q g28 [--q g36] [--level 1] [--optional]   # append gr1, gr2 (gr3), +5 each
  tools/grammar.py add 2026-10-19 --auto 2 --level 1        # let the tool pick 2 unused questions (mixed parts, none used in the last 3 weeks)
  tools/grammar.py codes 2026-10-19
  tools/grammar.py verify "gr1 GT47, gr2 RS12" [--date D]   # today + yesterday
  tools/grammar.py list

--level = the highest level used for the WRONG options shown (start at 1; questions themselves may be <= level).
code = TAG + 2 digits from sha256(f"{key}|{answer}") (answer e.g. "adverb"); secret + expected codes only in
/workspace/alon/challenge-answers.json ("grammar" + answers[date][grN]). Never commit that file.
"""
import argparse, datetime, json, os, random, secrets, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _daily import *

def bank():
    js = f"const G=require({json.dumps(os.path.join(REPO, 'grammar-engine.js'))});console.log(JSON.stringify(G.BANK))"
    return {q["id"]: q for q in node(js)}
def used(): 
    u = {}
    for c in load(CJ)["challenges"]:
        if c.get("type") == "grammar": u.setdefault(c["qid"], c["date"])
    return u
def cmd_bank(a):
    B, U = bank(), used()
    for q in B.values():
        if a.level and q["tier"] > a.level: continue
        print(f"L{q['tier']} {q['id']}  {q['a']:<12} {q['s']}" + (f"  (used {U[q['id']]})" if q["id"] in U else ""))
def cmd_add(a):
    check_date(a.date)
    B, U = bank(), used(); C, A = load(CJ), load(AJ)
    if any(c["date"] == a.date and c.get("type") == "grammar" for c in C["challenges"]) and not a.force:
        sys.exit(f"{a.date} already has grammar cases (use --force to add more)")
    qs = list(a.q or [])
    if a.auto:
        d0 = datetime.date.fromisoformat(a.date)
        fresh = [q for q in B.values() if q["tier"] <= a.level and q["id"] not in qs and
                 (q["id"] not in U or (d0 - datetime.date.fromisoformat(U[q["id"]])).days >= 21)]
        random.shuffle(fresh); seen = {B[x]["a"] for x in qs if x in B}
        for q in sorted(fresh, key=lambda q: (q["a"] in seen, -q["tier"])):   # different parts of speech first, newest level first
            if len(qs) >= a.auto: break
            if q["a"] in seen and len({x["a"] for x in fresh} - seen) > 0: continue
            qs.append(q["id"]); seen.add(q["a"])
    if not 1 <= len(qs) <= 3: sys.exit("give 1-3 questions (--q gNN or --auto N)")
    for x in qs:
        if x not in B: sys.exit(f"{x} is not in the bank")
        if B[x]["tier"] > a.level: sys.exit(f"{x} is level {B[x]['tier']} > --level {a.level}")
    g = A.setdefault("grammar", {})
    if "secret" not in g: g["secret"] = secrets.token_hex(16); print("created private grammar secret")
    ids = {c["id"] for c in C["challenges"] if c["date"] == a.date}; n = 1
    for x in qs:
        while f"gr{n}" in ids: n += 1
        cid = f"gr{n}"; ids.add(cid); q = B[x]; key = sha(f"{g['secret']}|{a.date}|{cid}")[:16]
        e = {"date": a.date, "id": cid, "type": "grammar", "title": "Sentence Detective", "qid": x, "level": a.level,
             "prompt": "What job is the highlighted word doing? Solve it in Buzz's Sentence Detective!", "key": key, "points": a.points}
        if a.optional: e["optional"] = True
        C["challenges"].append(e); cd = code(key, q["a"])
        A["answers"].setdefault(a.date, {})[cid] = {"type": "grammar", "qid": x, "sentence": q["s"], "answer": q["a"], "code": cd, "points": a.points, "hint": q["why"]}
        print(f"added {a.date} {cid}: {x} {q['s']}  -> {q['a']}  code {cid} {cd}" + ("  (optional)" if a.optional else ""))
    dump(AJ, A); dump(CJ, C)
    print("challenges.json + challenge-answers.json updated (commit challenges.json only)")
def expected(date):
    B = bank(); out = {}
    for c in load(CJ)["challenges"]:
        if c["date"] == date and c.get("type") == "grammar" and c["qid"] in B:
            out[c["id"]] = (code(c["key"], B[c["qid"]]["a"]), c["points"], (c, B[c["qid"]]))
    return out
def cmd_codes(a):
    e = expected(a.date)
    if not e: print(f"no grammar cases on {a.date}")
    for cid, (cd, pts, (c, q)) in e.items(): print(f"{a.date} {cid}  {q['s']} -> {q['a']}  code: {cid} {cd}  (+{pts}{' optional' if c.get('optional') else ''})")
def cmd_verify(a): verify(a.text, a.date, "gr", expected, lambda i: f"{i[1]['s']} -> {i[1]['a']}")
def cmd_list(a):
    for c in load(CJ)["challenges"]:
        if c.get("type") == "grammar": print(c["date"], c["id"], c["qid"], "L%d" % c.get("level", 1), "+%d" % c["points"])

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); s = p.add_subparsers(dest="cmd", required=True)
x = s.add_parser("add"); x.add_argument("date"); x.add_argument("--q", action="append"); x.add_argument("--auto", type=int, default=0)
x.add_argument("--level", type=int, default=1, choices=[1, 2, 3]); x.add_argument("--points", type=int, default=5)
x.add_argument("--optional", action="store_true"); x.add_argument("--force", action="store_true"); x.set_defaults(f=cmd_add)
x = s.add_parser("codes"); x.add_argument("date"); x.set_defaults(f=cmd_codes)
x = s.add_parser("verify"); x.add_argument("text"); x.add_argument("--date"); x.set_defaults(f=cmd_verify)
x = s.add_parser("bank"); x.add_argument("--level", type=int, default=0); x.set_defaults(f=cmd_bank)
s.add_parser("list").set_defaults(f=cmd_list)
a = p.parse_args(); a.f(a)
