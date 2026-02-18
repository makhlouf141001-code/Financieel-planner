/* Financieel Planner PWA - alles lokaal (localStorage) */
const STORAGE_KEY = "fp_v1";

const TYPE_LABEL = {
  fixed: "Vaste lasten",
  optional: "Optioneel",
  debt: "Schulden",
  savings: "Spaargeld",
};

const FREQ_LABEL = {
  monthly: "Maandelijks",
  weekly: "Wekelijks",
  yearly: "Jaarlijks",
  once: "Eenmalig",
};

const TYPE_COLOR = {
  fixed: "var(--fixed)",
  optional: "var(--optional)",
  debt: "var(--debt)",
  savings: "var(--savings)",
};

const el = (id) => document.getElementById(id);
const fmtEUR = (n) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(
    isFinite(n) ? n : 0
  );

function uid() {
  return (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2));
}

function parseAmount(v) {
  if (typeof v !== "string") return Number(v) || 0;
  // allow "1.234,56" or "1234.56"
  const s = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    // Seed with a few examples (user can delete)
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);
    return {
      income: 0,
      items: [
        { id: uid(), name: "Huur", type: "fixed", category: "Wonen", amount: 900, frequency: "monthly", date: iso, note: "Rond de 1e", active: true },
        { id: uid(), name: "Zorgverzekering", type: "fixed", category: "Verzekeringen", amount: 140, frequency: "monthly", date: iso, note: "", active: true },
        { id: uid(), name: "Sparen", type: "savings", category: "Spaargeld", amount: 150, frequency: "monthly", date: iso, note: "Automatisch", active: true },
      ],
      monthCursor: new Date().toISOString().slice(0, 7), // YYYY-MM
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { income: 0, items: [], monthCursor: new Date().toISOString().slice(0, 7) };
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

/* Tabs */
document.querySelectorAll(".tab").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    el(b.dataset.tab).classList.add("active");
    setSubtitle(b.dataset.tab);
    if (b.dataset.tab === "agenda") renderAgenda();
    if (b.dataset.tab === "items") renderItems();
  });
});

function setSubtitle(tab) {
  const map = {
    dashboard: "Overzicht van je maand",
    agenda: "Planning van je posten",
    items: "Alles beheren op 1 plek",
    settings: "Back-up, import en reset",
  };
  el("subtitle").textContent = map[tab] || "";
}

/* Modal helpers */
const modalBack = el("modalBack");
const itemForm = el("itemForm");
const incomeForm = el("incomeForm");
const deleteBtn = el("deleteBtn");

function openModal(mode = "item") {
  modalBack.hidden = false;
  document.body.style.overflow = "hidden";
  if (mode === "income") {
    el("modalTitle").textContent = "Inkomen aanpassen";
    el("modalHint").textContent = "Dit bepaalt hoeveel je overhoudt.";
    itemForm.hidden = true;
    incomeForm.hidden = false;
    el("incomeInput").value = state.income ? String(state.income) : "";
    el("incomeInput").focus();
  } else {
    itemForm.hidden = false;
    incomeForm.hidden = true;
    el("name").focus();
  }
}

function closeModal() {
  modalBack.hidden = true;
  document.body.style.overflow = "";
  itemForm.reset();
  incomeForm.reset();
  el("itemId").value = "";
  deleteBtn.hidden = true;
}

el("closeModal").addEventListener("click", closeModal);
el("cancelBtn").addEventListener("click", closeModal);
el("incomeCancelBtn").addEventListener("click", closeModal);
modalBack.addEventListener("click", (e) => {
  // Safari/iOS kan de target anders doorgeven, dus:
  const modal = modalBack.querySelector(".modal");
  if (!modal) return closeModal();

  // Als je buiten de modal klikt (op de donkere achtergrond): sluiten
  if (!modal.contains(e.target)) closeModal();
});

