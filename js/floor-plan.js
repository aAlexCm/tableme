import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal, ICONS } from './table-modal.js';
import { createShareControls } from './share-controls.js';
import { createThemeSettings } from './theme-settings.js';
import { DEFAULT_SEATS, getRectShapeSize, getTableReach, buildChairs } from './table-shape.js';
import { LANDMARK_TYPES, getLandmarkType } from './landmarks.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const CANVAS_WIDTH = 1500;
const CANVAS_HEIGHT = 900;
const LANDMARK_REACH_X = 48;
const LANDMARK_REACH_Y = 36;
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
  const addLandmarkBtn = document.getElementById('add-landmark-btn');
  const landmarkPickerEl = document.getElementById('landmark-picker');
  const floorCanvasViewportEl = document.getElementById('floor-canvas-viewport');
  const floorCanvasSizerEl = document.getElementById('floor-canvas-sizer');
  const floorCanvasEl = document.getElementById('floor-canvas');
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');
  const zoomResetBtn = document.getElementById('zoom-reset-btn');

  const chairTooltipEl = document.createElement('div');
  chairTooltipEl.className = 'chair-tooltip';
  chairTooltipEl.hidden = true;
  floorCanvasViewportEl.appendChild(chairTooltipEl);

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

  const shareControls = createShareControls({
    getLang: () => currentLang,
    weddingNameEl,
  });

  const themeSettings = createThemeSettings({
    weddingId,
    getLang: () => currentLang,
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

  function getLandmarkSafeMargins() {
    const marginXPct = Math.min(45, (LANDMARK_REACH_X / CANVAS_WIDTH) * 100);
    const marginYPct = Math.min(45, (LANDMARK_REACH_Y / CANVAS_HEIGHT) * 100);
    return { marginXPct, marginYPct };
  }

  function clampLandmarkPosition(landmark) {
    const { marginXPct, marginYPct } = getLandmarkSafeMargins();
    landmark.x = clamp(landmark.x, marginXPct, 100 - marginXPct);
    landmark.y = clamp(landmark.y, marginYPct, 100 - marginYPct);
  }

  function updateFullscreenLabel() {
    const label = t(currentLang, 'fullscreenBtn');
    fullscreenBtn.title = label;
    fullscreenBtn.setAttribute('aria-label', label);
  }

  function updatePageTitle() {
    document.title = `TableMe · ${t(currentLang, 'floorPlanTitle')}`;
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    tableModalApi.updateLabels();
    shareControls.updateLabels();
    themeSettings.updateLabels();
    themeSettings.render();
    updateFullscreenLabel();
    updatePageTitle();
    renderLandmarkPicker();
    renderAll();
  }

  function buildAssignSelectHtml(tables) {
    const placeholder = `<option value="" disabled selected>${escapeHtml(t(currentLang, 'assignToTablePlaceholder'))}</option>`;
    const options = tables.map((tb) => `<option value="${escapeHtml(tb.label)}">${escapeHtml(tb.label)}</option>`).join('');
    return placeholder + options;
  }

  function renderLandmarkPicker() {
    landmarkPickerEl.innerHTML = LANDMARK_TYPES.map((lt) => `
      <button type="button" class="landmark-picker-option" data-type="${lt.type}">
        ${lt.icon}
        <span>${escapeHtml(t(currentLang, lt.labelKey))}</span>
      </button>
    `).join('');
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
    wedding.landmarks = Array.isArray(wedding.landmarks) ? wedding.landmarks : [];
    if (changed || positionsChanged) await Storage.setTables(weddingId, tables);
  }

  function renderAll() {
    renderCanvas();
    renderLandmarks();
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

  async function rotateTableInline(table) {
    const tables = wedding.tables.map((tb) => (tb.id === table.id ? { ...tb, rotated: !tb.rotated } : tb));
    await Storage.setTables(weddingId, tables);
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
      if (e.target.closest('.table-rotate-overlay-btn')) return;
      hideChairTooltip();
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

  function showChairTooltip(chairEl) {
    const name = chairEl.dataset.name;
    if (!name) return;
    const viewportRect = floorCanvasViewportEl.getBoundingClientRect();
    const chairRect = chairEl.getBoundingClientRect();
    chairTooltipEl.textContent = name;
    chairTooltipEl.style.left = `${chairRect.left + chairRect.width / 2 - viewportRect.left + floorCanvasViewportEl.scrollLeft}px`;
    chairTooltipEl.style.top = `${chairRect.top - viewportRect.top + floorCanvasViewportEl.scrollTop}px`;
    chairTooltipEl.hidden = false;
  }

  function hideChairTooltip() {
    chairTooltipEl.hidden = true;
  }

  // Dragging a guest from chair to chair was tried and reverted: pinning a
  // guest to a specific seat index fought with list-based reordering and
  // made guests silently snap back after a reload. Tapping a chair now only
  // shows the occupant's name, same as hovering.
  function attachChairDrag(chairEl) {
    chairEl.addEventListener('pointerup', () => showChairTooltip(chairEl));
  }

  floorCanvasEl.addEventListener('mouseover', (e) => {
    const chairEl = e.target.closest('.chair.occupied');
    if (chairEl) showChairTooltip(chairEl);
  });
  floorCanvasEl.addEventListener('mouseout', (e) => {
    if (e.target.closest('.chair.occupied')) hideChairTooltip();
  });
  floorCanvasViewportEl.addEventListener('scroll', hideChairTooltip);
  document.addEventListener('click', (e) => {
    if (!floorCanvasEl.contains(e.target)) hideChairTooltip();
  });

  function renderCanvas() {
    hideChairTooltip();
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
        const { width, height } = getRectShapeSize(seatCount, table.rotated);
        shapeEl.style.width = `${width}px`;
        shapeEl.style.height = `${height}px`;
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

      if (shape === 'rectangle') {
        const rotateLabel = table.rotated ? t(currentLang, 'rotateToHorizontalBtn') : t(currentLang, 'rotateToVerticalBtn');
        const rotateBtn = document.createElement('button');
        rotateBtn.type = 'button';
        rotateBtn.className = 'icon-btn table-rotate-overlay-btn';
        rotateBtn.innerHTML = table.rotated ? ICONS.rotateToHorizontal : ICONS.rotateToVertical;
        rotateBtn.title = rotateLabel;
        rotateBtn.setAttribute('aria-label', rotateLabel);
        rotateBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
        rotateBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          rotateTableInline(table);
        });
        shapeEl.appendChild(rotateBtn);
      }

      unitEl.appendChild(shapeEl);

      buildChairs(unitEl, shape, seatCount, tableGuests, undefined, table.rotated);
      unitEl.querySelectorAll('.chair.occupied').forEach((chairEl) => attachChairDrag(chairEl));

      attachTableDrag(unitEl, shapeEl, table);
      floorCanvasEl.appendChild(unitEl);
    });
  }

  async function deleteLandmarkInline(landmark) {
    const landmarks = wedding.landmarks.filter((lm) => lm.id !== landmark.id);
    await Storage.setLandmarks(weddingId, landmarks);
    await refreshAll();
  }

  function attachLandmarkDrag(unitEl, shapeEl, landmark) {
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
      const { marginXPct, marginYPct } = getLandmarkSafeMargins();
      landmark.x = clamp(startX + dx, marginXPct, 100 - marginXPct);
      landmark.y = clamp(startY + dy, marginYPct, 100 - marginYPct);
      unitEl.style.left = `${landmark.x}%`;
      unitEl.style.top = `${landmark.y}%`;
    }

    async function onPointerUp(e) {
      if (e.pointerId !== pointerId) return;
      shapeEl.releasePointerCapture(pointerId);
      shapeEl.removeEventListener('pointermove', onPointerMove);
      shapeEl.removeEventListener('pointerup', onPointerUp);
      shapeEl.classList.remove('dragging-landmark');
      pointerId = null;
      if (moved) {
        await Storage.setLandmarks(weddingId, wedding.landmarks);
      }
    }

    shapeEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.landmark-delete-btn')) return;
      pointerId = e.pointerId;
      startClientX = e.clientX;
      startClientY = e.clientY;
      startX = landmark.x;
      startY = landmark.y;
      moved = false;
      shapeEl.classList.add('dragging-landmark');
      shapeEl.setPointerCapture(pointerId);
      shapeEl.addEventListener('pointermove', onPointerMove);
      shapeEl.addEventListener('pointerup', onPointerUp);
    });
  }

  function renderLandmarks() {
    (wedding.landmarks || []).forEach((landmark) => {
      const landmarkType = getLandmarkType(landmark.type);

      const unitEl = document.createElement('div');
      unitEl.className = 'landmark-unit';
      unitEl.style.left = `${landmark.x}%`;
      unitEl.style.top = `${landmark.y}%`;
      unitEl.dataset.id = landmark.id;

      const shapeEl = document.createElement('div');
      shapeEl.className = 'landmark-shape';
      shapeEl.innerHTML = `
        ${landmarkType.icon}
        <span class="landmark-label">${escapeHtml(t(currentLang, landmarkType.labelKey))}</span>
      `;
      unitEl.appendChild(shapeEl);

      const deleteLabel = t(currentLang, 'deleteLandmarkBtn');
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'icon-btn icon-btn-danger landmark-delete-btn';
      deleteBtn.innerHTML = ICONS.trash;
      deleteBtn.title = deleteLabel;
      deleteBtn.setAttribute('aria-label', deleteLabel);
      deleteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLandmarkInline(landmark);
      });
      shapeEl.appendChild(deleteBtn);

      attachLandmarkDrag(unitEl, shapeEl, landmark);
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

  addLandmarkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    landmarkPickerEl.hidden = !landmarkPickerEl.hidden;
  });

  landmarkPickerEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.landmark-picker-option');
    if (!btn) return;
    landmarkPickerEl.hidden = true;
    const newLandmark = {
      id: generateId(),
      type: btn.dataset.type,
      x: 50 + (Math.random() * 16 - 8),
      y: 50 + (Math.random() * 16 - 8),
    };
    clampLandmarkPosition(newLandmark);
    const landmarks = [...(wedding.landmarks || []), newLandmark];
    await Storage.setLandmarks(weddingId, landmarks);
    await refreshAll();
  });

  document.addEventListener('click', (e) => {
    if (!landmarkPickerEl.hidden && !e.target.closest('.landmark-picker-wrap')) {
      landmarkPickerEl.hidden = true;
    }
  });

  zoomInBtn.addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));
  zoomResetBtn.addEventListener('click', () => setZoom(1));

  const activePointers = new Map();
  let panPointerId = null;
  let panStartX = 0;
  let panStartY = 0;
  let panStartScrollLeft = 0;
  let panStartScrollTop = 0;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  function getPinchDistance() {
    const pts = [...activePointers.values()];
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  function startPan(pointerId, clientX, clientY) {
    panPointerId = pointerId;
    panStartX = clientX;
    panStartY = clientY;
    panStartScrollLeft = floorCanvasViewportEl.scrollLeft;
    panStartScrollTop = floorCanvasViewportEl.scrollTop;
    floorCanvasViewportEl.classList.add('panning');
  }

  floorCanvasViewportEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.table-shape') || e.target.closest('.landmark-shape') || e.target.closest('.chair')) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    floorCanvasViewportEl.setPointerCapture(e.pointerId);

    if (activePointers.size === 2) {
      panPointerId = null;
      floorCanvasViewportEl.classList.remove('panning');
      pinchStartDist = getPinchDistance();
      pinchStartZoom = zoom;
    } else if (activePointers.size === 1) {
      startPan(e.pointerId, e.clientX, e.clientY);
    }
  });

  floorCanvasViewportEl.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      if (pinchStartDist > 0) {
        const dist = getPinchDistance();
        setZoom(pinchStartZoom * (dist / pinchStartDist));
      }
      return;
    }

    if (e.pointerId !== panPointerId) return;
    floorCanvasViewportEl.scrollLeft = panStartScrollLeft - (e.clientX - panStartX);
    floorCanvasViewportEl.scrollTop = panStartScrollTop - (e.clientY - panStartY);
  });

  function endPointer(e) {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.delete(e.pointerId);
    if (floorCanvasViewportEl.hasPointerCapture(e.pointerId)) {
      floorCanvasViewportEl.releasePointerCapture(e.pointerId);
    }
    if (e.pointerId === panPointerId) {
      panPointerId = null;
      floorCanvasViewportEl.classList.remove('panning');
    }
    if (activePointers.size < 2) {
      pinchStartDist = 0;
    }
    if (activePointers.size === 1) {
      const [[id, pos]] = activePointers.entries();
      startPan(id, pos.x, pos.y);
    }
  }
  floorCanvasViewportEl.addEventListener('pointerup', endPointer);
  floorCanvasViewportEl.addEventListener('pointercancel', endPointer);

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
  shareControls.init(weddingId);
  themeSettings.init();

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  tableModalApi.updateLabels();
  updateFullscreenLabel();
  updatePageTitle();
  renderLandmarkPicker();
  renderAll();

  const openTableId = params.get('openTable');
  if (openTableId && wedding.tables.some((tb) => tb.id === openTableId)) {
    await tableModalApi.open(openTableId);
  }
})();
