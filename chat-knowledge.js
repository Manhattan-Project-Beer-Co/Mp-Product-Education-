const BEER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfvDNoqxHQCc7PBCm-xetbdDiAfyfi3ECVbnRAfoCYJmdfSxFuamdGJ6THg97ErXp3hFCLG1IBcZsH/pub?gid=0&single=true&output=csv";

const SITE_OVERVIEW = `
Manhattan Project staff training portal covers:
- On Tap / All Beers: live beer menu from the tap list spreadsheet (name, tap number, style, ABV, flavor profile, description, guest guidance, gluten-reduced, new taps).
- Food tab: Breakfast, Lunch, Dinner, and Weekly Specials (Mon lunch, Taco Tue, Wed dinner) with dietary tags.
- Merch tab: In Stock and Up & Coming ideas with voting. Merch managers (merch role or admin) manage inventory and post ideas.
- Coffee tab: Menu (caffeine bar — purists, pour over, flavored, matcha, tea), Training Manual, Seasonal Lattes. Employees get a daily "what's new" briefing on first login when new taps, food specials, or seasonal lattes are flagged.
- Wine + Cocktails tab: wine by the glass/bottle, rotating Shirley Temples, and NA beverages (lemonade, Italian cream soda, ginger beer, etc.).
- Games tab: beer training games (Flavor Quiz, Guest Match, Tap Match, ABV Challenge, Style Match, Pick the Profile, Speed Round, Beer Flashcards) — all use on-tap beers from the spreadsheet only.
- My Progress / Team: training scores when logged in (not guest-facing product info).
`.trim();

const TRAINING_GAMES = [
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

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(cell => cell.trim())) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] || "").trim();
    });
    return obj;
  });
}

function col(item, field) {
  if (!item) return "";
  return item[field] || item[field.toLowerCase()] || "";
}

function formatBeer(beer) {
  const tap = col(beer, "Tap") || col(beer, "tap") || col(beer, "Tap Number");
  const parts = [
    col(beer, "Name"),
    tap ? `Tap ${tap}` : null,
    col(beer, "Style") || col(beer, "style"),
    col(beer, "ABV") || col(beer, "abv") ? `ABV ${col(beer, "ABV") || col(beer, "abv")}` : null,
    col(beer, "Flavor Profile") ? `Flavor: ${col(beer, "Flavor Profile")}` : null,
    col(beer, "Description / ingredients") ? `Description: ${col(beer, "Description / ingredients")}` : null,
    col(beer, "Guest Guidance") ? `Guest guidance: ${col(beer, "Guest Guidance")}` : null,
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

function buildContext(query, beers) {
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

  return chunks.join("\n\n").slice(0, 14000);
}

function localAnswer(query, beers) {
  const terms = tokenize(query);
  const q = query.toLowerCase();

  if (/^(hi|hello|hey)\b/.test(q)) {
    return "Hi! I can help with beers on the tap list, coffee bar training, and training games on this site. What would you like to know?";
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

  if (/game|quiz|flashcard|training/.test(q)) {
    return (
      "Training games on this site:\n\n" +
      TRAINING_GAMES.map(g => `• **${g.name}** — ${g.desc}`).join("\n") +
      "\n\nOpen the **Games** tab (beer) or **Coffee** tab (coffee quiz/flashcards)."
    );
  }

  return (
    "I couldn't find that in the training materials. Try asking about a specific beer, tap number, ABV, coffee dial-in, milk steaming, or a training game. " +
    "I only answer from content on this site."
  );
}

let beerCache = { rows: [], fetchedAt: 0 };

async function getBeers() {
  const now = Date.now();
  if (beerCache.rows.length && now - beerCache.fetchedAt < 5 * 60 * 1000) {
    return beerCache.rows;
  }

  const response = await fetch(BEER_CSV_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load beer menu data.");
  const text = await response.text();
  const rows = parseCSV(text).filter(b => col(b, "Name"));
  beerCache = { rows, fetchedAt: now };
  return rows;
}

module.exports = {
  BEER_CSV_URL,
  SITE_OVERVIEW,
  TRAINING_GAMES,
  COFFEE_SECTIONS,
  buildContext,
  localAnswer,
  getBeers,
  formatBeer
};