// extra: touch support voor iPhone
modalBack.addEventListener(
  "touchstart",
  (e) => {
    const modal = modalBack.querySelector(".modal");
    if (!modal) return closeModal();
    if (!modal.contains(e.target)) closeModal();
  },
  { passive: true }
);

});

/* Income */
el("editIncomeBtn").addEventListener("click", () => openModal("income"));
incomeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.income = parseAmount(el("incomeInput").value);
  save(state);
  closeModal();
  renderAll();
  toast("Inkomen opgeslagen.");
});

/* Add / Edit items */
function fillForm(item) {
  el("itemId").value = item?.id || "";
  el("name").value = item?.name || "";
  el("type").value = item?.type || "fixed";
  el("category").value = item?.category || "";
  el("amount").value = item?.amount != null ? String(item.amount) : "";
  el("frequency").value = item?.frequency || "monthly";
  el("date").value = item?.date || new Date().toISOString().slice(0, 10);
  el("note").value = item?.note || "";
  el("active").checked = item?.active !== false;
  deleteBtn.hidden = !item;
  el("modalTitle").textContent = item ? "Post bewerken" : "Nieuwe post";
  el("modalHint").textContent = item
    ? "Pas aan en sla op. Je kunt hem ook verwijderen."
    : "Maak een nieuwe vaste last, optionele last, schuld of spaardoel.";
}

function openItem(item) {
  fillForm(item);
  openModal("item");
}

el("addItemBtn").addEventListener("click", () => openItem(null));
el("addQuickBtn").addEventListener("click", () => openItem(null));
el("toAgendaBtn").addEventListener("click", () => {
  document.querySelector('.tab[data-tab="agenda"]').click();
});

itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = el("itemId").value || uid();
  const item = {
    id,
    name: el("name").value.trim(),
    type: el("type").value,
    category: el("category").value.trim() || "Overig",
    amount: parseAmount(el("amount").value),
    frequency: el("frequency").value,
    date: el("date").value || new Date().toISOString().slice(0, 10),
    note: el("note").value.trim(),
    active: el("active").checked,
  };

  const idx = state.items.findIndex((x) => x.id === id);
  if (idx >= 0) state.items[idx] = item;
  else state.items.unshift(item);

  save(state);
  closeModal();
  renderAll();
  toast(idx >= 0 ? "Post bijgewerkt." : "Post toegevoegd.");
});

deleteBtn.addEventListener("click", () => {
  const id = el("itemId").value;
  if (!id) return;
  const item = state.items.find((x) => x.id === id);
  const ok = confirm(`Verwijder "${item?.name || "deze post"}"?`);
  if (!ok) return;
  state.items = state.items.filter((x) => x.id !== id);
  save(state);
  closeModal();
  renderAll();
  toast("Post verwijderd.");
});

/* Search/filters */
el("search").addEventListener("input", renderItems);
el("filterType").addEventListener("change", renderItems);
el("filterFreq").addEventListener("change", renderItems);

/* Agenda month nav */
el("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor = shiftMonth(state.monthCursor, -1);
  save(state);
  renderAgenda();
});
el("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor = shiftMonth(state.monthCursor, +1);
  save(state);
  renderAgenda();
});

function shiftMonth(yyyyMm, delta) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.toISOString().slice(0, 7);
}

