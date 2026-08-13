const nucleus = require("./nucleus");

const { SITE_FEATURES, buildSiteOverviewText } = require("./site-features");

const SITE_OVERVIEW = buildSiteOverviewText();

const TRAINING_GAMES = [
  { name: "Staff Favorites", desc: "Guess teammates’ favorite beers for bonus points; unlocks them on the leaderboard." },
  { name: "Guest Scenarios", desc: "Recommend for Blue Moon fans, parties, allergies, intoxicated guests." },
  { name: "Complaint Recovery", desc: "MP preferred service recovery with tougher guest levels." },
  { name: "Tap Match", desc: "Match tap numbers to beers — critical for floor service." },
  { name: "Flavor Quiz", desc: "Match flavor profiles to beer names." },
  { name: "Guest Match", desc: "Guest guidance scenarios from the sheet." },
  { name: "ABV Challenge", desc: "Pick the correct ABV from the sheet." },
  { name: "Style Match", desc: "Pick the listed style for each beer." },
  { name: "Pick the Profile", desc: "Reverse quiz — pick the flavor profile for a beer." },
  { name: "Speed Round", desc: "12 mixed questions under time pressure." },
  { name: "Beer Flashcards", desc: "15 cards reviewing sheet info." },
  { name: "Coffee Quiz", desc: "10 questions from the coffee training manual." },
  { name: "Coffee Flashcards", desc: "15 cards on espresso, milk, and bar standards." }
];

const COFFEE_SECTIONS = [
  {
    title: "Coffee as a System",
    category: "Fundamentals",
    text:
      "Coffee quality is shaped before the barista touches the grinder: origin, processing, roast, and brew. Core mindset: read the coffee, control variables, chase balance — sweetness is the clearest sign of good extraction. Farm-to-cup: Origin (potential) → Processing (fruit/cleanliness) → Roasting (solubility) → Brewing (barista reveals potential)."
  },
  {
    title: "Origins and Terroir",
    category: "Fundamentals",
    text:
      "Climate, elevation, soil, and variety shape flavor. Ethiopia: floral, citrus, berry. Kenya: currant, structured acidity. Colombia: balanced, caramel, red fruit. Brazil: chocolate, nut, low acidity, heavy body. Central America: cocoa, citrus, stone fruit. Origin creates tendencies, not guarantees — processing and roast shift expression."
  },
  {
    title: "Processing Methods",
    category: "Fundamentals",
    text:
      "Washed: fruit removed before drying — cleaner, brighter. Natural: seed dries in fruit — fruit-forward, fuller body. Honey/pulped natural: sweet with round texture. Guest language: washed = cleaner; natural = fruitier; honey = in between."
  },
  {
    title: "Roasting and Solubility",
    category: "Fundamentals",
    text:
      "Light roasts: denser, harder to extract, brighter. Dark roasts: more soluble, heavier body, can go bitter quickly. Fresh coffee releases CO₂; very fresh resists even extraction. When behavior changes, check age, humidity, hopper refill, and roast — not just grind."
  },
  {
    title: "Extraction and Brew Variables",
    category: "Fundamentals",
    text:
      "Under-extracted: sharp, sour, thin → grind finer. Over-extracted: dry, bitter, hollow → grind coarser. Balanced: sweet and clear. Five variables: grind, time, temperature, ratio, water. Shop rule: hold dose and target yield during dial-in; adjust grind first."
  },
  {
    title: "Espresso Fundamentals and Dialing In",
    category: "Bar Skills",
    text:
      "House standard: 20.5 g dose, 36 g yield — adjust grind to taste (often mid-20s to low-30s seconds). Dial-in: purge, dose accurately, pull at target recipe, observe flow, taste, adjust grind. Sour → finer. Bitter → coarser. Ratio: dark 1:1–1:2, balanced ~1:2, bright 1:2.5–1:3. Taste guides adjustments, not numbers alone."
  },
  {
    title: "Milk Science and Steaming",
    category: "Bar Skills",
    text:
      "Stretch air, integrate with vortex. Latte: thin microfoam, glossy like wet paint. Cappuccino: slightly more aerated but integrated. Cortado: minimal foam, silky. Whole milk ~140–155°F; oat ~135–145°F. Problems: big bubbles (too much air), flat milk (not enough stretch), screaming (wrong tip placement)."
  },
  {
    title: "Drink Builds and Recipe Standards",
    category: "Bar Skills",
    text:
      "Macchiato ~3 oz: espresso + small textured milk. Cortado ~4 oz: equal parts. Cappuccino ~5–6 oz: slightly more foam. Latte 8 oz+: espresso + more milk, thin microfoam. Americano: espresso over hot water. Mocha: chocolate plus latte build. Iced: syrup, espresso, dilution logic, milk, ice — taste and presentation matter."
  },
  {
    title: "Workflow and Bar Communication",
    category: "Bar Skills",
    text:
      "Start espresso early, steam during extraction when appropriate, don't let shots sit. Call out: shots down, milk ready, remake, iced, alt milk. Remake when: shot clearly wrong, poor milk texture, wrong build, or below presentation standard. Protect quality first, then speed."
  },
  {
    title: "Cleaning, Maintenance, and Care",
    category: "Bar Skills",
    text:
      "During shift: purge/wipe wand after every use, rinse pitchers, knock pucks, keep station organized. Opening: purge group heads, check grinder, dial in, verify stock. Closing: backflush, soak baskets/portafilters, brush group heads, wipe surfaces."
  },
  {
    title: "Customer Education and Hospitality",
    category: "Bar Skills",
    text:
      "Guest language: origin = where; process = how prepared; roast = how developed. Don't lecture — use understandable flavor language. Never make curiosity embarrassing. Say yes when reasonable for off-script requests."
  },
  {
    title: "Training Path and Skill Checklists",
    category: "Reference",
    text:
      "Phase 1: farm-to-cup, terminology, tasting. Phase 2: espresso prep, puck prep, dial-in. Phase 3: milk steaming, drink builds. Phase 4: workflow under volume. Phase 5: hospitality and guest guidance. Evaluate: farm-to-cup, process types, roast impact, consistent recipe, milk texture, drink builds, cleanliness, rush communication."
  },
  {
    title: "Troubleshooting Guide",
    category: "Reference",
    text:
      "Fast shot: coarse grind, low dose, channeling — check puck prep, go finer. Slow shot: too fine or overdosed — go coarser. Sour: under-extraction — finer first. Bitter: over-extraction — coarser or shorter ratio. Big bubbles: too much air. Flat milk: not enough air or weak vortex. Late drinks in rush: sequencing and communication."
  },
  {
    title: "Quick Reference Charts",
    category: "Reference",
    text:
      "Sweetness test: if sweetness increases after an adjustment, continue carefully in that direction. Shot: sharp → finer, dry → coarser, uneven → improve prep. Milk: glossy and fluid is the target. Guest cheat sheet: Origin = where, Process = how prepared, Roast = how developed, Brew = what we control."
  }
];


