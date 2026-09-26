# Chuchu Scoreboard (for Alon)

Static site with two pages: `index.html` (the scoreboard) and `tips.html` (Game Tips & Tricks).
All scoreboard data is stored in **`data.json`**. The page adds up the total points, level, progress bar and badges automatically.

## Status
- Built and tested locally. **Not hosted yet.** On 2026-09-26 there was no authenticated GitHub route: `gh` is not logged in, there are no git credentials or SSH keys, and the GitHub connector needs auth.
- Live URLs: _TBD after hosting_ (planned: GitHub Pages, repo `buzz-hq-7k3`, giving `https://<user>.github.io/buzz-hq-7k3/` and `.../tips.html`).

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
   git add data.json && git commit -m "Add win: <short text>" && git push
   ```
   GitHub Pages usually updates within about 1 minute. The page fetches `data.json` with a cache-buster.

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
