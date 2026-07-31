require("dotenv").config();

const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "training.db"));

const TEST_PASSWORD = "test1234";

const TEST_USERS = [
  { name: "Meredith Manager", email: "manager@mp.test", role: "admin" },
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
const insertProgress = db.prepare(`
  INSERT INTO progress_sessions (user_id, activity_type, category, score, total, completed_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getUserId = db.prepare("SELECT id FROM users WHERE email = ?");

const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 10);

const seed = db.transaction(() => {
  const userIds = {};

  for (const user of TEST_USERS) {
    upsertUser.run(user.name, user.email, passwordHash, user.role);
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
        daysAgoDate(session.daysAgo)
      );
    }
  }
});

seed();

console.log("\nTest data seeded successfully.\n");
console.log("Admin login (Team dashboard):");
console.log("  Email:    manager@mp.test");
console.log("  Password: test1234");
console.log("\nEmployee logins (sample progress):");
console.log("  alex@mp.test   — strong beer + coffee scores");
console.log("  jordan@mp.test — mid-level, still learning");
console.log("  sam@mp.test    — top performer");
console.log("  riley@mp.test  — new hire, minimal activity");
console.log("  Password for all employees: test1234");
console.log("\nOpen http://localhost:8080 → log in as manager@mp.test → Team tab\n");