function col(item, field) {
  if (!item) return "";
  return item[field] || item[field.toLowerCase()] || "";
}

function formatBeer(beer) {
  const tap = col(beer, "Tap") || col(beer, "tap") || col(beer, "Tap Number");
  const description =
    col(beer, "Description / ingredients") || col(beer, "Marketing Description");
  const staffNotes = col(beer, "Staff Notes") || col(beer, "History Note");
  const parts = [
    col(beer, "Name"),
    tap ? `Tap ${tap}` : null,
    col(beer, "Style") || col(beer, "style"),
    col(beer, "ABV") || col(beer, "abv") ? `ABV ${col(beer, "ABV") || col(beer, "abv")}` : null,
    col(beer, "IBU") ? `IBU ${col(beer, "IBU")}` : null,
    col(beer, "Flavor Profile") ? `Flavor: ${col(beer, "Flavor Profile")}` : null,
    description ? `Description: ${description}` : null,
    col(beer, "Guest Guidance") ? `Guest guidance: ${col(beer, "Guest Guidance")}` : null,
    staffNotes ? `Staff notes: ${staffNotes}` : null,
    isYes(col(beer, "Gluten-Reduced")) ? "Gluten-reduced" : null,
    isYes(col(beer, "New Tap")) ? "New tap" : null
  ].filter(Boolean);
  return parts.join(" | ");
}

function isYes(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "yes" || v === "y" || v === "true" || v === "1";
}

function tokenize(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2);
}

function scoreText(text, terms) {
  const lower = String(text || "").toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term)) score += term.length > 4 ? 3 : 1;
  }
  return score;
}

