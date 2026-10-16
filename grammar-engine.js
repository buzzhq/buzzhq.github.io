/* Buzz's Sentence Detective engine (added 17 Oct 2026). Pure JS, no DOM: used by grammar.html, tests/grammar.test.js and tools/grammar.py.
   Each question = a short fun sentence with ONE highlighted word/phrase in *stars*, and the part it plays.
   Tier 1: noun / verb / adjective / adverb. Tier 2: + pronoun / preposition / conjunction. Tier 3: subject / object (asked as "subject or object?"). */
(function (root) {
  "use strict";
  const DEF = {
    noun: { e: "🧱", short: "A NOUN is a person, place, animal or thing.", ex: "The CAR raced to the FINISH LINE." },
    verb: { e: "⚡", short: "A VERB is a doing (or being) word: the action.", ex: "Alon DUNKED the ball." },
    adjective: { e: "🎨", short: "An ADJECTIVE describes a noun: what kind, what colour, how big.", ex: "a SHINY red car" },
    adverb: { e: "💨", short: "An ADVERB tells HOW, WHEN or WHERE something happens, and often ends in -ly.", ex: "The car zoomed QUICKLY." },
    pronoun: { e: "🙋", short: "A PRONOUN takes the place of a noun so we don't repeat it: I, you, he, she, it, we, they, them.", ex: "Alon grabbed the ball and HE shot." },
    preposition: { e: "📍", short: "A PREPOSITION shows where (or when) something is compared to something else: in, on, under, over, behind, through.", ex: "The ball rolled UNDER the bench." },
    conjunction: { e: "🔗", short: "A CONJUNCTION joins words or ideas together: and, but, or, because, so.", ex: "I was tired BUT I kept riding." },
    subject: { e: "🎬", short: "The SUBJECT is who or what DOES the action (usually before the verb).", ex: "THE ROCKET blasted off." },
    object: { e: "🎯", short: "The OBJECT is who or what the action is done TO (usually right after the verb).", ex: "Alon kicked THE BALL." }
  };
  const TIER = { noun: 1, verb: 1, adjective: 1, adverb: 1, pronoun: 2, preposition: 2, conjunction: 2, subject: 3, object: 3 };
  const WORD_CLASSES = ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction"];
  const Q = (id, s, a, why) => ({ id, s, a, why, tier: TIER[a] });
  const BANK = [
    // ---- nouns
    Q("g01", "The *car* zoomed around the track.", "noun", "It's a thing: the car."),
    Q("g02", "Alon shot the *ball* from the corner.", "noun", "It's a thing you can hold: the ball."),
    Q("g03", "A *rocket* blasted into space.", "noun", "It's a thing: a rocket."),
    Q("g04", "The *astronaut* waved from the window.", "noun", "It's a person: the astronaut."),
    Q("g05", "My *bike* flew off the jump.", "noun", "It's a thing: my bike."),
    Q("g06", "The crowd cheered for the *team*.", "noun", "It names a group of people: the team."),
    Q("g07", "We built a giant *tower* in Fortnite.", "noun", "It's a thing you can build: a tower."),
    Q("g08", "The *beach* was full of surfers.", "noun", "It's a place: the beach."),
    Q("g09", "Dad parked the *truck* in the garage.", "noun", "It's a thing: the truck."),
    // ---- verbs
    Q("g10", "The car *zoomed* past the finish line.", "verb", "It's the action: what did the car do? It zoomed."),
    Q("g11", "Alon *dribbled* the ball down the court.", "verb", "It's the action: what did Alon do? He dribbled."),
    Q("g12", "The rocket *roared* into the sky.", "verb", "It's the action: what did the rocket do? It roared."),
    Q("g13", "I *jumped* my bike over the log.", "verb", "It's the action: what did I do? I jumped."),
    Q("g14", "Our team *won* the final game.", "verb", "It's the action: what did the team do? It won."),
    Q("g15", "Astronauts *float* inside the space station.", "verb", "It's the action: what do astronauts do? They float."),
    Q("g16", "My dog *barks* at the postie.", "verb", "It's the action: what does the dog do? It barks."),
    Q("g17", "We *ride* our bikes to school.", "verb", "It's the action: what do we do? We ride."),
    Q("g18", "The driver *steered* around the sharp corner.", "verb", "It's the action: what did the driver do? Steered."),
    // ---- adjectives
    Q("g19", "The *red* car won the race.", "adjective", "It describes the car: which car? The red one."),
    Q("g20", "A *huge* wave crashed on the beach.", "adjective", "It describes the wave: how big? Huge."),
    Q("g21", "Alon laced up his *new* shoes.", "adjective", "It describes the shoes: what kind? New ones."),
    Q("g22", "The rocket was *enormous*.", "adjective", "It describes the rocket (the noun): how big was it? Enormous."),
    Q("g23", "We rode down a *steep* hill.", "adjective", "It describes the hill: what kind of hill? A steep one."),
    Q("g24", "The *shiny* trophy sat on the shelf.", "adjective", "It describes the trophy: what was it like? Shiny."),
    Q("g25", "The *muddy* track was slippery.", "adjective", "It describes the track: what kind of track? A muddy one."),
    Q("g26", "Saturn has *beautiful* rings.", "adjective", "It describes the rings: what are they like? Beautiful."),
    Q("g27", "The *tired* players drank some water.", "adjective", "It describes the players: what were they like? Tired."),
    // ---- adverbs
    Q("g28", "The car zoomed *quickly* around the bend.", "adverb", "It tells HOW the car zoomed: quickly (and it ends in -ly)."),
    Q("g29", "Alon aimed *carefully* at the hoop.", "adverb", "It tells HOW Alon aimed: carefully."),
    Q("g30", "The spaceship landed *gently* on the Moon.", "adverb", "It tells HOW the spaceship landed: gently."),
    Q("g31", "The crowd cheered *loudly*.", "adverb", "It tells HOW the crowd cheered: loudly."),
    Q("g32", "The snail crawled *slowly* across the path.", "adverb", "It tells HOW the snail crawled: slowly."),
    Q("g33", "*Suddenly*, the lights went out.", "adverb", "It tells HOW (or when) the lights went out: suddenly."),
    Q("g34", "We will go to the skate park *soon*.", "adverb", "It tells WHEN we will go: soon."),
    Q("g35", "Dad *always* wears his lucky cap.", "adverb", "It tells WHEN (how often) Dad wears it: always."),
    Q("g36", "The puppy wagged its tail *happily*.", "adverb", "It tells HOW the puppy wagged its tail: happily."),
    Q("g37", "The rider landed the jump *perfectly*.", "adverb", "It tells HOW the rider landed: perfectly."),
    Q("g38", "The engine started *noisily*.", "adverb", "It tells HOW the engine started: noisily."),
    // ---- pronouns (tier 2)
    Q("g39", "Alon grabbed the ball and *he* scored.", "pronoun", "It takes the place of Alon's name, so we don't say Alon twice."),
    Q("g40", "The astronauts smiled because *they* were back on Earth.", "pronoun", "It takes the place of 'the astronauts'."),
    Q("g41", "*We* raced our bikes down the hill.", "pronoun", "It stands for me and my friends, without saying our names."),
    Q("g42", "Dad found the keys and gave *them* to me.", "pronoun", "It takes the place of 'the keys'."),
    Q("g43", "The kitten chased a leaf, then *it* fell asleep.", "pronoun", "It takes the place of 'the kitten'."),
    Q("g44", "The coach said *she* was proud of the team.", "pronoun", "It takes the place of 'the coach'."),
    // ---- prepositions (tier 2)
    Q("g45", "The ball rolled *under* the bench.", "preposition", "It shows WHERE the ball went compared to the bench: under it."),
    Q("g46", "The rocket flew *through* the clouds.", "preposition", "It shows WHERE the rocket flew compared to the clouds: through them."),
    Q("g47", "The car parked *behind* the bus.", "preposition", "It shows WHERE the car is compared to the bus: behind it."),
    Q("g48", "Alon jumped *over* the puddle.", "preposition", "It shows WHERE Alon jumped compared to the puddle: over it."),
    Q("g49", "The trophy sits *on* the top shelf.", "preposition", "It shows WHERE the trophy is compared to the shelf: on it."),
    Q("g50", "The bike sped *across* the bridge.", "preposition", "It shows WHERE the bike went compared to the bridge: across it."),
    // ---- conjunctions (tier 2)
    Q("g51", "I wanted to play outside, *but* it was raining.", "conjunction", "It joins two ideas: I wanted to play / it was raining."),
    Q("g52", "Alon *and* Dad shot hoops together.", "conjunction", "It joins two names: Alon + Dad."),
    Q("g53", "We went inside *because* it was cold.", "conjunction", "It joins two ideas and tells why: because it was cold."),
    Q("g54", "Do you want pizza *or* pasta?", "conjunction", "It joins two choices: pizza or pasta."),
    Q("g55", "I was hungry, *so* I ate a banana.", "conjunction", "It joins two ideas: I was hungry, so (that's why) I ate."),
    Q("g56", "The race was long, *but* I didn't give up.", "conjunction", "It joins two ideas: the race was long / I didn't give up."),
    // ---- subjects (tier 3)
    Q("g57", "*The rocket* blasted into space.", "subject", "The rocket is who/what DID the blasting."),
    Q("g58", "*The fastest car* won the race.", "subject", "The fastest car is what DID the winning."),
    Q("g59", "*My dog* chased the ball.", "subject", "My dog is who DID the chasing."),
    Q("g60", "*The goalkeeper* caught the ball.", "subject", "The goalkeeper is who DID the catching."),
    Q("g61", "*Alon* scored ten points.", "subject", "Alon is who DID the scoring."),
    Q("g62", "*The astronaut* fixed the satellite.", "subject", "The astronaut is who DID the fixing."),
    // ---- objects (tier 3)
    Q("g63", "Alon kicked *the ball*.", "object", "The ball is what got kicked: the action was done TO it."),
    Q("g64", "The mechanic fixed *the engine*.", "object", "The engine is what got fixed."),
    Q("g65", "Our team won *the trophy*.", "object", "The trophy is what got won."),
    Q("g66", "The puppy ate *my sandwich*.", "object", "My sandwich is what got eaten (oh no!)."),
    Q("g67", "The driver honked *the horn*.", "object", "The horn is what got honked."),
    Q("g68", "Dad baked *a chocolate cake*.", "object", "A chocolate cake is what got baked.")
  ];
  const BY = Object.fromEntries(BANK.map(q => [q.id, q]));
  const parse = s => { const m = s.match(/^(.*?)\*(.+?)\*(.*)$/); return { before: m[1], target: m[2], after: m[3] }; };
  function shuffleIn(arr, rng) { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  // distractor pool: same "kind" of question, never something that could ALSO be right
  function pool(q, maxTier) {
    if (q.tier === 3) return ["subject", "object", "verb"].filter(x => x !== q.a);
    const t = Math.max(q.tier, Math.min(maxTier || 1, 2));
    let p = WORD_CLASSES.filter(x => TIER[x] <= t && x !== q.a);
    if (q.a === "pronoun") p = p.filter(x => x !== "noun");      // a pronoun stands in for a noun: don't offer noun
    return p;
  }
  function hintFor(q, wrong) {
    const P = parse(q.s);
    if (q.tier === 3 && wrong !== "verb") return `Not quite! ${DEF[wrong].short} Ask: who or what DID the action? That's the subject. Who or what was it done TO? That's the object.`;
    return `Not quite! ${DEF[wrong].short} Is "${P.target}" doing that job here? Try again!`;
  }
  function buildQuestion(id, rng, maxTier) {
    rng = rng || Math.random;
    const q = BY[id]; if (!q) throw new Error("unknown question " + id);
    const P = parse(q.s), wrong = shuffleIn(pool(q, maxTier), rng).slice(0, 2);
    const opts = [{ value: q.a, label: `${DEF[q.a].e} ${q.a}`, ok: true }].concat(wrong.map(w => ({ value: w, label: `${DEF[w].e} ${w}`, ok: false, hint: hintFor(q, w) })));
    const ask = q.tier === 3 ? `Is the highlighted part the SUBJECT or the OBJECT?` : `What part of speech is the highlighted word?`;
    return { id: q.id, s: q.s, ...P, a: q.a, tier: q.tier, ask, opts: shuffleIn(opts, rng), why: q.why, def: DEF[q.a], answer: q.a };
  }
  const CODE_TAGS = ["GT", "RS", "ZR", "VX", "TX", "RX", "GX", "ST", "XR", "JX", "KZ", "MZ", "DR", "BX", "FZ", "NX"];
  const codeFromHex = h => CODE_TAGS[parseInt(h.slice(0, 2), 16) % 16] + String(parseInt(h.slice(2, 6), 16) % 90 + 10);
  const api = { DEF, TIER, BANK, BY, parse, buildQuestion, pool, codeFromHex };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.GrammarEngine = api;
})(typeof window !== "undefined" ? window : this);
