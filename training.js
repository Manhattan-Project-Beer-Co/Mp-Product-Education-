/**
 * Training — five-shift LEARN / PRACTICE / PROVE path.
 * Progress still lives in /api/first-five/* so existing sign-offs keep counting.
 *
 * Expects: apiFetch, escapeHTML, escapeForAttribute, currentUser, contentType,
 * activateAppTab, StaffRoles, floorSection, checklistId, renderTodayAtMpStrip,
 * beers, openBeerByName, openFoodItem, openSopDocument, sopDocuments, loadSopsData.
 */

const TRAINING_SKILL_META = {
  login_portal: { label: "Find your way around Launch Pad", kind: "know" },
  find_on_tap: { label: "Core beer — Gold Flash", kind: "know" },
  ask_mp: { label: "Ask MP when you are stuck", kind: "know" },
  allergy_confirm: { label: "Allergen questions", kind: "observe" },
  taste_one_beer: { label: "Taste and describe one beer", kind: "demonstrate" },
  guest_greet: { label: "Guest greet", kind: "observe" },
  style_basics: { label: "Beer style basics", kind: "know" },
  coffee_menu: { label: "Coffee menu", kind: "know" },
  end_of_shift: { label: "End of Shift", kind: "observe" },
  checklist_run: { label: "Opening checklist", kind: "demonstrate" },
  sop_lookup: { label: "Look up an SOP", kind: "know" },
  "86_board": { label: "The 86 board", kind: "observe" },
  eighty_six_board: { label: "The 86 board", kind: "observe" },
  sell_this: { label: "Sell This Today", kind: "observe" },
  pairing_talk: { label: "Food + beer pairing", kind: "know" },
  recovery_scenario: { label: "Complaint recovery", kind: "demonstrate" },
  independent_service: { label: "Own the room", kind: "demonstrate" },
  events_awareness: { label: "What’s on the books", kind: "know" },
  trainer_signoff: { label: "Trainer sign-off", kind: "demonstrate" },
  ticket_flow: { label: "How a ticket moves", kind: "know" },
  know_the_space: { label: "Know the space", kind: "know" },
  guest_location: { label: "Name + location on every ticket", kind: "observe" },
  ticket_accuracy: { label: "Ticket accuracy", kind: "know" },
  runner_check: { label: "Runner ticket check", kind: "observe" },
  ticket_correction: { label: "Ticket corrections", kind: "demonstrate" }
};

