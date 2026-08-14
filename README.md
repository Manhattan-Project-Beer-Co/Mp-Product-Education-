# MP Product Education

Front-of-house staff training portal for Manhattan Project Beer Company — tap
list, food, coffee, merch, SOPs, reviews, and training games. A single Express
server (`server.js`) serving one large static page (`index.html`) backed by
SQLite.

Sign-in is Microsoft Entra ID only; there is no password login. Only
`@manhattanproject.beer` accounts can sign in (first login creates a bartender
account). Admins change roles on the Team page.

---

## Where the product information comes from

Seven separate sources, which is the first thing worth knowing before changing
anything.

| Content | Source today | Editable by |
|---|---|---|
| **Beers / tap list** | Nucleus (`nucleus.js` → `/api/beers`) | Managers, on the Taps tab |
| Food, coffee, wine & cocktails | Hardcoded arrays in `index.html` | Developers only |
| Merch, ops inventory | SQLite (`training.db`) | Staff, in the app |
| SOPs | `sops-catalog.js`, synced into SQLite on server start | Developers seed, admins edit |
| Floor ops content | `ops-content.js` (recommenders, scenarios, keg estimates) | Developers only |
| Guest reviews | Google Places + Yelp APIs (optional) | External |
| Staff schedule awareness | 7shifts API (`seven-shifts.js`) | External |

### 1. Beers — Nucleus

Nucleus is MPBC's catalog service and the source of truth for beer. Everything
about a beer — name, style, ABV, tasting notes, guest guidance, gluten-reduced,
and which tap it is pouring from — comes from there.

`nucleus.js` is the only thing that talks to it, and it runs **server-side
only**, for two independent reasons: the bearer key would be a leaked credential
in page JavaScript, and Nucleus's CORS admits only its own frontend origin, so a
browser-direct call is refused anyway. The browser reaches it through
`/api/beers`, `/api/beers/options` and `/api/taps`.

**The rows are shaped like the old spreadsheet** — `"Name"`, `"On Tap"`,
`"Guest Guidance"` and the rest — because index.html's filters, search, games,
cards and chat all read those keys through `col()`. Keeping the shape meant the
cutover changed the data source and almost nothing else.

Two endpoints are joined on product id, not one: `GET /api/taps` embeds only
`ProductMenuRef`, a narrow menu projection that leaves out `guest_guidance` and
`key_ingredients` — the two fields staff lean on hardest — so the catalog is
fetched alongside it.

| Row key | Nucleus |
|---|---|
| `Name`, `Number` | `name`, `mp_number` |
| `Style` | `style` |
| `abv` | `abv` — already resolved, see below |
| `Description / ingredients` | `key_ingredients` |
| `Flavor Profile` | `tasting_notes` |
| `Guest Guidance` | `guest_guidance` |
| `Staff Notes` | `sensory_profile` |
| `Gluten-Reduced` | `is_gluten_reduced` |
| `On Tap`, `Tap` | `Tap.tap_number` |
| `New Tap` | derived from `Tap.tapped_at` |
| `nucleus_product_id` | `id` — the stable identifier |

**Do not build an ABV ladder here.** `abv` arrives resolved by Nucleus's
`services/abv.py` in one priority order — TABC-approved label value, else
calculated from og/fg, else the estimate — and `abv_source` says which rung
answered. The arithmetic is deliberately matched to Gadget's so the two apps
cannot print different numbers for one beer. Nucleus serialises it as a
fixed-scale decimal (`6.2000`), which `formatAbv` trims for display.

Caching lives in `nucleus.js`: 60s for taps, which change when a keg kicks, and
10 minutes for the catalog, which is edited by hand. A tap write clears both.

#### Manhattan Project beer only

Nucleus is a shared catalog — it holds Four Corners' products (prefix `FC`)
alongside MPBC's (`MP`). This is a Manhattan Project app, so it shows MPBC beer
and nothing else: 141 products, not 155.

