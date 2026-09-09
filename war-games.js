/**
 * War Games — judgment drills for the floor.
 * Trivia matching stays in index.html but is off the hub.
 *
 * Expects (browser): wrapGame, escapeHTML, getOnTapBeersSorted, getStyle,
 * getFlavorProfile, recordProgress, recordWrongAnswer, currentUser, render,
 * openTrainingSkill, activateAppTab.
 */

const FEATURED_GAME_IDS = ["rush", "flight", "readguest", "saturday"];
const TRIVIA_GAME_IDS = ["tap", "quiz", "practice", "abv", "style", "reverse", "flash", "speed"];
const ARCADE_GAMES = [
  {
    id: "rocket",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#9c6b4a" stroke-width="3"/><ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#9c6b4a" stroke-width="3" transform="rotate(60 50 50)"/><circle cx="50" cy="50" r="5" fill="#9c6b4a"/></svg>`,
    title: "ATOM SHOOTER",
    desc: "Shoot the right atom. Recreational — not a training score."
  },
  {
    id: "highway",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M38 18h24l10 64H28z" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M50 22v54M42 48h16" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "HALF-LIFE HIGHWAY",
    desc: "Top-down hop road. Collect atoms, dodge kegs, local high score."
  }
];

const WAR_GAMES = [
  {
    id: "rush",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 62h56M30 48h40M38 34h24" fill="none" stroke="#9c6b4a" stroke-width="3"/><circle cx="50" cy="72" r="8" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M50 22v10" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "The Rush",
    desc: "Saturday 7:30 as Float — upstairs tickets, bar line, patio, production. Whole room, not a section."
  },
  {
    id: "flight",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="10" y="72" width="80" height="14" rx="2" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M20 28h12l-2 44h-8zM40 28h12l-2 44h-8zM60 28h12l-2 44h-8zM80 28h12l-2 44h-8z" transform="translate(-16 0)" fill="none" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Build the Flight",
    desc: "Four stemless glasses on the wooden board. Live taps. More than one right answer."
  },
  {
    id: "readguest",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="38" r="14" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M28 78c4-16 16-24 22-24s18 8 22 24" fill="none" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Read the Guest",
    desc: "They start at Modelo. Listen, then recommend from what’s on."
  },
  {
    id: "saturday",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="28" width="56" height="48" rx="6" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M22 44h56M38 28v-8M62 28v-8" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Saturday Night",
    desc: "Bar service problems: tickets, allergens, runners, events. Coaching, not a scoreboard."
  }
];

const BEER_ACADEMY_GAMES = [
  {
    id: "academy_style",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="22" y="28" width="56" height="48" rx="6" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M34 44h32M34 58h20" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Style Match",
    desc: "Name the style — or the MP beer. Live catalog when we have it."
  },
  {
    id: "academy_flavor",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M32 62c8-22 36-22 44 0" fill="none" stroke="#9c6b4a" stroke-width="3"/><circle cx="40" cy="40" r="5" fill="#9c6b4a"/><circle cx="62" cy="36" r="5" fill="#9c6b4a"/></svg>`,
    title: "Flavor Profile",
    desc: "Which tasting notes fit this beer?"
  },
  {
    id: "academy_pair",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M28 70h44L62 30H38z" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M38 48h24" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Pairing Lab",
    desc: "Food on our menu, beer from the taps. More than one good answer."
  },
  {
    id: "academy_brew",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 28h40v20H30zM38 48v24M62 48v24M28 72h44" fill="none" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "How Beer Is Made",
    desc: "Put the brew day in order, then a few short questions."
  },
  {
    id: "academy_cicerone",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M50 28v8M50 64v8M28 50h8M64 50h8" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Cicerone Challenge",
    desc: "For the beer nerds. Not a certification."
  },
  {
    id: "academy_pour",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M36 22h28l-4 56H40z" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M40 48h20" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "What Would You Pour?",
    desc: "Guest tells you what they drink. Pick from what’s on tap."
  }
];

if (typeof window !== "undefined") {
  window.FEATURED_GAME_IDS = FEATURED_GAME_IDS;
  window.TRIVIA_GAME_IDS = TRIVIA_GAME_IDS;
  window.ARCADE_GAMES = ARCADE_GAMES;
  window.WAR_GAMES = WAR_GAMES;
  window.BEER_ACADEMY_GAMES = BEER_ACADEMY_GAMES;
}

const FLIGHT_PROMPT = {
  setup: "Two guests. One board.",
  scene: "“I like light beer, my girlfriend likes sour beer, and we both want to try something different.”",
  prompt: "Build a four-beer flight from what’s actually on tap tonight."
};

const RUSH_NODES = {
  start: {
    beat: 1,
    setup: "Saturday · 7:30 PM. The taproom is packed. You are Float.",
    scene: "Two food tickets are ready upstairs. The bar has a line. Patio tables need bussing. Someone in production seating is looking around for help.",
    prompt: "What is your best next move?",
    options: [
      {
        text: "Go upstairs, check the tickets, and run the food that’s been waiting — the plates are already done.",
        quality: "strong",
        skills: { urgency: 1 },
        next: "after-window",
        tip: "Kitchen is upstairs. Finished food is on a clock. A bar line can wait twenty seconds; a ticket in the pickup window cannot."
      },
      {
        text: "Catch the bartender’s eye — “after this run” — then go upstairs for the tickets.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "after-window",
        tip: "That’s whole-room awareness. You protected food and you didn’t disappear on the bar."
      },
      {
        text: "Bus the patio first so it looks clean.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "glass-first",
        tip: "Patio matters, but finished food upstairs is already late. Bus on the way back down."
      },
      {
        text: "Walk production first — that guest looks lost.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "sat-first",
        tip: "Production seating needs eyes, but dying tickets beat a greet. Nod if you pass, then run food."
      },
      {
        text: "Jump behind the bar until the line dies.",
        quality: "ok",
        skills: { awareness: 1 },
        next: "bar-first",
        tip: "Help the bar when you can — after the tickets. One run upstairs, then hands."
      }
    ]
  },
  "after-window": {
    beat: 2,
    setup: "You ran the food downstairs. Tickets matched. Guests have plates.",
    scene: "Patio is still dirty. Production guest is still looking. The bartender is louder. Another ticket just hit upstairs.",
    prompt: "The room just evolved. What’s next?",
    options: [
      {
        text: "Tell the bartender you’ll swing after this lap, drop water or a nod in production, bus what you can on the walk.",
        quality: "strong",
        skills: { communicate: 1, awareness: 1 },
        next: "second-lap",
        tip: "Scan the whole taproom — bar, patio, production — not a personal section."
      },
      {
        text: "Stay upstairs until the kitchen is quiet.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "Kitchen will not go quiet at 7:30. Run what’s ready, then get back on the floor."
      },
      {
        text: "Hide in dish until the wave dies down.",
        quality: "weak",
        skills: { communicate: -1, reset: -1 },
        next: "second-lap",
        tip: "The room can see you. Side work is not a refuge during a rush."
      },
      {
        text: "Take the next ticket upstairs and ignore the bar.",
        quality: "ok",
        skills: { urgency: 1 },
        next: "second-lap",
        tip: "Food is real. A one-line to the bartender would have closed a second loop."
      }
    ]
  },
  "sat-first": {
    beat: 2,
    setup: "You greeted production. The upstairs tickets sat another minute.",
    scene: "Kitchen is unhappy. The bartender is waving. Patio still needs a bus.",
    prompt: "Recover. What now?",
    options: [
      {
        text: "Go upstairs, check both tickets, run the older one first, then give the bartender a real update.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "second-lap",
        tip: "You reset the clock. Own the miss, then talk to the bar."
      },
      {
        text: "Jump on the bar so they stop waving.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "Bar needed you. The food is still waiting upstairs."
      },
      {
        text: "Tell kitchen it’s not your assignment tonight.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "Everyone rotates. If you can see it, it’s yours. Assignments are a starting map, not a wall."
      }
    ]
  },
  "glass-first": {
    beat: 2,
    setup: "Patio is cleaner. The upstairs tickets sat.",
    scene: "Kitchen is sharp. Production guest is standing now. Bar line grew.",
    prompt: "You chose patio first. How do you get back in the game?",
    options: [
      {
        text: "Upstairs now. Read both tickets before you grab plates. Bus glass on the way back down if your hands are free.",
        quality: "strong",
        skills: { urgency: 1, reset: 1 },
        next: "second-lap",
        tip: "Patio was the wrong first move; this is the right second one. Always read the ticket before you leave the kitchen."
      },
      {
        text: "Keep bussing — the patio still looks messy.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "second-lap",
        tip: "Pretty patio, dead food. Guests remember the plate."
      },
      {
        text: "Stop and explain to production that you were clearing tables.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "Talking helps, but they wanted action. Run food, then talk."
      }
    ]
  },
  "bar-first": {
    beat: 2,
    setup: "You helped the bartender. Two beers walked.",
    scene: "Tickets upstairs are colder. Production is still lost. Kitchen is looking for a runner.",
    prompt: "Bar is quieter for a second. What do you do with it?",
    options: [
      {
        text: "Go upstairs, check tickets, tell kitchen you’ve got the run, nod at production on the way down.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "second-lap",
        tip: "You helped the bar and came back to the room. That’s Float."
      },
      {
        text: "Stay behind the bar until they say they’re good.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "Hands is a run, not “become the bartender.” One assist, then return to the floor."
      },
      {
        text: "Walk production now and leave the tickets.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "They needed you. Carry food if you can — never walk empty-handed past a ready ticket."
      }
    ]
  },
  "second-lap": {
    beat: 3,
    setup: "Same Saturday. The next problem is already here.",
    scene: "A guest at the bar asks if the fried chicken is safe for a nut allergy. Another ticket is up. Someone in production wants to pay.",
    prompt: "Three things at once. What’s the order?",
    options: [
      {
        text: "Stop for the allergen — check notes, confirm with kitchen, don’t guess — then flag the Shift Lead for the checkout if you can’t take it immediately.",
        quality: "strong",
        skills: { communicate: 1, awareness: 1 },
        next: "close-lap",
        tip: "Allergen is safety, not a vibe. And it belongs on the ticket before food is sent — never a casual yes."
      },
      {
        text: "Run the ticket first. Allergy can wait.",
        quality: "ok",
        skills: { urgency: 1 },
        next: "close-lap",
        tip: "Food is on a clock, but an allergen question is a stop-the-line."
      },
      {
        text: "Take payment in production — they’re ready to leave.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "close-lap",
        tip: "Checkout matters. It does not beat an allergen or dying food."
      },
      {
        text: "Say the chicken is probably fine — we’ve served it all night.",
        quality: "weak",
        skills: { communicate: -1 },
        next: "close-lap",
        tip: "Never guess. Confirm with kitchen. Put the allergy on the ticket if they order."
      }
    ]
  },
  "close-lap": {
    beat: 4,
    setup: "The rush is still on. This is the reset.",
    scene: "Hands are empty. Dirty pints on patio. Production still needs water. The bartender is fine for a minute.",
    prompt: "How do you close the loop?",
    options: [
      {
        text: "Water in production, glass in your hand on the way back, eyes on bar, patio, and back space.",
        quality: "strong",
        skills: { reset: 1, awareness: 1 },
        next: null,
        tip: "Scan the whole taproom. Never walk empty-handed — after the urgent work."
      },
      {
        text: "Stand at the service well until someone tells you what’s next.",
        quality: "weak",
        skills: { reset: -1 },
        next: null,
        tip: "Waiting to be told is how 7:30 gets worse. The next scan is yours."
      },
      {
        text: "Start a restock project in storage.",
        quality: "weak",
        skills: { awareness: -1 },
        next: null,
        tip: "If the room is full, the floor owns you."
      },
      {
        text: "Ask the Shift Lead “what do you need?” while you drop water.",
        quality: "strong",
        skills: { communicate: 1, reset: 1 },
        next: null,
        tip: "You stayed useful and you asked. Leads remember that."
      }
    ]
  }
};

