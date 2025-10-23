// Elements
const routeSelect   = document.getElementById("routeSelect");
const baseMatSelect = document.getElementById("baseMatSelect");
const altMatSelect  = document.getElementById("altMatSelect");
const baseSearch    = document.getElementById("baseSearch");
const altSearch     = document.getElementById("altSearch");
const addBtn        = document.getElementById("addBtn");
const changesList   = document.getElementById("changesList");
const qtyInput      = document.getElementById("qty");
const qtyDec        = document.getElementById("qtyDec");
const qtyInc        = document.getElementById("qtyInc");

// Toast notification
function showToast(message, color = "var(--accent)") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Data (pełne z Twojego oryginału)
const routesByDay = {
  "Poniedziałek": Array.from({length:22}, (_,i)=>1101+i),
  "Wtorek":       Array.from({length:22}, (_,i)=>1201+i),
  "Środa":        Array.from({length:22}, (_,i)=>1301+i),
  "Czwartek":     Array.from({length:22}, (_,i)=>1401+i),
  "Piątek":       Array.from({length:22}, (_,i)=>1501+i)
};

const mats = [
  "klasyczna szara 150x85","klasyczna szara 200x115","klasyczna szara 300x85",
  "klasyczna szara 250x115","klasyczna szara 250x150","klasyczna szara 400x150",
  "klasyczna brązowa 250x115","bawełna extra 150x85","bawełna extra 200x115",
  "bawełna extra 250x150","bawełna extra 300x115","microtech 150x85",
  "microtech 200x115","microtech 250x150","klasyczna brązowa 150x85",
  "klasyczna brązowa 200x115","bordo 150x85","bordo 200x115",
  "bawełna plus 150x85","bawełna plus 200x115","bawełna plus 250x150",
  "scraper 150x85","scraper 200x115","scraper 300x115","scraper 240x150",
  "micromix 150x85","micromix 200x115","micromix 300x150"
];

// Populate routes with optgroups
function fillRoutes() {
  routeSelect.innerHTML = `<option value="">— wybierz trasę —</option>`;
  for (const [day, routes] of Object.entries(routesByDay)) {
    const group = document.createElement("optgroup");
    group.label = day;
    routes.forEach(r => {
      const opt = document.createElement("option");
      opt.value = String(r);
      opt.textContent = String(r);
      group.appendChild(opt);
    });
    routeSelect.appendChild(group);
  }
}

// Fill mat list with optional filter
function fillMatList(select, filter = "") {
  const list = mats.filter(m => m.toLowerCase().includes(filter.toLowerCase()));
  select.innerHTML = "";
  list.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  if (list.length > 0) {
    select.value = list[0];
    // wywołujemy change, żeby odblokować kolejne pola zgodnie z logiką
    select.dispatchEvent(new Event("change"));
  }
}

// State
let changes = JSON.parse(localStorage.getItem("changes") || "[]");

// Render changes as cards
function renderChanges() {
  changesList.innerHTML = "";
  if (changes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-card";
    empty.innerHTML = `<div class="item-meta"><span class="meta-label">Brak zmian</span></div>`;
    changesList.appendChild(empty);
    return;
  }

  changes.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "list-card";
    card.innerHTML = `
      <div class="item-head">
        <div class="item-title">Trasa ${c.route}</div>
        <span class="badge">×${c.qty}</span>
      </div>
      <div class="item-meta">
        <div class="meta-row"><span class="meta-label">Mata podstawowa:</span><span>${c.base}</span></div>
        <div class="meta-row"><span class="meta-label">Zamiennik:</span><span>${c.alt}</span></div>
      </div>
      <div class="item-actions">
        <button class="btn-danger" data-index="${i}" title="Usuń">🗑️ Usuń</button>
        <button class="btn-outline" data-edit="${i}" title="Edytuj ilość">✏️ Edytuj ilość</button>
      </div>
    `;
    changesList.appendChild(card);
  });

  // Obsługa usuwania
  changesList.querySelectorAll(".btn-danger").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-index"));
      removeChangeAnimated(index);
    });
  });

  // Obsługa edycji – teraz otwiera modal
  changesList.querySelectorAll(".btn-outline").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.getAttribute("data-edit"));
      openEditModal(index);   // <<< zamiast prompt()
    });
  });
}

