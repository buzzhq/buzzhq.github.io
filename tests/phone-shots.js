// Run: node tests/phone-shots.js   (needs puppeteer-core in /workspace/shotenv + `python3 -m http.server 8765` in the repo)
// 390px phone screenshots of the scoreboard log box, a Hebrew sentence mid-play and Sentence Detective, plus RTL + layout checks.
const puppeteer = require("/workspace/shotenv/node_modules/puppeteer-core");
const OUT = "/workspace/alon/shots/", BASE = "http://localhost:8765/";
let fails = 0; const check = (ok, m) => { console.log(ok ? "ok  " : "FAIL", m); if (!ok) fails++; };
(async () => {
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  const noOverflow = async n => check(await pg.evaluate(() => document.documentElement.scrollWidth <= 391), `${n}: no sideways scrolling at 390px`);
  // 1. scoreboard log box
  await pg.goto(BASE + "index.html", { waitUntil: "networkidle0" }); await new Promise(r => setTimeout(r, 1500));
  const lb = await pg.evaluate(() => { const e = document.getElementById("wins"), r = e.getBoundingClientRect(), rows = e.querySelectorAll(".win");
    const vis = [...rows].filter(w => { const q = w.getBoundingClientRect(); return q.bottom <= r.bottom + 1 && q.top >= r.top - 1; }).length;
    return { h: r.height, sh: e.scrollHeight, rows: rows.length, vis, first: rows[0] && rows[0].querySelector(".d").textContent, last: rows[rows.length - 1] && rows[rows.length - 1].querySelector(".d").textContent }; });
  console.log("log box", JSON.stringify(lb));
  check(lb.sh > lb.h && lb.vis >= 5 && lb.vis <= 9, `log box scrolls, ${lb.vis} entries fully visible`);
  check(await pg.evaluate(() => !!document.getElementById("total").offsetParent && !document.getElementById("wins").contains(document.getElementById("walletpts"))), "totals/wallet outside the box");
  await noOverflow("scoreboard");
  const card = await pg.$("#wins"); await pg.evaluate(() => document.getElementById("wins").closest(".card").scrollIntoView());
  await pg.screenshot({ path: OUT + "phone-scoreboard-logbox.png" });
  await pg.evaluate(() => { const e = document.getElementById("wins"); e.style.scrollBehavior = "auto"; e.scrollTop = 900; e.dispatchEvent(new Event("scroll")); });
  await new Promise(r => setTimeout(r, 300)); await pg.screenshot({ path: OUT + "phone-scoreboard-logbox-scrolled.png" });
  // 2. Hebrew sentence (preview the seeded 18 Oct sentence with the vowel/quiet letters)
  await pg.goto(BASE + "hebrew.html?date=2026-10-18", { waitUntil: "networkidle0" });
  await pg.evaluate(() => localStorage.clear()); await pg.goto(BASE + "hebrew.html?date=2026-10-18#hs1", { waitUntil: "networkidle0" });
  check(await pg.evaluate(() => P && P.prob.kind === "sentence"), "sentence opens from #hs1");
  const tapRight = async n => { for (let k = 0; k < n; k++) { await pg.evaluate(() => { const st = P.prob.steps[P.idx], i = st.opts.findIndex(o => o.ok); document.querySelector(`.mg-opt[data-i="${i}"]`).click(); }); await new Promise(r => setTimeout(r, 120)); } };
  const rtl = await pg.evaluate(() => { const ws = [...document.querySelectorAll(".hs-w")].map(w => w.getBoundingClientRect());
    const ls = [...document.querySelectorAll(".hs-w")[0].querySelectorAll(".hw-l")].map(l => l.getBoundingClientRect().left);
    return { wordsRTL: ws.every((r, i) => i === 0 || r.right <= ws[i - 1].left + 2 || r.top > ws[i - 1].top + 5), lettersRTL: ls.every((x, i) => i === 0 || x < ls[i - 1]) }; });
  check(rtl.wordsRTL && rtl.lettersRTL, "first word is on the right, first letter is rightmost (RTL)");
  await tapRight(3);  // finish ha-dov, land on the quiet א of ohev
  await noOverflow("hebrew sentence");
  await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-hebrew-sentence.png" });
  await tapRight(1); // א -> now the ו vowel step; tap a wrong one to see the hint
  await pg.evaluate(() => { const st = P.prob.steps[P.idx], i = st.opts.findIndex(o => !o.ok); document.querySelector(`.mg-opt[data-i="${i}"]`).click(); });
  await new Promise(r => setTimeout(r, 400)); await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-hebrew-sentence-tricky.png" });
  await tapRight(6); // rest of the letters -> meaning question
  check(await pg.evaluate(() => P.prob.steps[P.idx].kind === "meaning"), "ends with the whole-sentence meaning question");
  await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-hebrew-sentence-meaning.png" });
  await tapRight(1); await new Promise(r => setTimeout(r, 800));
  const code = await pg.evaluate(() => document.querySelector(".mg-code") && document.querySelector(".mg-code").textContent);
  console.log("hebrew finish code shown:", code); check(/^hs1 [A-Z]{2}\d{2}$/.test(code || ""), "finish code shown");
  await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-hebrew-sentence-finish.png" });
  // 3. grammar
  await pg.goto(BASE + "grammar.html?date=2026-10-18", { waitUntil: "networkidle0" });
  await pg.evaluate(() => { const i = P.q.opts.findIndex(o => !o.ok); document.querySelector(`.mg-opt[data-i="${i}"]`).click(); }); await new Promise(r => setTimeout(r, 400));
  await noOverflow("grammar"); await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-grammar-hint.png" });
  await pg.evaluate(() => { const i = P.q.opts.findIndex(o => o.ok); document.querySelector(`.mg-opt[data-i="${i}"]`).click(); }); await new Promise(r => setTimeout(r, 800));
  const gcode = await pg.evaluate(() => document.querySelector(".mg-code") && document.querySelector(".mg-code").textContent); console.log("grammar code shown:", gcode);
  check(/^gr1 [A-Z]{2}\d{2}$/.test(gcode || ""), "grammar code shown");
  await pg.evaluate(() => document.getElementById("play").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-grammar-solved.png" });
  await pg.evaluate(() => document.getElementById("cheat").scrollIntoView()); await pg.screenshot({ path: OUT + "phone-grammar-cheatsheet.png" });
  // 4. challenges page shows the new cards
  await pg.goto(BASE + "challenges.html", { waitUntil: "networkidle0" }); await noOverflow("challenges");
  console.log("challenges cards:", await pg.evaluate(() => [...document.querySelectorAll("#today .chal")].map(c => c.id).join(",")));
  check(errs.length === 0, "no page errors " + errs.join(" | "));
  await b.close(); console.log(fails ? `${fails} FAILED` : "all phone checks passed"); process.exit(fails ? 1 : 0);
})();
