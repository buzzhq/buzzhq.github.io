# Chuchu Scoreboard (for Alon)

Static site with three pages: `index.html` (the scoreboard), `tips.html` (Game Tips & Tricks) and `challenges.html` (🧠 Daily Challenge).
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
- **Cash-out**: every 1000 points = $50 USD from Dad (`cashout` in data.json). The page shows `X / 1000 pts toward $50`, dollars earned so far (`points / 1000 * 50`) and how many full $50 cash-outs are unlocked.

## Daily update: append a win and/or tips (one commit + push)
Append entries to the END of each array in `data.json` / `tips.json` (never delete old ones). Then:
```bash
cd /workspace/alon/scoreboard
python3 -m json.tool data.json >/dev/null && python3 -m json.tool tips.json >/dev/null && echo JSON OK
git add data.json tips.json && git commit -m "Daily update $(TZ=Australia/Sydney date +%F)" && git push
```

Example tip entry (`game` is free text; the known icons are GTA 🚗, Roblox 🧱, Fortnite 🏗️, and any other game gets 🎮):
```json
{ "date": "2026-09-27", "game": "Roblox", "title": "Short catchy title", "tip": "One or two kid-safe sentences." }
```
Tip rules: GTA = driving, racing, cars, exploring and customising only (no crime, violence, weapons or police). Fortnite = building, editing, Creative, storm and rotation. Keep everything accurate and generic, with no external links.

## Add a win
1. Add an entry to the `wins` array in `data.json` (order doesn't matter; the page sorts newest first):
   ```json
   { "date": "2026-09-27", "emoji": "🏀", "category": "hoops", "points": 15, "text": "Shot 50 hoops in the backyard" }
   ```
   `category` must be one of `home`, `reading`, `hoops`, `school`, `kindness`, `active` (hikes, bike rides, sport adventures), `challenge` 🧠 (daily challenge answers: +5 each correct, +10 good reading), or `respect` (negative points only).
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
- `categories{}`: key -> `{ label, emoji, color, deduction? }` (`deduction: true` = no badge / not shown as an earning category)
- `cashout`: `{ points: 1000, reward: 50, currency: "USD" }`
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
node -e 'const s=require("./scoreboard.js");const r=s.compute(require("./data.json"),"2026-09-28");console.log(r.total,r.level.name,r.streak,r.cash)'
```

## Daily Challenge (added 2026-09-28): `challenges.html` + `challenges.json`
Page: https://buzzhq.github.io/challenges.html — shows the set whose `date` = today (Sydney) big and clear (or the latest set, with "a fresh set lands this afternoon"), a "How to answer" box, and older days collapsed below. Append-only.

Daily set (appended by the afternoon routine), ids per day `dc1`..`dc5`:
1. `dc1` `mult`: 3-4 digit × 2-digit, vertical layout, 1-2 blanks (A/B)
2. `dc2` `div`: long division bus stop, 1-2 blanks (A/B)
3. `dc3`, `dc4` `hebrew`: one letter each, 4 sound choices a-d (standard Israeli sounds, unambiguous distractors), cycling the whole alphabet
4. `dc5` `reading`: 3-4 fun, kid-safe ENGLISH sentences to read aloud as a WhatsApp voice note (+10)

**Answers live OUTSIDE the repo** in `/workspace/alon/challenge-answers.json` (`answers[date][id]` = `{parts:{A,B}}` or `{choice}` + `hint`), together with the Hebrew letter tracker (`hebrew_tracker.done`) and difficulty notes. Never commit answers. Verify all arithmetic with python before publishing.

Schema `challenges[]`:
```json
{ "date": "2026-09-28", "id": "dc1", "type": "mult", "title": "Long multiplication", "prompt": "247 × 36 — fill in the missing digits A and B!",
  "worked": { "top": "247", "bottom": "36", "partials": ["1482", "7A10"], "result": "88B2", "lines": ["247 × 6 = 1482", "247 × 30 = 7A10", "1482 + 7A10 = 88B2"] }, "points": 5 }
{ "id": "dc2", "type": "div", "worked": { "divisor": "6", "dividend": "5838", "quotient": ["", "9", "A", "3"], "carries": ["", "5", "4", "B"], "lines": ["..."] }, "points": 5 }
{ "id": "dc3", "type": "hebrew", "letter": "ש", "choices": { "a": "m (like moon)", "b": "sh (like ship)", "c": "l (like lion)", "d": "r (like race)" }, "points": 5 }
{ "id": "dc5", "type": "reading", "text": "3-4 sentences…", "points": 10 }
```
In `worked`, any capital letter A/B/C… is rendered as a pink blank box. `carries[i]` is the small carry digit shown before dividend digit i.

Answer codes in Chuchu HQ (parse leniently: spacing/case): `dc1 A=4 B=8`, `dc3 c`, `dc 4b`; reading = voice note + `dc5`.
Reading check (offline): `/workspace/alon/check_reading.py <audio.ogg> "<expected text>"` (faster-whisper base.en, CPU int8; pass >= 85% word match). Voice notes go to `/workspace/alon/voice/`.