const SATURDAY_PROBLEMS = [
  {
    id: "window",
    skill: "urgency",
    train: { skill: "runner_check", shift: 3, label: "Runner ticket check" },
    setup: "Saturday night · Float",
    scene: "Two food tickets are ready upstairs. A bartender has a line. Patio tables need bussing. Someone in production seating is looking around for help.",
    prompt: "What is your best next move?",
    options: [
      { text: "Check tickets upstairs and run the food that’s been waiting — then communicate with the bar on the way back.", quality: "strong", tip: "Finished food is on a clock. Read the ticket before you leave the kitchen." },
      { text: "Bus the patio first so it looks clean.", quality: "weak", tip: "Pretty patio, dead food." },
      { text: "Jump behind the bar until the line dies, then maybe check kitchen.", quality: "ok", tip: "Help the bar after the run, not instead of it." }
    ]
  },
  {
    id: "allergen",
    skill: "safety",
    train: { skill: "ticket_accuracy", shift: 3, label: "Ticket accuracy" },
    setup: "Saturday night · Bartender",
    scene: "A guest at the bar asks an allergy question you are not completely sure about. Run/Bus calls that a table needs water. There is a line.",
    prompt: "What do you do?",
    options: [
      { text: "Pause the order. Confirm with kitchen. Do not send food without a clear allergy note on the ticket. Water can wait ten seconds or go to Float.", quality: "strong", tip: "Allergy is a stop-the-line. It must be on the ticket before Send." },
      { text: "It’s probably fine — we’ve sold a lot of it tonight.", quality: "weak", tip: "Volume is not a safety check." },
      { text: "Send the food now and add the allergy in a second ticket later.", quality: "weak", tip: "Do not rely on a second conflicting ticket. Confirm first." }
    ]
  },
  {
    id: "slow-ticket",
    skill: "communicate",
    train: { skill: "runner_check", shift: 3, label: "Runner ticket check" },
    setup: "Saturday night · Run/Bus",
    scene: "You go upstairs and see two completed tickets. One table still has food in front of them. The other order has been waiting longer.",
    prompt: "What should you check before grabbing plates?",
    options: [
      { text: "Read both tickets: guest name, table/location, items, wait time. Run the older ready ticket if that guest is waiting; don’t drop food on a table that is still eating the last course unless the ticket says so.", quality: "strong", tip: "Ticket reading, destination, and urgency — before you leave the kitchen." },
      { text: "Grab whichever looks done and head downstairs.", quality: "weak", tip: "Guessing the destination is how food lands on the wrong patio table." },
      { text: "Take both at once even if you can’t read the tickets.", quality: "ok", tip: "Speed is good. Unreadable tickets are not." }
    ]
  },
  {
    id: "checkout",
    skill: "urgency",
    train: { skill: "ticket_correction", shift: 4, label: "Ticket corrections" },
    setup: "Saturday night · Bartender",
    scene: "A guest is waiting to close a tab. Kitchen just called that a ticket you sent is missing a location.",
    prompt: "What do you do?",
    options: [
      { text: "Tell kitchen the location now — don’t only send a second ticket. Then take the tab.", quality: "strong", tip: "Corrections are verbal plus urgency. A second silent ticket can duplicate the order." },
      { text: "Ignore kitchen — the guest is ready to leave.", quality: "weak", tip: "Checkout matters. A lost plate still wins the clock." },
      { text: "Fire a new ticket and hope they catch it.", quality: "weak", tip: "That is how doubles happen." }
    ]
  },
  {
    id: "dirty-table",
    skill: "reset",
    train: { skill: "independent_service", shift: 5, label: "Own the room" },
    setup: "Saturday night · Run/Bus",
    scene: "A four-top on patio left a mess. Guests are standing with drinks looking for seats. Production still has dirty glasses.",
    prompt: "What do you do?",
    options: [
      { text: "Reset patio fast enough to seat, grab production glass on the same walk if you can.", quality: "strong", tip: "Seat yourself means a dirty table is lost seats. Whole-room, not a section." },
      { text: "Take a break — you’ll get to it.", quality: "weak", tip: "Guests staring at someone else’s napkins will leave." },
      { text: "Only clear production and leave patio.", quality: "ok", tip: "Helping is good. The standing party still needs a clean table." }
    ]
  },
  {
    id: "bar-hands",
    skill: "awareness",
    train: { skill: "independent_service", shift: 5, label: "Own the room" },
    setup: "Saturday night · Float",
    scene: "Bartender: “I need a runner.” Patio looks stable for thirty seconds. A ticket is not up.",
    prompt: "What do you do?",
    options: [
      { text: "Take the run or water, tell the Shift Lead you’ll be thirty seconds, come back to scanning the room.", quality: "strong", tip: "Hands means help, then return. Everyone is cross-trained." },
      { text: "Stay put — not your assignment tonight.", quality: "weak", tip: "If the bar dies, the whole taproom dies." },
      { text: "Move behind the bar and start making drinks without being asked.", quality: "ok", tip: "Only if you’re trained for it and a lead asked. Most nights they need a runner." }
    ]
  },
  {
    id: "wrong-beer",
    skill: "recovery",
    train: { skill: "recovery_scenario", shift: 4, label: "Complaint recovery" },
    setup: "Saturday night · Bartender",
    scene: "Guest at the bar: “This isn’t what I ordered.” It’s the wrong beer, already sipped.",
    prompt: "What do you do?",
    options: [
      { text: "Acknowledge, don’t defend, pull it, pour the right one, loop a Shift Lead if it needs a comp.", quality: "strong", tip: "A small, fast recovery beats a proud explanation." },
      { text: "Explain that they pointed at the wrong tap.", quality: "weak", tip: "Being right is not the goal." },
      { text: "Leave the wrong beer and offer a taste of the right one later.", quality: "weak", tip: "They already told you it’s wrong. Replace it." }
    ]
  },
  {
    id: "walk-in",
    skill: "communicate",
    train: { skill: "events_awareness", shift: 5, label: "What’s on the books" },
    setup: "Saturday night · Shift Lead",
    scene: "A party of eight walks in and asks if they can sit in production. There is a private event using part of the back space. Normal service is still running.",
    prompt: "What do you do?",
    options: [
      { text: "Protect the event boundary, offer patio or taproom seats that are actually open, tell Float to keep eyes on production, set an honest wait.", quality: "strong", tip: "No host stand. You still own the room: event edges, guest communication, normal service." },
      { text: "Seat them in the event space — it’s empty-looking chairs.", quality: "weak", tip: "That’s how you crash a wedding welcome party." },
      { text: "Tell them you can’t help and turn away.", quality: "weak", tip: "Too blunt. Offer a path — wait, patio, or bar." }
    ]
  }
];

function beerName(beer) {
  return String(beer?.Name || beer?.name || "").trim();
}

function beerHaystack(beer) {
  const style = (typeof getStyle === "function" ? getStyle(beer) : "") || beer?.Style || beer?.style || "";
  const flavor = (typeof getFlavorProfile === "function" ? getFlavorProfile(beer) : "")
    || beer?.["Flavor Profile"] || beer?.flavor || "";
  const desc = beer?.Description || beer?.description || beer?.["Staff Notes"] || "";
  return `${beerName(beer)} ${style} ${flavor} ${desc}`.toLowerCase();
}

function tagBeer(beer) {
  const hay = beerHaystack(beer);
  const isIpa = /\bipa\b|pale ale/.test(hay);
  const isHazy = /hazy|juicy|neipa|new england/.test(hay);
  const isWest = /west coast|double ipa|triple ipa|\bbitter\b/.test(hay);
  const sour = /sour|gose|berliner|tart|wild|kettle sour|lambic/.test(hay);
  const light = /lager|pils|pilsner|k[öo]lsch|blonde|honey|mexican|cream ale|helles|vienna|light ale|gold flash/.test(hay);
  const dark = /stout|porter|nitro|schwarzbier|brown ale/.test(hay);
  const fruity = /fruit|berry|citrus|peach|mango|guava|cherry|orange|raspberry|passion/.test(hay);
  const wheat = /wheat|wit|hefe|weizen|white ale/.test(hay);
  return {
    light: light || wheat,
    sour,
    hoppy: isIpa || isHazy || isWest,
    bitter: isWest || (isIpa && !isHazy && !sour),
    dark,
    fruity,
    wheat,
    modelo: light || /modelo|mexican lager/.test(hay),
    hazy: isHazy
  };
}

function styleFamily(beer) {
  const tags = tagBeer(beer);
  if (tags.sour) return "sour";
  if (tags.dark) return "dark";
  if (tags.hazy) return "hazy";
  if (tags.hoppy) return "hoppy";
  if (tags.wheat) return "wheat";
  if (tags.light || tags.modelo) return "light";
  if (tags.fruity) return "fruit";
  return "other";
}

function flightFamilyColor(beer) {
  return beerPourLook(beer).color;
}

