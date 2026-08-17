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
 * `"Flavor Profile"` and friends. That is deliberate: index.html's filters,
 * search, games, cards and chat all read those keys through `col()`, so keeping
 * the shape means the cutover touches the data source and nothing else.
 */

const BASE_URL = (process.env.NUCLEUS_BASE_URL || "").replace(/\/$/, "");
//: The PATRON keys, deliberately — not `NUCLEUS_API_KEY`/`NUCLEUS_API_KEY_WRITE`.
//: Those resolve to `staff`/`manager` in Nucleus and can read the whole catalog,
//: including `sensory_profile`, which is QC's tasting record and has no business
//: on a taproom screen. A patron key sits below `readonly` and is refused by
//: every endpoint outside `/api/patron/*`; the write key adds one scope,
//: `taps:pour`, and can do nothing else. So the restriction is Nucleus's to
//: enforce rather than this app's to remember.
const API_KEY = process.env.NUCLEUS_API_KEY_PATRON || "";
const API_KEY_WRITE = process.env.NUCLEUS_API_KEY_PATRON_WRITE || "";

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
        ? "NUCLEUS_API_KEY_PATRON_WRITE is not set — this app can read Nucleus but not write to it."
        : "NUCLEUS_API_KEY_PATRON is not set — cannot reach Nucleus."
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
          ? "the API key lacks the required role or scope (writes need NUCLEUS_API_KEY_PATRON_WRITE)"
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

/**
 * The tap fixtures, with the embedded product's ABV made display-ready.
 *
 * Nucleus serialises ABV at the column's full scale (`6.2000`), which is correct
 * for a number and wrong for a menu. `/api/beers` already trimmed it; doing it
 * here too means the Taps screen and the beer list cannot disagree about the
 * same beer, which is the whole reason the formatter is shared rather than
 * reimplemented per view.
 */
const getTaps = () =>
  cached("taps", TAPS_TTL_MS, async () => {
    const taps = await request("/api/patron/taps");
    return taps.map((tap) =>
      tap.current_product
        ? { ...tap, current_product: { ...tap.current_product, abv: formatDecimal(tap.current_product.abv) } }
        : tap
    );
  });

//: Nucleus is a shared catalog: it holds Four Corners' products alongside
//: MPBC's, keyed by the brewery's prefix. This is a Manhattan Project app, so
//: it shows Manhattan Project beer and nothing else.
const BREWERY_PREFIX = "MP";

/**
 * Our brewery's id, resolved from its prefix.
 *
 * Looked up rather than hardcoded. The id happens to be identical in every
 * environment because it is seeded, but a UUID written into this app would be a
 * silent dependency on that staying true — and the prefix is the thing we
 * actually mean.
 */
const getBreweryId = () =>
  cached("brewery-id", CATALOG_TTL_MS, async () => {
    const breweries = await request("/api/patron/breweries");
    const ours = breweries.find((brewery) => brewery.prefix === BREWERY_PREFIX);
    if (!ours) {
      // Loudly, not quietly: falling back to the unfiltered catalog here would
      // put Four Corners beer on a Manhattan Project menu, which is exactly the
      // thing this lookup exists to prevent.
      throw new NucleusError(`No brewery with prefix ${BREWERY_PREFIX} in Nucleus.`);
    }
    return ours.id;
  });

/**
 * The MPBC catalog, inactive beers included.
 *
 * Inactive matters: a favourite beer is very often a discontinued one, and the
 * pickers must be able to offer it. The tap list is unaffected either way.
 *
 * **Nucleus does the filtering**, via `brewery_id` — it is a shared catalog and
 * also holds Four Corners' products, which have no place in a Manhattan Project
 * app. Asking for what we want beats fetching everything and discarding some of
 * it, and it settles the nullable-`brewery` case server-side.
 *
 * **The call site is the chokepoint on purpose.** Every list in the app — the
 * beer list, both pickers, the quiz's decoys, the chat assistant — is built from
 * this one function, so another brewery's beer cannot reach a list by someone
 * forgetting to filter, and a list added later inherits the rule for free.
 */