const TRAINING_LESSONS = {
  login_portal: {
    learn: {
      facts: "Home is the shift briefing. Service holds On Tap, Food, Drinks, and Shift Tools. My Shift holds checklists. Safety + Emergency is always in the sidebar.",
      guest: "Guests never see Launch Pad. You do — so you can answer without guessing.",
      why: "If you cannot find the special, the 86 board, or closing steps in 30 seconds, you will freeze during a rush."
    },
    practice: "Without help, open Home, then On Tap, then the opening checklist, then come back here.",
    prove: "Tell your trainer where today’s special, 86s, and the closing checklist live.",
    reference: { label: "Open Home", tab: "home" }
  },
  find_on_tap: {
    learn: {
      facts: "Gold Flash is our honey lager · about 5.2%. Light, clean, slightly sweet, subtle honey.",
      guest: "Recommend it when a guest says: “I want something easy.” “I usually drink Modelo.” “I don’t like IPAs.”",
      why: "Core beers are the ones you will describe 20 times a night. One clean sentence is the whole skill."
    },
    practice: "Describe Gold Flash to a guest in one sentence — style, flavor, and who it’s for.",
    prove: "Explain Gold Flash to your trainer without reading the screen.",
    reference: { label: "View Gold Flash on On Tap", beer: "Gold Flash" }
  },
  ask_mp: {
    learn: {
      facts: "Ask MP searches live beer, food, drinks, SOPs, and training. Search Launch Pad is the directory. They are two different buttons.",
      guest: "Never invent an allergen or recipe answer. If Ask MP has no source, ask the kitchen or a lead.",
      why: "Guessing is slower than searching, and wrong guesses become guest complaints."
    },
    practice: "Ask MP: “What’s in a Michelada?” Then open the source it cites.",
    prove: "Show your trainer how you would look up a beer close to Modelo.",
    reference: { label: "Open Ask MP", tab: "askmp" }
  },
  allergy_confirm: {
    learn: {
      facts: "You can filter food, but you cannot guarantee. Fried items use beef tallow. Buns and flour tortillas are not gluten-free unless marked.",
      guest: "If a guest names an allergen: pause, check the dish, then confirm with kitchen. Never say “you’ll be fine.”",
      why: "Allergy mistakes are not recoverable with a free beer. Slow down."
    },
    practice: "Walk the Allergy Check filter for dairy, then say out loud what you would still confirm with kitchen.",
    prove: "Role-play: guest says they’re celiac and wants the burger. What do you do?",
    reference: { label: "Open Allergy Check", floor: "allergy" }
  },
  taste_one_beer: {
    learn: {
      facts: "Taste with a purpose: aroma, malt/hop, finish, who you’d sell it to. One beer, not a flight.",
      guest: "“I tasted it this afternoon — it’s clean up front with a dry finish” beats reading the can.",
      why: "Guests can tell when you are reciting versus remembering."
    },
    practice: "Taste one beer currently on tap. Write one guest sentence.",
    prove: "Tell your trainer that sentence without looking at On Tap.",
    reference: { label: "Open On Tap", tab: "ontap" }
  },
  guest_greet: {
    learn: {
      facts: "Clock-in greet: eye contact, welcome, “have you been in before?”, first drink or water. Guests order at the bar and seat themselves — there is no host. Don’t vanish into side work.",
      guest: "A greet in the first minute beats a perfect beer two minutes later.",
      why: "Unacknowledged guests start the night already annoyed."
    },
    practice: "Greet the next walk-in using: welcome → have you been here → first drink.",
    prove: "Your trainer watches one greet. No script in hand.",
    reference: { label: "In-service SOP", sopTitle: "Taproom Guide — In Service Standards" }
  },
  style_basics: {
    learn: {
      facts: "Lager = clean/crisp. IPA = hop-forward. Hazy = juicier, softer bitter. Sour = tart. Stout/nitro = dark, creamy. Match the guest, not your favorite.",
      guest: "If they drink Modelo/Miller, start lager. If they want hoppy but not bitter, hazy before West Coast.",
      why: "Style language lets you recover when the exact beer they named isn’t on."
    },
    practice: "Pick three beers on tap and name the style family in one word each — or play Build the Flight / Read the Guest.",
    prove: "Trainer asks: “I like light beer.” Name two taps and why.",
    reference: { label: "Beer Catalog", tab: "catalog" }
  },
  coffee_menu: {
    learn: {
      facts: "Coffee is a real service line, not a side hustle. Know house drinks, milk options, and today’s seasonal if it’s live.",
      guest: "You should be able to take a latte order without walking to the machine first.",
      why: "Morning and lunch die if the floor can’t speak coffee."
    },
    practice: "Open Drinks → Coffee. Name the house espresso drink and one seasonal if live.",
    prove: "Explain a latte order to your trainer including milk choice.",
    reference: { label: "Open Coffee", drinks: "coffee" }
  },
  end_of_shift: {
    learn: {
      facts: "End of Shift is how the next crew hears the truth — 86s, broken gear, weird guests, what sold.",
      guest: "Guests never see it. The morning team does.",
      why: "A skipped survey is how the same problem hits two shifts in a row."
    },
    practice: "Read today’s End of Shift form so you know the questions before close.",
    prove: "Tell your trainer what you would report after a busy Saturday.",
    reference: { label: "End of Shift", tab: "shift-survey" }
  },
  checklist_run: {
    learn: {
      facts: "Opening is a sequence, not a vibe. Patio, coffee, taps, menus, sanitizer. Do it with your trainer once, then lead it.",
      guest: "Guests feel an unfinished open: dirty menus, late coffee, missing silverware.",
      why: "Skipping a line item always shows up in the first 30 minutes of service."
    },
    practice: "Run the Opening checklist with your trainer. Check items as you actually do them.",
    prove: "Lead the next open. Trainer watches; you don’t wait to be assigned each task.",
    reference: { label: "Opening checklist", checklist: "opening" }
  },
  sop_lookup: {
    learn: {
      facts: "SOPs are the house way. If Launch Pad and a coworker disagree, the SOP wins until a lead says otherwise.",
      guest: "You don’t quote SOPs to guests. You use them so the experience is consistent.",
      why: "Tribal memory dies when the closer who “just knows” has the day off."
    },
    practice: "Open Closing Procedures 2.0 and find the patio lock step.",
    prove: "Show your trainer the SOP you’d use if espresso tastes sour.",
    reference: { label: "Closing Procedures 2.0", sopTitle: "Closing Procedures 2.0" }
  },
  "86_board": {
    learn: {
      facts: "The 86 board is live. Check it before you sell. If you 86 something, put it on the board — don’t just tell the person next to you.",
      guest: "Never sell an 86’d item. Confirm before you promise.",
      why: "A table that orders something we don’t have starts the meal behind."
    },
    practice: "Open Shift Tools → 86 board. Name everything on it right now.",
    prove: "Trainer: “Can I get the special?” You check the board out loud before answering.",
    reference: { label: "86 board", floor: "board" }
  },
  sell_this: {
    learn: {
      facts: "Sell This Today is the house push — usually a beer, dish, or both. Learn the talking points before first seating.",
      guest: "One confident sentence beats a paragraph.",
      why: "We picked this item on purpose. If you don’t mention it, it sits."
    },
    practice: "Open Sell This Today and write one guest line in your own words.",
    prove: "Deliver that line to your trainer as if they just sat.",
    reference: { label: "Sell This Today", floor: "sell" }
  },
  pairing_talk: {
    learn: {
      facts: "Start simple: fried chicken + IPA, burger + lager or amber, rich/creamy + something with acid or roast. Don’t force a pairing if they already know what they want.",
      guest: "“If you like that beer, the bacon cheeseburger sits well with it” is enough.",
      why: "Pairing is how we sell food without sounding like a script."
    },
    practice: "Pair today’s Gold Flash (or the easiest lager on tap) with the bacon cheeseburger in one sentence.",
    prove: "Trainer plays a guest who wants a beer and is hungry. You recommend both.",
    reference: { label: "Bacon Cheeseburger", food: "bacon-cheeseburger" }
  },
  recovery_scenario: {
    learn: {
      facts: "Acknowledge, don’t defend, fix what you can, loop a lead if comps or safety. The goal is the guest leaving willing to come back.",
      guest: "“I’m sorry that happened — let me make it right” then act.",
      why: "A slow, proud recovery is worse than a small, fast one."
    },
    practice: "Play Saturday Night. Say your first sentence out loud on the wrong-beer or late-food problem.",
    prove: "Trainer: beer is wrong / food is late. You recover without blaming the kitchen.",
    reference: { label: "Saturday Night", tab: "games", game: "saturday" }
  },
  independent_service: {
    learn: {
      facts: "Scan → prioritize → act → communicate → reset. Never walk empty-handed. There are no traditional server sections — Shift Lead, Bartender, Float, and Run/Bus rotate. Think about the entire taproom.",
      guest: "They should not have to wave twice — patio, bar, and production included.",
      why: "Waiting to be told is how 7:30 gets worse."
    },
    practice: "Play The Rush, then work 30 minutes of service using the loop. After each lap, name what you scanned.",
    prove: "Trainer watches a rush window. You don’t disappear into side work.",
    reference: { label: "In-service standards", sopTitle: "Taproom Guide — In Service Standards" }
  },
  events_awareness: {
    learn: {
      facts: "Events is a My Shift page: what’s published this week, guest count, taproom impact, patio, production/back, food notes. Production seating may be an event or extra seats — check before you stash glassware there.",
      guest: "If someone asks about a private event, point them to the lead — don’t guess capacity.",
      why: "Walking into a buyout unprepared makes the whole floor look surprised."
    },
    practice: "Open Events. Name anything published this week, or say “none posted.”",
    prove: "Tell your trainer where you’d look if a guest asks about a reservation tonight.",
    reference: { label: "Events", tab: "events" }
  },
  trainer_signoff: {
    learn: {
      facts: "Sign-off means you can do the shift-5 skills without being steered. It is not a percentage.",
      guest: "Independence looks like calm, not speed.",
      why: "We verify so the next trainer isn’t starting from zero."
    },
    practice: "Review Skills you can do with your trainer. Mark anything that still needs practice.",
    prove: "Trainer completes the handoff: strength, needs practice, next focus.",
    reference: { label: "Stay on Training", stay: true }
  },
  ticket_flow: {
    learn: {
      facts: "Guests order at the bar. Food tickets go upstairs to kitchen. Runners check the ticket upstairs, then carry food down. Patio, taproom, and production/back are all destinations.",
      guest: "They should never have to wonder if anyone knows where they sat.",
      why: "A ticket without a location is a plate wandering the stairs."
    },
    practice: "Say the path out loud: bar ticket → kitchen upstairs → runner check → table downstairs.",
    prove: "Tell your trainer who owns accuracy at send, who owns the upstairs check, and who cooks to the ticket.",
    reference: { label: "Kitchen Ticket SOP", sopTitle: "Kitchen Ticket SOP" }
  },
  know_the_space: {
    learn: {
      facts: "Bar service, seat yourself, no host. Daily assignments: Shift Lead, Bartender, Float, Run/Bus — everyone is cross-trained and rotates. Kitchen is upstairs. Outdoor patio. Production/back may be extra seating or a private event.",
      guest: "If they look lost, they are looking for a seat or the bar — there is no host stand to point at.",
      why: "If you only watch “your” chairs, patio and production die."
    },
    practice: "Walk the room once: bar, taproom floor, patio, stairs to kitchen, production/back. Name today’s assignment and who else is on.",
    prove: "Trainer: “Where does food get checked?” and “Where might an event be using chairs?” You answer without guessing.",
    reference: { label: "Today's Floor", tab: "today-floor" },
    visual: "space"
  },
  guest_location: {
    learn: {
      facts: "Every ticket: guest name as Last, F. and a real location (Patio 4, Bar, High-top 2, Production). Seat-yourself is not an excuse to skip location.",
      guest: "Their beer and their food have to find the same people.",
      why: "Wrong patio vs production is how a table eats someone else’s chicken."
    },
    practice: "Write three example headers: Garcia, M. / Patio 3 · Patel, A. / Bar · Nguyen, T. / Production.",
    prove: "Trainer watches you put name + location on a ticket before send.",
    reference: { label: "Kitchen Ticket SOP", sopTitle: "Kitchen Ticket SOP" }
  },
  ticket_accuracy: {
    learn: {
      facts: "A complete ticket has guest name, location, every food and drink item, modifiers, and allergies. Review it before send. Kitchen cooks what is printed, not what you meant.",
      guest: "“No pickle” and “shellfish allergy” are not optional flavor text.",
      why: "The runner only knows what you wrote."
    },
    practice: "Compare the correct and incorrect ticket examples below. Mark what is missing before you would send.",
    prove: "Trainer: you catch a missing modifier and a missing allergy on sample tickets.",
    reference: { label: "Kitchen Ticket SOP", sopTitle: "Kitchen Ticket SOP" },
    quiz: "ticket_accuracy"
  },
  runner_check: {
    learn: {
      facts: "Before you leave the kitchen: read guest name, location, items, modifiers, allergies. Match plates to that ticket. Then walk downstairs. Food already on a clock beats a pretty patio.",
      guest: "The plate in your hands is their meal — not a tray of random food.",
      why: "Grabbing “whatever looks done” is how Patio 2 gets Production’s order."
    },
    practice: "Use the runner checklist on two imaginary tickets upstairs. Do not skip the read.",
    prove: "Trainer watches one real or staged run. You read the ticket out loud before you pick up plates.",
    reference: { label: "Kitchen Ticket SOP", sopTitle: "Kitchen Ticket SOP" },
    visual: "runner"
  },
  ticket_correction: {
    learn: {
      facts: "If the ticket is already in kitchen, tell them now. Do not only fire a second conflicting ticket. Remakes need a verbal plus the correction. Shift Lead for lost plates, comps, and safety.",
      guest: "They should hear an honest fix, not a silent reprint.",
      why: "A second silent ticket is how you get two burgers or none."
    },
    practice: "Play Saturday Night checkout / allergen beats. Say the sentence you would use to kitchen.",
    prove: "Trainer: you sent a ticket with no location. Walk the correction — kitchen first, then the guest if food already moved.",
    reference: { label: "Kitchen Ticket SOP", sopTitle: "Kitchen Ticket SOP" },
    quiz: "ticket_correction"
  }
};

