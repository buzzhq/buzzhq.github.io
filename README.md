# Chuchu Scoreboard (for Alon)

Static site with two pages: `index.html` (the scoreboard) and `tips.html` (Game Tips & Tricks).
Both pages are data-driven and **additive** (append-only, updated daily):
- **`data.json`**: scoreboard wins. The page adds up the total, level, progress bar and badges automatically.
- **`tips.json`**: game tips. The page groups them by game, shows newest first, and has filter buttons for each game.
- Any win or tip whose `date` equals today's date (Australia/Sydney) gets a **NEW / NEW TODAY** badge.

## Status
- Built and tested locally. **Not hosted yet.** On 2026-09-26 there was no authenticated GitHub route: `gh` is not logged in, there are no git credentials or SSH keys, and the GitHub connector needs auth.
- Live URLs: _TBD after hosting_ (planned: GitHub Pages, repo `buzz-hq-7k3`, giving `https://<user>.github.io/buzz-hq-7k3/` and `.../tips.html`).

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
   `category` must be one of `home`, `reading`, `hoops`, `school`, `kindness`.
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
- `categories{}`: key -> `{ label, emoji }`
- `wins[]`: `{ date: "YYYY-MM-DD", emoji, category: <category key>, points: number, text }`

## Local preview
`python3 -m http.server 8765` then open http://localhost:8765/ (a server is needed because the page uses fetch).

## One-time hosting setup (once gh is authenticated)
```bash
cd /workspace/alon/scoreboard
gh repo create buzz-hq-7k3 --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/buzz-hq-7k3/pages -f 'source[branch]=main' -f 'source[path]=/'
```