**The filter lives in `getProducts()`, deliberately.** Every list in the app —
the beer list, both pickers, the favourite-beer quiz's decoys, the chat
assistant — is built from that one call, so a Four Corners beer cannot reach any
of them by someone forgetting a filter at a call site. Add a new list and it
inherits the rule for free.

`brewery` is nullable in Nucleus, and a product whose brewery is unknown is not
known to be ours, so it is excluded too — but logged, because silently hiding an
MPBC beer would be its own kind of wrong. Today every product has a brewery.

One deliberate exception: the **Taps** tab shows whatever is actually pouring,
including a beer the picker would not offer. A tap wall that lied about its own
contents would be worse than one showing an unexpected name, and the row spells
the beer out in full for exactly that case.

#### What this fixed

The sheet and the code had drifted apart, and three features had been quietly
dead for as long as anyone could remember:

- **Tap numbers now appear.** The sheet had no `Tap` column, so the beer card
  and the chat assistant never told staff which tap a beer was on. Nucleus has
  `tap_number`.
- **"New Taps" works again.** It keyed on a `New Tap` column that did not exist
  in the sheet (it was called `Recently Tapped`, and was empty on every row), so
  the filter, the rotation banner, the daily-briefing flag and one War Games
  round were all permanently empty. It is now derived from `tapped_at`.
- **The hardcoded tap overrides are gone.** `BEER_TAP_OVERRIDES` pinned taps 4,
  16 and 17 in *two* files, commented "local tap/menu patches until the
  spreadsheet is updated". The spreadsheet was never updated, so for those taps
  the truth lived in application code. Tap state now has one home.

#### Changing what is pouring

The **Taps** tab — manager-gated, and the only place this app writes to Nucleus.
A change there is a change to the real menu that every MPBC app reads, so it
needs `NUCLEUS_API_KEY_WRITE`; with only a read key the screen loads read-only
and says so. Clearing a tap is a `DELETE`, because Nucleus keeps the fixture and
empties the pour — a tap pouring nothing is `current_product_id IS NULL`, never
a deleted row.

#### Beers are referenced by id, never by name

Two tables point at a beer: `beer_checkins` (a staff tasting note) and
`users.favorite_beer`. Both now carry a Nucleus product id alongside the text.

The id is what a beer *is*; the name beside it is a display label. Names get
corrected — the taproom list called `MP0142` by its number long enough to reach
the database that way, while Nucleus knows it as **Easy Run** — and `(mp_number,
variant)` is no better, since a variant can be renumbered.

Both id columns are **nullable, deliberately**. `favorite_beer` used to be a
free-text box, so some stored values are not beers at all ("Still deciding" is a
real one) and will never resolve. Unresolved rows keep their text and are shown
as they are: a tasting note is the person's own, and deleting it to satisfy a
schema is the wrong trade.

`UNIQUE(user_id, beer_name)` is left in place and the id index is **not**
unique. Two spellings can resolve to one product — "Scotch ale" and "Scotch
Ale", or "MP0142" and "Easy Run" — so a unique index would make a backfill
either fail or silently merge two of someone's notes.

Both inputs are now pickers backed by the catalog, so no new unresolved rows are
created. The favourite-beer dropdown offers **inactive beers too**, because a
favourite is very often one we no longer brew.

To resolve what is already stored:

```bash
node scripts/backfill-beer-uuids.js            # report only
node scripts/backfill-beer-uuids.js --apply    # write the ids
```

It reports by default. Run it dry against a copy of the production database
first — the output is the list of values the catalog cannot account for, which
is exactly what a human needs to look at before anything is written. Names a
person can identify go in the script's `ALIASES` map; the rest stay unresolved.


### 2. Food, coffee, wine and cocktails — hardcoded

`FOOD_CSV_URL` in `index.html` is still the literal placeholder
`"PASTE_YOUR_FOOD_CSV_LINK_HERE"`, so that fetch never runs and the app falls
back to the `FOOD_MENU` array. Same for `WEEKLY_SPECIALS`, `COFFEE_BEANS`,
`COFFEE_MENU_DRINKS`, `BAR_MENU_DRINKS`, `SEASONAL_LATTES`, and the coffee
training content (`COFFEE_SECTIONS`, `COFFEE_QUIZ`, `COFFEE_FLASHCARDS`).
Changing any of that menu content is a code edit and a redeploy.

