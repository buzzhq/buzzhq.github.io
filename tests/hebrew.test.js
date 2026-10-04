// Run: node tests/hebrew.test.js   (checks every word in the Hebrew Word Rally bank, many shuffles each)
const H = require("../hebrew-engine.js"), fs = require("fs"), path = require("path");
let fails = 0, steps = 0; const fail = (w, m) => { fails++; console.error("FAIL", w, m); };
const HEB = /^[\u05D0-\u05EA]+$/, FINALS = "ךםןףץ", NONFINAL = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
// learned letters from the private tracker (if present), else the 12 done by 4 Oct 2026
let learned = ["ש", "מ", "ב", "ל", "ג", "ד", "ה", "נ", "ו", "ס", "ז", "ח"];
try { learned = JSON.parse(fs.readFileSync(path.join(__dirname, "../../challenge-answers.json"))).hebrew_tracker.done; } catch (e) {}
const seen = new Set();
for (const x of H.WORDS) {
  if (seen.has(x.w)) fail(x.w, "duplicate word"); seen.add(x.w);
  if (!HEB.test(x.w) || /[\u0591-\u05C7]/.test(x.w)) fail(x.w, "must be plain Hebrew letters, no nikud");
  const L = [...x.w];
  if (L.length < 2 || L.length > 4) fail(x.w, "length must be 2-4");
  if (x.parts.length !== L.length) fail(x.w, "parts length");
  if (x.parts.map(p => p[1]).join("") .replace("bb", "bb") !== x.tr) fail(x.w, `chunks ${x.parts.map(p => p[1]).join("")} != ${x.tr}`);
  L.forEach((c, i) => {
    if (!H.LETTERS[c]) fail(x.w, "no letter info for " + c);
    if (FINALS.includes(c) && i !== L.length - 1) fail(x.w, "final form not at the end");
    if (i === L.length - 1 && "כמנפצ".includes(c)) fail(x.w, "word must end with the final form of " + c);
    if (!H.SOUND[x.parts[i][0]]) fail(x.w, "unknown sound " + x.parts[i][0]);
  });
  const unknown = H.lettersOf(x.w).filter(c => !learned.includes(c));
  if (unknown.length > 1) fail(x.w, "more than one new letter: " + unknown);
  if (unknown.length === 1 && x.newLetter !== unknown[0]) fail(x.w, `new letter ${unknown[0]} not declared (newLetter=${x.newLetter})`);
  if (unknown.length === 0 && x.newLetter && learned.includes(x.newLetter) === false) fail(x.w, "declared new letter not in word");
  if (!x.en || !x.emoji || !x.clue || !x.fact) fail(x.w, "missing meaning/emoji/clue/fact");
  for (let k = 0; k < 200; k++) {
    const p = H.buildWord(x.w);
    if (p.steps.length !== L.length + 1) fail(x.w, "steps count");
    p.steps.forEach((s, i) => {
      steps++;
      if (s.opts.length !== 3) fail(x.w, `step ${i} has ${s.opts.length} options`);
      const right = s.opts.filter(o => o.ok);
      if (right.length !== 1) fail(x.w, `step ${i} correct count ${right.length}`);
      if (new Set(s.opts.map(o => o.label)).size !== 3 || new Set(s.opts.map(o => o.value)).size !== 3) fail(x.w, `step ${i} duplicate options`);
      s.opts.filter(o => !o.ok).forEach(o => { if (!o.hint || o.hint.length < 10) fail(x.w, `step ${i} wrong option without hint`); });
      if (s.kind === "letter") {
        if (s.ch !== L[i] || right[0].value !== x.parts[i][0]) fail(x.w, `step ${i} wrong letter/sound`);
        if (s.opts.some(o => !o.ok && o.label === H.SOUND[x.parts[i][0]])) fail(x.w, "distractor equals correct sound");
        // ambiguous letters: never offer the letter's OTHER real sound as a wrong answer
        if (L[i] === "ב" && s.opts.some(o => !o.ok && (o.value === "b" || o.value === "v"))) fail(x.w, "ב offered b/v as wrong");
        if (L[i] === "ש" && s.opts.some(o => !o.ok && o.value === "s")) fail(x.w, "ש offered s as wrong");
      } else {
        if (right[0].value !== x.en) fail(x.w, "meaning step");
      }
    });
    // playing every correct option reproduces the word + transliteration
    const built = p.steps.filter(s => s.kind === "letter").map(s => s.ch).join(""), tr = p.steps.filter(s => s.kind === "letter").map(s => s.chunk).join("");
    if (built !== x.w || tr !== x.tr || p.answer !== x.tr) fail(x.w, "playthrough mismatch");
  }
}
const daily = H.suitable(learned, 0).length, oneNew = H.suitable(learned, 1).length - daily;
console.log(`${H.WORDS.length} words (${daily} with only learned letters, ${oneNew} with one new letter), ${steps} steps checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