const TICKET_QUIZZES = {
  ticket_accuracy: [
    {
      id: "A",
      prompt: "Which guest name belongs on the ticket?",
      ticket: "Loc: Patio 3\n1 Fried Chicken",
      options: [
        { text: "Garcia, M.", good: true, tip: "Last, F. — kitchen and runners can read it at a glance." },
        { text: "Maria", good: false, tip: "First name only is how two Marias collide on patio." },
        { text: "Leave it blank — you’ll remember the table.", good: false, tip: "The runner upstairs cannot read your memory." }
      ]
    },
    {
      id: "B",
      prompt: "What is wrong with this ticket?",
      ticket: "Garcia, M.\n1 Fried Chicken\n1 Gold Flash pint",
      options: [
        { text: "Missing table / location.", good: true, tip: "Seat yourself still needs Patio 3, Bar, or Production on the ticket." },
        { text: "The beer should not be on a food ticket.", good: false, tip: "Complete food and drink details belong together so the run is whole." },
        { text: "The name format is wrong.", good: false, tip: "Garcia, M. is the house format." }
      ]
    },
    {
      id: "C",
      prompt: "Guest said extra hot and no pickle. Which ticket is send-ready?",
      options: [
        { text: "Garcia, M. · Patio 3 · 1 Fried Chicken — extra hot, no pickle", good: true, tip: "Modifiers live on the ticket, not in the air." },
        { text: "Garcia, M. · Patio 3 · 1 Fried Chicken — you’ll tell kitchen on the way up", good: false, tip: "Kitchen cooks the ticket, not the hallway conversation." },
        { text: "Garcia, M. · 1 Fried Chicken extra hot (location later)", good: false, tip: "Location is not optional." }
      ]
    },
    {
      id: "D",
      prompt: "Guest mentioned a shellfish allergy. The ticket has the chicken and location. What is still missing?",
      ticket: "Garcia, M.\nLoc: Patio 3\n1 Fried Chicken — extra hot, no pickle",
      options: [
        { text: "Allergy note on the ticket, confirmed with kitchen before send.", good: true, tip: "If it is not on the ticket, it did not happen." },
        { text: "Nothing — you’ll mention it if kitchen asks.", good: false, tip: "Kitchen should not have to ask. Stop and confirm." },
        { text: "A second ticket that only says ALLERGY.", good: false, tip: "One complete ticket. Do not split the truth across two slips." }
      ]
    },
    {
      id: "E",
      prompt: "Which of these is a complete, reviewable ticket?",
      ticket: "Garcia, M.\nLoc: Patio 3\n1 Fried Chicken — extra hot, no pickle\nALLERGY: shellfish\n1 Gold Flash pint",
      options: [
        { text: "This one — name, location, items, modifiers, allergy. Review, then send.", good: true, tip: "Read it once like a runner who has never met Garcia." },
        { text: "Drop the beer — kitchen doesn’t need it.", good: false, tip: "Complete food and drink details keep the run honest." },
        { text: "Send now and fix spelling later with a second ticket.", good: false, tip: "Review before send. Corrections after send are a different skill." }
      ]
    }
  ],
  ticket_correction: [
    {
      id: "F",
      prompt: "You already sent a ticket with no location. Food is still upstairs. What do you do?",
      options: [
        { text: "Tell kitchen the location now. Do not only fire a second silent ticket.", good: true, tip: "Verbal plus urgency. A second slip can duplicate the order." },
        { text: "Send a new full ticket and walk away.", good: false, tip: "That is how you get two chickens." },
        { text: "Wait for the runner to guess patio vs production.", good: false, tip: "Guessing destinations is the failure." }
      ]
    }
  ]
};

const TICKET_QUIZ_ANSWERS = {};

function renderTicketSample(text) {
  if (!text) return "";
  return `<pre class="ticket-sample">${escapeHTML(text)}</pre>`;
}

function renderKnowTheSpaceVisual() {
  return `
    <div class="space-map" aria-label="Taproom zones">
      <div class="space-map-row">
        <div class="space-zone"><span>Kitchen upstairs</span><em>Check tickets here before you run</em></div>
      </div>
      <div class="space-map-row">
        <div class="space-zone"><span>Bar</span><em>Guests order here · no host</em></div>
        <div class="space-zone"><span>Taproom</span><em>Seat yourself</em></div>
      </div>
      <div class="space-map-row">
        <div class="space-zone"><span>Patio</span><em>Outdoor seating · bus on the walk</em></div>
        <div class="space-zone"><span>Production / back</span><em>Extra seats or private event</em></div>
      </div>
      <p class="training-section-lead">Photos of each zone will live here. Assignments rotate: Shift Lead · Bartender · Float · Run/Bus.</p>
    </div>
  `;
}

function renderRunnerChecklist() {
  return `
    <ol class="runner-check">
      <li>Read guest name</li>
      <li>Read table / location</li>
      <li>Read items, modifiers, allergies</li>
      <li>Match plates to that ticket</li>
      <li>Then walk downstairs</li>
    </ol>
  `;
}

