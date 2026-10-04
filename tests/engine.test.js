// Run: node tests/engine.test.js   (checks the Maths Garage step engine over thousands of random problems)
const E = require("../maths-engine.js");
let seed = 12345; const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let fails = 0, problems = 0, stepsN = 0;
const fail = (p, msg) => { if (fails++ < 30) console.error("FAIL", p.kind, p.a, p.b, msg); };

function play(p) {
  // apply only the CORRECT option's writes, in order, like a kid who always picks right
  const cells = {};
  p.steps.forEach((s, i) => {
    stepsN++;
    if (!s.q || !Array.isArray(s.opts)) return fail(p, `step ${i} malformed`);
    if (s.opts.length !== 3) fail(p, `step ${i} (${s.kind}) has ${s.opts.length} options: ${s.q}`);
    const right = s.opts.filter(o => o.ok);
    if (right.length !== 1) fail(p, `step ${i} has ${right.length} correct options`);
    const r = right[0];
    const labels = new Set(s.opts.map(o => o.label)), values = new Set(s.opts.map(o => String(o.value)));
    if (labels.size !== 3 || values.size !== 3) fail(p, `step ${i} duplicate options ${s.opts.map(o => o.label)}`);
    s.opts.filter(o => !o.ok).forEach(o => {
      if (o.label === r.label || String(o.value) === String(r.value)) fail(p, `step ${i} distractor equals correct`);
      if (!o.hint || o.hint.length < 10) fail(p, `step ${i} distractor without hint`);
      if (typeof o.value === "number" && (o.value < 0 || !Number.isInteger(o.value))) fail(p, `step ${i} bad distractor ${o.value}`);
    });
    // independent arithmetic check of the correct option for number steps
    if (s.kind === "fact" && r.value !== s.meta.x * s.meta.m + s.meta.carry) fail(p, `step ${i} fact wrong`);
    if (s.kind === "howmany" && r.value !== Math.floor(s.meta.cur / s.meta.d)) fail(p, `step ${i} howmany wrong`);
    if (s.kind === "left" && r.value !== s.meta.cur - s.meta.qd * s.meta.d) fail(p, `step ${i} left wrong`);
    s.writes.forEach(w => { (cells[w.r] = cells[w.r] || {})[w.c] = w.v; });
  });
  return cells;
}
const rowNum = row => Number(Object.keys(row || {}).map(Number).sort((x, y) => y - x).map(c => row[c]).join("") || NaN);

function checkMult(p) {
  problems++;
  const cells = play(p), B = String(p.b).split("").reverse().map(Number);
  if (rowNum(cells.p0) !== p.a * B[0]) fail(p, `row 1 = ${rowNum(cells.p0)}`);
  if (B.length === 2 && rowNum(cells.p1) !== p.a * B[1] * 10) fail(p, `row 2 = ${rowNum(cells.p1)}`);
  const res = rowNum(cells[p.resultRow]);
  if (res !== p.a * p.b || p.answer !== String(p.a * p.b)) fail(p, `result ${res} != ${p.a * p.b}`);
  // every partial-product cell is a single digit
  ["p0", "p1", "tot", "c0", "c1"].forEach(r => Object.values(cells[r] || {}).forEach(v => { if (!/^\d$/.test(v)) fail(p, `cell ${r}=${v}`); }));
}
function checkDiv(p) {
  problems++;
  const cells = play(p), n = String(p.a).length;
  const q = Number(Array.from({ length: n }, (_, i) => (cells.q || {})[i] || "").join(""));
  const rem = Number((cells.rem || {})[0] || 0);
  if (q !== Math.floor(p.a / p.b)) fail(p, `quotient ${q} != ${Math.floor(p.a / p.b)}`);
  if (rem !== p.a % p.b) fail(p, `remainder ${rem} != ${p.a % p.b}`);
  if (p.answer !== (rem ? `${q}r${rem}` : String(q))) fail(p, `answer string ${p.answer}`);
  Object.values(cells.q || {}).forEach(v => { if (!/^\d$/.test(v)) fail(p, `quotient cell ${v}`); });
}

// 1) random problems at every level
for (const kind of ["mult", "div"]) E.LEVELS[kind].forEach((L, lvl) => {
  for (let k = 0; k < 1500; k++) { const p = E.randomProblem(kind, lvl, rng); kind === "mult" ? checkMult(p) : checkDiv(p); }
});
// 2) exhaustive-ish sweeps incl. awkward numbers (zeros in the middle, 9s, carries everywhere)
for (let a = 10; a <= 9999; a += (a < 1000 ? 7 : 97)) for (const b of [2, 3, 7, 9, 12, 24, 36, 47, 89, 99]) checkMult(E.buildMult(a, b, rng));
for (const a of [100, 101, 105, 909, 1000, 1001, 9999, 7070]) for (const b of [9, 19, 91, 99]) checkMult(E.buildMult(a, b, rng));
for (let a = 10; a <= 9999; a += (a < 1000 ? 3 : 41)) for (const d of [2, 3, 4, 6, 7, 9, 11, 12, 15, 23, 25, 30, 47]) if (a >= d * 2) checkDiv(E.buildDiv(a, d, rng));
// 3) the seeded daily problems
[[318, 24], [852, 4]].forEach(([a, b], i) => i ? checkDiv(E.buildDiv(a, b)) : checkMult(E.buildMult(a, b)));
if (E.buildMult(318, 24).answer !== "7632" || E.buildDiv(852, 4).answer !== "213") fail({}, "seed answers");
// 4) code function matches tools/stepgame.py (known vector)
const crypto = require("crypto");
const key = "testkey123", hex = crypto.createHash("sha256").update(`${key}|7632`).digest("hex");
console.log("code vector:", key, "7632 ->", E.codeFromHex(hex));

console.log(`${problems} problems, ${stepsN} steps checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
