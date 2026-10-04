#!/usr/bin/env python3
"""Buzz's Maths Garage helper (maths.html step game). Added 4 Oct 2026.

Usage (run from anywhere):
  tools/stepgame.py add 2026-10-06 --mult 427x36 --div 936/4     # append that day's problems (mg1, mg2, ...)
  tools/stepgame.py codes 2026-10-06                               # show the expected completion codes
  tools/stepgame.py verify "mg1 GT47, mg2 RX12" [--date 2026-10-06] # check codes Alon sent (today + yesterday by default)
  tools/stepgame.py list                                           # all stepgame problems so far

- Problems go into challenges.json as {type:"stepgame", id:"mg1"...} (append-only); the page maths.html plays them.
- The private secret, the answers and the expected codes live in /workspace/alon/challenge-answers.json
  (key "stepgame" + answers[date][id]); NEVER commit that file.
- code = TAG + 2 digits from sha256(f"{key}|{answer}") where key = sha256(f"{secret}|{date}|{id}")[:16] is stored
  in challenges.json, answer = "7632" (mult) or "213" / "213r1" (div). Must match codeFromHex in maths-engine.js.
"""
import argparse, datetime, hashlib, json, os, re, secrets, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
CJ = os.path.join(REPO, "challenges.json")
AJ = os.path.join(os.path.dirname(REPO), "challenge-answers.json")
TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"]

def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def code_from_hex(h): return TAGS[int(h[0:2], 16) % 16] + str(int(h[2:6], 16) % 90 + 10)
def code(key, answer): return code_from_hex(sha(f"{key}|{answer}"))
def answer_of(mode, a, b):
    if mode == "mult": return str(a * b)
    q, r = divmod(a, b)
    return f"{q}r{r}" if r else str(q)
def today():
    return subprocess.run(["date", "+%F"], capture_output=True, text=True, env={**os.environ, "TZ": "Australia/Sydney"}).stdout.strip()

def load(p): return json.load(open(p, encoding="utf-8"))
def dump(p, d):
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")

def validate(mode, a, b):
    if mode == "mult":
        if not (10 <= a <= 9999): return "top number must be 2-4 digits"
        if not (2 <= b <= 99) or "0" in str(b): return "multiplier must be 2-99 with no 0 digit"
    else:
        if not (10 <= a <= 9999): return "dividend must be 2-4 digits"
        if not (2 <= b <= 99) or b % 10 == 0: return "divisor must be 2-99 (not a multiple of 10)"
        if a // b < 2: return "quotient must be at least 2"
    return None

def engine_answer(mode, a, b):
    js = f"const E=require({json.dumps(os.path.join(REPO, 'maths-engine.js'))});const p=E.build({{mode:{json.dumps(mode)},a:{a},b:{b}}});" \
         "if(!p.steps.every(s=>s.opts.length===3&&s.opts.filter(o=>o.ok).length===1))throw new Error('bad steps');" \
         "console.log(p.answer+' '+p.steps.length)"
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
    if out.returncode: sys.exit("engine check failed: " + out.stderr)
    ans, n = out.stdout.split()
    return ans, int(n)

def parse_prob(s, mode):
    m = re.fullmatch(r"\s*(\d+)\s*[x×*]\s*(\d+)\s*", s) if mode == "mult" else re.fullmatch(r"\s*(\d+)\s*[/÷]\s*(\d+)\s*", s)
    if not m: sys.exit(f"can't read {s!r}: use 318x24 or 852/4")
    return int(m.group(1)), int(m.group(2))

