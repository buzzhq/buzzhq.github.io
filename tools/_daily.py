"""Shared helpers for the daily game tools (hebsentence.py, grammar.py). Added 17 Oct 2026.
code = TAG + 2 digits from sha256(f"{key}|{answer}"), key = sha256(f"{secret}|{date}|{id}")[:16] (same scheme as stepgame/hebword)."""
import datetime, hashlib, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
CJ = os.path.join(REPO, "challenges.json"); AJ = os.path.join(os.path.dirname(REPO), "challenge-answers.json")
TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"]
def sha(s): return hashlib.sha256(s.encode()).hexdigest()
def code(key, ans): h = sha(f"{key}|{ans}"); return TAGS[int(h[0:2], 16) % 16] + str(int(h[2:6], 16) % 90 + 10)
def load(p): return json.load(open(p, encoding="utf-8"))
def dump(p, d):
    with open(p, "w", encoding="utf-8") as f: json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")
def today(): return subprocess.run(["date", "+%F"], capture_output=True, text=True, env={**os.environ, "TZ": "Australia/Sydney"}).stdout.strip()
def node(js):
    out = subprocess.run(["node", "-e", js], capture_output=True, text=True)
    if out.returncode: sys.exit("engine error: " + out.stderr)
    return json.loads(out.stdout)
def check_date(d):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d): sys.exit("date must be YYYY-MM-DD")
    datetime.date.fromisoformat(d)
def verify(text, date, prefix, expected, describe):
    """expected(date) -> {id: (code, points, info)}"""
    t = date or today()
    dates = [date] if date else [t, (datetime.date.fromisoformat(t) - datetime.timedelta(days=1)).isoformat()]
    found = re.findall(rf"\b({prefix}\s*\d+)\s*[:=-]?\s*([a-z]{{2}}\s*\d{{2}})\b", text, re.I)
    if not found: sys.exit(f"no {prefix} codes found (expected e.g. '{prefix}1 GT47')")
    total = 0
    for cid, cd in found:
        cid = re.sub(r"\s+", "", cid).lower(); cd = re.sub(r"\s+", "", cd).upper(); hit = None
        for d in dates:
            e = expected(d)
            if cid in e and e[cid][0] == cd: hit = (d, e[cid]); break
        if hit: total += hit[1][1]; print(f"OK    {cid} {cd}  = {hit[0]} {describe(hit[1][2])}  +{hit[1][1]}")
        else: print(f"WRONG {cid} {cd}  (not a valid code for {', '.join(dates)})")
    print(f"total +{total}")