function persist() {
  localStorage.setItem("changes", JSON.stringify(changes));
}

function removeChangeAnimated(index) {
  const card = changesList.children[index];
  if (!card) return removeChange(index);
  card.style.transition = "opacity 0.28s ease, transform 0.28s ease";
  card.style.opacity = "0";
  card.style.transform = "translateX(-16px)";
  setTimeout(() => {
    removeChange(index);
    showToast("🗑️ Zmiana usunięta", "var(--accent)");
  }, 280);
}

function removeChange(index) {
  changes.splice(index, 1);
  persist();
  renderChanges();
}

// Modal elements
const editModal    = document.getElementById("editModal");
const editQtyInput = document.getElementById("editQtyInput");
const editCancel   = document.getElementById("editCancel");
const editSave     = document.getElementById("editSave");
let editIndex = null;

function openEditModal(index) {
  editIndex = index;
  editQtyInput.value = changes[index].qty;
  editModal.style.display = "flex";
  editQtyInput.focus();
}

function closeEditModal() {
  editModal.style.display = "none";
  editIndex = null;
}

editCancel.addEventListener("click", closeEditModal);
editSave.addEventListener("click", () => {
  const parsed = Number(editQtyInput.value);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 100) {
    showToast("❌ Ilość musi być od 1 do 100!");
    return;
  }
  changes[editIndex].qty = parsed;
  persist();
  renderChanges();
  showToast("✅ Ilość zaktualizowana", "var(--primary)");
  closeEditModal();
});

// Form logic
routeSelect.addEventListener("change", () => {
  const enabled = routeSelect.value !== "";
  baseMatSelect.disabled = !enabled;
  baseSearch.disabled = !enabled;
  if (enabled) fillMatList(baseMatSelect);
  altMatSelect.disabled = true;
  altSearch.disabled = true;
  addBtn.disabled = true;
  baseMatSelect.value = "";
  altMatSelect.value = "";
});

baseMatSelect.addEventListener("change", () => {
  const enabled = baseMatSelect.value !== "";
  altMatSelect.disabled = !enabled;
  altSearch.disabled = !enabled;
  if (enabled) fillMatList(altMatSelect);
  altMatSelect.value = "";
  addBtn.disabled = true;
});

altMatSelect.addEventListener("change", () => {
  addBtn.disabled = altMatSelect.value === "";
});

baseSearch.addEventListener("input", e => fillMatList(baseMatSelect, e.target.value));
altSearch.addEventListener("input", e => fillMatList(altMatSelect, e.target.value));

// Qty controls
qtyDec.addEventListener("click", () => {
  const v = Number(qtyInput.value);
  qtyInput.value = Math.max(1, v - 1);
});
qtyInc.addEventListener("click", () => {
  const v = Number(qtyInput.value);
  qtyInput.value = Math.min(100, v + 1);
});

// Add change
addBtn.addEventListener("click", () => {
  const route = routeSelect.value;
  const base  = baseMatSelect.value;
  const alt   = altMatSelect.value;
  const qty   = Number(qtyInput.value);

  if (!route || !base || !alt) {
    showToast("⚠️ Wybierz trasę, matę i zamiennik!");
    return;
  }
  changes.push({ route, base, alt, qty });
  persist();
  renderChanges();
  showToast("✅ Dodano zmianę!", "var(--primary)");

  // Reset but keep route enabled
  baseMatSelect.disabled = true;
  baseSearch.disabled = true;
  altMatSelect.disabled = true;
  altSearch.disabled = true;
  addBtn.disabled = true;
  qtyInput.value = 1;

  if (routeSelect.value !== "") {
    baseMatSelect.disabled = false;
    baseSearch.disabled = false;
    fillMatList(baseMatSelect);
  }
});

// Init
fillRoutes();
renderChanges();

// Optional: register service worker for PWA (safe no-op if missing)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}