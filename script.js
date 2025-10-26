document.addEventListener("DOMContentLoaded", () => {
  
  // ==================== ROUTING SYSTEM ====================
  const views = {
    home: document.getElementById('homeView'),
    panel: document.getElementById('panelView'),
    mats: document.getElementById('matsView')
  };
  
  const headerTitle = document.getElementById('headerTitle');
  const backBtn = document.getElementById('backBtn');
  let currentView = 'home';
  
  function navigateTo(viewName) {
    // Ukryj wszystkie widoki
    Object.values(views).forEach(v => v?.classList.remove('active'));
    // Pokaż wybrany
    views[viewName]?.classList.add('active');
    currentView = viewName;
    
    // Zaktualizuj header
    if (viewName === 'home') {
      headerTitle.textContent = 'Centrum Główne';
      backBtn.style.display = 'none';
    } else if (viewName === 'panel') {
      headerTitle.textContent = 'Panel Tras i Zmian';
      backBtn.style.display = 'flex';
    } else if (viewName === 'mats') {
      headerTitle.textContent = 'Lista Mat Logo';
      backBtn.style.display = 'flex';
    }
    
    // Scroll do góry
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // Listenery nawigacji
  backBtn.addEventListener('click', () => navigateTo('home'));
  
  document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.navigate;
      navigateTo(target);
    });
  });
  
  // ==================== THEME TOGGLE ====================
  const themeToggle = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme") || 'light';
  document.body.className = savedTheme;

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    document.body.classList.toggle("light", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
  
  // ==================== TOAST ====================
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }
  
  // ==================== PORTAL SELECT SYSTEM ====================
  const selectPortal = document.getElementById('select-portal');
  let activeSelect = null;
  
  function createCustomSelect(wrapper, options, placeholder, stateKey, hasGroups = false) {
    wrapper.innerHTML = `
      <button type="button" class="custom-select-trigger placeholder" aria-haspopup="listbox" aria-expanded="false">${placeholder}</button>
      <div class="custom-select-panel" role="listbox">
        <input type="search" class="custom-select-search" placeholder="🔍 Szukaj...">
        <ul class="custom-select-options"></ul>
      </div>`;
    
    const trigger = wrapper.querySelector(".custom-select-trigger");
    const panel = wrapper.querySelector(".custom-select-panel");
    const searchInput = wrapper.querySelector(".custom-select-search");
    const optionsList = wrapper.querySelector(".custom-select-options");

    const selectInstance = {
        open: () => {
            if (activeSelect && activeSelect !== selectInstance) activeSelect.close();
            wrapper.classList.add("open");
            trigger.setAttribute("aria-expanded", "true");
            
            const rect = trigger.getBoundingClientRect();
            selectPortal.appendChild(panel);
            panel.style.position = 'fixed';
            panel.style.top = `${rect.bottom + 4}px`;
            panel.style.left = `${rect.left}px`;
            panel.style.width = `${rect.width}px`;
            panel.classList.add("open");
            
            populateOptions();
            searchInput.value = "";
            
            // Na mobile nie focusuj automatycznie (zapobiega otwieraniu klawiatury)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
            if (!isMobile) {
                searchInput.focus();
            }
            
            activeSelect = selectInstance;
        },
        close: () => {
            wrapper.classList.remove("open");
            trigger.setAttribute("aria-expanded", "false");
            panel.classList.remove("open");
            
            setTimeout(() => {
                if (!wrapper.classList.contains('open')) {
                    wrapper.appendChild(panel);
                    panel.style.cssText = '';
                }
            }, 300);

            if (activeSelect === selectInstance) activeSelect = null;
        },
        toggle: () => {
            if (wrapper.classList.contains("open")) selectInstance.close();
            else selectInstance.open();
        },
        reset: (newPlaceholder = placeholder) => {
            appState[stateKey] = '';
            trigger.textContent = newPlaceholder;
            trigger.classList.add('placeholder');
            selectInstance.close();
        }
    };
    
    function populateOptions(filter = "") {
      optionsList.innerHTML = "";
      let found = false;
      const processOption = (opt) => {
          const li = document.createElement("li");
          li.textContent = opt; li.dataset.value = opt; li.setAttribute('role', 'option');
          if (opt === appState[stateKey]) { li.classList.add("selected"); li.setAttribute('aria-selected', 'true'); }
          optionsList.appendChild(li);
      };

      if (hasGroups) {
          Object.entries(options).forEach(([groupName, groupOptions]) => {
              const filtered = groupOptions.filter(opt => String(opt).toLowerCase().includes(filter.toLowerCase()));
              if (filtered.length > 0) {
                  optionsList.insertAdjacentHTML('beforeend', `<li class="group-label">${groupName}</li>`);
                  filtered.forEach(processOption);
                  found = true;
              }
          });
      } else {
          const filteredOptions = options.filter(opt => opt.toLowerCase().includes(filter.toLowerCase()));
          if(filteredOptions.length > 0) {
              found = true;
              filteredOptions.forEach(processOption);
          }
      }
      if (!found) optionsList.innerHTML = `<li class="no-results">Brak wyników</li>`;
    }

    trigger.addEventListener("click", (e) => { e.stopPropagation(); selectInstance.toggle(); });
    searchInput.addEventListener("input", () => populateOptions(searchInput.value));
    panel.addEventListener("click", (e) => e.stopPropagation());

    optionsList.addEventListener("click", (e) => {
      if (e.target.tagName === "LI" && e.target.dataset.value) {
        // Blur search przed zamknięciem (zapobiega miganiu klawiatury)
        if (document.activeElement === searchInput) {
          searchInput.blur();
        }
        
        appState[stateKey] = e.target.dataset.value;
        trigger.textContent = appState[stateKey];
        trigger.classList.remove("placeholder");
        
        // Małe opóźnienie dla płynności
        setTimeout(() => {
          selectInstance.close();
          wrapper.dispatchEvent(new Event("change", { bubbles: true }));
        }, 50);
      }
    });

    wrapper.reset = selectInstance.reset;
    wrapper.close = selectInstance.close;
    return wrapper;
  }
  
  document.addEventListener("click", () => activeSelect?.close());
  
  // Na mobile nie zamykaj przy resize (klawiatura)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Zamknij tylko jeśli search nie ma focusa
      const searchHasFocus = document.activeElement?.classList.contains('custom-select-search');
      
      if (!searchHasFocus) {
        activeSelect?.close();
      }
    }, 150);
  }, true);
  
  // ==================== PANEL TRAS - ELEMENTY DOM ====================
  const routeCard = document.getElementById("routeCard");
  const baseCard = document.getElementById("baseCard");
  const altCard = document.getElementById("altCard");
  const addBtn = document.getElementById("addBtn");
  const changesList = document.getElementById("changesList");
  const printOutput = document.getElementById("print-output");

  const routeSelectWrapper = document.getElementById("routeSelectWrapper");
  const baseMatSelectWrapper = document.getElementById("baseMatSelectWrapper");
  const altMatSelectWrapper = document.getElementById("altMatSelectWrapper");
  const multiAltSelectWrapper = document.getElementById("multiAltSelectWrapper");

  const simpleModeContainer = document.getElementById("simpleModeContainer");
  const simpleClientInput = document.getElementById("simpleClientInput");
  const qtyInput = document.getElementById("qty");
  const qtyDec = document.getElementById("qtyDec");
  const qtyInc = document.getElementById("qtyInc");

  const advancedModeToggle = document.getElementById("advancedModeToggle");
  const advancedModeContainer = document.getElementById("advancedModeContainer");
  const advQtyBaseInput = document.getElementById("advQtyBase");
  const advQtyBaseDec = document.getElementById("advQtyBaseDec");
  const advQtyBaseInc = document.getElementById("advQtyBaseInc");
  const multiAltClientInput = document.getElementById("multiAltClientInput");
  const multiAltQtyInput = document.getElementById("multiAltQtyInput");
  const addTempAltBtn = document.getElementById("addTempAltBtn");
  const tempMultiAltList = document.getElementById("tempMultiAltList");

  let editIndex = null;
  const editSimpleModal = document.getElementById("editSimpleModal");
  const editSimpleQtyInput = document.getElementById("editSimpleQtyInput");
  const editSimpleClientInput = document.getElementById("editSimpleClientInput");
  const editSimpleCancel = document.getElementById("editSimpleCancel");
  const editSimpleSave = document.getElementById("editSimpleSave");

  const editAdvancedModal = document.getElementById("editAdvancedModal");
  const editAdvChangeDetails = document.getElementById("editAdvChangeDetails");
  const editAdvQtyBaseInput = document.getElementById("editAdvQtyBaseInput");
  const editAdvQtyBaseDec = document.getElementById("editAdvQtyBaseDec");
  const editAdvQtyBaseInc = document.getElementById("editAdvQtyBaseInc");
  const editMultiAltSelectWrapper = document.getElementById("editMultiAltSelectWrapper");
  const editMultiAltClientInput = document.getElementById("editMultiAltClientInput");
  const editMultiAltQtyInput = document.getElementById("editMultiAltQtyInput");
  const editAddTempAltBtn = document.getElementById("editAddTempAltBtn");
  const editTempMultiAltList = document.getElementById("editTempMultiAltList");
  const editAdvancedCancel = document.getElementById("editAdvancedCancel");
  const editAdvancedSave = document.getElementById("editAdvancedSave");
  let editTempAlternatives = [];

  const deleteModal = document.getElementById("deleteModal");
  const deleteModalText = document.getElementById("deleteModalText");
  const deleteCancel = document.getElementById("deleteCancel");
  const deleteConfirm = document.getElementById("deleteConfirm");
  let itemToDelete = { index: null, element: null };

  const deleteGroupModal = document.getElementById("deleteGroupModal");
  const deleteGroupModalText = document.getElementById("deleteGroupModalText");
  const deleteGroupCancel = document.getElementById("deleteGroupCancel");
  const deleteGroupConfirm = document.getElementById("deleteGroupConfirm");
  let routeGroupToDelete = { route: null, element: null };

  // ==================== PANEL TRAS - DANE ====================
  let changes = JSON.parse(localStorage.getItem("changes") || "[]");
  let tempAlternatives = [];
  let appState = {
      route: '', baseMat: '', altMat: '',
      multiAltMat: '', editMultiAltMat: ''
  };

  const routesByDay = {
    "Poniedziałek": Array.from({ length: 22 }, (_, i) => 1101 + i).concat([
      3152, 3153, 4161, 4162, 4163, 4164, 5171, 5172
    ]).sort((a, b) => a - b),
    "Wtorek": Array.from({ length: 22 }, (_, i) => 1201 + i).concat([
      3252, 3253, 4261, 4262, 4263, 4264, 5271, 5272
    ]).sort((a, b) => a - b),
    "Środa": Array.from({ length: 22 }, (_, i) => 1301 + i).concat([
      3352, 3353, 4361, 4362, 4363, 4364, 5371, 5372
    ]).sort((a, b) => a - b),
    "Czwartek": Array.from({ length: 22 }, (_, i) => 1401 + i).concat([
      3452, 3453, 4461, 4462, 4463, 4464, 5471, 5472
    ]).sort((a, b) => a - b),
    "Piątek": Array.from({ length: 22 }, (_, i) => 1501 + i).concat([
      3552, 3553, 4561, 4562, 4563, 4564, 4565, 5571, 5572
    ]).sort((a, b) => a - b),
    "Sobota": [1622]
  };
  
  const mats = [
    "klasyczna szara 150x85", "klasyczna szara 200x115", "klasyczna szara 300x85",
    "klasyczna szara 250x115", "klasyczna szara 250x150", "klasyczna szara 400x150",
    "klasyczna brązowa 250x115", "bawełna extra 150x85", "bawełna extra 200x115",
    "bawełna extra 250x150", "bawełna extra 300x115", "microtech 150x85",
    "microtech 200x115", "microtech 250x150", "klasyczna brązowa 150x85",
    "klasyczna brązowa 200x115", "bordo 150x85", "bordo 200x115",
    "bawełna plus 150x85", "bawełna plus 200x115", "bawełna plus 250x150",
    "scraper 150x85", "scraper 200x115", "scraper 300x115", "scraper 240x150",
    "micromix 150x85", "micromix 200x115", "micromix 300x150"
  ].sort();

  // ==================== PANEL TRAS - FUNKCJE ====================
  function updateFormState() {
    const routeSelected = !!appState.route;
    const baseMatSelected = !!appState.baseMat;
    const altMatSelected = !!appState.altMat;
    const isAdvanced = advancedModeToggle.checked;
    const advancedListHasItems = tempAlternatives.length > 0;
    baseCard.classList.toggle('form-section-disabled', !routeSelected);
    altCard.classList.toggle('form-section-disabled', !baseMatSelected);
    advancedModeToggle.disabled = !baseMatSelected;
    addBtn.disabled = !baseMatSelected || (isAdvanced ? !advancedListHasItems : !altMatSelected);
  }

  function renderTempAltList() {
    tempMultiAltList.innerHTML = tempAlternatives.length === 0 
      ? `<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Brak dodanych zamienników.</p>`
      : tempAlternatives.map((alt, index) => 
        `<div class="temp-alt-item">
          <div class="temp-alt-item-details">
            <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
            ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
          </div>
          <button class="btn-danger" data-index="${index}" aria-label="Usuń ten zamiennik">🗑️</button>
        </div>`).join('');
  }

  function renderEditTempAltList() {
    editTempMultiAltList.innerHTML = editTempAlternatives.length === 0
      ? `<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Brak dodanych zamienników.</p>`
      : editTempAlternatives.map((alt, index) =>
        `<div class="temp-alt-item">
          <div class="temp-alt-item-details">
            <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
            ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
          </div>
          <button class="btn-danger" data-index="${index}" aria-label="Usuń">🗑️</button>
        </div>`).join('');
  }

  function renderChanges() {
    const openRoutes = Array.from(changesList.querySelectorAll(".route-group.open")).map(g => g.dataset.route);
    changesList.innerHTML = "";

    if (changes.length === 0) {
      changesList.innerHTML = `<div class="empty-state"><svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg><div class="empty-state-text">Lista zmian jest pusta.<br>Wybierz trasę i dodaj pierwszą zmianę.</div></div>`;
      return;
    }

    const grouped = changes.reduce((acc, change, index) => {
      (acc[change.route] = acc[change.route] || []).push({ ...change, originalIndex: index });
      return acc;
    }, {});

    Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).forEach(route => {
      const wrapper = document.createElement("div");
      wrapper.className = "route-group";
      wrapper.dataset.route = route;
      if (openRoutes.includes(route)) wrapper.classList.add("open");

      wrapper.innerHTML = `<div class="route-header" data-action="toggle-group"><span class="route-title">Trasa ${route}</span><div class="route-meta"><button class="copy-route-btn" data-action="copy-group" aria-label="Kopiuj trasę"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button><button class="print-route-btn" data-action="print-group" aria-label="Drukuj trasę"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button><span class="badge">${grouped[route].length}</span><svg class="arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m9 18 6-6-6-6"/></svg></div></div><div class="route-body"><div><div class="route-changes-container"></div><button class="btn-delete-group" data-action="delete-group">❌ Usuń całą trasę ${route}</button></div></div>`;
      const changesContainer = wrapper.querySelector(".route-changes-container");

      grouped[route].forEach(c => {
        const item = document.createElement("div");
        item.className = "route-change";
        item.dataset.index = c.originalIndex;
        let detailsHtml;

        if (c.type === 'multi') {
            const altsHtml = c.alternatives.map(alt => `<li><span>${alt.alt}</span> <span class="badge">×${alt.qty}</span> ${alt.client ? `<span class="client-name">— ${alt.client}</span>` : ''}</li>`).join('');
            detailsHtml = `
              <div class="change-meta-row">
                <span class="change-meta-label">Baza:</span>
                <span class="change-meta-value">${c.base} <span class="badge">×${c.qtyBase}</span></span>
              </div>
              <div class="change-meta-row">
                <span class="change-meta-label">Zamienniki:</span>
                <span class="change-meta-value"><ul class="multi-alternatives-list">${altsHtml}</ul></span>
              </div>`;
        } else {
            const singleAltHtml = `
              <li>
                <span>${c.alt}</span> 
                <span class="badge">×${c.qty}</span> 
                ${c.client ? `<span class="client-name">— ${c.client}</span>` : ''}
              </li>
            `;
            detailsHtml = `
                <div class="change-meta-row">
                    <span class="change-meta-label">Baza:</span>
                    <span class="change-meta-value">${c.base} <span class="badge">×${c.qty}</span></span>
                </div>
                <div class="change-meta-row">
                    <span class="change-meta-label">Zamiennik:</span>
                    <span class="change-meta-value">
                        <ul class="multi-alternatives-list">${singleAltHtml}</ul>
                    </span>
                </div>
            `;
        }
        item.innerHTML = `<div class="change-details">${detailsHtml}</div><div class="change-actions"><button class="btn-danger" data-action="delete-item">🗑️ Usuń</button><button class="btn-secondary" data-action="edit-item">✏️ Edytuj</button></div>`;
        changesContainer.appendChild(item);
      });
      changesList.appendChild(wrapper);
    });
  }

  const persist = () => localStorage.setItem("changes", JSON.stringify(changes));
  const removeChange = (index) => { changes.splice(index, 1); persist(); };
  const removeRouteGroup = (route) => { changes = changes.filter(c => c.route !== route); persist(); };

  const openModal = (modal) => modal.style.display = "flex";
  const closeModal = (modal) => modal.style.display = "none";

  function openSimpleEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change) return;
    editSimpleQtyInput.value = change.qty;
    editSimpleClientInput.value = change.client || '';
    openModal(editSimpleModal);
    editSimpleQtyInput.focus();
  }

  function openAdvancedEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change) return;
    editAdvChangeDetails.innerHTML = `Edytujesz zmianę dla: <strong>${change.base}</strong> (Trasa ${change.route})`;
    editAdvQtyBaseInput.value = change.qtyBase;
    editTempAlternatives = JSON.parse(JSON.stringify(change.alternatives));
    renderEditTempAltList();
    openModal(editAdvancedModal);
  }
  
  function openDeleteModal(index, element) { 
    itemToDelete = { index, element }; 
    const change = changes[index]; 
    deleteModalText.innerHTML = `Na pewno usunąć zmianę dla maty:<br><b>${change.base}</b>?`; 
    openModal(deleteModal); 
  }
  
  function openDeleteGroupModal(route, element) { 
    routeGroupToDelete = { route, element }; 
    const changeCount = changes.filter(c => c.route === route).length; 
    deleteGroupModalText.innerHTML = `Na pewno usunąć trasę <b>${route}</b> i wszystkie <b>${changeCount}</b> powiązane z nią zmiany?`; 
    openModal(deleteGroupModal); 
  }

  editSimpleSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQty = Number(editSimpleQtyInput.value);
    if (isNaN(newQty) || newQty < 1 || newQty > 100) { showToast("Ilość musi być od 1 do 100!", "error"); return; }
    changes[editIndex].qty = newQty;
    changes[editIndex].client = editSimpleClientInput.value.trim();
    persist();
    renderChanges();
    showToast("✅ Zmiana zaktualizowana");
    closeModal(editSimpleModal);
  });

  editAdvancedSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQtyBase = Number(editAdvQtyBaseInput.value);
    if (isNaN(newQtyBase) || newQtyBase < 1 || newQtyBase > 100) { showToast("Ilość bazowa musi być od 1 do 100!", "error"); return; }
    if (editTempAlternatives.length === 0) { showToast("Musisz mieć przynajmniej jeden zamiennik!", "error"); return; }
    changes[editIndex].qtyBase = newQtyBase;
    changes[editIndex].alternatives = JSON.parse(JSON.stringify(editTempAlternatives));
    persist();
    renderChanges();
    showToast("✅ Zmiana zaktualizowana");
    closeModal(editAdvancedModal);
  });

  deleteConfirm.addEventListener("click", () => { 
    if (itemToDelete.index === null) return; 
    const { index, element } = itemToDelete; 
    element.classList.add("is-hiding"); 
    setTimeout(() => { removeChange(index); renderChanges(); showToast("🗑️ Zmiana usunięta", "error"); }, 300); 
    closeModal(deleteModal); 
  });
  
  deleteGroupConfirm.addEventListener("click", () => { 
    if (routeGroupToDelete.route === null) return; 
    const { route, element } = routeGroupToDelete; 
    element.classList.add("is-hiding"); 
    setTimeout(() => { removeRouteGroup(route); renderChanges(); showToast(`🗑️ Usunięto całą trasę ${route}`, "error"); }, 300); 
    closeModal(deleteGroupModal); 
  });
  
  [editSimpleCancel, editAdvancedCancel, deleteCancel, deleteGroupCancel].forEach(btn => 
    btn.addEventListener("click", () => closeModal(btn.closest('.modal')))
  );

  changesList.addEventListener("click", (e) => {
    const actionElement = e.target.closest("[data-action]");
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    const itemElement = e.target.closest(".route-change");
    const groupElement = e.target.closest(".route-group");
  
    switch (action) {
      case "delete-item": openDeleteModal(Number(itemElement.dataset.index), itemElement); break;
      case "edit-item": 
        const index = Number(itemElement.dataset.index); 
        const change = changes[index]; 
        if (change.type === 'multi') { openAdvancedEditModal(index); } 
        else { openSimpleEditModal(index); } 
        break;
      case "print-group":
        const route = groupElement.dataset.route;
        const routeChanges = changes.filter(c => c.route === route);
        if (routeChanges.length === 0) return;
        const printDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        let printHTML = `<div class="print-header"><img src="icons/icon-192.png" alt="Elis Logo"><div class="title-block"><h1>Raport Zmian Mat</h1><p>Trasa ${route} &nbsp;|&nbsp; Data: ${printDate}</p></div></div><h2>Lista zmian (${routeChanges.length})</h2>`;
        printHTML += routeChanges.map(c => {
          if (c.type === 'multi') {
            const alts = c.alternatives.map(alt => `<li>${alt.alt} (×${alt.qty})${alt.client ? ` <span class="client">— ${alt.client}</span>` : ''}</li>`).join('');
            return `<div class="print-change-item"><div class="base">${c.base} (ilość bazowa: ×${c.qtyBase})</div><ul class="multi-alt-list">${alts}</ul></div>`;
          }
          return `<div class="print-change-item"><div class="base">${c.base} (ilość bazowa: ×${c.qty})</div><div class="simple-alt">${c.alt} (×${c.qty})${c.client ? ` <span class="client">— ${c.client}</span>` : ''}</div></div>`;
        }).join('');
        printOutput.innerHTML = printHTML;
        setTimeout(() => { try { window.print(); } catch (error) { console.error("Błąd drukowania:", error); showToast("Błąd podczas otwierania okna drukowania.", "error"); } }, 100);
        break;
      case "copy-group":
        const routeToCopy = groupElement.dataset.route;
        const changesToCopy = changes.filter(c => c.route === routeToCopy);
        let textToCopy = `Trasa ${routeToCopy}:\n`;
        textToCopy += changesToCopy.map(c => {
          if (c.type === 'multi') {
            let multiText = `- ${c.base} (×${c.qtyBase}):\n`;
            multiText += c.alternatives.map(alt => `    ↪ ${alt.alt} (×${alt.qty})${alt.client ? ` [${alt.client}]` : ''}`).join('\n');
            return multiText;
          }
          return `- ${c.base} (×${c.qty}) -> ${c.alt} (×${c.qty})${c.client ? ` [${c.client}]` : ''}`;
        }).join("\n");
        navigator.clipboard.writeText(textToCopy).then(() => showToast("✅ Skopiowano do schowka!")).catch(() => showToast("❌ Błąd kopiowania", "error"));
        break;
      case "delete-group": openDeleteGroupModal(groupElement.dataset.route, groupElement); break;
      case "toggle-group": groupElement.classList.toggle("open"); break;
    }
  });

  routeSelectWrapper.addEventListener("change", () => { 
    advancedModeToggle.checked = false; 
    advancedModeToggle.dispatchEvent(new Event('change')); 
    baseMatSelectWrapper.reset('— wybierz matę —'); 
    altMatSelectWrapper.reset('— wybierz zamiennik —'); 
    updateFormState(); 
  });
  
  baseMatSelectWrapper.addEventListener("change", () => { 
    altMatSelectWrapper.reset('— wybierz zamiennik —'); 
    multiAltSelectWrapper.reset('— wybierz zamiennik —'); 
    updateFormState(); 
  });
  
  altMatSelectWrapper.addEventListener("change", updateFormState);
  
  advancedModeToggle.addEventListener("change", (e) => { 
    const isAdvanced = e.target.checked; 
    simpleModeContainer.style.display = isAdvanced ? "none" : "block"; 
    advancedModeContainer.style.display = isAdvanced ? "block" : "none"; 
    if (isAdvanced) { tempAlternatives = []; renderTempAltList(); } 
    updateFormState(); 
  });
  
  addTempAltBtn.addEventListener("click", () => { 
    const qty = Number(multiAltQtyInput.value); 
    const client = multiAltClientInput.value.trim(); 
    if (!appState.multiAltMat || qty < 1) { showToast("Wybierz zamiennik i poprawną ilość.", "error"); return; } 
    tempAlternatives.push({ alt: appState.multiAltMat, qty, client }); 
    renderTempAltList(); 
    multiAltSelectWrapper.reset("— wybierz zamiennik —"); 
    multiAltQtyInput.value = 1; 
    multiAltClientInput.value = ""; 
    updateFormState(); 
  });
  
  tempMultiAltList.addEventListener("click", (e) => { 
    const btn = e.target.closest('.btn-danger[data-index]'); 
    if (btn) { tempAlternatives.splice(Number(btn.dataset.index), 1); renderTempAltList(); updateFormState(); } 
  });
  
  editAddTempAltBtn.addEventListener("click", () => { 
    const qty = Number(editMultiAltQtyInput.value); 
    const client = editMultiAltClientInput.value.trim(); 
    if (!appState.editMultiAltMat || qty < 1) { showToast("Wybierz zamiennik i poprawną ilość.", "error"); return; } 
    editTempAlternatives.push({ alt: appState.editMultiAltMat, qty, client }); 
    renderEditTempAltList(); 
    editMultiAltSelectWrapper.reset("— wybierz zamiennik —"); 
    editMultiAltQtyInput.value = 1; 
    editMultiAltClientInput.value = ""; 
  });
  
  editTempMultiAltList.addEventListener("click", (e) => { 
    const btn = e.target.closest('.btn-danger[data-index]'); 
    if (btn) { editTempAlternatives.splice(Number(btn.dataset.index), 1); renderEditTempAltList(); } 
  });
  
  [editAdvQtyBaseDec, editAdvQtyBaseInc].forEach(btn => btn.addEventListener("click", (e) => { 
    const change = e.target.id.includes('Dec') ? -1 : 1; 
    editAdvQtyBaseInput.value = Math.max(1, Math.min(100, Number(editAdvQtyBaseInput.value) + change)); 
  }));
  
  addBtn.addEventListener("click", () => {
    if (!appState.route || !appState.baseMat) { showToast("Wybierz trasę i matę bazową!", "error"); return; }
    let newChange;
    if (advancedModeToggle.checked) {
      if (tempAlternatives.length === 0) { showToast("Dodaj przynajmniej jeden zamiennik!", "error"); return; }
      newChange = { type: 'multi', route: appState.route, base: appState.baseMat, qtyBase: Number(advQtyBaseInput.value), alternatives: [...tempAlternatives] };
    } else {
      if (!appState.altMat) { showToast("Wybierz zamiennik!", "error"); return; }
      newChange = { type: 'simple', route: appState.route, base: appState.baseMat, alt: appState.altMat, qty: Number(qtyInput.value), client: simpleClientInput.value.trim() };
    }
    changes.unshift(newChange);
    persist();
    renderChanges();
    showToast("✅ Dodano zmianę!");

    if (advancedModeToggle.checked) { advancedModeToggle.checked = false; advancedModeToggle.dispatchEvent(new Event('change')); }
    altMatSelectWrapper.reset('— wybierz zamiennik —');
    simpleClientInput.value = '';
    qtyInput.value = 1;
    advQtyBaseInput.value = 1;
    updateFormState();
    altCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  [qtyDec, qtyInc, advQtyBaseDec, advQtyBaseInc].forEach(btn => btn.addEventListener("click", (e) => { 
    const isAdv = e.target.id.includes('adv'); 
    const input = isAdv ? advQtyBaseInput : qtyInput; 
    const change = e.target.id.includes('Dec') ? -1 : 1; 
    input.value = Math.max(1, Math.min(100, Number(input.value) + change)); 
  }));

  // ==================== LISTA MAT LOGO ====================
  const logoData = [
    { name: "A&A", location: "2-1-7,,12", size: "", quantity: 5 },
    { name: "Abp", location: "2-4-17", size: "", quantity: 1 },
    { name: "Adrian", location: "2-8-7,8", size: "", quantity: 2 },
    { name: "Agata", location: "4-5-9,,11", size: "", quantity: 3 },
    { name: "Agata", location: "4-7-9", size: "", quantity: 1 },
    { name: "Alfa salon opty", location: "2-3-22", size: "", quantity: 1 },
    { name: "Alfa salon opty", location: "2-4-23", size: "", quantity: 1 },
    { name: "Allspice", location: "1-4-3,4,5", size: "", quantity: 3 },
    { name: "Amari", location: "1-3-15, 16", size: "", quantity: 2 },
    { name: "Amari", location: "1-4-17", size: "", quantity: 1 },
    { name: "Amari", location: "1-5-14", size: "", quantity: 1 },
    { name: "Amari", location: "1-5-17", size: "", quantity: 1 },
    { name: "Amcor", location: "4-6-11", size: "", quantity: 1 },
    { name: "Ameds", location: "1-9-12,, 16", size: "", quantity: 5 },
    { name: "Amlux", location: "1-2-5", size: "", quantity: 1 },
    { name: "Animal care center", location: "1-8-15", size: "", quantity: 1 },
    { name: "Apteka", location: "1-7-8,, 9,,10", size: "", quantity: 3 },
    { name: "Apteka Leko", location: "1-2-1", size: "", quantity: 1 },
    { name: "Arche Lublin", location: "2-9-15,,18", size: "", quantity: 3 },
    { name: "Arche Lublin", location: "4-4-3", size: "", quantity: 1 },
    { name: "Arche Naleczo", location: "1-6-1", size: "", quantity: 1 },
    { name: "Arche naleczo", location: "1-5-1, 2", size: "", quantity: 2 },
    { name: "Arche naleczo", location: "3-6-5", size: "", quantity: 1 },
    { name: "Astramed", location: "2-3-14", size: "115x200", quantity: 1 },
    { name: "Astramed", location: "2-3-16", size: "115x240", quantity: 1 },
    { name: "Astramed", location: "2-8-20", size: "150x250", quantity: 1 },
    { name: "Astramed", location: "3-6-1", size: "", quantity: 1 },
    { name: "Astramed", location: "3-6-2", size: "", quantity: 1 },
    { name: "Astramed", location: "4-7-8", size: "", quantity: 1 },
    { name: "Atelier fryzur", location: "2-11-6", size: "", quantity: 1 },
    { name: "Attica", location: "4-7-7", size: "", quantity: 1 },
    { name: "Auto nobile Ford", location: "2-2-3", size: "", quantity: 1 },
    { name: "BAIC", location: "1-2-5", size: "", quantity: 1 },
    { name: "BAIC", location: "1-2-6", size: "", quantity: 1 },
    { name: "BAIC", location: "1-2-8", size: "", quantity: 1 },
    { name: "BCB", location: "4-2-5,, 7", size: "", quantity: 3 },
    { name: "BWM Electronic", location: "4-4-1", size: "", quantity: 1 },
    { name: "Basf", location: "4-2-9,, 10", size: "", quantity: 2 },
    { name: "Bcb", location: "1-8-2", size: "", quantity: 1 },
    { name: "Beaute&barber", location: "1-6-5", size: "", quantity: 1 },
    { name: "Beauty centr estet", location: "1-8-11", size: "", quantity: 1 },
    { name: "Beauty experts", location: "1-1-22", size: "", quantity: 1 },
    { name: "Beauty medical", location: "2-7-25", size: "", quantity: 1 },
    { name: "Benepol", location: "1-6-22", size: "", quantity: 1 },
    { name: "Big sale shop", location: "4-4-6", size: "", quantity: 1 },
    { name: "Biologique recherche", location: "1-1-21", size: "", quantity: 1 },
    { name: "Bobrowy dwór", location: "2-6-5", size: "", quantity: 1 },
    { name: "Bosko wlosko", location: "2-5-25", size: "", quantity: 1 },
    { name: "Bricomarche", location: "4-4-10,11", size: "", quantity: 2 },
    { name: "Bs, Bw wys mazo", location: "1-9-26", size: "", quantity: 1 },
    { name: "Butelkownia", location: "3-2-5,6", size: "", quantity: 2 },
    { name: "CT card", location: "1-8-25", size: "", quantity: 1 },
    { name: "Campanile", location: "1-4-1, 2", size: "", quantity: 2 },
    { name: "Campanile", location: "3-3-1", size: "", quantity: 1 },
    { name: "Canal +", location: "4-5-7,8", size: "", quantity: 2 },
    { name: "Candy park", location: "4-1-1,2", size: "", quantity: 2 },
    { name: "Casa mia frog", location: "1-11-24", size: "", quantity: 1 },
    { name: "Cbl", location: "3-8-1", size: "", quantity: 1 },
    { name: "Cbl", location: "4-4-4,5", size: "", quantity: 2 },
    { name: "Cbl łódź", location: "4-6-3", size: "", quantity: 1 },
    { name: "Centrodent", location: "1-3-5", size: "", quantity: 1 },
    { name: "Centrum dentystyczne", location: "1-2-18", size: "", quantity: 1 },
    { name: "Centrum med ogro", location: "3-4-1, 2", size: "", quantity: 2 },
    { name: "Centrum med ogrod", location: "2-6-21, 22", size: "", quantity: 2 },
    { name: "Centrum strzeleckie", location: "3-5-4", size: "", quantity: 1 },
    { name: "Cis frampol", location: "2-6-7,, 8", size: "", quantity: 2 },
    { name: "Citi handlowy", location: "1-9-8,,11", size: "", quantity: 4 },
    { name: "Colibra", location: "1-7-5", size: "", quantity: 1 },
    { name: "Comet", location: "3-4-4", size: "", quantity: 1 },
    { name: "Comitor", location: "1-8-9", size: "", quantity: 1 },
    { name: "Comitor", location: "3-7-10", size: "", quantity: 1 },
    { name: "Concept", location: "3-4-3", size: "", quantity: 1 },
    { name: "Cosmet", location: "1-4-7", size: "", quantity: 1 },
    { name: "Cud miód", location: "1-10-8,,9", size: "", quantity: 2 },
    { name: "Cupra studio wawa", location: "3-5-6", size: "", quantity: 1 },
    { name: "DHL", location: "1-1-14", size: "", quantity: 1 },
    { name: "DHL", location: "1-1-15", size: "", quantity: 1 },
    { name: "DHL", location: "1-3-12, 13, 14", size: "", quantity: 1 },
    { name: "Daito sushi", location: "1-7-1,, 2", size: "", quantity: 2 },
    { name: "Dbk", location: "3-3-10", size: "", quantity: 1 },
    { name: "Dbk", location: "4-3-4,5", size: "", quantity: 2 },
    { name: "Dcp", location: "1-2-10", size: "", quantity: 2 },
    { name: "Dcp", location: "1-2-11", size: "", quantity: 1 },
    { name: "Denis", location: "1-12-24", size: "", quantity: 1 },
    { name: "Dentis", location: "3-8-2", size: "", quantity: 1 },
    { name: "Der clinic", location: "2-10-17", size: "", quantity: 1 },
    { name: "Der elefant", location: "2-0-2", size: "", quantity: 1 },
    { name: "Dewocjonalia", location: "2-11-10", size: "", quantity: 1 },
    { name: "Diasfera", location: "1-12-20,,23", size: "", quantity: 4 },
    { name: "Diaverum", location: "1-5-3", size: "", quantity: 1 },
    { name: "Diazzuro", location: "2-2-22", size: "", quantity: 1 },
    { name: "Dobratu", location: "2-1-6", size: "", quantity: 1 },
    { name: "Dobratu", location: "2-2-5", size: "", quantity: 1 },
    { name: "Dobratu", location: "2-2-6", size: "", quantity: 1 },
    { name: "Dobratu", location: "2-2-7", size: "", quantity: 1 },
    { name: "Dock 19", location: "1-1-17", size: "", quantity: 1 },
    { name: "Domoteka - paleta", location: "", size: "", quantity: 0 },
    { name: "Doz", location: "1-2-26", size: "", quantity: 1 },
    { name: "Doz", location: "2-11-21,,24", size: "", quantity: 4 },
    { name: "Doz", location: "3-3-8,9", size: "", quantity: 2 },
    { name: "Doz", location: "3-6-7,, 9", size: "", quantity: 3 },
    { name: "Dr Gerard", location: "1-2-21", size: "", quantity: 1 },
    { name: "Drilango", location: "1-9-19,, 20", size: "", quantity: 2 },
    { name: "Driveland (mała)", location: "2-10-7", size: "", quantity: 1 },
    { name: "Driveland", location: "3-2-4", size: "", quantity: 1 },
    { name: "Dsm firmenich", location: "2-2-8", size: "", quantity: 1 },
    { name: "Eco babice", location: "2-7-16", size: "", quantity: 1 },
    { name: "Eco classic", location: "2-3-10", size: "", quantity: 1 },
    { name: "Eco classic", location: "2-5-1,, 2", size: "", quantity: 2 },
    { name: "Eco", location: "1-4-16", size: "", quantity: 1 },
    { name: "Eduventura", location: "3-2-9", size: "", quantity: 1 },
    { name: "El box", location: "2-10-21", size: "", quantity: 1 },
    { name: "El box", location: "4-7-11", size: "", quantity: 1 },
    { name: "Ela", location: "1-6-6", size: "", quantity: 1 },
    { name: "El box", location: "2-9-22", size: "", quantity: 1 },
    { name: "Elsner", location: "1-10-18,, 21", size: "", quantity: 4 },
    { name: "Emil frey", location: "4-5-2, 3", size: "", quantity: 2 },
    { name: "Emsur", location: "3-5-7", size: "", quantity: 1 },
    { name: "Energym", location: "1-11-11", size: "", quantity: 1 },
    { name: "Ered", location: "1-12-22", size: "", quantity: 2 },
    { name: "Eskulap", location: "1-1-24", size: "", quantity: 1 },
    { name: "Eskulap", location: "1-2-24", size: "", quantity: 1 },
    { name: "Eskulap", location: "1-3-23,24", size: "", quantity: 2 },
    { name: "Euro rent zala", location: "2-2-4", size: "", quantity: 1 },
    { name: "Euro rent zala", location: "2-3-4", size: "", quantity: 1 },
    { name: "Euroglass", location: "4-2-11", size: "", quantity: 1 },
    { name: "Eva best med", location: "1-8-16", size: "", quantity: 1 },
    { name: "Eva park", location: "2-3-6,,8", size: "", quantity: 3 },
    { name: "Eva park", location: "3-4-11", size: "", quantity: 1 },
    { name: "Faller bia", location: "4-6-6,7", size: "", quantity: 2 },
    { name: "Faller pomar", location: "4-6-5", size: "", quantity: 1 },
    { name: "Family pets", location: "1-11-27", size: "", quantity: 1 },
    { name: "Faurecia", location: "2-6-23", size: "", quantity: 1 },
    { name: "Fiat", location: "1-11-3", size: "", quantity: 1 },
    { name: "Filman", location: "1-7-23", size: "", quantity: 1 },
    { name: "Firmenich", location: "1-3-11", size: "", quantity: 1 },
    { name: "Flisac", location: "2-5-13,,15", size: "", quantity: 3 },
    { name: "Flisac", location: "4-3-3", size: "", quantity: 1 },
    { name: "Florapoint", location: "2-7-26", size: "", quantity: 1 },
    { name: "Florapoint", location: "2-8-25, 26", size: "", quantity: 2 },
    { name: "Flugger", location: "1-5-18,23", size: "", quantity: 6 },
    { name: "Flugger", location: "1-6-20", size: "", quantity: 1 },
    { name: "Flugger", location: "2-2-12,,18", size: "", quantity: 7 },
    { name: "Flugger", location: "2-3-12", size: "", quantity: 1 },
    { name: "Flugger", location: "2-3-13", size: "", quantity: 1 },
    { name: "Flugger", location: "2-3-17", size: "", quantity: 1 },
    { name: "Flugger", location: "2-3-9", size: "", quantity: 1 },
    { name: "Flugger", location: "2-8-16", size: "", quantity: 1 },
    { name: "Flugger", location: "2-8-23", size: "", quantity: 1 },
    { name: "Focus hotel", location: "2-2-23,,24", size: "", quantity: 2 },
    { name: "Fresh gelato", location: "1-7-4", size: "", quantity: 1 },
    { name: "Fuji film", location: "1-11-1,, 2", size: "", quantity: 2 },
    { name: "Fuji film", location: "3-7-1", size: "", quantity: 1 },
    { name: "Gabriella", location: "2-6-1", size: "", quantity: 1 },
    { name: "Galeria koloru", location: "1-4-18", size: "", quantity: 1 },
    { name: "Galileo", location: "1-5-4,-,6", size: "", quantity: 3 },
    { name: "Galileo", location: "1-6-3", size: "", quantity: 1 },
    { name: "Galileo", location: "1-6-4", size: "", quantity: 1 },
    { name: "Galileo", location: "1-6-7", size: "", quantity: 1 },
    { name: "Gamma knife", location: "2-2-25", size: "", quantity: 1 },
    { name: "Gamma knife", location: "4-4-6", size: "", quantity: 1 },
    { name: "Garden party", location: "1-10-22", size: "", quantity: 1 },
    { name: "Garncarz", location: "2-2-19", size: "", quantity: 1 },
    { name: "Geberit", location: "3-5-8", size: "", quantity: 1 },
    { name: "Gmina Wiązowna", location: "1-8-13,, 14", size: "", quantity: 2 },
    { name: "Golden rosa", location: "2-1-14", size: "", quantity: 1 },
    { name: "Golden tulip", location: "4-3-6,7", size: "", quantity: 2 },
    { name: "Goś", location: "2-4-20,, 21", size: "", quantity: 2 },
    { name: "Grafotronic", location: "1-2-15", size: "", quantity: 1 },
    { name: "Grafotronic", location: "3-6-3", size: "", quantity: 1 },
    { name: "Grand medical", location: "1-9-3,, 5", size: "", quantity: 3 },
    { name: "H15 patio", location: "1-9-1", size: "", quantity: 1 },
    { name: "Hard rock Cafe", location: "4-6-1,2", size: "", quantity: 2 },
    { name: "Heban", location: "3-5-1, 2", size: "", quantity: 2 },
    { name: "Heksagon", location: "2-3-26", size: "", quantity: 1 },
    { name: "Helly hansen", location: "1-10-11,, 12", size: "", quantity: 2 },
    { name: "Helly hansen", location: "1-10-6, 7", size: "", quantity: 2 },
    { name: "Hiloft", location: "1-9-2", size: "", quantity: 1 },
    { name: "Honda", location: "4-2-1", size: "", quantity: 1 },
    { name: "Honda", location: "4-7-5", size: "", quantity: 1 },
    { name: "Hospittal", location: "1-11-21", size: "", quantity: 1 },
    { name: "Hotel 500", location: "3-4-10", size: "", quantity: 1 },
    { name: "Hotel Mikołajki", location: "1-5-7,-9,", size: "", quantity: 3 },
    { name: "Hotel Mikołajki", location: "4-7-6", size: "", quantity: 1 },
    { name: "Hunnebeck", location: "2-4-19", size: "", quantity: 1 },
    { name: "Hunnebeck", location: "2-5-19,, 20", size: "", quantity: 2 },
    { name: "Hunnebeck", location: "2-6-19,20", size: "", quantity: 2 },
    { name: "Hunnebeck", location: "3-5-3", size: "", quantity: 1 },
    { name: "Hunnebeck", location: "3-6-4", size: "", quantity: 1 },
    { name: "Hush Office", location: "1-11-13,,14", size: "", quantity: 2 },
    { name: "IQ marketing", location: "1-2-25", size: "", quantity: 0 },
    { name: "Ibis styles", location: "2-5-17,,18", size: "", quantity: 2 },
    { name: "Int Group (Jnt Group)", location: "2-4-16", size: "", quantity: 1 },
    { name: "Interfiber", location: "2-7-15", size: "", quantity: 1 },
    { name: "Intersnack", location: "2-10-15", size: "", quantity: 1 },
    { name: "Jan sander", location: "1-10-15", size: "", quantity: 1 },
    { name: "Jassmine", location: "1-3-8,10", size: "", quantity: 3 },
    { name: "Jazbud", location: "1-3-20", size: "", quantity: 1 },
    { name: "Jumpout", location: "3-1-3", size: "", quantity: 1 },
    { name: "Jungheinrich", location: "3-6-6", size: "", quantity: 1 },
    { name: "Just beck", location: "1-12-26", size: "", quantity: 1 },
    { name: "Kam", location: "1-4-12", size: "", quantity: 1 },
    { name: "Kam", location: "1-5-12,13", size: "", quantity: 2 },
    { name: "Kamienica 111A", location: "2-6-12", size: "", quantity: 1 },
    { name: "Katcon polska", location: "1-6-24", size: "", quantity: 1 },
    { name: "Kia", location: "1-1-5", size: "", quantity: 1 },
    { name: "Kia", location: "1-1-6", size: "", quantity: 1 },
    { name: "Kinder garden", location: "1-7-11,,19", size: "", quantity: 9 },
    { name: "King kong tha", location: "2-6-18", size: "", quantity: 1 },
    { name: "Klinika młodości", location: "2-11-5", size: "", quantity: 1 },
    { name: "Knight frank", location: "2-11-16, 17", size: "", quantity: 2 },
    { name: "Koki", location: "4-4-2", size: "", quantity: 1 },
    { name: "Koliber", location: "1-7-6", size: "", quantity: 1 },
    { name: "Koliber", location: "1-8-5", size: "", quantity: 1 },
    { name: "Kolmet", location: "1-6-25,,26,", size: "", quantity: 2 },
    { name: "Kolorowe Gary", location: "1-9-6,, 7", size: "", quantity: 2 },
    { name: "Kolumna park", location: "2-3-18", size: "", quantity: 1 },
    { name: "Kolumna park", location: "2-4-18", size: "", quantity: 1 },
    { name: "Kolumna park", location: "4-6-10", size: "", quantity: 1 },
    { name: "Komatsu", location: "1-8-1", size: "", quantity: 1 },
    { name: "Komeko", location: "2-8-19", size: "", quantity: 1 },
    { name: "Kominki Ostrowski", location: "2-11-7, 8", size: "", quantity: 2 },
    { name: "Kominki Ostrowski", location: "2-3-11", size: "", quantity: 1 },
    { name: "Kongsberg", location: "2-10-6", size: "", quantity: 1 },
    { name: "Kongsberg", location: "4-7-10", size: "", quantity: 1 },
    { name: "Kongsberg auto", location: "2-9-11", size: "", quantity: 1 },
    { name: "Kotniz", location: "1-7-3", size: "", quantity: 1 },
    { name: "Krajowa", location: "3-1-6,7", size: "", quantity: 2 },
    { name: "Krowy", location: "2-8-24", size: "", quantity: 1 },
    { name: "Krowy", location: "3-3-5", size: "", quantity: 1 },
    { name: "Leasys", location: "1-11-7,10", size: "", quantity: 4 },
    { name: "Lekarka wlk", location: "2-7-9", size: "", quantity: 1 },
    { name: "Len bawełna", location: "1-3-22", size: "", quantity: 1 },
    { name: "Len bawełna", location: "1-6-21", size: "", quantity: 1 },
    { name: "Lewiatan", location: "2-7-7", size: "", quantity: 1 },
    { name: "Lexus", location: "4-5-1", size: "", quantity: 1 },
    { name: "Liberty corner", location: "2-8-3,5", size: "", quantity: 3 },
    { name: "Liberty corner", location: "2-9-1", size: "", quantity: 1 },
    { name: "Liceum dalego", location: "1-4-10", size: "", quantity: 2 },
    { name: "Lipari", location: "1-6-23", size: "", quantity: 1 },
    { name: "Lipari", location: "1-7-21", size: "", quantity: 1 },
    { name: "Loreal", location: "3-6-11", size: "", quantity: 1 },
    { name: "Loreal mono", location: "1-6-23", size: "", quantity: 1 },
    { name: "Loreal mono", location: "1-7-22", size: "", quantity: 1 },
    { name: "Lsc communication", location: "4-2-3", size: "", quantity: 1 },
    { name: "Luba dental", location: "1-10-16", size: "", quantity: 2 },
    { name: "Lukasiewicz auto", location: "2-10-8", size: "", quantity: 1 },
    { name: "Madison", location: "2-6-11", size: "", quantity: 1 },
    { name: "Madison", location: "3-6-10", size: "", quantity: 1 },
    { name: "Makro", location: "2-10-3,4", size: "", quantity: 2 },
    { name: "Manifaktura", location: "2-4-22", size: "", quantity: 1 },
    { name: "Manor house", location: "2-8-13", size: "", quantity: 1 },
    { name: "Manor house", location: "3-8-8,, 11", size: "", quantity: 4 },
    { name: "Mars petcare", location: "4-2-8", size: "", quantity: 1 },
    { name: "Masters", location: "2-6-16", size: "", quantity: 1 },
    { name: "Matcars", location: "1-5-15", size: "", quantity: 1 },
    { name: "Max frank", location: "1-11-17,, 19", size: "", quantity: 3 },
    { name: "Mazovia hotel", location: "3-5-10", size: "", quantity: 1 },
    { name: "Mazowsze rest", location: "2-3-20", size: "", quantity: 1 },
    { name: "Mazurkas", location: "1-12-3,,5", size: "", quantity: 2 },
    { name: "Mazurkas", location: "3-2-1, 2", size: "", quantity: 2 },
    { name: "Mazurkas", location: "3-7-2, 3", size: "", quantity: 2 },
    { name: "Mazurkas", location: "3-7-6,7", size: "", quantity: 2 },
    { name: "Meblotap", location: "3-3-3", size: "", quantity: 1 },
    { name: "Medyk", location: "2-6-4", size: "", quantity: 1 },
    { name: "Mera WTK (Regał)", location: "", size: "", quantity: 16 },
    { name: "Mercure wiazo", location: "3-1-8", size: "", quantity: 1 },
    { name: "Mg pgd", location: "3-8-3", size: "", quantity: 1 },
    { name: "Mg pgd grupa", location: "1-11-25", size: "", quantity: 1 },
    { name: "Mini Europa", location: "3-2-7,8", size: "", quantity: 2 },
    { name: "Mini raj", location: "1-7-25", size: "", quantity: 1 },
    { name: "Mio", location: "1-12-11", size: "", quantity: 1 },
    { name: "Miromix 100x120", location: "2-1-21", size: "", quantity: 1 },
    { name: "Mk Szuster", location: "1-1-23", size: "", quantity: 1 },
    { name: "Mochowo", location: "1-3-25, 26", size: "", quantity: 2 },
    { name: "Mochowo", location: "2-10-26", size: "", quantity: 1 },
    { name: "Mochowo hubalcz", location: "2-4-26", size: "", quantity: 1 },
    { name: "Mochowo hubalcz", location: "2-9-26", size: "", quantity: 1 },
    { name: "Modelowanie sylwetki", location: "2-10-1", size: "", quantity: 1 },
    { name: "Modlin", location: "2-8-1, 2", size: "", quantity: 2 },
    { name: "Modlin", location: "3-5-5", size: "", quantity: 1 },
    { name: "Monkey Love", location: "1-3-19", size: "", quantity: 1 },
    { name: "Mono symfonia", location: "2-10-10,11", size: "", quantity: 2 },
    { name: "Motylkowa", location: "1-4-10", size: "", quantity: 2 },
    { name: "Msn", location: "4-3-1,2", size: "", quantity: 2 },
    { name: "Mytlewski cuk.", location: "1-4-6", size: "", quantity: 1 },
    { name: "Młyn smaków", location: "1-6-13", size: "", quantity: 1 },
    { name: "Ndap", location: "3-3-7", size: "", quantity: 1 },
    { name: "Netto", location: "1-7-24", size: "", quantity: 1 },
    { name: "Niewinni czarodzieje", location: "1-6-9", size: "", quantity: 1 },
    { name: "Noelle", location: "2-0-3", size: "", quantity: 1 },
    { name: "Noelle", location: "2-1-2", size: "", quantity: 1 },
    { name: "Noelle", location: "2-2-2", size: "", quantity: 1 },
    { name: "Nolita", location: "2-11-4", size: "", quantity: 1 },
    { name: "Nordson", location: "2-11-11,,15", size: "", quantity: 5 },
    { name: "Nowy gurewicz", location: "2-2-10,,11", size: "", quantity: 2 },
    { name: "Nowy gurewicz", location: "4-1-6", size: "", quantity: 1 },
    { name: "Olimpia fitness", location: "1-11-5,, 6", size: "", quantity: 2 },
    { name: "Omc", location: "1-8-19,,24", size: "", quantity: 6 },
    { name: "Optoton", location: "2-4-15", size: "", quantity: 1 },
    { name: "Optyk rekas", location: "2-9-7, 8", size: "", quantity: 2 },
    { name: "Optyk trzaska", location: "1-11-15", size: "", quantity: 1 },
    { name: "Optyk trzaska", location: "1-8-17", size: "", quantity: 1 },
    { name: "Optyk trzaska", location: "3-3-11", size: "", quantity: 1 },
    { name: "Optyk trzaska", location: "3-7-11", size: "", quantity: 1 },
    { name: "Orient massage", location: "1-6-8", size: "", quantity: 1 },
    { name: "Oriflame", location: "4-3-8,, 11", size: "", quantity: 4 },
    { name: "Orion", location: "4-7-1,, 3", size: "", quantity: 3 },
    { name: "Orlen elis", location: "2-3-19", size: "", quantity: 1 },
    { name: "PDC", location: "3-1-4", size: "", quantity: 1 },
    { name: "Palium", location: "2-10-2,3", size: "", quantity: 2 },
    { name: "Palium", location: "2-11-2", size: "", quantity: 1 },
    { name: "Palium", location: "2-11-26", size: "", quantity: 1 },
    { name: "Pas a pas", location: "2-11-1", size: "", quantity: 1 },
    { name: "Patron", location: "2-10-12,13", size: "", quantity: 2 },
    { name: "Patt mebel", location: "1-3-7", size: "", quantity: 1 },
    { name: "Patt mebel", location: "2-9-6", size: "", quantity: 1 },
    { name: "Patt mebel", location: "3-1-8", size: "", quantity: 1 },
    { name: "People cam fly", location: "4-7-4", size: "", quantity: 1 },
    { name: "People can fly", location: "4-6-4", size: "", quantity: 1 },
    { name: "Pg", location: "2-1-25", size: "", quantity: 1 },
    { name: "Pilar", location: "4-4-7", size: "", quantity: 1 },
    { name: "Pit stops", location: "2-8-21", size: "", quantity: 1 },
    { name: "Pitagoras Cafe", location: "2-6-15", size: "", quantity: 1 },
    { name: "Plac bankowy11", location: "", size: "", quantity: 0 },
    { name: "Plac przym 6", location: "2-4-24", size: "", quantity: 1 },
    { name: "Plac przym6", location: "2-4-24", size: "", quantity: 1 },
    { name: "Platinum cast", location: "2-8-14", size: "", quantity: 1 },
    { name: "Podosfera", location: "2-10-9", size: "", quantity: 1 },
    { name: "Pokusa kebab", location: "1-4-21-24", size: "", quantity: 4 },
    { name: "Polswiss art", location: "2-3-1", size: "", quantity: 1 },
    { name: "Potocka", location: "1-6-14,,-17,,", size: "", quantity: 4 },
    { name: "Powidoki", location: "2-9-21", size: "", quantity: 1 },
    { name: "Premium fitness", location: "2-9-14", size: "", quantity: 1 },
    { name: "Prima vita", location: "2-3-25", size: "", quantity: 1 },
    { name: "Procural", location: "3-7-4,5", size: "", quantity: 2 },
    { name: "Przedszkole Suwałki", location: "1-7-26", size: "", quantity: 1 },
    { name: "Przyjaciel", location: "3-4-5", size: "", quantity: 1 },
    { name: "Quercia", location: "2-0-1", size: "", quantity: 1 },
    { name: "Raubic", location: "2-6-9,10", size: "", quantity: 1 },
    { name: "Raubic", location: "2-8-9,,11", size: "", quantity: 3 },
    { name: "Rbt", location: "2-7-17,18", size: "", quantity: 2 },
    { name: "React", location: "1-12-6,,10", size: "", quantity: 5 },
    { name: "Rebel", location: "1-7-20", size: "", quantity: 1 },
    { name: "Reckitt", location: "4-1-3", size: "", quantity: 1 },
    { name: "Reckitt", location: "4-1-4", size: "", quantity: 1 },
    { name: "Reckitt", location: "4-2-2", size: "", quantity: 1 },
    { name: "Reckitt nowy", location: "", size: "", quantity: 0 },
    { name: "Rehadent", location: "2-8-15", size: "", quantity: 1 },
    { name: "Reytan", location: "2-8-22", size: "", quantity: 1 },
    { name: "Reytan", location: "3-3-4", size: "", quantity: 1 },
    { name: "Rezydencja Sobieskiego", location: "1-3-4", size: "", quantity: 1 },
    { name: "Rk niedziałek", location: "3-1-10,11", size: "", quantity: 2 },
    { name: "Rodl partner", location: "1-6-10,11", size: "", quantity: 3 },
    { name: "Rodl partner", location: "1-8-12", size: "", quantity: 1 },
    { name: "Rodl partner", location: "3-5-11", size: "", quantity: 1 },
    { name: "Ronson", location: "1-9-17,,18", size: "", quantity: 2 },
    { name: "Ronson", location: "1-9-21,,24", size: "", quantity: 4 },
    { name: "Route", location: "2-7-3", size: "", quantity: 1 },
    { name: "Rudolf", location: "1-1-11", size: "", quantity: 1 },
    { name: "Rudolf", location: "1-1-11", size: "", quantity: 1 },
    { name: "Rudolf", location: "1-1-13", size: "", quantity: 1 },
    { name: "Różański", location: "2-9-18", size: "", quantity: 1 },
    { name: "Sailor", location: "2-5-16", size: "", quantity: 1 },
    { name: "Salon win i alk", location: "2-7-6", size: "", quantity: 1 },
    { name: "Santi", location: "2-10-22,,25", size: "", quantity: 4 },
    { name: "Scarabeus", location: "1-6-12", size: "", quantity: 1 },
    { name: "Schomburg", location: "2-7-12 do 14", size: "", quantity: 3 },
    { name: "Scolar", location: "2-9-12, 13", size: "", quantity: 2 },
    { name: "Scraper", location: "2-6-17", size: "", quantity: 1 },
    { name: "Seka", location: "2-7-4,5", size: "", quantity: 2 },
    { name: "Sew euro", location: "4-6-8", size: "", quantity: 1 },
    { name: "Shock", location: "1-4-9", size: "", quantity: 1 },
    { name: "Silver screen", location: "3-2-10,11", size: "", quantity: 2 },
    { name: "Siro", location: "1-3-1", size: "", quantity: 1 },
    { name: "Skylight", location: "1-11-12", size: "", quantity: 1 },
    { name: "Skylight", location: "1-12-12,,17", size: "", quantity: 6 },
    { name: "Skylight", location: "3-5-9", size: "", quantity: 1 },
    { name: "Smile team", location: "2-2-9", size: "", quantity: 1 },
    { name: "Sofitel", location: "3-1-1, 2", size: "", quantity: 2 },
    { name: "Sponcel", location: "1-4-25", size: "", quantity: 1 },
    { name: "Stacja grawitacja (Regał) fiolet", location: "", size: "", quantity: 0 },
    { name: "Stacja grawitacja (czarna,tam gdzie fiolet )", location: "", size: "", quantity: 1 },
    { name: "Stacja grawitacja", location: "3-7-8,9", size: "", quantity: 2 },
    { name: "Stara kamienica", location: "2-10-18", size: "", quantity: 1 },
    { name: "Stara kamienica", location: "3-4-9", size: "", quantity: 1 },
    { name: "Starpol", location: "3-3-6", size: "", quantity: 1 },
    { name: "Stomatologia", location: "2-2-20", size: "", quantity: 1 },
    { name: "Stomatologia", location: "2-2-21", size: "", quantity: 1 },
    { name: "Stomatologia", location: "2-3-23", size: "", quantity: 1 },
    { name: "Stomatologia", location: "2-3-24", size: "", quantity: 1 },
    { name: "Strabag", location: "2-6-24,, 26", size: "", quantity: 3 },
    { name: "Strabag", location: "4-5-4", size: "", quantity: 1 },
    { name: "Strabag czerwona", location: "4-6-9", size: "", quantity: 1 },
    { name: "Strabag ozik", location: "2-1-18,,19", size: "", quantity: 2 },
    { name: "Student depot", location: "", size: "", quantity: 0 },
    { name: "Studio figura stm", location: "3-2-3", size: "", quantity: 1 },
    { name: "Studio figura ząbki", location: "2-9-23.24", size: "", quantity: 2 },
    { name: "Studio17", location: "2-9-2, 3", size: "", quantity: 2 },
    { name: "Summer Sun", location: "2-3-21", size: "", quantity: 1 },
    { name: "Supremis", location: "1-1-1", size: "", quantity: 1 },
    { name: "Suzuki", location: "1-10-25", size: "", quantity: 1 },
    { name: "Suzuki", location: "1-10-26", size: "", quantity: 1 },
    { name: "Suzuki", location: "1-9-25", size: "", quantity: 0 },
    { name: "Suzuki", location: "2-0-25", size: "", quantity: 1 },
    { name: "Suzuki", location: "2-0-25", size: "", quantity: 1 },
    { name: "Suzuki", location: "2-11-18,,20", size: "", quantity: 3 },
    { name: "Suzuki", location: "2-9-25", size: "", quantity: 1 },
    { name: "Suzuki motors", location: "2-4-5,,14", size: "", quantity: 10 },
    { name: "Suzuki motors", location: "2-5-3,,12", size: "", quantity: 10 },
    { name: "Suzuki motors", location: "2-6-2,,3", size: "", quantity: 2 },
    { name: "Szara 190x115", location: "2-5-26", size: "", quantity: 1 },
    { name: "Szkoła pwdn", location: "2-11-25", size: "", quantity: 1 },
    { name: "Szkoła pwdn", location: "3-1-5", size: "", quantity: 1 },
    { name: "Szpulka łódz", location: "2-10-14", size: "", quantity: 1 },
    { name: "Szron", location: "1-2-12", size: "", quantity: 1 },
    { name: "Słodki słony fam", location: "2-7-11", size: "", quantity: 1 },
    { name: "Tagomago boutique", location: "1-8-26", size: "", quantity: 1 },
    { name: "Teo", location: "3-8-4", size: "", quantity: 1 },
    { name: "Termalny hotel", location: "2-2-2", size: "", quantity: 1 },
    { name: "Terminus", location: "2-4-25", size: "", quantity: 1 },
    { name: "Thai organic", location: "1-7-7", size: "", quantity: 1 },
    { name: "The tides", location: "3-8-5", size: "", quantity: 1 },
    { name: "Tip", location: "2-1-15 oraz 2-3-15", size: "", quantity: 2 },
    { name: "Tip", location: "2-1-16", size: "", quantity: 1 },
    { name: "Tiramisu", location: "1-2-9", size: "", quantity: 1 },
    { name: "Tobaco", location: "1-11-20", size: "", quantity: 1 },
    { name: "Toni", location: "1-8-3", size: "", quantity: 1 },
    { name: "Toyota", location: "1-10-23,, 24", size: "", quantity: 2 },
    { name: "Trans", location: "2-8-12", size: "", quantity: 1 },
    { name: "Traveliada", location: "2-1-20", size: "", quantity: 1 },
    { name: "Tuberoza", location: "1-2-2", size: "", quantity: 1 },
    { name: "Tuberoza", location: "1-2-3", size: "", quantity: 1 },
    { name: "Tyvodar jawellery", location: "3-4-7", size: "", quantity: 1 },
    { name: "Ukryte rzeki", location: "2-9-19", size: "", quantity: 1 },
    { name: "Ulik", location: "1-4-19", size: "", quantity: 1 },
    { name: "Ulik", location: "2-3-2", size: "", quantity: 1 },
    { name: "Ulik", location: "2-4-3,,4", size: "", quantity: 2 },
    { name: "Uroves", location: "2-1-1 oraz 2-4-1", size: "", quantity: 2 },
    { name: "Ursapharm", location: "4-5,5,6", size: "", quantity: 2 },
    { name: "VS akademia urody", location: "2-1-22,23", size: "", quantity: 2 },
    { name: "Varto restaurant", location: "2-2-1", size: "", quantity: 1 },
    { name: "Veolia", location: "2-7-19,20", size: "", quantity: 2 },
    { name: "Victoria wellness", location: "2-10-16", size: "", quantity: 1 },
    { name: "Villa mia", location: "1-5-16", size: "", quantity: 1 },
    { name: "Villa riccona", location: "4-4-5", size: "", quantity: 1 },
    { name: "W&L", location: "3-3-2", size: "", quantity: 1 },
    { name: "WTT", location: "", size: "", quantity: 0 },
    { name: "Warszawa oper kamer", location: "1-3-17, 18", size: "", quantity: 2 },
    { name: "Warszawa oper kamer", location: "4-2-4", size: "", quantity: 1 },
    { name: "Warszawa opera kamer", location: "4-1-5", size: "", quantity: 1 },
    { name: "Warszawa wschodnia", location: "3-4-6", size: "", quantity: 1 },
    { name: "Whiskey", location: "3-8-6", size: "", quantity: 1 },
    { name: "Whiskey unic", location: "2-10-19-20", size: "", quantity: 2 },
    { name: "Willa brzegi", location: "2-7-23", size: "", quantity: 1 },
    { name: "Winterhalter", location: "2-7-24", size: "", quantity: 1 },
    { name: "Wise point", location: "", size: "", quantity: 7 },
    { name: "Wiązowna apteka", location: "1-8-10", size: "", quantity: 1 },
    { name: "Wodkan", location: "1-5-24", size: "", quantity: 0 },
    { name: "Wola center", location: "3-8-7 ( lub na stole)", size: "", quantity: 1 },
    { name: "Wsi", location: "2-6-13, 14", size: "", quantity: 2 },
    { name: "Wybitnie niez.", location: "pod małymi żabkami 85x75", size: "", quantity: 2 },
    { name: "Xylem", location: "1-10-1,, 5", size: "", quantity: 5 },
    { name: "Yumi sushi", location: "2-8-6", size: "", quantity: 1 },
    { name: "Yuniversal", location: "1-8-4", size: "", quantity: 1 },
    { name: "Zacisze Urody", location: "1-1-10", size: "", quantity: 1 },
    { name: "Zala", location: "1-12-1", size: "", quantity: 1 },
    { name: "Zasada", location: "1-10-13", size: "", quantity: 1 },
    { name: "Zasada", location: "3-4-8", size: "", quantity: 1 },
    { name: "Zaułek piękna", location: "2-5-21,, 24", size: "", quantity: 4 },
    { name: "Zon clinic", location: "2-11-3", size: "", quantity: 1 },
    { name: "Zon clinic", location: "2-9-4,5", size: "", quantity: 2 },
    { name: "Zs16 sto", location: "2-11-9", size: "", quantity: 1 },
    { name: "Żurawia 6/12", location: "2-2-3", size: "", quantity: 1 }
  ];

  // Ładowanie mat z localStorage (z możliwością edycji)
  let matsData = JSON.parse(localStorage.getItem('matsLogoData') || 'null') || [...logoData];
  
  // Funkcja zapisu do localStorage (permanentnie!)
  const persistMats = () => {
    localStorage.setItem('matsLogoData', JSON.stringify(matsData));
  };

  const matsSearch = document.getElementById('matsSearch');
  const matsList = document.getElementById('matsList');
  const matsCount = document.getElementById('matsCount');
  const matsFiltered = document.getElementById('matsFiltered');

  // Modals dla Mat
  const editMatModal = document.getElementById('editMatModal');
  const editMatName = document.getElementById('editMatName');
  const editMatQtyInput = document.getElementById('editMatQtyInput');
  const editMatQtyDec = document.getElementById('editMatQtyDec');
  const editMatQtyInc = document.getElementById('editMatQtyInc');
  const editMatCancel = document.getElementById('editMatCancel');
  const editMatSave = document.getElementById('editMatSave');
  let currentEditingMatIndex = null;

  const deleteMatModal = document.getElementById('deleteMatModal');
  const deleteMatText = document.getElementById('deleteMatText');
  const deleteMatCancel = document.getElementById('deleteMatCancel');
  const deleteMatConfirm = document.getElementById('deleteMatConfirm');
  let currentDeletingMatIndex = null;

  function renderMats(filter = '') {
    const filtered = matsData.filter(mat => {
      const search = filter.toLowerCase();
      return mat.name.toLowerCase().includes(search) ||
            mat.location.toLowerCase().includes(search) ||
            mat.size.toLowerCase().includes(search);
    });

    // Oblicz sumę wszystkich ilości
    const totalQuantity = matsData.reduce((sum, mat) => sum + mat.quantity, 0);
    matsCount.textContent = `Załadowano: ${matsData.length} mat (łącznie: ${totalQuantity} szt.)`;
    
    if (filter) {
      matsFiltered.style.display = 'inline';
      const filteredQuantity = filtered.reduce((sum, mat) => sum + mat.quantity, 0);
      matsFiltered.textContent = `Znaleziono: ${filtered.length} (${filteredQuantity} szt.)`;
    } else {
      matsFiltered.style.display = 'none';
    }

    if (filtered.length === 0) {
      matsList.innerHTML = `<div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="empty-state-text">Nie znaleziono mat spełniających kryteria.</div>
      </div>`;
      return;
    }

    matsList.innerHTML = filtered.map((mat, idx) => {
      const originalIndex = matsData.indexOf(mat);
      return `
        <div class="mat-item" data-index="${originalIndex}">
          <div class="mat-info">
            <div class="mat-name">${mat.name}</div>
            <div class="mat-details">
              ${mat.location ? `<div class="mat-detail-item">📍 <strong>${mat.location}</strong></div>` : ''}
              ${mat.size ? `<div class="mat-detail-item">📏 ${mat.size}</div>` : ''}
            </div>
          </div>
          <div class="mat-actions">
            <div class="mat-qty-badge">${mat.quantity}</div>
            <button class="btn-secondary btn-icon-only" data-action="edit-mat" aria-label="Edytuj ilość">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-danger btn-icon-only" data-action="delete-mat" aria-label="Usuń matę">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  matsSearch.addEventListener('input', (e) => {
    renderMats(e.target.value);
  });

  matsList.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;

    const matItem = action.closest('.mat-item');
    const index = Number(matItem.dataset.index);

    if (action.dataset.action === 'edit-mat') {
      currentEditingMatIndex = index;
      const mat = matsData[index];
      editMatName.textContent = mat.name;
      editMatQtyInput.value = mat.quantity;
      openModal(editMatModal);
    } else if (action.dataset.action === 'delete-mat') {
      currentDeletingMatIndex = index;
      const mat = matsData[index];
      deleteMatText.innerHTML = `Czy na pewno chcesz usunąć matę:<br><strong>${mat.name}</strong><br><small>(Lokalizacja: ${mat.location || 'brak'})</small>`;
      openModal(deleteMatModal);
    }
  });

  editMatQtyDec.addEventListener('click', () => {
    editMatQtyInput.value = Math.max(0, Number(editMatQtyInput.value) - 1);
  });
  editMatQtyInc.addEventListener('click', () => {
    editMatQtyInput.value = Math.min(9999, Number(editMatQtyInput.value) + 1);
  });

  editMatSave.addEventListener('click', () => {
    if (currentEditingMatIndex === null) return;
    const newQty = Number(editMatQtyInput.value);
    if (isNaN(newQty) || newQty < 0) {
      showToast('Ilość musi być liczbą >= 0', 'error');
      return;
    }
    matsData[currentEditingMatIndex].quantity = newQty;
    persistMats();
    renderMats(matsSearch.value);
    showToast('✅ Ilość zaktualizowana');
    closeModal(editMatModal);
  });

  deleteMatConfirm.addEventListener('click', () => {
    if (currentDeletingMatIndex === null) return;
    matsData.splice(currentDeletingMatIndex, 1);
    persistMats();
    renderMats(matsSearch.value);
    showToast('🗑️ Mata usunięta permanentnie', 'error');
    closeModal(deleteMatModal);
  });

  [editMatCancel, deleteMatCancel].forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')));
  });

  
    // ==================== DRUKOWANIE LISTY MAT ====================
  const printMatsBtn = document.getElementById('printMatsBtn');
  
  printMatsBtn.addEventListener('click', () => {
    const printDate = new Date().toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const totalQuantity = matsData.reduce((sum, mat) => sum + mat.quantity, 0);
    
    // Sortuj alfabetycznie
    const sortedMats = [...matsData].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    
    let printHTML = `
      <div class="print-mats-header">
        <img src="icons/icon-192.png" alt="Elis Logo">
        <div class="title-block">
          <h1>Lista Mat Logo - Inwentaryzacja</h1>
          <p>Data wydruku: ${printDate}</p>
        </div>
      </div>
      
      <div class="print-mats-summary">
        <p><strong>Łączna liczba pozycji:</strong> ${matsData.length}</p>
        <p><strong>Suma wszystkich mat:</strong> ${totalQuantity} szt.</p>
      </div>
      
      <table class="print-mats-table">
        <thead>
          <tr>
            <th>Nazwa</th>
            <th>Lokalizacja</th>
            <th>Rozmiar</th>
            <th>Ilość</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    sortedMats.forEach(mat => {
      printHTML += `
        <tr>
          <td>${mat.name}</td>
          <td>${mat.location || '—'}</td>
          <td>${mat.size || '—'}</td>
          <td>${mat.quantity}</td>
        </tr>
      `;
    });
    
    printHTML += `
        </tbody>
      </table>
      
      <div class="print-mats-footer">
        <p>Elis - System Zarządzania Matami | Wygenerowano automatycznie</p>
      </div>
    `;
    
    printOutput.innerHTML = printHTML;
    
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error("Błąd drukowania:", error);
        showToast("Błąd podczas otwierania okna drukowania.", "error");
      }
    }, 100);
  });

  // ==================== INICJALIZACJA ====================
  function init() {
    // Panel Tras - Custom Selecty
    createCustomSelect(routeSelectWrapper, routesByDay, "— wybierz trasę —", "route", true);
    createCustomSelect(baseMatSelectWrapper, mats, "— najpierw wybierz trasę —", "baseMat");
    createCustomSelect(altMatSelectWrapper, mats, "— wybierz zamiennik —", "altMat");
    createCustomSelect(multiAltSelectWrapper, mats, "— wybierz zamiennik —", "multiAltMat");
    createCustomSelect(editMultiAltSelectWrapper, mats, "— wybierz zamiennik —", "editMultiAltMat");
    
    // Panel Tras - Renderowanie początkowe
    renderChanges();
    updateFormState();
    
    // Lista Mat Logo - Renderowanie początkowe
    renderMats();
  }

  // Uruchomienie aplikacji
  init();
  
  // Start w widoku głównym (centrum)
  navigateTo('home');
});
