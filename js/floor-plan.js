import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal } from './table-modal.js';
import { DEFAULT_SEATS, getRectDimensions, getTableReach, buildChairs } from './table-shape.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const CANVAS_WIDTH = 1500;
const CANVAS_HEIGHT = 900;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.15;

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
  let zoom = 1;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('floor-plan-content');
  const weddingNameEl = document.getElementById('floor-plan-wedding-name');
  const listTabLink = document.getElementById('view-tab-list');

  const floorPlanCardEl = document.getElementById('floor-plan-card');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const fullscreenCloseBtn = document.getElementById('fullscreen-close-btn');
  const addTableBtn = document.getElementById('add-table-btn');
  const floorCanvasViewportEl = document.getElementById('floor-canvas-viewport');
  const floorCanvasSizerEl = document.getElementById('floor-canvas-sizer');
  const floorCanvasEl = document.getElementById('floor-canvas');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');

  const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
  fullscreenBtn.innerHTML = EXPAND_ICON;

  function setFullscreen(active) {
    floorPlanCardEl.classList.toggle('fullscreen-active', active);
    fullscreenCloseBtn.hidden = !active;
    document.body.style.overflow = active ? 'hidden' : '';
  }

  fullscreenBtn.addEventListener('click', () => setFullscreen(true));
  fullscreenCloseBtn.addEventListener('click', () => setFullscreen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!floorPlanCardEl.classList.contains('fullscreen-active')) return;
    const modalEl = document.getElementById('table-modal');
    if (modalEl && !modalEl.hidden) return;
    setFullscreen(false);
  });

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

  function applyZoom() {
    floorCanvasEl.style.transform = `scale(${zoom})`;
    floorCanvasSizerEl.style.width = `${CANVAS_WIDTH * zoom}px`;
    floorCanvasSizerEl.style.height = `${CANVAS_HEIGHT * zoom}px`;
    zoomResetBtn.textContent = `${Math.round(zoom * 100)}%`;
  }

  function setZoom(value) {
    zoom = clamp(Math.round(value * 100) / 100, ZOOM_MIN, ZOOM_MAX);
    applyZoom();
  }

  function getSafeMargins(table) {
    const reach = getTableReach(table);
    const marginXPct = Math.min(45, (reach.x / CANVAS_WIDTH) * 100);
    const marginYPct = Math.min(45, (reach.y / CANVAS_HEIGHT) * 100);
    return { marginXPct, marginYPct };
  }

  function clampTablePosition(table) {
    const { marginXPct, marginYPct } = getSafeMargins(table);
    table.x = clamp(table.x, marginXPct, 100 - marginXPct);
    table.y = clamp(table.y, marginYPct, 100 - marginYPct);
  }

  function updateFullscreenLabel() {
    const label = t(currentLang, 'fullscreenBtn');
    fullscreenBtn.title = label;
    fullscreenBtn.setAttribute('aria-label', label);
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    tableModalApi.updateLabels();
    updateFullscreenLabel();
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
      const { marginXPct, marginYPct } = getSafeMargins(table);
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
      if (shape === 'rectangle') {
        const { halfWidth } = getRectDimensions(seatCount);
        shapeEl.style.width = `${halfWidth * 2}px`;
      }
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

  zoomInBtn.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
  zoomResetBtn.addEventListener('click', () => setZoom(1));

  let panPointerId = null;
  let panStartX = 0;
  let panStartY = 0;
  let panStartScrollLeft = 0;
  let panStartScrollTop = 0;

  floorCanvasViewportEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.table-shape')) return;
    panPointerId = e.pointerId;
    panStartX = e.clientX;
    panStartY = e.clientY;
    panStartScrollLeft = floorCanvasViewportEl.scrollLeft;
    panStartScrollTop = floorCanvasViewportEl.scrollTop;
    floorCanvasViewportEl.classList.add('panning');
    floorCanvasViewportEl.setPointerCapture(panPointerId);
  });

  floorCanvasViewportEl.addEventListener('pointermove', (e) => {
    if (e.pointerId !== panPointerId) return;
    floorCanvasViewportEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX);
    floorCanvasViewportEl.scrollTop = panStartScrollTop - (e.clientY - panStartY);
  });

  function endPan(e) {
    if (e.pointerId !== panPointerId) return;
    floorCanvasViewportEl.releasePointerCapture(panPointerId);
    floorCanvasViewportEl.classList.remove('panning');
    panPointerId = null;
  }
  floorCanvasViewportEl.addEventListener('pointerup', endPan);
  floorCanvasViewportEl.addEventListener('pointercancel', endPan);

  applyZoom();

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
  updateFullscreenLabel();
  renderAll();

  const openTableId = params.get('openTable');
  if (openTableId && wedding.tables.some((tb) => tb.id === openTableId)) {
    await tableModalApi.open(openTableId);
  }
})();
