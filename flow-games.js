// Inline game components for challenges.html "Today's run" (added 27 Oct 2026) and tables.html.
// Each component plays ONE daily challenge inside a container, using the existing engines
// (maths-engine.js, hebrew-engine.js, grammar-engine.js, timestables-engine.js) and EXACTLY the same per-device
// progress keys + finish-code scheme as the standalone pages, so maths.html / hebrew.html / grammar.html and the
// reply-check tools see the same codes:
//   stepgame    -> localStorage "buzz-garage-<date>"  {mgN: {done, code, mistakes, step}}   code = sha256(`${key}|${answer}`)
//   hebword/hebsentence -> "buzz-hebrew-<date>"       {hbN|hsN: {done, code, mistakes, step}}
//   grammar     -> "buzz-grammar-<date>"              {grN: {done, code, mistakes}}
//   timestables -> "buzz-tables-<date>"               {ttN: {done, code, mistakes, step}}
// API: FlowGames.make(c, hostEl, {onDone(code), onChange()}) -> { done(), code(), status(), rightIdx(), wrongIdx(), destroy() }
(function (root) {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  async function sha256(t) { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join(""); }
  const getLS = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rand = a => a[Math.floor(Math.random() * a.length)];
  function confetti(el, n, EM) {
    if (!el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect(); EM = EM || ["🎉", "⭐", "✨", "🏁", "💥", "🔥", "🏆", "🚀"];
    for (let i = 0; i < (n || 12); i++) {
      const s = document.createElement("span"); s.className = "boom"; s.textContent = EM[i % EM.length];
      s.style.left = (r.left + r.width / 2) + "px"; s.style.top = (r.top + r.height / 2) + "px";
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * (n > 12 ? 160 : 80);
      s.style.setProperty("--dx", Math.cos(a) * d + "px"); s.style.setProperty("--dy", (Math.sin(a) * d - 40) + "px");
      document.body.appendChild(s); setTimeout(() => s.remove(), 1100);
    }
  }
  const shake = el => { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); };
  const KEYS = { stepgame: "buzz-garage-", hebword: "buzz-hebrew-", hebsentence: "buzz-hebrew-", grammar: "buzz-grammar-", timestables: "buzz-tables-" };
  const saved = c => getLS(KEYS[c.type] + c.date)[c.id] || {};
  function saveStep(c, idx, mistakes) { const k = KEYS[c.type] + c.date, st = getLS(k), cur = st[c.id] || {}; if (!cur.done) { st[c.id] = { ...cur, step: idx, mistakes }; setLS(k, st); } }
  async function finishCode(c, answer, mistakes, steps) {
    const k = KEYS[c.type] + c.date, st = getLS(k);
    if (st[c.id] && st[c.id].code) return { code: st[c.id].code, fresh: false };
    const code = (root.MathsEngine || root.HebrewEngine || root.GrammarEngine || root.TablesEngine).codeFromHex(await sha256(`${c.key}|${answer}`));
    st[c.id] = steps === undefined ? { done: true, code, mistakes } : { done: true, code, mistakes, step: steps }; setLS(k, st);
    return { code, fresh: true };
  }
  const codeBox = (c, code, extra) => `<p>Your finish code:</p><div class="mg-code">${esc(c.id)} ${esc(code)}</div>${extra || ""}`;
  const track = (pct, car) => `<div class="mg-track"><div class="bar"><div class="fill" style="width:${pct}%"></div></div><span class="mg-car" style="left:calc(${pct}% - ${pct / 100 * 1.6}em)">${car}</span><span class="mg-flag">🏁</span></div>`;
  const CHEERS = ["✅ Yes!", "✅ Nailed it!", "✅ Spot on!", "✅ Boom!", "✅ Smooth!"];

  // ---------------- 🏎️ Maths Garage (same layout as maths.html) ----------------
  function mathsWork(p, cells, step, fresh, tgtArr) {
    const focus = new Set((step ? step.focus : []).map(f => f.join(":")));
    const tgt = tgtArr ? tgtArr.join(":") : "";
    const cls = (r, c) => (focus.has(r + ":" + c) || focus.has(r + ":-1") ? " hl" : "") + (fresh.has(r + ":" + c) ? " fresh" : "") + (tgt === r + ":" + c ? " tg" : "");
    const get = (r, c) => (cells[r] || {})[c];
    if (p.kind === "mult") {
      const A = String(p.a), B = String(p.b), two = B.length === 2;
      const W = Math.max(A.length, B.length + 1, String(p.a * p.b).length, two ? String(p.a * Number(B[0]) * 10).length : 0) + 1;
      const onRow2 = two && (Object.keys(cells.p1 || {}).length > 0 || (step && step.kind === "zero"));
      let h = "";
      for (const r of p.rows) {
        const line = r === "bot" || (r === "p1") || (r === "p0" && !two) ? " ln" : "";
        const small = r === "c0" || r === "c1";
        const used = (r === "c0" && onRow2) || (r === "c1" && step && step.kind === "add") || (small && !step);
        for (let pos = 0; pos < W; pos++) {
          const c = W - 1 - pos; let v = "";
          if (r === "top") v = A[A.length - 1 - c] || "";
          else if (r === "bot") v = c < B.length ? B[B.length - 1 - c] : (c === B.length ? "×" : "");
          else v = get(r, c) || "";
          const isTg = tgt === r + ":" + c;
          h += `<span class="k${small ? " cy" : ""}${used ? " used" : ""}${line}${r === "tot" || (r === "p0" && !two) ? " res" : ""}${cls(r, c)}">${esc(v || (isTg ? "?" : ""))}</span>`;
        }
      }
      return `<div class="mg-work"><div class="mg-grid" style="grid-template-columns:repeat(${W},1.2em)">${h}</div></div>`;
    }
    const D = String(p.a), d = String(p.b), n = D.length, rem = get("rem", 0), cols = d.length + n + 1;
    let h = "";
    for (let i = 0; i < d.length; i++) h += `<span class="k"></span>`;
    for (let i = 0; i < n; i++) { const v = get("q", i) || "", isTg = tgt === "q:" + i; h += `<span class="k res${cls("q", i)}">${esc(v || (isTg ? "?" : ""))}</span>`; }
    h += `<span class="k rem">${rem ? `<span class="${fresh.has("rem:0") ? "fresh" : ""}">r${esc(rem)}</span>` : ""}</span>`;
    for (let i = 0; i < d.length; i++) h += `<span class="k dvk${i === d.length - 1 ? " dvr" : ""}${focus.has("dv:0") ? " hl" : ""}">${esc(d[i])}</span>`;
    for (let i = 0; i < n; i++) { const cy = get("cy", i); h += `<span class="k house${i === 0 ? " hfirst" : ""}${cls("dd", i)}">${cy ? `<sup class="${fresh.has("cy:" + i) ? "fresh" : ""}${focus.has("cy:" + i) ? " hl" : ""}">${esc(cy)}</sup>` : ""}${esc(D[i])}</span>`; }
    h += `<span class="k"></span>`;
    return `<div class="mg-work"><div class="mg-grid bus2" style="grid-template-columns:repeat(${cols - 1},1.2em) auto">${h}</div></div>`;
  }
  function mathsTarget(prob, idx) {
    const s = prob.steps[idx]; if (!s) return null;
    const w = s.writes[0] || (s.kind === "fact" && prob.steps[idx + 1] && prob.steps[idx + 1].writes[0]);
    if (s.kind === "howmany") return ["q", s.writes[0].c];
    return w && w.r !== "cy" && w.r !== "rem" && w.r !== "tot" ? [w.r, w.c] : null;
  }
  // generic "step game" component for maths + hebrew (both: prob.steps[] each with opts[{label, ok, hint}], say, q)
  function stepComponent(c, host, hooks, cfg) {
    const E = cfg.E, prob = cfg.build(c), total = prob.steps.length, s0 = saved(c);
    const S = { idx: s0.done ? total : Math.min(s0.step || 0, total), mistakes: s0.mistakes || 0, order: {}, wrong: new Set(), fb: "", fresh: new Set(), cells: {}, review: !!s0.done, finished: !!s0.done, code: s0.code || null };
    const apply = (step, fresh) => step.writes && step.writes.forEach(w => { (S.cells[w.r] = S.cells[w.r] || {})[w.c] = w.v; if (fresh) fresh.add(w.r + ":" + w.c); });
    const replayTo = n => { S.cells = {}; for (let i = 0; i < n; i++) apply(prob.steps[i]); };
    replayTo(S.idx);
    const el = document.createElement("div"); host.innerHTML = ""; host.appendChild(el);
    function render() {
      const done = S.idx >= total, step = prob.steps[S.idx], pct = Math.round(100 * S.idx / total);
      let h = `<div class="mg-play fl-play${done ? " mg-done" : ""}">` + track(pct, cfg.car) +
        `<p class="mg-stepn">${done ? `All ${total} steps done!` : `Step ${S.idx + 1} of ${total}`}${S.mistakes ? ` · 🔧 pit stops: ${S.mistakes}` : ""}</p>` +
        cfg.board(prob, S, done ? null : step);
      if (!done) {
        if (!S.order[S.idx]) S.order[S.idx] = shuffle(step.opts.map((_, i) => i));
        const short = cfg.rowOpts && step.opts.every(o => o.label.length <= 7);
        h += `<div class="mg-ask"><span class="mg-bot">🤖</span><p>${cfg.ask(step)}</p></div><div class="mg-opts${short ? " row" : ""}">` +
          S.order[S.idx].map(i => { const o = step.opts[i], w = S.wrong.has(i); return `<button type="button" class="mg-opt${cfg.optCls || ""}${w ? " wrong" : ""}" data-i="${i}"${w ? " disabled" : ""}>${esc(o.label)}</button>`; }).join("") + `</div>` +
          (step.tool ? `<details class="mg-tool"><summary>🧰 Buzz's toolbox: the ${prob.b} times table</summary><p>${step.tool.map(esc).join("<br>")}</p></details>` : "");
      }
      h += `<div class="mg-fb" aria-live="polite">${S.fb}</div>${done ? `<div class="fl-fin"></div>` : ""}</div>`;
      el.innerHTML = h; S.fresh = new Set();
      if (done) finish();
    }
    async function finish() {
      const box = el.querySelector(".fl-fin");
      const r = await finishCode(c, prob.answer, S.mistakes, total);
      S.code = r.code; S.finished = true;
      box.innerHTML = `<div class="mg-finish">${cfg.result(prob)}` + codeBox(c, r.code, `<p class="rule">+${c.points} pts when Buzz checks your codes!</p>`) +
        `<p><button type="button" class="fl-replay">🔁 Play it again</button></p></div>`;
      if (r.fresh) { confetti(box, 28); hooks.onDone && hooks.onDone(r.code); }
    }
    el.addEventListener("click", e => {
      if (e.target.closest(".fl-replay")) { S.idx = 0; S.order = {}; S.wrong = new Set(); S.fb = ""; replayTo(0); render(); return; }
      const b = e.target.closest(".mg-opt"); if (!b || S.idx >= total) return;
      const step = prob.steps[S.idx], i = Number(b.dataset.i), o = step.opts[i];
      if (o.ok) {
        confetti(b, 10); apply(step, S.fresh);
        S.fb = `<span class="yes pop">${rand(CHEERS)}</span> ${esc(step.say)}`; S.idx++; S.wrong = new Set();
        saveStep(c, S.idx, S.mistakes); render(); hooks.onChange && hooks.onChange();
      } else {
        S.mistakes++; S.wrong.add(i); S.fb = `<span class="no">🤔 Not quite.</span> ${esc(cfg.hint(o))}`;
        saveStep(c, S.idx, S.mistakes); render(); shake(el.querySelector(".mg-play"));
      }
    });
    render();
    const cur = () => prob.steps[S.idx];
    return { done: () => S.finished, code: () => S.code, status: () => S.finished ? "done" : (S.idx ? `Step ${S.idx + 1} of ${total}` : ""),
      rightIdx: () => cur() ? cur().opts.findIndex(o => o.ok) : -1, wrongIdx: () => cur() ? cur().opts.findIndex((o, i) => !o.ok && !S.wrong.has(i)) : -1 };
  }
  function maths(c, host, hooks) {
    const E = root.MathsEngine, fmt = E.fmt;
    return stepComponent(c, host, hooks, { E, car: "🏎️", rowOpts: true, build: c => E.build({ mode: c.mode, a: c.a, b: c.b }),
      board: (p, S, step) => mathsWork(p, S.cells, step, S.fresh, step ? mathsTarget(p, S.idx) : null),
      ask: step => esc(step.q), hint: o => o.hint,
      result: p => {
        const line = p.kind === "mult" ? `${fmt(p.a)} × ${p.b} = <b>${fmt(p.a * p.b)}</b>` : `${fmt(p.a)} ÷ ${p.b} = <b>${fmt(p.quotient)}${p.remainder ? ` r ${p.remainder}` : ""}</b>`;
        const chk = p.kind === "div" ? `Check: ${fmt(p.quotient)} × ${p.b}${p.remainder ? ` + ${p.remainder}` : ""} = ${fmt(p.a)} ✔` : (String(p.b).length === 2 ? `Close to our estimate of about ${fmt(p.steps[0].opts[0].value)} ✔` : "");
        return `<div class="mg-flagline">🏁 CHECKERED FLAG!</div><div class="mg-result">${line}</div><p class="rule">${chk}</p>`;
      } });
  }
  // ---------------- 🔤 Hebrew word / 💬 sentence (same layout as hebrew.html) ----------------
  function hebWordHTML(p, idx) {
    const n = p.parts.length, done = idx >= n;
    const letters = [...p.word].map((ch, i) => `<span class="hw-l${i < idx ? " done" : (i === idx ? " cur" : "")}${p.newLetter === ch && i >= idx ? " isnew" : ""}"><span class="hw-ch">${esc(ch)}</span><span class="hw-tr">${i < idx ? esc(p.parts[i][1]) : (i === idx ? "?" : "")}</span></span>`).join("");
    const sofar = p.parts.slice(0, Math.min(idx, n)).map(x => x[1]).join("");
    return `<div class="hw-box"><div class="hw-word" dir="rtl" lang="he">${letters}</div><div class="hw-dir">⬅️ ⬅️ read this way ⬅️ ⬅️</div><div class="hw-build">${sofar ? esc(sofar) + (done ? "!" : "…") : "&nbsp;"}</div></div>`;
  }
  function hebSentHTML(p, idx) {
    let off = 0; const built = [];
    const words = p.words.map(w => {
      const L = [...w.w], start = off; off += L.length;
      const done = idx >= off, cur = idx >= start && idx < off;
      const letters = L.map((ch, i) => { const g = start + i; return `<span class="hw-l${g < idx ? " done" : (g === idx ? " cur" : "")}${p.newLetter === ch && g >= idx ? " isnew" : ""}"><span class="hw-ch">${esc(ch)}</span><span class="hw-tr">${g < idx ? esc(w.parts[i][1]) : (g === idx ? "?" : "")}</span></span>`; }).join("");
      const got = w.parts.slice(0, Math.max(0, Math.min(idx - start, L.length))).map(x => x[1]).join(""); if (got) built.push(got);
      return `<div class="hs-w${done ? " done" : ""}${cur ? " cur" : ""}"><div class="hw-word">${letters}</div><div class="hs-mean" dir="ltr">${done ? `<b>${esc(w.tr)}</b> = ${esc(w.en)}` : "&nbsp;"}</div></div>`;
    }).join("");
    return `<div class="hw-box hs-box"><div class="hs-sent" dir="rtl" lang="he">${words}</div><div class="hw-dir">⬅️ ⬅️ read this way ⬅️ ⬅️</div><div class="hw-build">${built.length ? esc(built.join(" ")) + (idx >= p.parts.length ? "!" : "…") : "&nbsp;"}</div></div>`;
  }
  function hebrew(c, host, hooks) {
    const H = root.HebrewEngine;
    return stepComponent(c, host, hooks, { E: H, car: "🚙", optCls: " hw-opt", build: c => c.type === "hebsentence" ? H.buildSentence(c.sentence) : H.buildWord(c.word),
      board: (p, S) => p.kind === "sentence" ? hebSentHTML(p, S.idx) : hebWordHTML(p, S.idx),
      ask: step => step.kind === "letter" ? esc(step.q).replace(esc(step.ch), `<span class="hw-q" lang="he">${esc(step.ch)}</span>`) : esc(step.q), hint: o => o.hint,
      result: p => `<div class="hw-emoji">${p.emoji}</div><div class="mg-result"><span lang="he" dir="rtl" class="hw-inline">${esc(p.word)}</span> = <b>${esc(p.tr)}</b> = <b>${esc(p.en)}</b></div>` +
        (p.kind === "sentence" ? `<div class="hs-recap">${p.words.map(w => `<span><span lang="he" dir="rtl" class="hw-inline">${esc(w.w)}</span> ${esc(w.tr)} = ${esc(w.en)}</span>`).join("")}</div>` : "") +
        `<p class="hw-fact">💡 ${esc(p.fact)}</p>` + (p.newLetter ? `<p class="rule">🆕 You just learned a new letter: <span lang="he" class="hw-inline">${esc(p.newLetter)}</span> (${esc(H.LETTERS[p.newLetter].name)})!</p>` : "") });
  }
  // ---------------- 🕵️ Sentence Detective (same as grammar.html) ----------------
  function grammar(c, host, hooks) {
    const G = root.GrammarEngine, q = G.buildQuestion(c.qid, Math.random, c.level || 1), s0 = saved(c);
    const S = { done: !!s0.done, finished: !!s0.done, wrong: new Set(), fb: "", mistakes: 0, code: s0.code || null };
    const el = document.createElement("div"); host.innerHTML = ""; host.appendChild(el);
    function render() {
      let h = `<div class="mg-play fl-play${S.done ? " mg-done" : ""}"><div class="gd-sent">${esc(q.before)}<span class="gd-hl">${esc(q.target)}</span>${esc(q.after)}</div>` +
        `<div class="mg-ask"><span class="mg-bot">🤖</span><p>${esc(q.ask)}</p></div>`;
      if (!S.done) h += `<div class="mg-opts">` + q.opts.map((o, i) => `<button type="button" class="mg-opt hw-opt${S.wrong.has(i) ? " wrong" : ""}" data-i="${i}"${S.wrong.has(i) ? " disabled" : ""}>${esc(o.label)}</button>`).join("") + `</div>`;
      h += `<div class="mg-fb" aria-live="polite">${S.fb}</div><div class="fl-fin"></div></div>`;
      el.innerHTML = h; if (S.done) finish();
    }
    async function finish() {
      const box = el.querySelector(".fl-fin"), r = await finishCode(c, q.answer, S.mistakes);
      S.code = r.code; S.finished = true;
      box.innerHTML = `<div class="mg-finish"><div class="mg-result">"${esc(q.target)}" = <b>${esc(q.a)}</b> ${G.DEF[q.a].e}</div><p class="hw-fact">🔍 ${esc(q.why)}</p>` +
        `<div class="gd-def">${G.DEF[q.a].e} ${esc(G.DEF[q.a].short).replace(q.a.toUpperCase(), `<b>${q.a.toUpperCase()}</b>`)}<br><i>e.g. "${esc(G.DEF[q.a].ex)}"</i></div>` + codeBox(c, r.code) + `</div>`;
      if (r.fresh) { confetti(box, 24, ["🎉", "⭐", "✨", "🔍", "💥", "🕵️", "🏆", "🚀"]); hooks.onDone && hooks.onDone(r.code); }
    }
    el.addEventListener("click", e => {
      const b = e.target.closest(".mg-opt"); if (!b || S.done) return;
      const i = Number(b.dataset.i), o = q.opts[i];
      if (o.ok) { confetti(b, 10); S.done = true; S.fb = `<span class="yes pop">${rand(["✅ Case cracked!", "✅ Nailed it!", "✅ Sharp eyes!", "✅ Boom!", "✅ Super sleuth!"])}</span>`; render(); }
      else { S.mistakes++; S.wrong.add(i); S.fb = `<span class="no">🤔 Not quite.</span> ${esc(o.hint.replace(/^Not quite! /, ""))}`; render(); shake(el.querySelector(".mg-play")); }
    });
    render();
    return { done: () => S.finished, code: () => S.code, status: () => S.finished ? "done" : "", rightIdx: () => S.done ? -1 : q.opts.findIndex(o => o.ok), wrongIdx: () => S.done ? -1 : q.opts.findIndex((o, i) => !o.ok && !S.wrong.has(i)) };
  }
  // ---------------- ✖️ Times-tables warm-up (new) ----------------
  // visual: ARRAY (a rows of b) or GROUPS (a groups of b); a wrong tap animates skip-counting by rows/groups ("4, 8, 12")
  function ttVisual(q, view, lit) {
    const n = Math.max(q.a, q.b), size = view === "array" ? Math.min(1.9, 17 / Math.max(q.b, 5)) : Math.min(1.5, 9 / Math.max(5, Math.min(q.b, 5) * Math.ceil(q.a / (q.a > 6 ? 3 : 2))) * 1.6);
    if (view === "array") {
      const rows = Array.from({ length: q.a }, (_, r) => `<div class="tt-row${r < lit ? " lit" : ""}" data-r="${r}"><span class="tt-items">${Array.from({ length: q.b }, () => `<span>${q.emoji}</span>`).join("")}</span><span class="tt-count">${r < lit ? (r + 1) * q.b : ""}</span></div>`).join("");
      return `<div class="tt-vis tt-array" style="--tt:${size.toFixed(2)}rem">${rows}</div>`;
    }
    const per = q.b > 5 ? 5 : q.b;
    const groups = Array.from({ length: q.a }, (_, g) => `<div class="tt-group${g < lit ? " lit" : ""}" data-r="${g}"><div class="tt-gi" style="grid-template-columns:repeat(${per},1fr)">${Array.from({ length: q.b }, () => `<span>${q.emoji}</span>`).join("")}</div><span class="tt-count">${g < lit ? (g + 1) * q.b : ""}</span></div>`).join("");
    return `<div class="tt-vis tt-groups" style="--tt:${(q.b > 5 ? 1.05 : 1.3)}rem">${groups}</div>`;
  }
  function tables(c, host, hooks, opts) {
    const T = root.TablesEngine; opts = opts || {};
    const practice = !c.key, round = T.buildRound(c.tables, c.key || opts.seed || String(Math.random()), c.n || 8), total = round.questions.length;
    const s0 = practice ? {} : saved(c);
    const S = { idx: s0.done ? total : Math.min(s0.step || 0, total), mistakes: s0.mistakes || 0, wrong: new Set(), fb: "", finished: !!s0.done, code: s0.code || null, lit: 0, timer: null, view: null, busy: false };
    const pref = () => { const v = getLS("buzz-tables-view").v; return v === "array" || v === "groups" ? v : null; };
    const el = document.createElement("div"); host.innerHTML = ""; host.appendChild(el);
    function render() {
      clearInterval(S.timer); S.timer = null;
      const done = S.idx >= total, q = round.questions[S.idx], pct = Math.round(100 * S.idx / total);
      let h = `<div class="mg-play fl-play tt-play${done ? " mg-done" : ""}">` + track(pct, "🚴") +
        `<p class="mg-stepn">${done ? `All ${total} done!` : `Question ${S.idx + 1} of ${total}`} · ${esc(T.label(c.tables))}${S.mistakes ? ` · 🔧 pit stops: ${S.mistakes}` : ""}</p>`;
      if (!done) {
        const view = S.view || pref() || q.view;
        h += `<div class="tt-q"><span class="tt-sum">${q.a} × ${q.b} = <b>?</b></span></div>` +
          `<div class="tt-toggle" role="group" aria-label="Picture"><button type="button" data-view="groups" class="${view === "groups" ? "on" : ""}">🧺 Groups</button><button type="button" data-view="array" class="${view === "array" ? "on" : ""}">🔲 Array</button></div>` +
          `<p class="tt-say">${view === "groups" ? `${q.a} groups of ${q.b} ${esc(q.b === 1 ? q.one : q.many)}` : `${q.a} rows of ${q.b} ${esc(q.b === 1 ? q.one : q.many)}`}</p>` +
          ttVisual(q, view, S.lit) +
          `<div class="mg-opts row">` + q.opts.map((o, i) => `<button type="button" class="mg-opt tt-opt${S.wrong.has(i) ? " wrong" : ""}" data-i="${i}"${S.wrong.has(i) ? " disabled" : ""}>${esc(o.label)}</button>`).join("") + `</div>`;
      }
      h += `<div class="mg-fb" aria-live="polite">${S.fb}</div>${done ? `<div class="fl-fin"></div>` : ""}</div>`;
      el.innerHTML = h;
      if (done) finish();
    }
    function countBy() { // animate skip-counting row by row / group by group
      const q = round.questions[S.idx]; clearInterval(S.timer); S.lit = 0;
      const rows = [...el.querySelectorAll(".tt-row,.tt-group")];
      rows.forEach(r => { r.classList.remove("lit"); r.querySelector(".tt-count").textContent = ""; });
      const line = el.querySelector(".tt-countline");
      S.timer = setInterval(() => {
        if (S.lit >= q.a) { clearInterval(S.timer); S.timer = null; return; }
        const r = rows[S.lit]; S.lit++;
        if (r) { r.classList.add("lit"); r.querySelector(".tt-count").textContent = S.lit * q.b; }
        if (line) line.textContent = T.counts(S.lit, q.b).join(", ") + (S.lit < q.a ? ", …" : "");
      }, 550);
    }
    function recap() {
      const asked = new Set(round.questions.map(q => q.a + "x" + q.b));
      const ts = c.tables.includes("mixed") ? [...new Set(round.questions.map(q => q.b))].sort((a, b) => a - b) : round.focus;
      return `<div class="tt-recap">${ts.map(t => `<div class="tt-table"><h3>The ${t}× table</h3><ol>${T.tableOf(t).map(r => `<li class="${asked.has(r.m + "x" + t) ? "asked" : ""}"><span>${r.m} × ${t}</span><b>${r.p}</b><i>${asked.has(r.m + "x" + t) ? "⭐" : ""}</i></li>`).join("")}</ol></div>`).join("")}</div>` +
        `<p class="rule">⭐ = the ones you just did. Tip: each line is the one above + ${ts.length === 1 ? ts[0] : "the table number"}!</p>`;
    }
    async function finish() {
      const box = el.querySelector(".fl-fin");
      let h = `<div class="mg-finish"><div class="mg-flagline">✖️ WARM-UP DONE!</div>`;
      if (practice) {
        const ps = getLS("buzz-tables-practice"); if (!S.counted) { ps.finished = (ps.finished || 0) + 1; ps[c.tables.join("+")] = (ps[c.tables.join("+")] || 0) + 1; setLS("buzz-tables-practice", ps); S.counted = true; }
        box.innerHTML = h + recap() + `<p class="rule">Practice rounds finished: <b>${ps.finished}</b> 🏆 (practice is just for fun, no points)</p><button type="button" class="checkbtn tt-again">Another round 🎲</button></div>`;
        S.finished = true; confetti(box, 24); hooks.onDone && hooks.onDone(null); return;
      }
      const r = await finishCode(c, round.answer, S.mistakes, total);
      S.code = r.code; S.finished = true;
      box.innerHTML = h + recap() + codeBox(c, r.code, `<p class="rule">+${c.points} pts when Buzz checks your codes!</p>`) + `<p><button type="button" class="fl-replay">🔁 Play it again</button></p></div>`;
      if (r.fresh) { confetti(box, 28, ["🎉", "⭐", "✖️", "✨", "🏁", "💥", "🔥", "🏆"]); hooks.onDone && hooks.onDone(r.code); }
    }
    el.addEventListener("click", e => {
      if (e.target.closest(".tt-again")) { hooks.again && hooks.again(); return; }
      if (e.target.closest(".fl-replay")) { S.idx = 0; S.wrong = new Set(); S.fb = ""; S.lit = 0; S.replay = true; render(); return; }
      const v = e.target.closest("[data-view]");
      if (v) { S.view = v.dataset.view; setLS("buzz-tables-view", { v: S.view }); const lit = S.lit; render(); if (lit) { S.lit = 0; countBy(); } return; }
      const b = e.target.closest(".mg-opt"); if (!b || S.idx >= total) return;
      const q = round.questions[S.idx], i = Number(b.dataset.i), o = q.opts[i];
      if (o.ok) {
        confetti(b, 10, ["⭐", "✨", "✖️", "🎉"]);
        S.fb = `<span class="yes pop">${rand(CHEERS)}</span> ${q.a} × ${q.b} = <b>${q.answer}</b>`; S.idx++; S.wrong = new Set(); S.lit = 0;
        if (!practice && !S.replay) saveStep(c, S.idx, S.mistakes);
        render(); hooks.onChange && hooks.onChange();
      } else {
        S.mistakes++; S.wrong.add(i);
        if (!practice && !S.replay) saveStep(c, S.idx, S.mistakes);
        S.fb = `<span class="no">🤔 Not quite.</span> ${esc(o.hint)}<br>👀 Watch Buzz count by ${q.b}s: <b class="tt-countline"></b>`;
        render(); shake(el.querySelector(".mg-play")); countBy();
      }
    });
    render();
    const cur = () => round.questions[S.idx];
    return { done: () => S.finished, code: () => S.code, round, status: () => S.finished ? "done" : (S.idx ? `Question ${S.idx + 1} of ${total}` : ""),
      rightIdx: () => cur() ? cur().opts.findIndex(o => o.ok) : -1, wrongIdx: () => cur() ? cur().opts.findIndex((o, i) => !o.ok && !S.wrong.has(i)) : -1 };
  }

  const MAKERS = { stepgame: maths, hebword: hebrew, hebsentence: hebrew, grammar, timestables: tables };
  function make(c, host, hooks, opts) { const f = MAKERS[c.type]; return f ? f(c, host, hooks || {}, opts) : null; }
  // what the standalone pages saved for this challenge (done + code + step), used for the collapsed rows
  const progress = c => KEYS[c.type] ? saved(c) : null;
  root.FlowGames = { make, progress, KEYS, supports: t => !!MAKERS[t], esc, confetti };
})(typeof window !== "undefined" ? window : this);
