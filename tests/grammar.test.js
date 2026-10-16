// Run: node tests/grammar.test.js   (checks every Sentence Detective question)
const G = require("../grammar-engine.js");
let fails = 0; const fail = (q, m) => { fails++; console.error("FAIL", q, m); };
// words that can easily be TWO parts of speech: never highlight these
const AMBIG = ["fast", "hard", "well", "late", "early", "home", "back", "up", "down", "out", "outside", "inside", "after", "before", "since", "like", "that", "her", "his", "straight", "yesterday", "today", "tomorrow", "right", "left", "near", "high", "low", "free", "close"];
const PRON = ["i", "you", "he", "she", "it", "we", "they", "me", "him", "us", "them"], PREP = ["under", "over", "through", "behind", "on", "in", "across", "into", "beside", "between"], CONJ = ["and", "but", "or", "because", "so"];
if (G.BANK.length < 60) fail("bank", "need 60+");
const ids = new Set(), sents = new Set(), count = {};
for (const q of G.BANK) {
  if (ids.has(q.id) || sents.has(q.s)) fail(q.id, "duplicate"); ids.add(q.id); sents.add(q.s);
  count[q.a] = (count[q.a] || 0) + 1;
  if ((q.s.match(/\*/g) || []).length !== 2) fail(q.id, "exactly one *highlight*");
  if (!G.DEF[q.a] || !q.tier) fail(q.id, "bad answer " + q.a);
  if (!/[.?!]$/.test(q.s) || !/^[*A-Z]/.test(q.s)) fail(q.id, "capital + end punctuation");
  if (!q.why || q.why.length < 10) fail(q.id, "missing why");
  const t = G.parse(q.s).target, tl = t.toLowerCase();
  if (AMBIG.includes(tl)) fail(q.id, "ambiguous target " + t);
  if (q.a === "pronoun" && !PRON.includes(tl)) fail(q.id, "pronoun list");
  if (q.a === "preposition" && !PREP.includes(tl)) fail(q.id, "preposition list");
  if (q.a === "conjunction" && !CONJ.includes(tl)) fail(q.id, "conjunction list");
  if (q.a === "adverb" && !/ly$/.test(tl) && !["soon", "always", "never"].includes(tl)) fail(q.id, "adverb: -ly or soon/always/never");
  if (q.tier === 3 && t.split(" ").length < 1) fail(q.id, "phrase");
  if (q.a === "subject" && G.parse(q.s).before !== "") fail(q.id, "subject at the start (simple sentences only)");
  if (q.a === "object" && !/^\.$/.test(G.parse(q.s).after)) fail(q.id, "object right at the end after the verb");
  if (q.tier < 3 && t.includes(" ")) fail(q.id, "word-class questions highlight ONE word");
  for (let k = 0; k < 300; k++) for (const mt of [1, 2, 3]) {
    const b = G.buildQuestion(q.id, Math.random, mt);
    if (b.opts.length !== 3) fail(q.id, "3 options");
    if (b.opts.filter(o => o.ok).length !== 1 || b.opts.find(o => o.ok).value !== q.a) fail(q.id, "one correct");
    if (new Set(b.opts.map(o => o.value)).size !== 3) fail(q.id, "dup options");
    b.opts.filter(o => !o.ok).forEach(o => {
      if (!o.hint) fail(q.id, "hint");
      if (q.tier < 3 && ["subject", "object"].includes(o.value)) fail(q.id, "word-class q offered subject/object (could also be true)");
      if (q.tier === 3 && ["noun", "pronoun"].includes(o.value)) fail(q.id, "subject/object q offered noun (also true!)");
      if (q.a === "pronoun" && o.value === "noun") fail(q.id, "pronoun q offered noun");
      if (G.TIER[o.value] > Math.max(q.tier, Math.min(mt, 2)) && q.tier < 3) fail(q.id, "distractor above level");
    });
  }
}
console.log(`${G.BANK.length} questions`, JSON.stringify(count), `${fails} failures`);
process.exit(fails ? 1 : 0);
