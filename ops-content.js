/**
 * Floor content packs: recommenders, scenarios, troubleshooting, emergency,
 * keg estimates, secret achievements metadata.
 * Used by browser (index.html) and optionally server.
 */

const GUEST_TASTE_TAGS = [
  { id: "light", label: "Light" },
  { id: "hoppy", label: "Hoppy" },
  { id: "fruity", label: "Fruity" },
  { id: "dark", label: "Dark" },
  { id: "not_bitter", label: "Not bitter" },
  { id: "high_abv", label: "High ABV" },
  { id: "modelo", label: "Similar to Modelo" },
  { id: "wine", label: "I normally drink wine" }
];

const FOOD_BEER_PAIRINGS = {
  "fried-chicken-2pc": [
    { beerHint: "hoppy IPA or lager", why: "Carbonation and bitterness cut fried richness." },
    { beerHint: "crisp lager", why: "Keeps Nam Jim and spice bright." }
  ],
  "bacon-cheeseburger": [
    { beerHint: "amber / brown / IPA", why: "Malt sweetness loves bacon and cheese." },
    { beerHint: "hoppy pale", why: "Resets the palate between bites." }
  ],
  "steak-frites": [
    { beerHint: "dark lager or stout", why: "Roasty notes echo char and chimichurri." },
    { beerHint: "hoppy IPA", why: "Cuts fat from the steak and fries." }
  ],
  "arepa-braised-pork": [
    { beerHint: "Mexican lager / light lager", why: "Classic with pork, lime, and cotija." },
    { beerHint: "wheat / wit", why: "Soft spice and citrus for the arepa." }
  ],
  default: [
    { beerHint: "house lager or light ale", why: "Safe, food-friendly reset for most plates." },
    { beerHint: "ask what they usually drink", why: "Bridge from their comfort beer to an MP tap." }
  ]
};

const GUEST_SCENARIOS = [
  {
    id: "blue-moon",
    prompt: "I usually drink Blue Moon but want to try something different.",
    options: [
      { text: "Offer a wheat/wit or light citrusy ale and explain the familiar soft spice.", good: true, tip: "Bridge from known to new — don't dunk on Blue Moon." },
      { text: "Push the bitterest IPA on the wall.", good: false, tip: "Too big a jump for this guest." },
      { text: "Say we don't have anything like that.", good: false, tip: "Always offer a path." }
    ]
  },
  {
    id: "modelo",
    prompt: "I normally drink Modelo — what do you have?",
    options: [
      { text: "Recommend a crisp Mexican-style or clean lager and offer a taste if allowed.", good: true, tip: "Stay in the lager lane first." },
      { text: "Only suggest pastry stout.", good: false, tip: "Wrong profile." },
      { text: "Ignore the ask and upsell food only.", good: false, tip: "Answer the beer question first." }
    ]
  },
  {
    id: "large-party",
    prompt: "Walk-in party of 14 asks if you can seat them now on a busy Saturday.",
    options: [
      { text: "Check wait/sections with the lead, set expectations, offer patio/bar options.", good: true, tip: "Honesty + options beats overpromising." },
      { text: "Seat them immediately without telling the kitchen.", good: false, tip: "Creates a crash." },
      { text: "Tell them to leave.", good: false, tip: "Too blunt — offer a path." }
    ]
  },
  {
    id: "allergy",
    prompt: "Guest asks if the fried chicken is safe for a nut allergy.",
    options: [
      { text: "Never guess — check notes, confirm with kitchen, state what you know and what you can't guarantee.", good: true, tip: "Escalate when unsure." },
      { text: "Say it's probably fine.", good: false, tip: "Dangerous." },
      { text: "Read ingredients off memory from last week.", good: false, tip: "Use current portal + kitchen." }
    ]
  },
  {
    id: "intoxicated",
    prompt: "Guest is visibly intoxicated and ordering another round.",
    options: [
      { text: "Slow service, offer water/food, loop in shift lead, refuse service if needed per policy.", good: true, tip: "Safety over sales." },
      { text: "Serve quickly to get them out.", good: false, tip: "Increases risk." },
      { text: "Argue with the guest alone on the floor.", good: false, tip: "Get a lead." }
    ]
  }
];

