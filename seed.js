require("dotenv").config();

const Database = require("better-sqlite3");
const { DB_PATH } = require("./db-path");

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS merch_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS merch_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    size_label TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES merch_items(id) ON DELETE CASCADE,
    UNIQUE(item_id, size_label)
  );

  CREATE TABLE IF NOT EXISTS merch_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS merch_votes (
    idea_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (idea_id, user_id),
    FOREIGN KEY (idea_id) REFERENCES merch_ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS shift_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comments TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, shift_date)
  );

  CREATE TABLE IF NOT EXISTS shift_survey_digest_views (
    user_id INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, shift_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'each',
    supplier TEXT NOT NULL DEFAULT '',
    ordered INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sop_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'General',
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    attachment_name TEXT NOT NULL DEFAULT '',
    attachment_url TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Demo staff exist so the progress dashboards and leaderboards have something
// to show locally. They carry no password: sign-in is Microsoft-only, so these
// accounts cannot be logged into. Never give them one — an earlier version
// shared a hardcoded password across all seven, in a public repo.
const TEST_USERS = [
  { name: "Meredith Manager", email: "manager@mp.test", role: "admin" },
  { name: "Taylor Shift Lead", email: "shiftlead@mp.test", role: "shift_lead" },
  { name: "Casey Merch", email: "merch@mp.test", role: "merch" },
  { name: "Alex Rivera", email: "alex@mp.test", role: "employee" },
  { name: "Jordan Kim", email: "jordan@mp.test", role: "employee" },
  { name: "Sam Ortiz", email: "sam@mp.test", role: "employee" },
  { name: "Riley Chen", email: "riley@mp.test", role: "employee" }
];

const EMPLOYEE_PROGRESS = {
  "alex@mp.test": [
    { activity_type: "quiz", category: "beer", score: 9, total: 10, daysAgo: 1 },
    { activity_type: "tap", category: "beer", score: 8, total: 10, daysAgo: 1 },
    { activity_type: "speed", category: "beer", score: 10, total: 12, daysAgo: 2 },
    { activity_type: "practice", category: "beer", score: 7, total: 10, daysAgo: 3 },
    { activity_type: "coffee_quiz", category: "coffee", score: 8, total: 10, daysAgo: 2 },
    { activity_type: "abv", category: "beer", score: 6, total: 10, daysAgo: 4 },
    { activity_type: "style", category: "beer", score: 9, total: 10, daysAgo: 5 },
    { activity_type: "flash", category: "beer", score: 15, total: 15, daysAgo: 6 }
  ],
  "jordan@mp.test": [
    { activity_type: "quiz", category: "beer", score: 6, total: 10, daysAgo: 1 },
    { activity_type: "tap", category: "beer", score: 5, total: 10, daysAgo: 2 },
    { activity_type: "coffee_quiz", category: "coffee", score: 5, total: 10, daysAgo: 3 },
    { activity_type: "coffee_flash", category: "coffee", score: 15, total: 15, daysAgo: 4 },
    { activity_type: "reverse", category: "beer", score: 4, total: 10, daysAgo: 5 }
  ],
  "sam@mp.test": [
    { activity_type: "speed", category: "beer", score: 11, total: 12, daysAgo: 0 },
    { activity_type: "hard", category: "beer", score: 9, total: 12, daysAgo: 0 },
    { activity_type: "blind", category: "beer", score: 8, total: 10, daysAgo: 1 },
    { activity_type: "practice", category: "beer", score: 10, total: 10, daysAgo: 1 },
    { activity_type: "tap", category: "beer", score: 10, total: 10, daysAgo: 1 },
    { activity_type: "quiz", category: "beer", score: 10, total: 10, daysAgo: 2 },
    { activity_type: "coffee_quiz", category: "coffee", score: 9, total: 10, daysAgo: 2 },
    { activity_type: "abv", category: "beer", score: 9, total: 10, daysAgo: 3 },
    { activity_type: "style", category: "beer", score: 8, total: 10, daysAgo: 4 },
    { activity_type: "flash", category: "beer", score: 15, total: 15, daysAgo: 5 },
    { activity_type: "reverse", category: "beer", score: 7, total: 10, daysAgo: 6 }
  ],
  "riley@mp.test": [
    { activity_type: "flash", category: "beer", score: 15, total: 15, daysAgo: 2 },
    { activity_type: "coffee_flash", category: "coffee", score: 10, total: 15, daysAgo: 3 }
  ]
};

const GAME_POINT_VALUES = {
  quiz: 10, practice: 15, tap: 12, abv: 10, style: 10, reverse: 12, speed: 8,
  hard: 12, flash: 3, blind: 15, desc: 12, gf: 10, battle: 10,
  coffee_quiz: 10, coffee_flash: 3
};

function computeSessionPoints(activityType, score, total) {
  const base = GAME_POINT_VALUES[activityType] || 10;
  let points = score * base;
  if (total >= 8 && score === total) {
    points += Math.round(base * total * 0.25);
  }
  return points;
}

function daysAgoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), 15, 0, 0);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const upsertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role
`);

const deleteProgress = db.prepare("DELETE FROM progress_sessions WHERE user_id = ?");

(function ensureProgressPointsColumn() {
  const cols = db.prepare("PRAGMA table_info(progress_sessions)").all();
  if (!cols.some(c => c.name === "points")) {
    db.exec("ALTER TABLE progress_sessions ADD COLUMN points INTEGER NOT NULL DEFAULT 0");
  }
})();

const insertProgress = db.prepare(`
  INSERT INTO progress_sessions (user_id, activity_type, category, score, total, points, completed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const getUserId = db.prepare("SELECT id FROM users WHERE email = ?");

const seed = db.transaction(() => {
  const userIds = {};

  for (const user of TEST_USERS) {
    upsertUser.run(user.name, user.email, "", user.role);
    const row = getUserId.get(user.email);
    userIds[user.email] = row.id;
    deleteProgress.run(row.id);
  }

  for (const [email, sessions] of Object.entries(EMPLOYEE_PROGRESS)) {
    const userId = userIds[email];
    if (!userId) continue;

    for (const session of sessions) {
      insertProgress.run(
        userId,
        session.activity_type,
        session.category,
        session.score,
        session.total,
        computeSessionPoints(session.activity_type, session.score, session.total),
        daysAgoDate(session.daysAgo)
      );
    }
  }

  return userIds;
});

const clearMerch = db.prepare("DELETE FROM merch_items");
const insertMerch = db.prepare(`
  INSERT INTO merch_items (name, description, price_cents, image_url, sort_order)
  VALUES (?, ?, ?, ?, ?)
`);
const insertMerchSize = db.prepare(`
  INSERT INTO merch_sizes (item_id, size_label, quantity) VALUES (?, ?, ?)
`);
const insertIdea = db.prepare(`
  INSERT INTO merch_ideas (title, description, image_url, created_by)
  VALUES (?, ?, ?, ?)
`);
const insertVote = db.prepare(`
  INSERT INTO merch_votes (idea_id, user_id) VALUES (?, ?)
`);

const { MERCH_CATALOG } = require("./merch-catalog");

const IDEA_SAMPLES = [
  {
    title: "Collab Glassware Set",
    description: "Four-pack of branded pint glasses with taproom-only artwork.",
    votes: ["alex@mp.test", "sam@mp.test", "jordan@mp.test"]
  },
  {
    title: "Winter Beanie",
    description: "Cuffed beanie with woven MP label — black and charcoal colorways.",
    votes: ["sam@mp.test", "riley@mp.test"]
  },
  {
    title: "Brew Crew Work Shirt",
    description: "Button-down short sleeve for floor staff — breathable fabric, subtle logo.",
    votes: ["alex@mp.test"]
  }
];

const seedMerch = db.transaction((userIds) => {
  db.prepare("DELETE FROM merch_votes").run();
  db.prepare("DELETE FROM merch_ideas").run();
  db.prepare("DELETE FROM merch_sizes").run();
  clearMerch.run();

  for (const item of MERCH_CATALOG) {
    const result = insertMerch.run(
      item.name,
      item.description,
      item.price_cents,
      item.image_url,
      item.sort_order
    );
    const itemId = result.lastInsertRowid;
    for (const label of item.sizes) {
      insertMerchSize.run(itemId, label, 0);
    }
  }

  const adminId = getUserId.get("manager@mp.test")?.id;
  for (const idea of IDEA_SAMPLES) {
    const result = insertIdea.run(idea.title, idea.description, "", adminId || null);
    const ideaId = result.lastInsertRowid;
    for (const email of idea.votes) {
      const userId = userIds[email];
      if (userId) insertVote.run(ideaId, userId);
    }
  }
});

const userIds = seed();

try {
  seedMerch(userIds);
  console.log(`Loaded ${MERCH_CATALOG.length} merch items into taproom catalog.`);
} catch (err) {
  console.warn("Merch seed skipped:", err.message);
}

const today = new Date().toISOString().slice(0, 10);
const insertSurvey = db.prepare(`
  INSERT INTO shift_surveys (user_id, shift_date, rating, comments, submitted_at)
  VALUES (?, ?, ?, ?, datetime('now', ?))
  ON CONFLICT(user_id, shift_date) DO UPDATE SET
    rating = excluded.rating,
    comments = excluded.comments,
    submitted_at = excluded.submitted_at
`);

try {
  db.prepare("DELETE FROM shift_surveys WHERE shift_date = ?").run(today);
  if (userIds["alex@mp.test"]) {
    insertSurvey.run(userIds["alex@mp.test"], today, 4, "Busy dinner rush but team stayed organized. Could use one more person on expo.", "-2 hours");
  }
  if (userIds["jordan@mp.test"]) {
    insertSurvey.run(userIds["jordan@mp.test"], today, 3, "Learning the POS still — a few table numbers got mixed up.", "-1 hours");
  }
  if (userIds["sam@mp.test"]) {
    insertSurvey.run(userIds["sam@mp.test"], today, 5, "Smooth shift. Guests loved the weekly special.", "-45 minutes");
  }
} catch (err) {
  console.warn("Shift survey seed skipped:", err.message);
}

const INVENTORY_SAMPLES = [
  { name: "Fried chicken (fresh)", category: "Kitchen", quantity: 18, unit: "lb", supplier: "Sysco", ordered: true, notes: "Brined overnight — par 20 lb" },
  { name: "Brioche buns", category: "Kitchen", quantity: 4, unit: "packs (12)", supplier: "Empire Baking Co.", ordered: false, notes: "Burger + sausage sandwich" },
  { name: "Flour tortillas", category: "Kitchen", quantity: 0, unit: "packs", supplier: "Restaurant Depot", ordered: true, notes: "Breakfast tacos" },
  { name: "Cheddar cheese", category: "Kitchen", quantity: 6, unit: "lb", supplier: "Sysco", ordered: false },
  { name: "White corn masa", category: "Kitchen", quantity: 2, unit: "bags", supplier: "Central Market", ordered: true, notes: "Arepas" },
  { name: "Non-fat Greek yogurt", category: "Kitchen", quantity: 3, unit: "tubs", supplier: "Costco", ordered: false },
  { name: "Oat milk", category: "Coffee", quantity: 8, unit: "cartons", supplier: "Oatly via Restaurant Depot", ordered: true },
  { name: "Whole milk", category: "Coffee", quantity: 5, unit: "gal", supplier: "Sysco", ordered: false },
  { name: "House espresso beans", category: "Coffee", quantity: 12, unit: "lb", supplier: "Avoca Coffee", ordered: true },
  { name: "Nam Jim ingredients", category: "Kitchen", quantity: 1, unit: "batch kit", supplier: "In-house prep", ordered: false, notes: "Fish sauce, lime, cilantro, garlic" },
  { name: "Truffle oil", category: "Kitchen", quantity: 1, unit: "bottle", supplier: "Restaurant Depot", ordered: false },
  { name: "Skirt steak", category: "Kitchen", quantity: 0, unit: "lb", supplier: "Sysco", ordered: true, notes: "Steak frites + bowls" },
  { name: "6 oz burger patties", category: "Kitchen", quantity: 24, unit: "each", supplier: "Sysco", ordered: false },
  { name: "Pretzel dough", category: "Kitchen", quantity: 2, unit: "trays", supplier: "In-house prep", ordered: false, notes: "Saturday lunch only" },
  { name: "Cinnamon ice cream", category: "Kitchen", quantity: 2, unit: "tubs", supplier: "Local creamery", ordered: false },
  { name: "CO₂ / nitrogen", category: "Bar", quantity: 4, unit: "tanks", supplier: "Airgas", ordered: true },
  { name: "Hoppenheimer mustard base", category: "Kitchen", quantity: 1, unit: "batch", supplier: "In-house + brewery malt", ordered: false },
  { name: "To-go containers", category: "Paper & Supplies", quantity: 1, unit: "case", supplier: "WebstaurantStore", ordered: true, notes: "Low — order placed Monday" },
  { name: "Sanitizer tablets", category: "Cleaning", quantity: 3, unit: "jars", supplier: "Sysco", ordered: false }
];

const clearInventory = db.prepare("DELETE FROM inventory_items");
const insertInventory = db.prepare(`
  INSERT INTO inventory_items (name, category, quantity, unit, supplier, ordered, notes, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

try {
  clearInventory.run();
  INVENTORY_SAMPLES.forEach((item, index) => {
    insertInventory.run(
      item.name,
      item.category,
      item.quantity,
      item.unit,
      item.supplier,
      item.ordered ? 1 : 0,
      item.notes || "",
      index
    );
  });
} catch (err) {
  console.warn("Inventory seed skipped:", err.message);
}

const REVIEW_SOURCES = [
  {
    id: "google",
    name: "Google",
    profile_url: "https://www.google.com/maps/search/?api=1&query=Manhattan+Project+Beer+Company+Dallas",
    external_id: "",
    rating: 4.6,
    review_count: 547,
    sort_order: 1
  },
  {
    id: "yelp",
    name: "Yelp",
    profile_url: "https://www.yelp.com/biz/manhattan-project-beer-company-dallas",
    external_id: "manhattan-project-beer-company-dallas",
    rating: 4.5,
    review_count: 215,
    sort_order: 2
  },
  {
    id: "tripadvisor",
    name: "TripAdvisor",
    profile_url: "https://www.tripadvisor.com/Search?q=Manhattan+Project+Beer+Company+Dallas",
    external_id: "",
    rating: 4.5,
    review_count: null,
    sort_order: 3
  },
  {
    id: "facebook",
    name: "Facebook",
    profile_url: "https://www.facebook.com/search/pages?q=Manhattan%20Project%20Beer%20Company%20Dallas",
    external_id: "",
    rating: null,
    review_count: null,
    sort_order: 4
  }
];

const REVIEW_SAMPLES = [
  {
    source_id: "google",
    external_id: "seed-google-1",
    author: "Google guest",
    rating: 5,
    text: "We've been coming for years for the craft beer — Black Matter Nitro is my favorite. The food is way beyond typical bar food. Brunch was Michelin-star worthy. Maya, Jose, and the team are attentive and genuinely nice.",
    review_date: "2026-07-28"
  },
  {
    source_id: "google",
    external_id: "seed-google-2",
    author: "Google guest",
    rating: 5,
    text: "Arepa was seriously delicious — crispy outside, soft inside, generously filled. Beer selection is a standout with familiar favorites and interesting choices. Patio is comfortable even on a cool evening.",
    review_date: "2026-07-20"
  },
  {
    source_id: "google",
    external_id: "seed-google-3",
    author: "Google guest",
    rating: 4,
    text: "Great beer and atmosphere. Fried chicken and fries are a must-order. Service was friendly though dinner ran a little slow on a packed Saturday.",
    review_date: "2026-07-12"
  },
  {
    source_id: "yelp",
    external_id: "seed-yelp-1",
    author: "Yelp guest",
    rating: 5,
    text: "Best fried chicken I've had in Dallas. Fries are crispy outside and soft inside — garlic aioli and Thai chili are perfect. Spacious spot for groups and staff made us feel welcome.",
    review_date: "2026-07-25"
  },
  {
    source_id: "yelp",
    external_id: "seed-yelp-2",
    author: "Yelp guest",
    rating: 5,
    text: "Amazing beer and food — arepas are a standout. Staff were helpful with allergy questions. Inside and patio ambiance are both superb.",
    review_date: "2026-07-18"
  },
  {
    source_id: "yelp",
    external_id: "seed-yelp-3",
    author: "Yelp guest",
    rating: 3,
    text: "Beer and food were good but we waited a long time for a table and kitchen tickets seemed backed up. Worth it if you're not in a rush.",
    review_date: "2026-07-05"
  },
  {
    source_id: "tripadvisor",
    external_id: "seed-trip-1",
    author: "TripAdvisor guest",
    rating: 5,
    text: "Full-day destination — brewery, scratch kitchen, and coffee bar. Grass-fed burgers and Thai fried chicken impressed our group. Live music on Sundays is a nice touch.",
    review_date: "2026-06-30"
  },
  {
    source_id: "facebook",
    external_id: "seed-fb-1",
    author: "Facebook guest",
    rating: 5,
    text: "Love this spot for date night and casual hangs. Coffee bar in the morning and beer at night — staff always remembers our favorites.",
    review_date: "2026-07-15"
  }
];

const upsertReviewSource = db.prepare(`
  INSERT INTO review_sources (id, name, profile_url, external_id, rating, review_count, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    profile_url = excluded.profile_url,
    external_id = excluded.external_id,
    rating = excluded.rating,
    review_count = excluded.review_count,
    sort_order = excluded.sort_order,
    updated_at = datetime('now')
`);

const insertReviewEntry = db.prepare(`
  INSERT INTO review_entries (source_id, external_id, author, rating, text, review_date)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_id, external_id) DO UPDATE SET
    author = excluded.author,
    rating = excluded.rating,
    text = excluded.text,
    review_date = excluded.review_date,
    fetched_at = datetime('now')
`);

const saveReviewSummarySeed = db.prepare(`
  INSERT INTO review_summary (id, positives, negatives, overall_tone, generated_at, mode)
  VALUES (1, ?, ?, ?, datetime('now'), 'local')
  ON CONFLICT(id) DO UPDATE SET
    positives = excluded.positives,
    negatives = excluded.negatives,
    overall_tone = excluded.overall_tone,
    generated_at = excluded.generated_at,
    mode = excluded.mode
`);

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profile_url TEXT NOT NULL,
      external_id TEXT NOT NULL DEFAULT '',
      rating REAL,
      review_count INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS review_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL,
      external_id TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'Guest',
      rating REAL,
      text TEXT NOT NULL,
      review_date TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(source_id, external_id)
    );
    CREATE TABLE IF NOT EXISTS review_summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      positives TEXT NOT NULL DEFAULT '[]',
      negatives TEXT NOT NULL DEFAULT '[]',
      overall_tone TEXT NOT NULL DEFAULT '',
      generated_at TEXT,
      mode TEXT NOT NULL DEFAULT 'local'
    );
  `);

  REVIEW_SOURCES.forEach(source => {
    upsertReviewSource.run(
      source.id,
      source.name,
      source.profile_url,
      source.external_id,
      source.rating,
      source.review_count,
      source.sort_order
    );
  });

  REVIEW_SAMPLES.forEach(review => {
    insertReviewEntry.run(
      review.source_id,
      review.external_id,
      review.author,
      review.rating,
      review.text,
      review.review_date
    );
  });

  saveReviewSummarySeed.run(
    JSON.stringify([
      "Craft beer & rotating taps — guests rave about favorites like Black Matter Nitro",
      "Fried chicken, fries, and arepas are standout menu items",
      "Staff hospitality — team is attentive, allergy-friendly, and professional",
      "Ambiance — cozy indoor space and well-lit patio work for groups and date night"
    ]),
    JSON.stringify([
      "Wait times — a few guests mention slow service on busy Saturday nights",
      "Kitchen pacing — backed-up tickets when the room is full"
    ]),
    "Recent feedback is strongly positive — guests love the beer, scratch kitchen, and hospitality with occasional wait-time concerns on peak nights."
  );
} catch (err) {
  console.warn("Review seed skipped:", err.message);
}

