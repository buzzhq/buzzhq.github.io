// Chuchu Scoreboard logic. compute() is pure so it can be tested with node:
//   node -e 'const s=require("./scoreboard.js");console.log(s.compute(require("./data.json"),"2026-09-28"))'
(function (root) {
  const DAY = 86400000;
  // Categories always available even if data.json doesn't list them yet (data.json wins on conflicts).
  const DEFAULT_CATEGORIES = { challenge: { label: "Daily challenge", emoji: "🧠", color: "#ff5fd2" } };
  const categories = data => { const c = Object.assign({}, (data && data.categories) || {}); for (const k in DEFAULT_CATEGORIES) if (!c[k]) c[k] = DEFAULT_CATEGORIES[k]; return c; };
  const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);

  function compute(data, today) {
    const cfgS = Object.assign({ bonusEvery: 7, bonusPoints: 100 }, data.streak || {});
    const cfgC = Object.assign({ points: 1000, reward: 50 }, data.cashout || {});
    // Streak bonuses are ALWAYS computed here, never stored in data.json (so no double counting).
    const cats = categories(data);
    const isSpend = w => w.category === "cashout" || !!(cats[w.category] && cats[w.category].spend);
    const all = (data.wins || []).filter(w => w.category !== "streakbonus");
    // Cash-outs (rewards bought with points) never count toward lifetime points, levels or streaks.
    const wins = all.filter(w => !isSpend(w));
    const spends = all.filter(isSpend).map(w => Object.assign({}, w, { reward: true }));
    const byDay = {};
    wins.forEach(w => byDay[w.date] = (byDay[w.date] || 0) + (Number(w.points) || 0));
    const posDays = Object.keys(byDay).filter(d => byDay[d] > 0).sort();
    const pos = new Set(posDays);

    // Walk runs of consecutive positive days; every Nth day in a run earns a bonus.
    const bonuses = []; let best = 0, run = 0, prev = null;
    posDays.forEach(d => {
      run = (prev && addDays(prev, 1) === d) ? run + 1 : 1;
      if (run % cfgS.bonusEvery === 0) bonuses.push({
        date: d, emoji: "🔥", category: "streakbonus", points: cfgS.bonusPoints, bonus: true,
        text: run + "-day streak bonus! Awesome consistency"
      });
      best = Math.max(best, run); prev = d;
    });

    // Current streak: consecutive positive days ending today, or yesterday if today isn't positive (yet).
    let end = pos.has(today) ? today : addDays(today, -1), current = 0;
    while (pos.has(end)) { current++; end = addDays(end, -1); }
    const toNextBonus = cfgS.bonusEvery - (current % cfgS.bonusEvery);

    const base = wins.reduce((s, w) => s + (Number(w.points) || 0), 0);
    const bonusTotal = bonuses.reduce((s, b) => s + b.points, 0);
    const lifetime = base + bonusTotal;           // LIFETIME EARNED: drives level + badges, never drops when spending
    const total = lifetime;                       // (kept for backward compatibility)
    const ppd = cfgC.pointsPerDollar || cfgC.points / cfgC.reward;  // 20 pts per $1 (no currency conversion)
    const spentPts = spends.reduce((s, w) => s + Math.abs(Number(w.points) || 0), 0);
    const spentDollars = Math.round(spentPts / ppd * 100) / 100;
    const wallet = lifetime - spentPts;           // spendable balance
    const rewards = { count: spends.length, points: spentPts, dollars: spentDollars, items: [...spends].sort((a, b) => b.date.localeCompare(a.date)) };

    const levels = [...data.levels].sort((a, b) => a.min - b.min);
    let level = levels[0], next = levels[1] || null;
    levels.forEach((l, i) => { if (lifetime >= l.min) { level = l; next = levels[i + 1] || null; } });
    const levelPct = next ? Math.max(0, Math.min(100, (lifetime - level.min) / (next.min - level.min) * 100)) : 100;

    const safe = Math.max(0, wallet);              // cash-out bar = WALLET progress
    const cash = {
      goal: cfgC.points, reward: cfgC.reward,
      dollars: safe / cfgC.points * cfgC.reward,          // wallet value, e.g. 30 pts -> 1.50
      cashouts: Math.floor(safe / cfgC.points),          // full $50 chunks unlocked
      inGoal: safe % cfgC.points,                        // progress toward the next $50
    };
    cash.pct = cash.inGoal / cfgC.points * 100;

    const entries = [...wins, ...bonuses, ...spends].sort((a, b) => b.date.localeCompare(a.date) || (a.bonus ? -1 : 0) - (b.bonus ? -1 : 0));
    return { total, lifetime, wallet, rewards, pointsPerDollar: ppd, base, bonusTotal, bonuses, entries, level, next, levelPct, streak: { current, best, toNextBonus, every: cfgS.bonusEvery, bonus: cfgS.bonusPoints, activeToday: pos.has(today) }, cash, byDay };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { compute, addDays, categories };
  else root.Scoreboard = { compute, addDays, categories };
})(this);