function stripHtml(text) {
  return String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatSopForContext(doc) {
  const parts = [`[${doc.category}] ${doc.title}`];
  if (doc.summary) parts.push(doc.summary);
  if (doc.body) parts.push(stripHtml(doc.body));
  return parts.join("\n");
}

function buildContext(query, beers, sops = []) {
  const terms = tokenize(query);
  const chunks = [`=== SITE OVERVIEW ===\n${SITE_OVERVIEW}`];

  chunks.push(
    "=== TRAINING GAMES ===\n" +
      TRAINING_GAMES.map(g => `- ${g.name}: ${g.desc}`).join("\n")
  );

  const beerLines = beers
    .map(beer => ({ text: formatBeer(beer), score: scoreText(formatBeer(beer), terms) }))
    .sort((a, b) => b.score - a.score);

  const topBeers = beerLines.filter(b => b.score > 0).slice(0, 12);
  const defaultBeers = beerLines.slice(0, 20);
  const beerSelection = topBeers.length ? topBeers : defaultBeers;

  if (beerSelection.length) {
    chunks.push(
      "=== BEER MENU (from tap list spreadsheet) ===\n" +
        beerSelection.map(b => b.text).join("\n")
    );
  }

  const coffeeHits = COFFEE_SECTIONS.map(section => ({
    section,
    score: scoreText(`${section.title} ${section.category} ${section.text}`, terms)
  }))
    .sort((a, b) => b.score - a.score);

  const coffeePick = coffeeHits.filter(c => c.score > 0).slice(0, 6);
  const coffeeSelection = coffeePick.length ? coffeePick : coffeeHits.slice(0, 5);

  chunks.push(
    "=== COFFEE TRAINING MANUAL ===\n" +
      coffeeSelection
        .map(({ section }) => `[${section.category}] ${section.title}\n${section.text}`)
        .join("\n\n")
  );

  if (sops.length) {
    const sopHits = sops
      .map(doc => ({
        doc,
        score: scoreText(`${doc.category} ${doc.title} ${doc.summary} ${stripHtml(doc.body)}`, terms)
      }))
      .sort((a, b) => b.score - a.score);

    const sopPick = sopHits.filter(row => row.score > 0).slice(0, 8);
    const sopSelection = sopPick.length ? sopPick : sopHits.slice(0, 4);

    chunks.push(
      "=== STANDARD OPERATING PROCEDURES (SOPs) ===\n" +
        sopSelection.map(({ doc }) => formatSopForContext(doc)).join("\n\n")
    );
  }

  return chunks.join("\n\n").slice(0, 14000);
}

function localAnswer(query, beers, sops = []) {
  const terms = tokenize(query);
  const q = query.toLowerCase();

  if (/^(hi|hello|hey)\b/.test(q)) {
    return "Hi — I'm Ask MP. Search beers, food, coffee, SOPs/recipes, events, and training in one place. Try “What goes in a Michelada?” or “How do I close the coffee station?”";
  }

  if (/michelada|mich\.?\s*mix|mich mix/.test(q)) {
    const mich = sops.find(doc => /michelada|mich/i.test(doc.title + doc.body));
    if (mich) {
      return `**${mich.title}**\n${mich.summary || ""}\n${stripHtml(mich.body).slice(0, 500)}\n\nOpen **SOPs → Recipes** for the full batch recipe.`;
    }
  }

  if (/gluten|gf|celiac/.test(q)) {
    const gfHits = beers.filter(b => /gluten|gf|reduced/i.test(formatBeer(b))).slice(0, 6);
    if (gfHits.length) {
      return (
        "Gluten-related beers from the list (still confirm with kitchen/lead for allergies):\n\n" +
        gfHits.map(b => `• ${formatBeer(b)}`).join("\n\n") +
        "\n\nUse **Floor Tools → Allergy Check** for food filters — never guarantee without kitchen confirmation."
      );
    }
  }

  const beerHits = beers
    .map(beer => ({ beer, score: scoreText(formatBeer(beer), terms) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (beerHits.length) {
    return (
      "Here's what I found in the beer menu:\n\n" +
      beerHits.map(({ beer }) => `• ${formatBeer(beer)}`).join("\n\n") +
      "\n\nCheck the **On Tap** or **All Beers** tab for full details."
    );
  }

  const coffeeHits = COFFEE_SECTIONS.map(section => ({
    section,
    score: scoreText(`${section.title} ${section.text}`, terms)
  }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (coffeeHits.length) {
    return (
      "From the coffee training manual:\n\n" +
      coffeeHits
        .map(({ section }) => `**${section.title}** (${section.category})\n${section.text}`)
        .join("\n\n")
    );
  }

  const sopHits = sops
    .map(doc => ({
      doc,
      score: scoreText(`${doc.category} ${doc.title} ${doc.summary} ${stripHtml(doc.body)}`, terms)
    }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (sopHits.length) {
    return (
      "From the SOP library:\n\n" +
      sopHits
        .map(({ doc }) => `**${doc.title}** (${doc.category})\n${doc.summary || stripHtml(doc.body).slice(0, 320)}`)
        .join("\n\n") +
      "\n\nOpen the **SOPs** tab for the full procedure."
    );
  }

  if (/sop|procedure|standard operating|opening|closing checklist/.test(q)) {
    return (
      "Standard operating procedures live on the **SOPs** tab. " +
      (sops.length
        ? "Current categories: " + [...new Set(sops.map(doc => doc.category))].join(", ") + "."
        : "Ask an admin to upload procedures there.")
    );
  }

  if (/game|quiz|flashcard|training/.test(q)) {
    return (
      "War Games on this site:\n\n" +
      TRAINING_GAMES.map(g => `• **${g.name}** — ${g.desc}`).join("\n") +
      "\n\nOpen the **War Games** tab (beer) or **Coffee** tab (coffee quiz/flashcards)."
    );
  }

  return (
    "I couldn't find that in Ask MP's training materials. Try a beer name, Michelada mix, coffee close, gluten-reduced taps, an SOP title, or a training game. " +
    "I only answer from content on this site — open **Floor Tools** for 86s, recommenders, and allergy check."
  );
}

function universalSearch(query, { beers = [], sops = [], foods = [] } = {}) {
  const terms = tokenize(query);
  const q = String(query || "").toLowerCase();
  const results = [];

  for (const beer of beers) {
    const text = formatBeer(beer);
    const score = scoreText(text, terms) + (/gluten|gf/.test(q) && /gluten|gf|reduced/i.test(text) ? 5 : 0);
    if (score > 0) {
      results.push({
        type: "beer",
        title: col(beer, "Name") || "Beer",
        summary: text,
        score,
        tab: "ontap"
      });
    }
  }

  for (const food of foods) {
    const text = `${food.name} ${food.description || ""} ${food.notes || ""} ${food.section || ""}`;
    const score = scoreText(text, terms);
    if (score > 0) {
      results.push({
        type: "food",
        title: food.name,
        summary: food.description || food.notes || "",
        score,
        tab: "food"
      });
    }
  }

  for (const section of COFFEE_SECTIONS) {
    const text = `${section.title} ${section.category} ${section.text}`;
    const score = scoreText(text, terms);
    if (score > 0) {
      results.push({
        type: "coffee",
        title: section.title,
        summary: section.text.slice(0, 220),
        score,
        tab: "coffee"
      });
    }
  }

  for (const doc of sops) {
    const text = `${doc.category} ${doc.title} ${doc.summary} ${stripHtml(doc.body)}`;
    const score = scoreText(text, terms);
    if (score > 0) {
      results.push({
        type: "sop",
        title: doc.title,
        summary: doc.summary || stripHtml(doc.body).slice(0, 220),
        score,
        tab: "sops",
        category: doc.category
      });
    }
  }

  for (const game of TRAINING_GAMES) {
    const score = scoreText(`${game.name} ${game.desc}`, terms);
    if (score > 0) {
      results.push({
        type: "training",
        title: game.name,
        summary: game.desc,
        score,
        tab: "game"
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 20);
}

/**
 * The beer list, from Nucleus.
 *
 * This used to fetch a published Google Sheet and then patch it: a
 * `BEER_TAP_OVERRIDES` table hardcoded taps 4, 16 and 17 and one description,
 * commented "local tap/menu patches until the spreadsheet is updated". The
 * spreadsheet was never updated, so for those taps the truth lived in this file
 * and nowhere else — which is the split-brain the move to Nucleus removes. Tap
 * state now has one home, and correcting it is an edit in Nucleus (or on the
 * Taps screen here), not a deploy.
 *
 * Caching lives in nucleus.js, so there is none here.
 */
const getBeers = () => nucleus.getBeerRows();

module.exports = {
  SITE_OVERVIEW,
  TRAINING_GAMES,
  COFFEE_SECTIONS,
  buildContext,
  localAnswer,
  universalSearch,
  getBeers,
  formatBeer
};