const SOP_SAMPLES = [
  {
    category: "Opening",
    title: "Taproom Opening Checklist",
    summary: "Walk the floor before guests arrive — taps, POS, cleanliness, and safety.",
    sort_order: 1,
    body: `<p><strong>Before unlock</strong></p><ul><li>Walk the floor — lights, music, temperature, and restrooms.</li><li>Verify POS is online and drawer is counted.</li><li>Check tap lines are pouring cleanly; note any foam or off flavors for the lead.</li><li>Confirm ice, glassware, and to-go materials are stocked.</li><li>Review today's beer, food, and coffee specials with the opening team.</li></ul>`
  },
  {
    category: "Closing",
    title: "End-of-Night Close",
    summary: "Secure the building, reset the bar, and leave notes for the next shift.",
    sort_order: 1,
    body: `<p><strong>Last hour</strong></p><ul><li>Announce last call per house policy.</li><li>Break down and sanitize bar top, wells, and coffee station.</li><li>Close out open tabs and reconcile POS with the manager.</li><li>Log low inventory on the Inventory tab.</li><li>Lock doors, set alarm, and note any issues for the opening lead.</li></ul>`
  },
  {
    category: "Bar",
    title: "Guest Allergy & Dietary Questions",
    summary: "How to handle gluten-reduced beer, dairy, and ingredient questions.",
    sort_order: 1,
    body: `<p>Never guess on allergens. Use the tap list and food descriptions in this portal.</p><ul><li>Gluten-reduced beers are flagged on the beer list — confirm with kitchen for food.</li><li>For coffee drinks, whole milk is default; oat milk is available on request.</li><li>If unsure, offer to check with a manager or the kitchen before confirming.</li></ul>`
  }
];

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sop_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'General',
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      attachment_name TEXT NOT NULL DEFAULT '',
      attachment_url TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const sopCount = db.prepare("SELECT COUNT(*) AS count FROM sop_documents WHERE active = 1").get().count;
  if (!sopCount) {
    const insertSop = db.prepare(`
      INSERT INTO sop_documents (category, title, summary, body, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    SOP_SAMPLES.forEach(sample => {
      insertSop.run(sample.category, sample.title, sample.summary, sample.body, sample.sort_order);
    });
    console.log(`Seeded ${SOP_SAMPLES.length} sample SOPs.`);
  }
} catch (err) {
  console.warn("SOP seed skipped:", err.message);
}

console.log("\nTest data seeded successfully.\n");
console.log("Demo staff (sample progress data — no passwords, cannot be signed into):");
console.log("  manager@mp.test   — admin, Team dashboard");
console.log("  shiftlead@mp.test — shift lead, Shift Reports");
console.log("  merch@mp.test     — merch manager");
console.log("  alex@mp.test      — strong beer + coffee scores");
console.log("  jordan@mp.test    — mid-level, still learning");
console.log("  sam@mp.test       — top performer");
console.log("  riley@mp.test     — new hire, minimal activity");
console.log("\nSign in with Microsoft to get a real account; set AZURE_ADMIN_EMAILS to bootstrap an admin.");
console.log("\nOpen http://localhost:8080 → Inventory tab for product stock\n");
console.log("Managers/shift leads can update counts; log in as manager@mp.test or shiftlead@mp.test\n");
