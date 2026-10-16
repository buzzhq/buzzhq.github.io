// Run: node tests/hebsentence.test.js   (checks every Hebrew SENTENCE in the bank, many shuffles each)
const H = require("../hebrew-engine.js"), fs = require("fs"), path = require("path");
let fails = 0, steps = 0; const fail = (s, m) => { fails++; console.error("FAIL", s, m); };
let learned = ["ש", "מ", "ב", "ל", "ג", "ד", "ה", "נ", "ו", "ס", "ז", "ח"];
try { learned = JSON.parse(fs.readFileSync(path.join(__dirname, "../../challenge-answers.json"))).hebrew_tracker.done; } catch (e) {}
const HEB = /^[\u05D0-\u05EA]+$/, FINALS = "ךםןףץ";
// real-world sound rules per letter: which sound keys are allowed
const ALLOWED = { "א": ["silent"], "ב": ["b", "v"], "ג": ["g"], "ד": ["d"], "ה": ["h", "end"], "ו": ["v", "o", "u"], "ז": ["z"], "ח": ["ch"], "י": ["y", "i"],
  "ל": ["l"], "מ": ["m"], "ם": ["m"], "נ": ["n"], "ס": ["s"], "ש": ["sh"] };
const ids = new Set(), texts = new Set(), ens = new Set();
if (H.SENTENCES.length < 20) fail("bank", "need at least 20 sentences");
for (const x of H.SENTENCES) {
  if (ids.has(x.id) || texts.has(x.text) || ens.has(x.en)) fail(x.text, "duplicate id/text/meaning"); ids.add(x.id); texts.add(x.text); ens.add(x.en);
  if (x.words.length < 2 || x.words.length > 4) fail(x.text, "2-4 words");
  if (/[\u0591-\u05C7]/.test(x.text)) fail(x.text, "no nikud");
  if (!x.en || !x.emoji || !x.fact) fail(x.text, "missing meaning/emoji/fact");
  x.words.forEach(w => {
    if (!w || !HEB.test(w.w)) return fail(x.text, "bad word " + (w && w.w));
    const L = [...w.w];
    if (w.parts.length !== L.length) fail(w.w, "parts length");
    if (w.parts.map(p => p[1]).join("") !== w.tr) fail(w.w, "chunks != tr");
    if (!w.en) fail(w.w, "word meaning missing");
    L.forEach((c, i) => {
      const snd = w.parts[i][0];
      if (!H.LETTERS[c]) fail(w.w, "no letter info " + c);
      if (!H.SOUND[snd]) fail(w.w, "unknown sound " + snd);
      if (!(ALLOWED[c] || []).includes(snd)) fail(w.w, `${c} can't say ${snd}`);
      if (FINALS.includes(c) && i !== L.length - 1) fail(w.w, "final form not at end");
      if (i === L.length - 1 && "כמנפצ".includes(c)) fail(w.w, "must end with final form");
      if (snd === "end" && i !== L.length - 1) fail(w.w, "quiet ה only at the end");
      if (snd === "i" && i !== L.length - 1) fail(w.w, "י as ee only at the end (in this bank)");
      if (c === "ב" && i === 0 && snd !== "b") fail(w.w, "ב at the start of a word says b");
      if (c === "ב" && i === L.length - 1 && snd !== "v") fail(w.w, "ב at the end of a word says v");
      if (c === "ה" && i === 0 && w.parts[i][1] !== "ha-") fail(w.w, "ה at the start here = 'the' (ha-)");
    });
  });
  const unknown = H.lettersOf(x.text.replace(/ /g, "")).filter(c => !learned.includes(c));
  if (unknown.length > 1) fail(x.text, "more than one new letter: " + unknown);
  if (unknown.length === 1 && x.newLetter !== unknown[0]) fail(x.text, `new letter ${unknown[0]} not declared`);
  if (x.tr !== x.words.map(w => w.tr).join(" ")) fail(x.text, "tr");
  for (let k = 0; k < 200; k++) {
    const p = H.buildSentence(x.text);
    const nL = x.words.reduce((s, w) => s + [...w.w].length, 0);
    if (p.steps.length !== nL + 1) fail(x.text, "step count");
    let intro = 0;
    p.steps.forEach((s, i) => {
      steps++;
      if (s.opts.length !== 3) fail(x.text, `step ${i} options`);
      const right = s.opts.filter(o => o.ok);
      if (right.length !== 1) fail(x.text, `step ${i} correct count`);
      if (new Set(s.opts.map(o => o.label)).size !== 3 || new Set(s.opts.map(o => o.value)).size !== 3) fail(x.text, `step ${i} dup options`);
      s.opts.filter(o => !o.ok).forEach(o => { if (!o.hint || o.hint.length < 10) fail(x.text, `step ${i} no hint`); });
      if (s.kind === "letter") {
        if (s.isNew) intro++;
        if (s.ch === "ב" && s.opts.some(o => !o.ok && (o.value === "b" || o.value === "v"))) fail(x.text, "ב offered b/v as wrong");
        if (s.ch === "ש" && s.opts.some(o => !o.ok && o.value === "s")) fail(x.text, "ש offered s as wrong");
        if (["o", "u", "i", "end", "silent"].includes(right[0].value) && !/Tricky|New letter/.test(s.q)) fail(x.text, "vowel/quiet letter without Tricky explanation");
        if (s.wordDone && !s.say.includes(x.words[s.wi].en)) fail(x.text, "word meaning not shown after word");
      } else if (right[0].value !== x.en) fail(x.text, "meaning step");
    });
    if (x.newLetter && intro !== 1) fail(x.text, "new letter should be introduced exactly once, got " + intro);
    const tr = x.words.map((w, wi) => p.steps.filter(s => s.kind === "letter" && s.wi === wi).map(s => s.chunk).join("")).join(" ");
    if (tr !== x.tr || p.answer !== x.tr) fail(x.text, "playthrough mismatch " + tr);
  }
}
const ok = H.suitableSentences(learned, 0).length;
console.log(`${H.SENTENCES.length} sentences (${ok} with only learned letters, ${H.suitableSentences(learned, 1).length - ok} with one new letter), ${steps} steps checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
