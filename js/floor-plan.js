import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal } from './table-modal.js';

const LANG_KEY = 'tableme_wedding_admin_lang';
const DEFAULT_SEATS = 8;
const CHAIR_SIZE = 22;
const CHAIR_RADIUS_PX = CHAIR_SIZE / 2;
const CHAIR_GAP = 2;
const ROUND_TABLE_R = 44;
const ROUND_CHAIR_RADIUS = ROUND_TABLE_R + CHAIR_GAP + CHAIR_RADIUS_PX;
const RECT_HALF_W = 65;
const RECT_HALF_H = 32;
const RECT_INSET = 18;
const RECT_USABLE_HALF = RECT_HALF_W - RECT_INSET;
const RECT_Y_OFFSET = RECT_HALF_H + CHAIR_GAP + CHAIR_RADIUS_PX;
const TABLE_REACH_PX = 72;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function buildChairs(unitEl, shape, seatCount, guests) {
  const guestCount = guests.length;
  if (shape === 'round') {
    for (let i = 0; i < seatCount; i += 1) {
      const angle = (360 / seatCount) * i;
      const occupied = i < guestCount;
      const chairEl = document.createElement('div');
      chairEl.className = `chair${occupied ? ' occupied' : ''}`;
      if (occupied) {
        const initialsEl = document.createElement('span');
        initialsEl.className = 'chair-initials';
        initialsEl.style.setProperty('--chair-counter-angle', `-${angle}deg`);
        initialsEl.textContent = getInitials(guests[i].name);
        chairEl.appendChild(initialsEl);
      }
      chairEl.style.setProperty('--chair-angle', `${angle}deg`);
      chairEl.style.setProperty('--chair-radius', `-${ROUND_CHAIR_RADIUS}px`);
      unitEl.appendChild(chairEl);
    }
    return;
  }

  const topCount = Math.ceil(seatCount / 2);
  const bottomCount = seatCount - topCount;
  const positions = [];
  const placeRow = (count, y) => {
    if (count <= 0) return;
    if (count === 1) {
      positions.push({ x: 0, y });
      return;
    }
    const span = RECT_USABLE_HALF * 2;
    for (let i = 0; i < count; i += 1) {
      positions.push({ x: -RECT_USABLE_HALF + (i * span) / (count - 1), y });
    }
  };
  placeRow(topCount, -RECT_Y_OFFSET);
  placeRow(bottomCount, RECT_Y_OFFSET);

  positions.forEach((pos, i) => {
    const occupied = i < guestCount;
    const chairEl = document.createElement('div');
    chairEl.className = `chair chair-fixed${occupied ? ' occupied' : ''}`;
    if (occupied) {
      const initialsEl = document.createElement('span');
      initialsEl.className = 'chair-initials';
      initialsEl.textContent = getInitials(guests[i].name);
      chairEl.appendChild(initialsEl);
    }
    chairEl.style.left = `${pos.x}px`;
    chairEl.style.top = `${pos.y}px`;
    unitEl.appendChild(chairEl);
  });
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

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('floor-plan-content');
  const weddingNameEl = document.getElementById('floor-plan-wedding-name');
  const listTabLink = document.getElementById('view-tab-list');

  const addTableBtn = document.getElementById('add-table-btn');
  const floorCanvasEl = document.getElementById('floor-canvas');

  const unassignedListEl = document.getElementById('unassigned-list');
  const unassignedEmptyEl = document.getElementById('unassigned-empty');

  const tableModalApi = createTableModal({
    weddingId,
    getLang: () => currentLang,
    onChange: refreshAll,
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function getSafeMargins() {
    const rect = floorCanvasEl.getBoundingClientRect();
    const marginXPct = rect.width > 0 ? Math.min(45, (TABLE_REACH_PX / rect.width) * 100) : 12;
    const marginYPct = rect.height > 0 ? Math.min(45, (TABLE_REACH_PX / rect.height) * 100) : 12;
    return { marginXPct, marginYPct };
  }

  function clampTablePosition(table) {
    const { marginXPct, marginYPct } = getSafeMargins();
    table.x = clamp(table.x, marginXPct, 100 - marginXPct);
    table.y = clamp(table.y, marginYPct, 100 - marginYPct);
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    tableModalApi.updateLabels();
    renderAll();
  }

  function buildAssignSelectHtml(tables) {
    const placeholder = `<option value="" disabled selected>${escapeHtml(t(currentLang, 'assignToTablePlaceholder'))}</option>`;
    const options = tables.map((tb) => `<option value="${escapeHtml(tb.label)}">${escapeHtml(tb.label)}</option>`).join('');
    return placeholder + options;
  }

  async function fetchWeddingData() {
    wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const { tables, changed } = reconcileTables(wedding);
    let positionsChanged = false;
    tables.forEach((tb) => {
      const before = `${tb.x},${tb.y}`;
      clampTablePosition(tb);
      if (`${tb.x},${tb.y}` !== before) positionsChanged = true;
    });
    wedding.tables = tables;
    if (changed || positionsChanged) await Storage.setTables(weddingId, tables);
  }

  function renderAll() {
    renderCanvas();
    renderUnassignedList();
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
      const { marginXPct, marginYPct } = getSafeMargins();
      table.x = clamp(startX + dx, marginXPct, 100 - marginXPct);
      table.y = clamp(startY + dy, marginYPct, 100 - marginYPct);
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
        await tableModalApi.open(table.id);
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
      const tableGuests = wedding.guests.filter((g) => g.table === table.label);
      const guestCount = tableGuests.length;
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
          tableModalApi.open(table.id);
        }
      });
      unitEl.appendChild(shapeEl);

      buildChairs(unitEl, shape, seatCount, tableGuests);

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
    clampTablePosition(newTable);
    const tables = [...(wedding.tables || []), newTable];
    await Storage.setTables(weddingId, tables);
    await refreshAll();
    await tableModalApi.open(newTable.id);
  });

  unassignedListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.assign-to-table-select');
    if (!select || !select.value) return;
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
  listTabLink.href = `wedding-admin.html?id=${weddingId}`;

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  tableModalApi.updateLabels();
  renderAll();

  const openTableId = params.get('openTable');
  if (openTableId && wedding.tables.some((tb) => tb.id === openTableId)) {
    await tableModalApi.open(openTableId);
  }
})();