/* Core calculations */
function monthRange(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

function clampDay(y, m0, day) {
  // month index m0
  const last = new Date(y, m0 + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

function occurrencesInMonth(item, yyyyMm) {
  if (!item.active) return [];
  const { start, end } = monthRange(yyyyMm);
  const y = start.getFullYear();
  const m0 = start.getMonth();

  const baseDate = item.date ? new Date(item.date + "T00:00:00") : start;
  const day = baseDate.getDate();

  if (item.frequency === "monthly") {
    const d = new Date(y, m0, clampDay(y, m0, day));
    return d >= start && d < end ? [d] : [];
  }

  if (item.frequency === "yearly") {
    const d = new Date(y, m0, clampDay(y, m0, day));
    // only if month matches baseDate month
    if (baseDate.getMonth() !== m0) return [];
    return d >= start && d < end ? [d] : [];
  }

  if (item.frequency === "once") {
    const d = baseDate;
    return d >= start && d < end ? [d] : [];
  }

  if (item.frequency === "weekly") {
    // generate weekly from baseDate forward/backward around month
    const out = [];
    // find first occurrence >= start
    let d = new Date(baseDate);
    // move backward until before start then forward
    while (d >= start) d = new Date(d.getTime() - 7 * 86400000);
    while (d < start) d = new Date(d.getTime() + 7 * 86400000);
    while (d < end) {
      out.push(new Date(d));
      d = new Date(d.getTime() + 7 * 86400000);
    }
    return out;
  }

  return [];
}

function monthlyTotals(yyyyMm) {
  const totals = { fixed: 0, optional: 0, debt: 0, savings: 0 };
  const byCategory = new Map(); // key: `${type}::${category}`
  const events = [];

  for (const item of state.items) {
    const occ = occurrencesInMonth(item, yyyyMm);
    for (const d of occ) {
      totals[item.type] += item.amount;
      const key = `${item.type}::${item.category || "Overig"}`;
      byCategory.set(key, (byCategory.get(key) || 0) + item.amount);
      events.push({
        id: item.id,
        name: item.name,
        type: item.type,
        category: item.category || "Overig",
        amount: item.amount,
        date: d,
        note: item.note || "",
      });
    }
  }

  events.sort((a, b) => a.date - b.date || a.name.localeCompare(b.name));
  return { totals, byCategory, events };
}

/* Render Dashboard */
function renderDashboard() {
  const yyyyMm = state.monthCursor || new Date().toISOString().slice(0, 7);
  const { totals, byCategory, events } = monthlyTotals(yyyyMm);

  const totalExpenses = totals.fixed + totals.optional + totals.debt + totals.savings;
  const leftover = (state.income || 0) - totalExpenses;

  el("incomeDisplay").textContent = fmtEUR(state.income || 0);
  el("totalExpenses").textContent = fmtEUR(totalExpenses);
  const lo = el("leftover");
  lo.textContent = fmtEUR(leftover);
  lo.classList.toggle("good", leftover >= 0);
  lo.classList.toggle("bad", leftover < 0);

  // Category totals (group by type then category)
  const container = el("categoryTotals");
  container.innerHTML = "";
  const grouped = {};
  for (const [key, val] of byCategory.entries()) {
    const [type, cat] = key.split("::");
    grouped[type] ||= [];
    grouped[type].push({ cat, val });
  }
  const order = ["fixed", "optional", "debt", "savings"];
  for (const type of order) {
    const arr = (grouped[type] || []).sort((a, b) => b.val - a.val);
    if (arr.length === 0) continue;

    // header row
    const hdr = document.createElement("div");
    hdr.className = "catrow";
    hdr.innerHTML = `
      <div class="catname">
        <span class="tag ${type}">${TYPE_LABEL[type]}</span>
        <span class="badge">${arr.length} categorieën</span>
      </div>
      <div class="money">${fmtEUR(arr.reduce((s, x) => s + x.val, 0))}</div>
    `;
    container.appendChild(hdr);

    for (const x of arr.slice(0, 6)) {
      const row = document.createElement("div");
      row.className = "catrow";
      row.innerHTML = `
        <div class="catname" style="opacity:.95">
          <span class="badge">${x.cat}</span>
        </div>
        <div class="money">${fmtEUR(x.val)}</div>
      `;
      container.appendChild(row);
    }
  }

  // Segmented bar
  const segbar = el("segbar");
  const segfooter = el("segfooter");
  segbar.innerHTML = "";
  const income = Math.max(0, state.income || 0);
  const max = Math.max(income, totalExpenses, 1);
  const parts = [
    { type: "fixed", val: totals.fixed },
    { type: "optional", val: totals.optional },
    { type: "debt", val: totals.debt },
    { type: "savings", val: totals.savings },
  ];
  for (const p of parts) {
    const w = (p.val / max) * 100;
    const div = document.createElement("div");
    div.className = "seg";
    div.style.width = `${Math.max(0, w)}%`;
    div.style.background = TYPE_COLOR[p.type];
    segbar.appendChild(div);
  }
  const overW = Math.max(0, ((income - totalExpenses) / max) * 100);
  if (income > totalExpenses) {
    const div = document.createElement("div");
    div.className = "seg";
    div.style.width = `${overW}%`;
    div.style.background = "rgba(53,208,127,.95)";
    segbar.appendChild(div);
  }
  segfooter.textContent =
    income === 0
      ? "Tip: vul je inkomen in voor een echte ‘over’-berekening."
      : `Uitgaven: ${fmtEUR(totalExpenses)} • Over: ${fmtEUR(income - totalExpenses)} • Maand: ${labelMonth(yyyyMm)}`;

  // Upcoming list: next 8 events from today within month cursor
  const today = new Date();
  const upcoming = events
    .filter((e) => e.date >= startOfDay(today))
    .slice(0, 8);

  const ul = el("upcomingList");
  ul.innerHTML = "";
  if (upcoming.length === 0) {
    ul.innerHTML = `<div class="muted">Geen komende posten (vanaf vandaag) in deze maand.</div>`;
  } else {
    for (const ev of upcoming) {
      const div = document.createElement("div");
      div.className = "item";
      div.addEventListener("click", () => openItem(state.items.find((x) => x.id === ev.id)));
      div.innerHTML = `
        <div>
          <div class="itemtitle">${escapeHtml(ev.name)}</div>
          <div class="itemmeta">
            ${shortDate(ev.date)} • <span class="tag ${ev.type}">${TYPE_LABEL[ev.type]}</span>
            <span class="badge">${escapeHtml(ev.category)}</span>
          </div>
        </div>
        <div class="money">${fmtEUR(ev.amount)}</div>
      `;
      ul.appendChild(div);
    }
  }
}

/* Render Agenda */
function renderAgenda() {
  const yyyyMm = state.monthCursor || new Date().toISOString().slice(0, 7);
  el("monthLabel").textContent = labelMonth(yyyyMm);

  const { events } = monthlyTotals(yyyyMm);
  const list = el("agendaList");
  list.innerHTML = "";

  if (events.length === 0) {
    list.innerHTML = `<div class="muted">Nog geen posten in deze maand. Voeg er één toe via “Posten”.</div>`;
    return;
  }

  let currentDay = "";
  for (const ev of events) {
    const dayKey = ev.date.toISOString().slice(0, 10);
    if (dayKey !== currentDay) {
      currentDay = dayKey;
      const h = document.createElement("div");
      h.className = "catrow";
      h.innerHTML = `
        <div class="catname"><span class="badge">${longDate(ev.date)}</span></div>
        <div class="badge">${weekday(ev.date)}</div>
      `;
      list.appendChild(h);
    }

    const div = document.createElement("div");
    div.className = "item";
    div.addEventListener("click", () => openItem(state.items.find((x) => x.id === ev.id)));
    div.innerHTML = `
      <div>
        <div class="itemtitle">${escapeHtml(ev.name)}</div>
        <div class="itemmeta">
          <span class="tag ${ev.type}">${TYPE_LABEL[ev.type]}</span>
          <span class="badge">${escapeHtml(ev.category)}</span>
          ${ev.note ? `<span class="badge">${escapeHtml(ev.note)}</span>` : ""}
        </div>
      </div>
      <div class="money">${fmtEUR(ev.amount)}</div>
    `;
    list.appendChild(div);
  }
}

/* Render Items */
function renderItems() {
  const q = (el("search").value || "").trim().toLowerCase();
  const t = el("filterType").value;
  const f = el("filterFreq").value;

  const items = state.items.filter((it) => {
    if (t !== "all" && it.type !== t) return false;
    if (f !== "all" && it.frequency !== f) return false;
    if (q) {
      const hay = `${it.name} ${it.category || ""} ${it.note || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const table = el("itemsTable");
  table.innerHTML = "";

  if (items.length === 0) {
    table.innerHTML = `<div class="muted">Geen resultaten. Probeer een andere filter of voeg een post toe.</div>`;
    return;
  }

  for (const it of items) {
    const div = document.createElement("div");
    div.className = "item";
    div.addEventListener("click", () => openItem(it));

    const activeBadge = it.active ? "" : `<span class="badge">Inactief</span>`;
    div.innerHTML = `
      <div>
        <div class="itemtitle">${escapeHtml(it.name)}</div>
        <div class="itemmeta">
          <span class="tag ${it.type}">${TYPE_LABEL[it.type]}</span>
          <span class="badge">${escapeHtml(it.category || "Overig")}</span>
          <span class="badge">${FREQ_LABEL[it.frequency]}</span>
          ${it.date ? `<span class="badge">${it.date}</span>` : ""}
          ${activeBadge}
        </div>
      </div>
      <div class="money">${fmtEUR(it.amount)}</div>
    `;
    table.appendChild(div);
  }
}

/* Settings: export/import/reset */
el("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `financieel-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Export gestart.");
});

el("importFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.items)) throw new Error("Ongeldig bestand");
    state = {
      income: Number(obj.income) || 0,
      items: obj.items.map((x) => ({
        id: x.id || uid(),
        name: String(x.name || ""),
        type: ["fixed", "optional", "debt", "savings"].includes(x.type) ? x.type : "fixed",
        category: String(x.category || "Overig"),
        amount: Number(x.amount) || 0,
        frequency: ["monthly", "weekly", "yearly", "once"].includes(x.frequency) ? x.frequency : "monthly",
        date: x.date || new Date().toISOString().slice(0, 10),
        note: String(x.note || ""),
        active: x.active !== false,
      })),
      monthCursor: obj.monthCursor || new Date().toISOString().slice(0, 7),
    };
    save(state);
    renderAll();
    toast("Import gelukt.");
  } catch (err) {
    alert("Import mislukt: " + (err?.message || err));
  } finally {
    e.target.value = "";
  }
});

el("resetBtn").addEventListener("click", () => {
  const ok = confirm("Weet je het zeker? Dit wist alles op dit apparaat.");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  state = load();
  save(state);
  renderAll();
  toast("Alles gereset.");
});

/* Helpers */
function labelMonth(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

function shortDate(d) {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
}

function longDate(d) {
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" });
}

function weekday(d) {
  return d.toLocaleDateString("nl-NL", { weekday: "long" });
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

/* Toast/status */
let toastTimer = null;
function toast(msg) {
  el("status").textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el("status").textContent = "Gereed."), 2600);
}

/* PWA install prompt */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = el("installBtn");
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }, { once: true });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/* Keyboard shortcut: Enter to quick-add when search focused */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalBack.hidden) closeModal();
  if (e.key === "Enter" && document.activeElement === el("search")) {
    openItem(null);
  }
});

/* Initial month label */
(function initMonthCursor() {
  if (!state.monthCursor) state.monthCursor = new Date().toISOString().slice(0, 7);
  // default to current month (so upcoming from today makes sense)
  const nowMm = new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(state.monthCursor)) state.monthCursor = nowMm;
  // keep cursor at now on fresh loads
  // (user can still navigate)
  save(state);
})();

function renderAll() {
  renderDashboard();
  renderAgenda();
  renderItems();
}

renderAll();
