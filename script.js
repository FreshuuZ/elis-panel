document.addEventListener("DOMContentLoaded", () => {
  
  // ==================== GLOBAL STATE & CACHE ====================
  let allLogoMats = [];
  let allWashingItems = [];
  let allArchiveItems = [];
  
  // ==================== ROUTING SYSTEM ====================
  const views = {
    home: document.getElementById('homeView'),
    panel: document.getElementById('panelView'),
    mats: document.getElementById('matsView'),
    washing: document.getElementById('washingView'),
    archive: document.getElementById('archiveView')
  };
  
  const headerTitle = document.getElementById('headerTitle');
  const backBtn = document.getElementById('backBtn');
  let currentView = 'home';
  
  function navigateTo(viewName) {
    Object.values(views).forEach(v => v?.classList.remove('active'));
    views[viewName]?.classList.add('active');
    currentView = viewName;
    
    if (viewName === 'home') {
      headerTitle.textContent = 'Elis ServiceHub';
      backBtn.style.display = 'none';
      // 🔥 NOWE: Aktualizuj badge przy powrocie do home
      updateArchiveBadge();
    } else if (viewName === 'panel') {
      headerTitle.textContent = 'Panel Tras i Zmian';
      backBtn.style.display = 'flex';
    } else if (viewName === 'mats') {
      headerTitle.textContent = 'Lista Mat Logo';
      backBtn.style.display = 'flex';
      (async () => {
          const mats = await fetchAndCacheLogoMats();
          renderMats(mats, matsSearch.value);
      })();
    } else if (viewName === 'washing') {
      headerTitle.textContent = 'System Prania Mat';
      backBtn.style.display = 'flex';
      loadWashingData();
    } else if (viewName === 'archive') {
      headerTitle.textContent = 'Archiwum Prań';
      backBtn.style.display = 'flex';
      loadArchiveData();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
  
    // ==================== PDF GENERATOR ====================
  async function generatePDF(elementId, filename) {
    const element = document.getElementById(elementId);
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    try {
      await html2pdf().set(opt).from(element).save();
      showToast("✅ PDF wygenerowany!");
    } catch (error) {
      console.error("Błąd generowania PDF:", error);
      showToast("❌ Błąd generowania PDF", "error");
    }
  }

  // ==================== PORTAL SELECT SYSTEM ====================
  const selectPortal = document.getElementById('select-portal');
  let activeSelect = null;
  
  function createCustomSelect(wrapper, options, placeholder, stateKey, hasGroups = false) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    
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
        },
        updateOptions: (newOptions) => {
            options = newOptions;
        }
    };
    
    function populateOptions(filter = "") {
      optionsList.innerHTML = "";
      let found = false;
      const processOption = (opt) => {
          const li = document.createElement("li");
          li.textContent = opt; 
          li.dataset.value = opt; 
          li.setAttribute('role', 'option');
          if (opt === appState[stateKey]) { 
            li.classList.add("selected"); 
            li.setAttribute('aria-selected', 'true'); 
          }
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
        if (document.activeElement === searchInput) {
          searchInput.blur();
        }
        
        appState[stateKey] = e.target.dataset.value;
        trigger.textContent = appState[stateKey];
        trigger.classList.remove("placeholder");
        
        setTimeout(() => {
          selectInstance.close();
          wrapper.dispatchEvent(new Event("change", { bubbles: true }));
        }, 50);
      }
    });

    wrapper.reset = selectInstance.reset;
    wrapper.close = selectInstance.close;
    wrapper.updateOptions = selectInstance.updateOptions;
    return wrapper;
  }
  
  document.addEventListener("click", () => activeSelect?.close());
  
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const searchHasFocus = document.activeElement?.classList.contains('custom-select-search');
      if (!searchHasFocus) {
        activeSelect?.close();
      }
    }, 150);
  }, true);

  // ==================== PANEL PRANIA - ELEMENTY DOM ====================
  const washingMatSelectWrapper = document.getElementById('washingMatSelectWrapper');
  const washingQuantityInfo = document.getElementById('washingQuantityInfo');
  const washingAvailableQty = document.getElementById('washingAvailableQty');
  const washingQuantitySelector = document.getElementById('washingQuantitySelector');
  const washingQty = document.getElementById('washingQty');
  const washingQtyDec = document.getElementById('washingQtyDec');
  const washingQtyInc = document.getElementById('washingQtyInc');
  const addToWashingBtn = document.getElementById('addToWashingBtn');
  const activeWashingList = document.getElementById('activeWashingList');
  const washingSearch = document.getElementById('washingSearch');
  const washingCount = document.getElementById('washingCount');
  const washingFiltered = document.getElementById('washingFiltered');

  // Modals
  const editWashingModal = document.getElementById('editWashingModal');
  const editWashingMatName = document.getElementById('editWashingMatName');
  const editWashingQtyInput = document.getElementById('editWashingQtyInput');
  const editWashingQtyDec = document.getElementById('editWashingQtyDec');
  const editWashingQtyInc = document.getElementById('editWashingQtyInc');
  const editWashingCancel = document.getElementById('editWashingCancel');
  const editWashingSave = document.getElementById('editWashingSave');

  const deleteWashingModal = document.getElementById('deleteWashingModal');
  const deleteWashingText = document.getElementById('deleteWashingText');
  const deleteWashingCancel = document.getElementById('deleteWashingCancel');
  const deleteWashingConfirm = document.getElementById('deleteWashingConfirm');

  let editingWashingItem = null;
  let deletingWashingItem = null;

  // ==================== ARCHIWUM - ELEMENTY DOM ====================
  const archiveSearch = document.getElementById('archiveSearch');
  const archiveList = document.getElementById('archiveList');
  const archiveCount = document.getElementById('archiveCount');
  const archiveFiltered = document.getElementById('archiveFiltered');
  const exportArchiveBtn = document.getElementById('exportArchiveBtn');

  // ==================== PANEL TRAS - ELEMENTY DOM ====================
  const routeCard = document.getElementById("routeCard");
  const actionCard = document.getElementById("actionCard");
  const actionReplacement = document.getElementById("actionReplacement");
  const actionAddition = document.getElementById("actionAddition");
  const baseCard = document.getElementById("baseCard");
  const altCard = document.getElementById("altCard");
  const additionCard = document.getElementById("additionCard");
  const addBtn = document.getElementById("addBtn");
  const changesList = document.getElementById("changesList");
  const printOutput = document.getElementById("print-output");

  const routeSelectWrapper = document.getElementById("routeSelectWrapper");
  const baseMatSelectWrapper = document.getElementById("baseMatSelectWrapper");
  const altMatSelectWrapper = document.getElementById("altMatSelectWrapper");
  const multiAltSelectWrapper = document.getElementById("multiAltSelectWrapper");
  const additionMatSelectWrapper = document.getElementById("additionMatSelectWrapper");

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

  const additionQty = document.getElementById("additionQty");
  const additionQtyDec = document.getElementById("additionQtyDec");
  const additionQtyInc = document.getElementById("additionQtyInc");
  const addAdditionBtn = document.getElementById("addAdditionBtn");

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

  const singleModeSection = document.getElementById('singleModeSection');
  const distributeModeSection = document.getElementById('distributeModeSection');
  const distributeStep1 = document.getElementById('distributeStep1');
  const distributeStep2 = document.getElementById('distributeStep2');
  const distributeTotalQty = document.getElementById('distributeTotalQty');
  const startDistributeBtn = document.getElementById('startDistributeBtn');
  const distributeMatName = document.getElementById('distributeMatName');
  const distributeRemaining = document.getElementById('distributeRemaining');
  const distributeTotal = document.getElementById('distributeTotal');
  const distributeAssigned = document.getElementById('distributeAssigned');
  const distributeLeft = document.getElementById('distributeLeft');
  const distributeProgressFill = document.getElementById('distributeProgressFill');
  const distributeClientInput = document.getElementById('distributeClientInput');
  const distributeClientQty = document.getElementById('distributeClientQty');
  const addDistributeClientBtn = document.getElementById('addDistributeClientBtn');
  const distributeClientsList = document.getElementById('distributeClientsList');
  const cancelDistributeBtn = document.getElementById('cancelDistributeBtn');
  const confirmDistributeBtn = document.getElementById('confirmDistributeBtn');

  let distributeClients = [];
  let distributeData = { mat: '', total: 0 };

  const editAdditionModal = document.getElementById("editAdditionModal");
  const editAdditionName = document.getElementById("editAdditionName");
  const editAdditionQtyInput = document.getElementById("editAdditionQtyInput");
  const editAdditionQtyDec = document.getElementById("editAdditionQtyDec");
  const editAdditionQtyInc = document.getElementById("editAdditionQtyInc");
  const editAdditionCancel = document.getElementById("editAdditionCancel");
  const editAdditionSave = document.getElementById("editAdditionSave");

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
  let selectedAction = null;
  let appState = {
    route: '', 
    baseMat: '', 
    altMat: '',
    multiAltMat: '', 
    editMultiAltMat: '', 
    additionMat: '', 
    distributeMat: '',
    washingMat: '',
    palletRoute: ''
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
    const actionSelected = !!selectedAction;
    const baseMatSelected = !!appState.baseMat;
    const altMatSelected = !!appState.altMat;
    const additionMatSelected = !!appState.additionMat;
    const isAdvanced = advancedModeToggle.checked;
    const advancedListHasItems = tempAlternatives.length > 0;
    
    actionCard.classList.toggle('form-section-disabled', !routeSelected);
    
    if (selectedAction === 'replacement') {
      baseCard.style.display = 'block';
      altCard.style.display = 'block';
      additionCard.style.display = 'none';
      baseCard.classList.toggle('form-section-disabled', !actionSelected);
      altCard.classList.toggle('form-section-disabled', !baseMatSelected);
      advancedModeToggle.disabled = !baseMatSelected;
      addBtn.disabled = !baseMatSelected || (isAdvanced ? !advancedListHasItems : !altMatSelected);
    } else if (selectedAction === 'addition') {
      baseCard.style.display = 'none';
      altCard.style.display = 'none';
      additionCard.style.display = 'block';
      additionCard.classList.remove('form-section-disabled');
      addAdditionBtn.disabled = !additionMatSelected;
    } else {
      baseCard.style.display = 'none';
      altCard.style.display = 'none';
      additionCard.style.display = 'none';
    }
  }

  function renderTempAltList() {
    tempMultiAltList.innerHTML = tempAlternatives.length === 0 
      ? `<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Brak dodanych zamienników.</p>`
      : tempAlternatives.map((alt, index) => {
          const isNew = index >= tempAlternatives.length - 5;
          return `<div class="temp-alt-item ${isNew ? 'just-added' : ''}">
            <div class="temp-alt-item-details">
              <div class="temp-alt-item-mat">${alt.alt}<span class="badge">×${alt.qty}</span></div>
              ${alt.client ? `<div class="temp-alt-item-client">${alt.client}</div>` : ''}
            </div>
            <button class="btn-danger" data-index="${index}" aria-label="Usuń ten zamiennik">🗑️</button>
          </div>`;
        }).join('');
    
    setTimeout(() => {
      document.querySelectorAll('.temp-alt-item.just-added').forEach(el => {
        el.classList.remove('just-added');
      });
    }, 1500);
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
        
        if (c.type === 'addition') {
          item.classList.add('change-addition');
        }
        
        let detailsHtml;

        if (c.type === 'addition') {
          detailsHtml = `
            <div class="change-addition-badge">DOŁOŻENIE</div>
            <div class="change-meta-row">
              <span class="change-meta-label">Mata:</span>
              <span class="change-meta-value">${c.mat} <span class="badge">×${c.qty}</span></span>
            </div>`;
        } else if (c.type === 'multi') {
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
  const removeRouteGroup = (route) => { 
    changes = changes.filter(c => c.route !== route); 
    
    // 🔥 NOWE: Wyzeruj palety dla usuwanej trasy
    if (palletRoutes[route]) {
      delete palletRoutes[route];
      savePalletRoutes();
      console.log(`✅ Wyzerowano palety dla trasy ${route}`);
    }
    
    persist(); 
  };
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
  
  function openAdditionEditModal(index) {
    editIndex = index;
    const change = changes[index];
    if (!change || change.type !== 'addition') return;
    editAdditionName.textContent = change.mat;
    editAdditionQtyInput.value = change.qty;
    openModal(editAdditionModal);
    editAdditionQtyInput.focus();
  }

  function openDeleteModal(index, element) { 
    itemToDelete = { index, element }; 
    const change = changes[index];
    const changeType = change.type === 'addition' ? 'dołożenie' : 'zmianę';
    const changeName = change.type === 'addition' ? change.mat : change.base;
    deleteModalText.innerHTML = `Na pewno usunąć ${changeType} dla maty:<br><b>${changeName}</b>?`; 
    openModal(deleteModal); 
  }
  
  function openDeleteGroupModal(route, element) {
    routeGroupToDelete = { route, element: element.closest('.route-group') }; 
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

  editAdditionSave.addEventListener("click", () => {
    if (editIndex === null) return;
    const newQty = Number(editAdditionQtyInput.value);
    if (isNaN(newQty) || newQty < 1 || newQty > 100) { 
      showToast("Ilość musi być od 1 do 100!", "error"); 
      return; 
    }
    changes[editIndex].qty = newQty;
    persist();
    renderChanges();
    showToast("✅ Dołożenie zaktualizowane");
    closeModal(editAdditionModal);
  });

  deleteConfirm.addEventListener("click", () => { 
    if (itemToDelete.index === null) return; 
    const { index, element } = itemToDelete;
    
    // 🔥 Zapamiętaj trasę przed usunięciem
    const deletedRoute = changes[index]?.route;
    
    element.classList.add("is-hiding"); 
    
    setTimeout(() => { 
      removeChange(index); 
      
      // 🔥 NOWE: Sprawdź czy to była ostatnia zmiana dla tej trasy
      if (deletedRoute) {
        const routeStillExists = changes.some(c => c.route === deletedRoute);
        
        if (!routeStillExists) {
          // Trasa całkowicie zniknęła - wyzeruj palety
          if (palletRoutes[deletedRoute]) {
            delete palletRoutes[deletedRoute];
            savePalletRoutes();
            console.log(`✅ Wyzerowano palety dla trasy ${deletedRoute} (ostatnia zmiana usunięta)`);
          }
          
          // Jeśli to była aktualnie wybrana trasa, odśwież licznik
          if (appState.route === deletedRoute) {
            updatePalletDisplay();
          }
        }
      }
      
      renderChanges(); 
      showToast("🗑️ Usunięto", "error"); 
    }, 300); 
    
    closeModal(deleteModal); 
  });

  deleteGroupConfirm.addEventListener("click", () => {
    if (routeGroupToDelete.route === null || !routeGroupToDelete.element) return;
    const { route, element } = routeGroupToDelete;
    
    closeModal(deleteGroupModal);
    element.classList.add("is-hiding");

    setTimeout(() => {
      removeRouteGroup(route);
      element.remove();
      
      // 🔥 NOWE: Jeśli usuwana trasa to obecnie wybrana, odśwież licznik
      if (appState.route === route) {
        updatePalletDisplay(); // Odświeży licznik (pokaże 0)
      }
      
      if (changes.length === 0) {
        changesList.innerHTML = `
          <div class="empty-state">
            <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <div class="empty-state-text">Lista zmian jest pusta.<br>Wybierz trasę i dodaj pierwszą zmianę.</div>
          </div>
        `;
      }
      
      showToast("🗑️ Usunięto trasę i wyzerowano palety", "error");
      routeGroupToDelete = { route: null, element: null }; 
    }, 400); 
  });

  [editSimpleCancel, editAdvancedCancel, editAdditionCancel, deleteCancel, deleteGroupCancel].forEach(btn => 
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
        else if (change.type === 'simple') { openSimpleEditModal(index); }
        else if (change.type === 'addition') { openAdditionEditModal(index); }
        break;
      case "print-group":
        const route = groupElement.dataset.route;
        const routeChanges = changes.filter(c => c.route === route);
        if (routeChanges.length === 0) return;
        const printDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // 🆕 SPRAWDŹ CZY TRASA MA PALETY
        const palletCount = getPalletsForRoute(route);
        let palletNotice = '';
        if (palletCount) {
          let palletWord;
          const lastDigit = palletCount % 10;
          const lastTwoDigits = palletCount % 100;
          
          if (palletCount === 1) {
            palletWord = 'PALETY'; // z 1 PALETY (dopełniacz)
          } else if (lastTwoDigits >= 12 && lastTwoDigits <= 14) {
            // 12-14, 112-114 itd. -> z 12 PALET
            palletWord = 'PALET';
          } else if (lastDigit >= 2 && lastDigit <= 4) {
            // 2-4, 22-24, 32-34 itd. -> z 2 PALET, z 3 PALET
            palletWord = 'PALET';
          } else {
            // 5-11, 15-21, 25-31 itd. -> z 5 PALET
            palletWord = 'PALET';
          }
          
          palletNotice = `<div class="print-pallet-notice">🚚 TRASA SKŁADA SIĘ Z ${palletCount} ${palletWord}</div>`;
        }
 
        const replacements = routeChanges.filter(c => c.type !== 'addition');
        const additions = routeChanges.filter(c => c.type === 'addition');
        
        let printHTML = `
          <div class="print-header">
            <img src="icons/icon-192.png" alt="Elis Logo">
            <div class="title-block">
              <h1>Raport Zmian Mat</h1>
              <p>Trasa ${route} &nbsp;|&nbsp; Data: ${printDate}</p>
            </div>
          </div>
          ${palletNotice}
        `;
        
        if (replacements.length > 0) {
          printHTML += `<h2>Zamienniki (${replacements.length})</h2>`;
          printHTML += replacements.map(c => {
            if (c.type === 'multi') {
              const alts = c.alternatives.map(alt => `<li>${alt.alt} (×${alt.qty})${alt.client ? ` <span class="client">— ${alt.client}</span>` : ''}</li>`).join('');
              return `<div class="print-change-item"><div class="base">${c.base} (ilość bazowa: ×${c.qtyBase})</div><ul class="multi-alt-list">${alts}</ul></div>`;
            }
            return `<div class="print-change-item"><div class="base">${c.base} (×${c.qty})</div><div class="simple-alt">${c.alt} (×${c.qty})${c.client ? ` <span class="client">— ${c.client}</span>` : ''}</div></div>`;
          }).join('');
        }
        
        if (additions.length > 0) {
          printHTML += `<h2>Dołożenia (${additions.length})</h2>`;
          printHTML += additions.map(c => {
            return `<div class="print-change-item print-addition"><div class="base">${c.mat} (×${c.qty})</div></div>`;
          }).join('');
        }
        
        printOutput.innerHTML = printHTML;
        setTimeout(() => { try { window.print(); } catch (error) { console.error("Błąd drukowania:", error); showToast("Błąd podczas otwierania okna drukowania.", "error"); } }, 100);
        break;
      case "copy-group":
        const routeToCopy = groupElement.dataset.route;
        const changesToCopy = changes.filter(c => c.route === routeToCopy);
        let textToCopy = `Trasa ${routeToCopy}:\n\n`;
        
        const repls = changesToCopy.filter(c => c.type !== 'addition');
        const adds = changesToCopy.filter(c => c.type === 'addition');
        
        if (repls.length > 0) {
          textToCopy += `ZAMIENNIKI:\n`;
          textToCopy += repls.map(c => {
            if (c.type === 'multi') {
              let multiText = `- ${c.base} (×${c.qtyBase}):\n`;
              multiText += c.alternatives.map(alt => `    ↪ ${alt.alt} (×${alt.qty})${alt.client ? ` [${alt.client}]` : ''}`).join('\n');
              return multiText;
            }
            return `- ${c.base} (×${c.qty}) -> ${c.alt} (×${c.qty})${c.client ? ` [${c.client}]` : ''}`;
          }).join("\n");
        }
        
        if (adds.length > 0) {
          textToCopy += `\n\nDOŁOŻENIA:\n`;
          textToCopy += adds.map(c => `+ ${c.mat} (×${c.qty})`).join("\n");
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => showToast("✅ Skopiowano do schowka!")).catch(() => showToast("❌ Błąd kopiowania", "error"));
        break;
      case "delete-group": openDeleteGroupModal(groupElement.dataset.route, groupElement); break;
      case "toggle-group": groupElement.classList.toggle("open"); break;
    }
  });

  actionReplacement.addEventListener('click', () => {
    selectedAction = 'replacement';
    actionReplacement.classList.add('selected');
    actionAddition.classList.remove('selected');
    updateFormState();
  });
  
  actionAddition.addEventListener('click', () => {
    selectedAction = 'addition';
    actionAddition.classList.add('selected');
    actionReplacement.classList.remove('selected');
    updateFormState();
  });

  routeSelectWrapper.addEventListener("change", () => { 
    selectedAction = null;
    actionReplacement.classList.remove('selected');
    actionAddition.classList.remove('selected');
    advancedModeToggle.checked = false; 
    advancedModeToggle.dispatchEvent(new Event('change')); 
    baseMatSelectWrapper.reset('— wybierz matę —'); 
    altMatSelectWrapper.reset('— wybierz zamiennik —');
    additionMatSelectWrapper.reset('— wybierz matę —');
    updateFormState(); 
    updatePalletDisplay();
  });
  
  baseMatSelectWrapper.addEventListener("change", () => { 
    altMatSelectWrapper.reset('— wybierz zamiennik —'); 
    multiAltSelectWrapper.reset('— wybierz zamiennik —'); 
    updateFormState(); 
  });
  
  altMatSelectWrapper.addEventListener("change", updateFormState);
  additionMatSelectWrapper.addEventListener("change", updateFormState);
  
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
  
  editAdditionQtyDec.addEventListener("click", () => {
    editAdditionQtyInput.value = Math.max(1, Math.min(100, Number(editAdditionQtyInput.value) - 1));
  });
  editAdditionQtyInc.addEventListener("click", () => {
    editAdditionQtyInput.value = Math.max(1, Math.min(100, Number(editAdditionQtyInput.value) + 1));
  });
    
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

  addAdditionBtn.addEventListener("click", () => {
    if (!appState.route || !appState.additionMat) {
      showToast("Wybierz trasę i matę!", "error");
      return;
    }
    
    const newAddition = {
      type: 'addition',
      route: appState.route,
      mat: appState.additionMat,
      qty: Number(additionQty.value)
    };
    
    changes.unshift(newAddition);
    persist();
    renderChanges();
    showToast("✅ Dodano dołożenie!");
    
    additionMatSelectWrapper.reset('— wybierz matę —');
    additionQty.value = 1;
    updateFormState();
    additionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  [qtyDec, qtyInc, advQtyBaseDec, advQtyBaseInc].forEach(btn => btn.addEventListener("click", (e) => { 
    const isAdv = e.target.id.includes('adv'); 
    const input = isAdv ? advQtyBaseInput : qtyInput; 
    const change = e.target.id.includes('Dec') ? -1 : 1; 
    input.value = Math.max(1, Math.min(100, Number(input.value) + change)); 
  }));

  additionQtyDec.addEventListener('click', () => {
    additionQty.value = Math.max(1, Math.min(100, Number(additionQty.value) - 1));
  });
  additionQtyInc.addEventListener('click', () => {
    additionQty.value = Math.max(1, Math.min(100, Number(additionQty.value) + 1));
  });
  
  // ==================== LISTA MAT LOGO (SUPABASE) ====================
  const matsSearch = document.getElementById('matsSearch');

  // 🔥 DODAJ CAŁĄ TĘ FUNKCJĘ:
  function formatLocation(location) {
    if (!location) return '';
    
    // Specjalne lokacje (bez numerów regałów)
    const specialLocations = ['PALETA', 'REGAŁ', 'MAGAZYN', 'KASA', 'SPEC', 'NIEZNANE', 'POD-MAŁYMI-ŻABKAMI', 'BIURO', 'NOWY'];
    if (specialLocations.some(special => location.toUpperCase().includes(special))) {
      return `📦 ${location}`;
    }
    
    // Sprawdź czy to format REGAŁ-RZĄD-RURY (np. "2-1-7,,12" lub "A-1")
    const parts = location.split('-');
    
    if (parts.length >= 3) {
      // Format: REGAŁ-RZĄD-RURY
      const shelf = parts[0];
      const row = parts[1];
      const pipes = parts.slice(2).join('-'); // reszta to rury
      
      // Parsuj rury
      let pipeText = '';
      if (pipes.includes(',,')) {
        // Format zakresu: "7,,12" → "7-12"
        const rangeParts = pipes.split(',,').filter(p => p);
        if (rangeParts.length === 2) {
          pipeText = `${rangeParts[0]}-${rangeParts[1]}`;
        } else if (rangeParts.length === 1) {
          pipeText = rangeParts[0];
        } else {
          pipeText = pipes.replace(/,,/g, '-');
        }
      } else if (pipes.includes(',')) {
        // Format listy: "3,4,5" → "3, 4, 5"
        pipeText = pipes.replace(/,/g, ', ');
      } else {
        pipeText = pipes;
      }
      
      return `📍 Regał ${shelf} → Rząd ${row} → Rura ${pipeText}`;
      
    } else if (parts.length === 2) {
      // Format: REGAŁ-RZĄD (np. "A-1")
      return `📍 Regał ${parts[0]} / Rząd ${parts[1]}`;
    }
    
    // Fallback - zwróć oryginalną lokację
    return `📍 ${location}`;
  }

  const matsList = document.getElementById('matsList');
  const matsCount = document.getElementById('matsCount');
  const matsFiltered = document.getElementById('matsFiltered');
  const printMatsBtn = document.getElementById('printMatsBtn');
  const exportExcelBtn = document.getElementById('exportExcelBtn');

  async function fetchAndCacheLogoMats() {
    if (allLogoMats.length > 0) {
      return allLogoMats;
    }
    
    matsList.innerHTML = `<div class="empty-state"><div class="empty-state-text">Pobieranie danych z bazy...</div></div>`;
    
    try {
      const { data, error } = await window.supabase
        .from('logo_mats')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }
      
      allLogoMats = data;
      return data;

    } catch (error) {
      console.error("Błąd pobierania mat z Supabase:", error);
      showToast("Błąd pobierania danych mat. Sprawdź konsolę.", "error");
      matsList.innerHTML = `<div class="empty-state error"><div class="empty-state-text">Nie udało się pobrać danych.</div></div>`;
      return [];
    }
  }

  // 🆕 FUNKCJA FORMATUJĄCA LOKACJĘ
  function formatLocation(location) {
    if (!location) return '';
    
    // Specjalne lokacje (bez numerów regałów)
    const specialLocations = ['PALETA', 'REGAŁ', 'MAGAZYN', 'KASA', 'SPEC', 'NIEZNANE', 'POD-MAŁYMI-ŻABKAMI', 'BIURO', 'NOWY'];
    if (specialLocations.some(special => location.toUpperCase().includes(special))) {
      return `📦 ${location}`;
    }
    
    // Sprawdź czy to format REGAŁ-RZĄD-RURY (np. "2-1-7,,12" lub "A-1")
    const parts = location.split('-');
    
    if (parts.length >= 3) {
      // Format: REGAŁ-RZĄD-RURY
      const shelf = parts[0];
      const row = parts[1];
      const pipes = parts.slice(2).join('-'); // reszta to rury
      
      // Parsuj rury
      let pipeText = '';
      if (pipes.includes(',,')) {
        // Format zakresu: "7,,12" → "7-12"
        const rangeParts = pipes.split(',,').filter(p => p);
        if (rangeParts.length === 2) {
          pipeText = `${rangeParts[0]}-${rangeParts[1]}`;
        } else if (rangeParts.length === 1) {
          pipeText = rangeParts[0];
        } else {
          pipeText = pipes.replace(/,,/g, '-');
        }
      } else if (pipes.includes(',')) {
        // Format listy: "3,4,5" → "3, 4, 5"
        pipeText = pipes.replace(/,/g, ', ');
      } else {
        pipeText = pipes;
      }
      
      return `📍 Regał ${shelf} → Rząd ${row} → Rura ${pipeText}`;
      
    } else if (parts.length === 2) {
      // Format: REGAŁ-RZĄD (np. "A-1")
      return `📍 Regał ${parts[0]} / Rząd ${parts[1]}`;
    }
    
    // Fallback - zwróć oryginalną lokację
    return `📍 ${location}`;
  }


  function renderMats(matsData, filter = '') {
    const filtered = matsData.filter(mat => {
      const search = filter.toLowerCase();
      return (mat.name?.toLowerCase() || '').includes(search) ||
             (mat.location?.toLowerCase() || '').includes(search) ||
             (mat.size?.toLowerCase() || '').includes(search);
    });

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
        <div class="empty-state-text">${filter ? 'Nie znaleziono mat spełniających kryteria.' : 'Brak danych do wyświetlenia.'}</div>
      </div>`;
      return;
    }

    matsList.innerHTML = filtered.map((mat) => {
      return `
        <div class="mat-item">
          <div class="mat-info">
            <div class="mat-name">${mat.name}</div>
            <div class="mat-details">
              ${mat.location ? `<div class="mat-detail-item"><strong>${formatLocation(mat.location)}</strong></div>` : ''}
              ${mat.size ? `<div class="mat-detail-item">📏 ${mat.size}</div>` : ''}
            </div>
          </div>
          <div class="mat-actions">
            <div class="mat-qty-badge">${mat.quantity}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  matsSearch.addEventListener('input', (e) => {
    renderMats(allLogoMats, e.target.value);
  });
  
  exportExcelBtn.addEventListener('click', async () => {
    if (allLogoMats.length === 0) {
      showToast("Brak danych mat do wyeksportowania.", "error");
      return;
    }
    if (typeof ExcelJS === 'undefined') {
      showToast("Biblioteka Excel nie jest załadowana", "error");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Inwentaryzacja Mat', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      workbook.creator = 'Elis System';
      workbook.created = new Date();
      workbook.company = 'Elis';
      const currentDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const totalQuantity = allLogoMats.reduce((sum, mat) => sum + mat.quantity, 0);
      const sortedMats = [...allLogoMats].sort((a, b) => a.name.localeCompare(b.name, 'pl'));

      worksheet.mergeCells('A1:D1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = 'ELIS - INWENTARYZACJA MAT LOGO';
      titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 35;

      worksheet.mergeCells('A2:D2');
      const dateCell = worksheet.getCell('A2');
      dateCell.value = `Data wygenerowania: ${currentDate}`;
      dateCell.font = { name: 'Calibri', size: 10, italic: true };
      dateCell.alignment = { horizontal: 'center' };
      dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      worksheet.addRow([]);

      const summaryRow1 = worksheet.addRow(['PODSUMOWANIE', '', '', '']);
      worksheet.mergeCells(`A${summaryRow1.number}:D${summaryRow1.number}`);
      summaryRow1.getCell(1).font = { name: 'Calibri', size: 12, bold: true };
      summaryRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E9F0' } };
      summaryRow1.height = 25;

      const statsRow1 = worksheet.addRow(['Liczba pozycji:', allLogoMats.length, '', '']);
      const statsRow2 = worksheet.addRow(['Suma mat (szt.):', totalQuantity, '', '']);
      [statsRow1, statsRow2].forEach(row => {
        row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
        row.getCell(2).font = { name: 'Calibri', size: 11 };
        row.getCell(2).alignment = { horizontal: 'left' };
      });
      worksheet.addRow([]);

      const headerRow = worksheet.addRow(['Nazwa maty', 'Lokalizacja', 'Rozmiar', 'Ilość (szt.)']);
      headerRow.height = 30;
      headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } } }; });

      sortedMats.forEach((mat, index) => {
        const row = worksheet.addRow([mat.name, mat.location || 'Nie określono', mat.size || 'Nie określono', mat.quantity]);
        row.height = 22;
        row.font = { name: 'Calibri', size: 10 };
        if (index % 2 === 0) { row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; }
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).font = { name: 'Calibri', size: 10, bold: true };
        row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } }; });
      });

      worksheet.addRow([]);
      const totalRow = worksheet.addRow(['', '', 'SUMA CAŁKOWITA:', totalQuantity]);
      totalRow.height = 28;
      totalRow.getCell(3).font = { name: 'Calibri', size: 11, bold: true };
      totalRow.getCell(4).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF00A9BE' } };
      totalRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
      totalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      totalRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F7FA' } };

      worksheet.addRow([]);
      const footerRow = worksheet.addRow(['Dokument wygenerowany automatycznie przez system Elis', '', '', '']);
      worksheet.mergeCells(`A${footerRow.number}:D${footerRow.number}`);
      footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
      footerRow.getCell(1).alignment = { horizontal: 'center' };

      worksheet.columns = [ { width: 40 }, { width: 25 }, { width: 18 }, { width: 15 } ];
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Elis_Inwentaryzacja_Mat_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast("Wyeksportowano do Excel!");
    } catch (error) {
      console.error('Błąd eksportu:', error);
      showToast("Błąd podczas eksportu do Excel", "error");
    }
  });

  printMatsBtn.addEventListener('click', () => {
    if (allLogoMats.length === 0) {
      showToast("Brak danych mat do wydrukowania.", "error");
      return;
    }
    const printDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const totalQuantity = allLogoMats.reduce((sum, mat) => sum + mat.quantity, 0);
    const sortedMats = [...allLogoMats].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    
    let printHTML = `
      <div class="print-mats-header">
        <img src="icons/icon-192.png" alt="Elis Logo">
        <div class="title-block">
          <h1>Lista Mat Logo - Inwentaryzacja</h1>
          <p>Data wydruku: ${printDate}</p>
        </div>
      </div>
      <div class="print-mats-summary">
        <p><strong>Łączna liczba pozycji:</strong> ${allLogoMats.length}</p>
        <p><strong>Suma wszystkich mat:</strong> ${totalQuantity} szt.</p>
      </div>
      <table class="print-mats-table">
        <thead><tr><th>Nazwa</th><th>Lokalizacja</th><th>Rozmiar</th><th>Ilość</th></tr></thead>
        <tbody>
    `;
    sortedMats.forEach(mat => {
      printHTML += `<tr><td>${mat.name}</td><td>${mat.location || '—'}</td><td>${mat.size || '—'}</td><td>${mat.quantity}</td></tr>`;
    });
    printHTML += `</tbody></table><div class="print-mats-footer"><p>Dokument wygenerowany automatycznie przez system Elis</p></div>`;
    printOutput.innerHTML = printHTML;
    setTimeout(() => { try { window.print(); } catch (error) { console.error("Błąd drukowania:", error); showToast("Błąd podczas otwierania okna drukowania.", "error"); } }, 100);
  });
  
  // ==================== KREATOR PODZIAŁU MAT ====================
  document.querySelectorAll('input[name="advancedMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const mode = e.target.value;
      if (mode === 'single') {
        singleModeSection.style.display = 'block';
        distributeModeSection.style.display = 'none';
      } else {
        singleModeSection.style.display = 'none';
        distributeModeSection.style.display = 'block';
        distributeStep1.style.display = 'block';
        distributeStep2.style.display = 'none';
        
        const summarySection = document.getElementById('distributeSummary');
        if (summarySection) {
          summarySection.style.display = 'none';
        }
      }
      updateFormState();
    });
  });

  startDistributeBtn.addEventListener('click', () => {
    if (!appState.distributeMat) {
      showToast("Wybierz matę!", "error");
      return;
    }
    const total = Number(distributeTotalQty.value);
    if (total < 1 || total > 100) {
      showToast("Ilość musi być od 1 do 100!", "error");
      return;
    }
    
    const summarySection = document.getElementById('distributeSummary');
    if (summarySection) {
      summarySection.style.display = 'none';
    }
    
    distributeData = { mat: appState.distributeMat, total };
    distributeClients = [];
    
    distributeMatName.textContent = appState.distributeMat;
    distributeTotal.textContent = total;
    distributeRemaining.textContent = total;
    distributeAssigned.textContent = '0';
    distributeLeft.textContent = total;
    distributeProgressFill.style.width = '0%';
    
    distributeClientInput.value = '';
    distributeClientQty.value = '1';
    distributeClientsList.innerHTML = '<p style="text-align: center; color: var(--muted); font-size: 14px; margin: 12px 0 0 0;">Dodaj pierwszego klienta</p>';
    
    distributeStep1.style.display = 'none';
    distributeStep2.style.display = 'block';
    confirmDistributeBtn.disabled = true;
  });

  addDistributeClientBtn.addEventListener('click', () => {
    const client = distributeClientInput.value.trim();
    const qty = Number(distributeClientQty.value);
    
    if (!client) {
      showToast("Podaj nazwę klienta!", "error");
      return;
    }
    
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    const remaining = distributeData.total - assigned;
    
    if (qty < 1) {
      showToast("Ilość musi być większa niż 0!", "error");
      return;
    }
    
    if (qty > remaining) {
      showToast(`Możesz przydzielić maksymalnie ${remaining} szt.!`, "error");
      return;
    }
    
    distributeClients.push({ client, qty });
    renderDistributeClients();
    updateDistributeProgress();
    
    distributeClientInput.value = '';
    distributeClientQty.value = Math.min(1, remaining - qty);
    distributeClientInput.focus();
  });

  function renderDistributeClients() {
    if (distributeClients.length === 0) {
      distributeClientsList.innerHTML = `
        <div class="distribute-empty-state">
          <span style="font-size: 32px; opacity: 0.3;">📋</span>
          <p>Nie dodano jeszcze żadnych klientów</p>
        </div>`;
      return;
    }
    
    distributeClientsList.innerHTML = distributeClients.map((c, index) => 
      `<div class="distribute-client-card">
        <div class="distribute-client-info">
          <div class="distribute-client-name">${c.client}</div>
          <div class="distribute-client-qty">Przydzielono: <strong>${c.qty}</strong> szt.</div>
        </div>
        <button class="distribute-client-remove btn-danger" data-index="${index}">
          Usuń
        </button>
      </div>`
    ).join('');
  }

  function updateDistributeProgress() {
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    const remaining = distributeData.total - assigned;
    const percentage = (assigned / distributeData.total) * 100;
    
    distributeAssigned.textContent = assigned;
    distributeLeft.textContent = remaining;
    distributeRemaining.textContent = remaining;
    distributeProgressFill.style.width = `${percentage}%`;
    
    const isComplete = remaining === 0;
    confirmDistributeBtn.disabled = !isComplete;
    
    const summarySection = document.getElementById('distributeSummary');
    if (isComplete && distributeClients.length > 0) {
      summarySection.style.display = 'block';
      
      document.getElementById('distributeSummaryMat').textContent = distributeData.mat;
      document.getElementById('distributeSummaryCount').textContent = distributeClients.length;
      
      const summaryList = document.getElementById('distributeSummaryList');
      summaryList.innerHTML = distributeClients.map(c => 
        `<div class="distribute-summary-item">
          <span class="distribute-summary-item-name">${c.client}</span>
          <span class="distribute-summary-item-qty">×${c.qty}</span>
        </div>`
      ).join('');
      
      confirmDistributeBtn.innerHTML = '<span style="font-size: 16px; margin-right: 6px;">✓</span> Zatwierdź podział';
    } else {
      summarySection.style.display = 'none';
      confirmDistributeBtn.innerHTML = `<span style="font-size: 16px; margin-right: 6px;">⏳</span> Rozdziel wszystkie (brakuje ${remaining})`;
    }
  }

  distributeClientsList.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-danger[data-index]');
    if (btn) {
      const index = Number(btn.dataset.index);
      distributeClients.splice(index, 1);
      renderDistributeClients();
      updateDistributeProgress();
    }
  });

  cancelDistributeBtn.addEventListener('click', () => {
    distributeStep1.style.display = 'block';
    distributeStep2.style.display = 'none';
    distributeClients = [];
    
    const summarySection = document.getElementById('distributeSummary');
    if (summarySection) {
      summarySection.style.display = 'none';
    }
  });

  confirmDistributeBtn.addEventListener('click', () => {
    const assigned = distributeClients.reduce((sum, c) => sum + c.qty, 0);
    if (assigned !== distributeData.total) {
      showToast("Musisz przydzielić wszystkie maty!", "error");
      return;
    }
    
    distributeClients.forEach(c => {
      tempAlternatives.push({
        alt: distributeData.mat,
        qty: c.qty,
        client: c.client
      });
    });
    
    const clientCount = distributeClients.length;
    showToast(`✅ Dodano ${clientCount} ${clientCount === 1 ? 'klienta' : clientCount < 5 ? 'klientów' : 'klientów'} do listy!`);
    
    distributeStep1.style.display = 'block';
    distributeStep2.style.display = 'none';
    distributeClients = [];
    const distributeMatSelectWrapper = document.getElementById('distributeMatSelectWrapper');
    distributeMatSelectWrapper.reset('— wybierz matę —');
    distributeTotalQty.value = '1';
    
    const singleRadio = document.querySelector('input[name="advancedMode"][value="single"]');
    singleRadio.checked = true;
    singleModeSection.style.display = 'block';
    distributeModeSection.style.display = 'none';
    
    renderTempAltList();
    updateFormState();
    
    setTimeout(() => {
      tempMultiAltList.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  });
  
  // ==================== PANEL PRANIA - FUNKCJE ====================

  function getCurrentShift() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes >= 360 && totalMinutes < 840) {
      return '1 zmiana';
    } else if (totalMinutes >= 840 && totalMinutes < 1320) {
      return '2 zmiana';
    } else {
      return null;
    }
  }

  function updateShiftInfo() {
    const shiftInfoCard = document.getElementById('currentShiftInfo');
    if (!shiftInfoCard) return;
    
    const currentShift = getCurrentShift();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    if (currentShift) {
      const isFirstShift = currentShift === '1 zmiana';
      const endHour = isFirstShift ? '14:00' : '22:00';
      
      const endTime = new Date();
      if (isFirstShift) {
        endTime.setHours(14, 0, 0, 0);
      } else {
        endTime.setHours(22, 0, 0, 0);
      }
      
      const diffMs = endTime - now;
      const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
      const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeLeft = remainingHours > 0 ? `${remainingHours}h ${remainingMinutes}min` : `${remainingMinutes}min`;
      
      shiftInfoCard.className = 'shift-info-card active';
      shiftInfoCard.innerHTML = `
        <div class="shift-info-icon">✅</div>
        <div class="shift-info-content">
          <div class="shift-info-title">Trwa zmiana</div>
          <div class="shift-info-desc">Możesz dodawać maty do prania. Zmiana kończy się o ${endHour} (pozostało ${timeLeft})</div>
        </div>
        <div class="shift-badge">${currentShift}</div>
      `;
    } else {
      const nextShiftStart = hours < 6 ? '6:00' : '6:00 (następnego dnia)';
      shiftInfoCard.className = 'shift-info-card inactive';
      shiftInfoCard.innerHTML = `
        <div class="shift-info-icon">⏸️</div>
        <div class="shift-info-content">
          <div class="shift-info-title">Brak aktywnej zmiany</div>
          <div class="shift-info-desc">Dodawanie mat dostępne w godzinach: 6:00-14:00 (1 zmiana) i 14:00-22:00 (2 zmiana). Następna zmiana: ${nextShiftStart}</div>
        </div>
        <div class="shift-badge">POZA GODZINAMI</div>
      `;
    }
  }

  async function fetchActiveWashing() {
    try {
      const { data, error } = await window.supabase
        .from('washing_queue')
        .select('*')
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error("Błąd pobierania aktywnych prań:", error);
      showToast("Błąd pobierania danych prania.", "error");
      return [];
    }
  }

  function getTotalQuantity(matName) {
    const matInDb = allLogoMats.find(m => m.name === matName);
    return matInDb ? matInDb.quantity : 0;
  }

  function getAvailableQuantity(matName) {
    const totalQty = getTotalQuantity(matName);
    const inWashing = allWashingItems
      .filter(item => item.mat_name === matName)
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
    return Math.max(0, totalQty - inWashing);
  }

  async function loadWashingData() {
    updateShiftInfo();
    setInterval(updateShiftInfo, 60000);
    
    await checkAndArchiveOldWashing();
    
    const mats = await fetchAndCacheLogoMats();
    const matNames = mats.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
    washingMatSelectWrapper.updateOptions(matNames);
    
    const activeItems = await fetchActiveWashing();
    allWashingItems = activeItems;
    renderWashingList(activeItems, '');
    
    updateWashingFormState();
  }

  function updateWashingFormState() {
    const matSelected = !!appState.washingMat;
    
    // 🔥 Pobierz elementy lokalnie (bezpieczniej)
    const washingQuantitySelector = document.getElementById('washingQuantitySelector');
    const washingQty = document.getElementById('washingQty');
    const addToWashingBtn = document.getElementById('addToWashingBtn');
    
    // Sprawdź czy elementy istnieją
    if (!washingQuantitySelector || !washingQty || !addToWashingBtn) {
      console.warn('⚠️ Elementy prania nie znalezione');
      return;
    }
    
    if (matSelected) {
      // ✅ ZAWSZE POKAŻ SELEKTOR ILOŚCI
      washingQuantitySelector.style.display = 'block';
      washingQty.max = 100;
      washingQty.value = Math.min(Number(washingQty.value) || 1, 100);
      
      // ✅ PRZYCISK ZAWSZE AKTYWNY
      addToWashingBtn.disabled = false;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    } else {
      washingQuantitySelector.style.display = 'none';
      addToWashingBtn.disabled = true;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    }
  }

  function renderWashingList(items, filter = '') {
    const filtered = items.filter(item => {
      const search = filter.toLowerCase();
      return (item.mat_name?.toLowerCase() || '').includes(search) ||
             (item.mat_location?.toLowerCase() || '').includes(search) ||
             (item.mat_size?.toLowerCase() || '').includes(search) ||
             (item.shift?.toLowerCase() || '').includes(search);
    });

    if (washingCount) {
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      washingCount.textContent = `W praniu: ${items.length} pozycji (${totalQty} szt.)`;
      
      if (filter && washingFiltered) {
        washingFiltered.style.display = 'inline';
        const filteredQty = filtered.reduce((sum, item) => sum + (item.quantity || 1), 0);
        washingFiltered.textContent = `Znaleziono: ${filtered.length} pozycji (${filteredQty} szt.)`;
      } else if (washingFiltered) {
        washingFiltered.style.display = 'none';
      }
    }

    if (filtered.length === 0) {
      activeWashingList.innerHTML = `<div class="empty-state">
        <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <div class="empty-state-text">${filter ? 'Nie znaleziono mat spełniających kryteria.' : 'Brak mat w praniu.<br>Dodaj pierwszą matę z listy powyżej.'}</div>
      </div>`;
      return;
    }

    activeWashingList.innerHTML = filtered.map(item => {
      const startDate = new Date(item.started_at);
      const startTime = startDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      const startDateStr = startDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
      
      const qtyBadge = item.quantity > 1 ? `<span class="washing-item-qty-badge">×${item.quantity}</span>` : '';
      
      return `
        <div class="washing-item" data-washing-id="${item.id}">
          <div class="washing-item-header">
            <div class="washing-item-name">${item.mat_name}${qtyBadge}</div>
            <div class="washing-item-shift">${item.shift}</div>
          </div>
          <div class="washing-item-details">
            ${item.mat_location ? `
              <div class="washing-item-detail">
                <strong>${formatLocation(item.mat_location)}</strong>
              </div>
            ` : ''}
            ${item.mat_size ? `
              <div class="washing-item-detail">
                <span>📏</span>
                <span>${item.mat_size}</span>
              </div>
            ` : ''}
          </div>
          <div class="washing-item-time">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Dodano: ${startDateStr} o ${startTime}</span>
          </div>
          <div class="washing-item-actions">
            <button class="btn-secondary btn-edit-washing" data-action="edit-washing">
              ✏️ Edytuj
            </button>
            <button class="btn-danger btn-delete-washing" data-action="delete-washing">
              🗑️ Usuń
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  washingMatSelectWrapper.addEventListener("change", () => {
    updateWashingFormState();
  });

  washingQtyDec.addEventListener('click', () => {
    washingQty.value = Math.max(1, Number(washingQty.value) - 1);
  });

  washingQtyInc.addEventListener('click', () => {
    const max = Number(washingQty.max);
    washingQty.value = Math.min(max, Number(washingQty.value) + 1);
  });

  // ==================== ARCHIWUM PRAŃ - FUNKCJE ====================

  // 🔥 NOWA FUNKCJA: Sprawdza czy są prania do usunięcia w ciągu 7 dni
  async function checkUpcomingDeletions() {
    try {
      const { data, error } = await window.supabase
        .from('washing_archive')
        .select('*');
      
      if (error) throw error;
      if (!data || data.length === 0) return { total: 0, critical: 0, warning: 0 };
      
      const now = new Date();
      let critical = 0; // <= 3 dni
      let warning = 0;  // 4-7 dni
      
      data.forEach(item => {
        // ✅ UŻYJ delete_at Z BAZY JEŚLI ISTNIEJE!
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          // Fallback gdyby nie było w bazie
          const archivedDate = new Date(item.archived_at);
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const diffTime = deleteDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft <= 3 && daysLeft >= 0) critical++;
        else if (daysLeft <= 7 && daysLeft > 3) warning++;
      });
      
      console.log('📊 Archiwum stats:', { total: data.length, critical, warning }); // DEBUG
      
      return { total: data.length, critical, warning };
    } catch (error) {
      console.error('Błąd sprawdzania usunięć:', error);
      return { total: 0, critical: 0, warning: 0 };
    }
  }

  // 🔥 NOWA FUNKCJA: Aktualizuje badge na kafelku archiwum
  async function updateArchiveBadge() {
    const archiveNavBtn = document.querySelector('[data-navigate="archive"]');
    if (!archiveNavBtn) {
      console.warn('⚠️ Nie znaleziono przycisku archiwum!');
      return;
    }
    
    const stats = await checkUpcomingDeletions();
    console.log('🎯 Aktualizuję badge, stats:', stats); // DEBUG
    
    // Usuń stary badge jeśli istnieje
    const oldBadge = archiveNavBtn.querySelector('.archive-warning-badge');
    if (oldBadge) oldBadge.remove();
    
    // Dodaj nowy badge jeśli są ostrzeżenia
    if (stats.critical > 0 || stats.warning > 0) {
      const badge = document.createElement('div');
      badge.className = 'archive-warning-badge';
      
      if (stats.critical > 0) {
        badge.classList.add('critical');
        badge.innerHTML = `⚠️ ${stats.critical} ${stats.critical === 1 ? 'wpis' : 'wpisy'} do usunięcia!`;
      } else {
        badge.classList.add('warning');
        badge.innerHTML = `⏰ ${stats.warning} ${stats.warning === 1 ? 'wpis' : 'wpisy'} wkrótce usuniętych`;
      }
      
      archiveNavBtn.appendChild(badge);
      console.log('✅ Badge dodany!', badge); // DEBUG
    } else {
      console.log('ℹ️ Brak ostrzeżeń - badge nie dodany');
    }
  }

  // 🔥 NOWA FUNKCJA: Prosi o pozwolenie na powiadomienia
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      showToast('Twoja przeglądarka nie wspiera powiadomień', 'error');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }

  // 🔥 NOWA FUNKCJA: Ustawia przypomnienie
  async function scheduleArchiveReminder() {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      showToast('Odmówiono dostępu do powiadomień', 'error');
      return;
    }
    
    const stats = await checkUpcomingDeletions();
    
    if (stats.critical === 0 && stats.warning === 0) {
      showToast('Brak prań do usunięcia w najbliższym czasie', 'info');
      return;
    }
    
    // Zapisz w localStorage timestamp przypomnienia
    const reminderTime = new Date();
    reminderTime.setHours(9, 0, 0, 0); // Jutro o 9:00
    reminderTime.setDate(reminderTime.getDate() + 1);
    
    localStorage.setItem('archiveReminder', reminderTime.toISOString());
    localStorage.setItem('archiveReminderStats', JSON.stringify(stats));
    
    showToast(`✅ Przypomnienie ustawione na jutro o 9:00`, 'success');
    
    // Jeśli są krytyczne, pokaż natychmiastowe powiadomienie
    if (stats.critical > 0) {
      new Notification('⚠️ Elis - Pilne!', {
        body: `${stats.critical} ${stats.critical === 1 ? 'pranie zostanie usunięte' : 'prania zostaną usunięte'} w ciągu 3 dni!`,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        requireInteraction: true
      });
    }
  }

  // 🔥 NOWA FUNKCJA: Sprawdza czy trzeba wyświetlić przypomnienie
  function checkScheduledReminder() {
    const reminderTime = localStorage.getItem('archiveReminder');
    if (!reminderTime) return;
    
    const now = new Date();
    const scheduled = new Date(reminderTime);
    
    if (now >= scheduled) {
      const stats = JSON.parse(localStorage.getItem('archiveReminderStats') || '{}');
      
      if (Notification.permission === 'granted') {
        new Notification('🔔 Elis - Przypomnienie', {
          body: `Masz ${stats.critical || 0} krytycznych i ${stats.warning || 0} ostrzeżeń w archiwum prań`,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png'
        });
      }
      
      localStorage.removeItem('archiveReminder');
      localStorage.removeItem('archiveReminderStats');
    }
  }

  async function fetchArchiveData(filters = {}) {
    try {
      let query = window.supabase
        .from('washing_archive')
        .select('*')
        .order('archived_at', { ascending: false });
      
      if (filters.dateFrom) {
        query = query.gte('archived_at', filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        query = query.lte('archived_at', filters.dateTo + 'T23:59:59');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // 🔥 POPRAWKA: Użyj danych z bazy JEŚLI ISTNIEJĄ, oblicz tylko gdy brak
      const enrichedData = (data || []).map(item => {
        const archivedDate = new Date(item.archived_at);
        
        // ✅ JEŚLI delete_at jest w bazie - użyj go!
        let deleteDate;
        if (item.delete_at) {
          deleteDate = new Date(item.delete_at);
        } else {
          // Oblicz tylko gdy nie ma w bazie
          deleteDate = new Date(archivedDate);
          deleteDate.setDate(deleteDate.getDate() + 14);
        }
        
        const now = new Date();
        const diffTime = deleteDate - now;
        const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        
        // Oblicz czas prania w godzinach
        const startedDate = new Date(item.started_at);
        const durationMs = archivedDate - startedDate;
        const durationHours = Math.round(durationMs / (1000 * 60 * 60));
        
        return {
          ...item,
          delete_at: deleteDate.toISOString(),
          days_until_deletion: daysLeft,
          duration_hours: item.duration_hours || durationHours
        };
      });
      
      return enrichedData;
    } catch (error) {
      console.error('Błąd pobierania archiwum:', error);
      showToast('Błąd pobierania archiwum: ' + error.message, 'error');
      return [];
    }
  }

  async function loadArchiveData() {
    archiveList.innerHTML = '<div class="empty-state"><div class="empty-state-text">Ładowanie archiwum...</div></div>';
    
    const items = await fetchArchiveData();
    allArchiveItems = items;
    renderArchiveList(items, '');
    
    // 🔥 NOWE: Sprawdź przypomnienia
    checkScheduledReminder();
    
    // 🔥 NOWE: Podepnij przycisk przypomnienia
    const reminderBtn = document.getElementById('setReminderBtn');
    if (reminderBtn) {
      reminderBtn.addEventListener('click', scheduleArchiveReminder);
    }
    
    const archiveDateFrom = document.getElementById('archiveDateFrom');
    const archiveDateTo = document.getElementById('archiveDateTo');
    const archiveDateReset = document.getElementById('archiveDateReset');
    
    if (archiveSearch) {
      // Usuń stare listenery (jeśli są)
      const newArchiveSearch = archiveSearch.cloneNode(true);
      archiveSearch.parentNode.replaceChild(newArchiveSearch, archiveSearch);
      
      newArchiveSearch.addEventListener('input', async (e) => {
        const filters = {
          dateFrom: archiveDateFrom?.value,
          dateTo: archiveDateTo?.value
        };
        const data = await fetchArchiveData(filters);
        renderArchiveList(data, e.target.value);
      });
    }
    
    if (archiveDateFrom || archiveDateTo) {
      [archiveDateFrom, archiveDateTo].forEach(input => {
        if (input) {
          input.addEventListener('change', async () => {
            const filters = {
              dateFrom: archiveDateFrom?.value,
              dateTo: archiveDateTo?.value
            };
            const data = await fetchArchiveData(filters);
            const searchValue = document.getElementById('archiveSearch')?.value || '';
            renderArchiveList(data, searchValue);
          });
        }
      });
    }
    
    if (archiveDateReset) {
      archiveDateReset.addEventListener('click', async () => {
        if (archiveDateFrom) archiveDateFrom.value = '';
        if (archiveDateTo) archiveDateTo.value = '';
        const data = await fetchArchiveData();
        const searchValue = document.getElementById('archiveSearch')?.value || '';
        renderArchiveList(data, searchValue);
      });
    }
  }

  function renderArchiveList(items, filter = '') {
    const filtered = items.filter(item => {
      const search = filter.toLowerCase();
      return (item.mat_name?.toLowerCase() || '').includes(search) ||
            (item.mat_location?.toLowerCase() || '').includes(search) ||
            (item.mat_size?.toLowerCase() || '').includes(search) ||
            (item.shift?.toLowerCase() || '').includes(search);
    });
    
    const totalMats = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    archiveCount.textContent = `${items.length} wpisów (${totalMats} mat)`;
    
    if (filter) {
      archiveFiltered.style.display = 'inline';
      const filteredMats = filtered.reduce((sum, item) => sum + (item.quantity || 0), 0);
      archiveFiltered.textContent = `Znaleziono: ${filtered.length} (${filteredMats} mat)`;
    } else {
      archiveFiltered.style.display = 'none';
    }
    
    if (filtered.length === 0) {
      archiveList.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <div class="empty-state-text">${filter ? 'Nie znaleziono wpisów' : 'Archiwum jest puste'}</div>
        </div>
      `;
      return;
    }
    
    // 🔥 POPRAWKA: Przenosimy deklaracje zmiennych DO WNĘTRZA map()
    // W renderArchiveList, zmień część z duration_hours na:
    archiveList.innerHTML = filtered.map(item => {
      const startDate = new Date(item.started_at);
      const archiveDate = new Date(item.archived_at);
      const deleteDate = new Date(item.delete_at);
      const daysLeft = item.days_until_deletion;

      // ✅ OBLICZ DNI PRANIA (zamiast godzin)
      const diffMs = archiveDate - startDate;
      const durationDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const durationText = durationDays === 1 ? '1 dzień' : `${durationDays} dni`;

      let countdownClass = 'archive-countdown-ok';
      let countdownIcon = '📅';
      if (daysLeft <= 3) {
        countdownClass = 'archive-countdown-warning';
        countdownIcon = '⚠️';
      } else if (daysLeft <= 7) {
        countdownClass = 'archive-countdown-notice';
        countdownIcon = '⏰';
      }

      const totalDays = 14;
      const elapsedDays = totalDays - daysLeft;
      const progressPercent = (elapsedDays / totalDays) * 100;

      let progressColor = 'linear-gradient(90deg, #10b981, #059669)';
      if (daysLeft <= 3) {
        progressColor = 'linear-gradient(90deg, #f87171, #ef4444)';
      } else if (daysLeft <= 7) {
        progressColor = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
      }
      
      return `
        <div class="archive-item">
          <div class="archive-item-header">
            <div class="archive-item-name">
              ${item.mat_name}
              ${item.quantity > 1 ? `<span class="archive-item-qty-badge">×${item.quantity}</span>` : ''}
            </div>
            <div class="archive-item-shift">${item.shift || '-'}</div>
          </div>
          
          <div class="archive-item-details">
            ${item.mat_location ? `<div class="archive-item-detail"><span>📍</span><strong>${item.mat_location}</strong></div>` : ''}
            ${item.mat_size ? `<div class="archive-item-detail"><span>📏</span><span>${item.mat_size}</span></div>` : ''}
            <div class="archive-item-detail"><span>⏱️</span><span>Prane: ${durationText} temu}</span></div>
          </div>
          
          <div class="archive-item-dates">
            <div class="archive-date-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>
                <span class="archive-date-label">Rozpoczęto:</span>
                ${startDate.toLocaleDateString('pl-PL')} ${startDate.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
            <div class="archive-date-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="21 8 21 21 3 21 3 8"></polyline>
                <rect x="1" y="3" width="22" height="5"></rect>
              </svg>
              <span>
                <span class="archive-date-label">Zarchiwizowano:</span>
                ${archiveDate.toLocaleDateString('pl-PL')} ${archiveDate.toLocaleTimeString('pl-PL', {hour: '2-digit', minute: '2-digit'})}
              </span>
            </div>
          </div>
          
          <div class="archive-time-progress">
            <div class="archive-time-progress-bar">
              <div class="archive-time-progress-fill" style="width: ${progressPercent}%; background: ${progressColor}"></div>
            </div>
            <div class="archive-time-progress-labels">
              <span class="archive-time-elapsed">${elapsedDays} dni minęło</span>
              <span class="archive-time-left">${daysLeft} dni zostało</span>
            </div>
          </div>

          <div class="archive-countdown ${countdownClass}">
            <span class="archive-countdown-icon">${countdownIcon}</span>
            <span class="archive-countdown-text">
              Automatyczne usunięcie za: <strong>${daysLeft} ${daysLeft === 1 ? 'dzień' : 'dni'}</strong>
              <span class="archive-countdown-date">(${deleteDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })})</span>
            </span>
          </div>
        </div>
      `;
    }).join('');

    updateArchiveStats(items);
  }

  function updateArchiveStats(items) {
    if (items.length === 0) {
      document.getElementById('archiveTotalEntries').textContent = '0';
      document.getElementById('archiveTotalMats').textContent = '0';
      document.getElementById('archiveDateRange').textContent = '-';
      return;
    }
    
    const totalMats = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const dates = items.map(item => new Date(item.archived_at)).sort((a, b) => a - b);
    const oldest = dates[0];
    const newest = dates[dates.length - 1];
    
    document.getElementById('archiveTotalEntries').textContent = items.length;
    document.getElementById('archiveTotalMats').textContent = totalMats;
    
    if (oldest.toDateString() === newest.toDateString()) {
      document.getElementById('archiveDateRange').textContent = oldest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
    } else {
      document.getElementById('archiveDateRange').textContent = 
        `${oldest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })} - ${newest.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })}`;
    }
  }

  if (washingSearch) {
    washingSearch.addEventListener('input', (e) => {
      renderWashingList(allWashingItems, e.target.value);
    });
  }

  addToWashingBtn.addEventListener("click", async () => {
    if (!appState.washingMat) return;

    const currentShift = getCurrentShift();
    if (!currentShift) {
      showToast("Można dodawać maty do prania tylko podczas zmian (6-14 i 14-22).", "error");
      return;
    }

    const matDetails = allLogoMats.find(m => m.name === appState.washingMat);
    if (!matDetails) {
      showToast("Nie znaleziono szczegółów maty. Spróbuj odświeżyć.", "error");
      return;
    }

    const qtyToWash = Number(washingQty.value);

    if (qtyToWash < 1 || qtyToWash > 100) {
      showToast("Ilość musi być od 1 do 100!", "error");
      return;
    }

    try {
      addToWashingBtn.disabled = true;
      addToWashingBtn.textContent = 'Dodawanie...';

      // 🔥 NOWE: Sprawdź czy mata była dodana w ciągu ostatnich 5 minut
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { data: recentMats, error: fetchError } = await window.supabase
        .from('washing_queue')
        .select('*')
        .eq('mat_name', matDetails.name)
        .eq('shift', currentShift)
        .gte('started_at', fiveMinutesAgo.toISOString())
        .order('started_at', { ascending: false })
        .limit(1);
      
      if (fetchError) throw fetchError;

      // 🔥 Jeśli znaleziono matę w ciągu 5 min - ZWIĘKSZ ILOŚĆ
      if (recentMats && recentMats.length > 0) {
        const existingMat = recentMats[0];
        const newQuantity = existingMat.quantity + qtyToWash;
        
        const { error: updateError } = await window.supabase
          .from('washing_queue')
          .update({ quantity: newQuantity })
          .eq('id', existingMat.id);
        
        if (updateError) throw updateError;
        
        showToast(`✅ Zwiększono ilość! Razem: ${newQuantity} × ${matDetails.name}`);
        
      } else {
        // 🔥 Jeśli NIE znaleziono - DODAJ NOWY WPIS
        const matToAdd = {
          mat_name: matDetails.name,
          mat_location: matDetails.location,
          mat_size: matDetails.size,
          quantity: qtyToWash,
          shift: currentShift
        };
        
        const { error: insertError } = await window.supabase
          .from('washing_queue')
          .insert([matToAdd]);

        if (insertError) throw insertError;

        showToast(`✅ Dodano ${qtyToWash} × ${matDetails.name} do prania!`);
      }
      
      washingMatSelectWrapper.reset('— wybierz matę logo —');
      washingQty.value = 1;
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();

    } catch (error) {
      console.error("Błąd dodawania do prania:", error);
      showToast("Błąd zapisu do bazy danych.", "error");
    } finally {
      addToWashingBtn.disabled = false;
      addToWashingBtn.textContent = 'Wrzuć do prania';
    }
  });

  activeWashingList.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const washingItem = e.target.closest('[data-washing-id]');
    
    if (!washingItem || !action) return;
    
    const washingId = washingItem.dataset.washingId;
    
    try {
      const { data, error } = await window.supabase
        .from('washing_queue')
        .select('*')
        .eq('id', washingId);  // 🔥 USUNIĘTO .single()
      
      if (error) throw error;
      
      // 🔥 NOWE: Sprawdź czy znaleziono dane
      if (!data || data.length === 0) {
        showToast('Nie znaleziono maty w praniu', 'error');
        return;
      }
      
      const item = data[0];  // 🔥 Weź pierwszy element z tablicy
      
      if (action === 'edit-washing') {
        openEditWashingModal(item);  // 🔥 Użyj 'item' zamiast 'data'
      } else if (action === 'delete-washing') {
        openDeleteWashingModal(item);  // 🔥 Użyj 'item'
      }
    } catch (error) {
      console.error('Błąd pobierania danych prania:', error);
      showToast('Błąd pobierania danych: ' + error.message, 'error');
    }
  });

  function openEditWashingModal(item) {
    editingWashingItem = item;
    editWashingMatName.textContent = item.mat_name;
    
    editWashingQtyInput.value = item.quantity;
    editWashingQtyInput.min = 1;
    editWashingQtyInput.max = 100;
    
    openModal(editWashingModal);
  }

  function openDeleteWashingModal(item) {
    deletingWashingItem = item;
    const qtyText = item.quantity > 1 ? ` (${item.quantity} szt.)` : '';
    deleteWashingText.innerHTML = `Czy na pewno usunąć z prania:<br><b>${item.mat_name}${qtyText}</b>?`;
    openModal(deleteWashingModal);
  }

  editWashingQtyDec.addEventListener('click', () => {
    editWashingQtyInput.value = Math.max(1, Number(editWashingQtyInput.value) - 1);
  });

  editWashingQtyInc.addEventListener('click', () => {
    const max = Number(editWashingQtyInput.max);
    editWashingQtyInput.value = Math.min(max, Number(editWashingQtyInput.value) + 1);
  });

  editWashingSave.addEventListener('click', async () => {
    if (!editingWashingItem) return;
    
    const newQty = Number(editWashingQtyInput.value);
    
    if (newQty < 1 || newQty > 100) {
      showToast('Ilość musi być od 1 do 100!', 'error');
      return;
    }

    try {
      const { error: updateError } = await window.supabase
        .from('washing_queue')
        .update({ quantity: newQty })
        .eq('id', editingWashingItem.id);
      
      if (updateError) throw updateError;
      
      showToast('✅ Zaktualizowano ilość!');
      closeModal(editWashingModal);
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();
      
    } catch (error) {
      console.error('Błąd aktualizacji:', error);
      showToast('Błąd zapisu do bazy.', 'error');
    }
  });

  deleteWashingConfirm.addEventListener('click', async () => {
    if (!deletingWashingItem) return;
    
    try {
      const { error: deleteError } = await window.supabase
        .from('washing_queue')
        .delete()
        .eq('id', deletingWashingItem.id);
      
      if (deleteError) throw deleteError;
      
      showToast('🗑️ Usunięto z prania!', 'error');
      closeModal(deleteWashingModal);
      
      const activeItems = await fetchActiveWashing();
      allWashingItems = activeItems;
      renderWashingList(activeItems, washingSearch?.value || '');
      updateWashingFormState();
      
    } catch (error) {
      console.error('Błąd usuwania:', error);
      showToast('Błąd usuwania z bazy.', 'error');
    }
  });

  editWashingCancel.addEventListener('click', () => closeModal(editWashingModal));
  deleteWashingCancel.addEventListener('click', () => closeModal(deleteWashingModal));

  // ==================== ARCHIWIZACJA ====================
  
  async function checkAndArchiveOldWashing() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const { data: washingItems, error: fetchError } = await window.supabase
        .from('washing_queue')
        .select('*');
      
      if (fetchError) throw fetchError;
      if (!washingItems || washingItems.length === 0) return;
      
      const itemsToArchive = washingItems.filter(item => {
        const itemDate = new Date(item.started_at);
        const itemDay = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        return itemDay < today;
      });
      
      if (itemsToArchive.length === 0) return;
      
      const archiveData = itemsToArchive.map(item => ({
        ...item,
        archived_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await window.supabase
        .from('washing_archive')
        .insert(archiveData);
      
      if (insertError) throw insertError;
      
      const idsToDelete = itemsToArchive.map(item => item.id);
      const { error: deleteError } = await window.supabase
        .from('washing_queue')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) throw deleteError;
      
      console.log(`✅ Zarchiwizowano ${itemsToArchive.length} starych prań`);
      
    } catch (error) {
      console.error('Błąd archiwizacji:', error);
    }
  }

  // ==================== DRUKOWANIE I EXPORT ARCHIWUM ====================

  const printArchiveBtn = document.getElementById('printArchive');
  const exportArchiveExcelBtn = document.getElementById('exportArchiveExcel');

  if (printArchiveBtn) {
    printArchiveBtn.addEventListener('click', () => {
      if (allArchiveItems.length === 0) {
        showToast("Brak danych w archiwum do wydrukowania.", "error");
        return;
      }
      
      const printDate = new Date().toLocaleDateString('pl-PL', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const totalMats = allArchiveItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const sortedItems = [...allArchiveItems].sort((a, b) => {
        return new Date(b.archived_at) - new Date(a.archived_at);
      });
      
      // Grupuj po dacie archiwizacji
      const groupedByDate = {};
      sortedItems.forEach(item => {
        const archDate = new Date(item.archived_at);
        const dateKey = archDate.toLocaleDateString('pl-PL', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
        if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
        groupedByDate[dateKey].push(item);
      });
      
      let printHTML = `
        <div class="print-header">
          <img src="icons/icon-192.png" alt="Elis Logo">
          <div class="title-block">
            <h1>Archiwum Prań Mat</h1>
            <p>Data wydruku: ${printDate}</p>
          </div>
        </div>
        
        <div class="print-archive-summary">
          <div class="print-summary-row">
            <span class="print-summary-label">Łączna liczba wpisów:</span>
            <span class="print-summary-value">${allArchiveItems.length}</span>
          </div>
          <div class="print-summary-row">
            <span class="print-summary-label">Suma wypranych mat:</span>
            <span class="print-summary-value">${totalMats} szt.</span>
          </div>
        </div>
      `;
      
      // Renderuj grupy po datach
      Object.keys(groupedByDate).forEach(dateKey => {
        const dayItems = groupedByDate[dateKey];
        const dayQty = dayItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        printHTML += `
          <div class="print-archive-date-section">
            <h2 class="print-archive-date-header">
              📅 ${dateKey} 
              <span class="print-archive-date-badge">${dayItems.length} ${dayItems.length === 1 ? 'wpis' : 'wpisów'} (${dayQty} szt.)</span>
            </h2>
            <table class="print-archive-table">
              <thead>
                <tr>
                  <th>Mata</th>
                  <th>Lokalizacja</th>
                  <th>Rozmiar</th>
                  <th>Ilość</th>
                  <th>Zmiana</th>
                  <th>Prane (dni temu)</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        dayItems.forEach(item => {
          // Oblicz dni prania
          const startDate = new Date(item.started_at);
          const archDate = new Date(item.archived_at);
          const diffMs = archDate - startDate;
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const daysText = days === 1 ? '1 dzień' : `${days} dni`;
          
          printHTML += `
            <tr>
              <td><strong>${item.mat_name}</strong></td>
              <td>${item.mat_location || '—'}</td>
              <td>${item.mat_size || '—'}</td>
              <td class="text-center"><strong>${item.quantity || 1}</strong></td>
              <td class="text-center">${item.shift || '—'}</td>
              <td class="text-center">${daysText}</td>
            </tr>
          `;
        });
        
        printHTML += `
              </tbody>
            </table>
          </div>
        `;
      });
      
      printHTML += `
        <div class="print-archive-footer">
          <p><strong>Elis ServiceHub</strong> - System Zarządzania Matami</p>
          <p style="margin-top: 8px; font-size: 9pt; color: #6b7280;">
            Raport zawiera kompletną historię prań mat z podziałem na daty archiwizacji
          </p>
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
  }

  // ========== EXPORT ARCHIWUM DO EXCELA ==========
  if (exportArchiveExcelBtn) {
    exportArchiveExcelBtn.addEventListener('click', async () => {
      if (allArchiveItems.length === 0) {
        showToast("Brak danych w archiwum do wyeksportowania.", "error");
        return;
      }
      if (typeof ExcelJS === 'undefined') {
        showToast("Biblioteka Excel nie jest załadowana", "error");
        return;
      }

      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Archiwum Prań', { 
          pageSetup: { 
            paperSize: 9, 
            orientation: 'landscape', 
            fitToPage: true, 
            fitToWidth: 1, 
            fitToHeight: 0 
          } 
        });
        
        workbook.creator = 'Elis ServiceHub';
        workbook.created = new Date();
        workbook.company = 'Elis';
        
        const currentDate = new Date().toLocaleDateString('pl-PL', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        // NAGŁÓWEK
        worksheet.mergeCells('A1:G1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'ELIS - ARCHIWUM PRAŃ MAT';
        titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A9BE' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 40;

        worksheet.mergeCells('A2:G2');
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Data wygenerowania: ${currentDate}`;
        dateCell.font = { name: 'Calibri', size: 11, italic: true };
        dateCell.alignment = { horizontal: 'center' };
        dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
        worksheet.addRow([]);

        // PODSUMOWANIE
        const totalMats = allArchiveItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const summaryRow1 = worksheet.addRow(['PODSUMOWANIE', '', '', '', '', '', '']);
        worksheet.mergeCells(`A${summaryRow1.number}:G${summaryRow1.number}`);
        summaryRow1.getCell(1).font = { name: 'Calibri', size: 13, bold: true };
        summaryRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3E9F0' } };
        summaryRow1.height = 28;

        const statsRow1 = worksheet.addRow(['Liczba wpisów:', allArchiveItems.length, '', '', '', '', '']);
        const statsRow2 = worksheet.addRow(['Suma wypranych mat:', totalMats, '', '', '', '', '']);
        
        [statsRow1, statsRow2].forEach(row => {
          row.getCell(1).font = { name: 'Calibri', size: 11, bold: true };
          row.getCell(2).font = { name: 'Calibri', size: 11, color: { argb: 'FF00A9BE' } };
          row.getCell(2).alignment = { horizontal: 'left' };
          row.height = 22;
        });
        
        worksheet.addRow([]);

        // NAGŁÓWKI KOLUMN
        const headerRow = worksheet.addRow([
          'Nazwa maty', 
          'Lokalizacja', 
          'Rozmiar', 
          'Ilość', 
          'Zmiana', 
          'Data archiwizacji',
          'Prane (dni temu)'
        ]);
        
        headerRow.height = 32;
        headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1117' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.eachCell((cell) => { 
          cell.border = { 
            top: { style: 'thin', color: { argb: 'FF000000' } }, 
            left: { style: 'thin', color: { argb: 'FF000000' } }, 
            bottom: { style: 'medium', color: { argb: 'FF000000' } }, 
            right: { style: 'thin', color: { argb: 'FF000000' } } 
          }; 
        });

        // DANE
        const sortedItems = [...allArchiveItems].sort((a, b) => {
          return new Date(b.archived_at) - new Date(a.archived_at);
        });

        sortedItems.forEach((item, index) => {
          const archDate = new Date(item.archived_at);
          const archDateStr = archDate.toLocaleDateString('pl-PL', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
          });
          
          // Oblicz dni prania
          const startDate = new Date(item.started_at);
          const diffMs = archDate - startDate;
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          
          const row = worksheet.addRow([
            item.mat_name,
            item.mat_location || 'Nie określono',
            item.mat_size || 'Nie określono',
            item.quantity || 1,
            item.shift || '-',
            archDateStr,
            days
          ]);
          
          row.height = 24;
          row.font = { name: 'Calibri', size: 10 };
          
          if (index % 2 === 0) { 
            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }; 
          }
          
          row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
          row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF00A9BE' } };
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
          row.getCell(7).font = { name: 'Calibri', size: 10, bold: true };
          
          row.eachCell((cell) => { 
            cell.border = { 
              top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, 
              right: { style: 'thin', color: { argb: 'FFD1D5DB' } } 
            }; 
          });
        });

        // SZEROKOŚCI KOLUMN
        worksheet.columns = [ 
          { width: 38 }, 
          { width: 25 }, 
          { width: 18 }, 
          { width: 10 }, 
          { width: 15 },
          { width: 18 },
          { width: 18 }
        ];
        
        // STOPKA
        worksheet.addRow([]);
        const footerRow = worksheet.addRow(['Dokument wygenerowany automatycznie przez system Elis ServiceHub', '', '', '', '', '', '']);
        worksheet.mergeCells(`A${footerRow.number}:G${footerRow.number}`);
        footerRow.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7280' } };
        footerRow.getCell(1).alignment = { horizontal: 'center' };

        // ZAPIS I POBIERANIE
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = `Elis_Archiwum_Pran_${new Date().toISOString().split('T')[0]}.xlsx`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(url);
        
        showToast("✅ Wyeksportowano archiwum do Excel!");
        
      } catch (error) {
        console.error('Błąd eksportu archiwum:', error);
        showToast("Błąd podczas eksportu: " + error.message, "error");
      }
    });
  }

  // ==================== SYSTEM PALET W TRASACH ====================

  let palletRoutes = JSON.parse(localStorage.getItem('palletRoutes') || '{}'); // Zmienione na obiekt!

  function updatePalletDisplay() {
    const palletCountSection = document.getElementById('palletCountSection'); // ← pobiera lokalnie
    const palletCountValue = document.getElementById('palletCountValue'); // ← pobiera lokalnie
  }

  function initPalletSystem() {
    const palletCountDec = document.getElementById('palletCountDec'); // ← pobiera lokalnie
    const palletCountInc = document.getElementById('palletCountInc'); // ← pobiera lokalnie
  }

  function savePalletRoutes() {
    localStorage.setItem('palletRoutes', JSON.stringify(palletRoutes));
  }

  function getPalletsForRoute(route) {
    return palletRoutes[route] || 0;
  }

  function updatePalletDisplay() {
    if (!palletCountSection) return; // 🔥 ZABEZPIECZENIE
    
    if (!appState.route) {
      palletCountSection.style.display = 'none';
      return;
    }
    
    const count = getPalletsForRoute(appState.route);
    if (palletCountValue) palletCountValue.textContent = count;
    palletCountSection.style.display = 'block';
  }

  function changePalletCount(delta) {
    if (!appState.route) return;
    
    const currentCount = getPalletsForRoute(appState.route);
    const newCount = Math.max(0, Math.min(99, currentCount + delta));
    
    if (newCount === 0) {
      delete palletRoutes[appState.route];
    } else {
      palletRoutes[appState.route] = newCount;
    }
    
    savePalletRoutes();
    updatePalletDisplay();
    
    // Toast feedback
    if (newCount === 0) {
      showToast(`📦 Usunięto palety z trasy ${appState.route}`, 'error');
    } else {
      const word = newCount === 1 ? 'paleta' : (newCount < 5 ? 'palety' : 'palet');
      showToast(`📦 Trasa ${appState.route}: ${newCount} ${word}`);
    }
  }

  function initPalletSystem() {
    if (!palletCountDec || !palletCountInc) {
      console.warn('⚠️ Elementy systemu palet nie znalezione');
      return;
    }
    
    palletCountDec.addEventListener('click', () => changePalletCount(-1));
    palletCountInc.addEventListener('click', () => changePalletCount(1));
    
    console.log('✅ System palet zainicjalizowany (inline)');
  }

// ==================== INICJALIZACJA ====================
  async function init() {
    const logoMatsPromise = fetchAndCacheLogoMats();
    
    createCustomSelect(routeSelectWrapper, routesByDay, "— wybierz trasę —", "route", true);
    createCustomSelect(baseMatSelectWrapper, mats, "— wybierz matę —", "baseMat");
    createCustomSelect(altMatSelectWrapper, mats, "— wybierz zamiennik —", "altMat");
    createCustomSelect(multiAltSelectWrapper, mats, "— wybierz zamiennik —", "multiAltMat");
    createCustomSelect(editMultiAltSelectWrapper, mats, "— wybierz zamiennik —", "editMultiAltMat");
    createCustomSelect(additionMatSelectWrapper, mats, "— wybierz matę —", "additionMat");
    const distributeMatSelectWrapper = document.getElementById('distributeMatSelectWrapper');
    createCustomSelect(distributeMatSelectWrapper, mats, "— wybierz matę —", "distributeMat");
    createCustomSelect(washingMatSelectWrapper, [], "— wybierz matę logo —", "washingMat");
    
    renderChanges();
    updateFormState();
    
    const logoMatsData = await logoMatsPromise;
    const logoMatNames = logoMatsData.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
    washingMatSelectWrapper.updateOptions(logoMatNames);
    
    // 🔥 NOWE: Aktualizuj badge archiwum przy starcie
    updateArchiveBadge();
    
    // 🔥 NOWE: Sprawdź przypomnienia
    checkScheduledReminder();
    
    // 🔥 NOWE: Odświeżaj badge co 5 minut
    setInterval(updateArchiveBadge, 5 * 60 * 1000);
        
    // ==================== REALTIME SUBSCRIPTIONS ====================

    const washingChannel = window.supabase
      .channel('washing-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'washing_queue' 
      }, async (payload) => {
        console.log('✨ Zmiana w kolejce prania!', payload);
        if (currentView === 'washing') {
          const activeItems = await fetchActiveWashing();
          allWashingItems = activeItems;
          renderWashingList(activeItems, washingSearch?.value || '');
          updateWashingFormState();
        }
      })
      .subscribe();

    const matsChannel = window.supabase
      .channel('mats-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'logo_mats' 
      }, async (payload) => {
        console.log('✨ Zmiana w liście mat!', payload);
        allLogoMats = [];
        const newMats = await fetchAndCacheLogoMats();
        
        if (currentView === 'mats') {
          renderMats(newMats, matsSearch.value);
        }
        
        const logoMatNames = newMats.map(m => m.name).filter((v, i, a) => a.indexOf(v) === i).sort();
        washingMatSelectWrapper.updateOptions(logoMatNames);
      })
      .subscribe();

    // Inicjalizuj system palet
    initPalletSystem();

    navigateTo('home');
  }

  init();

});