async function getProducts() {
  return cached("products", CATALOG_TTL_MS, async () => {
    const breweryId = await getBreweryId();
    const products = await request(
      `/api/patron/products?include_inactive=true&brewery_id=${encodeURIComponent(breweryId)}`
    );

    // Defence in depth, and cheap. If the server-side filter ever stops doing
    // what this depends on, the failure should be a log line rather than another
    // brewery's beer quietly appearing on the menu.
    const ours = products.filter(
      (product) => product.brewery && product.brewery.prefix === BREWERY_PREFIX
    );
    if (ours.length !== products.length) {
      console.warn(
        `Nucleus: brewery_id returned ${products.length - ours.length} product(s) that are not ` +
          `${BREWERY_PREFIX} — dropped locally.`
      );
    }
    return ours;
  });
}

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
 * Nucleus serialises its numbers as fixed-scale decimals — `6.2000`, `33.0000` —
 * which a display would print verbatim as "6.2000%" or "IBU 33.0000". Trim to
 * the significant part: 6.2000 -> "6.2", 7.3500 -> "7.35", 11.0000 -> "11".
 *
 * Named for the shape rather than the field: ABV and IBU arrive the same way and
 * are trimmed the same way, and calling it `formatAbv` while passing it an IBU
 * reads like a bug at every call site.
 */
function formatDecimal(value) {
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
 * omits `key_ingredients` and `history_note`. Hence the join in `getBeerRows`.
 */
function toBeerRow(product, tap, bulkStamps = new Set()) {
  const tapNumber = tap ? String(tap.tap_number) : "";
  // A tap counts as new only if its timestamp records an actual keg change.
  // Rows written in one transaction share `now()` to the microsecond, so the
  // seed that first wrote the wall down stamped all 21 taps identically — which
  // would otherwise announce every beer in the taproom as newly tapped for a
  // fortnight. A timestamp several taps share is an import, not a pour.
  const tappedAt = tap && !bulkStamps.has(tap.tapped_at) ? tap.tapped_at : null;

  const ingredients = text(product.key_ingredients);
  const marketing = text(product.marketing_description);
  const history = text(product.history_note);
  // Both projections resolve IBU from the same default-scope target through
  // Nucleus's `services/menu.py`, so they cannot disagree and the order is
  // arbitrary — the product is read first only because every beer has one and
  // only the pouring ones have a tap.
  //
  // This used to read `product.ibu ?? product.ibu_target`, neither of which
  // exists on the internal `ProductOut`: IBU has no product column, so those
  // were always `undefined` and IBU appeared only on beers currently pouring.
  // The patron catalog serves it, so it now resolves for the whole catalog.
  const ibuRaw = product.ibu ?? tap?.current_product?.ibu ?? "";

  return {
    Name: text(product.name),
    Number: text(product.mp_number),
    Style: text(product.style),
    // Left lowercase to match the sheet's header. getABVText/getABVNumber accept
    // either case; this keeps the one the app already reads first.
    abv: formatDecimal(product.abv),
    // Prefer ingredients; fall back to marketing copy so cards are not blank
    // when Nucleus has a description but no key_ingredients yet.
    "Description / ingredients": ingredients || marketing,
    "Marketing Description": marketing,
    "Flavor Profile": text(product.tasting_notes),
    //: There was a `"Guest Guidance"` key here, from Nucleus's `guest_guidance` —
    //: one comparative line to place a beer for a guest. Nucleus dropped the field
    //: (migration 0114): three descriptions of a beer were enough, and a fourth
    //: only this app read went stale differently from the other three. The Guest
    //: Match game that ran on it now runs on `"Flavor Profile"`.
    // Was `sensory_profile || history_note`. `sensory_profile` is QC's
    // structured tasting record and is not on the patron catalog at all — it
    // was never staff-facing content, it was internal data that happened to be
    // reachable. The history note is what remains, and it is the only thing this
    // section ever should have shown.
    "Staff Notes": history,
    IBU: formatDecimal(ibuRaw),
    "Gluten-Reduced": product.is_gluten_reduced ? "Yes" : "No",
    // `isOnTap()` tests that this starts with "yes" and `getTapNumber()` pulls the
    // first digits out of it, so the sheet's exact "Yes- Tap 4" form is preserved.
    "On Tap": tap ? `Yes- Tap ${tapNumber}` : "",
    // Read directly by the beer card and the chat formatter, which previously
    // found nothing because the sheet had no such column.
    Tap: tapNumber,
    "New Tap": isRecent(tappedAt, NEW_TAP_DAYS) ? "Yes" : "",
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

  // Timestamps that several taps share were written in one transaction — a
  // bulk import rather than that many kegs changing in the same microsecond.
  const stampCounts = new Map();
  for (const tap of taps) {
    if (tap.tapped_at) stampCounts.set(tap.tapped_at, (stampCounts.get(tap.tapped_at) || 0) + 1);
  }
  const bulkStamps = new Set(
    [...stampCounts.entries()].filter(([, count]) => count >= 3).map(([stamp]) => stamp)
  );

  const rows = products.map((product) =>
    toBeerRow(product, tapByProduct.get(product.id) || null, bulkStamps)
  );
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
