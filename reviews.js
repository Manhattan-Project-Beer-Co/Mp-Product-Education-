const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const GOOGLE_PLACE_ID = process.env.GOOGLE_PLACE_ID || "";
const YELP_API_KEY = process.env.YELP_API_KEY || "";
const YELP_BUSINESS_ID = process.env.YELP_BUSINESS_ID || "manhattan-project-beer-company-dallas";

const POSITIVE_HINTS = [
  "amazing", "great", "excellent", "love", "best", "friendly", "delicious", "attentive",
  "professional", "cozy", "outstanding", "fantastic", "perfect", "incredible", "wonderful",
  "memorable", "recommend", "favorite", "superb", "awesome", "helpful", "beautiful"
];

const NEGATIVE_HINTS = [
  "slow", "rude", "cold", "wait", "disappoint", "bad", "worst", "overpriced", "noisy",
  "dirty", "missing", "wrong", "long wait", "unfriendly", "underwhelming", "bland", "stale"
];

function normalizeReviewDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function buildLocalSummary(reviews) {
  const positives = [];
  const negatives = [];
  const positiveCounts = new Map();
  const negativeCounts = new Map();

  reviews.forEach(review => {
    const text = String(review.text || "").toLowerCase();
    const rating = Number(review.rating) || 0;

    POSITIVE_HINTS.forEach(term => {
      if (text.includes(term)) {
        positiveCounts.set(term, (positiveCounts.get(term) || 0) + 1);
      }
    });
    NEGATIVE_HINTS.forEach(term => {
      if (text.includes(term)) {
        negativeCounts.set(term, (negativeCounts.get(term) || 0) + 1);
      }
    });

    if (rating >= 4 || text.includes("recommend")) {
      if (text.includes("fried chicken") || text.includes("chicken")) {
        positiveCounts.set("fried chicken", (positiveCounts.get("fried chicken") || 0) + 1);
      }
      if (text.includes("beer") || text.includes("brew")) {
        positiveCounts.set("craft beer", (positiveCounts.get("craft beer") || 0) + 1);
      }
      if (text.includes("staff") || text.includes("service") || text.includes("bar")) {
        positiveCounts.set("staff & service", (positiveCounts.get("staff & service") || 0) + 1);
      }
      if (text.includes("arepa")) {
        positiveCounts.set("arepas", (positiveCounts.get("arepas") || 0) + 1);
      }
      if (text.includes("patio") || text.includes("ambiance") || text.includes("vibe")) {
        positiveCounts.set("ambiance & patio", (positiveCounts.get("ambiance & patio") || 0) + 1);
      }
    }

    if (rating > 0 && rating <= 3) {
      negatives.push(review.text.slice(0, 160));
    }
  });

  [...positiveCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .forEach(([theme, count]) => {
      positives.push(`${theme.charAt(0).toUpperCase()}${theme.slice(1)} — mentioned in ${count} recent review${count === 1 ? "" : "s"}`);
    });

  [...negativeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .forEach(([theme, count]) => {
      negatives.push(`${theme.charAt(0).toUpperCase()}${theme.slice(1)} — flagged in ${count} review${count === 1 ? "" : "s"}`);
    });

  const avg = reviews.length
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.filter(r => r.rating).length
    : 0;

  const overallTone = reviews.length
    ? avg >= 4.3
      ? "Recent feedback is strongly positive — guests are happy with beer, food, and hospitality."
      : avg >= 3.8
        ? "Recent feedback is mostly positive with a few areas to watch."
        : "Recent feedback is mixed — review negatives below with the shift lead."
    : "No recent reviews cached yet.";

  if (!positives.length && reviews.length) {
    positives.push("Guests generally leave high ratings across recent reviews.");
  }

  return {
    positives: positives.slice(0, 6),
    negatives: [...new Set(negatives)].slice(0, 5),
    overallTone,
    mode: "local"
  };
}

async function buildAISummary(reviews) {
  if (!OPENAI_API_KEY || !reviews.length) {
    return buildLocalSummary(reviews);
  }

  const payload = reviews.slice(0, 20).map(review => ({
    source: review.source_id,
    rating: review.rating,
    text: String(review.text || "").slice(0, 500)
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: "You summarize customer reviews for restaurant staff training. Respond with valid JSON only: {\"positives\": string[], \"negatives\": string[], \"overallTone\": string}. Keep each bullet short and actionable for floor staff. Max 5 positives and 4 negatives."
        },
        {
          role: "user",
          content: `Summarize themes from these Manhattan Project Beer Co. reviews:\n${JSON.stringify(payload)}`
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "AI summary failed.");
  }

  const raw = data.choices?.[0]?.message?.content?.trim() || "";
  const jsonText = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(jsonText);

  return {
    positives: Array.isArray(parsed.positives) ? parsed.positives.slice(0, 6) : [],
    negatives: Array.isArray(parsed.negatives) ? parsed.negatives.slice(0, 5) : [],
    overallTone: String(parsed.overallTone || "").trim() || buildLocalSummary(reviews).overallTone,
    mode: "ai"
  };
}

async function fetchGoogleReviews() {
  if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) return { reviews: [], rating: null, reviewCount: null };

  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(GOOGLE_PLACE_ID)}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews"
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Google Places request failed.");
  }

  const reviews = (data.reviews || []).map((review, index) => ({
    source_id: "google",
    external_id: review.publishTime || `google-${index}`,
    author: review.authorAttribution?.displayName || "Google user",
    rating: review.rating || null,
    text: review.text?.text || review.originalText?.text || "",
    review_date: normalizeReviewDate(review.publishTime)
  }));

  return {
    reviews,
    rating: data.rating ?? null,
    reviewCount: data.userRatingCount ?? null
  };
}

async function fetchYelpReviews() {
  if (!YELP_API_KEY) return { reviews: [], rating: null, reviewCount: null };

  const [reviewsRes, businessRes] = await Promise.all([
    fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(YELP_BUSINESS_ID)}/reviews`, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` }
    }),
    fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(YELP_BUSINESS_ID)}`, {
      headers: { Authorization: `Bearer ${YELP_API_KEY}` }
    })
  ]);

  const reviewsData = await reviewsRes.json();
  const businessData = await businessRes.json();

  if (!reviewsRes.ok) {
    throw new Error(reviewsData.error?.description || "Yelp reviews request failed.");
  }

  const reviews = (reviewsData.reviews || []).map(review => ({
    source_id: "yelp",
    external_id: review.id,
    author: review.user?.name || "Yelp user",
    rating: review.rating || null,
    text: review.text || "",
    review_date: normalizeReviewDate(review.time_created)
  }));

  return {
    reviews,
    rating: businessRes.ok ? businessData.rating ?? null : null,
    reviewCount: businessRes.ok ? businessData.review_count ?? null : null
  };
}

function getLiveSyncStatus() {
  return {
    google: Boolean(GOOGLE_PLACES_API_KEY && GOOGLE_PLACE_ID),
    yelp: Boolean(YELP_API_KEY),
    aiSummary: Boolean(OPENAI_API_KEY)
  };
}

module.exports = {
  buildLocalSummary,
  buildAISummary,
  fetchGoogleReviews,
  fetchYelpReviews,
  getLiveSyncStatus,
  normalizeReviewDate
};
