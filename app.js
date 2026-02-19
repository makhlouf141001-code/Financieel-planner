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
  return crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2);
}

function parseAmount(v) {
  if (typeof v !== "string") return Number(v) || 0;
  const s = v.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);
    const nowMm = now.toISOString().slice(0, 7);

    return {
      income: 0,
      items: [
        {
          id: uid(),
          name: "Huur",
          type: "fixed",
          category: "Wonen",
          amount: 900,
          frequency: "monthly",
          date: iso,
          note: "Rond de 1e",
          active: true,
        },
        {
          id: uid(),
          name: "Zorgverzekering",
          type: "fixed",
          category: "Verzekeringen",
          amount: 140,
          frequency: "monthly",
          date: iso,
          note: "",
          active: true,
        },
        {
          id: uid(),
          name: "Sparen",
          type: "savings",
          category: "Spaargeld",