function renderTrainingQuiz(quizKey) {
  const items = TICKET_QUIZZES[quizKey] || [];
  if (!items.length) return "";
  return `
    <section class="training-lesson-block">
      <h3>Check yourself</h3>
      <p>Ticket standards — not a software walkthrough. Pick the house way.</p>
      ${items.map((item, qIdx) => {
        const state = TICKET_QUIZ_ANSWERS[`${quizKey}:${qIdx}`];
        return `
          <div class="ticket-quiz" id="ticket-quiz-${quizKey}-${qIdx}">
            <p class="ticket-quiz-kicker">Example ${item.id}</p>
            <p>${escapeHTML(item.prompt)}</p>
            ${renderTicketSample(item.ticket)}
            <div class="game-options">
              ${item.options.map((opt, idx) => {
                let cls = "game-option";
                if (state) {
                  cls += " disabled";
                  if (opt.good) cls += " correct";
                  else if (state.idx === idx) cls += " wrong";
                }
                return `<button type="button" class="${cls}" ${state ? "disabled" : `onclick="answerTrainingQuiz('${quizKey}', ${qIdx}, ${idx})"`}>${escapeHTML(opt.text)}</button>`;
              }).join("")}
            </div>
            ${state ? `<p class="scenario-feedback">${escapeHTML(item.options[state.idx]?.tip || "")}</p>` : ""}
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function answerTrainingQuiz(quizKey, qIdx, idx) {
  const item = (TICKET_QUIZZES[quizKey] || [])[qIdx];
  if (!item || TICKET_QUIZ_ANSWERS[`${quizKey}:${qIdx}`]) return;
  TICKET_QUIZ_ANSWERS[`${quizKey}:${qIdx}`] = { idx };
  if (typeof render === "function") render();
}

const TRAINING_KIND_LABEL = {
  know: "Learn",
  observe: "Practice",
  demonstrate: "Prove"
};

const TRAINING_STATUS_LABEL = {
  verified: "Verified",
  can_do: "Can do",
  learning: "Learning",
  needs_practice: "Needs practice",
  not_introduced: "Not introduced",
  "not-started": "Not introduced",
  ready: "Can do",
  practice: "Needs practice"
};

const DAY_IN_THE_LIFE = [
  {
    id: "clock-in",
    title: "Clock in",
    points: ["Check Home", "Check the shift chart", "Review specials", "Review 86s", "Know your role"]
  },
  {
    id: "orient",
    title: "Get oriented",
    points: ["Walk the floor once — bar, patio, production/back, stairs to kitchen", "See today’s assignments: Shift Lead, Bartender, Float, Run/Bus", "Note events or buyouts using production", "Fill water / sanitizer if it’s thin"]
  },
  {
    id: "pre",
    title: "Pre-service",
    points: ["Finish opening or your assigned setup", "Taste what you need to sell", "Ask the lead the one thing that would surprise you"]
  },
  {
    id: "service",
    title: "Service",
    points: ["Greet fast", "Take the order you can stand behind", "Run food with silverware", "Never walk empty-handed"]
  },
  {
    id: "rush",
    title: "Rush",
    points: ["Scan the room", "Prioritize upstairs tickets and the bar line", "Run food", "Communicate", "Help outside your assignment", "Don’t disappear into side work"],
    why: "Every unnecessary trip adds up during a rush. Moving intentionally keeps the floor cleaner and gets guests what they need faster."
  },
  {
    id: "cuts",
    title: "Cuts",
    points: ["Know who is leaving and what they still own", "Don’t dump a dirty section on the closer", "Reset before you drop"]
  },
  {
    id: "close",
    title: "Close / handoff",
    points: ["Finish your checklist", "Write what the next crew needs", "Submit End of Shift", "Don’t leave a surprise"]
  }
];

const SERVICE_LOOP = [
  { title: "Scan", example: "Upstairs tickets, bar line, patio, production seating." },
  { title: "Prioritize", example: "Finished food upstairs beats a water top-off." },
  { title: "Act", example: "Check the ticket, run the food. Then the bar. Then the glass." },
  { title: "Communicate", example: "“I’ve got patio 3.” “Tickets are stacked.” “Need a lead on production.”" },
  { title: "Reset", example: "Hands empty? Grab glassware or menus on the way back. Never walk empty-handed." }
];

let trainingState = {
  loaded: false,
  loading: false,
  error: "",
  curriculum: [],
  progress: [],
  unlockedShift: 1,
  doneKeys: new Set(),
  statusMap: new Map(),
  handoff: null,
  canTrain: false
};

let trainingView = "dashboard";
let trainingLessonShift = 1;
let trainingLessonKey = "";
let trainingRoster = null;
let trainingTrainerId = null;

function isTraineeUser(user = typeof currentUser !== "undefined" ? currentUser : null) {
  if (!user) return false;
  if (typeof StaffRoles !== "undefined" && StaffRoles?.hasRole) {
    return StaffRoles.hasRole(user, "trainee");
  }
  return String(user.role || "").toLowerCase() === "trainee";
}

function canTrainStaff(user = typeof currentUser !== "undefined" ? currentUser : null) {
  if (!user) return false;
  return Boolean(
    user.permissions?.trainStaff
    || user.permissions?.shiftLeadCapability
    || StaffRoles?.canTrainStaff?.(user)
    || StaffRoles?.hasShiftLeadCapability?.(user)
  );
}

function trainingFirstName(user = currentUser) {
  const name = String(user?.name || "there").trim();
  return name.split(/\s+/)[0] || "there";
}

function defaultHomeTabForUser(user = currentUser) {
  return isTraineeUser(user) ? "training" : "home";
}

function resetTrainingState() {
  trainingState = {
    loaded: false,
    loading: false,
    error: "",
    curriculum: [],
    progress: [],
    unlockedShift: 1,
    doneKeys: new Set(),
    statusMap: new Map(),
    handoff: null,
    canTrain: false
  };
  trainingView = "dashboard";
  trainingLessonKey = "";
  trainingRoster = null;
}

function progressKey(shift, skillKey) {
  return `${shift}:${skillKey}`;
}

function rowStatus(row) {
  if (!row) return "not_introduced";
  if (row.status) return row.status;
  return row.demonstrated ? "verified" : "learning";
}

function computeTrainingProgress(curriculum, progressRows) {
  const statusMap = new Map();
  (progressRows || []).forEach((row) => {
    statusMap.set(progressKey(row.shift_number, row.skill_key), rowStatus(row));
  });
  const doneKeys = new Set(
    [...statusMap.entries()].filter(([, status]) => status === "verified").map(([key]) => key)
  );
  let unlockedShift = 1;
  let completedSkills = 0;
  let totalSkills = 0;

  (curriculum || []).forEach((block) => {
    const skills = block.skills || [];
    totalSkills += skills.length;
    skills.forEach((sk) => {
      if (doneKeys.has(progressKey(block.shift, sk))) completedSkills += 1;
    });
  });

  for (let shift = 1; shift <= 5; shift += 1) {
    const block = (curriculum || []).find((c) => c.shift === shift);
    if (!block) break;
    const complete = (block.skills || []).every((sk) => doneKeys.has(progressKey(shift, sk)));
    if (complete) unlockedShift = Math.min(5, shift + 1);
    else {
      unlockedShift = shift;
      break;
    }
  }

  const percent = totalSkills ? Math.round((completedSkills / totalSkills) * 100) : 0;
  return { doneKeys, unlockedShift, completedSkills, totalSkills, percent, statusMap };
}

function nextIncompleteTrainingActivity() {
  const { curriculum, doneKeys, unlockedShift } = trainingState;
  for (let shift = 1; shift <= unlockedShift; shift += 1) {
    const block = (curriculum || []).find((c) => c.shift === shift);
    if (!block) continue;
    for (const skillKey of block.skills || []) {
      if (!doneKeys.has(progressKey(shift, skillKey))) {
        return { shift, skillKey, block };
      }
    }
  }
  return null;
}

async function ensureTrainingState(force = false) {
  if (!currentUser) {
    resetTrainingState();
    return trainingState;
  }
  if (trainingState.loaded && !force) return trainingState;
  if (trainingState.loading) return trainingState;

  trainingState.loading = true;
  try {
    const data = await apiFetch("/api/first-five/me");
    const curriculum = data.curriculum || [];
    const progress = data.progress || [];
    const computed = computeTrainingProgress(curriculum, progress);
    trainingState = {
      loaded: true,
      loading: false,
      error: "",
      curriculum,
      progress,
      unlockedShift: computed.unlockedShift,
      doneKeys: computed.doneKeys,
      statusMap: computed.statusMap,
      completedSkills: computed.completedSkills,
      totalSkills: computed.totalSkills,
      percent: computed.percent,
      handoff: data.handoff || null,
      canTrain: Boolean(data.canTrain) || canTrainStaff()
    };
  } catch (error) {
    trainingState = {
      loaded: true,
      loading: false,
      error: error.message || "Could not load training progress.",
      curriculum: [],
      progress: [],
      unlockedShift: 1,
      doneKeys: new Set(),
      statusMap: new Map(),
      completedSkills: 0,
      totalSkills: 0,
      percent: 0,
      handoff: null,
      canTrain: canTrainStaff()
    };
  }
  return trainingState;
}

function skillStatusFor(state, shift, skillKey) {
  const stored = state.statusMap?.get(progressKey(shift, skillKey));
  if (stored) return stored;
  if (state.doneKeys.has(progressKey(shift, skillKey))) return "verified";
  if (shift > state.unlockedShift) return "not_introduced";
  if (shift < state.unlockedShift) return "needs_practice";
  return "learning";
}

function shiftShortTitle(block) {
  if (!block) return "Training";
  const raw = String(block.title || "");
  const afterDash = raw.split(/—|–|-/).slice(1).join("-").trim();
  if (afterDash) return afterDash;
  return raw || `Shift ${block.shift}`;
}

function renderTrainingStatusChip(status) {
  const key = status === "not-started" ? "not_introduced" : status;
  const label = TRAINING_STATUS_LABEL[key] || status;
  return `<span class="training-status training-status-${escapeForAttribute(key)}">${escapeHTML(label)}</span>`;
}

function openTrainingBeer(name) {
  const list = typeof beers !== "undefined" ? beers : [];
  const match = list.find((beer) => String(beer.Name || "").toLowerCase() === String(name || "").toLowerCase());
  if (match && typeof openBeerByName === "function") {
    openBeerByName(match.Name);
    return;
  }
  activateAppTab("ontap");
}

function openTrainingSop(title) {
  const docs = typeof sopDocuments !== "undefined" ? sopDocuments : [];
  const doc = docs.find((item) => item.title === title);
  if (doc && typeof openSopDocument === "function") {
    openSopDocument(doc.id);
    return;
  }
  if (typeof loadSopsData === "function") {
    loadSopsData(false).then(() => {
      const again = (typeof sopDocuments !== "undefined" ? sopDocuments : []).find((item) => item.title === title);
      if (again && typeof openSopDocument === "function") openSopDocument(again.id);
      else activateAppTab("sops");
    }).catch(() => activateAppTab("sops"));
    return;
  }
  activateAppTab("sops");
}

function openTrainingReference(ref) {
  if (!ref || ref.stay) return;
  if (ref.beer) {
    openTrainingBeer(ref.beer);
    return;
  }
  if (ref.food && typeof openFoodItem === "function") {
    openFoodItem(ref.food);
    return;
  }
  if (ref.sopTitle) {
    openTrainingSop(ref.sopTitle);
    return;
  }
  if (ref.checklist) {
    if (typeof checklistId !== "undefined") checklistId = ref.checklist;
    activateAppTab("checklists");
    return;
  }
  if (ref.floor) {
    floorSection = ref.floor;
    activateAppTab("floor");
    return;
  }
  if (ref.drinks) {
    if (typeof drinksSection !== "undefined") drinksSection = ref.drinks;
    if (typeof coffeeSection !== "undefined") coffeeSection = "menu";
    activateAppTab("drinks");
    return;
  }
  if (ref.tab === "catalog") {
    if (typeof ontapView !== "undefined") ontapView = "catalog";
    activateAppTab("ontap");
    return;
  }
  if (ref.game && typeof startGame === "function") {
    activateAppTab("games");
    startGame(ref.game);
    return;
  }
  if (ref.tab) activateAppTab(ref.tab);
}

function openTrainingSkill(skillKey, shiftNumber) {
  const shift = Number(shiftNumber) || trainingState.unlockedShift || 1;
  trainingView = "lesson";
  trainingLessonKey = skillKey;
  trainingLessonShift = shift;
  if (typeof render === "function" && contentType() === "training") render();
  else activateAppTab("training");
}

function continueTraining() {
  const next = nextIncompleteTrainingActivity();
  if (!next) {
    trainingView = "dashboard";
    if (typeof render === "function") render();
    return;
  }
  openTrainingSkill(next.skillKey, next.shift);
}

function trainingQuickLink(action) {
  if (action === "day") {
    trainingView = "dashboard";
    if (typeof render === "function") render();
    queueMicrotask(() => document.getElementById("trainingDayLife")?.scrollIntoView({ behavior: "smooth" }));
    return;
  }
  if (action === "trainer") {
    showTrainerMode();
    return;
  }
  if (action === "progress") {
    activateAppTab("progress");
    return;
  }
  if (action === "feedback") {
    activateAppTab("features");
    return;
  }
  if (action === "games") {
    activateAppTab("games");
    return;
  }
}

async function setTrainingSkillStatus(shiftNumber, skillKey, status, userId) {
  await apiFetch("/api/first-five/signoff", {
    method: "POST",
    body: JSON.stringify({
      shiftNumber,
      skillKey,
      status,
      userId: userId || undefined
    })
  });
  await ensureTrainingState(true);
  if (trainingView === "trainer") trainingRoster = null;
  if (typeof render === "function") render();
}

function showTrainerMode() {
  trainingView = "trainer";
  trainingRoster = null;
  if (typeof render === "function") render();
}

function showTrainingDashboard() {
  trainingView = "dashboard";
  if (typeof render === "function") render();
}

async function ensureTrainingRoster(force = false) {
  if (trainingRoster && !force) return trainingRoster;
  const data = await apiFetch("/api/first-five/roster");
  trainingRoster = data;
  if (!trainingTrainerId && data.trainees?.length) trainingTrainerId = data.trainees[0].id;
  return trainingRoster;
}

async function saveTrainingHandoff(traineeId, shiftNumber) {
  const strength = document.getElementById("handoffStrength")?.value.trim() || "";
  const needsPractice = document.getElementById("handoffNeeds")?.value.trim() || "";
  const nextFocus = document.getElementById("handoffNext")?.value.trim() || "";
  const note = document.getElementById("handoffNote")?.value.trim() || "";
  await apiFetch("/api/first-five/handoff", {
    method: "POST",
    body: JSON.stringify({ traineeId, shiftNumber, strength, needsPractice, nextFocus, note })
  });
  trainingRoster = null;
  await ensureTrainingState(true);
  if (typeof render === "function") render();
}

const TRAINING_NEXT_SHIFT = {
  1: { know: "Home, On Tap, and Ask MP.", practice: "One-sentence Gold Flash pitch.", ask: "How we confirm allergens with kitchen." },
  2: { know: "Guest greet and beer style families.", practice: "Take one coffee order including milk.", ask: "What End of Shift should include tonight." },
  3: { know: "Opening sequence and where SOPs live.", practice: "Run the 86 board before you sell.", ask: "Which SOP you’d use if espresso tastes sour." },
  4: { know: "Today’s Sell This item and one pairing.", practice: "Recommend without reading the screen.", ask: "How we recover a complaint on this floor." },
  5: { know: "Your section and what’s on the books.", practice: "Own the section without waiting to be assigned.", ask: "What sign-off still needs a trainer." }
};

function renderBeforeNextShift(block) {
  const next = TRAINING_NEXT_SHIFT[block?.shift];
  if (!next) return "";
  return `
    <section class="training-section training-next-shift">
      <h3 class="training-section-title">Before your next shift</h3>
      <ul class="training-next-list">
        <li><strong>Know</strong> ${escapeHTML(next.know)}</li>
        <li><strong>Practice</strong> ${escapeHTML(next.practice)}</li>
        <li><strong>Ask your trainer</strong> ${escapeHTML(next.ask)}</li>
      </ul>
    </section>
  `;
}

function renderTrainingRoadmap(state) {
  const blocks = [];
  for (let shift = 1; shift <= 5; shift += 1) {
    const block = (state.curriculum || []).find((c) => c.shift === shift) || {
      shift,
      title: `Shift ${shift}`,
      focus: "",
      skills: []
    };
    const skills = block.skills || [];
    const doneCount = skills.filter((sk) => state.doneKeys.has(progressKey(shift, sk))).length;
    const complete = skills.length > 0 && doneCount === skills.length;
    const current = shift === state.unlockedShift && !complete;
    let stateClass = "is-upcoming";
    let marker = "○";
    let caption = "Up next";
    if (complete) {
      stateClass = "is-done";
      marker = "✓";
      caption = "Verified";
    } else if (current || (shift === state.unlockedShift && !skills.length)) {
      stateClass = "is-current";
      marker = "●";
      caption = "You are here";
    } else if (shift < state.unlockedShift) {
      stateClass = "is-open";
      marker = "◐";
      caption = "Needs practice";
    }
    blocks.push(`
      <div class="training-road-step ${stateClass}">
        <span class="training-road-marker" aria-hidden="true">${marker}</span>
        <div class="training-road-copy">
          <span class="training-road-shift">Shift ${shift}</span>
          <strong>${escapeHTML(shiftShortTitle(block))}</strong>
          <small>${escapeHTML(caption)}${skills.length ? ` · ${doneCount}/${skills.length} verified` : ""}</small>
        </div>
      </div>
    `);
  }
  return `
    <section class="training-section">
      <h3 class="training-section-title">Five-shift path</h3>
      <div class="training-roadmap" role="list">${blocks.join("")}</div>
    </section>
  `;
}

function renderSkillsYouCanDo(state) {
  const items = [];
  (state.curriculum || []).forEach((block) => {
    (block.skills || []).forEach((skillKey) => {
      const status = skillStatusFor(state, block.shift, skillKey);
      if (status === "not_introduced") return;
      const mark = status === "verified" || status === "can_do" ? "✓" : status === "learning" || status === "needs_practice" ? "◐" : "○";
      items.push({
        skillKey,
        shift: block.shift,
        label: TRAINING_SKILL_META[skillKey]?.label || skillKey,
        status,
        mark
      });
    });
  });
  if (!items.length) return "";
  return `
    <section class="training-section">
      <h3 class="training-section-title">Skills you can do</h3>
      <p class="training-section-lead">Verified and can-do matter more than a percentage.</p>
      <ul class="training-can-do">
        ${items.map((item) => `
          <li>
            <button type="button" class="training-can-do-btn" onclick="openTrainingSkill('${escapeForAttribute(item.skillKey)}', ${item.shift})">
              <span aria-hidden="true">${item.mark}</span>
              ${escapeHTML(item.label)}
              ${renderTrainingStatusChip(item.status)}
            </button>
          </li>
        `).join("")}
      </ul>
      <p class="training-progress-note">${state.completedSkills || 0} of ${state.totalSkills || 0} verified</p>
    </section>
  `;
}

function wrapTrainingMore(title, inner) {
  if (!inner) return "";
  return `<details class="training-more"><summary>${escapeHTML(title)}</summary>${inner}</details>`;
}

function renderTodayFocus(state) {
  const block = (state.curriculum || []).find((c) => c.shift === state.unlockedShift)
    || (state.curriculum || [])[0];
  if (!block) {
    return `
      <section class="training-section">
        <h3 class="training-section-title">Today’s actions</h3>
        <p class="training-empty">Your five-shift path will show here once training data loads.</p>
      </section>
    `;
  }

  const skills = block.skills || [];
  const pending = skills.filter((sk) => {
    const status = skillStatusFor(state, block.shift, sk);
    return status !== "verified" && status !== "can_do";
  });
  const shown = (pending.length ? pending : skills).slice(0, 3);
  const byKind = { know: [], observe: [], demonstrate: [] };
  shown.forEach((sk) => {
    const kind = TRAINING_SKILL_META[sk]?.kind || "know";
    (byKind[kind] || byKind.know).push(sk);
  });
  const groups = [
    { key: "know", title: "Learn" },
    { key: "observe", title: "Practice" },
    { key: "demonstrate", title: "Prove" }
  ].filter((g) => byKind[g.key].length);

  return `
    <section class="training-section">
      <div class="training-focus-head">
        <h3 class="training-section-title">Today’s actions</h3>
      </div>
      ${groups.map((g) => `
        <div class="training-skill-group">
          <h4 class="training-skill-group-title">${escapeHTML(g.title)}</h4>
          <div class="training-skill-grid">
            ${byKind[g.key].map((skillKey) => {
              const meta = TRAINING_SKILL_META[skillKey] || { label: skillKey, kind: "know" };
              const status = skillStatusFor(state, block.shift, skillKey);
              return `
                <button type="button" class="training-skill-card status-${escapeForAttribute(status)}" onclick="openTrainingSkill('${escapeForAttribute(skillKey)}', ${block.shift})">
                  <span class="training-skill-kind">${escapeHTML(TRAINING_KIND_LABEL[meta.kind] || "Learn")}</span>
                  <strong class="training-skill-label">${escapeHTML(meta.label)}</strong>
                  ${renderTrainingStatusChip(status)}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </section>
  `;
}

function renderServiceLoop() {
  return `
    <section class="training-section training-loop-section">
      <h3 class="training-section-title">MP service loop</h3>
      <p class="training-section-lead">Scan → Prioritize → Act → Communicate → Reset. Keep it in your head during service.</p>
      <div class="training-loop" aria-label="Service loop">
        ${SERVICE_LOOP.map((step, i) => `
          <div class="training-loop-step">
            <span class="training-loop-num">${i + 1}</span>
            <strong>${escapeHTML(step.title)}</strong>
          </div>
          ${i < SERVICE_LOOP.length - 1 ? `<span class="training-loop-arrow" aria-hidden="true">→</span>` : `<span class="training-loop-arrow training-loop-reset" aria-hidden="true">↺</span>`}
        `).join("")}
      </div>
      <div class="training-loop-examples">
        ${SERVICE_LOOP.map((step) => `
          <p><strong>${escapeHTML(step.title)}.</strong> ${escapeHTML(step.example)}</p>
        `).join("")}
      </div>
      <div class="training-why">
        <p class="training-why-kicker">Why this matters</p>
        <p>Never walk empty-handed. Every extra trip adds up during a rush. Moving on purpose keeps the floor cleaner and gets guests what they need faster.</p>
      </div>
    </section>
  `;
}

function renderDayInTheLife() {
  return `
    <section class="training-section" id="trainingDayLife">
      <h3 class="training-section-title">Your shift at MP</h3>
      <p class="training-section-lead">What the day actually feels like. Open a phase when you need it.</p>
      <div class="training-day">
        ${DAY_IN_THE_LIFE.map((phase, index) => `
          <details class="training-day-step"${index === 0 ? " open" : ""}>
            <summary>
              <span class="training-day-index">${index + 1}</span>
              ${escapeHTML(phase.title)}
            </summary>
            <ul>${phase.points.map((point) => `<li>${escapeHTML(point)}</li>`).join("")}</ul>
            ${phase.why ? `<div class="training-why"><p class="training-why-kicker">Why this matters</p><p>${escapeHTML(phase.why)}</p></div>` : ""}
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

function renderLesson(state) {
  const skillKey = trainingLessonKey;
  const shift = trainingLessonShift;
  const lessonKey = TRAINING_LESSONS[skillKey] ? skillKey : (skillKey === "eighty_six_board" ? "86_board" : skillKey);
  const lesson = TRAINING_LESSONS[lessonKey];
  const meta = TRAINING_SKILL_META[skillKey] || { label: skillKey, kind: "know" };
  const status = skillStatusFor(state, shift, skillKey);
  const trainer = canTrainStaff();
  if (!lesson) {
    return `
      <div class="training-page">
        <button type="button" class="page-back" onclick="showTrainingDashboard()">← Training</button>
        <p class="training-empty">No lesson written for this skill yet.</p>
      </div>
    `;
  }
  return `
    <div class="training-page">
      <button type="button" class="page-back" onclick="showTrainingDashboard()">← Training</button>
      <p class="training-kicker">Shift ${shift} · ${escapeHTML(TRAINING_KIND_LABEL[meta.kind] || "Learn")}</p>
      <h2 class="training-welcome">${escapeHTML(meta.label)}</h2>
      ${renderTrainingStatusChip(status)}

      <section class="training-lesson-block">
        <h3>Learn</h3>
        <p>${escapeHTML(lesson.learn.facts)}</p>
        ${lesson.learn.guest ? `<p><strong>What guests need to know.</strong> ${escapeHTML(lesson.learn.guest)}</p>` : ""}
        <div class="training-why">
          <p class="training-why-kicker">Why this matters</p>
          <p>${escapeHTML(lesson.learn.why)}</p>
        </div>
        ${lesson.visual === "space" ? renderKnowTheSpaceVisual() : ""}
      </section>

      <section class="training-lesson-block">
        <h3>Practice</h3>
        <p>${escapeHTML(lesson.practice)}</p>
        ${lesson.visual === "runner" ? renderRunnerChecklist() : ""}
      </section>

      ${lesson.quiz ? renderTrainingQuiz(lesson.quiz) : ""}

      <section class="training-lesson-block">
        <h3>Prove</h3>
        <p>${escapeHTML(lesson.prove)}</p>
      </section>

      ${lesson.reference ? `
        <button type="button" class="btn btn-secondary" onclick="openTrainingReference(TRAINING_LESSONS['${escapeForAttribute(lessonKey)}'].reference)">${escapeHTML(lesson.reference.label)} →</button>
      ` : ""}

      <div class="training-lesson-actions">
        ${status !== "verified" ? `<button type="button" class="btn btn-secondary" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(skillKey)}', 'can_do')">I can do this</button>` : ""}
        ${status !== "learning" && status !== "verified" ? `<button type="button" class="btn btn-subtle" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(skillKey)}', 'learning')">Mark learning</button>` : ""}
        ${trainer ? `
          <button type="button" class="btn btn-primary" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(skillKey)}', 'verified')">Verify</button>
          <button type="button" class="btn btn-subtle" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(skillKey)}', 'needs_practice')">Needs practice</button>
        ` : `<p class="training-section-lead">Ask your trainer to verify when you can do it without reading the screen.</p>`}
      </div>
    </div>
  `;
}

function renderTrainerCard(trainee) {
  const selected = Number(trainingTrainerId) === Number(trainee.id);
  return `
    <button type="button" class="training-trainer-card${selected ? " is-selected" : ""}" onclick="trainingTrainerId=${trainee.id}; render();">
      <strong>${escapeHTML(trainee.name)}</strong>
      <span>${escapeHTML(trainee.shiftTitle || `Shift ${trainee.unlockedShift}`)}</span>
    </button>
  `;
}

function renderTrainerDetail(roster) {
  const trainee = (roster.trainees || []).find((row) => Number(row.id) === Number(trainingTrainerId));
  if (!trainee) {
    return `<p class="training-empty">No trainees in the directory yet. Confirm trainee roles on Team.</p>`;
  }
  const handoff = trainee.handoff;
  return `
    <section class="training-trainer-detail">
      <p class="training-kicker">${escapeHTML(trainee.name)}</p>
      <h3 class="training-section-title">${escapeHTML(trainee.shiftTitle)}</h3>
      <p class="training-section-lead">Today</p>
      <ul class="training-trainer-skills">
        ${(trainee.skills || []).map((row) => {
          const label = TRAINING_SKILL_META[row.skillKey]?.label || row.skillKey;
          const status = row.status || "not_introduced";
          const shift = trainee.unlockedShift;
          return `
            <li>
              <span>${escapeHTML(label)}</span>
              ${renderTrainingStatusChip(status)}
              <span class="training-trainer-actions">
                <button type="button" class="btn btn-primary btn-sm" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(row.skillKey)}', 'verified', ${trainee.id})">Verify</button>
                <button type="button" class="btn btn-subtle btn-sm" onclick="setTrainingSkillStatus(${shift}, '${escapeForAttribute(row.skillKey)}', 'needs_practice', ${trainee.id})">Needs practice</button>
              </span>
            </li>
          `;
        }).join("")}
      </ul>
      ${handoff ? `
        <div class="training-why">
          <p class="training-why-kicker">Last trainer note</p>
          <p>${escapeHTML(handoff.note || [handoff.strength && `Strength: ${handoff.strength}`, handoff.needsPractice && `Needs practice: ${handoff.needsPractice}`, handoff.nextFocus && `Next: ${handoff.nextFocus}`].filter(Boolean).join(" · ") || "No note")}</p>
          <p class="training-progress-note">${escapeHTML(handoff.trainerName || "Trainer")} · shift ${handoff.shiftNumber}</p>
        </div>
      ` : ""}
      <form class="training-handoff" onsubmit="event.preventDefault(); saveTrainingHandoff(${trainee.id}, ${trainee.unlockedShift});">
        <h4>Complete shift handoff</h4>
        <label for="handoffStrength">Strength</label>
        <input id="handoffStrength" type="text" maxlength="400" placeholder="Good menu knowledge">
        <label for="handoffNeeds">Needs practice</label>
        <input id="handoffNeeds" type="text" maxlength="400" placeholder="Stop waiting to be directed">
        <label for="handoffNext">Next shift should focus on</label>
        <input id="handoffNext" type="text" maxlength="400" placeholder="Guest checkout">
        <label for="handoffNote">Optional note</label>
        <input id="handoffNote" type="text" maxlength="400">
        <button type="submit" class="btn btn-primary">Save handoff</button>
      </form>
    </section>
  `;
}

async function renderTrainerMode(content) {
  content.innerHTML = `<div class="training-page"><div class="status"><strong>Loading trainees…</strong></div></div>`;
  try {
    const roster = await ensureTrainingRoster();
    if (contentType() !== "training") return;
    content.innerHTML = `
      <div class="training-page">
        ${typeof renderPageHeader === "function" ? renderPageHeader({
          title: "Trainer mode",
          subtitle: "30-second read — verify, needs practice, hand off.",
          back: { label: "Training", onclick: "showTrainingDashboard();" }
        }) : `<button type="button" class="page-back" onclick="showTrainingDashboard()">← Training</button>`}
        <div class="training-trainer-list">
          ${(roster.trainees || []).map(renderTrainerCard).join("") || `<p class="training-empty">No trainees found.</p>`}
        </div>
        ${renderTrainerDetail(roster)}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="training-page">${typeof renderPageHeader === "function" ? renderPageHeader({
      title: "Trainer mode",
      subtitle: err.message || "Could not load trainees.",
      back: { label: "Training", onclick: "showTrainingDashboard();" }
    }) : `<button type="button" class="page-back" onclick="showTrainingDashboard()">← Training</button>`}<p class="auth-error">${escapeHTML(err.message)}</p></div>`;
  }
}

async function renderTrainingDashboard(content) {
  if (!currentUser) {
    content.innerHTML = `
      <div class="training-page">
        <div class="auth-panel">
          <h3>Sign in to open Training</h3>
          <button class="game-next" type="button" onclick="showLoginGate()">Sign in</button>
        </div>
      </div>
    `;
    return;
  }

  if (trainingView === "trainer" && canTrainStaff()) {
    await renderTrainerMode(content);
    return;
  }

  content.innerHTML = `
    <div class="training-page">
      <div class="status"><strong>Loading your training…</strong></div>
    </div>
  `;

  const state = await ensureTrainingState();
  if (contentType() !== "training") return;

  if (trainingView === "lesson" && trainingLessonKey) {
    content.innerHTML = renderLesson(state);
    return;
  }

  const block = (state.curriculum || []).find((c) => c.shift === state.unlockedShift)
    || (state.curriculum || [])[0];
  const focusTitle = shiftShortTitle(block).toUpperCase();
  const shiftNum = block?.shift || state.unlockedShift || 1;
  const next = nextIncompleteTrainingActivity();
  const continueLabel = next
    ? (TRAINING_SKILL_META[next.skillKey]?.label || "Continue training")
    : "You’re caught up on this path";
  const trainerName = state.handoff?.trainerName || "Your floor trainer";
  const header = typeof renderPageHeader === "function"
    ? renderPageHeader({
        title: "Training",
        subtitle: isTraineeUser() ? `Welcome back, ${trainingFirstName()}.` : "Five-shift path, lessons, and trainer tools.",
        actionsHtml: canTrainStaff()
          ? `<button type="button" class="btn btn-secondary" onclick="showTrainerMode()">Trainer mode</button>`
          : ""
      })
    : "";

  content.innerHTML = `
    <div class="training-page">
      ${header}
      <header class="training-hero">
        <p class="training-kicker">Shift ${shiftNum} of 5</p>
        <h2 class="training-welcome">${escapeHTML(focusTitle)}</h2>
        <p class="training-hero-intro"><strong>Today’s mission.</strong> ${escapeHTML(block?.mission || block?.focus || `Your shift ${shiftNum} training mission.`)}</p>
        <div class="training-method" aria-label="Training progression">
          <span>Learn</span><i>→</i><span>Practice</span><i>→</i><span>Prove</span>
        </div>
        <div class="training-meta-grid">
          <div>
            <span class="training-meta-label">Trainer</span>
            <strong>${escapeHTML(trainerName)}</strong>
          </div>
          <div>
            <span class="training-meta-label">Next</span>
            <strong>${escapeHTML(continueLabel)}</strong>
          </div>
        </div>
        ${state.handoff?.nextFocus ? `<p class="training-focus-blurb">Last handoff: ${escapeHTML(state.handoff.nextFocus)}</p>` : ""}
        ${state.error ? `<div class="auth-error" style="margin-top:12px;">${escapeHTML(state.error)}</div>` : ""}
        <button type="button" class="btn btn-primary training-continue" onclick="continueTraining()">
          Continue training
          <small>${escapeHTML(continueLabel)}</small>
        </button>
      </header>

      ${renderTodayFocus(state)}
      <div id="trainingTodayStrip"></div>
      ${wrapTrainingMore("Before your next shift", renderBeforeNextShift(block))}
      ${wrapTrainingMore("Skills you can do", renderSkillsYouCanDo(state))}
      ${wrapTrainingMore("Five-shift path", renderTrainingRoadmap(state))}
      ${wrapTrainingMore("MP service loop", renderServiceLoop())}
      ${wrapTrainingMore("Your shift at MP", renderDayInTheLife())}
    </div>
  `;

  if (typeof renderTodayAtMpStrip === "function") {
    renderTodayAtMpStrip(document.getElementById("trainingTodayStrip"));
  }
}

if (typeof window !== "undefined") {
  window.TRAINING_SKILL_META = TRAINING_SKILL_META;
  window.TRAINING_LESSONS = TRAINING_LESSONS;
  window.isTraineeUser = isTraineeUser;
  window.canTrainStaff = canTrainStaff;
  window.defaultHomeTabForUser = defaultHomeTabForUser;
  window.resetTrainingState = resetTrainingState;
  window.ensureTrainingState = ensureTrainingState;
  window.renderTrainingDashboard = renderTrainingDashboard;
  window.continueTraining = continueTraining;
  window.openTrainingSkill = openTrainingSkill;
  window.openTrainingReference = openTrainingReference;
  window.trainingQuickLink = trainingQuickLink;
  window.showTrainerMode = showTrainerMode;
  window.showTrainingDashboard = showTrainingDashboard;
  window.answerTrainingQuiz = answerTrainingQuiz;
  window.saveTrainingHandoff = saveTrainingHandoff;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TRAINING_SKILL_META,
    TRAINING_LESSONS,
    isTraineeUser,
    defaultHomeTabForUser,
    computeTrainingProgress
  };
}
