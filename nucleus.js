/**
 * Nucleus client — product and tap data, server-side only.
 *
 * Nucleus is MPBC's catalog service and the source of truth for beer. This app
 * used to read a Google Sheet published to the web; it now reads Nucleus, and
 * this module is the only place that talks to it.
 *
 * **Server-side only, for two independent reasons.** The bearer key would be a
 * leaked credential in browser JavaScript, and Nucleus's CORS admits only its
 * own frontend origin, so a browser-direct call is refused regardless. The
 * browser reaches this through the proxy routes in server.js.
 *
 * The adapter below emits rows in the *sheet's* shape — `"Name"`, `"On Tap"`,
 * `"Guest Guidance"` and friends. That is deliberate: index.html's filters,
 * search, games, cards and chat all read those keys through `col()`, so keeping
 * the shape means the cutover touches the data source and nothing else.
 */

const BASE_URL = (process.env.NUCLEUS_BASE_URL || "").replace(/\/$/, "");
const API_KEY = process.env.NUCLEUS_API_KEY || "";
const API_KEY_WRITE = process.env.NUCLEUS_API_KEY_WRITE || "";

const REQUEST_TIMEOUT_MS = Number(process.env.NUCLEUS_TIMEOUT_MS || 15000);

// The tap list changes when a keg kicks, so it is cached briefly. The catalog
// is edited by hand in Nucleus and changes rarely, so it is cached for longer —
// it is also the bigger response, and it backs the beer pickers, which are hit
// on every page that lets someone name a beer.
const TAPS_TTL_MS = 60_000;
const CATALOG_TTL_MS = 10 * 60_000;

//: A tap counts as "new" for this long after it was tapped. The sheet had a
//: New Tap column nobody ever filled in, so the feature had been dead for as
//: long as anyone could remember; `tapped_at` makes it derivable instead.
const NEW_TAP_DAYS = 14;

const configured = () => Boolean(BASE_URL && API_KEY);
const canWrite = () => Boolean(BASE_URL && API_KEY_WRITE);