def cmd_add(args):
    probs = [("mult", *parse_prob(s, "mult")) for s in args.mult or []] + [("div", *parse_prob(s, "div")) for s in args.div or []]
    if args.order == "div-first": probs.sort(key=lambda p: p[0] != "div")
    if not probs: sys.exit("give at least one --mult or --div")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date): sys.exit("date must be YYYY-MM-DD")
    C, A = load(CJ), load(AJ)
    sg = A.setdefault("stepgame", {})
    if "secret" not in sg: sg["secret"] = secrets.token_hex(16); print("created private stepgame secret")
    existing = [c for c in C["challenges"] if c["date"] == args.date and c.get("type") == "stepgame"]
    if existing and not args.force: sys.exit(f"{args.date} already has stepgame problems {[c['id'] for c in existing]} (use --force to add more)")
    used = {c["id"] for c in C["challenges"] if c["date"] == args.date}
    n = 1
    for mode, a, b in probs:
        err = validate(mode, a, b)
        if err: sys.exit(f"{mode} {a},{b}: {err}")
        ans = answer_of(mode, a, b)
        eng, nsteps = engine_answer(mode, a, b)
        if eng != ans: sys.exit(f"engine answer {eng} != python {ans}")
        while f"mg{n}" in used: n += 1
        cid = f"mg{n}"; used.add(cid)
        key = sha(f"{sg['secret']}|{args.date}|{cid}")[:16]
        sym = "×" if mode == "mult" else "÷"
        C["challenges"].append({
            "date": args.date, "id": cid, "type": "stepgame",
            "title": "Maths Garage: long multiplication" if mode == "mult" else "Maths Garage: long division",
            "mode": mode, "a": a, "b": b, "sum": f"{a} {sym} {b}",
            "prompt": "Solve it step by step in Buzz's Maths Garage, then send Buzz your finish code!",
            "key": key, "points": args.points})
        q, r = divmod(a, b)
        hint = (f"Ones row {a}×{b % 10}={a * (b % 10)}" + (f", tens row {a}×{b // 10 * 10}={a * (b // 10) * 10}, add = {a * b}" if b > 9 else f" = {a * b}")) if mode == "mult" \
            else f"{a} ÷ {b} = {q}" + (f" r {r}" if r else "") + f" (check: {q}×{b}{f'+{r}' if r else ''}={a})"
        A["answers"].setdefault(args.date, {})[cid] = {"type": "stepgame", "mode": mode, "sum": f"{a} {sym} {b}", "answer": ans,
                                                        "code": code(key, ans), "steps": nsteps, "points": args.points, "hint": hint}
        print(f"added {args.date} {cid}: {a} {sym} {b} = {ans}  ({nsteps} steps)  code {cid} {code(key, ans)}")
    dump(AJ, A); dump(CJ, C)
    print("challenges.json + challenge-answers.json updated (validate + commit challenges.json only)")

def expected(date):
    C, A = load(CJ), load(AJ)
    out = {}
    for c in C["challenges"]:
        if c["date"] == date and c.get("type") == "stepgame":
            ans = answer_of(c["mode"], int(c["a"]), int(c["b"]))
            out[c["id"]] = (code(c["key"], ans), c)
            stored = A["answers"].get(date, {}).get(c["id"], {}).get("code")
            if stored and stored != out[c["id"]][0]: print(f"WARNING {date} {c['id']}: stored code {stored} != computed {out[c['id']][0]}")
    return out

def cmd_codes(args):
    e = expected(args.date)
    if not e: print(f"no stepgame problems on {args.date}")
    for cid, (cd, c) in e.items(): print(f"{args.date} {cid}  {c['sum']:>12} = {answer_of(c['mode'], int(c['a']), int(c['b'])):<8}  code: {cid} {cd}  (+{c['points']})")

def cmd_verify(args):
    t = args.date or today()
    dates = [args.date] if args.date else [t, (datetime.date.fromisoformat(t) - datetime.timedelta(days=1)).isoformat()]
    found = re.findall(r"\b(mg\s*\d+)\s*[:=-]?\s*([a-z]{2}\s*\d{2})\b", args.text, re.I)
    if not found: sys.exit("no mg codes found (expected e.g. 'mg1 GT47')")
    total = 0
    for cid, cd in found:
        cid = re.sub(r"\s+", "", cid).lower(); cd = re.sub(r"\s+", "", cd).upper()
        hit = None
        for d in dates:
            e = expected(d)
            if cid in e and e[cid][0] == cd: hit = (d, e[cid][1]); break
        if hit:
            total += hit[1]["points"]; print(f"OK    {cid} {cd}  = {hit[0]} {hit[1]['sum']}  +{hit[1]['points']}")
        else:
            print(f"WRONG {cid} {cd}  (not a valid code for {', '.join(dates)})")
    print(f"total +{total}")

def cmd_list(args):
    for c in load(CJ)["challenges"]:
        if c.get("type") == "stepgame": print(c["date"], c["id"], c["sum"], "+%d" % c["points"])

p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
s = p.add_subparsers(dest="cmd", required=True)
a = s.add_parser("add"); a.add_argument("date"); a.add_argument("--mult", action="append"); a.add_argument("--div", action="append")
a.add_argument("--points", type=int, default=10); a.add_argument("--force", action="store_true"); a.add_argument("--order", choices=["mult-first", "div-first"], default="mult-first")
a.set_defaults(f=cmd_add)
c = s.add_parser("codes"); c.add_argument("date"); c.set_defaults(f=cmd_codes)
v = s.add_parser("verify"); v.add_argument("text"); v.add_argument("--date"); v.set_defaults(f=cmd_verify)
l = s.add_parser("list"); l.set_defaults(f=cmd_list)
args = p.parse_args(); args.f(args)
