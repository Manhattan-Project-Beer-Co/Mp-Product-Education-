/**
 * Floor Tools UI — 86 board, handoff, huddle, recommenders, allergy, maintenance, etc.
 * Expects apiFetch, escapeHTML, escapeForAttribute, currentUser, isManager, activateAppTab,
 * beers, FOOD_MENU, FloorContent, StaffRoles from the page.
 */

let floorSection = "board";
let allergyFilters = { gluten: false, dairy: false, nuts: false, egg: false };
let sellThemTags = new Set();
let pairingMode = "food"; // food | beer
let recipeBatchCount = 1;
let kegPercent = 50;
let kegSize = "1/2 bbl";
let photoStandardsArea = "all";

function renderFloorTools(content) {
  const tabs = [
    { id: "board", label: "86 Board" },
    { id: "handoff", label: "Handoff" },
    { id: "huddle", label: "Huddle" },
    { id: "sell", label: "Sell This" },
    { id: "recommend", label: "Recommend" },
    { id: "allergy", label: "Allergy Check" },
    { id: "photos", label: "Photo Standards" },
    { id: "shoutouts", label: "Shout-outs" },
    { id: "challenges", label: "Team Challenges" },
    { id: "tapchange", label: "Tap Change" },
    { id: "menupkg", label: "Menu Package" },
    { id: "achievements", label: "Clearance" },
    { id: "maintenance", label: "Maintenance" },
    { id: "troubleshoot", label: "Fix It" },
    { id: "recipes", label: "Recipe Scale" },
    { id: "kegs", label: "Keg Estimate" },
    { id: "emergency", label: "Emergency" },
    { id: "firstfive", label: "First 5" },
    { id: "skills", label: "Skills" }
  ];

  const nav = `
    <div class="coffee-subtabs">
      ${tabs.map(t => `
        <button class="coffee-subtab${floorSection === t.id ? " active" : ""}" onclick="floorSection='${t.id}'; render();">${t.label}</button>
      `).join("")}
    </div>
  `;

  content.innerHTML = `
    <div class="coffee-intro">
      <h2>Floor Tools</h2>
      <p>Live boards, recommenders, allergy check, maintenance, and training rails — use before you hit a table.</p>
    </div>
    ${nav}
    <div id="floorToolsBody"><div class="status"><strong>Loading…</strong></div></div>
  `;

  const body = document.getElementById("floorToolsBody");
  const map = {
    board: renderEightySixBoard,
    handoff: renderHandoffBoard,
    huddle: renderHuddleBoard,
    sell: renderSellThisBoard,
    recommend: renderRecommendBoard,
    allergy: renderAllergyBoard,
    photos: renderPhotoStandardsBoard,
    shoutouts: renderShoutoutsBoard,
    challenges: renderTeamChallengesBoard,
    tapchange: renderTapChangeBoard,
    menupkg: renderMenuPackageBoard,
    achievements: renderAchievementsBoard,
    maintenance: renderMaintenanceBoard,
    troubleshoot: renderTroubleshootBoard,
    recipes: renderRecipeScaleBoard,
    kegs: renderKegBoard,
    emergency: renderEmergencyBoard,
    firstfive: renderFirstFiveBoard,
    skills: renderSkillsBoard
  };
  (map[floorSection] || renderEightySixBoard)(body);
}

