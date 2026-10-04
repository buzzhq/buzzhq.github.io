/* Buzz's Maths Garage step engine (added 4 Oct 2026).
   Pure functions, no DOM: used by maths.html (browser) and tests/engine.test.js (node).
   buildMult(a, b) / buildDiv(a, d) return { kind, a, b, answer, rows, steps }.
   Each step: { kind, q, opts: [{label, value, ok, hint}], writes: [{r, c, v}], focus: [[r, c]], say, tool }
   - exactly one opt has ok: true; wrong opts carry a gentle hint explaining the typical mistake
   - writes are applied to the working when the step is answered correctly
   Mult rows: "c1","c0" (carries, col = place from the right), "top","bot","p0","p1","tot".
   Div rows: "q" (quotient digit above dividend index), "cy" (small carried remainder before dividend index), "rem". */
(function (root) {
  "use strict";
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const digitsR = n => String(n).split("").reverse().map(Number); // [ones, tens, ...]
  const lead = n => { const s = String(n), p = Math.pow(10, s.length - 1); return Math.round(n / p) * p; };
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

  // keep the first `n` candidates whose value/label differs from the right answer and from each other
  function finish(right, cands, n) {
    const seen = new Set([String(right.value)]), labels = new Set([right.label]), out = [];
    for (const c of cands) {
      if (out.length >= n) break;
      if (c.value === undefined || c.value === null || (typeof c.value === "number" && (c.value < 0 || !isFinite(c.value)))) continue;
      const lab = c.label !== undefined ? c.label : fmt(c.value);
      if (seen.has(String(c.value)) || labels.has(lab)) continue;
      seen.add(String(c.value)); labels.add(lab);
      out.push({ label: lab, value: c.value, ok: false, hint: c.hint });
    }
    return [right, ...out];
  }
  const num = (v, hint) => ({ value: v, label: fmt(v), hint });
  const countUp = (x, m) => { const l = []; for (let k = 1; k < m; k++) l.push(fmt(k * x)); return l; };

  // ---------- multiplication ----------
  function factOpts(x, m, c, rng) {
    const v = x * m + c, plusC = c ? `, then add the carry ${c}` : "";
    const ups = x > 0 && m > 1 ? `Count up in ${x}s: ${countUp(x, m).join(", ")}… what's the next one?` : (x === 0 ? `Zero lots of anything is 0${plusC}.` : `${m === 1 ? "Anything × 1 stays the same" : `Try ${x} × ${m} again`}${plusC}.`);
    const first = [], table = [];
    if (c) first.push(num(x * m, `So close! Don't forget the carry ${c} sitting above. Work out ${x} × ${m} first, then add the ${c}.`));
    if (x === 0) first.push(num(m + c, `Careful: 0 × ${m} is 0 (zero lots of anything is zero)${plusC}.`));
    table.push(num(x * (m + 1) + c, `That's ${x} × ${m + 1}${c ? " plus the carry" : ""}: one jump too many. ${ups}`));
    if (m > 1) table.push(num(x * (m - 1) + c, `That's ${x} × ${m - 1}${c ? " plus the carry" : ""}: one jump short. ${ups}`));
    if (x > 0) table.push(num((x + 1) * m + c, `That's ${x + 1} × ${m}${c ? " plus the carry" : ""}. We need ${x} × ${m}. ${ups}`));
    if (x > 1) table.push(num((x - 1) * m + c, `That's ${x - 1} × ${m}${c ? " plus the carry" : ""}. We need ${x} × ${m}. ${ups}`));
    if (!c && x > 1 && m > 1) table.push(num(x + m, `That's ${x} + ${m}. We need to times, not add! ${ups}`));
    // shuffle the times-table slips so the same mistake isn't always shown
    for (let i = table.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [table[i], table[j]] = [table[j], table[i]]; }
    const extra = [num(v + 1, `Just off by one. ${ups}`), num(v - 1, `Just off by one. ${ups}`), num(v + 10, `Too big. ${ups}`)];
    return finish({ label: fmt(v), value: v, ok: true }, [...first, ...table, ...extra], 2);
  }

  function buildMult(a, b, rng) {
    rng = rng || Math.random;
    const A = digitsR(a), B = digitsR(b), steps = [];
    if (B.length === 2) {
      const ra = lead(a), rb = lead(b), est = ra * rb;
      steps.push({
        kind: "estimate", q: `Warm up the engine! About how big will ${fmt(a)} × ${b} be? (Think ${fmt(ra)} × ${rb})`,
        opts: finish({ label: `About ${fmt(est)}`, value: est, ok: true }, [
          { value: est / 10, label: `About ${fmt(est / 10)}`, hint: `Too small! ${fmt(ra)} × ${rb / 10} = ${fmt(ra * rb / 10)}, but it's × ${rb}, so that's 10 times bigger.` },
          { value: est * 10, label: `About ${fmt(est * 10)}`, hint: `Too big! ${fmt(ra)} × ${rb} is ${fmt(ra)} × ${rb / 10}, then × 10. Count the zeros carefully.` }], 2),
        writes: [], focus: [], say: `${fmt(ra)} × ${rb} = ${fmt(est)}, so the answer should be about ${fmt(est)}. Let's go!`
      });
    }
    B.forEach((m, j) => {
      const P = "p" + j, C = "c" + j;
      let carry = 0;
      if (j === 1) {
        const firstDigit = (A[0] * m) % 10;
        steps.push({
          kind: "zero", q: `Row 2: now we times by the ${m}. It's in the tens place, so it's really ${m * 10}! What goes in the ones column first?`,
          opts: finish({ label: "A 0 (placeholder zero)", value: "zero", ok: true }, [
            { value: "start", label: `${A[0]} × ${m} = ${A[0] * m}, write the ${firstDigit}`, hint: `Wait! The ${m} is really ${m * 10}. Timesing by ${m * 10} always ends in a 0, so put a 0 placeholder in the ones column first.` },
            { value: "digit", label: `Write a ${m}`, hint: `Close: the ${m} tells us we're timesing by ${m * 10}, but we write a 0 placeholder, not a ${m}.` },
            { value: "copy", label: `Copy the ${A[0]} from the top`, hint: `We don't copy digits down. The ${m} is really ${m * 10}, so this row starts with a 0 placeholder.` }], 2),
          writes: [{ r: P, c: 0, v: "0" }], focus: [["bot", 1]],
          say: `A 0 placeholder, because × ${m * 10} = × ${m} × 10.`
        });
      }
      A.forEach((x, i) => {
        const col = i + j, v = x * m + carry, last = i === A.length - 1;
        const q = carry ? `What's ${x} × ${m}, plus the carry ${carry}?` : `What's ${x} × ${m}?`;
        const focus = [["top", i], ["bot", j]].concat(carry ? [[C, i]] : []);
        const sayBase = carry ? `${x} × ${m} = ${x * m}, + ${carry} = ${v}` : `${x} × ${m} = ${v}`;
        if (v < 10) {
          steps.push({ kind: "fact", q, opts: factOpts(x, m, carry, rng), writes: [{ r: P, c: col, v: String(v) }], focus, say: `${sayBase}. Write the ${v}.`, meta: { x, m, carry } });
          carry = 0;
          return;
        }
        steps.push({ kind: "fact", q, opts: factOpts(x, m, carry, rng), writes: [], focus, say: `${sayBase}.`, meta: { x, m, carry } });
        const o = v % 10, t = Math.floor(v / 10);
        if (!last) {
          const cands = [];
          if (o !== t) cands.push({ value: "swap", label: `Write ${t}, carry ${o}`, hint: `Other way round! The ones digit (${o}) stays in this column, and the tens digit (${t}) carries to the next column.` });
          const more = [
            { value: "whole", label: `Write ${v} here`, hint: `Only one digit fits in each column! Write the ones digit and carry the tens to the next column.` },
            { value: "drop", label: `Write ${o}, no carry`, hint: `Don't lose the ${t}! ${v} is ${t} tens and ${o} ones, so the ${t} carries to the next column.` }];
          if (rng() < 0.5) more.reverse();
          steps.push({
            kind: "carry", q: `${v}: what do we write, and what do we carry?`,
            opts: finish({ label: `Write ${o}, carry ${t}`, value: "ok", ok: true }, cands.concat(more), 2),
            writes: [{ r: P, c: col, v: String(o) }, { r: C, c: i + 1, v: String(t) }], focus: [[P, col]],
            say: `Write the ${o}, carry the ${t} to the next column.`
          });
          carry = t;
        } else {
          steps.push({
            kind: "lastwrite", q: `${v}, and that was the last digit in this row. What do we write?`,
            opts: finish({ label: `Write ${v}`, value: "ok", ok: true }, [
              { value: "ones", label: `Write just ${o}`, hint: `There's nothing left to times, so the ${t} has nowhere to carry to. Write the whole ${v}!` },
              { value: "tens", label: `Write just ${t}`, hint: `We need both digits! This is the last digit in the row, so write the whole ${v}.` },
              { value: "carry", label: `Write ${o}, carry ${t}`, hint: `There's no next digit to carry to, so the ${t} just goes in front. Write the whole ${v}.` }], 2),
            writes: [{ r: P, c: col, v: String(o) }, { r: P, c: col + 1, v: String(t) }], focus: [[P, col]],
            say: `Write ${v}. Row ${j + 1} done!`
          });
          carry = 0;
        }
      });
    });
    const p0 = a * B[0];
    if (B.length === 2) {
      const p1 = a * B[1] * 10, v = p0 + p1;
      const noCarry = Number(String(Math.max(p0, p1)).split("").map((_, k, arr) => {
        const pos = arr.length - 1 - k; const d0 = Math.floor(p0 / Math.pow(10, pos)) % 10, d1 = Math.floor(p1 / Math.pow(10, pos)) % 10; return (d0 + d1) % 10;
      }).join(""));
      const cand = [
        num(p0 + a * B[1], `Watch the placeholder zero! The second row is ${fmt(p1)} (with its 0), not ${fmt(a * B[1])}. Line up the columns and add again.`),
        num(noCarry, `Nearly! Don't forget to carry when a column adds up to 10 or more. Add column by column from the ones.`),
        num(v + 1000, `A carry has jumped into the wrong column. Add column by column from the ones, carrying when you get 10 or more.`),
        num(v - 100, `Check your carries: add column by column from the ones.`),
        num(v + 10, `Check the tens column again, and add from the ones.`)];
      steps.push({
        kind: "add", q: `Now add the two rows: ${fmt(p0)} + ${fmt(p1)} = ?`,
        opts: finish({ label: fmt(v), value: v, ok: true }, cand, 2),
        writes: String(v).split("").reverse().map((ch, c) => ({ r: "tot", c, v: ch })), focus: [["p0", -1], ["p1", -1]],
        say: `${fmt(p0)} + ${fmt(p1)} = ${fmt(v)}`
      });
    }
    return { kind: "mult", a, b, answer: String(a * b), rows: B.length === 2 ? ["c1", "c0", "top", "bot", "p0", "p1", "tot"] : ["c0", "top", "bot", "p0"], resultRow: B.length === 2 ? "tot" : "p0", steps };
  }

  // ---------- division (bus stop / short division) ----------
  function buildDiv(a, d, rng) {
    rng = rng || Math.random;
    const D = String(a).split("").map(Number), n = D.length, steps = [];
    const multiples = d >= 10 ? Array.from({ length: 9 }, (_, k) => `${k + 1} × ${d} = ${(k + 1) * d}`) : null;
    let k = 0, cur = D[0];
    while (cur < d && k < n - 1) { k++; cur = cur * 10 + D[k]; }
    if (k > 0) {
      const pre = Number(String(a).slice(0, k));
      steps.push({
        kind: "start", q: `${d} won't fit into ${pre}, it's too small. So which number do we divide first?`,
        opts: finish({ label: fmt(cur), value: cur, ok: true }, [
          num(D[k], `Don't skip the ${String(a).slice(0, k)}! Team it up with the next digit to make a bigger number.`),
          num(pre, `${d} can't go into ${pre}: ${pre} is smaller than ${d}. Take one more digit.`),
          num(Number(String(a).slice(0, k + 2)), `Too many digits! Only take as many as you need so ${d} fits.`),
          num(pre + D[k], `We don't add the digits together. Team them up side by side to make a bigger number.`),
          num(cur + 1, `Look carefully at the big number: just put the next digit beside the ${pre}.`)], 2),
        writes: [], focus: Array.from({ length: k + 1 }, (_, i) => ["dd", i]), say: `${d} goes into ${fmt(cur)}. Start there!`
      });
    }
    let r = 0;
    for (let i = k; i < n; i++) {
      if (i > k) {
        const nd = D[i];
        cur = r * 10 + nd;
        if (r > 0) {
          steps.push({
            kind: "bring", q: `${r} left over! It hops in front of the next digit, ${nd}. What do we divide now?`,
            opts: finish({ label: fmt(cur), value: cur, ok: true }, [
              num(nd, `Don't forget the ${r} left over! It sits in front of the ${nd}, like tens and ones.`),
              num(r + nd, `We don't add them. The ${r} goes in FRONT of the ${nd}, making a bigger number.`),
              num(nd * 10 + r, `Other way round! The ${r} left over goes in front of the ${nd}.`)], 2),
            writes: [{ r: "cy", c: i, v: String(r) }], focus: [["dd", i]], say: `${r} hops in front of ${nd}: now we have ${fmt(cur)}.`
          });
        } else {
          steps.push({
            kind: "bring", q: `Nothing left over. What do we divide next?`,
            opts: finish({ label: String(nd), value: nd, ok: true }, [
              ...(i + 1 < n ? [num(D[i + 1], `Don't skip a digit! We go one digit at a time, left to right: the next one is right after the last one we used.`)] : []),
              num(10 + nd, `There's nothing left over this time, so there's nothing to put in front. Just the next digit!`),
              num(nd * 10, `Nothing was left over, so we just use the next digit by itself.`),
              ...(i > 0 ? [num(D[i - 1], `We already used that digit. Move one digit to the right.`)] : []),
              num(nd + 1, `Look carefully at the big number: the next digit is right after the one we just used.`),
              num(nd + 2, `Look carefully at the big number: the next digit is right after the one we just used.`)], 2),
            writes: [], focus: [["dd", i]], say: `Nothing left over, so we just use the ${nd}.`
          });
        }
      }
      const qd = Math.floor(cur / d), r2 = cur - qd * d;
      const over = x => num(x, `Too many! ${x} × ${d} = ${fmt(x * d)}, which is bigger than ${fmt(cur)}.`);
      const under = x => num(x, `You can fit one more! ${x} × ${d} = ${fmt(x * d)}, and ${fmt(cur)} − ${fmt(x * d)} = ${cur - x * d}, still enough for another ${d}.`);
      const qc = qd === 0 ? [over(1), over(2)] : (rng() < 0.5 ? [over(qd + 1), under(qd - 1)] : [under(qd - 1), over(qd + 1)]);
      const lastHere = i === n - 1;
      const writes = [{ r: "q", c: i, v: String(qd) }];
      steps.push({
        kind: "howmany", q: `How many times does ${d} go into ${fmt(cur)}?`,
        opts: finish({ label: String(qd), value: qd, ok: true }, qc.concat([over(qd + 2)]), 2),
        writes, focus: [["dv", 0], ["dd", i]].concat(i > k && r > 0 ? [["cy", i]] : []), tool: multiples,
        say: qd === 0 ? `${d} doesn't fit into ${cur}, so write a 0 on top.` : `${qd} × ${d} = ${fmt(qd * d)}${(qd + 1) * d > cur ? `, and ${qd + 1} × ${d} = ${fmt((qd + 1) * d)} is too big` : ""}. Write ${qd} on top.`,
        meta: { cur, d }
      });
      if (d >= 10 || r2 > 0) {
        const rc = [num(r2 + 1, `Check the take-away: ${fmt(cur)} − ${fmt(qd * d)}. Count up from ${fmt(qd * d)} to ${fmt(cur)}.`)];
        if (r2 > 0) rc.push(num(r2 - 1, `Check the take-away: ${fmt(cur)} − ${fmt(qd * d)}. Count up from ${fmt(qd * d)} to ${fmt(cur)}.`));
        rc.push(num(r2 + 10, `Careful with the take-away: ${fmt(cur)} − ${fmt(qd * d)}. Count up from ${fmt(qd * d)} to ${fmt(cur)}.`));
        rc.push(num(r2 + 2, `Check the take-away: count up from ${fmt(qd * d)} to ${fmt(cur)}.`));
        steps.push({
          kind: "left", q: `${qd} × ${d} = ${fmt(qd * d)}. What's left over? ${fmt(cur)} − ${fmt(qd * d)} = ?`,
          opts: finish({ label: String(r2), value: r2, ok: true }, rc, 2),
          writes: lastHere && r2 > 0 ? [{ r: "rem", c: 0, v: String(r2) }] : [], focus: [["q", i]],
          say: r2 === 0 ? `Nothing left over!` : (lastHere ? `${r2} left over, and no digits left, so it's the remainder: r ${r2}.` : `${r2} left over.`),
          meta: { cur, qd, d }
        });
      }
      r = r2;
    }
    const q = Math.floor(a / d), rem = a % d;
    return { kind: "div", a, b: d, answer: rem ? `${q}r${rem}` : String(q), quotient: q, remainder: rem, rows: ["q", "dd"], steps };
  }

  // ---------- levels for practice mode ----------
  const LEVELS = {
    mult: [
      { name: "2-digit × 1-digit", a: [10, 99], b: [2, 9] },
      { name: "3-digit × 1-digit", a: [100, 999], b: [2, 9] },
      { name: "4-digit × 1-digit", a: [1000, 9999], b: [2, 9] },
      { name: "2-digit × 2-digit", a: [10, 99], b: [11, 99] },
      { name: "3-digit × 2-digit", a: [100, 999], b: [11, 99] },
      { name: "4-digit × 2-digit", a: [1000, 9999], b: [11, 99] }],
    div: [
      { name: "2-digit ÷ 1-digit", a: [12, 99], d: [2, 9], exact: true },
      { name: "3-digit ÷ 1-digit", a: [100, 999], d: [2, 9], exact: true },
      { name: "3-digit ÷ 1-digit, remainders", a: [100, 999], d: [3, 9] },
      { name: "4-digit ÷ 1-digit", a: [1000, 9999], d: [3, 9] },
      { name: "3-digit ÷ 2-digit", a: [130, 999], d: [11, 25], exact: true },
      { name: "4-digit ÷ 2-digit", a: [1000, 9999], d: [11, 30] }]
  };
  const rint = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));
  function randomProblem(kind, level, rng) {
    rng = rng || Math.random;
    const L = LEVELS[kind][level];
    if (kind === "mult") {
      let a, b;
      do { a = rint(L.a[0], L.a[1], rng); b = rint(L.b[0], L.b[1], rng); } while (/0/.test(String(b)) || b % 11 === 0 && b > 9 && rng() < 0.7);
      return buildMult(a, b, rng);
    }
    let a, d;
    do {
      d = rint(L.d[0], L.d[1], rng);
      if (L.exact) { const q = rint(Math.ceil(L.a[0] / d), Math.floor(L.a[1] / d), rng); a = q * d; }
      else a = rint(L.a[0], L.a[1], rng);
    } while (a < L.a[0] || a > L.a[1] || Math.floor(a / d) < 2 || d % 10 === 0);
    return buildDiv(a, d, rng);
  }
  // problem spec from data: {mode:"mult", a, b} or {mode:"div", a, b}
  const build = (p, rng) => p.mode === "div" ? buildDiv(Number(p.a), Number(p.b), rng) : buildMult(Number(p.a), Number(p.b), rng);

  // ---------- completion code: sha256(key|answer) -> e.g. "GT47" (same as tools/stepgame.py) ----------
  const CODE_TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"];
  const codeFromHex = h => CODE_TAGS[parseInt(h.slice(0, 2), 16) % 16] + String(parseInt(h.slice(2, 6), 16) % 90 + 10);

  const api = { buildMult, buildDiv, build, randomProblem, LEVELS, codeFromHex, CODE_TAGS, fmt };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MathsEngine = api;
})(typeof window !== "undefined" ? window : this);
