# Chuchu Scoreboard (for Alon)

Static site with two pages: `index.html` (the scoreboard) and `tips.html` (Game Tips & Tricks).
Both pages are data-driven and **additive** (append-only, updated daily):
- **`data.json`**: scoreboard wins. The page adds up the total, level, progress bar and badges automatically.
- **`tips.json`**: game tips. The page groups them by game, shows newest first, and has filter buttons for each game.
- Any win or tip whose `date` equals today's date (Australia/Sydney) gets a **NEW / NEW TODAY** badge.

## Status
- LIVE on GitHub Pages: https://buzzhq.github.io/ and https://buzzhq.github.io/tips.html (repo `buzzhq/buzzhq.github.io`, branch `main`, `gh` authenticated as buzzhq). Pages keep `noindex` and first name only.
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
   `category` must be one of `home`, `reading`, `hoops`, `school`, `kindness`, `active` (hikes, bike rides, sport adventures), or `respect` (negative points only).
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