const COMPLAINT_SCENARIOS = [
  {
    id: "slow-food",
    level: 1,
    prompt: "Guest: 'We've been waiting forever on food.'",
    options: [
      { text: "Apologize, check ticket with kitchen/lead, give a real ETA, offer a small recovery if appropriate.", good: true, tip: "Acknowledge + action + update." },
      { text: "Blame the kitchen in front of the guest.", good: false, tip: "Never throw teammates under the bus." },
      { text: "Ignore and hope they chill.", good: false, tip: "Silence makes it worse." }
    ]
  },
  {
    id: "wrong-beer",
    level: 2,
    prompt: "Guest: 'This isn't what I ordered — and I'm not paying for it.'",
    options: [
      { text: "Own it, remake/correct immediately, thank them for saying something, notify lead if comp needed.", good: true, tip: "Speed + ownership." },
      { text: "Argue about what they said.", good: false, tip: "Don't debate memory." },
      { text: "Tell them comps aren't allowed.", good: false, tip: "Escalate policy to lead — don't shut down recovery." }
    ]
  },
  {
    id: "rude-escalation",
    level: 3,
    prompt: "Guest raises voice and insults staff after a long wait.",
    options: [
      { text: "Stay calm, protect team, bring shift lead, move conversation off the floor if needed, document.", good: true, tip: "MP preferred: calm + lead + safety." },
      { text: "Match their energy.", good: false, tip: "Escalates." },
      { text: "Walk away mid-sentence with no handoff.", good: false, tip: "Always hand off to a lead." }
    ]
  }
];

const TROUBLESHOOTING = [
  {
    id: "espresso-pull",
    title: "Coffee machine isn't pulling correctly",
    steps: [
      "Check water supply / tank and that the machine is fully warmed up.",
      "Purge the group; confirm dose and grind haven't drifted.",
      "Inspect the puck for channeling / uneven distribution.",
      "Backflush if due; check for error lights."
    ],
    stopEscalate: "Stop and escalate to a lead/manager if electrical smell, flooding, or you're unsure — do not open panels."
  },
  {
    id: "pos-down",
    title: "POS is down or frozen",
    steps: [
      "Confirm Wi‑Fi/network lights on the router/access point.",
      "Force-close and reopen the POS app; reboot the tablet if needed.",
      "Check if Toast/status page or another terminal works.",
      "Switch to backup order flow per lead instructions."
    ],
    stopEscalate: "Escalate immediately if payments can't process — do not invent workarounds that skip comps/audit."
  },
  {
    id: "keg-issues",
    title: "Keg pouring foam / nothing",
    steps: [
      "Check coupler is locked and CO₂/air is on at correct pressure.",
      "Inspect line for kinks; pour off foam per house standard.",
      "Confirm the keg isn't kicked; swap if empty.",
      "Check for frozen lines or warm kegs."
    ],
    stopEscalate: "Escalate if you smell gas leaks or need to adjust primary regulators beyond posted settings."
  },
  {
    id: "dishwasher",
    title: "Dishwasher not cleaning / not starting",
    steps: [
      "Confirm power and that the drain is clear.",
      "Check chemical levels and correct wash temp lights.",
      "Clear scrap trays; run an empty cycle.",
      "Do not override safety interlocks."
    ],
    stopEscalate: "Stop for leaks, burning smell, or breaker trips — call a lead."
  },
  {
    id: "event-av",
    title: "Projector / event AV trouble",
    steps: [
      "Confirm inputs (HDMI) and that the source device is awake.",
      "Check power strips and mute/blank on the projector remote.",
      "Try a known-good cable; lower room lights as needed.",
      "Have a non-AV backup plan for the host (mic/speaking)."
    ],
    stopEscalate: "Escalate rather than opening rental gear or climbing unsafe mounts."
  }
];

