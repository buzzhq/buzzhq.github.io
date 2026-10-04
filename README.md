# Chuchu Scoreboard (for Alon)

Static site: `index.html` (the scoreboard), `tips.html` (Game Tips & Tricks), `challenges.html` (🧠 Daily Challenge), `maths.html` (🏎️ Maths Garage, see below), `hebrew.html` (🔤 Hebrew Word Rally, see below) and `jokes.html` (😂 Joke Garage, see below).
Both pages are data-driven and **additive** (append-only, updated daily):
- **`data.json`**: scoreboard wins. The page adds up the total, level, progress bar and badges automatically.
- **`challenges.json`**: daily learning challenges (see below). Answers are NEVER in the repo.
- **`tips.json`**: game tips. The page groups them by game, shows newest first, and has filter buttons for each game.
- Any win or tip whose `date` equals today's date (Australia/Sydney) gets a **NEW / NEW TODAY** badge.

## Status
- LIVE on GitHub Pages: https://buzzhq.github.io/ , https://buzzhq.github.io/tips.html and https://buzzhq.github.io/challenges.html (repo `buzzhq/buzzhq.github.io`, branch `main`, `gh` authenticated as buzzhq). Pages keep `noindex` and first name only.
- Page logic lives in `scoreboard.js` (pure `compute(data, today)`, testable with node); `index.html` renders it.

## Points rules (added 2026-09-28)
- **Deductions are allowed**: use a negative `points` value with category `respect` (gentle wording, e.g. "Respect slip: ... Bounce back!"). They render in red with a minus sign and never count as a win or badge. Totals and levels include them.
- **Streaks (automatic)**: a streak day = a Sydney calendar day whose net points are > 0. The page computes the current streak (ending today, or yesterday if today has no positive net yet), the best streak, and a **+100 streak bonus for every 7th consecutive day** in a run (days 7, 14, 21...). Bonuses are shown as 🔥 bonus rows and are included in the total.
  **Never add streak-bonus entries to `data.json`**: they are computed in the page, so adding them would double-count (entries with category `streakbonus` are ignored anyway).
- **Cash-out**: every 1000 points = $50 from Dad (`cashout` in data.json), i.e. **20 pts = $1**. Dollars are just dollars: **no currency conversion**, and no currency codes on the site (just `$`). The cash-out bar shows **wallet** progress (`wallet / 1000 pts toward $50`, wallet dollars = `wallet / 1000 * 50`).
- **Lifetime vs wallet (added 2026-10-03)**:
  - **Lifetime points** = all entries EXCEPT `cashout` (wins minus respect deductions plus computed streak bonuses). Level, level bar and all badges use lifetime, so spending never drops his level. Shown big at the top as "Lifetime".
  - **Wallet** (spendable) = lifetime minus all cash-outs. Shown under the level and in the cash-out card.
  - `cashout` entries render as a gold 🎁 REWARD row (not red, not a win, no NEW pulse) and are listed under "Rewards cashed in" (total pts + $). They are IGNORED by streaks (never break or count toward a streak day).
- **Cash-out rule (when Dad spends money on a reward)**: take the price in dollars as-is (no conversion), **points = round(dollars × 20)**, and append a NEGATIVE `cashout` entry:
  ```json
  { "date": "2026-10-03", "emoji": "🎮", "category": "cashout", "points": -170, "text": "Cashed in: Descenders for PS5 ($8.50)", "dollars": 8.5 }
  ```
  (`dollars` is optional/informational; the page shows `points / 20`.) Never spend more than the wallet.

## Daily update: append a win and/or tips (one commit + push)
Append entries to the END of each array in `data.json` / `tips.json` (never delete old ones). Then:
```bash
cd /workspace/alon/scoreboard
python3 -m json.tool data.json >/dev/null && python3 -m json.tool tips.json >/dev/null && echo JSON OK
git add data.json tips.json && git commit -m "Daily update $(TZ=Australia/Sydney date +%F)" && git push
```

