#!/usr/bin/env python3
"""Buzz's Joke Garage helper (jokes.html + jokes.json, added 4 Oct 2026).

  tools/jokes.py check "Why did the race car ...?" ["punchline"]   # repeat check against jokes.json (exit 1 if too similar)
  tools/jokes.py add 2026-10-05 am --topic Cars --emoji 🏎️ --setup "Why ...?" --punchline "Because ...!"
  tools/jokes.py list

add = repeat check + append to the END of jokes.json (append-only; the page shows newest first). slot = am | pm | extra.
Topics: Cars, Racing, Basketball, Space, Animals, School, Gaming, Bikes, Food, Science (others allowed).
"""
import argparse, difflib, json, os, re, sys
J = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "jokes.json")
def norm(s): return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", " "))).strip()
STOP = set("a an the it its it's was is be because so to of and he she they his her their on in at for with by just why what how who did do does you your i my me we our that this get got".split())
def words(s): return {w for w in norm(s).split() if w not in STOP}
def jac(x, y): x, y = words(x), words(y); return len(x & y) / len(x | y) if x and y else 0
def load(): return json.load(open(J, encoding="utf-8"))
def similar(setup, punch=""):
    hits = []
    for j in load()["jokes"]:
        a = difflib.SequenceMatcher(None, norm(setup), norm(j["setup"])).ratio()
        b = difflib.SequenceMatcher(None, norm(punch), norm(j["punchline"])).ratio() if punch else 0
        # same question (setup >= 0.9) or same punchline (>= 0.7, or one contains the other) = repeat
        pn, jn = norm(punch), norm(j["punchline"])
        if a >= 0.9 or b >= 0.7 or (pn and len(pn) > 5 and (pn in jn or jn in pn)) or (punch and jac(punch, j["punchline"]) >= 0.6 and len(words(punch)) >= 2):
            hits.append((max(a, b), j))
    return hits
def cmd_check(a):
    h = similar(a.setup, a.punchline or "")
    for r, j in h: print(f"TOO SIMILAR ({r:.2f}) to {j['date']} {j['slot']}: {j['setup']} / {j['punchline']}")
    if h: sys.exit(1)
    print("OK, new joke")
def cmd_add(a):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", a.date): sys.exit("date must be YYYY-MM-DD")
    if a.slot not in ("am", "pm", "extra"): sys.exit("slot must be am, pm or extra")
    h = similar(a.setup, a.punchline)
    if h and not a.force:
        for r, j in h: print(f"TOO SIMILAR ({r:.2f}) to {j['date']} {j['slot']}: {j['setup']} / {j['punchline']}")
        sys.exit("not added (pick another joke)")
    d = load()
    if any(j["date"] == a.date and j["slot"] == a.slot for j in d["jokes"]) and a.slot != "extra": sys.exit(f"{a.date} {a.slot} already has a joke")
    d["jokes"].append({"date": a.date, "slot": a.slot, "topic": a.topic, "emoji": a.emoji, "setup": a.setup.strip(), "punchline": a.punchline.strip()})
    with open(J, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")
    print(f"added {a.date} {a.slot}: {a.setup} / {a.punchline}")
def cmd_list(a):
    for j in load()["jokes"]: print(j["date"], j["slot"], j["topic"], "|", j["setup"], "/", j["punchline"])
p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); s = p.add_subparsers(dest="cmd", required=True)
x = s.add_parser("check"); x.add_argument("setup"); x.add_argument("punchline", nargs="?"); x.set_defaults(f=cmd_check)
x = s.add_parser("add"); x.add_argument("date"); x.add_argument("slot"); x.add_argument("--topic", required=True); x.add_argument("--emoji", default="😂")
x.add_argument("--setup", required=True); x.add_argument("--punchline", required=True); x.add_argument("--force", action="store_true"); x.set_defaults(f=cmd_add)
s.add_parser("list").set_defaults(f=cmd_list)
a = p.parse_args(); a.f(a)
