/**
 * War Games — judgment drills for the floor.
 * Trivia matching stays in index.html but is off the hub.
 *
 * Expects (browser): wrapGame, escapeHTML, getOnTapBeersSorted, getStyle,
 * getFlavorProfile, recordProgress, recordWrongAnswer, currentUser, render,
 * openTrainingSkill, activateAppTab.
 */

const FEATURED_GAME_IDS = ["rush", "flight", "readguest", "saturday", "favbeer"];
const TRIVIA_GAME_IDS = ["tap", "quiz", "practice", "abv", "style", "reverse", "flash", "speed", "rocket"];

const WAR_GAMES = [
  {
    id: "rush",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 62h56M30 48h40M38 34h24" fill="none" stroke="#9c6b4a" stroke-width="3"/><circle cx="50" cy="72" r="8" fill="none" stroke="#9c6b4a" stroke-width="3"/><path d="M50 22v10" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "The Rush",
    desc: "Saturday 7:30 — the room evolves. What do you do first?"
  },
  {
    id: "flight",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><rect x="16" y="58" width="16" height="22" rx="2" fill="none" stroke="#9c6b4a" stroke-width="3"/><rect x="40" y="46" width="16" height="34" rx="2" fill="none" stroke="#9c6b4a" stroke-width="3"/><rect x="64" y="38" width="16" height="42" rx="2" fill="none" stroke="#9c6b4a" stroke-width="3"/></svg>`,
    title: "Build the Flight",
    desc: "Four beers from tonight’s taps. More than one right answer."
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
    desc: "Dynamic service problems. Coaching, not a scoreboard."
  },
  {
    id: "favbeer",
    icon: `<svg viewBox="0 0 100 100" aria-hidden="true"><ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="#9c6b4a" stroke-width="2.5"/><ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="#9c6b4a" stroke-width="2.5" transform="rotate(60 50 50)"/><path d="M38 58c0-12 8-22 12-28 4 6 12 16 12 28a12 12 0 0 1-24 0z" fill="none" stroke="#9c6b4a" stroke-width="3"/><circle cx="50" cy="58" r="3" fill="#9c6b4a"/></svg>`,
    title: "Staff Favorites",
    desc: "Guess teammates’ beers — unlock them on the board"
  }
];

const FLIGHT_PROMPT = {
  setup: "Two guests. One board.",
  scene: "“I like light beer, my girlfriend likes sour beer, and we both want to try something different.”",
  prompt: "Build a four-beer flight from what’s actually on tap tonight."
};

const RUSH_NODES = {
  start: {
    beat: 1,
    setup: "Saturday · 7:30 PM. The room is packed.",
    scene: "Food is dying in the window. Table 12 is waving. Table 4 just sat. Dirty glasses on 17. The bartender calls for hands.",
    prompt: "What do you do first?",
    options: [
      {
        text: "Run the food in the window — it’s already dying.",
        quality: "strong",
        skills: { urgency: 1 },
        next: "after-window",
        tip: "Dying food is the clock you cannot reset. A wave can wait twenty seconds; fried chicken cannot."
      },
      {
        text: "Catch Table 12’s eye, say you’ll be right there, then run the window.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "after-window",
        tip: "That’s floor awareness. A nod buys you the seconds to run food without making 12 feel invisible."
      },
      {
        text: "Greet Table 4 so they don’t feel ignored.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "sat-first",
        tip: "Greeting matters, but the window is already late. A new table can wait thirty seconds."
      },
      {
        text: "Clear dirty glasses on 17 — never walk empty-handed.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "glass-first",
        tip: "Never-empty-handed is for the walk, not the first decision. Window first, then grab glass on the way."
      },
      {
        text: "Jump on the bar — they called for hands.",
        quality: "ok",
        skills: { awareness: 1 },
        next: "bar-first",
        tip: "Bar support is real, but a guest’s plate is dying. Call “after this ticket” and run the window first."
      }
    ]
  },
  "after-window": {
    beat: 2,
    setup: "You ran the food. Expo is already calling the next ticket.",
    scene: "Table 12 is still waving. The bartender is louder. Table 4 has menus and no water.",
    prompt: "The room just evolved. What’s next?",
    options: [
      {
        text: "Acknowledge 12, drop water on 4 on the way, tell the bartender you’ll swing after this lap.",
        quality: "strong",
        skills: { communicate: 1, awareness: 1 },
        next: "second-lap",
        tip: "Scan → act → communicate. You didn’t disappear, and you didn’t pick only one fire."
      },
      {
        text: "Go straight to Table 12 and take a full order.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "12 needed you. Water on 4 and a call to the bar would have closed two more loops on the same walk."
      },
      {
        text: "Stay in the window until expo is quiet.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "Expo will never be quiet at 7:30. One more ticket while 12 stands there is how sections collapse."
      },
      {
        text: "Hide in glassware until the wave dies down.",
        quality: "weak",
        skills: { communicate: -1, reset: -1 },
        next: "second-lap",
        tip: "Side work is not a refuge. The room can see you."
      }
    ]
  },
  "sat-first": {
    beat: 2,
    setup: "Table 4 is greeted. The window food sat another ninety seconds.",
    scene: "Kitchen is unhappy. Table 12 looks annoyed. Expo is calling your name.",
    prompt: "Recover. What now?",
    options: [
      {
        text: "Run the dying ticket, apologize to expo, then go to 12 with a real update.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "second-lap",
        tip: "You reset the clock. Own the miss, then talk to the waving table."
      },
      {
        text: "Take Table 12’s drink order first so they stop waving.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "12 is loud. The food is still dying. Window, then 12 — or you stack a second miss."
      },
      {
        text: "Tell the kitchen it’s not your section.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "If you can see it, it’s yours. Sections are a starting map, not a wall."
      }
    ]
  },
  "glass-first": {
    beat: 2,
    setup: "17 is cleaner. The window ticket sat.",
    scene: "Expo is sharp. Table 12 is standing now. Table 4 is still dry.",
    prompt: "You chose glass first. How do you get back in the game?",
    options: [
      {
        text: "Run the window now, eyes on 12 as you pass, water on 4 if your hands are free after.",
        quality: "strong",
        skills: { urgency: 1, reset: 1 },
        next: "second-lap",
        tip: "That’s the reset. Glass was the wrong first move; this is the right second one."
      },
      {
        text: "Keep bussing — the room looks messy.",
        quality: "weak",
        skills: { urgency: -1 },
        next: "second-lap",
        tip: "Pretty room, dead food. Guests remember the plate."
      },
      {
        text: "Stop and explain to 12 that you were clearing tables.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "Talking helps, but they wanted action. Run food, then talk."
      }
    ]
  },
  "bar-first": {
    beat: 2,
    setup: "You helped the bartender. Two cocktails walked.",
    scene: "The window ticket is colder. Table 12 has been ignored. Expo is looking for a runner.",
    prompt: "Bar is quieter for a second. What do you do with it?",
    options: [
      {
        text: "Grab the dying food, tell expo you’ve got it, nod at 12 on the way.",
        quality: "strong",
        skills: { urgency: 1, communicate: 1 },
        next: "second-lap",
        tip: "You helped the bar and came back to the floor. That’s the job."
      },
      {
        text: "Stay on the bar until they say they’re good.",
        quality: "weak",
        skills: { awareness: -1 },
        next: "second-lap",
        tip: "“Hands” is not “become a bartender.” One run, then return to the room."
      },
      {
        text: "Go take Table 12 now and leave the window.",
        quality: "ok",
        skills: { communicate: 1 },
        next: "second-lap",
        tip: "12 needed you. Carry the ticket if you can — never walk empty-handed past expo."
      }
    ]
  },
  "second-lap": {
    beat: 3,
    setup: "Same Saturday. The next problem is already here.",
    scene: "Table 8 asks if the fried chicken is safe for a nut allergy. Expo is calling another ticket. Table 12 wants to pay.",
    prompt: "Three things at once. What’s the order?",
    options: [
      {
        text: "Stop for the allergen — check notes, confirm with kitchen, don’t guess — then flag a lead for the checkout if you can’t take it immediately.",
        quality: "strong",
        skills: { communicate: 1, awareness: 1 },
        next: "close-lap",
        tip: "Allergen is safety, not a vibe. Checkout can wait ten seconds; a wrong yes cannot."
      },
      {
        text: "Run the expo ticket first. Allergy can wait.",
        quality: "ok",
        skills: { urgency: 1 },
        next: "close-lap",
        tip: "Food is on a clock, but an allergen question is a stop-the-line. Don’t let it sit unanswered."
      },
      {
        text: "Take the card on 12 — they’re ready to leave.",
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
        tip: "Never guess. Check the dish, confirm with kitchen, say what you know and what you can’t guarantee."
      }
    ]
  },
  "close-lap": {
    beat: 4,
    setup: "The rush is still on. This is the reset.",
    scene: "Hands are empty. Dirty pint glasses are on your pass. Table 4 still needs water. The bartender is fine for a minute.",
    prompt: "How do you close the loop?",
    options: [
      {
        text: "Water on 4, glass in your hand on the way back, eyes on the room.",
        quality: "strong",
        skills: { reset: 1, awareness: 1 },
        next: null,
        tip: "That’s Scan → Prioritize → Act → Communicate → Reset. Never walk empty-handed — after the urgent work."
      },
      {
        text: "Stand in the service station until someone tells you what’s next.",
        quality: "weak",
        skills: { reset: -1 },
        next: null,
        tip: "Waiting to be told is how 7:30 gets worse. The next scan is yours."
      },
      {
        text: "Start a side-work project in the back.",
        quality: "weak",
        skills: { awareness: -1 },
        next: null,
        tip: "If the room is full, the floor owns you. Back-of-house busywork can wait."
      },
      {
        text: "Ask the lead “what do you need?” while you drop water.",
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
    train: { skill: "independent_service", shift: 5, label: "Own your section" },
    setup: "Saturday night · expo",
    scene: "Two plates are dying in the window. A four-top in your section is waving for another round.",
    prompt: "What do you do?",
    options: [
      { text: "Run the food, tell the four-top you’ll be right there as you pass.", quality: "strong", tip: "Food is on a clock. A nod keeps the waving table in the game." },
      { text: "Take the round first — they’re already drinking.", quality: "weak", tip: "Drinks can wait twenty seconds. Those plates cannot." },
      { text: "Ask someone else to run the food while you stay for the round.", quality: "ok", tip: "Calling help is fine if you actually get the call out. Don’t assume they heard you." }
    ]
  },
  {
    id: "allergen",
    skill: "safety",
    train: { skill: "allergy_confirm", shift: 1, label: "Allergen questions" },
    setup: "Saturday night · table",
    scene: "A guest asks if the fried chicken is safe for a nut allergy. The ticket printer is going.",
    prompt: "What do you do?",
    options: [
      { text: "Never guess — check current notes, confirm with kitchen, say what you know and what you can’t guarantee.", quality: "strong", tip: "Escalate when unsure. A confident wrong answer is the failure." },
      { text: "It’s probably fine — we’ve sold a lot of it tonight.", quality: "weak", tip: "Volume is not a safety check." },
      { text: "Read ingredients from memory from last week.", quality: "weak", tip: "Recipes move. Use the portal and the kitchen that is here tonight." }
    ]
  },
  {
    id: "slow-ticket",
    skill: "communicate",
    train: { skill: "independent_service", shift: 5, label: "Own your section" },
    setup: "Saturday night · dining room",
    scene: "A two-top asks where their food is. You haven’t checked expo in a while.",
    prompt: "What do you do?",
    options: [
      { text: "Check expo, come back with a real time or a lead, don’t invent a number.", quality: "strong", tip: "Honesty plus a next step. Guests forgive a wait they understand." },
      { text: "Say “should be any minute” and walk away.", quality: "weak", tip: "That’s a stall. They will ask again, angrier." },
      { text: "Blame the kitchen from the table.", quality: "weak", tip: "They hear us fighting. Fix it upstairs, not in front of them." }
    ]
  },
  {
    id: "checkout",
    skill: "urgency",
    train: { skill: "independent_service", shift: 5, label: "Own your section" },
    setup: "Saturday night · checkout",
    scene: "A guest is standing with a card out. Expo is calling your name for a runner.",
    prompt: "What do you do?",
    options: [
      { text: "Grab the ticket if you can carry it to the pass, tell the guest “I’m dropping this and I’ll take you next.”", quality: "strong", tip: "You protected the plate and you didn’t abandon the person holding a card." },
      { text: "Ignore expo — the guest is ready to leave.", quality: "weak", tip: "Checkout matters. Dying food still wins the clock." },
      { text: "Point at another server and keep walking.", quality: "ok", tip: "Only if they actually take it. A point without a name is a drop." }
    ]
  },
  {
    id: "dirty-table",
    skill: "reset",
    train: { skill: "independent_service", shift: 5, label: "Own your section" },
    setup: "Saturday night · your section",
    scene: "A four-top left a mess. The next party is at the host. Another section needs water.",
    prompt: "What do you do?",
    options: [
      { text: "Clear and reset fast enough to seat, grab water for the other section on the same walk if you can.", quality: "strong", tip: "Turn the table. Help on the walk. That’s ownership." },
      { text: "Let the host wait — you’ll get to it after a break.", quality: "weak", tip: "An empty dirty table is lost seats and a guest staring at someone else’s napkins." },
      { text: "Only run water for the other section and leave your four-top.", quality: "ok", tip: "Helping is good. Your sat party still needs a clean table." }
    ]
  },
  {
    id: "bar-hands",
    skill: "awareness",
    train: { skill: "independent_service", shift: 5, label: "Own your section" },
    setup: "Saturday night · bar",
    scene: "Bartender: “I need a runner.” Your section looks stable for thirty seconds.",
    prompt: "What do you do?",
    options: [
      { text: "Take the run, tell your section you’ll be thirty seconds, come back.", quality: "strong", tip: "Hands means a run, not a new job. Communicate, then return." },
      { text: "Stay in your section — not your problem.", quality: "weak", tip: "If the bar dies, the whole room dies. Help when you can." },
      { text: "Move behind the bar and start making drinks.", quality: "ok", tip: "Only if you’re trained for it and a lead asked. Most nights they need a runner, not another bartender." }
    ]
  },
  {
    id: "wrong-beer",
    skill: "recovery",
    train: { skill: "recovery_scenario", shift: 4, label: "Complaint recovery" },
    setup: "Saturday night · beer",
    scene: "Guest: “This isn’t what I ordered.” It’s the wrong beer, already sipped.",
    prompt: "What do you do?",
    options: [
      { text: "Acknowledge, don’t defend, pull it, get the right one, loop a lead if it needs a comp.", quality: "strong", tip: "A small, fast recovery beats a proud explanation." },
      { text: "Explain that they pointed at the wrong tap.", quality: "weak", tip: "Being right is not the goal. They leave willing to come back, or they don’t." },
      { text: "Leave the wrong beer and offer a taste of the right one later.", quality: "weak", tip: "They already told you it’s wrong. Replace it." }
    ]
  },
  {
    id: "walk-in",
    skill: "communicate",
    train: { skill: "guest_greet", shift: 2, label: "Guest greet" },
    setup: "Saturday night · host",
    scene: "Walk-in party of eight asks if you can seat them now. The floor is slammed. Kitchen is in the weeds.",
    prompt: "What do you do?",
    options: [
      { text: "Check with the lead, set a real wait, offer bar or patio if that’s honest.", quality: "strong", tip: "Honesty plus options beats overpromising a table you don’t have." },
      { text: "Seat them immediately without telling the kitchen.", quality: "weak", tip: "That’s how a crash starts." },
      { text: "Tell them you can’t help and turn away.", quality: "weak", tip: "Too blunt. Offer a path — wait, bar, or another night." }
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
  content.innerHTML = wrapGame(`
    <div class="game-card scenario-card wg-flight">
      <p class="scenario-eyebrow">${escapeHTML(FLIGHT_PROMPT.setup)}</p>
      <p class="wg-scene">${escapeHTML(FLIGHT_PROMPT.scene)}</p>
      <p class="game-question">${escapeHTML(FLIGHT_PROMPT.prompt)}</p>
      <p class="wg-progress">${selected.length} of 4 picked</p>
      <div class="flight-grid">
        ${taps.map((beer) => {
          const meta = beerButtonMeta(beer);
          const on = selected.includes(meta.name);
          return `
            <button type="button" class="flight-chip${on ? " is-on" : ""}" data-name="${escapeHTML(meta.name)}" onclick="toggleFlightBeer(this.getAttribute('data-name'))">
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

if (typeof window !== "undefined") {
  window.WAR_GAMES = WAR_GAMES;
  window.FEATURED_GAME_IDS = FEATURED_GAME_IDS;
  window.TRIVIA_GAME_IDS = TRIVIA_GAME_IDS;
  window.FLIGHT_PROMPT = FLIGHT_PROMPT;
  window.tagBeer = tagBeer;
  window.scoreFlight = scoreFlight;
  window.scoreReadGuestBeer = scoreReadGuestBeer;
  window.startJudgmentGame = startJudgmentGame;
  window.answerJudgment = answerJudgment;
  window.nextJudgment = nextJudgment;
  window.advanceRushFromFeedback = advanceRushFromFeedback;
  window.toggleFlightBeer = toggleFlightBeer;
  window.submitFlight = submitFlight;
  window.openWarGameTraining = openWarGameTraining;
  window.renderJudgmentGame = renderJudgmentGame;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    WAR_GAMES,
    FEATURED_GAME_IDS,
    TRIVIA_GAME_IDS,
    FLIGHT_PROMPT,
    RUSH_NODES,
    SATURDAY_PROBLEMS,
    tagBeer,
    scoreFlight,
    scoreReadGuestBeer,
    styleFamily,
    coachingFromSession,
    pickReadGuestOptions,
    uniqueTrain
  };
}
