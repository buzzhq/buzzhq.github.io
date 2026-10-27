#!/usr/bin/env python3
"""Buzz's Times-Tables warm-up helper (tt1, tables.html + step 1 of challenges.html). Added 27 Oct 2026.

Usage (run from anywhere):
  tools/timestables.py next                                   # which tables the progression says comes next
  tools/timestables.py add 2026-10-28                          # append tt1 for that day, tables picked by the progression
  tools/timestables.py add 2026-10-28 --tables 3,4             # ...or choose them (1-2 tables, or "mixed")
  tools/timestables.py add 2026-10-27 --tables 2 --optional    # a bonus round (not counted in the day's total)
  tools/timestables.py codes 2026-10-28                        # expected finish code(s) + the 8 questions
  tools/timestables.py verify "tt1 GT47" [--date 2026-10-28]   # check codes Alon sent (today + yesterday by default)
  tools/timestables.py list                                    # all rounds so far + which were finished

- Each round = 8 quick questions (6 on the focus tables, up to 2 review facts from earlier tables), every one with a
  picture (equal groups / an array of emoji) and 3 tap options. Rounds are built by timestables-engine.js from the
  day's key, so this tool, the node tests and the page all get the same questions.
- Progression (same list as STAGES in timestables-engine.js): 2, 5, 10, then 3, 4, (3+4), then 6, 7, (6+7), 8, 9, (8+9),
  then mixed. `add` without --tables moves one stage past the latest round that Alon FINISHED (a verified tt code),
  so a round he skipped is simply repeated. Never goes past "mixed".
- challenges.json gets {type:"timestables", id:"tt1", tables:[2], n:8, key, points:10} (append-only).
- Private: secret, answers, codes and the progression tracker live in /workspace/alon/challenge-answers.json
  (key "timestables" + answers[date][id]); NEVER commit that file. `verify` marks verified rounds as finished there.
- code = TAG + 2 digits from sha256(f"{key}|{answer}"), key = sha256(f"{secret}|{date}|{id}")[:16],
  answer = the 8 products joined by "-" (e.g. "10-4-20-8-14-12-16-6"). Same scheme as mg/hb/hs/gr.
"""
import argparse, json, os, secrets, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _daily import REPO, CJ, AJ, sha, code, load, dump, today, node, check_date, verify

ENGINE = os.path.join(REPO, "timestables-engine.js")
STAGES = node(f"console.log(JSON.stringify(require({json.dumps(ENGINE)}).STAGES))")
N = 8

def parse_tables(s):
    if s.strip().lower() == "mixed": return ["mixed"]
    try: t = sorted({int(x) for x in s.replace("x", "").split(",") if x.strip()})
    except ValueError: sys.exit(f"can't read --tables {s!r}: use 2 or 3,4 or mixed")
    if not 1 <= len(t) <= 2 or any(not 2 <= x <= 10 for x in t): sys.exit("--tables: 1 or 2 tables from 2-10 (or 'mixed')")
    return t

def stage_of(tables):
    for i, s in enumerate(STAGES):
        if sorted(map(str, s)) == sorted(map(str, tables)): return i
    # an off-list combo: the stage of its hardest table
    idx = [i for i, s in enumerate(STAGES) for t in tables if t in s]
    return max(idx) if idx else 0

def build(tables, key, n=N):
    js = (f"const T=require({json.dumps(ENGINE)});const r=T.buildRound({json.dumps(tables)},{json.dumps(key)},{n});"
          "if(!r.questions.every(q=>q.opts.length===3&&q.opts.filter(o=>o.ok).length===1&&new Set(q.opts.map(o=>o.value)).size===3))throw new Error('bad options');"
          "console.log(JSON.stringify({answer:r.answer,qs:r.questions.map(q=>q.a+'×'+q.b+'='+q.answer),review:r.review}))")
    return node(js)

def tracker(A):
    t = A.setdefault("timestables", {})
    if "secret" not in t: t["secret"] = secrets.token_hex(16); print("created private timestables secret")
    t.setdefault("_note", "progression tracker for tools/timestables.py: rounds[date] = {tables, stage, finished}. "
                 "Stages: " + ", ".join("+".join(map(str, s)) for s in STAGES))
    t.setdefault("rounds", {})
    return t

def suggest(t):
    done = sorted(d for d, r in t["rounds"].items() if r.get("finished"))
    if not done: return list(STAGES[0]), "nothing finished yet: start at the first stage"
    last = t["rounds"][done[-1]]; i = min(stage_of(last["tables"]) + 1, len(STAGES) - 1)
    return list(STAGES[i]), f"last finished round {done[-1]} ({'+'.join(map(str, last['tables']))}) → next stage"

def label(tables): return "mixed tables (2-10)" if "mixed" in tables else " + ".join(f"{x}×" for x in tables) + " table" + ("s" if len(tables) > 1 else "")

def cmd_next(args):
    A = load(AJ); t = A.get("timestables", {"rounds": {}}); t.setdefault("rounds", {})
    tables, why = suggest(t); print(f"next: {label(tables)}  ({why})")

