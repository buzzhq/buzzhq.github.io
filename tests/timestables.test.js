// Run: node tests/timestables.test.js   (checks the ✖️ times-tables warm-up engine)
const T = require("../timestables-engine.js");
const crypto = require("crypto");
let fails = 0; const fail = (w, m) => { fails++; if (fails < 40) console.error("FAIL", w, m); };
const STAGES = T.STAGES;
if (JSON.stringify(STAGES[0]) !== "[2]" || JSON.stringify(STAGES[1]) !== "[5]" || JSON.stringify(STAGES[2]) !== "[10]") fail("stages", "start 2,5,10");
if (STAGES[STAGES.length - 1][0] !== "mixed") fail("stages", "end mixed");
const order = STAGES.flat().filter(x => x !== "mixed"), firstSeen = [...new Set(order)];
if (firstSeen.join(",") !== "2,5,10,3,4,6,7,8,9") fail("stages", "progression order " + firstSeen);
let rounds = 0;
for (const tables of STAGES.concat([[2, 5], [9, 10], [4, 8]])) for (let k = 0; k < 400; k++) {
  const key = crypto.randomBytes(8).toString("hex"), r = T.buildRound(tables, key, 8); rounds++;
  const w = tables.join("+") + " " + key;
  if (r.questions.length !== 8) fail(w, "8 questions");
  const r2 = T.buildRound(tables, key, 8);
  if (JSON.stringify(r2) !== JSON.stringify(r)) fail(w, "deterministic per key");
  if (r.answer !== r.questions.map(q => q.a * q.b).join("-")) fail(w, "answer string");
  const facts = new Set();
  const rev = T.before(tables);
  let nFocus = 0;
  for (const q of r.questions) {
    if (q.a < 2 || q.a > 10 || q.b < 2 || q.b > 10) fail(w, `range ${q.a}x${q.b}`);
    if (q.answer !== q.a * q.b) fail(w, "product");
    const f = Math.min(q.a, q.b) + "x" + Math.max(q.a, q.b); if (facts.has(f) && tables[0] !== "mixed") fail(w, "repeat " + f); facts.add(f);
    const focus = tables.includes("mixed") ? T.ALL : tables;
    if (focus.includes(q.b)) nFocus++; else if (!rev.includes(q.b)) fail(w, "table not focus/review " + q.b);
    if (q.opts.length !== 3) fail(w, "3 options");
    if (q.opts.filter(o => o.ok).length !== 1 || q.opts.find(o => o.ok).value !== q.answer) fail(w, "one right");
    if (new Set(q.opts.map(o => o.value)).size !== 3) fail(w, "distinct options");
    for (const o of q.opts) {
      if (!Number.isInteger(o.value) || o.value < 1 || o.value > 110) fail(w, "option range " + o.value);
      if (!o.ok && (!o.hint || o.hint.length < 8)) fail(w, "wrong options need a hint");
      if (!o.ok && Math.abs(o.value - q.answer) > Math.max(q.a, q.b) * 1 + 2 && o.value !== q.a + q.b && String(o.value) !== String(q.answer).split("").reverse().join("")) fail(w, `implausible ${o.value} for ${q.q}`);
    }
    if (!q.opts.some(o => !o.ok && (o.value === q.answer + q.b || o.value === q.answer - q.b))) fail(w, "a one-row slip distractor");
    if (!["groups", "array"].includes(q.view) || !q.emoji || !q.many) fail(w, "visual spec");
    if (T.counts(q.a, q.b).length !== q.a || T.counts(q.a, q.b)[q.a - 1] !== q.answer) fail(w, "skip counting");
  }
  if (nFocus < 6) fail(w, "at least 6 focus questions, got " + nFocus);
  if (tables[0] === 2 && tables.length === 1 && nFocus !== 8) fail(w, "first stage has no review");
}
// right answer is not always the middle number (distractor mix)
let mid = 0, tot = 0;
for (let k = 0; k < 300; k++) for (const q of T.buildRound([7], "m" + k, 8).questions) { const v = q.opts.map(o => o.value).sort((a, b) => a - b); tot++; if (v[1] === q.answer) mid++; }
if (mid / tot > 0.75) fail("distractors", `answer is the middle value ${Math.round(100 * mid / tot)}% of the time`);
// recap table + labels
if (T.tableOf(7).map(r => r.p).join(",") !== "7,14,21,28,35,42,49,56,63,70") fail("tableOf", "7s");
if (T.label([3, 4]) !== "3× + 4× tables" || T.label([2]) !== "2× table") fail("label", T.label([3, 4]));
// code scheme parity with tools/_daily.py
const sha = s => crypto.createHash("sha256").update(s).digest("hex");
if (T.codeFromHex(sha("abc|10-4")) !== (() => { const h = sha("abc|10-4"); return T.CODE_TAGS[parseInt(h.slice(0, 2), 16) % 16] + (parseInt(h.slice(2, 6), 16) % 90 + 10); })()) fail("code", "scheme");
const { execSync } = require("child_process");
try {
  const py = execSync(`python3 -c "import sys;sys.path.insert(0,'${__dirname}/../tools');from _daily import code;print(code('abc','10-4-20'))"`).toString().trim();
  if (py !== T.codeFromHex(sha("abc|10-4-20"))) fail("code", `python ${py} != js`);
} catch (e) { fail("code", "python parity check could not run: " + e.message); }
console.log(fails ? `${fails} FAILURES` : `OK: ${rounds} rounds checked (${STAGES.length} stages)`);
process.exit(fails ? 1 : 0);
