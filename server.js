require("dotenv").config();

const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const { buildContext, localAnswer, getBeers } = require("./chat-knowledge");

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "mp-training-dev-secret-change-in-production";
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "mp-admin-setup";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const CHAT_SYSTEM_PROMPT = `You are the Manhattan Project Beer Co. staff training assistant embedded in the internal training portal.

Rules:
- Answer ONLY using facts from the provided CONTEXT about beers, coffee training, and training games.
- If the answer is not in the context, say you don't have that in the training materials and point the user to the relevant tab (On Tap, Coffee, Games).
- Never invent beer names, tap numbers, ABVs, styles, or coffee standards.
- Never answer questions unrelated to this training site (weather, politics, general trivia, other businesses, homework, etc.). Politely redirect to site topics.
- Keep answers concise, practical, and floor-friendly. Use bullet points when listing beers or steps.
- For beer questions, cite tap number, ABV, and style when available in context.`;

const chatRateLimit = new Map();
const CHAT_LIMIT = 30;
const CHAT_WINDOW_MS = 60 * 1000;

const db = new Database(path.join(__dirname, "training.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'beer',
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_type ON progress_sessions(activity_type);
`);

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(__dirname));

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Login required." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, created_at: row.created_at };
}

function getUserStats(userId) {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS sessions_completed,
      COALESCE(SUM(score), 0) AS total_correct,
      COALESCE(SUM(total), 0) AS total_questions,
      MAX(completed_at) AS last_activity
    FROM progress_sessions
    WHERE user_id = ?
  `).get(userId);

  const byActivity = db.prepare(`
    SELECT activity_type, category, COUNT(*) AS attempts,
           COALESCE(SUM(score), 0) AS correct,
           COALESCE(SUM(total), 0) AS questions,
           MAX(completed_at) AS last_played
    FROM progress_sessions
    WHERE user_id = ?
    GROUP BY activity_type, category
    ORDER BY last_played DESC
  `).all(userId);

  const recent = db.prepare(`
    SELECT activity_type, category, score, total, completed_at
    FROM progress_sessions
    WHERE user_id = ?
    ORDER BY completed_at DESC
    LIMIT 15
  `).all(userId);

  const accuracy = totals.total_questions
    ? Math.round((totals.total_correct / totals.total_questions) * 100)
    : 0;

  return {
    summary: {
      sessions_completed: totals.sessions_completed,
      total_correct: totals.total_correct,
      total_questions: totals.total_questions,
      accuracy,
      last_activity: totals.last_activity
    },
    by_activity: byActivity.map(row => ({
      ...row,
      accuracy: row.questions ? Math.round((row.correct / row.questions) * 100) : 0
    })),
    recent
  };
}

const ACTIVITY_LABELS = {
  quiz: "Flavor Quiz",
  practice: "Guest Match",
  tap: "Tap Match",
  abv: "ABV Challenge",
  style: "Style Match",
  reverse: "Pick the Profile",
  speed: "Speed Round",
  flash: "Beer Flashcards",
  coffee_quiz: "Coffee Quiz",
  coffee_flash: "Coffee Flashcards"
};

