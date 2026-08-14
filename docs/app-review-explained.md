# App review (explained)

Holistic look at architecture, security, UX, and ops — in plain English.  
Owner-facing short version: [owner-briefing.md](./owner-briefing.md).

## Bottom line

Auth and API locking are solid for an internal tool. Biggest gaps:

1. **GitHub Pages** may publish an unlocked copy of the UI  
2. **SQLite + backups on one Railway disk** — mistakes are recoverable; losing the volume is not  
3. **Raw HTML in SOPs** — risk of stored XSS  
4. A few **API/role gaps** and a **very large** `index.html`

---

## What the app is made of

| Piece | Plain English |
|---|---|
| **Frontend (`index.html`)** | What staff see — tabs, buttons, games. Huge single file (~12k lines). |
| **Backend (`server.js`)** | Checks login, talks to Nucleus / 7shifts / Google, reads/writes SQLite. |
| **SQLite (`training.db`)** | One database file: users, progress, merch, SOPs, inventory, etc. |
| **Railway** | Live cloud host. Needs a **volume** so the DB file survives restarts. |
| **Nucleus** | Company beer/tap system of record (API keys). |
| **Hardcoded menus** | Food / coffee / bar still live in page code — need a deploy to change. |
| **Microsoft Entra** | Company Microsoft login — no passwords stored in this app. |

### Login terms

| Term | Meaning |
|---|---|
| Domain lock | Only `@manhattanproject.beer` can sign in |
| Session cookie (JWT) | Stays logged in; server checks on each API call |
| Role | admin / manager / bartender / etc. — re-read from DB every request |
| `approved_emails` | **Not** an allowlist anymore — only pre-assigns a role |
| `DEV_LOGIN` | Local-only fake login; blocked in production |

---

## Findings

### Critical — GitHub Pages still publishes the UI

A workflow can copy `index.html` to GitHub Pages without real login. Training UI becomes world-readable at a second URL. **Fix:** disable the workflow; use only Railway.

### Critical — Database and backups on one disk

Live DB and `backups/` both sit on the Railway volume. That helps “oops we corrupted the file,” not “the volume was deleted.” **Fix:** confirm volume + `DB_PATH`; copy snapshots to Drive/Dropbox. See [railway-db-setup.md](./railway-db-setup.md).

### High — SOP / coffee HTML injection

Admin-written HTML is inserted into the page. A script tag can run for other staff (stored XSS). **Fix:** sanitize HTML or allow markdown only.

### High — Entra tenant can default too broadly

If `AZURE_TENANT_ID` is missing, code can fall back to `organizations`. **Fix:** refuse to boot in production without the real tenant GUID.

### High — Inventory API vs UI

UI may hide stock edits, but some inventory update endpoints only check “logged in.” **Fix:** require inventory/manager roles on those routes.

### Medium — Long sessions + open company signup

Sessions last up to 30 days; any company Microsoft email can join. **Fix:** shorter sessions; use Delete user when people leave.

### Medium — Login gate is browser-only

APIs require login (good). HTML/JS can still be downloaded. Don’t put secrets in frontend (keys stay on the server).

---

## UX

**Working well:** brand shell, login gate, role-gated tabs, mobile tab bar, most text escaped.  
**Friction:** crowded nav on phone; menus need deploys; “approve email” wording is confusing; one syntax error in `index.html` can break the whole UI.

---

## Recommended next moves

| # | Action | Impact | Effort |
|---|---|---|---|
| 1 | Turn off GitHub Pages deploy | Critical | Low |
| 2 | Confirm Railway volume + off-box backups | Critical | Med |
| 3 | Sanitize SOP/coffee HTML | High | Med |
| 4 | Hard-require Entra tenant ID in prod | High | Low |
| 5 | Lock inventory writes to the right roles | High | Low |
| 6 | Shorter sessions + clearer Team labels | Med | Low |
| 7 | Security headers + self-host Chart.js | Med | Low–Med |
| 8 | Split giant `index.html` | Med | High |
| 9 | Editable Food/Coffee/Bar in the DB | Med | High |
| 10 | Company email only + delete user | Med | In flight (PR) |

## Keep doing

Production boot guards, global `/api` auth gate, Nucleus secrets server-side only, CI checks, branch + PR workflow.