### 3. Merch, SOPs, ops inventory — SQLite

`training.db` via `better-sqlite3`, at `DB_PATH`. Seeded by `seed.js`
(`npm run seed`); the merch catalog starts from `merch-catalog.js` and the ops
counting side from `data/mp-inventory-seed.json` via `mp-inventory-api.js`.
Staff edit these in the app.

SOPs are a hybrid: `sops-catalog.js` holds the canonical set and syncs into
`sop_documents` **by title on every server start**, so redeploying republishes
the catalog copy. Admins can still edit procedures in the app, but an edit to a
title that also exists in the catalog is liable to be overwritten on the next
boot — change `sops-catalog.js` for anything that should stick.

### 4. Reviews — Google Places and Yelp

`reviews.js`, keyed off `GOOGLE_PLACES_API_KEY` / `YELP_API_KEY`. Falls back to
sample reviews when unset.

### 5. Staff schedule — 7shifts

`seven-shifts.js` and `seven-shifts-sync.js`. Schedule *awareness* only — there
is no schedule UI here. Auth is a company Access Token from 7shifts Company
Settings → Developer Tools; their OAuth clients are restricted to vetted
partners, so the token is the supported path.

---


## Talking to Nucleus

**API reference: <https://nucleus.manhattanproject.beer/docs>** (Swagger UI; raw
spec at `/openapi.json`). Open it in a browser and it signs you in through Azure
AD — any MPBC account works, no key needed. Called programmatically it answers
`401` instead, which is expected rather than a broken link: send
`Authorization: Bearer <NUCLEUS_API_KEY>`. Treat it as authoritative over
anything written down here.

### Configuration

| Variable | |
|---|---|
| `NUCLEUS_BASE_URL` | where Nucleus is |
| `NUCLEUS_API_KEY` | read key → `staff`. Enough for the beer list and pickers. |
| `NUCLEUS_API_KEY_WRITE` | write key → `manager`. Only needed to change taps. |

The base URL has three correct values, and picking the wrong one is the easiest
mistake to make here:

- **Deployed on Railway** — `http://mpbc-nucleus.railway.internal`. Nucleus's own
  CLAUDE.md is explicit that internal service calls must not use the public URL.
- **Locally, reading real data** — `https://nucleus.manhattanproject.beer` with a
  read key. Fine, and enough for everything except the Taps screen.
- **Locally, testing writes** — a local Nucleus (`http://localhost:<devN port>`)
  with that environment's own keys.

**Never put a production write key in a local `.env`.** It would work, and every
tap you changed while clicking around would rewrite the real taproom wall that
every MPBC app reads. This is the same shape as the QuickBooks trap in the root
CLAUDE.md, except nothing here would stop it. A local Nucleus already has the
same taps seeded, so there is no reason to reach for prod.

### Endpoints this app uses

| Endpoint | Role | |
|---|---|---|
| `GET /api/products?include_inactive=true` | staff | the catalog, behind the pickers |
| `GET /api/taps` | staff | tap fixtures with `current_product` embedded |
| `PUT /api/taps/{id}/product` | **manager** | put a beer on a tap |
| `DELETE /api/taps/{id}/product` | **manager** | clear a tap (keg kicked) |

Failures surface as `502` from this app's own routes rather than `500` — the app
is fine, its upstream is not, and the distinction tells whoever is looking where
to go. `401`/`403` from Nucleus are named explicitly in the message, because a
rejected key otherwise looks identical to "no data".


## Local development

Node 20+ (see `.nvmrc`).

```bash
npm install
cp .env.example .env   # then fill it in — the comments explain each value
node server.js         # once, to create the schema — then Ctrl-C
npm run seed           # accounts, merch, SOPs, inventory
npm run dev:local      # http://localhost:8080, signing in without Entra
```

**The bare `node server.js` step is not optional on a fresh clone.** `server.js`
creates the tables; `seed.js` assumes they already exist, so running `npm run
seed` first fails with `SqliteError: no such table: users`. Boot the server once,
stop it, then seed.

