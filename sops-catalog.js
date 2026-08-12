/**
 * SOP catalog seeded into sop_documents.
 * Syncs by title on server start so staff always get the latest procedures.
 */

function bullets(items) {
  return `<ul>${items.map(item => `<li>${item}</li>`).join("")}</ul>`;
}

function section(title, html) {
  return `<h4>${title}</h4>${html}`;
}

const SOPS_CATALOG = [
  {
    category: "Opening",
    title: "Opening Procedures",
    summary: "Full morning open — patio, coffee, taps, merch, and lunch prep.",
    sort_order: 1,
    body: `<p>Complete the <strong>Opening Procedures</strong> checklist on the Checklists tab before guests arrive. Highlights:</p>
${bullets([
  "Unlock, music on, trashcans forward, menus clean and laid out",
  "Patio furniture unlocked and arranged (Adirondacks even in bad weather); sweep gravel; open umbrellas",
  "Dial in espresso; restock cups; set tea pitcher in fridge",
  "Tap drainboards on; faucet caps off in hot water; Crowler supplies restocked",
  "Sanitizer towels at coffee bar + both main POS; silverware trays full"
])}`
  },
  {
    category: "Closing",
    title: "Closing Procedures 2.0",
    summary: "End-of-night close — bathrooms, patio, coffee, taps, floors, lock-up.",
    sort_order: 1,
    body: `<p>Use the <strong>Closing Procedures 2.0</strong> checklist. Key standards:</p>
${section("Patio lock", bullets([
  "Adirondack combo lock code: <strong>2216</strong> — reset 1–3 digits after locking",
  "Return padlock key to the pen cup"
]))}
${section("Coffee close", bullets([
  "Steam wands: 20 ml Rinza + hot water overnight in milk pitchers",
  "Backflush both groups with ½ tbsp Cafiza — sealed portafilter, press P for 8 seconds, three times"
]))}
${section("Lock-up", bullets([
  "POS on chargers; keys returned; music/lights/TVs off",
  "Remotes on grey cabinet near taproom cooler",
  "Confirm all doors locked"
]))}`
  },
  {
    category: "Floor",
    title: "Taproom Guide — In Service Standards",
    summary: "Floor rounds, food service, action items, events inquiries, and appearance.",
    sort_order: 1,
    body: `
${section("In the taproom", bullets([
  "Keep workspace organized — reset coffee area, glass racks, coasters; clear bar top; fill water bottles",
  "Whole team works together for guest experience and efficiency",
  "At least one person makes floor rounds: clear trays indoors/outdoors, sanitize, reset chairs",
  "Return empty glassware to the bar",
  "Check restrooms hourly (especially after rushes or fitness groups) — clean and stocked",
  "Front and face Beer To Go cooler as cans are pulled"
]))}
${section("Food service", bullets([
  "Upsell food — start with fries, then other items",
  "Assign a Table Location in Toast when food is ordered",
  "Deliver with polished silverware, napkins, and trays (two expo setups)",
  "After dining: bus, ask how the meal was, suggest a next visit"
]))}
${section("Action items during service", bullets([
  "Restock merch and dust shelves",
  "Clean/sanitize outdoor furniture; return to original layout",
  "Bus and sanitize indoor tables; sweep debris",
  "Restock and organize behind the bar",
  "Pull Beer To Go cans forward with logos facing out",
  "Clean and restock bathrooms",
  "Polish silverware and restock expos",
  "Practice efficient beertender & barista service; create repeat guests"
]))}
${section("Private events / reservations", bullets([
  "Direct inquiries to <a href=\"https://manhattanproject.beer/private-events/\" target=\"_blank\" rel=\"noopener\">manhattanproject.beer/private-events</a>",
  "Do not give out the Taproom Manager’s or Misty’s email addresses"
]))}
${section("Guidelines", bullets([
  "No drinking beer behind the bar — tasting samples only, no full pours",
  "Follow Opening, Closing, Cut, Weekly Detail, and Clean Don’t Lean checklists",
  "Uniforms: dark earth tones; appropriate clothing; staff may be sent to change if not compliant"
]))}`
  },
  {
    category: "Floor",
    title: "Cleaning Materials Guide",
    summary: "What cleaner to use where — tables, bathrooms, bar, lights.",
    sort_order: 2,
    body: `
${section("Tables & chairs", bullets([
  "Patio — Teak Oil (nightly)",
  "Inside wood — Wood to Wood (nightly)",
  "Adirondack black chairs, white chairs, black metal bench — Meyers (weekly)"
]))}
${section("Merch", bullets(["Duster as needed", "Meyers as needed"]))}
${section("Bathrooms", bullets([
  "Toilet — Mark 11, brush, paper towels",
  "Urinal — Mark 11 + paper towels",
  "Stainless — stainless cleaner + cloth",
  "Marble sinks — marble cleaner + cloth",
  "Mirror — window cleaner + cloth",
  "Floor — cleaning pod, mop bucket, mop"
]))}
${section("Taproom", bullets([
  "Windows — window cleaner + cloth",
  "Weekly windows — concentrate, squeegee, bucket, cloth",
  "Floors — broom, microfiber push broom, mop bucket, mop"
]))}
${section("Bar", bullets([
  "Wood tile — Wood to Wood (nightly)",
  "Tile — Meyers (nightly)",
  "Tap wall — soap (nightly); Brasso (weekly)",
  "Espresso — Grindz (after a bag), Rinza, Cafiza per package",
  "Bar floor — pods, deck brush, squeegee — <strong>DO NOT USE THE MOP</strong>"
]))}
${section("Lights", bullets(["Dust lights daily"]))}
`
  },
  {
    category: "Floor",
    title: "Table Layout Reference",
    summary: "Bar seats 101–112, dining 201–206 circles, 301–304 rectangles.",
    sort_order: 3,
    body: `
${section("Bar", bullets([
  "Bar stools / seats numbered <strong>101–112</strong> along the bar"
]))}
${section("Dining", bullets([
  "Circular tables <strong>201–206</strong>",
  "Rectangular tables <strong>301–304</strong>",
  "Use Toast table locations that match these numbers"
]))}
${section("Patio", bullets([
  "Follow current patio map / reserved markers for events and large parties"
]))}
`
  },
  {
    category: "Events",
    title: "Private Events SOP — Overview & Tabs",
    summary: "Individual vs event tabs, catering rules, and day-of host guidelines.",
    sort_order: 1,
    body: `
${section("Individual tabs", bullets([
  "Guests order from the main bar and keep personal tabs",
  "Do not add drinks to the Event Tab unless the host authorizes it",
  "Guests pay their own tabs",
  "No regular taproom food orders during private catered events — follow the BEO / catering order only"
]))}
${section("Staff expectations", bullets([
  "Confirm personal vs hosted beverages before each transaction",
  "Prevent accidental charges to the host Event Tab",
  "Communicate clearly about hosted vs non-hosted drinks"
]))}
${section("Day-of host guidelines", bullets([
  "We do not keep cards from online deposits — collect a valid host card on arrival and attach it to the event tab before start",
  "After drinks at the main bar, guests return to the reserved production space",
  "Restrooms: exit through the glass door closest to the event space — not through employee-only areas",
  "Production exit doors are emergency use only; enter/exit via glass taproom access door",
  "Direct guests to self-service water",
  "Children must stay seated or with a parent/guardian; patio requires parental supervision",
  "As a hospitality gesture when appropriate, provide the host their first beverage",
  "Remind host: regular taproom menu ordering is unavailable during catered private events"
]))}
${section("Responsible service", bullets([
  "MP reserves the right to limit, refuse, or modify beverage service",
  "All alcohol service follows TABC and responsible hospitality standards",
  "Drinking games are not permitted onsite"
]))}
`
  },
  {
    category: "Events",
    title: "Private Events SOP — Execution & Floor Plan",
    summary: "Pre-arrival timeline, host arrival, floor plan standards, during-event FOH.",
    sort_order: 2,
    body: `
${section("Pre-arrival (coordinator)", bullets([
  "Space setup complete; floor plan matches BEO unless directed otherwise",
  "Tables/chairs aligned; linens if applicable; catering set; reserved signage placed",
  "Bar informed of structure; kitchen informed of timing; host arrival confirmed",
  "Decor compliant; A/V tested; velvet rope bases wiped"
]))}
${section("Host arrival", bullets([
  "Warm welcome; review expectations, food timing, beverage structure, final adjustments",
  "Explain guest flow; collect host card onto event tab",
  "Explain restrooms, water, child safety; no regular menu ordering during catered events"
]))}
${section("Floor plan standards", bullets([
  "Black tablecloths unless BEO says otherwise",
  "Garage door open only if weather is 65°–75°F",
  "Black velvet ropes in safety areas; wipe bases before guests and after breakdown",
  "Table or ropes in front of glass wall to prevent collisions",
  "Dim lights appropriately; music on Source 2 at event volume",
  "Confirm Big Screen TV per BEO",
  "Start post-event linens in the wash immediately after"
]))}
${section("Garage door safety", bullets([
  "If guests/children misuse the garage door chain or use it as entry/exit: one warning, then close the door for safety"
]))}
${section("During event — FOH", bullets([
  "Stay aware of pacing; keep guest areas clean; monitor trash and glassware",
  "Communicate with kitchen and bar; fix issues with ownership",
  "Support event guests and regular taproom guests"
]))}
${section("Food & beverage flow", bullets([
  "Standard food service is buffet style; runners verify tickets and presentation",
  "All beverages through main bar unless approved otherwise",
  "Bartenders must know tab structure before start; monitor event tabs for accuracy"
]))}
${section("Production space safety", bullets([
  "Guests respect cordoned areas and avoid brewing equipment",
  "Children supervised at all times; with a parent on patio",
  "When appropriate, tell guests the production space may run warmer in summer"
]))}
<p>Use the <strong>Event Setup</strong> checklist on the Checklists tab for the 16 day-of tasks.</p>
`
  },
  {
    category: "Recipes",
    title: "Michelada Mix (Mich. Mix)",
    summary: "Batch recipe for Michelada mix kept on the line. Add more bar batch recipes under Recipes.",
    sort_order: 1,
    body: `
${section("Recipe", bullets([
  "10 limes, strained",
  "77.5 g dry mix",
  "1 Clamato",
  "1 small cup Worcestershire",
  "½ small cup Tabasco"
]))}
<p>Label the container clearly and keep refrigerated per house standards.</p>
`
  },
  {
    category: "Bar",
    title: "Acid Washing Glassware",
    summary: "Two-bucket acid wash for glassware when scheduled.",
    sort_order: 3,
    body: bullets([
      "Fill first 5-gallon bucket with 2.5 gallons of water",
      "Add 200 mL of acid",
      "Scrub glassware thoroughly with a blue scrubber in the acid solution",
      "Fill second 5-gallon bucket halfway with clean water",
      "Rinse each glass thoroughly in the rinse bucket",
      "Air dry or place in the designated drying area"
    ])
  },
  {
    category: "Bar",
    title: "Guest Allergy & Dietary Questions",
    summary: "Never guess — use portal data and escalate when unsure.",
    sort_order: 1,
    body: `<p>Never guess on allergens. Use the tap list and food descriptions in this portal.</p>
${bullets([
  "Gluten-reduced beers are flagged on the beer list — confirm with kitchen for food",
  "Coffee default is whole milk; oat milk on request",
  "If unsure, check with a manager or the kitchen before confirming"
])}`
  }
];

/** Titles moved out of SOPs (e.g. drink recipes that live on the Coffee tab). */
const SOPS_RETIRED_TITLES = [
  "Banana Foster Latte (Seasonal)"
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOPS_CATALOG, SOPS_RETIRED_TITLES };
}