const TRAINING_PATH = [
  { type: "flash", category: "beer", label: "Beer Flashcards", goal: 70, critical: false,
    suggest: "Learn the beer menu with flashcards before moving to scored quizzes." },
  { type: "quiz", category: "beer", label: "Flavor Quiz", goal: 70, critical: false,
    suggest: "Practice matching flavor profiles to beer names." },
  { type: "style", category: "beer", label: "Style Match", goal: 70, critical: false,
    suggest: "Build style recognition for menu conversations." },
  { type: "tap", category: "beer", label: "Tap Match", goal: 75, critical: true,
    suggest: "Tap numbers are essential on the floor — prioritize this next." },
  { type: "abv", category: "beer", label: "ABV Challenge", goal: 70, critical: false,
    suggest: "Memorize ABVs from the sheet for guest questions." },
  { type: "practice", category: "beer", label: "Guest Match", goal: 75, critical: true,
    suggest: "Practice guest guidance scenarios for service readiness." },
  { type: "reverse", category: "beer", label: "Pick the Profile", goal: 70, critical: false,
    suggest: "Reverse quiz strengthens detailed product knowledge." },
  { type: "speed", category: "beer", label: "Speed Round", goal: 75, critical: false,
    suggest: "Ready for a mixed review — try Speed Round under pressure." },
  { type: "coffee_flash", category: "coffee", label: "Coffee Flashcards", goal: 70, critical: false,
    suggest: "Review coffee manual key points with flashcards." },
  { type: "coffee_quiz", category: "coffee", label: "Coffee Quiz", goal: 75, critical: true,
    suggest: "Complete the coffee quiz to verify bar standards knowledge." }
];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function activityMap(stats) {
  const map = {};
  for (const row of stats.by_activity) {
    map[row.activity_type] = row;
  }
  return map;
}

function getTrainingRecommendations(stats) {
  const recs = [];
  const map = activityMap(stats);
  const { summary } = stats;
  const inactiveDays = daysSince(summary.last_activity);

  if (summary.sessions_completed === 0) {
    recs.push({
      priority: 0,
      kind: "start",
      title: "Begin onboarding",
      message: "No training logged yet. Start with Beer Flashcards, then Flavor Quiz.",
      action: "Beer Flashcards"
    });
    return recs;
  }

  if (inactiveDays !== null && inactiveDays >= 7) {
    recs.push({
      priority: 1,
      kind: "inactive",
      title: "Schedule a refresher",
      message: `No training in ${inactiveDays} days. Assign a 10-question Speed Round or Tap Match session.`,
      action: "Speed Round"
    });
  }

  for (const step of TRAINING_PATH) {
    const row = map[step.type];
    if (!row) {
      recs.push({
        priority: step.critical ? 2 : 4,
        kind: "missing",
        title: `Start ${step.label}`,
        message: step.suggest,
        action: step.label
      });
    } else if (step.goal && row.questions > 0 && row.accuracy < step.goal) {
      recs.push({
        priority: step.critical ? 3 : 5,
        kind: "improve",
        title: `Improve ${step.label}`,
        message: `${row.accuracy}% accuracy (${row.attempts} attempt${row.attempts === 1 ? "" : "s"}) — retry until ${step.goal}%+.`,
        action: step.label
      });
    }
  }

  const beerActivities = TRAINING_PATH.filter(s => s.category === "beer");
  const coffeeActivities = TRAINING_PATH.filter(s => s.category === "coffee");
  const beerDone = beerActivities.filter(s => {
    const r = map[s.type];
    return r && (!s.goal || r.accuracy >= s.goal);
  }).length;
  const coffeeStarted = coffeeActivities.some(s => map[s.type]);

  if (beerDone >= 5 && !coffeeStarted) {
    recs.push({
      priority: 6,
      kind: "expand",
      title: "Add coffee training",
      message: "Beer fundamentals look solid. Move them to the Coffee tab for manual + quiz.",
      action: "Coffee Flashcards"
    });
  }

  if (summary.accuracy >= 85 && summary.sessions_completed >= 6) {
    recs.push({
      priority: 7,
      kind: "advanced",
      title: "Stretch assignment",
      message: "Strong overall performance. Use Speed Round for shift-prep or cross-training.",
      action: "Speed Round"
    });
  }

  if (summary.accuracy < 60 && summary.sessions_completed >= 2) {
    recs.push({
      priority: 2.5,
      kind: "foundation",
      title: "Rebuild foundations",
      message: `Overall accuracy is ${summary.accuracy}%. Slow down with Flashcards before timed games.`,
      action: "Beer Flashcards"
    });
  }

  recs.sort((a, b) => a.priority - b.priority);

  const seen = new Set();
  const unique = [];
  for (const rec of recs) {
    const key = rec.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(rec);
  }

  return unique.slice(0, 5);
}