**Node 20 specifically** — `.nvmrc`, CI and the deploy all pin it, and on Windows
this is a hard requirement rather than a preference: `better-sqlite3` publishes
no prebuilt binary for Node 24, and building from source fails because current
node-gyp targets a VS toolset that Build Tools 2026 does not ship. Node 20 gets a
prebuild and needs no compiler. `fnm` reads `.nvmrc` and switches automatically.

`npm run dev:local` sets `DEV_LOGIN=1` for one run, which lets you sign in as any
account already in your local database by picking it from a list — so you do not
need working Entra credentials to develop. It is refused three ways (the server
exits rather than boot with it in production, the endpoints leave the route set
when it is off, and requests must arrive on loopback), but only ever set it in
your own `.env`. `npm run dev` is the plain Entra path.

`.env.example` is the setup guide; read it rather than guessing. The essentials:
`JWT_SECRET` must not be left at its default (the server refuses to boot in
production if it is), `AZURE_TENANT_ID` must be your tenant GUID rather than
`organizations`, and `AZURE_ADMIN_EMAILS` bootstraps admins in a way that
survives a database reset. 7shifts needs `SEVEN_SHIFTS_ACCESS_TOKEN` plus the
location and department ids, both readable off your 7shifts schedule URL.

### Checks

```bash
npm run check        # encoding + syntax
npm run check:boot   # boots the real server against a throwaway database
npm run backup       # take a snapshot now
```

CI runs all of these on every PR, cheap checks first. All three exist because
their failure mode shipped at least once — the scripts' header comments record
what happened, and are worth reading before you decide a check is fussy:

- `check-encoding.js` — a CP1252 em-dash in `server.js` broke the Nixpacks
  build, and `node --check` missed it because the bytes sat inside a comment.
- `check-syntax.js` — `index.html` carries one ~6,300-line inline script, so a
  parse error anywhere in it means the browser runs *none* of it: every button
  dead, while the server still returns 200.
- `check-boot.js` — catches what parsing cannot (load-time throws, queries
  against columns that do not exist, schema statements that only fail on a fresh
  database), and asserts the production secret guard actually refuses the
  default `JWT_SECRET`.

`check-boot.js` starts each server from an empty scratch directory rather than
the repo, so the child never reads your `.env` and a local run behaves exactly
like CI. That isolation is load-bearing, not tidiness: `server.js` calls
`dotenv.config()`, which resolves `.env` against the working directory, so
without it a developer's `.env` put back the very variables the checks remove to
force the production guards to fire — and the guard checks reported failure
locally while passing vacuously in CI, where no `.env` exists.

### Conventions

Work on `feat/…` or `fix/…` branches and merge to `main` by PR. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full team workflow (branch names,
checks, squash merge, what to do when CI is red).

---

## Deployment

**Railway is the live deployment.** Build is Nixpacks, start is `npm start`,
config in `railway.json`.

The critical setting is `DB_PATH`: container filesystems are ephemeral, so it
must point at a mounted volume (`/data/training.db` on a volume mounted at
`/data`) or every deploy and restart wipes the database. On Railway the server
**refuses to start** if `RAILWAY_ENVIRONMENT` is set and `DB_PATH` is missing.
Backups default to a `backups` directory beside the database — which means the
same volume, so they cover a bad write or a mistaken delete but **not** losing
the volume itself. Copying snapshots off-box (Drive/Dropbox) is still required
for disaster recovery.

Two other things in the repo are not the live deployment:

- **`render.yaml` is historical.** The app used to run on Render. The file also
  declares `ADMIN_SETUP_KEY`, `MERCH_SETUP_KEY` and `SHIFT_LEAD_SETUP_KEY`,
  which no longer appear anywhere in the source — leftovers from the password
  auth that Entra-only sign-in replaced.
- **`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on every push
  to `main`**, copying only `index.html`. That produces a serverless, auth-less
  build that still reads the beer sheet directly but has no login, no SQLite,
  and no merch, SOP or inventory features.