const SECRET_ACHIEVEMENTS = [
  {
    id: "level-5-clearance",
    title: "Level 5 Clearance",
    clearance: "L5",
    codename: "NEED-TO-KNOW",
    hint: "Clear five different Launch Pad war games.",
    declassified: "You completed training across five distinct game types. Welcome to the inner ring."
  },
  {
    id: "critical-mass",
    title: "Critical Mass",
    clearance: "L4",
    codename: "CHAIN-REACTION",
    hint: "Sustain a 5-answer correct streak in Launch Pad or Speed Round.",
    declassified: "Five consecutive correct answers — reaction sustained. Do not lose containment."
  },
  {
    id: "atomic-bartender",
    title: "Atomic Bartender",
    clearance: "L5",
    codename: "DUAL-CORE",
    hint: "Pass Coffee Quiz (75%+) and cover at least half of beers currently on tap.",
    declassified: "Coffee core online. Tap coverage ≥50%. You can brief guests on both reactors."
  },
  {
    id: "classified-file",
    title: "Classified File",
    clearance: "L3",
    codename: "MICH-MIX",
    hint: "Open Ask MP and inquire about a certain red batch recipe.",
    declassified: "You accessed the Michelada mix file. Contents remain need-to-know for the floor."
  },
  {
    id: "chain-reaction",
    title: "Chain Reaction",
    clearance: "L3",
    codename: "PEER-TRANSFER",
    hint: "Transmit three shout-outs to teammates.",
    declassified: "Recognition cascade complete. Culture is a chain reaction — keep it going."
  },
  {
    id: "trinity-test",
    title: "Trinity Test",
    clearance: "L4",
    codename: "PERFECT-SHOT",
    hint: "Finish any scored Launch Pad game with a perfect score.",
    declassified: "100% — first successful detonation of a flawless round."
  },
  {
    id: "fallout-shelter",
    title: "Fallout Shelter",
    clearance: "L2",
    codename: "SECURE-CLOSE",
    hint: "Complete a full closing checklist for the night.",
    declassified: "Facility secured. Closing checklist sealed for the shift date."
  },
  {
    id: "ten-perfect-closes",
    title: "Ten Perfect Closes",
    clearance: "L5",
    codename: "DECADE-LOCK",
    hint: "Build a 10-day closing-checklist streak.",
    declassified: "Ten consecutive closing days. Containment protocol is habit now."
  },
  {
    id: "thirty-checklists",
    title: "Thirty-Day Ops",
    clearance: "L5",
    codename: "LONG-COUNT",
    hint: "Hit a 30-day checklist streak (opening or closing).",
    declassified: "Thirty-day ops cadence achieved. Mission Control salutes you."
  },
  {
    id: "orbital-rendezvous",
    title: "Orbital Rendezvous",
    clearance: "L3",
    codename: "DOCKING",
    hint: "Complete the Coffee flashcard deck once.",
    declassified: "Coffee flashcards docked. Viewfinder trajectory locked."
  }
];

const KEG_POUR_ESTIMATES = {
  "1/2 bbl": 165,
  "1/4 bbl": 82,
  "1/6 bbl": 55,
  sixtel: 55,
  default: 100
};

function estimateKegPours(sizeLabel, percentFull = 100) {
  const key = String(sizeLabel || "default").toLowerCase();
  let capacity = KEG_POUR_ESTIMATES.default;
  for (const [k, v] of Object.entries(KEG_POUR_ESTIMATES)) {
    if (key.includes(k)) capacity = v;
  }
  const remaining = Math.max(0, Math.round(capacity * (Number(percentFull) / 100)));
  let outlook = "OK";
  if (remaining <= 15) outlook = "Likely kicks soon — tell the lead";
  else if (remaining <= 40) outlook = "Monitor tonight";
  return { capacity, remaining, outlook };
}

function scaleRecipe(ingredients, batches) {
  const n = Math.max(0.25, Number(batches) || 1);
  return (ingredients || []).map(row => ({
    ...row,
    scaledAmount: Math.round((Number(row.amount) || 0) * n * 1000) / 1000
  }));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GUEST_TASTE_TAGS,
    FOOD_BEER_PAIRINGS,
    GUEST_SCENARIOS,
    COMPLAINT_SCENARIOS,
    TROUBLESHOOTING,
    SECRET_ACHIEVEMENTS,
    KEG_POUR_ESTIMATES,
    estimateKegPours,
    scaleRecipe
  };
}

if (typeof window !== "undefined") {
  window.FloorContent = {
    GUEST_TASTE_TAGS,
    FOOD_BEER_PAIRINGS,
    GUEST_SCENARIOS,
    COMPLAINT_SCENARIOS,
    TROUBLESHOOTING,
    SECRET_ACHIEVEMENTS,
    estimateKegPours,
    scaleRecipe
  };
}
