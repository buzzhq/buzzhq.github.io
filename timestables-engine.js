// Buzz's Times-Tables warm-up engine (tt1). Added 27 Oct 2026. Pure JS: works in the browser (window.TablesEngine) and in node (require).
// A round = ~8 quick questions on 1-2 focus tables (+ up to 2 review facts from earlier tables), each with a picture
// (an ARRAY of emoji: `a` rows of `b`, or `a` equal GROUPS of `b`) and 3 tap options (the right product + 2 plausible mix-ups).
// Rounds are deterministic from the day's key, so the page, the node tests and tools/timestables.py all get the same questions.
// Finish code = codeFromHex(sha256(`${key}|${answerOf(round)}`)), answerOf = the products joined by "-" (same scheme as mg/hb/gr).
(function (root) {
  "use strict";
  // progression (tools/timestables.py uses the same list): 2, 5, 10, then 3, 4, then 6, 7, 8, 9, then mixed
  const STAGES = [[2], [5], [10], [3], [4], [3, 4], [6], [7], [6, 7], [8], [9], [8, 9], ["mixed"]];
  const ALL = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  // emoji theme per question: [emoji, singular, plural]
  const THEMES = [["🏀", "basketball", "basketballs"], ["🚗", "car", "cars"], ["⭐", "star", "stars"], ["🍪", "cookie", "cookies"],
    ["🐟", "fish", "fish"], ["🚀", "rocket", "rockets"], ["🍎", "apple", "apples"], ["🏎️", "race car", "race cars"],
    ["⚽", "ball", "balls"], ["🐶", "puppy", "puppies"], ["🧁", "cupcake", "cupcakes"], ["🚲", "bike", "bikes"]];

  // small seeded RNG (mulberry32) so a key always gives the same round
  function rngFrom(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // tables learned before a focus (for review questions)
  function before(tables) {
    if (tables.includes("mixed")) return [];
    const idx = STAGES.findIndex(s => s.length === tables.length && s.every(t => tables.includes(t)));
    const upto = idx < 0 ? STAGES.findIndex(s => s.some(t => tables.includes(t))) : idx;
    const seen = new Set(); STAGES.slice(0, Math.max(0, upto)).forEach(s => s.forEach(t => { if (t !== "mixed" && !tables.includes(t)) seen.add(t); }));
    return [...seen];
  }

  // two plausible wrong answers for a × b (counted in rows/groups of b): one "one row too many / too few" slip
  // plus one other typical mix-up (neighbouring fact, digits swapped, added instead of multiplied), so the
  // right answer is not always the middle number
  function distractors(a, b, rng) {
    const p = a * b, ok = v => Number.isInteger(v) && v > 0 && v <= 110 && v !== p;
    const rowSlip = shuffle(rng, [{ v: p + b, why: `That's ${a + 1} × ${b}: one ${b} too many. Skip-count again!` },
      { v: p - b, why: `That's ${a - 1} × ${b}: one ${b} short. Skip-count again!` }]).filter(c => ok(c.v));
    const first = rowSlip[0];
    const other = [];
    if (a !== b) { other.push({ v: p + a, why: `Close! That's ${a} × ${b + 1}. Each row has ${b}.` }, { v: p - a, why: `Close! That's ${a} × ${b - 1}. Each row has ${b}.` }); }
    if (p >= 12 && p < 100 && p % 11 !== 0 && p % 10 !== 0) other.push({ v: Number(String(p).split("").reverse().join("")), why: `The digits got swapped around!` });
    if (a + b !== p && a > 2) other.push({ v: a + b, why: `That's ${a} + ${b} (adding). We need ${a} lots of ${b}.` });
    const near = [{ v: p + 2, why: `Nearly! Skip-count by ${b} again.` }, { v: p - 2, why: `Nearly! Skip-count by ${b} again.` }, { v: p + 1, why: `Just one off! Count again.` }, { v: p - 1, why: `Just one off! Count again.` }];
    const pool = [first].concat(shuffle(rng, other), shuffle(rng, near)).filter(c => c && ok(c.v));
    const out = [];
    for (const c of pool) { if (out.length < 2 && !out.some(o => o.v === c.v)) out.push(c); }
    return out;
  }

  // build a round. tables: e.g. [2] or [3,4] or ["mixed"]; key: the day's key (or any seed string); n: number of questions
  function buildRound(tables, key, n) {
    n = n || 8;
    const rng = rngFrom("tt|" + key + "|" + tables.join(","));
    const focus = tables.includes("mixed") ? ALL : tables.slice();
    const rev = before(tables), nRev = rev.length ? Math.min(2, Math.floor(n / 4)) : 0;
    const facts = [];
    const used = new Set();
    const addFact = (t) => {
      for (let tries = 0; tries < 50; tries++) {
        const m = 2 + Math.floor(rng() * 9); // 2..10 (×1 is too easy for a warm-up)
        const id = Math.min(m, t) + "x" + Math.max(m, t);
        if (used.has(id) && tries < 40) continue;
        used.add(id); facts.push({ a: m, b: t, table: t }); return;
      }
    };
    // spread the focus tables evenly
    for (let i = 0; i < n - nRev; i++) addFact(focus.length > 2 ? pick(rng, focus) : focus[i % focus.length]);
    for (let i = 0; i < nRev; i++) addFact(pick(rng, rev));
    const order = shuffle(rng, facts);
    const qs = order.map((f, i) => {
      const th = THEMES[Math.floor(rng() * THEMES.length)];
      const wrong = distractors(f.a, f.b, rng);
      const opts = shuffle(rng, [{ v: f.a * f.b, ok: true }].concat(wrong.map(w => ({ v: w.v, ok: false, hint: w.why }))));
      const view = rng() < 0.5 ? "groups" : "array";
      return { n: i + 1, a: f.a, b: f.b, table: f.table, answer: f.a * f.b, emoji: th[0], one: th[1], many: th[2], view,
        q: `${f.a} × ${f.b} = ?`, say: view === "groups" ? `${f.a} groups of ${f.b} ${th[2]}` : `${f.a} rows of ${f.b} ${th[2]}`,
        opts: opts.map(o => ({ label: String(o.v), value: o.v, ok: o.ok, hint: o.ok ? "" : o.hint })) };
    });
    return { tables: tables.slice(), focus, review: [...new Set(qs.filter(q => !focus.includes(q.table)).map(q => q.table))], questions: qs, answer: answerOf(qs) };
  }
  const answerOf = qs => qs.map(q => q.a * q.b).join("-");
  const counts = (a, b) => Array.from({ length: a }, (_, i) => (i + 1) * b); // "4, 8, 12"
  // the recap table for one table t: 1×t .. 10×t
  const tableOf = t => Array.from({ length: 10 }, (_, i) => ({ m: i + 1, t, p: (i + 1) * t }));
  const label = tables => tables.includes("mixed") ? "mixed tables (2-10)" : tables.map(t => `${t}×`).join(" + ") + " table" + (tables.length > 1 ? "s" : "");

  const CODE_TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"];
  const codeFromHex = h => CODE_TAGS[parseInt(h.slice(0, 2), 16) % 16] + String(parseInt(h.slice(2, 6), 16) % 90 + 10);
  const api = { STAGES, ALL, THEMES, buildRound, answerOf, counts, tableOf, label, distractors, before, rngFrom, codeFromHex, CODE_TAGS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TablesEngine = api;
})(typeof window !== "undefined" ? window : this);