def cmd_add(args):
    check_date(args.date)
    C, A = load(CJ), load(AJ); t = tracker(A)
    existing = [c for c in C["challenges"] if c["date"] == args.date and c.get("type") == "timestables"]
    if existing and not args.force: sys.exit(f"{args.date} already has a times-tables round {[c['id'] for c in existing]} (use --force to add another)")
    tables = parse_tables(args.tables) if args.tables else suggest(t)[0]
    used = {c["id"] for c in C["challenges"] if c["date"] == args.date}
    n = 1
    while f"tt{n}" in used: n += 1
    cid = f"tt{n}"
    key = sha(f"{t['secret']}|{args.date}|{cid}")[:16]
    r = build(tables, key)
    entry = {"date": args.date, "id": cid, "type": "timestables", "title": "Times-tables warm-up", "tables": tables, "n": N,
             "prompt": "Quick times-tables warm-up with pictures: tap the answer, then send Buzz your finish code!",
             "key": key, "points": args.points}
    if args.optional: entry["optional"] = True
    C["challenges"].append(entry)
    cd = code(key, r["answer"])
    A["answers"].setdefault(args.date, {})[cid] = {"type": "timestables", "tables": tables, "questions": ", ".join(r["qs"]), "answer": r["answer"],
                                                    "code": cd, "points": args.points, "optional": bool(args.optional),
                                                    "hint": f"{label(tables)} warm-up: " + ", ".join(r["qs"])}
    t["rounds"][args.date] = {"id": cid, "tables": tables, "stage": stage_of(tables), "finished": False}
    dump(AJ, A); dump(CJ, C)
    print(f"added {args.date} {cid}: {label(tables)}{' (bonus)' if args.optional else ''}  questions: {', '.join(r['qs'])}  code {cid} {cd}  (+{args.points})")
    print("challenges.json + challenge-answers.json updated (validate + commit challenges.json only)")

def expected(date):
    C, A = load(CJ), load(AJ); out = {}
    for c in C["challenges"]:
        if c["date"] == date and c.get("type") == "timestables":
            r = build(c["tables"], c["key"], c.get("n", N)); cd = code(c["key"], r["answer"])
            stored = A["answers"].get(date, {}).get(c["id"], {}).get("code")
            if stored and stored != cd: print(f"WARNING {date} {c['id']}: stored code {stored} != computed {cd}")
            out[c["id"]] = (cd, c["points"], {**c, "qs": r["qs"]})
    return out

def cmd_codes(args):
    e = expected(args.date)
    if not e: print(f"no times-tables round on {args.date}")
    for cid, (cd, pts, c) in e.items():
        print(f"{args.date} {cid}  {label(c['tables']):<22} code: {cid} {cd}  (+{pts}{' bonus' if c.get('optional') else ''})\n    {', '.join(c['qs'])}")

def cmd_verify(args):
    hits = []
    def exp(d):
        e = expected(d)
        for cid, v in e.items(): hits.append((d, cid, v[0]))
        return e
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): verify(args.text, args.date, "tt", exp, lambda c: f"{label(c['tables'])}{' (bonus)' if c.get('optional') else ''}")
    out = buf.getvalue(); print(out, end="")
    # remember finished rounds for the progression
    import re
    ok = re.findall(r"^OK\s+(tt\d+)\s+(\S+)\s+=\s+(\d{4}-\d{2}-\d{2})", out, re.M)
    if ok:
        A = load(AJ); t = tracker(A); changed = False
        for cid, cd, d in ok:
            r = t["rounds"].setdefault(d, {"id": cid, "tables": next(c["tables"] for c in load(CJ)["challenges"] if c["date"] == d and c["id"] == cid), "stage": 0})
            r["stage"] = stage_of(r["tables"])
            if not r.get("finished"): r["finished"] = True; r["verified"] = today(); changed = True
        if changed: dump(AJ, A); print("progression: marked finished in challenge-answers.json")

def cmd_list(args):
    A = load(AJ); rounds = A.get("timestables", {}).get("rounds", {})
    for c in load(CJ)["challenges"]:
        if c.get("type") == "timestables":
            f = rounds.get(c["date"], {}).get("finished")
            print(c["date"], c["id"], label(c["tables"]), f"+{c['points']}", "(bonus)" if c.get("optional") else "", "✅ finished" if f else "")

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
s = p.add_subparsers(dest="cmd", required=True)
a = s.add_parser("add"); a.add_argument("date"); a.add_argument("--tables"); a.add_argument("--points", type=int, default=10)
a.add_argument("--optional", action="store_true"); a.add_argument("--force", action="store_true"); a.set_defaults(f=cmd_add)
s.add_parser("next").set_defaults(f=cmd_next)
c = s.add_parser("codes"); c.add_argument("date"); c.set_defaults(f=cmd_codes)
v = s.add_parser("verify"); v.add_argument("text"); v.add_argument("--date"); v.set_defaults(f=cmd_verify)
s.add_parser("list").set_defaults(f=cmd_list)
args = p.parse_args(); args.f(args)
