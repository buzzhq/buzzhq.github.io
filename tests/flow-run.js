// Run: node tests/flow-run.js [date]   (needs puppeteer-core in /workspace/shotenv + `python3 -m http.server 8765` in the repo)
// Full run-through of challenges.html "Today's run" at 390px: plays every step, checks one-open-at-a-time, collapse into ✅ rows,
// auto-open + scroll of the next step, skip + come back, reload resume, review tap, and that the send-all message has exactly
// the codes the tools/*.py helpers expect. Also plays a tables.html practice round. Screenshots -> /workspace/alon/shots/.
const puppeteer = require("/workspace/shotenv/node_modules/puppeteer-core");
const { execSync } = require("child_process");
const OUT = "/workspace/alon/shots/", BASE = "http://localhost:8765/", DATE = process.argv[2] || "2026-10-27";
const Q = `?date=${DATE}`;
let fails = 0; const check = (ok, m) => { console.log(ok ? "ok  " : "FAIL", m); if (!ok) fails++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
// expected codes straight from the helpers
const want = {};
for (const t of ["timestables", "stepgame", "hebword", "hebsentence", "grammar"])
  for (const m of execSync(`python3 tools/${t}.py codes ${DATE}`, { cwd: __dirname + "/.." }).toString().matchAll(/code: (\w+) (\w+)/g)) want[m[1]] = m[2];
console.log("expected", JSON.stringify(want));
(async () => {
  const b = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
  const pg = await b.newPage(); await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if (m.type() === "error" && !/404/.test(m.text())) errs.push(m.text()); });
  const st = () => pg.evaluate(() => ({ open: FLOW.open, ids: FLOW.steps.map(c => c.id), bodies: [...document.querySelectorAll(".fl-body")].map(e => e.id),
    count: document.getElementById("flcount").textContent, chips: Object.fromEntries([...document.querySelectorAll(".fl-step")].map(s => [s.id.replace("step-", ""), s.querySelector(".fl-code, .fl-tag") ? s.querySelector(".fl-code, .fl-tag").textContent.trim() : ""])),
    openTop: FLOW.open ? document.getElementById("step-" + FLOW.open).getBoundingClientRect().top : null, skipped: FLOW.skipped.slice() }));
  const noOverflow = async n => check(await pg.evaluate(() => document.documentElement.scrollWidth <= 391), `${n}: no sideways scrolling at 390px`);
  const tap = which => pg.evaluate((which) => { const c = FLOW.cur, i = which === "right" ? c.rightIdx() : c.wrongIdx(); if (i < 0) return false;
    const btn = document.querySelector(`#body-${FLOW.open} .mg-opt[data-i="${i}"]`); if (!btn || btn.disabled) return false; btn.click(); return true; }, which);
  const play = async (max = 60) => { for (let k = 0; k < max; k++) { if (await pg.evaluate(() => FLOW.cur.done())) return true; await tap("right"); await wait(650); } return pg.evaluate(() => FLOW.cur.done()); };
  const afterDone = async (id, nextId) => {
    await wait(400); let s = await st();
    check(s.open === id && s.chips[id].includes(want[id]), `${id}: finish screen shows code ${want[id]} and stays open briefly`);
    await wait(3000); s = await st();
    check(s.open === nextId, `${id} collapsed, auto-opened ${nextId} (open=${s.open})`);
    check(s.bodies.length === (nextId ? 1 : 0), `only one step open (${s.bodies.join(",")})`);
    check(s.chips[id].startsWith("✅") && s.chips[id].includes(want[id]), `${id} row: ${s.chips[id]}`);
    if (nextId) check(s.openTop > -5 && s.openTop < 200, `${nextId} scrolled into view (top ${Math.round(s.openTop)}px)`);
    return s;
  };
  await pg.goto(BASE + "challenges.html" + Q, { waitUntil: "networkidle0" }); await pg.evaluate(() => localStorage.clear());
  await pg.goto(BASE + "challenges.html" + Q, { waitUntil: "networkidle0" }); await wait(500);
  let s = await st();
  check(s.ids.join(",") === "tt1,mg1,mg2,hb1,hs1,gr1,gr2", "flow order tt → mg → hb → hs → gr: " + s.ids.join(","));
  check(!s.ids.some(i => /^dc/.test(i)), "no reading step in the flow");
  check(s.open === "tt1" && s.bodies.length === 1, "starts with tt1 open, everything else collapsed");
  check(/0 of 7/.test(s.count), "progress: " + s.count);
  await noOverflow("flow start");
  // --- tt1: one wrong tap (count-by-rows hint), toggle views, then the rest right
  check(await pg.evaluate(() => !!document.querySelector("#body-tt1 .tt-sum") && !!document.querySelector("#body-tt1 .tt-vis")), "tt question has the sum + picture");
  const v0 = await pg.evaluate(() => document.querySelector("#body-tt1 .tt-toggle .on").dataset.view);
  await pg.evaluate(() => document.querySelector('#body-tt1 [data-view="array"]').click()); await wait(200);
  check(await pg.evaluate(() => document.querySelectorAll("#body-tt1 .tt-array .tt-row").length > 0), `array view draws rows (start view ${v0})`);
  await pg.evaluate(() => document.querySelector('#body-tt1 [data-view="groups"]').click()); await wait(200);
  check(await pg.evaluate(() => document.querySelectorAll("#body-tt1 .tt-group").length > 0), "groups view draws boxes");
  await pg.evaluate(() => document.querySelector('#body-tt1 [data-view="array"]').click()); await wait(200);
  await tap("wrong"); await wait(2600);
  const hint = await pg.evaluate(() => ({ lit: document.querySelectorAll("#body-tt1 .lit").length, line: (document.querySelector("#body-tt1 .tt-countline") || {}).textContent || "", fb: (document.querySelector("#body-tt1 .mg-fb, #body-tt1 .mg-hint") || {}).textContent || "" }));
  console.log("wrong-tap hint", JSON.stringify(hint));
  check(hint.lit > 0 && /\d/.test(hint.line), "wrong tap counts the picture by rows");
  await pg.evaluate(() => document.querySelector("#body-tt1 .tt-sum").scrollIntoView({ block: "start" })); await pg.evaluate(() => window.scrollBy(0, -70));
  await pg.screenshot({ path: OUT + "phone-flow-tt-visual.png" });
  check(await play(), "tt1 finished");
  check(await pg.evaluate(() => !!document.querySelector("#body-tt1 .tt-recap")), "tt recap table shown");
  await pg.evaluate(() => document.querySelector("#body-tt1 .tt-recap").scrollIntoView({ block: "center" })); await pg.screenshot({ path: OUT + "phone-flow-tt-recap.png" });
  await afterDone("tt1", "mg1");
  // --- mg1: 3 steps, reload, resume, finish
  for (let k = 0; k < 3; k++) { await tap("right"); await wait(650); }
  await pg.reload({ waitUntil: "networkidle0" }); await wait(600); s = await st();
  check(s.open === "mg1" && s.chips.tt1.includes(want.tt1), "reload resumes on mg1 with tt1 ✅");
  check(/1 of 7/.test(s.count), "progress after reload: " + s.count);
  check(await pg.evaluate(() => /[1-9]/.test(FLOW.cur.status ? String(FLOW.cur.status()) : "") || !!document.querySelector("#body-mg1 .mg-done-step, #body-mg1 .mg-work .ok")), "mg1 kept its progress");
  check(await play(200), "mg1 finished"); await afterDone("mg1", "mg2");
  // --- skip mg2
  await pg.evaluate(() => document.querySelector('[data-skip="mg2"]').click()); await wait(500); s = await st();
  check(s.open === "hb1" && s.chips.mg2.includes("⏭") && s.skipped.includes("mg2"), "skip mg2 → hb1 opens, mg2 marked skipped");
  check(await play(), "hb1 finished"); await afterDone("hb1", "hs1");
  // mid-way screenshot: collapsed rows at top
  await pg.evaluate(() => document.getElementById("run").scrollIntoView({ block: "start" }));
  await pg.screenshot({ path: OUT + "phone-flow-midway.png" });
  // review tap on a ✅ row, then back
  await pg.evaluate(() => document.querySelector('[data-step="tt1"]').click()); await wait(500); s = await st();
  check(s.open === "tt1" && s.bodies.length === 1 && await pg.evaluate(() => !!document.querySelector("#body-tt1 .tt-recap")), "tapping ✅ tt1 reopens it for review (recap), others collapsed");
  check(s.chips.tt1.includes(want.tt1) && /3 of 7/.test(s.count), "review keeps the code + count");
  await pg.evaluate(() => document.querySelector('[data-step="hs1"]').click()); await wait(500);
  check((await st()).open === "hs1", "tap hs1 row to carry on");
  check(await play(), "hs1 finished"); await afterDone("hs1", "gr1");
  check(await play(), "gr1 finished"); await afterDone("gr1", "gr2");
  check(await play(), "gr2 finished"); s = await afterDone("gr2", "mg2");
  check(true, "after the last step the skipped mg2 comes back");
  check(await play(200), "mg2 finished"); s = await afterDone("mg2", null);
  check(/7 of 7/.test(s.count), "progress: " + s.count);
  const send = await pg.evaluate(() => ({ msg: FLOW.message(), href: document.getElementById("send").getAttribute("href"), label: document.getElementById("send").textContent, inView: document.getElementById("sendbox").getBoundingClientRect().top < 844 }));
  console.log("message:\n" + send.msg);
  const lines = send.msg.split(", ").map(l => l.trim());
  check(lines.join(",") === s.ids.map(i => `${i} ${want[i]}`).join(","), "message has every code in flow order, matching the helpers: " + lines.join(", "));
  check(decodeURIComponent(send.href.split("text=")[1]) === send.msg && send.href.startsWith("https://wa.me/"), "one wa.me button carrying that message");
  check(/Send all codes to Buzz/.test(send.label) && await pg.evaluate(() => document.querySelectorAll("#send, .sendbtn").length) === 1, "single 'Send all codes to Buzz' button: " + send.label);
  check(send.inView, "send box scrolled into view at the end");
  await pg.evaluate(() => document.getElementById("sendbox").scrollIntoView({ block: "start" })); await pg.screenshot({ path: OUT + "phone-flow-send.png" });
  check(await pg.evaluate(() => document.querySelectorAll("#past details, #past .day").length > 0), "past days still render");
  await noOverflow("flow end");
  // same storage as the standalone pages
  await pg.goto(BASE + "maths.html" + Q, { waitUntil: "networkidle0" }); await wait(500);
  check(await pg.evaluate(c => document.body.innerText.includes(c), want.mg1), "maths.html shows mg1 finished with the same code");
  await pg.goto(BASE + "tables.html" + Q, { waitUntil: "networkidle0" }); await wait(500);
  check(await pg.evaluate(c => document.body.innerText.includes(c), want.tt1), "tables.html warm-up tab shows the tt1 code");
  // --- practice
  await pg.goto(BASE + "tables.html#practice", { waitUntil: "networkidle0" }); await wait(500);
  const picked = await pg.evaluate(() => { const b = [...document.querySelectorAll(".tt-pick button, [data-pick]")].find(x => /7/.test(x.textContent)); if (b) b.click(); return !!b; });
  await wait(500);
  check(picked && await pg.evaluate(() => /7/.test(document.querySelector(".tt-sum").textContent)), "practice: pick 7× → a 7× question");
  await pg.screenshot({ path: OUT + "phone-tables-practice.png" });
  await noOverflow("tables practice");
  check(errs.length === 0, "no page errors " + errs.join(" | "));
  await b.close(); console.log(fails ? `${fails} FAILED` : "all flow checks passed"); process.exit(fails ? 1 : 0);
})();