class NucleusError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "NucleusError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body = null, write = false } = {}) {
  if (!BASE_URL) {
    throw new NucleusError("NUCLEUS_BASE_URL is not set — cannot reach Nucleus.");
  }
  const key = write ? API_KEY_WRITE : API_KEY;
  if (!key) {
    throw new NucleusError(
      write
        ? "NUCLEUS_API_KEY_WRITE is not set — this app can read Nucleus but not write to it."
        : "NUCLEUS_API_KEY is not set — cannot reach Nucleus."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new NucleusError(`Nucleus did not respond within ${REQUEST_TIMEOUT_MS}ms.`);
    }
    throw new NucleusError(`Could not reach Nucleus: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // 401/403 are the ones worth naming: they mean the key is wrong or lacks the
    // role, which looks identical to "no data" if it is swallowed.
    const detail =
      response.status === 401
        ? "the API key was rejected"
        : response.status === 403
          ? "the API key lacks the required role (writes need NUCLEUS_API_KEY_WRITE)"
          : `HTTP ${response.status}`;
    throw new NucleusError(`Nucleus ${method} ${path} failed — ${detail}.`, response.status);
  }

  return response.json();
}

const cache = new Map();

async function cached(key, ttlMs, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await load();
  cache.set(key, { value, at: Date.now() });
  return value;
}

/** Forget everything cached — called after a write so the next read is fresh. */
function invalidate() {
  cache.clear();
}

const getTaps = () => cached("taps", TAPS_TTL_MS, () => request("/api/taps"));

/**
 * The whole catalog, inactive beers included.
 *
 * Inactive matters: a favourite beer is very often a discontinued one, and the
 * pickers must be able to offer it. The tap list is unaffected either way.
 */
const getProducts = () =>
  cached("products", CATALOG_TTL_MS, () => request("/api/products?include_inactive=true"));

/** Put a product on a tap. Needs the write key (Nucleus requires `manager`). */
async function setTapProduct(tapId, productId) {
  const tap = await request(`/api/taps/${tapId}/product`, {
    method: "PUT",
    body: { product_id: productId },
    write: true
  });
  invalidate();
  return tap;
}

/** Clear a tap — the keg kicked. Needs the write key. */
async function clearTap(tapId) {
  const tap = await request(`/api/taps/${tapId}/product`, { method: "DELETE", write: true });
  invalidate();
  return tap;
}

function isRecent(timestamp, days) {
  if (!timestamp) return false;
  const when = Date.parse(timestamp);
  return Number.isFinite(when) && Date.now() - when < days * 24 * 60 * 60 * 1000;
}

function text(value) {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Nucleus serialises ABV as a fixed-scale decimal — `6.2000`, `11.0000` — which
 * the display would print verbatim as "6.2000%". Trim to the significant part:
 * 6.2000 -> "6.2", 7.3500 -> "7.35", 11.0000 -> "11".
 */
function formatAbv(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return text(value);
  return String(Number(number.toFixed(2)));
}

/**
 * One beer row, in the shape index.html reads.
 *
 * `product` is the full ProductOut; `tap` is the TapOut it is pouring from, or
 * null for a catalog beer that is not currently on. Both are needed because
 * Nucleus's TapOut embeds only `ProductMenuRef`, a narrow menu projection that
 * omits `guest_guidance` and `key_ingredients` — the two fields staff lean on
 * hardest. Hence the join in `getBeerRows`.
 */
function toBeerRow(product, tap) {
  const tapNumber = tap ? String(tap.tap_number) : "";
  return {
    Name: text(product.name),
    Number: text(product.mp_number),
    Style: text(product.style),
    // Left lowercase to match the sheet's header. getABVText/getABVNumber accept
    // either case; this keeps the one the app already reads first.
    abv: formatAbv(product.abv),
    "Description / ingredients": text(product.key_ingredients),
    "Flavor Profile": text(product.tasting_notes),
    "Guest Guidance": text(product.guest_guidance),
    "Staff Notes": text(product.sensory_profile),
    "Gluten-Reduced": product.is_gluten_reduced ? "Yes" : "No",
    // `isOnTap()` tests that this starts with "yes" and `getTapNumber()` pulls the
    // first digits out of it, so the sheet's exact "Yes- Tap 4" form is preserved.
    "On Tap": tap ? `Yes- Tap ${tapNumber}` : "",
    // Read directly by the beer card and the chat formatter, which previously
    // found nothing because the sheet had no such column.
    Tap: tapNumber,
    "New Tap": isRecent(tap && tap.tapped_at, NEW_TAP_DAYS) ? "Yes" : "",
    //: The stable identifier. Everything this app stores about a beer keys on
    //: this, never on the name — names get corrected.
    nucleus_product_id: text(product.id),
    //: "approved" | "calculated" | "estimated" | "none" — which rung answered.
    //: Nucleus resolves the ABV; a display that must qualify an unapproved
    //: figure reads this rather than re-deriving it.
    abv_source: text(product.abv_source)
  };
}

/**
 * Every beer, pouring first.
 *
 * One fetch of each endpoint, joined on product id. Taps whose product is
 * missing from the catalog are dropped rather than rendered nameless.
 */
async function getBeerRows() {
  const [taps, products] = await Promise.all([getTaps(), getProducts()]);

  const tapByProduct = new Map();
  for (const tap of taps) {
    if (tap.current_product_id) tapByProduct.set(tap.current_product_id, tap);
  }

  const rows = products.map((product) => toBeerRow(product, tapByProduct.get(product.id) || null));
  rows.sort((a, b) => {
    const aTap = Number(a.Tap || 0);
    const bTap = Number(b.Tap || 0);
    if (aTap && bTap) return aTap - bTap;
    if (aTap) return -1;
    if (bTap) return 1;
    return a.Name.localeCompare(b.Name);
  });
  return rows;
}

/** The catalog as picker options — every beer, name and id, alphabetical. */
async function getPickerOptions() {
  const products = await getProducts();
  return products
    .map((product) => ({
      id: product.id,
      name: product.name,
      style: text(product.style),
      mp_number: text(product.mp_number)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  NucleusError,
  configured,
  canWrite,
  invalidate,
  getTaps,
  getProducts,
  getBeerRows,
  getPickerOptions,
  setTapProduct,
  clearTap,
  toBeerRow,
  NEW_TAP_DAYS
};
