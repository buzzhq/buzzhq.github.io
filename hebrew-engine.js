/* Buzz's Hebrew Word Rally engine (added 4 Oct 2026). Pure JS, no DOM: used by hebrew.html and tests/hebrew.test.js.
   A word is sounded out letter by letter, RIGHT TO LEFT (string order = reading order), then "What does it mean?".
   Words are written WITHOUT nikud; vowels are added in the transliteration chunks (e.g. ד = "da", ג = "g" -> "dag"). */
(function (root) {
  "use strict";
  const SOUND = {
    b: "b (like ball)", v: "v (like van)", g: "g (like go)", d: "d (like dog)", h: "h (like hat)", z: "z (like zip)",
    ch: "ch (like Bach)", l: "l (like lion)", m: "m (like moon)", n: "n (like nose)", s: "s (like sun)", sh: "sh (like ship)",
    o: "o (like on)", u: "u (like zoo)", silent: "silent (it just carries a vowel)", k: "k (like kite)", r: "r (like race)",
    t: "t (like top)", ts: "ts (like cats)",
    y: "y (like yes)", i: "ee (like see)", end: "quiet at the end (it just finishes the vowel)"
  };
  // per letter: name + typical mix-ups (lookalike letters / sound slips), each with a gentle hint
  const LETTERS = {
    "א": { name: "Alef", mix: [["m", "That's what מ (Mem) says. א is a quiet letter: it makes no sound itself, it just carries a vowel."], ["n", "That's what נ (Nun) says. א is a quiet letter: it just carries a vowel sound."], ["t", "Not this one! א is quiet: it just carries a vowel sound."]] },
    "ב": { name: "Bet / Vet", mix: [["k", "That's what כ (Kaf) says, and it looks a lot like ב! ב has a flat bottom line with a little tail; כ is round."], ["n", "That's what נ (Nun) says. נ is skinny with a short base; ב is wider with a long flat bottom."], ["g", "That's what ג (Gimel) says. ג has a little foot kicking out; ב has a flat bottom line."]] },
    "ג": { name: "Gimel", mix: [["n", "That's what נ (Nun) says. Look for the little foot kicking out at the bottom left: that's ג, g like go!"], ["d", "That's what ד (Dalet) says. ג is the one with the kicking foot at the bottom."], ["z", "That's what ז (Zayin) says. ג has a kicking foot at the bottom: g like go."]] },
    "ד": { name: "Dalet", mix: [["r", "That's what ר (Resh) says! ר has a round corner; ד has a sharp corner sticking out at the top right."], ["t", "Close: d and t are cousins! But ד says d, like dog."], ["g", "That's what ג (Gimel) says. ד has a sharp corner at the top right and no foot."]] },
    "ה": { name: "He", mix: [["ch", "That's what ח (Chet) says! ח is closed across the top; ה has a little gap at the top of its left leg."], ["t", "That's what ת (Tav) says. ה has a gap at the top of its left leg: h like hat."], ["v", "Not this one. ה (with the gap in its left leg) says h, like hat."]] },
    "ו": { name: "Vav", mix: [["z", "That's what ז (Zayin) says. ז has a little hat sticking out on both sides; ו just has a small hook on top."], ["n", "That's what נ (Nun) says. ו is the plain little stick with a hook on top."], ["g", "That's what ג (Gimel) says. ו is the plain little stick with a hook on top."]] },
    "ז": { name: "Zayin", mix: [["v", "That's what ו (Vav) says. ז has a hat on top that sticks out both sides, like a nail head: z like zip!"], ["n", "That's what נ (Nun) says. ז is the stick with a hat: z like zip."], ["g", "That's what ג (Gimel) says. ז is the stick with a flat hat: z like zip."]] },
    "ח": { name: "Chet", mix: [["h", "That's what ה (He) says. ה has a gap at the top left; ח is closed all the way across. ח says the throaty ch, like Bach."], ["t", "That's what ת (Tav) says, and ת has a little foot. ח is plain: the throaty ch, like Bach."], ["k", "Close, but ח is the throaty ch, like Bach (not a hard k)."]] },
    "ל": { name: "Lamed", mix: [["n", "That's what נ (Nun) says. ל is the tall one that sticks up above all the others: l like lion!"], ["k", "ל is the tall one sticking up above the line: l like lion."], ["r", "ל is the tallest letter, sticking up above the others: l like lion."]] },
    "מ": { name: "Mem", mix: [["s", "That's what ס (Samech) says. ס is round and closed; מ has a little opening at the bottom left: m like moon."], ["t", "That's what ט (Tet) says. מ has a small opening at the bottom left: m like moon."], ["n", "That's what נ (Nun) says. מ is the wide one with a little opening at the bottom: m like moon."]] },
    "ם": { name: "final Mem", mix: [["s", "That's what ס (Samech) says. ס is round; ם is a square box. ם is the END-of-word Mem!"], ["t", "Not this one. ם is a closed box: it's how מ looks at the end of a word."], ["n", "Not quite. ם (a closed box) is the end-of-word Mem."]] },
    "נ": { name: "Nun", mix: [["g", "That's what ג (Gimel) says, the one with the kicking foot. נ is narrow with a short base: n like nose."], ["k", "That's what כ (Kaf) says, and כ is wide and round. נ is narrow: n like nose."], ["v", "That's what ו (Vav) says. נ has a little base at the bottom: n like nose."]] },
    "ס": { name: "Samech", mix: [["m", "That's what ם (final Mem) says, and ם is square. ס is round like a ring: s like sun!"], ["sh", "That's what ש (Shin) says, the one with three arms. ס is round like a ring: s like sun."], ["t", "Not this one. ס is round like a ring: s like sun."]] },
    "י": { name: "Yod", mix: [["v", "That's what ו (Vav) says, and ו is a tall stick. י is the TINY letter floating halfway up: y like yes!"], ["z", "That's what ז (Zayin) says (the stick with a hat). י is the tiny floating one: y like yes."], ["n", "That's what נ (Nun) says. י is the tiny letter floating halfway up: y like yes."]] },
    "ש": { name: "Shin", mix: [["ts", "That's what צ (Tsadi) says. ש has three arms pointing up, like a crown: sh like ship!"], ["ch", "Not quite. ש has three arms pointing up, like a crown: sh like ship."], ["m", "That's what מ (Mem) says. ש is the one with three arms: sh like ship."]] }
  };
  // word bank: w (no nikud), tr (sounded out), parts = [sound key, chunk] per letter (right to left), en, emoji, clue, fact, newLetter
  const W = (w, tr, parts, en, emoji, clue, fact, newLetter) => ({ w, tr, parts, en, emoji, clue, fact, newLetter: newLetter || null });
  const WORDS = [
    W("דג", "dag", [["d", "da"], ["g", "g"]], "fish", "🐟", "It swims!", "Dag means fish. Lots of fish are dagim!"),
    W("גל", "gal", [["g", "ga"], ["l", "l"]], "wave", "🌊", "You can surf it at the beach.", "Gal means wave. Surfers in Tel Aviv ride the galim (waves) of the Mediterranean Sea."),
    W("דב", "dov", [["d", "do"], ["v", "v"]], "bear", "🐻", "A big furry animal that loves honey.", "Dov means bear, and Dov is also a boy's name in Israel!"),
    W("לב", "lev", [["l", "le"], ["v", "v"]], "heart", "❤️", "It beats inside you.", "Lev means heart. Your lev beats faster when you sprint down the basketball court!"),
    W("סל", "sal", [["s", "sa"], ["l", "l"]], "basket", "🏀", "You shoot hoops into one.", "Sal means basket. Basketball in Hebrew is kadursal: kadur (ball) + sal (basket)!"),
    W("שש", "shesh", [["sh", "she"], ["sh", "sh"]], "six", "🎲", "A number: the most dots on a dice.", "Shesh means six. The same letter twice: sh…sh!"),
    W("דגל", "degel", [["d", "de"], ["g", "g"], ["l", "el"]], "flag", "🏁", "They wave a checkered one at the end of a race.", "Degel means flag. At the end of a race they wave the checkered degel!"),
    W("גלגל", "galgal", [["g", "ga"], ["l", "l"], ["g", "ga"], ["l", "l"]], "wheel", "🛞", "Every car has four of them.", "Galgal means wheel. It's gal + gal, like a wheel going round and round! A car has 4 galgalim."),
    W("חלב", "chalav", [["ch", "cha"], ["l", "la"], ["v", "v"]], "milk", "🥛", "A white drink that comes from cows.", "Chalav means milk. It helps build strong bones for jumping and shooting hoops!"),
    W("זהב", "zahav", [["z", "za"], ["h", "ha"], ["v", "v"]], "gold", "🥇", "First place gets a medal made of it.", "Zahav means gold. A gold medal is a medalyat zahav!"),
    W("שמש", "shemesh", [["sh", "she"], ["m", "me"], ["sh", "sh"]], "sun", "☀️", "It shines in the sky all day.", "Shemesh means sun. The sun is so big that about a million Earths could fit inside it!"),
    W("שלג", "sheleg", [["sh", "she"], ["l", "le"], ["g", "g"]], "snow", "❄️", "Cold and white, it falls in winter.", "Sheleg means snow. Israel even has a ski site on Mount Hermon!"),
    W("נחש", "nachash", [["n", "na"], ["ch", "cha"], ["sh", "sh"]], "snake", "🐍", "It slithers and hisses.", "Nachash means snake. Snakes smell with their tongues!"),
    W("מלח", "melach", [["m", "me"], ["l", "la"], ["ch", "ch"]], "salt", "🧂", "You sprinkle it on chips.", "Melach means salt. The Dead Sea is called Yam HaMelach (the Salt Sea): it's so salty you float!"),
    W("דבש", "dvash", [["d", "d"], ["v", "va"], ["sh", "sh"]], "honey", "🍯", "Bees make this sweet, sticky food.", "Dvash means honey. Honey can last for a super long time without going off!"),
    W("גמל", "gamal", [["g", "ga"], ["m", "ma"], ["l", "l"]], "camel", "🐪", "A desert animal with a hump.", "Gamal means camel. The English word camel actually comes from it!"),
    W("מזל", "mazal", [["m", "ma"], ["z", "za"], ["l", "l"]], "luck", "🍀", "You need some of it to win a coin toss.", "Mazal means luck. Israelis say \"Mazal tov!\" to say congratulations!"),
    W("חמש", "chamesh", [["ch", "cha"], ["m", "me"], ["sh", "sh"]], "five", "🖐️", "A number: count the fingers on one hand.", "Chamesh means five. High five!"),
    W("מגדל", "migdal", [["m", "mi"], ["g", "g"], ["d", "da"], ["l", "l"]], "tower", "🗼", "A very tall building.", "Migdal means tower. In Fortnite you could build a giant migdal!"),
    W("סוס", "sus", [["s", "s"], ["u", "u"], ["s", "s"]], "horse", "🐴", "It gallops, and it says neigh!", "Sus means horse. Car power is measured in horsepower: in Hebrew that's koach sus!"),
    W("חול", "chol", [["ch", "ch"], ["o", "o"], ["l", "l"]], "sand", "🏖️", "The beach is covered in it.", "Chol means sand. Israel's beaches along the Mediterranean are full of it."),
    W("דוד", "dod", [["d", "d"], ["o", "o"], ["d", "d"]], "uncle", "👨", "Your mum's or dad's brother.", "Dod means uncle. The same letter at both ends: d…d!"),
    // words with ONE new letter (introduced in the game)
    W("אבא", "abba", [["silent", "a"], ["b", "bb"], ["silent", "a"]], "dad", "👨", "The person who made you this website!", "Abba means dad. Say it to your dad and see if he smiles!", "א"),
    W("סבא", "saba", [["s", "sa"], ["b", "b"], ["silent", "a"]], "grandpa", "👴", "Your dad's or mum's dad.", "Saba means grandpa. Savta means grandma!", "א"),
    W("אמא", "ima", [["silent", "i"], ["m", "m"], ["silent", "a"]], "mum", "👩", "Another word for mother.", "Ima means mum. Abba and Ima = Dad and Mum!", "א"),
    W("חם", "cham", [["ch", "cha"], ["m", "m"]], "hot", "🔥", "Like a summer day, or a stove.", "Cham means hot. Watch out, the pizza is cham!", "ם"),
    W("גשם", "geshem", [["g", "ge"], ["sh", "she"], ["m", "m"]], "rain", "🌧️", "Water falling from the clouds.", "Geshem means rain. Israel gets most of its rain in winter.", "ם"),
    W("לחם", "lechem", [["l", "le"], ["ch", "che"], ["m", "m"]], "bread", "🍞", "You make sandwiches with it.", "Lechem means bread. Bethlehem is Beit Lechem: house of bread!", "ם"),
    W("שלום", "shalom", [["sh", "sha"], ["l", "l"], ["o", "o"], ["m", "m"]], "hello / peace", "👋", "What you say when you meet someone.", "Shalom means hello, goodbye AND peace. One word, three jobs!", "ם")
  ];
  const BY = Object.fromEntries(WORDS.map(x => [x.w, x]));
  const VOWEL_MIX = { o: [["v", "ו usually says v, but in the middle of a word it's often a vowel. Here it says o, like on!"], ["z", "That's what ז (Zayin) says. Here ו is working as a vowel: o, like on."]],
                      u: [["v", "ו usually says v, but in the middle of a word it's often a vowel. Here it says u, like zoo!"], ["z", "That's what ז (Zayin) says. Here ו is working as a vowel: u, like zoo."]] };
  // "Tricky one" letters: vowel letters and quiet letters, keyed "<letter>:<sound>"
  const TRICKY = {
    "ו:o": VOWEL_MIX.o, "ו:u": VOWEL_MIX.u,
    "י:i": [["y", "י often says y (like yes), but at the END of a word like this it's a vowel: ee, like see!"], ["v", "That's what ו (Vav) says. י is the tiny floating letter, and here it's a vowel: ee, like see."]],
    "ה:end": [["h", "At the END of a word ה is usually quiet: it just finishes the vowel sound (cha-ma, ze). No h sound!"], ["ch", "That's what ח (Chet) says. Here ה is at the end of the word, so it's quiet: it just finishes the vowel."]]
  };
  const TRICKY_Q = { "ו:o": "Tricky one! Here ו is in the middle of the word. What sound does it make?", "ו:u": "Tricky one! Here ו is in the middle of the word. What sound does it make?",
    "י:i": "Tricky one! Here י is at the END of the word. What sound does it make?", "ה:end": "Tricky one! ה is at the END of the word. What does it do here?",
    "א:silent": "Tricky one! What does א do here?" };
  const NEW_INTRO = {
                      "י": "🆕 New letter! This is י (Yod), the tiniest letter. It says y (like yes), and sometimes it's a vowel: ee (like see).", "א": "🆕 New letter! This is א (Alef). It's a quiet letter: it makes no sound itself, it just carries a vowel.",
                      "ם": "🆕 New letter! This is ם (final Mem): it's how מ looks at the END of a word, and it still says m." };

  function shuffleIn(arr, rng) { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // letter steps for one word x = {w, parts, newLetter}; o = {first: is this the very first word, introduced: Set of letters already introduced}
  function letterSteps(x, rng, o) {
    o = o || { first: true, introduced: new Set() };
    const letters = [...x.w], steps = [];
    letters.forEach((ch, i) => {
      const [snd] = x.parts[i], L = LETTERS[ch], tk = ch + ":" + snd;
      const mixes = TRICKY[tk] || L.mix;
      const wrong = shuffleIn(mixes.filter(([k]) => k !== snd && SOUND[k] !== SOUND[snd]), rng).slice(0, 2);
      const opts = [{ label: SOUND[snd], value: snd, ok: true }].concat(wrong.map(([k, hint]) => ({ label: SOUND[k], value: k, ok: false, hint })));
      const isNew = x.newLetter === ch && !o.introduced.has(ch); if (isNew) o.introduced.add(ch);
      let q = i === 0 ? (o.first ? `Start on the RIGHT! What sound does ${ch} make?` : `New word! Start on its RIGHT: what sound does ${ch} make?`) : `Next letter (moving left ⬅️): what sound does ${ch} make?`;
      if (TRICKY_Q[tk]) q = TRICKY_Q[tk];
      if (ch === "ב" && snd === "v") q += " (ב can say b or v!)";
      if (ch === "ב" && snd === "b") q += " (ב can say b or v!)";
      if (isNew) q = `${NEW_INTRO[ch]} What sound does it make here?`;
      const soFar = x.parts.slice(0, i + 1).map(p => p[1]).join("");
      const chunk = x.parts[i][1];
      const what = snd === "silent" ? (chunk ? `is quiet, it just carries the "${chunk}"` : `is quiet here: the next letter brings the sound`)
        : snd === "end" ? `is quiet at the end, it just finishes the "${chunk}"`
        : (TRICKY[tk] ? `is a vowel here: ${snd === "i" ? "ee" : snd}` : `says ${snd}`);
      steps.push({ kind: "letter", i, ch, q, opts, isNew, chunk,
        say: `${ch} (${L.name}) ${what}. ${i === letters.length - 1 ? `${soFar}!` : `${soFar}…`}` });
    });
    return steps;
  }
  function buildWord(w, rng) {
    rng = rng || Math.random;
    const x = BY[w]; if (!x) throw new Error("unknown word " + w);
    const steps = letterSteps(x, rng);
    const others = shuffleIn(WORDS.filter(o => o.en !== x.en), rng).slice(0, 2);
    steps.push({ kind: "meaning", q: `We sounded out "${x.tr}"! What do you think it means? Clue: ${x.clue}`,
      opts: [{ label: `${x.emoji} ${x.en}`, value: x.en, ok: true }].concat(others.map(o => ({ label: `${o.emoji} ${o.en}`, value: o.en, ok: false, hint: `Not that one (that's ${o.w}, ${o.tr}). Clue: ${x.clue}` }))),
      say: `${x.w} = ${x.tr} = ${x.en} ${x.emoji}` });
    return { word: x.w, tr: x.tr, en: x.en, emoji: x.emoji, fact: x.fact, newLetter: x.newLetter, parts: x.parts, answer: x.tr, steps };
  }
  const lettersOf = w => [...new Set([...w])];
  // known = array of learned letters; returns words that are fine for him: all letters known, or exactly one new letter
  function suitable(known, maxNew) {
    const K = new Set(known); maxNew = maxNew === undefined ? 1 : maxNew;
    return WORDS.filter(x => lettersOf(x.w).filter(c => !K.has(c)).length <= maxNew);
  }

  // ---------- Hebrew SENTENCES (added 17 Oct 2026): short, easy sentences read word by word, letter by letter ----------
  // Word = "Hebrew|transliteration chunks per letter (sound:chunk, right to left)|meaning". Sounds: see SOUND
  // (silent = quiet א carrying a vowel; end = quiet ה at the end of a word; o/u = ו as a vowel; i = י as a vowel; y = י as y).
  const SW = (spec) => { const [w, p, en] = spec.split("|"); const parts = p.split(" ").map(c => { const k = c.indexOf(":"); return [c.slice(0, k), c.slice(k + 1)]; });
    return { w, parts, tr: parts.map(q => q[1]).join(""), en }; };
  const WB = {
    ze: SW("זה|z:z end:e|this is"), dag: SW("דג|d:da g:g|fish"), gadol: SW("גדול|g:ga d:d o:o l:l|big"), gal: SW("גל|g:ga l:l|wave"),
    migdal: SW("מגדל|m:mi g:g d:da l:l|tower"), hashemesh: SW("השמש|h:ha- sh:she m:me sh:sh|the sun"), chama: SW("חמה|ch:cha m:m end:a|hot"),
    meod: SW("מאוד|m:m silent:e o:o d:d|very"), hadov: SW("הדב|h:ha- d:do v:v|the bear"), ohev: SW("אוהב|silent: o:o h:he v:v|loves"),
    dvash: SW("דבש|d:d v:va sh:sh|honey"), hasus: SW("הסוס|h:ha- s:s u:u s:s|the horse"), abba: SW("אבא|silent:a b:bb silent:a|Dad"),
    chalav: SW("חלב|ch:cha l:la v:v|milk"), sheleg: SW("שלג|sh:she l:le g:g|snow"), hanachash: SW("הנחש|h:ha- n:na ch:cha sh:sh|the snake"),
    hagamal: SW("הגמל|h:ha- g:ga m:ma l:l|the camel"), chol: SW("חול|ch:ch o:o l:l|sand"), hagal: SW("הגל|h:ha- g:ga l:l|the wave"),
    hachol: SW("החול|h:ha- ch:ch o:o l:l|the sand"), cham: SW("חם|ch:cha m:m|hot"), bashemesh: SW("בשמש|b:ba- sh:she m:me sh:sh|in the sun"),
    yesh: SW("יש|y:ye sh:sh|there is"), li: SW("לי|l:l i:i|to me"), sus: SW("סוס|s:s u:u s:s|horse"), hadegel: SW("הדגל|h:ha- d:de g:g l:el|the flag"),
    sheli: SW("שלי|sh:she l:l i:i|my / mine"), nachash: SW("נחש|n:na ch:cha sh:sh|snake"), bachol: SW("בחול|b:ba- ch:ch o:o l:l|in the sand"),
    ladov: SW("לדב|l:la- d:do v:v|to the bear"), basal: SW("בסל|b:ba- s:sa l:l|in the basket"), lev: SW("לב|l:le v:v|heart")
  };
  const S = (id, keys, en, emoji, fact, newLetter) => { const words = keys.split(" ").map(k => WB[k]);
    return { id, text: words.map(x => x.w).join(" "), words, tr: words.map(x => x.tr).join(" "), en, emoji, fact, newLetter: newLetter || null }; };
  const SENTENCES = [
    S("s01", "ze dag gadol", "This is a big fish.", "🐟", "Ze means this (is). In Hebrew you don't need a word for \"is\": ze dag gadol = this (is a) fish big!"),
    S("s02", "ze gal gadol", "This is a big wave.", "🌊", "In Hebrew the describing word comes AFTER the noun: gal gadol = wave big!"),
    S("s03", "ze migdal gadol", "This is a big tower.", "🗼", "Migdal gadol = tower big. Build one in Fortnite!"),
    S("s04", "hashemesh chama meod", "The sun is very hot.", "☀️", "Ha- at the start of a word means \"the\": ha-shemesh = the sun. And meod = very!", "א"),
    S("s05", "hadov ohev dvash", "The bear loves honey.", "🐻", "Ohev means loves. Ani ohev kadursal = I love basketball!", "א"),
    S("s06", "hasus gadol meod", "The horse is very big.", "🐴", "Gadol meod = very big. Add meod to make anything MORE!", "א"),
    S("s07", "abba ohev chalav", "Dad loves milk.", "🥛", "Abba ohev = Dad loves. Does your abba love milk?", "א"),
    S("s08", "abba ohev sheleg", "Dad loves snow.", "❄️", "Sheleg = snow. Israelis drive up Mount Hermon to play in it!", "א"),
    S("s09", "hanachash gadol meod", "The snake is very big.", "🐍", "Ha-nachash = the snake. Some pythons are longer than a car!", "א"),
    S("s10", "hagamal ohev chol", "The camel loves sand.", "🐪", "Camels have extra eyelashes to keep the chol (sand) out of their eyes!", "א"),
    S("s11", "hagal gadol meod", "The wave is very big.", "🏄", "Ha-gal = the wave. Surf's up!", "א"),
    S("s12", "hachol cham bashemesh", "The sand is hot in the sun.", "🏖️", "Ba- at the start of a word means \"in the\": ba-shemesh = in the sun.", "ם"),
    S("s13", "yesh li dag", "I have a fish.", "🐠", "Yesh li = I have (word for word: there is to me). Yesh li dag = I have a fish!", "י"),
    S("s14", "yesh li sus", "I have a horse.", "🐎", "Yesh li sus = I have a horse. Giddy-up!", "י"),
    S("s15", "ze hadegel sheli", "This is my flag.", "🏁", "Sheli = my / mine, and it comes after the noun: ha-degel sheli = the flag of mine.", "י"),
    S("s16", "ze hasus sheli", "This is my horse.", "🐴", "Ha-sus sheli = my horse (word for word: the horse of mine).", "י"),
    S("s17", "yesh nachash bachol", "There's a snake in the sand.", "🐍", "Yesh = there is. Yesh nachash = there's a snake. Watch your step!", "י"),
    S("s18", "ladov yesh dvash", "The bear has honey.", "🍯", "La-dov yesh = the bear has (word for word: to the bear there is). Yum!", "י"),
    S("s19", "yesh nachash basal", "There's a snake in the basket!", "🧺", "Sal = basket, like in kadursal (basketball). A snake in the basket: no slam dunks today!", "י"),
    S("s20", "hadegel sheli gadol", "My flag is big.", "🚩", "Ha-degel sheli gadol = my flag (is) big. No word for \"is\" again!", "י"),
    S("s21", "yesh li lev gadol", "I have a big heart.", "❤️", "Lev gadol (a big heart) means you're kind and generous.", "י")
  ];
  const SBY = Object.fromEntries(SENTENCES.map(x => [x.text, x]));
  function buildSentence(text, rng) {
    rng = rng || Math.random;
    const x = SBY[text] || SENTENCES.find(s => s.id === text); if (!x) throw new Error("unknown sentence " + text);
    const steps = [], o = { first: true, introduced: new Set() };
    x.words.forEach((wd, wi) => {
      const ls = letterSteps({ w: wd.w, parts: wd.parts, newLetter: x.newLetter }, rng, o); o.first = false;
      ls.forEach((st, k) => { st.wi = wi; if (k === ls.length - 1) { st.say += ` ${wd.w} = ${wd.tr} = "${wd.en}"`; st.wordDone = true; } steps.push(st); });
    });
    const others = shuffleIn(SENTENCES.filter(o2 => o2.en !== x.en), rng).slice(0, 2);
    steps.push({ kind: "meaning", q: `We read "${x.tr}"! What does the whole sentence mean?`,
      opts: [{ label: x.en, value: x.en, ok: true }].concat(others.map(o2 => ({ label: o2.en, value: o2.en, ok: false,
        hint: `Not that one. Look back at the word meanings: ${x.words.map(w => `${w.tr} = ${w.en}`).join(", ")}.` }))),
      say: `${x.text} = ${x.tr} = ${x.en} ${x.emoji}` });
    return { kind: "sentence", id: x.id, word: x.text, text: x.text, words: x.words, tr: x.tr, en: x.en, emoji: x.emoji, fact: x.fact, newLetter: x.newLetter,
      parts: x.words.flatMap(w => w.parts), answer: x.tr, steps };
  }
  function suitableSentences(known, maxNew) {
    const K = new Set(known); maxNew = maxNew === undefined ? 1 : maxNew;
    return SENTENCES.filter(x => lettersOf(x.text.replace(/ /g, "")).filter(c => !K.has(c)).length <= maxNew);
  }
  const CODE_TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"];
  const codeFromHex = h => CODE_TAGS[parseInt(h.slice(0, 2), 16) % 16] + String(parseInt(h.slice(2, 6), 16) % 90 + 10);
  const api = { WORDS, BY, LETTERS, SOUND, buildWord, suitable, lettersOf, codeFromHex, SENTENCES, SBY, buildSentence, suitableSentences };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HebrewEngine = api;
})(typeof window !== "undefined" ? window : this);
