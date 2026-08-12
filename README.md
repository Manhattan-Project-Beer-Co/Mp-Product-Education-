# MP Product Education

Front-of-house staff training portal for Manhattan Project Beer Company — tap
list, food, coffee, merch, SOPs, reviews, and training games. A single Express
server (`server.js`) serving one large static page (`index.html`) backed by
SQLite.

Sign-in is Microsoft Entra ID only; there is no password login. Anyone in the
tenant can sign in and is created as an Employee on first login, and admins
change roles on the Team page.

---

## Where the product information comes from

Four separate sources, which is the first thing worth knowing before changing
anything.

| Content | Source today | Editable by |
|---|---|---|
| **Beers / tap list** | Published Google Sheet (CSV) — **moving to Nucleus** | Whoever holds the sheet |
| Food, coffee, wine & cocktails | Hardcoded arrays in `index.html` | Developers only |
| Merch, ops inventory | SQLite (`training.db`) | Staff, in the app |
| SOPs | `sops-catalog.js`, synced into SQLite on server start | Developers seed, admins edit |
| Floor ops content | `ops-content.js` (recommenders, scenarios, keg estimates) | Developers only |
| Guest reviews | Google Places + Yelp APIs (optional) | External |
| Staff schedule awareness | 7shifts API (`seven-shifts.js`) | External |

### 1. Beers — a published Google Sheet