async function renderEightySixBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading 86 board…</strong></div>`;
  try {
    const data = await apiFetch("/api/availability");
    const items = data.items || [];
    el.innerHTML = `
      <div class="guide-callout" style="max-width:760px;margin:0 auto 16px;">
        <strong>Check this before approaching a table.</strong> 86 = do not sell · Out = gone · Low = running short.
      </div>
      ${currentUser ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Add item</label>
          <input id="availName" placeholder="Item name (e.g. Skirt steak, Dark Room syrup)" maxlength="120">
          <label style="margin-top:8px;">Category</label>
          <select id="availCategory">
            <option>food</option><option>beer</option><option>coffee</option><option>wine</option><option>merch</option><option>other</option>
          </select>
          <label style="margin-top:8px;">Status</label>
          <select id="availStatus"><option value="86">86</option><option value="out">Out</option><option value="low">Low</option></select>
          <label style="margin-top:8px;">Notes</label>
          <input id="availNotes" placeholder="Optional note" maxlength="500">
          <button class="game-next" style="margin-top:12px;" onclick="addAvailabilityItem()">Post to board</button>
        </div>
      ` : `<p class="hint" style="text-align:center;">Log in to update the board.</p>`}
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${items.length ? items.map(item => `
          <div class="card" style="border-left:4px solid ${item.status === "low" ? "#c9a227" : "#c44"}">
            <div class="card-top">
              <div>
                <p class="name">${escapeHTML(item.item_name)}</p>
                <p class="desc">${escapeHTML(item.category)} · ${escapeHTML(item.status.toUpperCase())}${item.notes ? ` · ${escapeHTML(item.notes)}` : ""}</p>
              </div>
              ${currentUser ? `<button class="auth-btn" onclick="clearAvailabilityItem(${item.id})">Clear</button>` : ""}
            </div>
          </div>
        `).join("") : `<div class="status"><strong>Board is clear.</strong>Nothing marked 86 / low / out.</div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>Could not load board.</strong>${escapeHTML(err.message)}</div>`;
  }
}

async function addAvailabilityItem() {
  try {
    await apiFetch("/api/availability", {
      method: "POST",
      body: JSON.stringify({
        itemName: document.getElementById("availName")?.value,
        category: document.getElementById("availCategory")?.value,
        status: document.getElementById("availStatus")?.value,
        notes: document.getElementById("availNotes")?.value
      })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function clearAvailabilityItem(id) {
  try {
    await apiFetch(`/api/availability/${id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function renderHandoffBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading handoff…</strong></div>`;
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in to view shift handoff</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  try {
    const data = await apiFetch("/api/handoffs");
    const notes = data.notes || [];
    el.innerHTML = `
      <p class="desc" style="max-width:760px;margin:0 auto 12px;">Outgoing lead: leave 3–5 notes (86s, broken gear, guest issues, events, kegs). Notes auto-expire.</p>
      <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
        <textarea id="handoffNote" rows="3" placeholder="e.g. Patio heater #2 dead · VIP party at 7 · Necessary Evil half · confirm 86 on tres leches syrup"></textarea>
        <button class="game-next" style="margin-top:10px;" onclick="postHandoffNote()">Add handoff note</button>
      </div>
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${notes.length ? notes.map(n => `
          <div class="card">
            <p class="name">${escapeHTML(n.note)}</p>
            <p class="desc">${escapeHTML(n.author_name || "Staff")} · expires ${escapeHTML(n.expires_at || "")}</p>
            <button class="auth-btn" onclick="dismissHandoff(${n.id})">Dismiss</button>
          </div>
        `).join("") : `<div class="status"><strong>No active handoff notes.</strong></div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function postHandoffNote() {
  try {
    await apiFetch("/api/handoffs", {
      method: "POST",
      body: JSON.stringify({ note: document.getElementById("handoffNote")?.value })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function dismissHandoff(id) {
  await apiFetch(`/api/handoffs/${id}`, { method: "DELETE" });
  render();
}

async function renderHuddleBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in for pre-shift huddle</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Building 60-second huddle…</strong></div>`;
  try {
    const data = await apiFetch("/api/huddle");
    const s = data.sections || {};
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Pre-shift huddle (~60 sec)</h2>
        <p>${escapeHTML(data.shiftDate || "")}</p>
      </div>
      <div class="list" style="max-width:760px;margin:0 auto;">
        <div class="card"><p class="name">1. 86 / Low / Out</p><p class="desc">${(s.eightySix || []).length ? s.eightySix.map(i => `${i.status.toUpperCase()}: ${i.item_name}`).join(" · ") : "Board clear"}</p></div>
        <div class="card"><p class="name">2. Handoff</p><p class="desc">${(s.handoffs || []).map(h => h.note).join(" · ") || "None"}</p></div>
        <div class="card"><p class="name">3. Sell / push</p><p class="desc">${s.sellThis ? `${s.sellThis.item_name} — ${s.sellThis.talking_points || s.pushItem}` : escapeHTML(s.pushItem || "")}</p></div>
        <div class="card"><p class="name">4. Training question</p><p class="desc">${escapeHTML(s.trainingQuestion || "")}</p></div>
        <div class="card"><p class="name">5. Ops reminder</p><p class="desc">${escapeHTML(s.opsReminder || "")}</p></div>
        ${(s.shoutouts || []).length ? `<div class="card"><p class="name">Shout-outs</p><p class="desc">${s.shoutouts.map(x => `${x.to_name}: ${x.message}`).join(" · ")}</p></div>` : ""}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function renderSellThisBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading…</strong></div>`;
  try {
    const data = await apiFetch("/api/sell-this-today");
    const c = data.challenge;
    const done = new Set((data.myCompletions || []).map(x => x.action));
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Sell This Today</h2>
        <p>Management picks one item. Learn it, quiz it, or taste it for bonus points.</p>
      </div>
      ${isManager() ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Item to push</label>
          <input id="sellItemName" placeholder="Beer / food / coffee item" maxlength="120">
          <label style="margin-top:8px;">Type</label>
          <select id="sellItemType"><option>beer</option><option>food</option><option>coffee</option></select>
          <label style="margin-top:8px;">Talking points</label>
          <textarea id="sellTalk" rows="2" placeholder="One sentence staff can say to guests"></textarea>
          <button class="game-next" style="margin-top:10px;" onclick="setSellThisToday()">Set as Sell This Today</button>
        </div>
      ` : ""}
      ${c ? `
        <div class="card" style="max-width:760px;margin:0 auto;">
          <p class="coffee-section-num">${escapeHTML(c.item_type)}</p>
          <p class="name">${escapeHTML(c.item_name)}</p>
          <p class="desc">${escapeHTML(c.talking_points || "")}</p>
          ${currentUser ? `
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
              <button class="game-next" ${done.has("learn") ? "disabled" : ""} onclick="completeSellThis('learn')">Learn (+10)</button>
              <button class="game-next" ${done.has("quiz") ? "disabled" : ""} onclick="completeSellThis('quiz')">Quiz (+25)</button>
              <button class="game-next" ${done.has("tasting") ? "disabled" : ""} onclick="completeSellThis('tasting')">Tasting (+20)</button>
            </div>
          ` : `<p class="hint">Log in to earn bonus points.</p>`}
        </div>
      ` : `<div class="status"><strong>No active challenge.</strong>Managers can set one above.</div>`}
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function setSellThisToday() {
  try {
    await apiFetch("/api/sell-this-today", {
      method: "POST",
      body: JSON.stringify({
        itemName: document.getElementById("sellItemName")?.value,
        itemType: document.getElementById("sellItemType")?.value,
        talkingPoints: document.getElementById("sellTalk")?.value
      })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function completeSellThis(action) {
  try {
    const data = await apiFetch("/api/sell-this-today/complete", {
      method: "POST",
      body: JSON.stringify({ action })
    });
    alert(`Nice — +${data.points} pts`);
    render();
  } catch (err) {
    alert(err.message);
  }
}

function renderRecommendBoard(el) {
  const tags = (window.FloorContent?.GUEST_TASTE_TAGS) || [];
  el.innerHTML = `
    <div class="coffee-intro" style="padding-top:0;">
      <h2>What should I sell them?</h2>
      <p>Tap what the guest said. You’ll get 2–3 beer ideas plus a line you can say.</p>
    </div>
    <div class="coffee-filters" style="max-width:760px;margin:0 auto 12px;">
      ${tags.map(t => `
        <button class="filter-btn${sellThemTags.has(t.id) ? " active" : ""}" onclick="toggleSellTag('${t.id}')">${escapeHTML(t.label)}</button>
      `).join("")}
    </div>
    <div id="sellThemResults" style="max-width:760px;margin:0 auto;"></div>
    <div class="coffee-intro" style="margin-top:28px;">
      <h2>Food + beer pairings</h2>
      <p>Pick a food item for beer ideas — informational suggestions, not gospel.</p>
    </div>
    <div class="list" style="max-width:760px;margin:0 auto;" id="pairingList"></div>
  `;
  paintSellThemResults();
  paintPairingList();
}

function toggleSellTag(id) {
  if (sellThemTags.has(id)) sellThemTags.delete(id);
  else sellThemTags.add(id);
  render();
}

function paintSellThemResults() {
  const el = document.getElementById("sellThemResults");
  if (!el) return;
  if (!sellThemTags.size) {
    el.innerHTML = `<div class="status"><strong>Select at least one guest cue.</strong></div>`;
    return;
  }
  const pool = (typeof beers !== "undefined" ? beers : []).filter(b => {
    const on = String(b["On Tap"] || b.onTap || "").trim();
    return on && on !== "0" && on.toLowerCase() !== "no";
  });
  const scored = pool.map(b => {
    const flavor = String(b["Flavor Profile"] || b.flavor || "").toLowerCase();
    const style = String(b.Style || b.style || "").toLowerCase();
    const name = String(b.Name || b.name || "");
    const abv = parseFloat(String(b.ABV || b.abv || "").replace("%", "")) || 0;
    let score = 0;
    if (sellThemTags.has("light") && /light|crisp|lager|pils|blonde|kolsch|köalsch/.test(flavor + style)) score += 3;
    if (sellThemTags.has("hoppy") && /ipa|hop|bitter|pine|citrus/.test(flavor + style)) score += 3;
    if (sellThemTags.has("fruity") && /fruit|berry|tropical|wheat|wit/.test(flavor + style)) score += 3;
    if (sellThemTags.has("dark") && /stout|porter|dark|roast|chocolate|coffee/.test(flavor + style)) score += 3;
    if (sellThemTags.has("not_bitter") && !/ipa|bitter|west coast/.test(flavor + style)) score += 2;
    if (sellThemTags.has("high_abv") && abv >= 6.5) score += 3;
    if (sellThemTags.has("modelo") && /lager|mexican|pils|light/.test(flavor + style)) score += 4;
    if (sellThemTags.has("wine") && /sour|farmhouse|saison|barrel|fruit|wine/.test(flavor + style + name.toLowerCase())) score += 3;
    return { name, flavor, style, abv, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  if (!scored.length) {
    el.innerHTML = `<div class="status"><strong>No strong on-tap matches.</strong>Ask what they normally drink and bridge from there.</div>`;
    return;
  }

  const line = sellThemTags.has("modelo")
    ? "If you like Modelo, this stays crisp and easy — want a quick taste?"
    : sellThemTags.has("wine")
      ? "If you usually drink wine, this has more of that fruit/acid lane without going full IPA."
      : "Based on what you like, I’d start you here — happy to adjust.";

  el.innerHTML = scored.map(b => `
    <div class="card">
      <p class="name">${escapeHTML(b.name)}</p>
      <p class="desc">${escapeHTML(b.style)}${b.abv ? ` · ${b.abv}%` : ""}</p>
      <p class="desc" style="margin-top:8px;"><strong>Say:</strong> “${escapeHTML(line)}”</p>
    </div>
  `).join("");
}

function paintPairingList() {
  const el = document.getElementById("pairingList");
  if (!el || typeof FOOD_MENU === "undefined") return;
  const pairings = window.FloorContent?.FOOD_BEER_PAIRINGS || {};
  const foods = FOOD_MENU.filter(f => ["dinner", "lunch"].includes(f.category)).slice(0, 12);
  el.innerHTML = foods.map(f => {
    const tips = pairings[f.id] || pairings.default;
    return `
      <div class="card">
        <p class="name">${escapeHTML(f.name)}</p>
        <p class="desc">${(tips || []).map(t => `• ${escapeHTML(t.beerHint)} — ${escapeHTML(t.why)}`).join("<br>")}</p>
      </div>
    `;
  }).join("");
}

function renderAllergyBoard(el) {
  const foods = typeof FOOD_MENU !== "undefined" ? FOOD_MENU : [];
  const active = Object.entries(allergyFilters).filter(([, v]) => v).map(([k]) => k);
  const filtered = foods.filter(item => {
    if (allergyFilters.gluten && item.glutenFree !== true) return false;
    if (allergyFilters.dairy && item.dairy === true) return false;
    if (allergyFilters.nuts && item.nuts === true) return false;
    if (allergyFilters.egg && /egg|aioli|hollandaise|mayo/i.test(`${item.description || ""} ${item.notes || ""}`)) return false;
    return true;
  });

  el.innerHTML = `
    <div class="guide-callout" style="max-width:760px;margin:0 auto 16px;">
      <strong>Informational only.</strong> Always confirm with the kitchen. This is not a guarantee.
    </div>
    <div class="coffee-filters" style="max-width:760px;margin:0 auto 12px;">
      ${["gluten", "dairy", "nuts", "egg"].map(key => `
        <button class="filter-btn${allergyFilters[key] ? " active" : ""}" onclick="allergyFilters.${key}=!allergyFilters.${key}; render();">Avoid ${key}</button>
      `).join("")}
    </div>
    <p class="desc" style="text-align:center;margin-bottom:12px;">${active.length ? `Filtering to avoid: ${active.join(", ")}` : "Select allergens to filter the food menu."}</p>
    <div class="list" style="max-width:760px;margin:0 auto;">
      ${filtered.slice(0, 40).map(item => `
        <div class="card">
          <p class="name">${escapeHTML(item.name)} <span class="desc">${escapeHTML(item.price || "")}</span></p>
          <p class="desc">${escapeHTML(item.description || "")}</p>
          <p class="desc" style="margin-top:6px;">GF: ${item.glutenFree === true ? "yes" : item.glutenFree === false ? "no" : "ask"} · Dairy: ${item.dairy === true ? "yes" : item.dairy === false ? "no" : "ask"} · Nuts: ${item.nuts === true ? "yes" : item.nuts === false ? "no" : "ask"}</p>
        </div>
      `).join("") || `<div class="status"><strong>No items match.</strong>Confirm with kitchen for safe options.</div>`}
    </div>
  `;
}

async function renderMaintenanceBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in to report maintenance</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Loading…</strong></div>`;
  try {
    const data = await apiFetch("/api/maintenance");
    el.innerHTML = `
      <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
        <label>What's broken?</label>
        <input id="maintTitle" maxlength="160" placeholder="Patio heater #2 / dishwasher leak">
        <label style="margin-top:8px;">Area</label>
        <input id="maintArea" value="General" maxlength="60">
        <label style="margin-top:8px;">Severity</label>
        <select id="maintSeverity"><option>medium</option><option>low</option><option>high</option><option>critical</option></select>
        <label style="margin-top:8px;">Details</label>
        <textarea id="maintDesc" rows="2"></textarea>
        <label style="margin-top:8px;">Photo (optional)</label>
        <input id="maintPhoto" type="file" accept="image/*">
        <button class="game-next" style="margin-top:10px;" onclick="submitMaintenance()">Report</button>
      </div>
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${(data.tickets || []).map(t => `
          <div class="card">
            <p class="name">${escapeHTML(t.title)}</p>
            <p class="desc">${escapeHTML(t.area)} · ${escapeHTML(t.severity)} · ${escapeHTML(t.status)} · ${escapeHTML(t.reporter_name || "")}</p>
            <p class="desc">${escapeHTML(t.description || "")}</p>
            ${t.photo_url ? `<img src="${escapeForAttribute(t.photo_url)}" alt="" style="max-width:100%;margin-top:8px;border-radius:8px;">` : ""}
            ${isManager() ? `
              <div style="display:flex;gap:8px;margin-top:8px;">
                <button class="auth-btn" onclick="setMaintStatus(${t.id},'in_progress')">In progress</button>
                <button class="auth-btn" onclick="setMaintStatus(${t.id},'fixed')">Fixed</button>
              </div>
            ` : ""}
          </div>
        `).join("") || `<div class="status"><strong>No tickets.</strong></div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function submitMaintenance() {
  const file = document.getElementById("maintPhoto")?.files?.[0];
  let photoUrl = "";
  if (file) {
    photoUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read photo"));
      reader.readAsDataURL(file);
    });
  }
  try {
    await apiFetch("/api/maintenance", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("maintTitle")?.value,
        area: document.getElementById("maintArea")?.value,
        severity: document.getElementById("maintSeverity")?.value,
        description: document.getElementById("maintDesc")?.value,
        photoUrl
      })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function setMaintStatus(id, status) {
  await apiFetch(`/api/maintenance/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  render();
}

function renderTroubleshootBoard(el) {
  const list = window.FloorContent?.TROUBLESHOOTING || [];
  el.innerHTML = `
    <div class="list" style="max-width:760px;margin:0 auto;">
      ${list.map(item => `
        <div class="card">
          <p class="name">${escapeHTML(item.title)}</p>
          <ol class="desc">${item.steps.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ol>
          <div class="guide-callout" style="margin-top:10px;"><strong>Stop & escalate:</strong> ${escapeHTML(item.stopEscalate)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

async function renderRecipeScaleBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading recipes…</strong></div>`;
  try {
    const data = await apiFetch("/api/recipes/batches");
    const recipes = data.recipes || [];
    const recipe = recipes[0];
    if (!recipe) {
      el.innerHTML = `<div class="status"><strong>No recipes yet.</strong></div>`;
      return;
    }
    const scaled = (window.FloorContent?.scaleRecipe || ((x) => x))(recipe.ingredients, recipeBatchCount);
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>${escapeHTML(recipe.title)}</h2>
        <p>Base = ${escapeHTML(recipe.base_yield)}. Enter how many batches you need.</p>
      </div>
      <div class="auth-panel" style="max-width:520px;margin:0 auto 16px;">
        <label>Batches</label>
        <input type="number" min="0.25" step="0.25" value="${recipeBatchCount}" onchange="recipeBatchCount=Number(this.value)||1; render();">
      </div>
      <div class="card" style="max-width:520px;margin:0 auto;">
        <ul class="desc">${scaled.map(row => `<li><strong>${escapeHTML(String(row.scaledAmount))}</strong> ${escapeHTML(row.unit || "")} — ${escapeHTML(row.name)}</li>`).join("")}</ul>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

function renderKegBoard(el) {
  const est = window.FloorContent?.estimateKegPours?.(kegSize, kegPercent) || { remaining: "—", outlook: "" };
  el.innerHTML = `
    <div class="coffee-intro" style="padding-top:0;">
      <h2>Keg pour estimate</h2>
      <p>Rough remaining pours — not POS truth. Tell the lead when it looks like a kick night.</p>
    </div>
    <div class="auth-panel" style="max-width:520px;margin:0 auto;">
      <label>Keg size</label>
      <select onchange="kegSize=this.value; render();">
        ${["1/2 bbl", "1/4 bbl", "1/6 bbl", "sixtel"].map(s => `<option ${kegSize === s ? "selected" : ""}>${s}</option>`).join("")}
      </select>
      <label style="margin-top:8px;">Estimated % full</label>
      <input type="range" min="5" max="100" step="5" value="${kegPercent}" oninput="kegPercent=Number(this.value); render();">
      <p class="name" style="margin-top:12px;">~${escapeHTML(String(est.remaining))} pours left</p>
      <p class="desc">${escapeHTML(est.outlook || "")}</p>
    </div>
  `;
}

function renderEmergencyBoard(el) {
  el.innerHTML = `
    <div class="guide-callout" style="max-width:760px;margin:0 auto 16px;">
      <strong>Manager-approved emergencies only.</strong> These are separated from ordinary SOPs. When in doubt: get a lead and call 911 for life safety.
    </div>
    <div class="list" style="max-width:760px;margin:0 auto;">
      ${[
        ["Injury", "Call 911 if serious. First aid kit location per lead. Document and notify manager."],
        ["Power outage", "Keep guests calm, secure open tabs if possible, follow lead for evacuation or hold."],
        ["Severe weather", "Move patio guests inside; follow lead for shelter-in-place."],
        ["Fire", "Pull alarm / 911, evacuate, do not re-enter."],
        ["Intoxicated guest", "Refuse service as needed, loop lead, prioritize safety."],
        ["Harassment / safety", "Remove staff/guest from harm, get manager, document — do not investigate alone."],
        ["POS outage", "See Fix It guide; lead decides backup payment flow."]
      ].map(([t, b]) => `<div class="card"><p class="name">${t}</p><p class="desc">${b}</p></div>`).join("")}
      <button class="game-next" onclick="sopCategory='Emergency'; activateAppTab('sops');">Open Emergency SOPs</button>
    </div>
  `;
}

async function renderFirstFiveBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in for First 5 Shifts</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Loading…</strong></div>`;
  try {
    const data = await apiFetch("/api/first-five/me");
    const done = new Set((data.progress || []).filter(p => p.demonstrated).map(p => `${p.shift_number}:${p.skill_key}`));
    let unlocked = 1;
    for (let s = 1; s <= 5; s++) {
      const block = (data.curriculum || []).find(c => c.shift === s);
      const complete = block && block.skills.every(sk => done.has(`${s}:${sk}`));
      if (complete) unlocked = Math.min(5, s + 1);
      else break;
    }
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>First 5 Shifts</h2>
        <p>Don't dump the whole portal on day one. You're unlocked through Shift ${unlocked}.</p>
      </div>
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${(data.curriculum || []).map(block => {
          const locked = block.shift > unlocked;
          return `
            <div class="card" style="opacity:${locked ? 0.45 : 1}">
              <p class="name">${escapeHTML(block.title)}${locked ? " 🔒" : ""}</p>
              <p class="desc">${escapeHTML(block.focus)}</p>
              <ul class="desc">${block.skills.map(sk => {
                const ok = done.has(`${block.shift}:${sk}`);
                return `<li>${ok ? "✅" : "⬜"} ${escapeHTML(sk)} ${!locked ? `<button class="auth-btn" onclick="signFirstFive(${block.shift},'${sk}')">Sign off</button>` : ""}</li>`;
              }).join("")}</ul>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function signFirstFive(shiftNumber, skillKey) {
  try {
    await apiFetch("/api/first-five/signoff", {
      method: "POST",
      body: JSON.stringify({ shiftNumber, skillKey })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function renderSkillsBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in to view skills</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Loading skill matrix…</strong></div>`;
  try {
    const data = await apiFetch("/api/skills");
    const skills = data.skills || [];
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Skill matrix</h2>
        <p>Green = proficient · Yellow = learning · Gray = not trained. Managers can update.</p>
      </div>
      <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
        <label>Who knows this?</label>
        <select id="whoKnowsSkill">${skills.map(s => `<option value="${s.key}">${escapeHTML(s.label)}</option>`).join("")}</select>
        <button class="game-next" style="margin-top:8px;" onclick="lookupWhoKnows()">Find trained staff</button>
        <div id="whoKnowsResults" style="margin-top:10px;"></div>
      </div>
      <div style="overflow:auto;max-width:100%;">
        <table class="game-leaderboard-table" style="min-width:720px;">
          <thead><tr><th>Name</th>${skills.map(s => `<th>${escapeHTML(s.label)}</th>`).join("")}</tr></thead>
          <tbody>
            ${(data.matrix || []).map(row => `
              <tr>
                <td>${escapeHTML(row.name)}</td>
                ${skills.map(s => {
                  const level = row.levels[s.key] || "none";
                  const color = level === "proficient" ? "#1f7a3f" : level === "learning" ? "#a67c00" : "#444";
                  const label = level === "proficient" ? "G" : level === "learning" ? "Y" : "—";
                  return `<td style="background:${color};color:#fff;text-align:center;cursor:pointer;" title="${level}" onclick="cycleSkill(${row.id},'${s.key}','${level}')">${label}</td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function lookupWhoKnows() {
  const skill = document.getElementById("whoKnowsSkill")?.value;
  const box = document.getElementById("whoKnowsResults");
  try {
    const data = await apiFetch(`/api/skills/who-knows-now?skill=${encodeURIComponent(skill)}`);
    const note = data.onShiftFilterActive
      ? `<p class="desc">On-shift staff sorted first (7shifts).</p>`
      : `<p class="desc">7shifts on-shift filter inactive — showing all trained staff.</p>`;
    box.innerHTML = note + ((data.people || []).length
      ? data.people.map(p => `<div class="desc">${p.onShiftNow ? "🟢 " : ""}${escapeHTML(p.name)} — ${escapeHTML(p.level)}${p.onShiftNow ? " (on shift now)" : ""}</div>`).join("")
      : `<div class="desc">Nobody marked trained yet.</div>`);
  } catch (err) {
    box.textContent = err.message;
  }
}

async function cycleSkill(userId, skillKey, current) {
  if (!isManager()) return;
  const next = current === "none" ? "learning" : current === "learning" ? "proficient" : "none";
  try {
    await apiFetch(`/api/skills/${userId}/${skillKey}`, {
      method: "PUT",
      body: JSON.stringify({ level: next })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function renderPhotoStandardsBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading photo standards…</strong></div>`;
  try {
    const data = await apiFetch("/api/photo-standards");
    const photos = data.photos || [];
    const areas = ["all", ...new Set(photos.map(p => p.area).filter(Boolean))];
    const filtered = photoStandardsArea === "all"
      ? photos
      : photos.filter(p => p.area === photoStandardsArea);
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>What GOOD looks like</h2>
        <p>Photo standards for stations, glassware, and setups. Match the floor to these shots.</p>
      </div>
      <div class="coffee-subtabs" style="margin-bottom:12px;">
        ${areas.map(a => `
          <button class="coffee-subtab${photoStandardsArea === a ? " active" : ""}" onclick="photoStandardsArea='${escapeForAttribute(a)}'; render();">${a === "all" ? "All areas" : escapeHTML(a)}</button>
        `).join("")}
      </div>
      ${isManager() ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Area</label>
          <input id="psArea" placeholder="Bar / Patio / Glassware" maxlength="80">
          <label style="margin-top:8px;">Title</label>
          <input id="psTitle" placeholder="Correct glassware for IPA" maxlength="160">
          <label style="margin-top:8px;">Caption</label>
          <input id="psCaption" placeholder="Optional note" maxlength="500">
          <label style="margin-top:8px;">Photo</label>
          <input id="psFile" type="file" accept="image/*">
          <button class="game-next" style="margin-top:10px;" onclick="uploadPhotoStandard()">Add standard</button>
        </div>
      ` : ""}
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${filtered.length ? filtered.map(p => `
          <div class="card">
            <p class="coffee-section-num">${escapeHTML(p.area)}</p>
            <p class="name">${escapeHTML(p.title)}</p>
            ${p.caption ? `<p class="desc">${escapeHTML(p.caption)}</p>` : ""}
            <img src="${escapeForAttribute(p.photo_url)}" alt="${escapeForAttribute(p.title)}" style="max-width:100%;margin-top:10px;border-radius:8px;">
            ${isManager() ? `<button class="auth-btn" style="margin-top:8px;" onclick="deletePhotoStandard(${p.id})">Remove</button>` : ""}
          </div>
        `).join("") : `<div class="status"><strong>No photo standards yet.</strong>${isManager() ? " Upload examples above." : " Ask a manager to add station photos."}</div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function uploadPhotoStandard() {
  try {
    const file = document.getElementById("psFile")?.files?.[0];
    if (!file) return alert("Choose a photo.");
    const reader = new FileReader();
    const url = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read photo."));
      reader.readAsDataURL(file);
    });
    await apiFetch("/api/photo-standards", {
      method: "POST",
      body: JSON.stringify({
        area: document.getElementById("psArea")?.value,
        title: document.getElementById("psTitle")?.value,
        caption: document.getElementById("psCaption")?.value,
        photoUrl: url
      })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function deletePhotoStandard(id) {
  if (!confirm("Remove this photo standard?")) return;
  await apiFetch(`/api/photo-standards/${id}`, { method: "DELETE" });
  render();
}

async function renderShoutoutsBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in to shout out teammates</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Loading shout-outs…</strong></div>`;
  try {
    const [feed, dir] = await Promise.all([
      apiFetch("/api/shoutouts"),
      apiFetch("/api/staff-directory")
    ]);
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Staff shout-outs</h2>
        <p>Call out good work — three shout-outs unlock a secret badge.</p>
      </div>
      <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
        <label>Teammate</label>
        <select id="shoutTo">
          ${(dir.staff || []).map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join("")}
        </select>
        <label style="margin-top:8px;">Message</label>
        <textarea id="shoutMsg" rows="2" maxlength="280" placeholder="Caught them coaching a new hire on the patio…"></textarea>
        <label style="margin-top:8px;display:flex;gap:8px;align-items:center;">
          <input type="checkbox" id="shoutHighlight"> Highlight in huddle
        </label>
        <button class="game-next" style="margin-top:10px;" onclick="postShoutout()">Send shout-out</button>
      </div>
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${(feed.shoutouts || []).length ? feed.shoutouts.map(s => `
          <div class="card">
            <p class="name">${escapeHTML(s.to_name)}</p>
            <p class="desc">${escapeHTML(s.message)}</p>
            <p class="desc">from ${escapeHTML(s.from_name || "Staff")}${s.highlight ? " · highlighted" : ""}</p>
          </div>
        `).join("") : `<div class="status"><strong>No shout-outs yet.</strong></div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function postShoutout() {
  try {
    await apiFetch("/api/shoutouts", {
      method: "POST",
      body: JSON.stringify({
        toUserId: Number(document.getElementById("shoutTo")?.value),
        message: document.getElementById("shoutMsg")?.value,
        highlight: document.getElementById("shoutHighlight")?.checked
      })
    });
    await apiFetch("/api/achievements/check", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function renderTeamChallengesBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading challenges…</strong></div>`;
  try {
    const data = await apiFetch("/api/team-challenges");
    const list = data.challenges || [];
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Team challenges</h2>
        <p>House goals the whole floor can push together. Progress ticks from Sell This and related actions.</p>
      </div>
      ${isManager() ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Title</label>
          <input id="challengeTitle" placeholder="50 Sell This completions this week" maxlength="160">
          <label style="margin-top:8px;">Goal count</label>
          <input id="challengeGoal" type="number" min="1" value="50">
          <label style="margin-top:8px;">Reward</label>
          <input id="challengeReward" placeholder="Shift snack / bragging rights" maxlength="200">
          <button class="game-next" style="margin-top:10px;" onclick="createTeamChallenge()">Launch challenge</button>
        </div>
      ` : ""}
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${list.length ? list.map(c => {
          const pct = Math.min(100, Math.round((c.progress_count / Math.max(1, c.goal_count)) * 100));
          return `
            <div class="card">
              <p class="name">${escapeHTML(c.title)}</p>
              <p class="desc">${c.progress_count} / ${c.goal_count} · ${pct}%${c.reward ? ` · Reward: ${escapeHTML(c.reward)}` : ""}</p>
              <div style="height:8px;background:#ddd;border-radius:4px;overflow:hidden;margin-top:8px;">
                <div style="height:100%;width:${pct}%;background:var(--green, #1f7a3f);"></div>
              </div>
            </div>
          `;
        }).join("") : `<div class="status"><strong>No active challenges.</strong>${isManager() ? " Create one above." : ""}</div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function createTeamChallenge() {
  try {
    await apiFetch("/api/team-challenges", {
      method: "POST",
      body: JSON.stringify({
        title: document.getElementById("challengeTitle")?.value,
        goalCount: Number(document.getElementById("challengeGoal")?.value) || 50,
        reward: document.getElementById("challengeReward")?.value
      })
    });
    render();
  } catch (err) {
    alert(err.message);
  }
}

async function renderTapChangeBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading tap changes…</strong></div>`;
  try {
    const data = await apiFetch("/api/tap-changes");
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>Tap change mode</h2>
        <p>Swap a beer → briefing, tasting prompt, flashcard, mini quiz, and Sell This in one shot.</p>
      </div>
      ${isManager() ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Tap #</label>
          <input id="tapNum" placeholder="12" maxlength="20">
          <label style="margin-top:8px;">Coming off</label>
          <input id="tapOld" placeholder="Old beer (optional)" maxlength="120">
          <label style="margin-top:8px;">Going on</label>
          <input id="tapNew" placeholder="New beer name" maxlength="120">
          <label style="margin-top:8px;">Talking points</label>
          <textarea id="tapTalk" rows="2" placeholder="Guest line in one sentence"></textarea>
          <label style="margin-top:8px;">Flavor notes</label>
          <textarea id="tapFlavor" rows="2" placeholder="Aroma / malt / finish"></textarea>
          <button class="game-next" style="margin-top:10px;" onclick="submitTapChange()">Publish tap change pack</button>
          <div id="tapChangeResult" style="margin-top:12px;"></div>
        </div>
      ` : ""}
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${(data.changes || []).length ? data.changes.map(c => `
          <div class="card">
            <p class="name">${c.tap_number ? `Tap ${escapeHTML(c.tap_number)}: ` : ""}${escapeHTML(c.new_beer)}</p>
            <p class="desc">${c.old_beer ? `Replaces ${escapeHTML(c.old_beer)}. ` : ""}${escapeHTML(c.talking_points || "")}</p>
            ${c.flavor_notes ? `<p class="desc">${escapeHTML(c.flavor_notes)}</p>` : ""}
          </div>
        `).join("") : `<div class="status"><strong>No recent tap changes.</strong></div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function submitTapChange() {
  const box = document.getElementById("tapChangeResult");
  try {
    const data = await apiFetch("/api/tap-changes", {
      method: "POST",
      body: JSON.stringify({
        tapNumber: document.getElementById("tapNum")?.value,
        oldBeer: document.getElementById("tapOld")?.value,
        newBeer: document.getElementById("tapNew")?.value,
        talkingPoints: document.getElementById("tapTalk")?.value,
        flavorNotes: document.getElementById("tapFlavor")?.value
      })
    });
    const pkg = data.package || {};
    if (box) {
      box.innerHTML = `
        <div class="guide-callout">
          <strong>Pack ready.</strong><br>
          Briefing: ${escapeHTML(pkg.briefing?.title || "")}<br>
          Quiz: ${escapeHTML(pkg.quiz?.question || "")} → ${escapeHTML(pkg.quiz?.answer || "")}<br>
          Flash: ${escapeHTML(pkg.flashcard?.front || "")} / ${escapeHTML(pkg.flashcard?.back || "")}<br>
          ${escapeHTML(pkg.tastingPrompt || "")}<br>
          Sell This Today updated.
        </div>
      `;
    }
    setTimeout(() => render(), 800);
  } catch (err) {
    alert(err.message);
  }
}

async function renderMenuPackageBoard(el) {
  el.innerHTML = `<div class="status"><strong>Loading menu packages…</strong></div>`;
  try {
    const data = await apiFetch("/api/menu-packages");
    el.innerHTML = `
      <div class="coffee-intro" style="padding-top:0;">
        <h2>New menu item package</h2>
        <p>One add → announcement, allergens, talking points, pairings, flashcard, and quiz.</p>
      </div>
      ${isManager() ? `
        <div class="auth-panel" style="max-width:760px;margin:0 auto 16px;">
          <label>Item name</label>
          <input id="mpName" maxlength="160" placeholder="New burger / cocktail / special">
          <label style="margin-top:8px;">Type</label>
          <select id="mpType"><option>food</option><option>beer</option><option>coffee</option><option>cocktail</option></select>
          <label style="margin-top:8px;">Ingredients</label>
          <textarea id="mpIng" rows="2"></textarea>
          <label style="margin-top:8px;">Allergens</label>
          <input id="mpAllergens" maxlength="400" placeholder="Dairy, gluten, nuts…">
          <label style="margin-top:8px;">Talking points</label>
          <textarea id="mpTalk" rows="2"></textarea>
          <label style="margin-top:8px;">Pairing notes</label>
          <textarea id="mpPair" rows="2"></textarea>
          <button class="game-next" style="margin-top:10px;" onclick="submitMenuPackage()">Generate package</button>
          <div id="menuPkgResult" style="margin-top:12px;"></div>
        </div>
      ` : ""}
      <div class="list" style="max-width:760px;margin:0 auto;">
        ${(data.packages || []).length ? data.packages.map(p => `
          <div class="card">
            <p class="coffee-section-num">${escapeHTML(p.item_type)}</p>
            <p class="name">${escapeHTML(p.item_name)}</p>
            <p class="desc">${escapeHTML(p.talking_points || "")}</p>
            ${p.allergens ? `<p class="desc"><strong>Allergens:</strong> ${escapeHTML(p.allergens)}</p>` : ""}
            ${p.pairing_notes ? `<p class="desc"><strong>Pair:</strong> ${escapeHTML(p.pairing_notes)}</p>` : ""}
            <p class="desc"><strong>Quiz:</strong> ${escapeHTML(p.quiz_question)} → ${escapeHTML(p.quiz_answer)}</p>
          </div>
        `).join("") : `<div class="status"><strong>No packages yet.</strong></div>`}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

async function submitMenuPackage() {
  const box = document.getElementById("menuPkgResult");
  try {
    const data = await apiFetch("/api/menu-packages", {
      method: "POST",
      body: JSON.stringify({
        itemName: document.getElementById("mpName")?.value,
        itemType: document.getElementById("mpType")?.value,
        ingredients: document.getElementById("mpIng")?.value,
        allergens: document.getElementById("mpAllergens")?.value,
        talkingPoints: document.getElementById("mpTalk")?.value,
        pairingNotes: document.getElementById("mpPair")?.value
      })
    });
    const g = data.generated || {};
    if (box) {
      box.innerHTML = `
        <div class="guide-callout">
          <strong>Generated.</strong><br>
          ${escapeHTML(g.briefingAnnouncement || "")}<br>
          Flash: ${escapeHTML(g.flashcard?.front || "")} / ${escapeHTML(g.flashcard?.back || "")}<br>
          ${escapeHTML(g.allergensDisclaimer || "")}
        </div>
      `;
    }
    setTimeout(() => render(), 800);
  } catch (err) {
    alert(err.message);
  }
}

async function renderAchievementsBoard(el) {
  if (!currentUser) {
    el.innerHTML = `<div class="auth-panel"><h3>Log in for clearance dossier</h3><button class="game-next" onclick="openAuthModal('login')">Log in</button></div>`;
    return;
  }
  el.innerHTML = `<div class="status"><strong>Decrypting clearance file…</strong></div>`;
  try {
    const data = await apiFetch("/api/achievements/me");
    const earnedCount = (data.catalog || []).filter(a => a.earned).length;
    const total = (data.catalog || []).length;
    el.innerHTML = `
      <div class="classified-dossier">
        <div class="classified-stamp">RESTRICTED</div>
        <p class="classified-eyebrow">${escapeHTML(data.header?.classification || "STAFF TRAINING — RESTRICTED")}</p>
        <h2>${escapeHTML(data.header?.dossier || "Clearance dossier")}</h2>
        <p class="desc">${escapeHTML(data.header?.facility || "Manhattan Project Beer Co.")} · ${earnedCount}/${total} files declassified · Tap coverage ${data.tastingCoverage ?? 0}%</p>
        ${(data.newlyEarned || []).length ? `<div class="guide-callout"><strong>New clearance:</strong> ${(data.catalog || []).filter(a => data.newlyEarned.includes(a.id)).map(a => a.title).map(escapeHTML).join(" · ")}</div>` : ""}
        <div class="classified-grid">
          ${(data.catalog || []).map(a => `
            <article class="classified-file${a.earned ? " declassified" : " sealed"}">
              <div class="classified-file-top">
                <span class="classified-level">${escapeHTML(a.clearance || "L?")}</span>
                <span class="classified-code">${escapeHTML(a.codename || "UNKNOWN")}</span>
              </div>
              <h3>${a.earned ? "" : "🔒 "}${escapeHTML(a.title)}</h3>
              <p>${a.earned ? escapeHTML(a.declassified || "Declassified.") : escapeHTML(a.hint || "Redacted.")}</p>
              ${a.earned && a.earnedAt ? `<p class="classified-meta">Opened ${escapeHTML(a.earnedAt)}</p>` : `<p class="classified-meta">${a.earned ? "DECLASSIFIED" : "CLASSIFIED"}</p>`}
            </article>
          `).join("")}
        </div>
        <h3 class="classified-subhead">Ops streaks</h3>
        <div class="list">
          ${(data.streaks || []).length ? data.streaks.map(s => `
            <div class="card">
              <p class="name">${escapeHTML(formatStreakKey(s.streak_key))}</p>
              <p class="desc">Current ${s.count} · Best ${s.best}${s.last_date ? ` · Last ${escapeHTML(s.last_date)}` : ""}</p>
            </div>
          `).join("") : `<div class="status"><strong>No streaks logged.</strong>Finish opening/closing checklists or hit a 5-answer Launch Pad streak.</div>`}
        </div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="status"><strong>${escapeHTML(err.message)}</strong></div>`;
  }
}

function formatStreakKey(key) {
  const labels = {
    answer_streak: "Critical Mass (answer streak)",
    closing_days: "Closing days",
    opening_days: "Opening days",
    checklist_days: "Checklist days",
    perfect_close_photos: "Close photo proof",
    opening_photos: "Open photo proof"
  };
  return labels[key] || String(key || "").replace(/_/g, " ");
}