function chatRateOk(ip) {
  const now = Date.now();
  const bucket = chatRateLimit.get(ip) || [];
  const recent = bucket.filter(ts => now - ts < CHAT_WINDOW_MS);
  if (recent.length >= CHAT_LIMIT) return false;
  recent.push(now);
  chatRateLimit.set(ip, recent);
  return true;
}

async function askOpenAI(message, history, context) {
  const messages = [
    { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}` },
    ...history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-8)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
    { role: "user", content: message }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 700
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "AI request failed.");
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty AI response.");
  return reply;
}

app.post("/api/auth/register", (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const setupKey = (req.body.adminKey || "").trim();

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const existingCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  let role = "employee";

  if (setupKey) {
    if (setupKey !== ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: "Invalid admin setup key." });
    }
    role = "admin";
  } else if (existingCount === 0) {
    role = "admin";
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(name, email, password_hash, role);

    const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw err;
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(user) });
});

app.post("/api/progress", authRequired, (req, res) => {
  const activity_type = (req.body.activity_type || "").trim();
  const category = (req.body.category || "beer").trim();
  const score = Number(req.body.score);
  const total = Number(req.body.total);

  if (!activity_type || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: "Invalid progress payload." });
  }

  db.prepare(`
    INSERT INTO progress_sessions (user_id, activity_type, category, score, total)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, activity_type, category, score, total);

  res.json({ ok: true });
});

app.get("/api/progress/me", authRequired, (req, res) => {
  res.json(getUserStats(req.user.id));
});

app.get("/api/admin/employees", authRequired, adminRequired, (req, res) => {
  const employees = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(p.id) AS sessions_completed,
           COALESCE(SUM(p.score), 0) AS total_correct,
           COALESCE(SUM(p.total), 0) AS total_questions,
           MAX(p.completed_at) AS last_activity
    FROM users u
    LEFT JOIN progress_sessions p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all();

  res.json({
    employees: employees.map(row => {
      const base = {
        ...publicUser(row),
        sessions_completed: row.sessions_completed,
        total_correct: row.total_correct,
        total_questions: row.total_questions,
        accuracy: row.total_questions ? Math.round((row.total_correct / row.total_questions) * 100) : 0,
        last_activity: row.last_activity
      };

      if (row.role !== "employee") {
        return { ...base, next_step: null, recommendations: [] };
      }

      const recommendations = getTrainingRecommendations(getUserStats(row.id));
      return {
        ...base,
        next_step: recommendations[0] || null,
        recommendations
      };
    })
  });
});

app.get("/api/admin/employees/:id", authRequired, adminRequired, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Employee not found." });
  const stats = getUserStats(user.id);
  res.json({
    user: publicUser(user),
    stats,
    recommendations: user.role === "employee" ? getTrainingRecommendations(stats) : []
  });
});

app.get("/api/chat/status", (req, res) => {
  res.json({
    enabled: Boolean(OPENAI_API_KEY),
    mode: OPENAI_API_KEY ? "ai" : "local"
  });
});

app.post("/api/chat", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  if (!chatRateOk(ip)) {
    return res.status(429).json({ error: "Too many messages. Please wait a moment." });
  }

  const message = String(req.body.message || "").trim();
  const history = Array.isArray(req.body.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 800) {
    return res.status(400).json({ error: "Message is too long." });
  }

  try {
    let beers = [];
    try {
      beers = await getBeers();
    } catch (fetchErr) {
      console.warn("Beer menu unavailable for chat:", fetchErr.message);
    }

    const context = buildContext(message, beers);

    if (OPENAI_API_KEY) {
      const reply = await askOpenAI(message, history, context);
      return res.json({ reply, mode: "ai" });
    }

    const reply = localAnswer(message, beers);
    return res.json({ reply, mode: "local" });
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({ error: "Could not get an answer right now. Try again in a moment." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MP Training server running at http://localhost:${PORT}`);
});
