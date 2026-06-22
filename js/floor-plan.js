import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_wedding_admin_lang';
const DEFAULT_SEATS = 8;
const CHAIR_RADIUS = { round: 52, rectangle: 76 };

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nextTableLabel(tables) {
  const used = new Set(tables.map((tb) => tb.label));
  let n = 1;
  while (used.has(String(n))) n += 1;
  return String(n);
}

function reconcileTables(wedding) {
  const tables = Array.isArray(wedding.tables) ? wedding.tables.map((tb) => ({ ...tb })) : [];
  const existingLabels = new Set(tables.map((tb) => tb.label));
  const usedLabels = [...new Set(wedding.guests.map((g) => g.table).filter(Boolean))];
  let changed = false;
  let i = 0;
  usedLabels.forEach((label) => {
    if (!existingLabels.has(label)) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      tables.push({
        id: generateId(),
        label,
        shape: 'round',
        x: 16 + col * 24,
        y: 18 + row * 26,
        seats: null,
      });
      existingLabels.add(label);
      changed = true;
      i += 1;
    }
  });
  return { tables, changed };
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let wedding = null;
  let activeTableId = null;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('floor-plan-content');
  const weddingNameEl = document.getElementById('floor-plan-wedding-name');
  const backToListLink = document.getElementById('back-to-list-link');

  const addTableBtn = document.getElementById('add-table-btn');
  const floorCanvasEl = document.getElementById('floor-canvas');

  const unassignedListEl = document.getElementById('unassigned-list');
  const unassignedEmptyEl = document.getElementById('unassigned-empty');

  const tableModal = document.getElementById('table-modal');
  const tableModalClose = document.getElementById('table-modal-close');
  const tableLabelInput = document.getElementById('table-label-input');
  const tableDeleteBtn = document.getElementById('table-delete-btn');
  const tableSeatsInput = document.getElementById('table-seats-input');
  const shapeRadios = document.querySelectorAll('input[name="table-shape"]');
  const tableModalGuestList = document.getElementById('table-modal-guest-list');
  const tableModalEmptyEl = document.getElementById('table-modal-empty');
  const tableAddExistingSelect = document.getElementById('table-add-existing-select');
  const tableAddExistingBtn = document.getElementById('table-add-existing-btn');
  const tableAddNewInput = document.getElementById('table-add-new-input');
  const tableAddNewBtn = document.getElementById('table-add-new-btn');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    renderAll();
  }

  function buildAssignSelectHtml(tables) {
    const placeholder = `<option value="" disabled selected>${escapeHtml(t(currentLang, 'assignToTablePlaceholder'))}</option>`;
    const options = tables.map((tb) => `<option value="${escapeHtml(tb.label)}">${escapeHtml(tb.label)}</option>`).join('');
    return placeholder + options;
  }

  function buildMoveSelectHtml(tables, currentLabel) {
    const unassignedOpt = `<option value="" ${currentLabel === '' ? 'selected' : ''}>${escapeHtml(t(currentLang, 'unassignedOption'))}</option>`;
    const options = tables
      .map((tb) => `<option value="${escapeHtml(tb.label)}" ${tb.label === currentLabel ? 'selected' : ''}>${escapeHtml(tb.label)}</option>`)
      .join('');
    return unassignedOpt + options;
  }

  async function fetchWeddingData() {
    wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const { tables, changed } = reconcileTables(wedding);
    wedding.tables = tables;
    if (changed) await Storage.setTables(weddingId, tables);
  }

  function renderAll() {
    renderCanvas();
    renderUnassignedList();
    if (activeTableId) renderTableModalContent();
  }

  async function refreshAll() {
    await fetchWeddingData();
    renderAll();
  }

  async function setGuestTable(guestId, tableLabel) {
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table: tableLabel } : g));
    await Storage.setGuests(weddingId, guests);
    await refreshAll();
  }

  function attachTableDrag(unitEl, shapeEl, table) {
    let pointerId = null;
    let startClientX = 0;
    let startClientY = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;

    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      const rect = floorCanvasEl.getBoundingClientRect();
      const rawDx = e.clientX - startClientX;
      const rawDy = e.clientY - startClientY;
      if (Math.abs(rawDx) > 5 || Math.abs(rawDy) > 5) moved = true;
      const dx = (rawDx / rect.width) * 100;
      const dy = (rawDy / rect.height) * 100;
      table.x = clamp(startX + dx, 4, 96);
      table.y = clamp(startY + dy, 4, 92);
      unitEl.style.left = `${table.x}%`;
      unitEl.style.top = `${table.y}%`;
    }

    async function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      shapeEl.releasePointerCapture(pointerId);
      shapeEl.removeEventListener('pointermove', onPointerMove);
      shapeEl.removeEventListener('pointerup', onPointerUp);
      shapeEl.classList.remove('dragging-table');
      pointerId = null;
      if (moved) {
        await Storage.setTables(weddingId, wedding.tables);
      } else {
        openTableModal(table.id);
      }
    }

    shapeEl.addEventListener('pointerdown', (e) => {
      pointerId = e.pointerId;
      startClientX = e.clientX;
      startClientY = e.clientY;
      startX = table.x;
      startY = table.y;
      moved = false;
      shapeEl.classList.add('dragging-table');
      shapeEl.setPointerCapture(pointerId);
      shapeEl.addEventListener('pointermove', onPointerMove);
      shapeEl.addEventListener('pointerup', onPointerUp);
    });
  }

  function renderCanvas() {
    floorCanvasEl.innerHTML = '';
    (wedding.tables || []).forEach((table) => {
      const guestCount = wedding.guests.filter((g) => g.table === table.label).length;
      const shape = table.shape === 'rectangle' ? 'rectangle' : 'round';
      const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;

      const unitEl = document.createElement('div');
      unitEl.className = 'table-unit';
      unitEl.style.left = `${table.x}%`;
      unitEl.style.top = `${table.y}%`;
      unitEl.dataset.id = table.id;

      const shapeEl = document.createElement('div');
      shapeEl.className = `table-shape ${shape}`;
      shapeEl.tabIndex = 0;
      shapeEl.innerHTML = `
        <span class="table-shape-label">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(table.label)}</span>
        <span class="table-shape-count">${guestCount}/${seatCount}</span>
      `;
      shapeEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTableModal(table.id);
        }
      });
      unitEl.appendChild(shapeEl);

      const radius = CHAIR_RADIUS[shape];
      for (let i = 0; i < seatCount; i += 1) {
        const angle = (360 / seatCount) * i;
        const chairEl = document.createElement('div');
        chairEl.className = `chair${i < guestCount ? ' occupied' : ''}`;
        chairEl.style.setProperty('--chair-angle', `${angle}deg`);
        chairEl.style.setProperty('--chair-radius', `-${radius}px`);
        unitEl.appendChild(chairEl);
      }

      attachTableDrag(unitEl, shapeEl, table);
      floorCanvasEl.appendChild(unitEl);
    });
  }

  function renderUnassignedList() {
    const unassigned = wedding.guests.filter((g) => !g.table);
    unassignedListEl.innerHTML = '';
    unassignedEmptyEl.hidden = unassigned.length === 0;
    unassigned.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'unassigned-row';
      li.dataset.id = g.id;
      li.innerHTML = `
        <span class="guest-row-name">${escapeHtml(g.name)}</span>
        <select class="assign-to-table-select" data-id="${g.id}">${buildAssignSelectHtml(wedding.tables || [])}</select>
      `;
      unassignedListEl.appendChild(li);
    });
  }

  function renderTableModalContent() {
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) {
      closeTableModal();
      return;
    }

    tableLabelInput.value = table.label;
    shapeRadios.forEach((radio) => {
      radio.checked = radio.value === (table.shape || 'round');
    });
    tableSeatsInput.value = table.seats != null ? table.seats : DEFAULT_SEATS;

    const guests = wedding.guests.filter((g) => g.table === table.label);
    tableModalEmptyEl.hidden = guests.length > 0;
    tableModalGuestList.innerHTML = '';
    guests.forEach((g) => {
      const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
      const li = document.createElement('li');
      li.className = 'table-modal-guest-row';
      li.dataset.id = g.id;
      li.innerHTML = `
        <span class="guest-row-name">${escapeHtml(g.name)}</span>
        <select class="move-to-table-select" data-id="${g.id}">${buildMoveSelectHtml(wedding.tables, table.label)}</select>
        <button type="button" class="icon-btn icon-btn-danger" data-action="delete-guest" data-id="${g.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
      `;
      tableModalGuestList.appendChild(li);
    });

    const unassigned = wedding.guests.filter((g) => !g.table);
    if (unassigned.length === 0) {
      tableAddExistingSelect.innerHTML = '';
      tableAddExistingSelect.disabled = true;
      tableAddExistingBtn.disabled = true;
    } else {
      tableAddExistingSelect.disabled = false;
      tableAddExistingBtn.disabled = false;
      tableAddExistingSelect.innerHTML = unassigned
        .map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`)
        .join('');
    }
  }

  function openTableModal(tableId) {
    activeTableId = tableId;
    renderTableModalContent();
    tableModal.hidden = false;
  }

  function closeTableModal() {
    tableModal.hidden = true;
    activeTableId = null;
  }

  addTableBtn.addEventListener('click', async () => {
    const label = nextTableLabel(wedding.tables || []);
    const newTable = {
      id: generateId(),
      label,
      shape: 'round',
      x: 50 + (Math.random() * 16 - 8),
      y: 50 + (Math.random() * 16 - 8),
      seats: null,
    };
    const tables = [...(wedding.tables || []), newTable];
    await Storage.setTables(weddingId, tables);
    await refreshAll();
    openTableModal(newTable.id);
  });

  unassignedListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.assign-to-table-select');
    if (!select || !select.value) return;
    await setGuestTable(select.dataset.id, select.value);
  });

  tableModalClose.addEventListener('click', closeTableModal);
  tableModal.addEventListener('click', (e) => {
    if (e.target === tableModal) closeTableModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tableModal.hidden) closeTableModal();
  });

  tableLabelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tableLabelInput.blur();
  });

  tableLabelInput.addEventListener('change', async () => {
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    const newLabel = tableLabelInput.value.trim();
    if (!newLabel) {
      alert(t(currentLang, 'tableLabelEmptyError'));
      tableLabelInput.value = table.label;
      return;
    }
    if (newLabel === table.label) return;
    if (wedding.tables.some((tb) => tb.label === newLabel)) {
      alert(t(currentLang, 'tableLabelDuplicateError'));
      tableLabelInput.value = table.label;
      return;
    }
    const oldLabel = table.label;
    const tables = wedding.tables.map((tb) => (tb.id === table.id ? { ...tb, label: newLabel } : tb));
    const guests = wedding.guests.map((g) => (g.table === oldLabel ? { ...g, table: newLabel } : g));
    await Storage.setBoard(weddingId, { guests, tables });
    await refreshAll();
  });

  shapeRadios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      const tables = wedding.tables.map((tb) => (tb.id === activeTableId ? { ...tb, shape: radio.value } : tb));
      await Storage.setTables(weddingId, tables);
      await refreshAll();
    });
  });

  tableSeatsInput.addEventListener('change', async () => {
    const value = tableSeatsInput.value.trim();
    const seats = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    const tables = wedding.tables.map((tb) => (tb.id === activeTableId ? { ...tb, seats } : tb));
    await Storage.setTables(weddingId, tables);
    await refreshAll();
  });

  tableDeleteBtn.addEventListener('click', async () => {
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    const affected = wedding.guests.filter((g) => g.table === table.label).length;
    if (!confirm(t(currentLang, 'confirmDeleteTable', affected))) return;
    const tables = wedding.tables.filter((tb) => tb.id !== table.id);
    const guests = wedding.guests.map((g) => (g.table === table.label ? { ...g, table: '' } : g));
    await Storage.setBoard(weddingId, { guests, tables });
    closeTableModal();
    await refreshAll();
  });

  tableAddExistingBtn.addEventListener('click', async () => {
    const guestId = tableAddExistingSelect.value;
    if (!guestId) return;
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    await setGuestTable(guestId, table.label);
  });

  async function addNewGuestToActiveTable() {
    const name = tableAddNewInput.value.trim();
    if (!name) return;
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    await Storage.addGuest(weddingId, name, table.label);
    tableAddNewInput.value = '';
    await refreshAll();
  }

  tableAddNewBtn.addEventListener('click', addNewGuestToActiveTable);
  tableAddNewInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewGuestToActiveTable();
    }
  });

  tableModalGuestList.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="delete-guest"]');
    if (!btn) return;
    await Storage.deleteGuest(weddingId, btn.dataset.id);
    await refreshAll();
  });

  tableModalGuestList.addEventListener('change', async (e) => {
    const select = e.target.closest('.move-to-table-select');
    if (!select) return;
    await setGuestTable(select.dataset.id, select.value);
  });

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  await fetchWeddingData();
  if (!wedding) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  if (!localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backToListLink.href = `wedding-admin.html?id=${weddingId}`;

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  renderAll();
})();