Still the live beer feed today, and the one moving to Nucleus. The URL is
hardcoded in two places that must be kept in step — `index.html`
(`BEER_CSV_URL`) and `chat-knowledge.js`:

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vRfvDNoqxHQCc7PBCm-xetbdDiAfyfi3ECVbnRAfoCYJmdfSxFuamdGJ6THg97ErXp3hFCLG1IBcZsH/pub?gid=0&single=true&output=csv
```

The browser fetches it on load (`loadData()`); the server fetches the same CSV
for the training-assistant chat, cached 5 minutes (`chat-knowledge.js`,
`getBeers()`). It is published-to-web, so it is read anonymously with no API key
— anyone with the link can read it. That `/pub?…` link is a publish snapshot and
its `2PACX-…` id is a publish token, **not** the document id, so the editable
sheet cannot be reached from it; find the source sheet in Drive.

Columns: `Number`, `Name`, `Style`, `abv`, `Description / ingredients`,
`Food Pairings`, `Gluten-Reduced`, `Flavor Profile`, `Guest Guidance`, `On Tap`,
`Recently Tapped`. Roughly 127 beer rows, of which ~21 carry `On Tap` (format
`"Yes- Tap 1"`); the rest are the off-tap archive behind "All Beers".

`parseCSV` trims header names, so the trailing spaces several headers carry in
the sheet do not matter.

**Known column mismatches** between the sheet and the code — all currently live:

- **`New Tap` does not exist in the sheet.** The sheet calls it
  `Recently Tapped`, *and* that column is empty on every row. So
  `isYes(item["New Tap"])` is permanently false, silently disabling four
  features: the "New Taps" filter button, the new-tap rotation banner, the
  daily-briefing new-tap flag, and the War Games round whose pool is new taps.
  Fixing it needs both a rename and someone actually flagging rows.
- **`Tap` / `Tap Number` do not exist**, so the beer-card and chat formatter
  (`index.html`, `chat-knowledge.js`) show no tap number — even though the tap
  is right there in `On Tap`, and `getTapNumber()` parses it correctly
  elsewhere. This is the one that costs floor staff the most.
- **`Staff Notes` / `Training Notes` do not exist**, so that accessor always
  returns empty.
- **`Food Pairings` is maintained in the sheet but read nowhere** in the app.

Nucleus (below) resolves the first three by construction, so it may not be worth
patching the sheet path.

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

## Product data is moving to Nucleus

**Going forward, beer and product information lives in Nucleus, not the Google
Sheet.** Nucleus is MPBC's brewery system of record; its catalog was seeded from
the same legacy product list the sheet came from, and it carries every field the
sheet provides plus a good deal more. New product information should be entered
there, and this app should migrate to reading it.

**Status as of 2026-08-12 (Nucleus `main` @ 4a265c1, PR #103):** the catalog
columns, the seeded data, and the read API are all in place. What remains is the
on-tap feature in Nucleus and the write path from this app — see
[What's left](#whats-left) below.

### Field mapping

| Sheet column | Nucleus |
|---|---|
| `Number` | `Product.mp_number` |
| `Name` | `Product.name` |
| `Style` | `Product.style` |
| `abv` | `Product.abv_estimated` — but see the ABV note below |
| `Description / ingredients` | `Product.key_ingredients` |
| `Gluten-Reduced` | `Product.is_gluten_reduced` |
| `Flavor Profile` | `Product.tasting_notes` |
| `Guest Guidance` | `Product.guest_guidance` |
| `On Tap` (`"Yes- Tap 1"`) | `Tap.tap_number` + `Tap.current_product_id` |
| `Recently Tapped` | `Tap.tapped_at` — a real timestamp, so "new tap" is derived rather than hand-flagged |
| `Food Pairings` | *no equivalent yet* (and unused by this app today) |

**And more than the sheet had:** `sensory_profile` (structured
appearance/aroma/taste/mouthfeel/finish), `marketing_description` (patron-facing
copy), `history_note` (origin story), `variant`, `color_hex` / `text_color`,
`release_type`, `shelf_life_days`, `is_mixed_pack`, brewery and yeast-strain
relationships, plus `product_targets` (OG/FG/IBU and label ABV) and product
forecasts.

**The ABV nuance matters.** `Product.abv_estimated` is what we *believe* the beer
is, with no regulatory standing. It is deliberately **not** `product_targets`'
`abv`, which means the government-approved label value — most MPBC products have
none. A consumer printing a number for a guest should prefer the target and fall
back to `abv_estimated`, and must never write `abv_estimated` back into the
target.

### API surface

| Endpoint | Role | |
|---|---|---|
| `GET /api/products` | staff | list; supports `q`, `brewery_id`, `include_inactive`, `format=csv` |
| `GET /api/products/{id}` | staff | single product |
| `GET /api/taps` | staff | tap fixtures, each with its `current_product` |
| `PUT /api/taps/{id}/product` | **manager** | put a product on a tap |
| `DELETE /api/taps/{id}/product` | **manager** | clear a tap (keg kicked) |
| `POST /api/taps` · `PATCH /api/taps/{id}` | **manager** | create / edit a fixture |

### Authentication — already solved

Nucleus accepts a **bearer API key** as well as an Azure AD browser session, so
this app does not need to impersonate a user:

- `NUCLEUS_API_KEY` → role `staff` — enough for every read above.
- `NUCLEUS_API_KEY_WRITE` → role `manager` — which is exactly what the tap
  endpoints require.

Both must be used **server-side only**, from `server.js`. Two independent
reasons: a bearer key in browser JavaScript is a leaked credential, and Nucleus's
CORS allows only its own `FRONTEND_URL` origin, so a browser-direct call would be
rejected anyway. A small proxy route here handles both.

### What's left

Two pieces of work, in this order:

**1. The on-tap feature in Nucleus.** The backend is complete and well-formed —
`Tap` model, schemas, service, routes and tests, migration `0086`. The model is
an explicit and documented exception to Nucleus's "master data only" charter,
taken precisely *because* several apps need to read and write the current pour
and there is no taproom service to own it. This app is one of those apps.

But it is not yet usable in practice:

- **No tap rows exist.** There is no taps seed among the catalog seed files, so
  the ~21 taproom fixtures still have to be created.
- **No UI in Nucleus.** There is no tap page in the Nucleus frontend at all, so
  nothing today can set what is pouring except a direct API call.

Two shape notes for whoever builds it: pouring nothing is
`current_product_id IS NULL`, never a deleted row — deleting the row loses the
tap's identity and its place on the wall. And there is no assignment history,
by design; a history table can be added later without changing this shape.

**2. Writing tap state from this app.** Once taps exist, this app should stop
reading `On Tap` out of the spreadsheet and instead read `GET /api/taps` and
write through `PUT /api/taps/{id}/product` — so the person changing a keg
updates the record once and both apps agree. The credential path already exists
(`NUCLEUS_API_KEY_WRITE`, manager); what has to be built here is the server-side
proxy route in `server.js` that holds it.

Until both land, the sheet remains the live source and both copies of
`BEER_CSV_URL` must stay in step.

---

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

Work on `feat/…` or `fix/…` branches and merge to `main` by PR.

---

## Deployment

**Railway is the live deployment.** Build is Nixpacks, start is `npm start`,
config in `railway.json`.

The critical setting is `DB_PATH`: container filesystems are ephemeral, so it
must point at a mounted volume (`/data/training.db` on a volume mounted at
`/data`) or every deploy and restart wipes the database. Backups default to a
`backups` directory beside the database — which means the same volume, so they
cover a bad write or a mistaken delete but **not** losing the volume itself.
Copying snapshots off-box is still a follow-up.

Two other things in the repo are not the live deployment:

- **`render.yaml` is historical.** The app used to run on Render. The file also
  declares `ADMIN_SETUP_KEY`, `MERCH_SETUP_KEY` and `SHIFT_LEAD_SETUP_KEY`,
  which no longer appear anywhere in the source — leftovers from the password
  auth that Entra-only sign-in replaced.
- **`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on every push
  to `main`**, copying only `index.html`. That produces a serverless, auth-less
  build that still reads the beer sheet directly but has no login, no SQLite,
  and no merch, SOP or inventory features.