Example tip entry (`game` is free text; the known icons are GTA 🚗, Roblox 🧱, Fortnite 🏗️, Descenders 🚵, and any other game gets 🎮; add new icons to the `icons` map in `tips.html`):
```json
{ "date": "2026-09-27", "game": "Roblox", "title": "Short catchy title", "tip": "One or two kid-safe sentences." }
```
Tip rules: GTA = driving, racing, cars, exploring and customising only (no crime, violence, weapons or police). Fortnite = building, editing, Creative, storm and rotation. Descenders (PS5 downhill MTB, added 4 Oct 2026; Alon got it 3 Oct 2026) = riding skills, jumps/landings, health/lives, map routes, Rep, crew, tricks, Bike Parks; include at least 1 Descenders tip in each daily batch of 2-3 while he's into it. Keep everything accurate and generic, with no external links.

## Add a win
1. Add an entry to the `wins` array in `data.json` (order doesn't matter; the page sorts newest first):
   ```json
   { "date": "2026-09-27", "emoji": "🏀", "category": "hoops", "points": 15, "text": "Shot 50 hoops in the backyard" }
   ```
   `category` must be one of `home`, `reading`, `hoops`, `school`, `kindness`, `active` (hikes, bike rides, sport adventures), `challenge` 🧠 (daily challenge answers: +5 each correct, +10 good reading), `respect` (negative points only), or `cashout` 🎁 (negative points only: a reward bought with wallet points, points = dollars × 20, see Cash-out rule).
2. Check the JSON is valid: `python3 -m json.tool data.json >/dev/null && echo OK`
3. Publish:
   ```bash
   cd /workspace/alon/scoreboard
   git add data.json tips.json && git commit -m "Add win: <short text>" && git push
   ```
   GitHub Pages usually updates within about 1 minute. The page fetches `data.json` with a cache-buster.

## tips.json schema
- `tips[]`: `{ date: "YYYY-MM-DD", game: string, title: string, tip: string }`
  (tips with the same date keep their file order; newer dates appear first)

## data.json schema
- `name` (string): first name shown on the page
- `bot` (string): sign-off, e.g. "Buzz 🤖"
- `updated` (YYYY-MM-DD)
- `levels[]`: `{ name, min, emoji }` (the level applies when total >= min)
- `categories{}`: key -> `{ label, emoji, color, deduction? }` (`deduction: true` = no badge / not shown as an earning category); `spend: true` = cash-out category (excluded from lifetime, level, badges and streaks; subtracted from wallet)
- `cashout`: `{ points: 1000, reward: 50, pointsPerDollar: 20 }`
- `streak`: `{ bonusEvery: 7, bonusPoints: 100 }`
- `wins[]`: `{ date: "YYYY-MM-DD", emoji, category: <category key>, points: number (negative allowed for deductions), text }`

## Local preview
`python3 -m http.server 8765` then open http://localhost:8765/ (a server is needed because the page uses fetch).

## One-time hosting setup (once gh is authenticated)
```bash
cd /workspace/alon/scoreboard
gh repo create buzz-hq-7k3 --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/buzz-hq-7k3/pages -f 'source[branch]=main' -f 'source[path]=/'
```

## Testing the logic
```bash
node -e 'const s=require("./scoreboard.js");const r=s.compute(require("./data.json"),"2026-09-28");console.log(r.lifetime,r.wallet,r.level.name,r.streak,r.cash,r.rewards)'
# 2026-10-03 expected: lifetime 200, wallet 30 ($1.50), All-Star, rewards 170 pts = $8.50
```

## Daily Challenge (added 2026-09-28): `challenges.html` + `challenges.json`
Page: https://buzzhq.github.io/challenges.html — shows the set whose `date` = today (Sydney) big and clear (or the latest set, with "a fresh set lands this afternoon"), a "How to answer" box, and older days collapsed below. Append-only.

> **🚨 From Mon 5 Oct 2026 the daily maths is the 🏎️ Maths Garage (ACTIVE, Ron approved 4 Oct 2026): races `mg1` (×) + `mg2` (÷), +10 each, added with `tools/stepgame.py add`. NO more `dc1`/`dc2` maths MCQs. 5 Oct is already seeded. See "Buzz's Maths Garage" below.** **🔤 From Mon 5 Oct 2026 the daily Hebrew is the Hebrew Word Rally (ACTIVE, Ron approved 4 Oct 2026): `hb1` (+ optional `hb2`) words, +10 each, added with `tools/hebword.py add`. NO more `dc3`/`dc4` letter MCQs. 5 Oct is already seeded (hb1 דג, hb2 גלגל).** Daily messages end with SIX links (Scoreboard, Tips, Challenges, Maths Garage, Hebrew Rally, Jokes).

Daily set (appended by the afternoon routine). **Maths format changed 28 Sep 2026 evening** (Ron: full long multiplication/division with blanks was too hard on a phone). The 28 Sep `mult`/`div` entries stay as they are (append-only); from 29 Sep:
1. `dc1`, `dc2` `mcq`: 2 maths challenges, each ONE mental step with multiple choice a/b/c(/d), taken from a bigger 3-4 digit × 2-digit multiplication or long division (e.g. "Step 1 of 247 × 36: what is 7 × 6?", "Which is closest to 247 × 36? a) 900 b) 9,000 c) 90,000", "5838 ÷ 6: how many 6s fit in 58?"). Over a week they walk through the full method: times-tables facts → estimating → carrying → partial products → adding up → sense-check (full plan in `/workspace/alon/journey.md`, MATHS FORMAT).
2. ~~`dc3`, `dc4` `hebrew`~~ (SUPERSEDED from 5 Oct 2026 by the Hebrew Word Rally `hb1`/`hb2`, see below): one letter each, 4 sound choices a-d (standard Israeli sounds, unambiguous distractors), cycling the whole alphabet (unchanged)
3. `dc5` `reading`: 3-4 fun, kid-safe ENGLISH sentences to read aloud as a WhatsApp voice note (+10) (unchanged)
4. `dc6` `paper` (OPTIONAL, `optional: true`, +10), once or twice a week: the full big sum to do on pen and paper; answer = the full number (`dc6 7632`). Optional items are shown as "+10 bonus" and not counted in the "up to" total.
5. **Maths game of the day**: one entry per day in the top-level `games` array, shown in a box at the top of the page (the latest entry with date <= today). Only games from the verified list in `journey.md`; no repeats within 7 days.

**Answers live OUTSIDE the repo** in `/workspace/alon/challenge-answers.json` (`answers[date][id]` = `{choice}` (mcq/hebrew), `{answer}` (paper) or old-style `{parts:{A,B}}`, + `hint`), together with the Hebrew letter tracker (`hebrew_tracker.done`) and difficulty notes. Never commit answers. Verify all arithmetic with python before publishing.

Schema `challenges[]` (plus `check` on every answerable entry, see above):
```json
{ "date": "2026-09-28", "id": "dc1", "type": "mult", "title": "Long multiplication", "prompt": "247 × 36 — fill in the missing digits A and B!",
  "worked": { "top": "247", "bottom": "36", "partials": ["1482", "7A10"], "result": "88B2", "lines": ["247 × 6 = 1482", "247 × 30 = 7A10", "1482 + 7A10 = 88B2"] }, "points": 5 }
{ "id": "dc2", "type": "div", "worked": { "divisor": "6", "dividend": "5838", "quotient": ["", "9", "A", "3"], "carries": ["", "5", "4", "B"], "lines": ["..."] }, "points": 5 }
{ "date": "2026-09-29", "id": "dc1", "type": "mcq", "title": "Maths step", "from": "318 × 24", "step": "Step 1", "prompt": "What is 8 × 4?", "choices": { "a": "28", "b": "32", "c": "36" }, "tip": "optional kind nudge", "points": 5 }
{ "date": "2026-10-01", "id": "dc6", "type": "paper", "optional": true, "title": "Paper bonus", "prompt": "Grab pen and paper and do the whole sum!", "sum": "318 × 24", "points": 10 }
{ "id": "dc3", "type": "hebrew", "letter": "ש", "choices": { "a": "m (like moon)", "b": "sh (like ship)", "c": "l (like lion)", "d": "r (like race)" }, "points": 5 }
{ "id": "dc5", "type": "reading", "text": "3-4 sentences…", "points": 10 }
```
Top-level extras (optional, append-only, next to `challenges`):
```json
"notes": [ { "date": "2026-09-28", "id": "dc1", "text": "Tricky one! Grab pen and paper, or skip — tomorrow's maths is quicker." } ],
"games": [ { "date": "2026-09-28", "game": { "name": "Meteor Multiplication (Coolmath4Kids)", "url": "https://www.coolmath4kids.com/math-games/meteor-multiplication", "why": "One fun sentence", "ads": true } } ]
```
`notes` puts a friendly yellow note on a challenge card without editing the challenge. `games[].game.url` must be https. `ads: true` adds a "don't tap the ads" line.
(Old `mult`/`div` types:) In `worked`, any capital letter A/B/C… is rendered as a pink blank box. `carries[i]` is the small carry digit shown before dividend digit i.

### Interactive page + `check` hashes (added 2026-09-29)
The current set is interactive on the phone: big tap buttons for `mcq`/`hebrew`, number boxes + **Check** for `paper` and old `mult`/`div` blanks (one box per capital-letter blank). Instant ✅ (emoji confetti) or "Not quite, try again!" (unlimited retries; the FIRST try is recorded). Progress is saved in the browser (`localStorage` key `buzz-dc-<date>`). The `reading` card says "Read this in the WhatsApp message and send a voice note" and shows the text. A **Send to Buzz 🤖** button opens `https://wa.me/?text=...` (WhatsApp share picker; he picks Chuchu HQ) with e.g. `dc1 b, dc2 b, dc3 b, dc4 c (first try: 3/4)` (old blanks: `dc1 A=4 B=9`). Past days stay read-only.

Every challenge that has a right answer (`mcq`, `hebrew`, `paper`, old `mult`/`div`) MUST carry a `check` field = SHA-256 hex of `<date>|<id>|<normalised answer>`, normalised as: choice letter lowercase (`b`); number digits only, no spaces/commas (`7632`); blanks `A=4 B=9` (sorted, uppercase keys, single spaces). `reading` has no `check`. Without `check` the page just saves the answer ("Buzz will check this one tonight"). **After appending the day's challenges AND writing their answers to challenge-answers.json, run this (idempotent, only fills missing `check`s):**
```bash
cd /workspace/alon/scoreboard && python3 - <<'PY'
import json, hashlib, re
def norm(a):
    if isinstance(a, dict):  # old blanks {"A":"4","B":"9"} -> "A=4 B=9"
        return " ".join(f"{k.upper()}={re.sub(r'\s+','',str(v))}" for k, v in sorted(a.items()))
    a = str(a).strip()       # choice "B" -> "b"; number "7,632" -> "7632"
    return a.lower() if re.fullmatch(r"[A-Za-z]", a) else re.sub(r"[\s,]", "", a)
A = json.load(open("../challenge-answers.json"))["answers"]
d = json.load(open("challenges.json"))
for c in d["challenges"]:
    a = A.get(c["date"], {}).get(c["id"], {})
    ans = a.get("choice") or a.get("answer") or a.get("parts")
    if ans and "check" not in c:
        c["check"] = hashlib.sha256(f'{c["date"]}|{c["id"]}|{norm(ans)}'.encode()).hexdigest()
        print("check added:", c["date"], c["id"])
with open("challenges.json", "w") as f:
    json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")
PY
python3 -m json.tool challenges.json >/dev/null && echo JSON OK
```

The hash hides the answer from casual reading only (a determined person could brute-force a/b/c/d); the real scoring is still done by Buzz in the evening against challenge-answers.json.

Answer codes in Chuchu HQ (parse leniently: spacing/case): `dc1 b`, `dc3 c`, `dc 4b`, paper bonus `dc6 7632` (old 28 Sep style `dc1 A=4 B=8`), or the page's Send-to-Buzz line `dc1 b, dc2 b, dc3 b, dc4 c (first try: 3/4)` (comma-separated; IGNORE the `(first try: …)` claim for scoring: verify every code against challenge-answers.json, +5 each correct, nothing extra for first try); reading = voice note + `dc5`. The afternoon WhatsApp message must contain the FULL reading passage (see journey.md).
Reading check (offline): `/workspace/alon/check_reading.py <audio.ogg> "<expected text>"` (faster-whisper base.en, CPU int8; pass >= 85% word match). Voice notes go to `/workspace/alon/voice/`.

## 🏎️ Buzz's Maths Garage (added 2026-10-04): `maths.html` + `maths-engine.js`
Page: https://buzzhq.github.io/maths.html. **✅ ACTIVE (Ron approved 4 Oct 2026 evening): it replaces the daily one-step maths MCQs (`dc1`/`dc2` `mcq`) from Mon 5 Oct 2026** (5 Oct already seeded; from 6 Oct the afternoon routine adds mg1 + mg2 daily). Older days keep their `mcq` entries (append-only). Every daily message ends with FOUR links (Scoreboard, Tips, Challenges, Maths Garage).
Alon solves a whole long multiplication or long division **one step at a time**: the working (columns with carries, partial products and placeholder zero, or a bus-stop division with carried remainders) fills in as he goes. Each step asks a short question with **3 tap options** (one right, two typical-mistake distractors: forgot the carry, off-by-one times-table fact, forgot the placeholder zero, wrong order, too many/too few in division). Wrong tap = gentle hint + retry; right tap = working updates + mini confetti; car progress bar to the 🏁.
- **Tabs**: 🏁 *Today's races* (from `challenges.json`) and 🛠️ *Practice* (random problems generated on the page, 6 levels each for × and ÷, no points).
- **Engine**: `maths-engine.js` (pure JS, also `require`-able in node): `buildMult(a,b)`, `buildDiv(a,d)`, `randomProblem(kind, level)`, `LEVELS`, `codeFromHex`. Practice levels: × 2d×1d, 3d×1d, 4d×1d, 2d×2d, 3d×2d, 4d×2d; ÷ 2d÷1d, 3d÷1d (exact), 3d÷1d with remainders, 4d÷1d, 3d÷2d (exact, ÷11-25), 4d÷2d (÷11-30).
- **Tests**: `node tests/engine.test.js` (27k+ random/sweep problems: every correct option leads to the right final answer, exactly one correct option, distractors never equal it, every distractor has a hint). Run it after any engine change.

### Daily problems = `stepgame` entries in `challenges.json`
```json
{ "date": "2026-10-05", "id": "mg1", "type": "stepgame", "title": "Maths Garage: long multiplication", "mode": "mult", "a": 318, "b": 24, "sum": "318 × 24",
  "prompt": "Solve it step by step in Buzz's Maths Garage, then send Buzz your finish code!", "key": "8e900900c2425e34", "points": 10 }
```
`mode` = `mult` or `div` (`b` is the multiplier / divisor). Ids are **`mg1`, `mg2`** (not dc1/dc2, so they never clash with the old maths ids; Hebrew is `hb1`/`hb2` from 5 Oct, reading `dc5`). `challenges.html` shows each as a 🏎️ card with a "Solve it in the Maths Garage" button; when finished (same phone/browser), the card shows the code and the Challenges **Send to Buzz** line includes it (e.g. `mg1 ST81, mg2 TX67, dc3 b, dc4 a (first try: 2/2)`). `maths.html` has its own Send to Buzz button too (wa.me share picker, he picks Chuchu HQ).

**NEVER write stepgame entries by hand.** Use the helper (it validates the numbers, runs the engine, creates the `key`, and writes the private answer + expected code to `/workspace/alon/challenge-answers.json`):
```bash
cd /workspace/alon/scoreboard
tools/stepgame.py add 2026-10-06 --mult 427x36 --div 936/4   # one of each (mult = mg1, div = mg2); --order div-first to swap
tools/stepgame.py codes 2026-10-06                            # expected codes, e.g. "mg1 ST81"
tools/stepgame.py verify "mg1 ST81, mg2 TX67"                 # checks today + yesterday (or --date YYYY-MM-DD)
tools/stepgame.py list
python3 -m json.tool challenges.json >/dev/null && echo JSON OK
```
Rules enforced: × top number 2-4 digits, multiplier 2-99 with no 0 digit; ÷ dividend 2-4 digits, divisor 2-99 (not a multiple of 10), quotient ≥ 2.

### Finish code + scoring
- When a daily race is finished the page shows a code like **`mg1 ST81`** = 2 letters + 2 digits from `sha256("<key>|<answer>")` (answer `7632`, or `213` / `213r1` for division). `key` = `sha256("<secret>|<date>|<id>")[:16]`; the `secret` lives only in `challenge-answers.json` → `stepgame.secret`, with each day's `answers[date][mgN] = {type:"stepgame", mode, sum, answer, code, steps, points, hint}`. Codes change every day and per problem.
- Like the `check` hashes, this only stops casual guessing (the page must be able to make the code); real scoring is Buzz verifying with `tools/stepgame.py verify`.
- **+10 per finished race** (mult +10, div +10), scored once each, category **`challenge`** 🧠, e.g. `{ "date": "2026-10-05", "emoji": "🏎️", "category": "challenge", "points": 10, "text": "Maths Garage mg1 ✅ 318 × 24" }`. Mistakes/hints along the way never cost points (the page counts "pit stops" just for fun; ignore them for scoring).
- Progress is saved per day in the browser (`localStorage` `buzz-garage-<date>`), so he can stop and continue later. If no race is dated today the page shows the latest one; if only future races exist it shows a 👀 sneak peek (`maths.html?date=YYYY-MM-DD` previews a given day).

### Progression for the daily races (grow SLOWLY, mix × and ÷)
Usually 1 multiplication (`mg1`) + 1 division (`mg2`) a day. Step up one notch only after ~3 days finished with few pit stops; step back if he gets stuck or skips 2 days in a row. Prefer numbers that exercise the method (some carries) but stay friendly; vary them (don't repeat a sum within 2 weeks, except 318 × 24 to start).
1. Week of 5 Oct: 3-digit × 2-digit (318 × 24 first, then e.g. 214 × 13, 326 × 21) + 3-digit ÷ 1-digit, no remainder (852 ÷ 4, 936 ÷ 3, 714 ÷ 6).
2. Then 3-digit × 2-digit with more carries (e.g. 457 × 36) + 3-digit ÷ 1-digit with a remainder (e.g. 755 ÷ 4 = 188 r 3).
3. Then 4-digit × 1-digit / 4-digit ÷ 1-digit (incl. a 0 in the middle, e.g. 4,812 ÷ 4 = 1,203).
4. Then 4-digit × 2-digit (e.g. 2,347 × 26) + 3-digit ÷ easy 2-digit (÷ 11, 12, 15, 20-25, e.g. 864 ÷ 12 = 72).
5. Later: 4-digit ÷ 2-digit (e.g. 7,245 ÷ 23 = 315), remainders with 2-digit divisors.
The old 📝 paper bonus (`dc6`, optional +10) can still be added once a week for the same race sum, but it's no longer needed.

## 🔤 Buzz's Hebrew Word Rally (added 2026-10-04): `hebrew.html` + `hebrew-engine.js`
Page: https://buzzhq.github.io/hebrew.html. Alon sounds out a short Hebrew word (2-4 letters, no nikud) **letter by letter, right to left**: the current letter glows, he taps its sound from 3 options (lookalike/sound mix-ups such as ד/ר, ה/ח, ו/ז, ב/כ, ג/נ, ס/ם, each with a gentle hint), and the sounded-out word builds up underneath (`da… dag!`). Then "What do you think it means?" with a clue and 3 English options, then the meaning with a big emoji and a fun fact. Same car progress bar, confetti, pit-stop counter and Send to Buzz as the Maths Garage.
- **Word bank** = `WORDS` in `hebrew-engine.js` (29 words, each: spelling, per-letter sound + transliteration chunk, meaning, emoji, clue, fact, `newLetter`). Words use only learned letters, or at most ONE new letter, which the game introduces (`א` in אבא/סבא/אמא, final `ם` in חם/גשם/לחם/שלום). ב is v at the end/after a vowel (לב lev, חלב chalav, זהב zahav, דבש dvash) and b in אבא/סבא; ו is a vowel in סוס sus, חול chol, דוד dod, שלום shalom; every ש is sh. The game never offers a letter's other real sound as a "wrong" answer.
- **Tests**: `node tests/hebrew.test.js` (checks every word: plain letters, 2-4 long, final forms only at the end, chunks spell the transliteration, ≤1 new letter vs `hebrew_tracker.done`, 3 distinct options with exactly one correct, every wrong option has a hint). Add new words ONLY to the bank + rerun the test; double-check spelling and meaning.
- **Practice tab**: all bank words, grouped "⭐ Words with your letters" / "🆕 One new letter"; "letters you know" = the letters from the old dc3/dc4 Hebrew letter challenges + every letter in daily `hebword` words before today (automatic).
- **Daily words** = `hebword` entries in `challenges.json`, ids **`hb1`** (and optional `hb2`), +10 each. Added ONLY with the helper:
```bash
cd /workspace/alon/scoreboard
tools/hebword.py bank                                  # which words fit his letters (OK / NEW1 / LATER) + which were used
tools/hebword.py add 2026-10-06 --word דגל [--word זהב] [--optional]   # optional = shown as "+10 bonus" (not in the "up to" total)
tools/hebword.py codes 2026-10-06
tools/hebword.py verify "hb1 TX33, hb2 GX40"           # today + yesterday (or --date)
```
  Finish code `hb1 TX33` = same scheme as the Maths Garage (sha256 of `<key>|<transliteration>`; secret only in challenge-answers.json → `hebword.secret`, expected codes in `answers[date][hbN]`). Scoring: +10 per valid code, category `challenge`, emoji 🔤, e.g. "Hebrew word hb1 ✅ דג (dag = fish)". `challenges.html` shows `hebword` cards with a "Sound it out in the Hebrew Rally" button and includes the codes in its Send line.
- **✅ ACTIVE from Mon 5 Oct 2026 (Ron approved 4 Oct 2026), replacing the dc3/dc4 letter MCQs.** Seeded Mon 5 Oct as the main Hebrew challenge: hb1 דג dag = fish 🐟 (code hb1 TX33), hb2 גלגל galgal = wheel 🛞 (code hb2 GX40).
- Daily: 1-2 words a day; mostly learned-letter words, sometimes a word with the next new letter (then add that letter to `hebrew_tracker.done` once he finishes it; a brand-new letter also needs a `LETTERS` entry in hebrew-engine.js: name + 3 mix-ups with hints, then run the test); don't repeat a word within 2 weeks (`bank` shows used words); grow from 2-letter to 3-4-letter words slowly.

## 😂 Buzz's Joke Garage (added 2026-10-04): `jokes.html` + `jokes.json`
Page: https://buzzhq.github.io/jokes.html. Today's (latest) joke big at the top with a **NEW TODAY** badge, then all older jokes (newest first, with dates and Morning/Afternoon/Bonus tags, topic filter chips). Punchlines are **tap-to-reveal**; a 😂 Funny! button and the revealed state are saved only in the browser (`localStorage` key `buzz-jokes`, no backend).
- **Standing rule (Ron, 4 Oct 2026):** every morning AND afternoon Buzz message has ONE new 1–2 line joke (punchline included, or now and then a teaser "Tap the 😂 Jokes page for the punchline!"), and the SAME joke is appended to `jokes.json` in that run's commit. Clean and kid-safe for a 10-year-old (cars/racing, basketball, space, animals, school, bikes, gaming; GTA cars only; no Minecraft; no mean/put-down jokes). Never repeat a joke.
- **Helper** (repeat check + append):
```bash
cd /workspace/alon/scoreboard
tools/jokes.py check "Why did the race car go to the doctor?" "It had a bad case of exhaust-ion!"   # exit 1 = TOO SIMILAR, pick another
tools/jokes.py add 2026-10-05 am --topic Cars --emoji 🏎️ --setup "Why did ...?" --punchline "Because ...!"
tools/jokes.py list
git add jokes.json   # together with the run's other files
```
- Schema `jokes[]` (append-only, file order = oldest first): `{ "date": "YYYY-MM-DD", "slot": "am"|"pm"|"extra", "topic": "Basketball", "emoji": "🏀", "setup": "...?", "punchline": "...!" }`. Jokes dated in the future stay hidden until their day.
- Seeded 4 Oct 2026 with the 4 jokes already sent in Chuchu HQ (27 Sep pm, 30 Sep pm, 2 Oct am, 2 Oct pm; the 24 Sep Minecraft joke is left out on purpose) + one bonus 4 Oct joke.
- Every daily message ends with SIX links; the 6th is "😂 Jokes: https://buzzhq.github.io/jokes.html".