function beerPourLook(beer) {
  const hay = beerHaystack(beer);
  const tags = tagBeer(beer);
  if (/stout|porter|nitro|black matter/.test(hay)) {
    return { color: "#1a120e", head: "#efe3c8", haze: false, dark: true };
  }
  if (/black ipa/.test(hay)) {
    return { color: "#2a1810", head: "rgba(245,230,200,0.42)", haze: false, dark: true };
  }
  if (tags.dark) {
    return { color: "#24160f", head: "#efe3c8", haze: false, dark: true };
  }
  if (tags.sour || /gose|berliner|tart/.test(hay)) {
    if (/blood|berry|raspberry|cherry|strawberry|tiger|guava|passion/.test(hay)) {
      return { color: "#c45a6a", head: "rgba(255,240,245,0.42)", haze: false, dark: false };
    }
    return { color: "#d4787a", head: "rgba(255,255,255,0.34)", haze: false, dark: false };
  }
  if (/hefe|weizen/.test(hay) && !/\bipa\b/.test(hay)) {
    return { color: "#e0c56a", head: "rgba(255,255,255,0.46)", haze: true, dark: false };
  }
  if (/saison/.test(hay)) {
    return { color: "#e8d48a", head: "rgba(255,255,255,0.36)", haze: true, dark: false };
  }
  if (/belgian golden|tripel|golden strong/.test(hay)) {
    return { color: "#d4a017", head: "rgba(255,255,255,0.3)", haze: false, dark: false };
  }
  if (tags.hazy || /hazy|neipa|half-life|half life/.test(hay)) {
    return { color: "#e4b84a", head: "rgba(255,255,255,0.4)", haze: true, dark: false };
  }
  if (/west coast|double ipa|triple ipa/.test(hay)) {
    return { color: "#c8962a", head: "rgba(255,255,255,0.28)", haze: false, dark: false };
  }
  if (/amber/.test(hay)) {
    return { color: "#8b4518", head: "rgba(255,230,200,0.34)", haze: false, dark: false };
  }
  if (/honey lager|gold flash/.test(hay)) {
    return { color: "#d4a017", head: "rgba(255,255,255,0.3)", haze: false, dark: false };
  }
  if (/pils|pilsner|k[öo]lsch|blonde|light lager|helles/.test(hay)) {
    return { color: "#f0d27a", head: "rgba(255,255,255,0.28)", haze: false, dark: false };
  }
  if (tags.light || tags.wheat) {
    return { color: "#e8c96a", head: "rgba(255,255,255,0.3)", haze: Boolean(tags.wheat), dark: false };
  }
  return { color: "#c4a574", head: "rgba(255,255,255,0.26)", haze: false, dark: false };
}

function flightGlassMarkup(index, beer, name, pouring) {
  const look = beer ? beerPourLook(beer) : { color: "transparent", head: "transparent", haze: false, dark: false };
  const filled = Boolean(beer);
  const clipId = `flight-liquid-${index}`;
  const label = name || "";
  return `
    <div class="flight-slot${filled ? " is-filled" : " is-empty"}">
      <div class="flight-glass${filled ? " is-filled" : ""}${pouring ? " is-pouring" : ""}${look.haze ? " is-hazy" : ""}${look.dark ? " is-dark" : ""}" style="--beer:${look.color};--head:${look.head}">
        <svg class="flight-glass-svg" viewBox="0 0 80 112" aria-hidden="true">
          <defs>
            <clipPath id="${clipId}">
              <path d="M22 26h36l-4.2 62c-1.1 14.5-8.2 19-13.8 19s-12.7-4.5-13.8-19z"/>
            </clipPath>
          </defs>
          <g class="flight-liquid-g" clip-path="url(#${clipId})">
            <rect class="flight-liquid" x="20" y="26" width="40" height="84" fill="${filled ? look.color : "transparent"}"/>
            ${filled ? `<ellipse class="flight-foam" cx="40" cy="40" rx="16" ry="5" fill="${look.head}"/>` : ""}
          </g>
          <path class="flight-outline" d="M20 22h40l-4.6 66c-1.2 16-9 21-15.4 21s-14.2-5-15.4-21z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.78)" stroke-width="1.7"/>
          <path class="flight-shine" d="M28 30c0 0 1.4 38 1 52" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-linecap="round"/>
          <g class="flight-atom" transform="translate(40 68)" fill="none" stroke="rgba(196,165,116,0.55)" stroke-width="1.2">
            <ellipse cx="0" cy="0" rx="9" ry="3.4"/>
            <ellipse cx="0" cy="0" rx="9" ry="3.4" transform="rotate(60)"/>
            <ellipse cx="0" cy="0" rx="9" ry="3.4" transform="rotate(120)"/>
            <circle cx="0" cy="0" r="1.4" fill="rgba(196,165,116,0.7)" stroke="none"/>
          </g>
        </svg>
      </div>
      <strong class="flight-name">${escapeHTML(label || " ")}</strong>
    </div>`;
}

function scoreFlight(picks, taps) {
  const chosen = (picks || []).filter(Boolean);
  const tapList = taps || [];
  const tapTags = tapList.map(tagBeer);
  const pickTags = chosen.map(tagBeer);
  const hasLightOnTap = tapTags.some((t) => t.light || t.modelo);
  const hasSourOnTap = tapTags.some((t) => t.sour);
  const strong = [];
  const workOn = [];
  const notes = [];

  if (chosen.length !== 4) {
    workOn.push("A flight is four beers. Finish the board before you sell it.");
  }

  const hasLight = pickTags.some((t) => t.light || t.modelo);
  const hasSour = pickTags.some((t) => t.sour);
  const allHoppy = pickTags.length >= 3 && pickTags.every((t) => t.hoppy);
  const families = new Set(chosen.map(styleFamily));

  if (hasLightOnTap) {
    if (hasLight) strong.push("You put a light, easy beer on for the guest who asked for it.");
    else workOn.push("They said they like light beer — a lager, kölsch, or blonde should be on this board.");
  }

  if (hasSourOnTap) {
    if (hasSour) strong.push("You put a sour or tart beer on for the other guest.");
    else workOn.push("They asked for sour, and we have one on tap. Use it.");
  } else {
    notes.push("No sour on tap tonight — pick the fruitiest or tartest beer we do have, and say so out loud.");
    if (pickTags.some((t) => t.fruity || t.wheat)) {
      strong.push("No sour tonight, and you still found a bright, different beer to talk through.");
    }
  }

  if (families.size >= 3) strong.push("The flight has range — they both get to try something different.");
  else if (chosen.length === 4) workOn.push("These four sit in the same neighborhood. Stretch the board so “something different” is real.");

  if (allHoppy) workOn.push("Four hoppy beers is not a flight for this couple.");

  const names = new Set(chosen.map(beerName));
  if (names.size !== chosen.length) workOn.push("Don’t repeat a beer on the same flight.");

  const quality = workOn.length === 0 ? "strong" : workOn.length === 1 ? "ok" : "weak";
  const train = [];
  if (workOn.length) train.push({ skill: "style_basics", shift: 2, label: "Beer style basics" });
  if ((hasLightOnTap && !hasLight) || (hasSourOnTap && !hasSour)) {
    train.push({ skill: "pairing_talk", shift: 4, label: "Food + beer pairing" });
  }

  return { strong, workOn, notes, quality, train: uniqueTrain(train) };
}

function scoreReadGuestBeer(beer, beat) {
  const tags = tagBeer(beer);
  if (beat === "modelo") {
    if (tags.modelo || tags.light) {
      return { quality: "strong", tip: "Stay in the lager lane first. That’s how you earn the next sentence." };
    }
    if (tags.wheat || (tags.fruity && !tags.bitter)) {
      return { quality: "ok", tip: "Soft and familiar enough. A clean lager would have been an even closer bridge from Modelo." };
    }
    if (tags.sour) {
      return { quality: "ok", tip: "Sour is a jump. Fine if you explain it — they asked to try something we make, not a dare." };
    }
    if (tags.bitter || (tags.hoppy && !tags.hazy)) {
      return { quality: "weak", tip: "That’s a leap from Modelo. Start closer, then offer a taste of the hoppy beer." };
    }
    if (tags.dark) {
      return { quality: "weak", tip: "Roast is a different conversation. Ask if they want dark before you go there." };
    }
    return { quality: "ok", tip: "You have a path. Tie it back to what they already drink." };
  }
  if (beat === "bitter") {
    if (tags.bitter) {
      return { quality: "weak", tip: "They just said they don’t like bitter. West Coast and most IPAs will lose them." };
    }
    if (tags.light || tags.modelo || tags.sour || tags.wheat) {
      return { quality: "strong", tip: "You listened. The second sentence changed the beer." };
    }
    if (tags.hazy) {
      return { quality: "ok", tip: "Hazy is softer than West Coast. Still hoppy — say that, and offer a taste." };
    }
    return { quality: "ok", tip: "Not bitter is the filter now. If you’re unsure, give a taste before you pour." };
  }
  if (tags.bitter) {
    return { quality: "weak", tip: "“More interesting” is not permission to ignore “not bitter.”" };
  }
  if (tags.sour || tags.fruity || tags.wheat) {
    return { quality: "strong", tip: "That’s the stretch: still easy, actually different. Offer tastes of both." };
  }
  if (tags.light || tags.modelo) {
    return { quality: "ok", tip: "Safe. For “something more interesting,” add a sour, wheat, or fruit beer if we have one." };
  }
  return { quality: "ok", tip: "Keep it not-bitter and explain why it’s different from the first pour." };
}

function uniqueTrain(list) {
  const seen = new Set();
  return (list || []).filter((item) => {
    if (!item?.skill || seen.has(item.skill)) return false;
    seen.add(item.skill);
    return true;
  });
}

