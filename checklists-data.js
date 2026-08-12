/**
 * Floor checklists — Opening, Closing, Cut, Events, Detail days, Clean Don't Lean.
 * Used by Checklists tab + completion API.
 */

function tasks(list) {
  return list.map((title, index) => ({
    id: index + 1,
    title
  }));
}

function sectioned(sections) {
  const out = [];
  let id = 1;
  for (const section of sections) {
    for (const title of section.tasks) {
      out.push({ id: id++, title, section: section.name });
    }
  }
  return out;
}

const CHECKLISTS = [
  {
    id: "opening",
    name: "Opening Procedures",
    category: "Daily",
    dueLabel: "Before open",
    summary: "Patio, coffee bar, tap wall, merch, and lunch-ready setup.",
    tasks: tasks([
      "Unlock doors",
      "Turn on music and bring forward the 3 silver trashcans",
      "Wipe black plastic chairs with Meyers + hot water towel (seats, legs, backs); place chairs on floor; wipe black poles under bar stools",
      "Distribute and straighten ALL menus — toss dirty/wrinkled menus and replace",
      "Windex glass around door handles (taproom and production as needed)",
      "Unlock black Adirondack chairs and arrange neatly on the grass (any weather)",
      "Unlock remaining furniture — keep short and long locks/cables separated",
      "Walk patio and entrances for glassware, trash, pet waste — handle accordingly",
      "Open umbrellas for shade",
      "Sweep stones on sidewalks back into the gravel pit",
      "Wipe wood tables, black and white chairs with hot water, soap, and sani towel",
      "Coffee: knock box with towel; set portafilter, tamp, mat, spoon, scale mat",
      "Reinstall the coffee drainboard",
      "Ready milk pitchers and small microfiber towel for the steamer",
      "Purge, rinse, and wipe steam wands",
      "Fill bean hopper and dial in espresso",
      "Restock paper cups and lids; polish coffee cups",
      "Set up three bar sinks to wash coffee cups",
      "Set up tea pitcher and place in taproom fridge",
      "Set up three wet black bar towels with sani-rinse",
      "Place bar drainboards back on the tap wall",
      "Remove beer faucet caps into designated cup with hot water; place on drying rack",
      "Put clean glassware away; restock Crowler supplies",
      "Restock clear plastic water cups; place white drain board back",
      "Restock all merch",
      "Place clean towels in dryer; grab towel bucket; fold dry laundry into grey cabinet",
      "Check Teams calendar",
      "Place three wet sanitizer towels at coffee bar and 2 main POS areas",
      "Fill silverware trays and folded napkins for lunch rush"
    ])
  },
  {
    id: "closing",
    name: "Closing Procedures 2.0",
    category: "Daily",
    dueLabel: "End of night",
    summary: "Bathrooms, patio, coffee, taps, floors, laundry, and lock-up.",
    tasks: sectioned([
      {
        name: "Bathrooms",
        tasks: [
          "Dust light fixtures with black feather duster",
          "Clean mirrors streak-free (paper towels + glass cleaner)",
          "Clean marble with marble cleaner; faucets/sinks with sani towel",
          "Clean changing stations inside/out; remove trash/waste/diapers",
          "Detail toilets (seat, bowl, base); pick up floor trash",
          "Replace paper towel & sanitary napkin bags with clear bags; clean cans with stainless",
          "Clean stainless stall walls, paper towel holder, changing station (white/green stripe towel)",
          "Restock toilet paper and paper towels (room for 1 c-fold pack)",
          "Refill liquid hand soap if under 50%"
        ]
      },
      {
        name: "Outside patio",
        tasks: [
          "Sweep patio; gather glassware; pick up trash; wipe patio tables",
          "Charge exterior lamps",
          "Lock furniture; reset Adirondack combo lock 1–3 digits (code 2216)",
          "Return furniture padlock key to pen cup",
          "Bring patio trash can inside; empty; new bag; clean with stainless"
        ]
      },
      {
        name: "Coffee / barista",
        tasks: [
          "Pull knock box; clean; leave upside down on drying rack",
          "Wash/dry coffee accessories, tamp, mats, portafilters, milk pitchers",
          "Wash drain guard; clean Rocket area with stainless + microfiber",
          "Wash, dry, and polish remaining coffee cups",
          "Wipe coffee counter; wipe hopper/grinder and turn grinder off",
          "Soak steam wands with 20 ml Rinza + hot water overnight in milk pitchers",
          "Soak portafilters with Cafiza on deep-clean schedule",
          "Backflush both groups: ½ tbsp Cafiza in sealed portafilter; press P 8 sec; repeat 3×",
          "Dump/scrub tea pitcher from taproom fridge; leave upside down over sinks"
        ]
      },
      {
        name: "Tap wall / Crowler / bar",
        tasks: [
          "Pull tap drainboard; wash with soap; rinse; dry on rack",
          "Wipe tap heads — no condensation left",
          "Wash glass-rinse brass plates and tap-wall drain",
          "Wipe back of tap wall and base with hot water",
          "Wipe Crowler machine inside and out",
          "Insert clean beer faucet caps into each tap",
          "Restock Beer To Go fridge; front/face cans; wipe black plastic lids"
        ]
      },
      {
        name: "Surfaces",
        tasks: [
          "Marble with marble cleaner; tulip bases with glass cleaner; wood tables/stools with wood-to-wood",
          "Clean windows and door handles with glass cleaner",
          "Clean merchandise shelves",
          "Clean wall behind water station; lift cups; wipe marble & brass; wash white drainboard",
          "Wipe wood tables; place chairs on tables for sweeping/mopping",
          "Clean silver trashcans (inner lid + outside); replace liners",
          "Clean upstairs table/chairs by kitchen close-down area",
          "Wipe wall/bussing station with Meyers"
        ]
      },
      {
        name: "Sinks / glassware / floors",
        tasks: [
          "Run all glassware through dishwasher and put away",
          "Confirm coffee cups and drain boards are clean; close sink area",
          "Wipe sink station clean — use Cafiza if discolored",
          "NEW: Sweep stairs to the kitchen",
          "Sweep cowhide rugs",
          "Sweep under bar seats and detail areas before push-broom",
          "Sweep taproom, under/behind bar, stairs, bathrooms",
          "Wet mop taproom, under/behind bar, bathrooms",
          "Haul trash to outside bins; clean cans; replace liners"
        ]
      },
      {
        name: "Laundry / admin",
        tasks: [
          "Gather towels; start load on high spin / hot",
          "Connect all POS machines to chargers",
          "Restock silverware rolls / merch shelving",
          "Collect menu boards and silverware trays onto bar stools for morning staff",
          "Restock dry goods in back cabinet",
          "Confirm bathroom hand-towel key and furniture padlock keys returned",
          "Turn off music, lights, TVs — remotes on grey cabinet near taproom cooler",
          "Double-check all doors locked when walking out"
        ]
      }
    ])
  },
  {
    id: "afternoon-cut",
    name: "Afternoon Cut Checklist",
    category: "Daily",
    dueLabel: "Due ~8:00 PM",
    summary: "Mid/late shift reset before close — glassware, restock, and floor tidy.",
    tasks: tasks([
      "Collect and wash all glassware",
      "Run all dirty dishes upstairs",
      "Roll all available silverware",
      "Replace sink water",
      "Restock coffee station",
      "Restock water cups and wipe down water area",
      "Restock and face Beer To Go cooler",
      "Restock coasters, napkins, and expo trays",
      "Bus and sanitize indoor tables; reset chairs",
      "Clear patio trays/glassware; wipe tables as needed",
      "Check and restock restrooms",
      "Sweep high-traffic floor debris",
      "Wipe bar top and POS areas",
      "Empty full trash if needed; replace liner",
      "Refill ice as needed",
      "Polish and put away clean glassware",
      "Check garnish / Michelada back stock",
      "Wipe Crowler station",
      "Confirm sanitizer towels at coffee bar and main POS",
      "Quick merch straighten / dust if needed",
      "Note low inventory or issues for the closer / lead"
    ])
  },
  {
    id: "clean-dont-lean",
    name: "Clean Don't Lean",
    category: "Detail",
    dueLabel: "Slow periods",
    summary: "Deep-clean punch list when the floor is quiet.",
    tasks: tasks([
      "Silverware trays — scrub with soap and water",
      "White bins — scrub with soap and water",
      "Flight boards — wood to wood",
      "Sinks — scrub with soap and water",
      "Racks — run through dishwasher",
      "Glassware — scrub with soap and water",
      "Milk fridge — wipe with Meyers (no stickiness)",
      "Ice maker — wipe inside tray with warm water (no stains/stickiness)",
      "Coffee grounds area next to trash — scrub floor and corner",
      "Lower and upper bathroom walls — wipe tile; dust black walls and edge above tile",
      "Above men's urinal — scrub with soap and water",
      "Expos — Meyers first, then stainless / wood to wood",
      "Dishwasher — drain board and door",
      "Drying station — Meyers under rack; scrub rack with soap and water",
      "Water station — scrub white drainboard and gold plate",
      "Menu boards — wood to wood",
      "Dust merch — feather duster first, then Meyers",
      "Black barstool poles — Meyers",
      "Black leg chairs — Meyers",
      "Cheese boards — wood to wood",
      "RR doors — Meyers",
      "Bussing station wall — scrub with soap and water",
      "Mop and scrub under bussing station and trash can",
      "Lockers — sweep area; wipe exterior",
      "Upstairs — sweep; wipe tables/rails/chairs",
      "Borders / door frames — Meyers",
      "Stairs (treads and ledge) — sweep / mop / scrub",
      "Dog bowls — scrub with soap and water",
      "Hex tile wall — scrub with soap and water",
      "White walls behind swivel chairs and 2-top — scrub with soap and water",
      "Rail under bar — Brasso",
      "Benches — Meyers",
      "Sweep patio — rocks and trash"
    ])
  },
  {
    id: "event-setup",
    name: "Event Setup",
    category: "Events",
    dueLabel: "Before guests",
    summary: "Private event day-of setup from BEO through host handoff.",
    tasks: tasks([
      "Review BEO, event notes, and floorplan",
      "Confirm kitchen menu and food timing",
      "Confirm tab, tickets, or individual tabs",
      "Confirm with bar team: tab name & bar tab type",
      "Set safety boundaries & reserved sign",
      "Set tables, linens & seating",
      "Set buffet table, chafers and sternos",
      "Set plates, utensils & serving ware",
      "Set menus & coasters on tables",
      "Set lighting, music & volume (Source 2)",
      "Set garage door based on weather (open only 65°–75°F)",
      "Set TV, HDMI, or A/V if needed",
      "Clean and organize event area",
      "Complete guest-ready check",
      "Review Host Guidelines with event host",
      "Confirm drink ticket count and give tickets to host"
    ])
  },
  {
    id: "detail-monday",
    name: "Monday Detail",
    category: "Weekly detail",
    dueLabel: "Monday",
    summary: "Brass, windows, merch, drains, leather chairs.",
    tasks: tasks([
      "Brass tap wall — Brasso + dry cloth only",
      "Windows both sides — squeegee, blue bucket, hot water, glass cleaner concentrate",
      "Restock, straighten, clean merch shelving (backups in bottom cabinets if full)",
      "Clean taproom drains; behind/under dishwasher, drying rack, sinks, fridges",
      "Wipe black window/door frames",
      "Black leather chairs — leather wipes; wood-to-wood on legs",
      "Detail menus / flight boards with wood to wood",
      "White silverware trays & milk fridge bins — soap and water",
      "Detail small milk fridge and ice machine tray",
      "All patio chairs and benches — Meyers"
    ])
  },
  {
    id: "detail-tuesday",
    name: "Tuesday Detail",
    category: "Weekly detail",
    dueLabel: "Tuesday",
    summary: "Brass rails, cold storage, dishwasher, espresso deep clean.",
    tasks: tasks([
      "Brass rails & brass bar drain board — soap/water then Brasso",
      "Taproom cold storage — organize milk shelf, beer orders, syrups, sodas; mop area",
      "Clean expo stations — Meyers, then wood-to-wood / stainless",
      "Clean dishwasher — remove grate; spray with yellow brewery hose",
      "Deep clean espresso machine, under cups, grind area (floor, counter, grinder)",
      "Clean both taproom floor drains with bleach (never set bleach on counters)",
      "Dust lights with feather duster; sconces with glass cleaner + black microfiber",
      "All patio chairs and benches — Meyers",
      "Detail small milk fridge and ice machine tray",
      "White silverware trays & milk fridge bins — soap and water"
    ])
  },
  {
    id: "detail-wednesday",
    name: "Wednesday Detail",
    category: "Weekly detail",
    dueLabel: "Wednesday",
    summary: "Windows, brass, black wood walls, glassware racks, restrooms.",
    tasks: tasks([
      "Clean all windows with concentrate + squeegee",
      "Restock, straighten, clean merch shelving",
      "Brass tap wall — Brasso + dry cloth only",
      "Black wood walls (bench, under bar, water tap wall) — wood cleaner only; straight strokes, no circles",
      "Run glassware racks through dishwasher; clean bottom base racks with sani towel",
      "Mop outside cold storage; clean wall behind bussing; mop under bussing; clean under lockers",
      "Detail restroom walls — black/tile with Meyers",
      "All patio chairs and benches — Meyers",
      "White silverware trays & milk fridge bins — soap and water",
      "Detail small milk fridge and ice machine tray",
      "Detail water taps"
    ])
  },
  {
    id: "detail-thursday",
    name: "Thursday Detail",
    category: "Weekly detail",
    dueLabel: "Thursday",
    summary: "Stairs, wall bases, chairs, lights, expos.",
    tasks: tasks([
      "Clean staircase walls, treads, toe kick, rail — sponge, hot water, soap, Meyers",
      "Wipe wall bases in bar (hex wall, white wall under bar)",
      "Door bases — hot towel + Meyers",
      "Black leather chairs — leather wipes; black plastic chairs — Meyers",
      "Dust lights; clean sconces",
      "White silverware trays & milk fridge bins — soap and water",
      "Clean expo stations — Meyers, then wood-to-wood / stainless",
      "Detail small milk fridge and ice machine tray",
      "All patio chairs and benches — Meyers"
    ])
  },
  {
    id: "detail-friday",
    name: "Friday Detail",
    category: "Weekly detail",
    dueLabel: "Friday",
    summary: "Pre-weekend brass, cold storage, stairs, beer-to-go doors.",
    tasks: tasks([
      "Brass tap wall — clean before the busy weekend",
      "Taproom cold storage — organize milk shelf / syrups / sodas; mop area",
      "Sweep / mop stairs",
      "Detail small milk fridge and ice machine tray",
      "All patio chairs and benches — Meyers",
      "White silverware trays & milk fridge bins — soap and water",
      "Clean Beer To Go glass doors",
      "Setup production and canning line areas before 5"
    ])
  }
];

function getChecklistById(id) {
  return CHECKLISTS.find(list => list.id === id) || null;
}

function listChecklists() {
  return CHECKLISTS.map(({ id, name, category, dueLabel, summary, tasks: taskList }) => ({
    id,
    name,
    category,
    dueLabel,
    summary,
    taskCount: taskList.length
  }));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CHECKLISTS, getChecklistById, listChecklists };
}

if (typeof window !== "undefined") {
  window.CHECKLISTS_DATA = { CHECKLISTS, getChecklistById, listChecklists };
}
