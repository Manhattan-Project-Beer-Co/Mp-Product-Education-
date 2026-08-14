# Staff Training Portal — Owner Briefing

Manhattan Project Product Education app — what it is, what’s working, what we need from leadership, what we’ll do next.

## In one sentence

We have a working internal training site for beer, food, coffee, SOPs, inventory awareness, and games — staff sign in with their company Microsoft account. The product is usable; we need a few access keys and a short hardening pass so data and access stay safe as more people use it.

| Status | |
|---|---|
| Core training flows | Live |
| Keys we still need | 3 (Nucleus write, 7shifts, optional reviews) |
| Hardening pass | ~1–2 weeks of focused work |

---

## What this app does for the business

| For staff | For managers / owners |
|---|---|
| Learn what’s on tap, food/coffee cues, SOPs, games | One place for product knowledge instead of tribal memory |
| Sign in with `@manhattanproject.beer` Microsoft account | No shared passwords; company email only |
| Track tasting / training progress | Team visibility into who’s practicing |
| Inventory counts & shift awareness (when connected) | Fewer “what’s pouring / who’s on” mismatches |

---

## Three risks to know about

### 1. Training data can be lost if hosting isn’t set up right

Progress, users, inventory counts, and SOPs live in a database file on the server. If that disk isn’t permanent (or we only back up to the same disk), a bad deploy or volume wipe can erase history.

**Ask us to confirm:** permanent storage on Railway + copies stored somewhere else.  
See [railway-db-setup.md](./railway-db-setup.md).

### 2. An old public copy of the site may still be publishing

GitHub Pages can publish a version of the training UI without real login. That’s leftover from an earlier setup — not how staff should use the app.

**Fix is small:** turn that auto-publish off and use only the real hosted app.

### 3. Some powerful features still need company credentials

Without the right keys, tap editing stays read-only, schedule awareness stays off, and live Google/Yelp reviews stay on samples. The app still works — those pieces just aren’t fully connected.

---

## Three asks from owners / admins

These are access items, not budget items. Someone with admin rights in each system creates them once; we store them securely in hosting (not in GitHub).

| Ask | From whom | Unlocks |
|---|---|---|
| Nucleus read + write API keys | Whoever runs Nucleus / engineering | Live beer list; managers can change taps in-app |
| 7shifts Access Token + Company ID | 7shifts Admin → Company Settings → Developer Tools | Who’s working / shift-lead awareness |
| Google Places key + Place ID; Yelp API key (optional) | Google Cloud / Yelp Developers | Live guest reviews instead of samples |

**Already in place:** Microsoft sign-in for `@manhattanproject.beer`. OpenAI for smarter “Ask MP” is optional later.

Full list: [credentials-checklist.md](./credentials-checklist.md).

---

## Three next steps (our side)

| Step | Outcome | Rough effort |
|---|---|---|
| Turn off public Pages publish; confirm database volume + backups | One official site; training history doesn’t vanish | Days, not weeks |
| Close security gaps (SOP HTML, inventory permissions, shorter sessions) | Staff only change what their role should; fewer lingering logins | ~1 week focused |
| Wire keys as you provide them; ship email-domain + delete-user controls | Company email only; managers can remove test/old accounts | As keys arrive |

---

## What we are not asking for today

- A big rewrite of the whole app  
- Password accounts or guest public access  
- Replacing Nucleus or 7shifts  
- Buying new software licenses (keys use tools we already have)  
- Stopping day-to-day training use while we harden  

---

## Decision we need from this meeting

Approve connecting Nucleus write + 7shifts (and optionally reviews), and green-light the short hardening pass above. Deeper technical detail: [app-review-explained.md](./app-review-explained.md).