function shuffleCopy(list) {
  const next = [...(list || [])];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function liveTaps() {
  if (typeof getOnTapBeersSorted === "function") return getOnTapBeersSorted();
  return [];
}

function findTap(name, taps) {
  return (taps || []).find((beer) => beerName(beer) === name) || null;
}

function applyQuality(session, quality, skills) {
  if (quality === "strong" || quality === "ok") session.right += 1;
  else session.weak += 1;
  Object.entries(skills || {}).forEach(([key, delta]) => {
    session.skills[key] = (session.skills[key] || 0) + delta;
  });
  if (quality === "weak" && !skills) {
    session.skills.miss = (session.skills.miss || 0) + 1;
  }
}

function coachingFromSession(session) {
  if (session.id === "flight" && session.result) return session.result;
  if (session.id === "readguest" && session.result) return session.result;

  const skills = session.skills || {};
  const strong = [];
  const workOn = [];
  const train = [];

  if ((skills.urgency || 0) > 0) strong.push("You protected the urgent work — dying food and tickets beat a wave.");
  if ((skills.urgency || 0) < 0) {
    workOn.push("Urgency: food in the window and expo tickets are on a clock. Waves can wait a few seconds.");
    train.push({ skill: "independent_service", shift: 5, label: "Own your section" });
  }
  if ((skills.communicate || 0) > 0) strong.push("You talked to the room — waving tables and the bar got a real update.");
  if ((skills.communicate || 0) < 0) {
    workOn.push("Communication: a nod, a time, or “I’ve got this” keeps people from waving twice.");
    train.push({ skill: "independent_service", shift: 5, label: "Own your section" });
  }
  if ((skills.awareness || 0) > 0) strong.push("You saw past your section.");
  if ((skills.awareness || 0) < 0) {
    workOn.push("Floor awareness: if you can see it, it is yours until someone else owns it.");
    train.push({ skill: "independent_service", shift: 5, label: "Own your section" });
  }
  if ((skills.reset || 0) > 0) strong.push("You reset — water, glass, eyes back on the room.");
  if ((skills.reset || 0) < 0) {
    workOn.push("Reset: never walk empty-handed after the urgent work, and don’t hide in side work.");
    train.push({ skill: "independent_service", shift: 5, label: "Own your section" });
  }
  if ((skills.safety || 0) < 0 || (session.missedSkills || []).includes("safety")) {
    workOn.push("Allergen questions are a stop-the-line. Never guess.");
    train.push({ skill: "allergy_confirm", shift: 1, label: "Allergen questions" });
  }
  if ((skills.recovery || 0) < 0 || (session.missedSkills || []).includes("recovery")) {
    workOn.push("Recovery: acknowledge, don’t defend, fix it, loop a lead if it needs a comp.");
    train.push({ skill: "recovery_scenario", shift: 4, label: "Complaint recovery" });
  }
  if ((session.missedSkills || []).includes("safety") === false && (skills.safety || 0) > 0) {
    strong.push("You treated the allergen as safety, not a sales line.");
  }
  if ((session.missedSkills || []).includes("recovery") === false && (skills.recovery || 0) > 0) {
    strong.push("You recovered without making the guest defend themselves.");
  }

  if (!strong.length && !workOn.length) {
    strong.push("You finished the set. Replay it and name why you picked each move.");
  }

  return { strong, workOn, notes: [], train: uniqueTrain(train), quality: workOn.length ? "ok" : "strong" };
}

function recordJudgmentIfNeeded(session) {
  if (!session || session.recorded || typeof recordProgress !== "function") return;
  if (typeof currentUser === "undefined" || !currentUser) {
    session.recorded = true;
    return;
  }
  session.recorded = true;
  const total = Math.max((session.queue || []).length, 1);
  recordProgress(session.id, "beer", session.right || 0, total);
}

function startJudgmentGame(id) {
  if (id === "rush") {
    gameSession = {
      id: "rush",
      kind: "judgment",
      nodeId: "start",
      history: [],
      skills: { urgency: 0, communicate: 0, awareness: 0, reset: 0 },
      right: 0,
      weak: 0,
      queue: [1, 2, 3, 4],
      index: 0,
      complete: false,
      recorded: false,
      feedback: null
    };
    return true;
  }

  if (id === "saturday") {
    const queue = shuffleCopy(SATURDAY_PROBLEMS).slice(0, 5);
    gameSession = {
      id: "saturday",
      kind: "judgment",
      queue,
      index: 0,
      skills: { urgency: 0, communicate: 0, awareness: 0, reset: 0, safety: 0, recovery: 0 },
      missedSkills: [],
      right: 0,
      weak: 0,
      complete: false,
      recorded: false,
      feedback: null
    };
    return true;
  }

  if (id === "flight") {
    const taps = liveTaps();
    gameSession = {
      id: "flight",
      kind: "judgment",
      taps,
      selected: [],
      queue: [1, 2, 3, 4],
      index: 0,
      right: 0,
      weak: 0,
      complete: false,
      recorded: false,
      result: null
    };
    return true;
  }

  if (id === "readguest") {
    const taps = liveTaps();
    gameSession = {
      id: "readguest",
      kind: "judgment",
      taps,
      options: pickReadGuestOptions(taps),
      beat: "modelo",
      firstPick: "",
      secondPick: "",
      queue: [1, 2, 3],
      index: 0,
      right: 0,
      weak: 0,
      skills: {},
      history: [],
      complete: false,
      recorded: false,
      feedback: null,
      result: null
    };
    return true;
  }

  return false;
}

function pickReadGuestOptions(taps) {
  const tagged = (taps || []).map((beer) => ({ beer, tags: tagBeer(beer) }));
  const chosen = [];
  const add = (beer) => {
    if (beer && !chosen.includes(beer)) chosen.push(beer);
  };
  add(tagged.find((row) => row.tags.modelo || row.tags.light)?.beer);
  add(tagged.find((row) => row.tags.sour)?.beer);
  add(tagged.find((row) => row.tags.bitter || (row.tags.hoppy && !row.tags.hazy))?.beer);
  add(tagged.find((row) => row.tags.dark)?.beer);
  add(tagged.find((row) => row.tags.hazy || (row.tags.fruity && !row.tags.hoppy))?.beer);
  add(tagged.find((row) => row.tags.wheat)?.beer);
  shuffleCopy(tagged).forEach((row) => add(row.beer));
  return chosen.slice(0, 6);
}

function currentRushNode(session) {
  return RUSH_NODES[session?.nodeId] || RUSH_NODES.start;
}

function answerJudgment(idx) {
  if (!gameSession || gameSession.feedback || gameSession.complete) return;

  if (gameSession.id === "rush") {
    const node = currentRushNode(gameSession);
    const opt = node.options[idx];
    if (!opt) return;
    applyQuality(gameSession, opt.quality, opt.skills);
    if (opt.quality === "weak" && typeof recordWrongAnswer === "function") {
      const preferred = node.options.find((entry) => entry.quality === "strong");
      recordWrongAnswer(gameSession, node.prompt, opt.text, preferred?.text || "Protect the urgent work, then communicate.", opt.tip);
    }
    gameSession.feedback = { idx, tip: opt.tip, quality: opt.quality, next: opt.next };
    if (typeof render === "function") render();
    return;
  }

  if (gameSession.id === "saturday") {
    const item = gameSession.queue[gameSession.index];
    const opt = item?.options?.[idx];
    if (!opt) return;
    applyQuality(gameSession, opt.quality, { [item.skill]: opt.quality === "weak" ? -1 : 1 });
    if (opt.quality === "weak") {
      gameSession.missedSkills.push(item.skill);
      if (typeof recordWrongAnswer === "function") {
        const preferred = item.options.find((entry) => entry.quality === "strong");
        recordWrongAnswer(gameSession, item.prompt, opt.text, preferred?.text || "Use the MP preferred path.", opt.tip);
      }
    }
    gameSession.feedback = { idx, tip: opt.tip, quality: opt.quality };
    if (typeof render === "function") render();
    return;
  }

  if (gameSession.id === "readguest") {
    const beer = gameSession.options[idx];
    if (!beer) return;
    const scored = scoreReadGuestBeer(beer, gameSession.beat);
    applyQuality(gameSession, scored.quality);
    gameSession.history.push({ beat: gameSession.beat, name: beerName(beer), quality: scored.quality });
    if (gameSession.beat === "modelo") gameSession.firstPick = beerName(beer);
    if (gameSession.beat === "bitter") gameSession.secondPick = beerName(beer);
    if (scored.quality === "weak" && typeof recordWrongAnswer === "function") {
      recordWrongAnswer(gameSession, gameSession.beat, beerName(beer), "Listen, then stay in range.", scored.tip);
    }
    gameSession.feedback = { idx, tip: scored.tip, quality: scored.quality };
    if (typeof render === "function") render();
  }
}

function nextJudgment() {
  if (!gameSession) return;
  gameSession.feedback = null;

  if (gameSession.id === "rush") {
    const nextId = gameSession.nextId;
    gameSession.index += 1;
    gameSession.nextId = null;
    if (!nextId || !RUSH_NODES[nextId]) {
      gameSession.complete = true;
      gameSession.result = coachingFromSession(gameSession);
      recordJudgmentIfNeeded(gameSession);
    } else {
      gameSession.nodeId = nextId;
    }
    if (typeof render === "function") render();
    return;
  }

  if (gameSession.id === "saturday") {
    gameSession.index += 1;
    if (gameSession.index >= gameSession.queue.length) {
      gameSession.complete = true;
      gameSession.result = coachingFromSession(gameSession);
      recordJudgmentIfNeeded(gameSession);
    }
    if (typeof render === "function") render();
    return;
  }

  if (gameSession.id === "readguest") {
    if (gameSession.beat === "modelo") {
      gameSession.beat = "bitter";
      gameSession.index = 1;
    } else if (gameSession.beat === "bitter") {
      gameSession.beat = "stretch";
      gameSession.index = 2;
    } else {
      const workOn = [];
      const strong = [];
      gameSession.history.forEach((row) => {
        if (row.quality === "strong") strong.push(`You listened on “${row.beat === "modelo" ? "I drink Modelo" : row.beat === "bitter" ? "nothing bitter" : "something different"}.”`);
        if (row.quality === "weak") workOn.push(`“${row.name}” missed what they just said.`);
      });
      if (!strong.length && !workOn.length) strong.push("You stayed with the guest across three sentences.");
      gameSession.result = {
        strong,
        workOn,
        notes: ["There isn’t one perfect beer. There is a beer that matches the last thing they told you."],
        train: uniqueTrain([
          { skill: "style_basics", shift: 2, label: "Beer style basics" },
          workOn.length ? { skill: "find_on_tap", shift: 1, label: "Core beer — Gold Flash" } : null
        ].filter(Boolean)),
        quality: workOn.length ? "ok" : "strong"
      };
      gameSession.complete = true;
      recordJudgmentIfNeeded(gameSession);
    }
    if (typeof render === "function") render();
  }
}

function advanceRushFromFeedback() {
  if (!gameSession || gameSession.id !== "rush" || !gameSession.feedback) return;
  gameSession.history.push({ nodeId: gameSession.nodeId, idx: gameSession.feedback.idx });
  gameSession.nextId = gameSession.feedback.next;
  nextJudgment();
}

function toggleFlightBeer(name) {
  if (!gameSession || gameSession.id !== "flight" || gameSession.complete) return;
  const selected = gameSession.selected || [];
  const at = selected.indexOf(name);
  if (at >= 0) selected.splice(at, 1);
  else if (selected.length < 4) selected.push(name);
  gameSession.selected = selected;
  gameSession.index = selected.length;
  if (typeof render === "function") render();
}

function submitFlight() {
  if (!gameSession || gameSession.id !== "flight" || gameSession.complete) return;
  const picks = (gameSession.selected || []).map((name) => findTap(name, gameSession.taps)).filter(Boolean);
  const result = scoreFlight(picks, gameSession.taps);
  gameSession.result = result;
  gameSession.complete = true;
  gameSession.right = result.quality === "strong" ? 4 : result.quality === "ok" ? 3 : 1;
  recordJudgmentIfNeeded(gameSession);
  if (typeof render === "function") render();
}

function openWarGameTraining(skill, shift) {
  if (typeof openTrainingSkill === "function") openTrainingSkill(skill, shift);
  else if (typeof activateAppTab === "function") activateAppTab("training");
}

function optionClass(fb, idx, quality) {
  let cls = "game-option";
  if (!fb) return cls;
  cls += " disabled";
  if (fb.idx === idx) {
    if (quality === "strong") cls += " correct";
    else if (quality === "ok") cls += " ok";
    else cls += " wrong";
  } else if (quality === "strong") {
    cls += " correct";
  }
  return cls;
}

function beerButtonMeta(beer) {
  const style = (typeof getStyle === "function" ? getStyle(beer) : "") || beer.Style || beer.style || "";
  const flavor = (typeof getFlavorProfile === "function" ? getFlavorProfile(beer) : "") || beer["Flavor Profile"] || "";
  const abv = beer.ABV || beer.abv || "";
  return { name: beerName(beer), style, flavor, abv };
}

function renderCoachingCard(title, result) {
  const strong = result?.strong || [];
  const workOn = result?.workOn || [];
  const notes = result?.notes || [];
  const train = result?.train || [];
  const esc = typeof escapeHTML === "function" ? escapeHTML : (v) => String(v || "");
  return `
    <div class="game-card wg-coaching">
      <p class="scenario-eyebrow">Coaching</p>
      <p class="game-question" style="margin-bottom:16px;">${esc(title)}</p>
      ${strong.length ? `
        <div class="wg-coaching-block is-strong">
          <h3>Strong</h3>
          <ul>${strong.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
        </div>` : ""}
      ${workOn.length ? `
        <div class="wg-coaching-block is-work">
          <h3>Work on</h3>
          <ul>${workOn.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
        </div>` : ""}
      ${notes.length ? `<p class="wg-note">${notes.map((line) => esc(line)).join(" ")}</p>` : ""}
      ${train.length ? `
        <p class="wg-train-label">Train this next</p>
        <div class="wg-train-links">
          ${train.map((item) => `<button type="button" class="game-next wg-train-btn" onclick="openWarGameTraining('${item.skill}', ${item.shift})">${esc(item.label)} →</button>`).join("")}
        </div>` : ""}
      <button type="button" class="game-next" onclick="startGame('${gameSession.id}')">Play again</button>
    </div>
  `;
}

function renderJudgmentGame(content) {
  if (!gameSession || gameSession.kind !== "judgment") {
    content.innerHTML = wrapGame(`<div class="status"><strong>No drill loaded.</strong></div>`);
    return;
  }

  if (gameSession.complete) {
    const titles = {
      rush: "The Rush — debrief",
      saturday: "Saturday Night — debrief",
      flight: "Your flight",
      readguest: "Read the Guest — debrief"
    };
    content.innerHTML = wrapGame(renderCoachingCard(titles[gameSession.id] || "Debrief", gameSession.result || coachingFromSession(gameSession)));
    return;
  }

  if (gameSession.id === "flight") return renderFlightGame(content);
  if (gameSession.id === "readguest") return renderReadGuestGame(content);
  if (gameSession.id === "rush") return renderRushGame(content);
  return renderSaturdayGame(content);
}

function renderRushGame(content) {
  const node = currentRushNode(gameSession);
  const fb = gameSession.feedback;
  content.innerHTML = wrapGame(`
    <div class="game-card scenario-card">
      <p class="wg-progress">Beat ${node.beat} of 4</p>
      <p class="scenario-eyebrow">${escapeHTML(node.setup)}</p>
      <p class="wg-scene">${escapeHTML(node.scene)}</p>
      <p class="game-question">${escapeHTML(node.prompt)}</p>
      <div class="game-options">
        ${node.options.map((opt, idx) => `
          <button type="button" class="${optionClass(fb, idx, opt.quality)}" ${fb ? "disabled" : `onclick="answerJudgment(${idx})"`}>${escapeHTML(opt.text)}</button>
        `).join("")}
      </div>
      ${fb ? `<p class="scenario-feedback">${escapeHTML(fb.tip)}</p>
        <button type="button" class="game-next" onclick="advanceRushFromFeedback()">Next</button>` : ""}
    </div>
  `);
}

function renderSaturdayGame(content) {
  const item = gameSession.queue[gameSession.index];
  const fb = gameSession.feedback;
  content.innerHTML = wrapGame(`
    <div class="game-card scenario-card">
      <p class="wg-progress">Problem ${gameSession.index + 1} of ${gameSession.queue.length}</p>
      <p class="scenario-eyebrow">${escapeHTML(item.setup)}</p>
      <p class="wg-scene">${escapeHTML(item.scene)}</p>
      <p class="game-question">${escapeHTML(item.prompt)}</p>
      <div class="game-options">
        ${item.options.map((opt, idx) => `
          <button type="button" class="${optionClass(fb, idx, opt.quality)}" ${fb ? "disabled" : `onclick="answerJudgment(${idx})"`}>${escapeHTML(opt.text)}</button>
        `).join("")}
      </div>
      ${fb ? `<p class="scenario-feedback">${escapeHTML(fb.tip)}</p>
        <button type="button" class="game-next" onclick="nextJudgment()">Next</button>` : ""}
    </div>
  `);
}

function renderFlightGame(content) {
  const taps = gameSession.taps || [];
  if (taps.length < 4) {
    content.innerHTML = wrapGame(`<div class="status"><strong>Need at least four beers on tap.</strong> Open On Tap, then come back to build a flight.</div>`);
    return;
  }
  const selected = gameSession.selected || [];
  const boardSlots = [0, 1, 2, 3].map((index) => {
    const name = selected[index] || "";
    const beer = name ? taps.find((row) => beerName(row) === name) : null;
    return flightGlassMarkup(index, beer, name, Boolean(beer) && index === selected.length - 1);
  }).join("");
  content.innerHTML = wrapGame(`
    <div class="game-card scenario-card wg-flight">
      <p class="scenario-eyebrow">${escapeHTML(FLIGHT_PROMPT.setup)}</p>
      <p class="wg-scene">${escapeHTML(FLIGHT_PROMPT.scene)}</p>
      <p class="game-question">${escapeHTML(FLIGHT_PROMPT.prompt)}</p>
      <p class="wg-progress">${selected.length} of 4 on the board</p>
      <div class="flight-board" aria-label="Manhattan Project flight board">
        ${boardSlots}
      </div>
      <p class="flight-color-note">Glass color is a style-based guess, not a lab reading.</p>
      <div class="flight-grid">
        ${taps.map((beer) => {
          const meta = beerButtonMeta(beer);
          const on = selected.includes(meta.name);
          const look = beerPourLook(beer);
          return `
            <button type="button" class="flight-chip${on ? " is-on" : ""}" data-name="${escapeHTML(meta.name)}" onclick="toggleFlightBeer(this.getAttribute('data-name'))">
              <i class="flight-chip-swatch" style="background:${look.color}" aria-hidden="true"></i>
              <strong>${escapeHTML(meta.name)}</strong>
              <span>${escapeHTML([meta.style, meta.abv].filter(Boolean).join(" · "))}</span>
              ${meta.flavor ? `<span class="flight-flavor">${escapeHTML(meta.flavor)}</span>` : ""}
            </button>`;
        }).join("")}
      </div>
      <button type="button" class="game-next" ${selected.length === 4 ? "" : "disabled"} onclick="submitFlight()">Build this flight</button>
    </div>
  `);
}

function renderReadGuestGame(content) {
  const options = gameSession.options || [];
  if (options.length < 3) {
    content.innerHTML = wrapGame(`<div class="status"><strong>Need beers on tap to recommend.</strong> Open On Tap, then come back.</div>`);
    return;
  }
  const beats = {
    modelo: {
      setup: "A guest at the bar.",
      scene: "“I normally drink Modelo, but I’ll try something you make.”",
      prompt: "What do you reach for first?"
    },
    bitter: {
      setup: "They taste the thought, then add a sentence.",
      scene: "“Okay… I don’t like anything bitter though.”",
      prompt: gameSession.firstPick
        ? `You were heading toward ${gameSession.firstPick}. What do you do now?`
        : "What do you do now?"
    },
    stretch: {
      setup: "They’re in. Now stretch it.",
      scene: "“Could I try a taste of that and something a little more interesting — still not bitter?”",
      prompt: "Pick the second beer."
    }
  };
  const copy = beats[gameSession.beat] || beats.modelo;
  const fb = gameSession.feedback;
  content.innerHTML = wrapGame(`
    <div class="game-card scenario-card">
      <p class="wg-progress">Listen ${gameSession.index + 1} of 3</p>
      <p class="scenario-eyebrow">${escapeHTML(copy.setup)}</p>
      <p class="wg-scene">${escapeHTML(copy.scene)}</p>
      <p class="game-question">${escapeHTML(copy.prompt)}</p>
      <div class="game-options">
        ${options.map((beer, idx) => {
          const meta = beerButtonMeta(beer);
          const line = [meta.name, meta.style, meta.flavor].filter(Boolean).join(" — ");
          return `<button type="button" class="${optionClass(fb, idx, fb && fb.idx === idx ? fb.quality : "")}" ${fb ? "disabled" : `onclick="answerJudgment(${idx})"`}>${escapeHTML(line)}</button>`;
        }).join("")}
      </div>
      ${fb ? `<p class="scenario-feedback">${escapeHTML(fb.tip)}</p>
        <button type="button" class="game-next" onclick="nextJudgment()">Next</button>` : ""}
    </div>
  `);
}

const BREW_STEPS = [
  { id: "mash", label: "Malt / Mash", why: "Crushed malt soaks in hot water so enzymes turn starch into fermentable sugar." },
  { id: "lauter", label: "Lauter / Separate wort", why: "You rinse and drain the mash. The sweet liquid left is wort." },
  { id: "boil", label: "Boil", why: "The wort is boiled to sterilize it and set up hop additions." },
  { id: "hops", label: "Add hops", why: "Hops usually go in during the boil — early for bitterness, late for aroma." },
  { id: "chill", label: "Chill", why: "Wort has to cool before yeast can go in. Hot wort would kill it." },
  { id: "ferment", label: "Ferment", why: "Yeast eats the sugar and makes alcohol and CO₂. That’s beer, not wort." },
  { id: "condition", label: "Condition", why: "The beer rests, clears, and rounds out before you package it." },
  { id: "package", label: "Package / Serve", why: "Keg, can, or bottle — then it hits the taproom." }
];

const BREW_QUIZ = [
  {
    prompt: "What does yeast primarily do?",
    options: [
      { label: "Turn fermentable sugars into alcohol and CO₂", quality: "strong", explain: "Correct — yeast is the engine. Sugar in, beer out." },
      { label: "Add bitterness during the boil", quality: "weak", explain: "Close — that’s hops. Yeast ferments the wort after it cools." },
      { label: "Filter haze out of the finished beer", quality: "weak", explain: "Close — some beer is filtered later. Yeast’s job is fermentation." },
      { label: "Roast the malt darker", quality: "weak", explain: "Close — roast happens at the maltster, long before yeast." }
    ]
  },
  {
    prompt: "When are hops commonly added?",
    options: [
      { label: "During the boil — and sometimes after, for aroma", quality: "strong", explain: "Correct — boil for bitterness, late or dry-hop for smell." },
      { label: "Only in the mash tun", quality: "weak", explain: "Close — mash is about malt sugar. Hops come later." },
      { label: "After the beer is already in the guest’s glass", quality: "weak", explain: "That’s a garnish, not brewing. Hops go in on brew day or in the tank." },
      { label: "Instead of yeast", quality: "weak", explain: "You still need yeast. Hops season the wort; they don’t ferment it." }
    ]
  },
  {
    prompt: "What contributes fermentable sugars?",
    options: [
      { label: "Malted grain, pulled into the wort during mash", quality: "strong", explain: "Correct — malt is the sugar source. Water just carries it." },
      { label: "Hops", quality: "weak", explain: "Close — hops are bitterness and aroma, not the main sugar." },
      { label: "The serving glass", quality: "weak", explain: "The glass doesn’t ferment. Sugar comes from malt." },
      { label: "CO₂ in the keg", quality: "weak", explain: "Gas carbonates. Sugar already fermented before packaging." }
    ]
  },
  {
    prompt: "What is wort?",
    options: [
      { label: "The sweet unfermented liquid, after mash and before yeast", quality: "strong", explain: "Correct — once yeast works, we call it beer." },
      { label: "Foam on a poorly poured pint", quality: "weak", explain: "That’s head. Wort is the pre-beer liquid in the brewery." },
      { label: "A style of German lager", quality: "weak", explain: "Close sound, different word. Wort is the sugar liquid." },
      { label: "Spent grain after brewing", quality: "weak", explain: "Spent grain is the leftover husk. Wort is what you drained off." }
    ]
  }
];

const CICERONE_BANK = [
  {
    prompt: "Why do we keep draft beer cold from keg to glass?",
    options: [
      { label: "Warm beer in the lines foams, tastes dull, and dies faster", quality: "strong", explain: "Correct — cold chain is draft quality. Foam problems are often temperature, not “the keg is wild.”" },
      { label: "So the tap handles stay shiny", quality: "weak", explain: "Looks don’t pour the beer. Temperature does." },
      { label: "Warm beer has more hops", quality: "weak", explain: "Heat doesn’t add hops. It knocks aroma out and makes foam." },
      { label: "Health code requires beer at 80°F", quality: "weak", explain: "That’s hot. Draft beer wants to stay cold." }
    ]
  },
  {
    prompt: "A guest says the pint “tastes skunky.” What’s the usual intro-level cause?",
    options: [
      { label: "Light struck the beer — especially in clear or green bottles", quality: "strong", explain: "Correct — light-struck (skunky) is a storage / package issue. Keep beer out of sun." },
      { label: "Too much malt in the mash", quality: "weak", explain: "Malt doesn’t make skunk. Light on hops does." },
      { label: "The glass was too clean", quality: "weak", explain: "Dirty glass causes bubbles to cling. Skunk is light damage." },
      { label: "They sat in production seating", quality: "weak", explain: "The room doesn’t skunk a pint. Light and old beer do." }
    ]
  },
  {
    prompt: "Why do we use stemless tasting glasses on an MP flight?",
    options: [
      { label: "Four small pours on one board — easy to taste, easy to carry", quality: "strong", explain: "Correct — our flight is four stemless glasses sitting on the wood board, not a paddle of samples in name only." },
      { label: "Stemless glass raises ABV", quality: "weak", explain: "The glass doesn’t change the beer. It changes how we serve a flight." },
      { label: "Guests aren’t allowed to drink from stemmed glass", quality: "weak", explain: "No such rule. This is how we build a flight here." },
      { label: "It hides off-flavors", quality: "weak", explain: "Glassware shouldn’t hide faults. Taste honestly, then talk." }
    ]
  },
  {
    prompt: "IBU is mainly a measure of what?",
    options: [
      { label: "Bitterness from hops (a number, not the whole flavor story)", quality: "strong", explain: "Correct — IBU is bitterness. A hazy can taste softer than the number suggests." },
      { label: "Alcohol by volume", quality: "weak", explain: "That’s ABV. IBU is bitterness." },
      { label: "Calories", quality: "weak", explain: "Not a calorie count. Bitterness." },
      { label: "How hazy the beer is", quality: "weak", explain: "Haze is yeast/protein/hop matter. IBU is bitterness." }
    ]
  },
  {
    prompt: "Ale yeast vs lager yeast — the floor version?",
    options: [
      { label: "Ales ferment warmer and faster; lagers ferment cooler and cleaner", quality: "strong", explain: "Correct — that’s enough to talk a guest through Gold Flash vs a Belgian without a textbook." },
      { label: "Lagers are always hoppier than ales", quality: "weak", explain: "Style decides hops, not the yeast family alone." },
      { label: "Ales cannot be pale", quality: "weak", explain: "Plenty of pale ales. Color is malt, not “ale vs lager.”" },
      { label: "Lager yeast is only for sours", quality: "weak", explain: "Sours are a different conversation (bugs/acid). Lagers are clean and cool." }
    ]
  },
  {
    prompt: "A pint has no head and looks lifeless. First check?",
    options: [
      { label: "Dirty or lipstick-filmed glass, or beer that’s too cold / flat", quality: "strong", explain: "Correct — film kills foam. So does a glass right out of a freezer chest or a dying keg." },
      { label: "Tell them all beer is supposed to be flat", quality: "weak", explain: "Head is part of the pour. Don’t teach that." },
      { label: "Add a shot of soda water", quality: "weak", explain: "Don’t doctor the beer. Fix glass, temp, or the keg." },
      { label: "Pour from higher to “add hops”", quality: "weak", explain: "A high pour adds foam, not hop character — and it can waste beer." }
    ]
  },
  {
    prompt: "Stouts are often served a little warmer than a light lager. Why?",
    options: [
      { label: "Cold mutes roast and chocolate; a touch warmer lets them show", quality: "strong", explain: "Correct — ice-cold stout tastes like brown water. Don’t freeze the nuance." },
      { label: "Stout is safer at room temperature for hours", quality: "weak", explain: "Still keep kegs cold. “A little warmer in the glass” is not “leave it on the bar.”" },
      { label: "ABV disappears when stout is cold", quality: "weak", explain: "ABV doesn’t vanish. Flavor hides." },
      { label: "Health code requires stout at 70°F", quality: "weak", explain: "No. Draft still wants a cold keg." }
    ]
  },
  {
    prompt: "A guest wants “something hoppy but not bitter.” What do you reach toward?",
    options: [
      { label: "A hazy / juicy IPA, and say it’s hop aroma without the West Coast bite", quality: "strong", explain: "Correct — aroma vs bitterness is the distinction. Offer a taste." },
      { label: "The bitterest West Coast on the wall, because hoppy means bitter", quality: "weak", explain: "That’s the trap. They asked for hop flavor, not chew-the-hops bitter." },
      { label: "A nitro stout", quality: "weak", explain: "Roast isn’t hops. Different conversation." },
      { label: "Whatever is closest to the handle they pointed at", quality: "weak", explain: "Listen first. Then point." }
    ]
  },
  {
    prompt: "How should packaged beer be stored in a cooler or retail fridge?",
    options: [
      { label: "Cold, dark, upright if you can — heat and sun age it fast", quality: "strong", explain: "Correct — beer is food. Light and heat are the enemies." },
      { label: "In the window so guests can see the label", quality: "weak", explain: "Sun skunks beer. Sell it from the dark cooler." },
      { label: "At room temp so hops “wake up”", quality: "weak", explain: "Warm storage ages beer. Wake hops by pouring fresh, not by cooking the can." },
      { label: "On its side like wine, always", quality: "weak", explain: "Cans and most bottles are happier upright. This isn’t a cellar list." }
    ]
  },
  {
    prompt: "What are the four classic beer ingredients?",
    options: [
      { label: "Water, malt, hops, yeast", quality: "strong", explain: "Correct — everything else (fruit, coffee, lactose) is an extra on top of that." },
      { label: "Barley, whiskey, hops, foam", quality: "weak", explain: "Foam isn’t an ingredient. Water and yeast are." },
      { label: "Corn, sugar, yellow dye, bubbles", quality: "weak", explain: "That’s a joke about light macro lager, not how we brew." },
      { label: "Grapes, malt, hops, yeast", quality: "weak", explain: "Grapes are wine. Beer starts with grain." }
    ]
  },
  {
    prompt: "A fatty burger hits the table. Pairing instinct?",
    options: [
      { label: "Bitterness or carbonation to cut richness — or malt if they want comfort", quality: "strong", explain: "Correct — cut or complement. Either is a real pairing if you say it out loud." },
      { label: "The sweetest dessert beer we have", quality: "weak", explain: "Sweet on a greasy burger stacks. Cut or malt is the move." },
      { label: "No beer — fat and beer don’t mix", quality: "weak", explain: "They mix if you pick the right one." },
      { label: "Whatever has the highest ABV", quality: "weak", explain: "ABV isn’t a pairing rule." }
    ]
  },
  {
    prompt: "Cardboard / sherry / wet paper in a beer usually points to what (intro level)?",
    options: [
      { label: "Oxidation — old, warm, or roughly handled beer", quality: "strong", explain: "Correct — that’s the “this keg sat too long / got warm” conversation, not a new style." },
      { label: "Too much Nam Jim on the chicken", quality: "weak", explain: "Sauce isn’t in the pint. Oxidation is stale beer." },
      { label: "A Belgian yeast character you should sell as a feature", quality: "weak", explain: "Don’t sell cardboard as Belgian. Flag it to the bar." },
      { label: "Not enough hops in the mash", quality: "weak", explain: "Hops aren’t mashed in as the main process. This is age and oxygen." }
    ]
  }
];

function academyCatalog() {
  if (typeof beers !== "undefined" && Array.isArray(beers) && beers.length) return beers.filter((row) => beerName(row));
  return liveTaps();
}

function beerStyleOf(beer) {
  return String((typeof getStyle === "function" ? getStyle(beer) : "") || beer?.Style || beer?.style || "").trim();
}

function beerFlavorOf(beer) {
  return String((typeof getFlavorProfile === "function" ? getFlavorProfile(beer) : "") || beer?.["Flavor Profile"] || beer?.flavor || "").trim();
}

function beerAbvNum(beer) {
  const raw = String(beer?.ABV || beer?.abv || "").replace("%", "");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

const STYLE_DISTRACTORS = [
  "Honey Lager", "Hazy IPA", "West Coast IPA", "Pilsner", "Amber Lager",
  "Fruited Sour", "Belgian Golden Strong", "Saison", "Hefeweizen", "Nitro Stout", "Black IPA", "Kölsch"
];

function uniqueNonempty(list) {
  const seen = new Set();
  return (list || []).filter((item) => {
    const key = String(item || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function tagFoodItem(food) {
  const hay = `${food?.name || ""} ${food?.description || ""} ${food?.section || ""}`.toLowerCase();
  return {
    fried: /fried|tender|chicken|fries|nachos|chips|tallow/.test(hay),
    rich: /burger|steak|bacon|cheese|queso|pretzel|nachos|gouda|gruy|cheddar/.test(hay),
    spicy: /buffalo|thai chili|chorizo|jalape|spicy|nam jim/.test(hay),
    delicate: /salad|yogurt|hummus|avocado|fruit bowl/.test(hay),
    sweet: /waffle|pancake|compote|jam|fruit|yogurt/.test(hay),
    roast: /steak|burger|bacon|biltong|pork/.test(hay)
  };
}

function scorePairingChoice(food, beer) {
  const f = tagFoodItem(food);
  const t = tagBeer(beer);
  const name = beerName(beer);
  const foodName = food?.name || "that plate";
  const hay = beerHaystack(beer);
  if (f.delicate && (t.bitter || (t.dark && !t.wheat && !t.sour))) {
    return { quality: "weak", explain: `Close — ${name} is a lot of beer for ${foodName}. Lighter, wheat, or tart beers keep delicate food from disappearing.` };
  }
  if (f.sweet && t.bitter) {
    return { quality: "weak", explain: `Close — bitterness fights dessert. A sour, wheat, or fruit-forward beer sits better with ${foodName}.` };
  }
  if ((f.fried || f.rich) && (t.bitter || t.hoppy || t.sour)) {
    return { quality: "strong", explain: `Correct — bitterness or acidity cuts the richness of ${foodName}. ${name} gives the plate a reset.` };
  }
  if (f.spicy && (t.wheat || t.sour || t.hazy || t.fruity)) {
    return { quality: "strong", explain: `Correct — spice likes fruit, wheat, or tart beer. ${name} cools ${foodName} instead of stacking heat.` };
  }
  if (f.sweet && (t.sour || t.fruity || t.wheat)) {
    return { quality: "strong", explain: `Correct — fruit and acidity love ${foodName}. ${name} plays with the sweet side.` };
  }
  if (f.delicate && (t.light || t.wheat || t.sour || t.modelo)) {
    return { quality: "strong", explain: `Correct — ${name} stays out of the way of ${foodName}. Light with delicate.` };
  }
  if (f.roast && (t.dark || /amber/.test(hay))) {
    return { quality: "strong", explain: `Correct — malt and roast talk to each other. ${name} complements ${foodName}.` };
  }
  if ((f.fried || f.rich) && t.light) {
    return { quality: "ok", explain: `That works — a clean beer refreshes fried food. A hoppier or tarter pick would cut even more.` };
  }
  return { quality: "ok", explain: `You can sell ${name} with ${foodName} if you say why. Bitterness cuts richness, acid cuts fat, malt loves roast, light beers love delicate plates.` };
}

function scorePourChoice(vignette, beer) {
  const t = tagBeer(beer);
  const hay = beerHaystack(beer);
  const abv = beerAbvNum(beer);
  const name = beerName(beer);
  if (vignette === "lite") {
    if (t.bitter) return { quality: "weak", explain: `Close — they asked for not bitter. ${name} will taste hoppy next to Miller Lite.` };
    if (t.light || t.modelo) return { quality: "strong", explain: `Correct — stay in the lager lane. ${name} is the bridge from Miller Lite.` };
    if (t.wheat || t.sour) return { quality: "ok", explain: `Soft enough if you explain it. A clean lager would have been the closest first pour.` };
    return { quality: "ok", explain: `Keep it easy and not bitter. Tie it back to what they already drink.` };
  }
  if (vignette === "hazy") {
    if (t.hazy && abv != null && abv <= 6.5) return { quality: "strong", explain: `Correct — still hazy, and ${abv}% keeps it sessionable.` };
    if (t.hazy) return { quality: "ok", explain: `It’s hazy. Say the ABV out loud so they know if it’s heavier than they wanted.` };
    if (t.bitter && !t.hazy) return { quality: "weak", explain: `West Coast isn’t what they asked for. Stay hazy, then talk ABV.` };
    if (t.light) return { quality: "ok", explain: `Lower ABV, different flavor. Offer it as a lighter cousin, not a hazy.` };
    return { quality: "ok", explain: `Say how it compares to a hazy — juice vs bitter, and the ABV.` };
  }
  if (t.dark && /imperial|barrel/.test(hay) && abv != null && abv >= 9) {
    return { quality: "ok", explain: `It’s dark, and it’s heavy. Warn them, or offer a taste of something leaner.` };
  }
  if (t.dark && abv != null && abv <= 7) return { quality: "strong", explain: `Correct — dark without being a meal. ${name} is the move.` };
  if (t.dark) return { quality: "ok", explain: `Dark, yes. Tell them the body and ABV so “not super heavy” stays honest.` };
  if (/amber|brown|dunkel|schwarz/.test(hay)) return { quality: "strong", explain: `Correct — roasted color without stout weight.` };
  if (t.light || t.modelo) return { quality: "weak", explain: `That’s not dark. They asked for color.` };
  return { quality: "ok", explain: `If it isn’t dark, don’t sell it as dark. If it is, talk body, not just color.` };
}

function buildStyleQueue() {
  const pool = academyCatalog().filter((beer) => beerStyleOf(beer));
  const styles = uniqueNonempty(pool.map(beerStyleOf));
  const questions = [];
  shuffleCopy(pool).slice(0, 4).forEach((beer) => {
    const style = beerStyleOf(beer);
    const others = uniqueNonempty(styles.filter((s) => s.toLowerCase() !== style.toLowerCase()).concat(STYLE_DISTRACTORS));
    const options = shuffleCopy([
      { label: style, quality: "strong", explain: `Correct — ${beerName(beer)} is our ${style}.${beerFlavorOf(beer) ? ` ${beerFlavorOf(beer)}` : ""}` },
      ...shuffleCopy(others).slice(0, 3).map((label) => ({
        label,
        quality: "weak",
        explain: `Close — ${beerName(beer)} is a ${style}, not ${label}.${beerFlavorOf(beer) ? ` ${beerFlavorOf(beer)}` : ""}`
      }))
    ]);
    if (options.length >= 3) {
      questions.push({
        setup: "Style Match",
        prompt: `Which style is ${beerName(beer)}?`,
        options
      });
    }
  });
  shuffleCopy(styles).slice(0, 2).forEach((style) => {
    const matches = pool.filter((beer) => beerStyleOf(beer).toLowerCase() === style.toLowerCase());
    const others = pool.filter((beer) => beerStyleOf(beer).toLowerCase() !== style.toLowerCase());
    if (!matches.length || others.length < 2) return;
    const correct = matches[0];
    const options = shuffleCopy([
      { label: beerName(correct), quality: "strong", explain: `Correct — ${beerName(correct)} is our ${style}.${beerFlavorOf(correct) ? ` ${beerFlavorOf(correct)}` : ""}` },
      ...shuffleCopy(others).slice(0, 3).map((beer) => ({
        label: beerName(beer),
        quality: "weak",
        explain: `Close — ${beerName(beer)} is a ${beerStyleOf(beer)}, not a ${style}. ${beerName(correct)} is the ${style}.`
      }))
    ]);
    questions.push({
      setup: "Style Match",
      prompt: `Which MP beer is a ${style}?`,
      options
    });
  });
  return shuffleCopy(questions).slice(0, 6);
}

function buildFlavorQueue() {
  const pool = academyCatalog().filter((beer) => beerFlavorOf(beer));
  const flavors = uniqueNonempty(pool.map(beerFlavorOf));
  const canned = [
    "Citrus + stone fruit hops",
    "Banana + clove",
    "Coffee + vanilla",
    "Coconut + strawberry",
    "Pine + grapefruit bitterness",
    "Tart raspberry + acid",
    "Light honey malt",
    "Roast chocolate + cream"
  ];
  const questions = [];
  shuffleCopy(pool).forEach((beer) => {
    const flavor = beerFlavorOf(beer);
    const others = uniqueNonempty(flavors.filter((row) => row.toLowerCase() !== flavor.toLowerCase()).concat(canned));
    if (others.length < 3) return;
    questions.push({
      setup: beerStyleOf(beer) || "Flavor Profile",
      prompt: `${beerName(beer)} — which profile fits best?`,
      options: shuffleCopy([
        { label: flavor, quality: "strong", explain: `Correct — ${beerName(beer)} reads as ${flavor}.` },
        ...shuffleCopy(others).slice(0, 3).map((label) => ({
          label,
          quality: "weak",
          explain: `Close — ${beerName(beer)} is ${flavor}, not ${label}.`
        }))
      ])
    });
  });
  return shuffleCopy(questions).slice(0, 5);
}

function buildPairQueue() {
  const taps = liveTaps();
  const menu = (typeof FOOD_MENU !== "undefined" && Array.isArray(FOOD_MENU) ? FOOD_MENU : [])
    .filter((item) => ["dinner", "lunch", "brunch", "breakfast"].includes(item.category) && item.section !== "Sauces");
  const foods = shuffleCopy(menu.filter((item) => /chicken|burger|steak|salad|waffle|pretzel|nachos|hummus|yogurt|fries/.test(`${item.name} ${item.section}`))).slice(0, 5);
  if (taps.length < 3 || !foods.length) return [];
  return foods.map((food) => {
    const scored = shuffleCopy(taps).slice(0, 8).map((beer) => {
      const result = scorePairingChoice(food, beer);
      return { label: [beerName(beer), beerStyleOf(beer)].filter(Boolean).join(" — "), quality: result.quality, explain: result.explain };
    });
    const mixed = [
      ...scored.filter((row) => row.quality === "strong").slice(0, 2),
      ...scored.filter((row) => row.quality === "ok").slice(0, 1),
      ...scored.filter((row) => row.quality === "weak").slice(0, 1)
    ];
    const options = shuffleCopy(mixed.length >= 3 ? mixed : scored).slice(0, 4);
    return {
      setup: "Pairing Lab",
      scene: food.description || "",
      prompt: `Guest orders ${food.name}. Which beer do you recommend?`,
      options
    };
  });
}

function buildPourQueue() {
  const taps = liveTaps();
  if (taps.length < 3) return [];
  const beats = [
    { id: "lite", setup: "What would you pour?", scene: "“I usually drink Miller Lite and don’t want anything bitter.”" },
    { id: "hazy", setup: "What would you pour?", scene: "“I like hazy IPAs but want something lower ABV.”" },
    { id: "dark", setup: "What would you pour?", scene: "“I want something dark but not super heavy.”" }
  ];
  return beats.map((beat) => ({
    setup: beat.setup,
    scene: beat.scene,
    prompt: "Pick from what’s actually on tap.",
    options: shuffleCopy(taps).slice(0, 6).map((beer) => {
      const result = scorePourChoice(beat.id, beer);
      const meta = [beerName(beer), beerStyleOf(beer), beerAbvNum(beer) != null ? `${beerAbvNum(beer)}%` : ""].filter(Boolean).join(" — ");
      return { label: meta, quality: result.quality, explain: result.explain };
    })
  }));
}

function buildCiceroneQueue() {
  const questions = shuffleCopy(CICERONE_BANK).slice(0, 7).map((item) => ({
    setup: "Cicerone Challenge",
    prompt: item.prompt,
    options: shuffleCopy(item.options)
  }));
  const taps = liveTaps().filter((beer) => beerAbvNum(beer) != null);
  if (taps.length >= 3) {
    const sorted = [...taps].sort((a, b) => beerAbvNum(b) - beerAbvNum(a));
    const high = sorted[0];
    questions.push({
      setup: "Cicerone Challenge",
      prompt: "From tonight’s taps, which beer is highest ABV?",
      options: shuffleCopy(sorted.slice(0, 4)).map((beer) => ({
        label: `${beerName(beer)} · ${beerAbvNum(beer)}%`,
        quality: beerName(beer) === beerName(high) ? "strong" : "weak",
        explain: beerName(beer) === beerName(high)
          ? `Correct — ${beerName(high)} is ${beerAbvNum(high)}% tonight. Say the number before you pour a “fun” beer.`
          : `Close — ${beerName(high)} is the heavy hitter at ${beerAbvNum(high)}%. ${beerName(beer)} is ${beerAbvNum(beer)}%.`
      }))
    });
  }
  return shuffleCopy(questions).slice(0, 8);
}

function recordAcademyIfNeeded(session) {
  if (!session || session.recorded || typeof recordProgress !== "function") return;
  if (typeof currentUser === "undefined" || !currentUser) {
    session.recorded = true;
    return;
  }
  session.recorded = true;
  const total = Math.max(session.queueLength || (session.queue || []).length, 1);
  recordProgress(session.id, "beer", session.right || 0, total);
}

function startAcademyGame(id) {
  if (!BEER_ACADEMY_GAMES.some((game) => game.id === id)) return false;

  if (id === "academy_brew") {
    gameSession = {
      id,
      kind: "academy",
      mode: "order",
      steps: BREW_STEPS,
      nextIndex: 0,
      placed: [],
      remaining: shuffleCopy(BREW_STEPS.map((step) => step.id)),
      quiz: shuffleCopy(BREW_QUIZ),
      queue: [],
      queueLength: BREW_STEPS.length + BREW_QUIZ.length,
      index: 0,
      right: 0,
      complete: false,
      recorded: false,
      missedThisStep: false,
      feedback: null
    };
    return true;
  }

  const builders = {
    academy_style: buildStyleQueue,
    academy_flavor: buildFlavorQueue,
    academy_pair: buildPairQueue,
    academy_cicerone: buildCiceroneQueue,
    academy_pour: buildPourQueue
  };
  const queue = builders[id] ? builders[id]() : [];
  gameSession = {
    id,
    kind: "academy",
    mode: "quiz",
    queue,
    queueLength: queue.length,
    index: 0,
    right: 0,
    complete: false,
    recorded: false,
    feedback: null,
    emptyReason: !queue.length
  };
  return true;
}

function academyMeta(id) {
  return BEER_ACADEMY_GAMES.find((game) => game.id === id) || { title: "Beer Academy", desc: "" };
}

function renderAcademyGame(content) {
  if (!gameSession || gameSession.kind !== "academy") {
    content.innerHTML = wrapGame(`<div class="status"><strong>No academy game loaded.</strong></div>`);
    return;
  }
  const meta = academyMeta(gameSession.id);
  if (gameSession.emptyReason) {
    content.innerHTML = wrapGame(`<div class="status"><strong>Need live beer or food data for this game.</strong> Open On Tap, then come back.</div>`);
    return;
  }
  if (gameSession.complete) {
    recordAcademyIfNeeded(gameSession);
    const total = gameSession.queueLength || gameSession.right;
    content.innerHTML = wrapGame(`
      <div class="game-card academy-card">
        <p class="scenario-eyebrow">Beer Academy</p>
        <p class="game-question">${escapeHTML(meta.title)}</p>
        <p class="wg-scene">You got <strong>${gameSession.right}</strong> of <strong>${total}</strong>. Fun score only — not a trainer eval, Skill Passport, or ranking.</p>
        ${gameSession.id === "academy_cicerone" ? `<p class="academy-disclaimer">Finishing this does not make you a Certified Cicerone.</p>` : ""}
        <button type="button" class="game-next" onclick="startGame('${gameSession.id}')">Play again</button>
      </div>
    `);
    return;
  }
  if (gameSession.mode === "order") return renderBrewOrder(content, meta);
  const item = gameSession.queue[gameSession.index];
  if (!item) {
    gameSession.complete = true;
    return renderAcademyGame(content);
  }
  const fb = gameSession.feedback;
  const ciceroneNote = gameSession.id === "academy_cicerone"
    ? `<p class="academy-disclaimer">For the beer nerds. Completing this does not make you a Certified Cicerone.</p>`
    : "";
  content.innerHTML = wrapGame(`
    <div class="game-card academy-card">
      <p class="wg-progress">${escapeHTML(meta.title)} · ${gameSession.index + 1} of ${gameSession.queue.length}</p>
      ${ciceroneNote}
      <p class="scenario-eyebrow">${escapeHTML(item.setup || meta.title)}</p>
      ${item.scene ? `<p class="wg-scene">${escapeHTML(item.scene)}</p>` : ""}
      <p class="game-question">${escapeHTML(item.prompt)}</p>
      <div class="game-options">
        ${item.options.map((opt, idx) => `
          <button type="button" class="${optionClass(fb, idx, opt.quality)}" ${fb ? "disabled" : `onclick="answerAcademy(${idx})"`}>${escapeHTML(opt.label)}</button>
        `).join("")}
      </div>
      ${fb ? `<p class="scenario-feedback academy-explain is-${fb.quality}">${escapeHTML(fb.explain)}</p>
        <button type="button" class="game-next" onclick="nextAcademy()">Next</button>` : ""}
    </div>
  `);
}

function renderBrewOrder(content, meta) {
  const fb = gameSession.feedback;
  const next = BREW_STEPS[gameSession.nextIndex];
  content.innerHTML = wrapGame(`
    <div class="game-card academy-card">
      <p class="wg-progress">${escapeHTML(meta.title)} · put these in order</p>
      <p class="scenario-eyebrow">Brew day</p>
      <p class="game-question">Put these in order</p>
      <ol class="brew-placed">
        ${gameSession.placed.map((step) => `<li>${escapeHTML(step.label)}</li>`).join("")}
        ${next ? `<li class="is-next">${escapeHTML(next.label)}?</li>` : ""}
      </ol>
      <div class="game-options">
        ${gameSession.remaining.map((id) => {
          const step = BREW_STEPS.find((row) => row.id === id);
          return `<button type="button" class="game-option${fb ? " disabled" : ""}" ${fb ? "disabled" : `onclick="answerBrewStep('${id}')"`}>${escapeHTML(step.label)}</button>`;
        }).join("")}
      </div>
      ${fb ? `<p class="scenario-feedback academy-explain is-${fb.quality}">${escapeHTML(fb.explain)}</p>
        <button type="button" class="game-next" onclick="nextAcademy()">Next</button>` : ""}
    </div>
  `);
}

function answerBrewStep(id) {
  if (!gameSession || gameSession.id !== "academy_brew" || gameSession.mode !== "order" || gameSession.feedback) return;
  const expected = BREW_STEPS[gameSession.nextIndex];
  if (!expected) return;
  if (id !== expected.id) {
    gameSession.missedThisStep = true;
    gameSession.feedback = {
      quality: "weak",
      explain: `Not yet — ${expected.label} comes next. ${expected.why}`
    };
    if (typeof render === "function") render();
    return;
  }
  if (!gameSession.missedThisStep) gameSession.right += 1;
  gameSession.placed.push(expected);
  gameSession.remaining = gameSession.remaining.filter((row) => row !== id);
  gameSession.nextIndex += 1;
  gameSession.missedThisStep = false;
  gameSession.index += 1;
  if (gameSession.nextIndex >= BREW_STEPS.length) {
    gameSession.mode = "quiz";
    gameSession.queue = gameSession.quiz;
    gameSession.index = 0;
  }
  if (typeof render === "function") render();
}

function answerAcademy(idx) {
  if (!gameSession || gameSession.kind !== "academy" || gameSession.feedback) return;
  const item = (gameSession.queue || [])[gameSession.index];
  const opt = item?.options?.[idx];
  if (!opt) return;
  if (opt.quality === "strong" || opt.quality === "ok") gameSession.right += 1;
  gameSession.feedback = { idx, quality: opt.quality, explain: opt.explain };
  if (typeof render === "function") render();
}

function nextAcademy() {
  if (!gameSession || gameSession.kind !== "academy") return;
  if (gameSession.mode === "order") {
    gameSession.feedback = null;
    if (gameSession.missedThisStep) {
      const expected = BREW_STEPS[gameSession.nextIndex];
      if (expected) {
        gameSession.placed.push(expected);
        gameSession.remaining = gameSession.remaining.filter((row) => row !== expected.id);
        gameSession.nextIndex += 1;
        gameSession.index += 1;
        gameSession.missedThisStep = false;
        if (gameSession.nextIndex >= BREW_STEPS.length) {
          gameSession.mode = "quiz";
          gameSession.queue = gameSession.quiz;
          gameSession.index = 0;
        }
      }
    }
    if (typeof render === "function") render();
    return;
  }
  gameSession.feedback = null;
  gameSession.index += 1;
  if (gameSession.index >= (gameSession.queue || []).length) {
    gameSession.complete = true;
  }
  if (typeof render === "function") render();
}

if (typeof window !== "undefined") {
  window.WAR_GAMES = WAR_GAMES;
  window.FEATURED_GAME_IDS = FEATURED_GAME_IDS;
  window.TRIVIA_GAME_IDS = TRIVIA_GAME_IDS;
  window.ARCADE_GAMES = ARCADE_GAMES;
  window.BEER_ACADEMY_GAMES = BEER_ACADEMY_GAMES;
  window.FLIGHT_PROMPT = FLIGHT_PROMPT;
  window.tagBeer = tagBeer;
  window.scoreFlight = scoreFlight;
  window.scoreReadGuestBeer = scoreReadGuestBeer;
  window.beerPourLook = beerPourLook;
  window.startJudgmentGame = startJudgmentGame;
  window.startAcademyGame = startAcademyGame;
  window.answerJudgment = answerJudgment;
  window.nextJudgment = nextJudgment;
  window.advanceRushFromFeedback = advanceRushFromFeedback;
  window.toggleFlightBeer = toggleFlightBeer;
  window.submitFlight = submitFlight;
  window.openWarGameTraining = openWarGameTraining;
  window.renderJudgmentGame = renderJudgmentGame;
  window.renderAcademyGame = renderAcademyGame;
  window.answerAcademy = answerAcademy;
  window.answerBrewStep = answerBrewStep;
  window.nextAcademy = nextAcademy;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WAR_GAMES,
    FEATURED_GAME_IDS,
    TRIVIA_GAME_IDS,
    ARCADE_GAMES,
    BEER_ACADEMY_GAMES,
    FLIGHT_PROMPT,
    RUSH_NODES,
    SATURDAY_PROBLEMS,
    tagBeer,
    scoreFlight,
    scoreReadGuestBeer,
    styleFamily,
    beerPourLook,
    coachingFromSession,
    pickReadGuestOptions,
    uniqueTrain
  };
}
