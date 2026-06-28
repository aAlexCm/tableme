import { Storage, normalize } from './storage.js';
import { applyTranslations, buildLangSwitcher, t, LANGS } from './i18n.js';
import { DEFAULT_SEATS, getRectShapeSize, buildChairs } from './table-shape.js';
import { getLandmarkType } from './landmarks.js';
import { applyGuestTheme, applyGuestFonts, getDefaultTheme } from './guest-themes.js';
import { applyGuestDecoration } from './guest-decorations.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_lang';
// /guest/fr, /guest/en, /guest/ro override everything else (localStorage,
// the wedding's configured default) — a link shared in a specific language
// must always open in that language.
const PATH_LANG_MATCH = location.pathname.match(/^\/guest\/(fr|en|ro)\/?$/);
const PATH_LANG = PATH_LANG_MATCH && LANGS.includes(PATH_LANG_MATCH[1]) ? PATH_LANG_MATCH[1] : null;
const WAYFINDING_VIEWBOX_W = 100;
const WAYFINDING_VIEWBOX_H = 60;
const WAYFINDING_OBSTACLE_HALF_W = 5;
const WAYFINDING_OBSTACLE_HALF_H = 4;
const WAYFINDING_GRID_COLS = 50;
const WAYFINDING_GRID_ROWS = 30;
const WAYFINDING_ANCHOR_RADIUS = 4.5;
const WAYFINDING_DIRECTION_LOOKAHEAD = 10;
const WAYFINDING_MAP_INSET_PCT = 8;
// Mirrors the real floor-plan's getRectShapeSize() px values down onto the
// tiny mini-map marker so a 20-seat table actually looks longer than an
// 8-seat one — 0.17 picked so the default 8-seat table (the floor plan's
// built-in minimum length) lands close to the marker's old fixed 22x13 size.
const WAYFINDING_RECT_MARKER_SCALE = 0.17;

// Landmarks/tables only ever occupy part of the floor-plan canvas — mapping
// raw 0-100% canvas coordinates straight onto the mini-map left most of it
// empty whenever the layout didn't use the full canvas. Instead we scale
// each axis to the actual bounding box of the points being shown, so the
// mini-map always fills its frame.
function getWayfindingBounds(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function toWayfindingMapPct(rawPct, min, max) {
  const span = max - min;
  const ratio = span > 0 ? (rawPct - min) / span : 0.5;
  return WAYFINDING_MAP_INSET_PCT + ratio * (100 - 2 * WAYFINDING_MAP_INSET_PCT);
}

function findGridPath(blocked, start, end) {
  const rows = blocked.length;
  const cols = blocked[0].length;
  const key = (r, c) => r * cols + c;
  const visited = new Uint8Array(rows * cols);
  const prev = new Int32Array(rows * cols).fill(-1);
  const queue = [start];
  visited[key(start.row, start.col)] = 1;
  let qi = 0;
  let found = false;

  // Whenever both a row-move and a col-move are equally short overall,
  // plain BFS can record the path that happens to turn immediately next
  // to the start instead of going straight — any equally-short path is a
  // valid shortest path to BFS. Exploring the dominant axis first makes
  // BFS settle on the path that continues straight for as long as
  // possible and turns only once it has to, which both looks right and
  // matches the direction we already chose for the marker's anchor.
  const rowStep = Math.sign(end.row - start.row) || 1;
  const colStep = Math.sign(end.col - start.col) || 1;
  const rowFirst = Math.abs(end.row - start.row) >= Math.abs(end.col - start.col);
  const neighborOffsets = rowFirst
    ? [{ row: rowStep, col: 0 }, { row: -rowStep, col: 0 }, { row: 0, col: colStep }, { row: 0, col: -colStep }]
    : [{ row: 0, col: colStep }, { row: 0, col: -colStep }, { row: rowStep, col: 0 }, { row: -rowStep, col: 0 }];

  while (qi < queue.length) {
    const cur = queue[qi];
    qi += 1;
    if (cur.row === end.row && cur.col === end.col) {
      found = true;
      break;
    }
    for (const offset of neighborOffsets) {
      const n = { row: cur.row + offset.row, col: cur.col + offset.col };
      if (n.row < 0 || n.row >= rows || n.col < 0 || n.col >= cols) continue;
      const k = key(n.row, n.col);
      if (visited[k] || blocked[n.row][n.col]) continue;
      visited[k] = 1;
      prev[k] = key(cur.row, cur.col);
      queue.push(n);
    }
  }
  if (!found) return null;
  const path = [];
  let ck = key(end.row, end.col);
  while (ck !== -1) {
    path.push({ row: Math.floor(ck / cols), col: ck % cols });
    ck = prev[ck];
  }
  path.reverse();
  return path;
}

function simplifyGridPath(cells) {
  if (cells.length <= 2) return cells;
  const result = [cells[0]];
  for (let i = 1; i < cells.length - 1; i += 1) {
    const prev = result[result.length - 1];
    const cur = cells[i];
    const next = cells[i + 1];
    const d1r = Math.sign(cur.row - prev.row);
    const d1c = Math.sign(cur.col - prev.col);
    const d2r = Math.sign(next.row - cur.row);
    const d2c = Math.sign(next.col - cur.col);
    if (d1r === d2r && d1c === d2c) continue;
    result.push(cur);
  }
  result.push(cells[cells.length - 1]);
  return result;
}

function buildRouteFromCells(cells, a, b, cellW, cellH) {
  if (cells.length <= 1) return [a, b];
  const cellCenter = (cell) => ({ x: (cell.col + 0.5) * cellW, y: (cell.row + 0.5) * cellH });

  const points = [a];
  for (let i = 1; i < cells.length - 1; i += 1) {
    const prevCell = cells[i - 1];
    const curCell = cells[i];
    const center = cellCenter(curCell);
    const prevPoint = points[points.length - 1];
    const movedVertically = curCell.row !== prevCell.row;
    points.push(movedVertically ? { x: prevPoint.x, y: center.y } : { x: center.x, y: prevPoint.y });
  }

  const lastPoint = points[points.length - 1];
  const lastCell = cells[cells.length - 1];
  const secondLastCell = cells[cells.length - 2];
  const finalMovedVertically = lastCell.row !== secondLastCell.row;
  points.push(finalMovedVertically ? { x: lastPoint.x, y: b.y } : { x: b.x, y: lastPoint.y });
  points.push(b);
  return points;
}

function computeWayfindingPath(a, b, obstacles) {
  const cellW = WAYFINDING_VIEWBOX_W / WAYFINDING_GRID_COLS;
  const cellH = WAYFINDING_VIEWBOX_H / WAYFINDING_GRID_ROWS;

  const blocked = [];
  for (let row = 0; row < WAYFINDING_GRID_ROWS; row += 1) {
    const rowArr = [];
    for (let col = 0; col < WAYFINDING_GRID_COLS; col += 1) {
      const cx = (col + 0.5) * cellW;
      const cy = (row + 0.5) * cellH;
      rowArr.push(obstacles.some((r) => cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1));
    }
    blocked.push(rowArr);
  }

  const toCell = (p) => ({
    col: Math.max(0, Math.min(WAYFINDING_GRID_COLS - 1, Math.floor(p.x / cellW))),
    row: Math.max(0, Math.min(WAYFINDING_GRID_ROWS - 1, Math.floor(p.y / cellH))),
  });
  const startCell = toCell(a);
  const endCell = toCell(b);
  blocked[startCell.row][startCell.col] = false;
  blocked[endCell.row][endCell.col] = false;

  const cellPath = findGridPath(blocked, startCell, endCell);
  if (!cellPath) return [a, { x: b.x, y: a.y }, b];

  const simplified = simplifyGridPath(cellPath);
  return buildRouteFromCells(simplified, a, b, cellW, cellH);
}

function segmentClearsObstacles(p1, p2, obstacles) {
  const steps = 24;
  for (let i = 0; i <= steps; i += 1) {
    const ratio = i / steps;
    const x = p1.x + (p2.x - p1.x) * ratio;
    const y = p1.y + (p2.y - p1.y) * ratio;
    if (obstacles.some((o) => x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1)) return false;
  }
  return true;
}

function canShortcut(p1, p2, obstacles) {
  const aligned = Math.abs(p1.x - p2.x) < 0.001 || Math.abs(p1.y - p2.y) < 0.001;
  if (!aligned) return false;
  return segmentClearsObstacles(p1, p2, obstacles);
}

function simplifyRouteBySight(points, obstacles) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  let anchor = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    if (!canShortcut(points[anchor], points[i + 1], obstacles)) {
      result.push(points[i]);
      anchor = i;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

// Walks `distance` units along the polyline from points[0] and returns
// where that lands (or the final point if the path is shorter). Used to
// judge a marker's approach direction over a short stretch of the route
// rather than just its very first/last segment — a small obstacle-driven
// jog right next to a marker is often much shorter than the straight
// stretch beyond it, and picking a direction from that tiny jog alone
// chose the wrong one of the 4 anchors (e.g. ending up centered on the
// underside of a table that the route otherwise approaches horizontally).
function sampleAlongPath(points, distance) {
  let remaining = distance;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (segLen >= remaining) {
      const ratio = segLen > 0 ? remaining / segLen : 0;
      return { x: p0.x + (p1.x - p0.x) * ratio, y: p0.y + (p1.y - p0.y) * ratio };
    }
    remaining -= segLen;
  }
  return points[points.length - 1];
}

// Each marker has 4 fixed attachment points — north, south, east, west of
// its true center, all at the same radius from it, like the 4 invisible
// docking points a floor-plan editor would offer. Retreating along
// whatever bent path the router found could land the visible line-end
// off both axes at once (looking like it touched the icon's corner rather
// than a side), so the line instead always starts/ends at exactly one of
// these 4 points — whichever one matches the route's net direction over
// a short lookahead, found by routing once from the bare centers first.
function getRouteDirection(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'E' : 'W';
  return dy >= 0 ? 'S' : 'N';
}

function getCardinalAnchor(center, direction, radius) {
  switch (direction) {
    case 'E': return { x: center.x + radius, y: center.y };
    case 'W': return { x: center.x - radius, y: center.y };
    case 'S': return { x: center.x, y: center.y + radius };
    default: return { x: center.x, y: center.y - radius };
  }
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  const titleEl = document.getElementById('wedding-title');
  const subtitleEl = document.getElementById('wedding-subtitle');
  const noWeddingEl = document.getElementById('no-wedding');
  const searchSectionEl = document.getElementById('search-section');
  const inputEl = document.getElementById('guest-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const resultEl = document.getElementById('result');
  const matchListEl = document.getElementById('match-list');
  const langMount = document.getElementById('lang-switcher-mount');
  const decorationEl = document.getElementById('guest-decoration');

  let currentLang = PATH_LANG || localStorage.getItem(LANG_KEY) || 'fr';
  let currentWedding = null;
  let outsideClickHandler = null;

  applyTranslations(currentLang);

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    if (currentWedding) {
      renderWeddingTitle(currentWedding.name);
      handleSearch(inputEl.value, currentWedding.guests);
    } else {
      titleEl.textContent = t(lang, 'guestHeroTitle');
      document.title = 'TableMe · Find my table';
    }
  }

  function showInvalidLink() {
    noWeddingEl.hidden = false;
    searchSectionEl.hidden = true;
  }

  function clearResult() {
    resultEl.hidden = true;
    resultEl.innerHTML = '';
    matchListEl.innerHTML = '';
    if (outsideClickHandler) {
      document.removeEventListener('click', outsideClickHandler);
      outsideClickHandler = null;
    }
  }

  function buildTablePreview(guest, tableGuests) {
    const table = (currentWedding.tables || []).find((tb) => tb.label === guest.table);
    const shape = table?.shape === 'rectangle' ? 'rectangle' : 'round';
    const seatCount = table?.seats != null ? table.seats : Math.max(DEFAULT_SEATS, tableGuests.length);

    const wrap = document.createElement('div');
    wrap.className = 'table-preview';

    const heading = document.createElement('p');
    heading.className = 'table-preview-title';
    heading.textContent = t(currentLang, 'tablePreviewTitle');
    wrap.appendChild(heading);

    const wayfindingPanel = isFeatureEnabled(currentWedding, 'wayfindingGps')
      ? buildWayfindingPanel(table ? `table:${table.id}` : null)
      : null;
    const guestMenu = guest.menuId ? (currentWedding.menus || []).find((m) => m.id === guest.menuId) : null;

    const switchEl = document.createElement('div');
    switchEl.className = 'mode-switch table-preview-switch';
    switchEl.innerHTML = `
      <button type="button" class="mode-btn active" data-view="table">${escapeHtml(t(currentLang, 'tablePreviewViewTable'))}</button>
      <button type="button" class="mode-btn" data-view="list">${escapeHtml(t(currentLang, 'tablePreviewViewList'))}</button>
      ${wayfindingPanel ? `<button type="button" class="mode-btn" data-view="gps">${escapeHtml(t(currentLang, 'tablePreviewViewGps'))}</button>` : ''}
      ${guestMenu ? `<button type="button" class="mode-btn" data-view="menu">${escapeHtml(t(currentLang, 'tablePreviewViewMenu'))}</button>` : ''}
    `;
    wrap.appendChild(switchEl);

    const canvas = document.createElement('div');
    canvas.className = 'table-preview-canvas';

    const unitEl = document.createElement('div');
    unitEl.className = 'table-unit';
    unitEl.style.left = '50%';
    unitEl.style.top = '50%';

    const shapeEl = document.createElement('div');
    shapeEl.className = `table-shape ${shape}`;
    if (shape === 'rectangle') {
      const { width, height } = getRectShapeSize(seatCount, table?.rotated);
      shapeEl.style.width = `${width}px`;
      shapeEl.style.height = `${height}px`;
    }
    shapeEl.innerHTML = `<span class="table-shape-label">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(guest.table)}</span>`;
    unitEl.appendChild(shapeEl);

    buildChairs(unitEl, shape, seatCount, tableGuests, guest.id, table?.rotated);
    canvas.appendChild(unitEl);
    wrap.appendChild(canvas);

    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'chair-tooltip';
    tooltipEl.hidden = true;
    canvas.appendChild(tooltipEl);

    function showChairTooltip(chairEl) {
      const name = chairEl.dataset.name;
      if (!name) return;
      const canvasRect = canvas.getBoundingClientRect();
      const chairRect = chairEl.getBoundingClientRect();
      tooltipEl.textContent = name;
      tooltipEl.style.left = `${chairRect.left + chairRect.width / 2 - canvasRect.left}px`;
      tooltipEl.style.top = `${chairRect.top - canvasRect.top}px`;
      tooltipEl.hidden = false;
    }

    function hideChairTooltip() {
      tooltipEl.hidden = true;
    }

    unitEl.querySelectorAll('.chair.occupied').forEach((chairEl) => {
      chairEl.addEventListener('mouseenter', () => showChairTooltip(chairEl));
      chairEl.addEventListener('mouseleave', hideChairTooltip);
      chairEl.addEventListener('click', (e) => {
        e.stopPropagation();
        showChairTooltip(chairEl);
      });
    });

    outsideClickHandler = (e) => {
      if (!canvas.contains(e.target)) hideChairTooltip();
    };
    document.addEventListener('click', outsideClickHandler);

    const namesWrap = document.createElement('div');
    namesWrap.className = 'table-preview-names';
    namesWrap.hidden = true;
    tableGuests.forEach((g) => {
      const isYou = g.id === guest.id;
      const chip = document.createElement('span');
      chip.className = `table-preview-name${isYou ? ' you' : ''}`;
      chip.textContent = isYou ? `${g.name} (${t(currentLang, 'youTag')})` : g.name;
      namesWrap.appendChild(chip);
    });
    wrap.appendChild(namesWrap);

    if (wayfindingPanel) {
      wayfindingPanel.hidden = true;
      wrap.appendChild(wayfindingPanel);
    }

    let menuPanel = null;
    if (guestMenu) {
      menuPanel = document.createElement('div');
      menuPanel.className = 'table-preview-menu';
      menuPanel.hidden = true;
      const dishesHtml = (guestMenu.dishes || [])
        .map((d) => `<li class="table-preview-menu-dish">${escapeHtml(d.name)}</li>`)
        .join('');
      menuPanel.innerHTML = `
        <p class="table-preview-menu-title">${escapeHtml(guestMenu.title)}</p>
        <ul class="table-preview-menu-dishes">${dishesHtml || `<li class="table-preview-menu-empty">${escapeHtml(t(currentLang, 'tablePreviewMenuEmpty'))}</li>`}</ul>
      `;
      wrap.appendChild(menuPanel);
    }

    switchEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      switchEl.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      const view = btn.dataset.view;
      canvas.hidden = view !== 'table';
      namesWrap.hidden = view !== 'list';
      if (wayfindingPanel) wayfindingPanel.hidden = view !== 'gps';
      if (menuPanel) menuPanel.hidden = view !== 'menu';
      if (view !== 'table') hideChairTooltip();
    });

    return wrap;
  }

  function getWayfindingPoints() {
    const tablePoints = (currentWedding.tables || []).map((tb) => ({
      id: `table:${tb.id}`,
      kind: 'table',
      shape: tb.shape === 'rectangle' ? 'rectangle' : 'round',
      rotated: !!tb.rotated,
      seats: tb.seats != null ? tb.seats : DEFAULT_SEATS,
      x: tb.x,
      y: tb.y,
      label: `${t(currentLang, 'tableLabel')} ${tb.label}`,
    }));
    const landmarkPoints = (currentWedding.landmarks || []).map((lm) => {
      const landmarkType = getLandmarkType(lm.type);
      return {
        id: `landmark:${lm.id}`,
        kind: 'landmark',
        icon: landmarkType.icon,
        x: lm.x,
        y: lm.y,
        label: t(currentLang, landmarkType.labelKey),
      };
    });
    return [...landmarkPoints, ...tablePoints];
  }

  function buildWayfindingPanel(defaultToId) {
    const points = getWayfindingPoints();
    if (points.length < 2) return null;
    const bounds = getWayfindingBounds(points);

    const entranceLandmark = (currentWedding.landmarks || []).find((lm) => lm.type === 'entrance');
    const fromId = entranceLandmark ? `landmark:${entranceLandmark.id}` : points[0].id;
    const toCandidate = defaultToId && points.some((p) => p.id === defaultToId) ? defaultToId : null;
    const toId = toCandidate && toCandidate !== fromId
      ? toCandidate
      : (points.find((p) => p.id !== fromId)?.id || fromId);

    const wrap = document.createElement('div');
    wrap.className = 'wayfinding-panel';

    const landmarkOptionsHtml = points
      .filter((p) => p.kind === 'landmark')
      .map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`)
      .join('');
    const tableOptionsHtml = points
      .filter((p) => p.kind === 'table')
      .map((p) => `<option value="${p.id}">${escapeHtml(p.label)}</option>`)
      .join('');
    const groupedOptionsHtml = `
      ${landmarkOptionsHtml ? `<optgroup label="${escapeHtml(t(currentLang, 'wayfindingLandmarksGroup'))}">${landmarkOptionsHtml}</optgroup>` : ''}
      ${tableOptionsHtml ? `<optgroup label="${escapeHtml(t(currentLang, 'wayfindingTablesGroup'))}">${tableOptionsHtml}</optgroup>` : ''}
    `;

    const controls = document.createElement('div');
    controls.className = 'wayfinding-controls';
    controls.innerHTML = `
      <div class="wayfinding-field">
        <label>${escapeHtml(t(currentLang, 'wayfindingFromLabel'))}</label>
        <select class="wayfinding-from">${groupedOptionsHtml}</select>
      </div>
      <span class="wayfinding-arrow-sep">&rarr;</span>
      <div class="wayfinding-field">
        <label>${escapeHtml(t(currentLang, 'wayfindingToLabel'))}</label>
        <select class="wayfinding-to">${groupedOptionsHtml}</select>
      </div>
    `;
    wrap.appendChild(controls);

    const fromSelect = controls.querySelector('.wayfinding-from');
    const toSelect = controls.querySelector('.wayfinding-to');
    fromSelect.value = fromId;
    toSelect.value = toId;

    const mapWrap = document.createElement('div');
    mapWrap.className = 'wayfinding-map';
    wrap.appendChild(mapWrap);

    // The map itself only ever labels the two active (from/to) markers —
    // showing every landmark/table's name inline got unreadable once more
    // than a couple of points were close together. This legend is the
    // reference for what every other icon/shape on the map means.
    const legend = document.createElement('div');
    legend.className = 'wayfinding-legend';
    legend.innerHTML = points.map((p) => `
      <span class="wayfinding-legend-item">
        <span class="wayfinding-legend-icon">${p.kind === 'landmark' ? p.icon : '<span class="wayfinding-legend-shape"></span>'}</span>
        <span>${escapeHtml(p.label)}</span>
      </span>
    `).join('');
    wrap.appendChild(legend);

    function renderMap() {
      mapWrap.innerHTML = '';
      const currentFrom = fromSelect.value;
      const currentTo = toSelect.value;

      points.forEach((p) => {
        const marker = document.createElement('div');
        marker.className = `wayfinding-marker wayfinding-marker-${p.kind}${p.kind === 'table' ? ` ${p.shape}${p.rotated ? ' rotated' : ''}` : ''}`;
        marker.style.left = `${toWayfindingMapPct(p.x, bounds.minX, bounds.maxX)}%`;
        marker.style.top = `${toWayfindingMapPct(p.y, bounds.minY, bounds.maxY)}%`;
        marker.classList.toggle('active-from', p.id === currentFrom);
        marker.classList.toggle('active-to', p.id === currentTo);
        marker.innerHTML = p.kind === 'landmark'
          ? `<span class="wayfinding-marker-icon">${p.icon}</span><span class="wayfinding-marker-label">${escapeHtml(p.label)}</span>`
          : `<span class="wayfinding-marker-shape"></span><span class="wayfinding-marker-label">${escapeHtml(p.label)}</span>`;
        if (p.kind === 'table' && p.shape === 'rectangle') {
          const { width, height } = getRectShapeSize(p.seats, p.rotated);
          const shapeEl = marker.querySelector('.wayfinding-marker-shape');
          shapeEl.style.width = `${Math.round(width * WAYFINDING_RECT_MARKER_SCALE)}px`;
          shapeEl.style.height = `${Math.round(height * WAYFINDING_RECT_MARKER_SCALE)}px`;
        }
        mapWrap.appendChild(marker);
      });

      const fromPoint = points.find((p) => p.id === currentFrom);
      const toPoint = points.find((p) => p.id === currentTo);
      if (fromPoint && toPoint && fromPoint.id !== toPoint.id) {
        const toViewboxPoint = (p) => ({
          x: toWayfindingMapPct(p.x, bounds.minX, bounds.maxX),
          y: toWayfindingMapPct(p.y, bounds.minY, bounds.maxY) * (WAYFINDING_VIEWBOX_H / 100),
        });
        const fromCenter = toViewboxPoint(fromPoint);
        const toCenter = toViewboxPoint(toPoint);
        const obstacles = points
          .filter((p) => p.id !== currentFrom && p.id !== currentTo)
          .map((p) => {
            const { x: cx, y: cy } = toViewboxPoint(p);
            return {
              x0: cx - WAYFINDING_OBSTACLE_HALF_W,
              x1: cx + WAYFINDING_OBSTACLE_HALF_W,
              y0: cy - WAYFINDING_OBSTACLE_HALF_H,
              y1: cy + WAYFINDING_OBSTACLE_HALF_H,
            };
          });

        // Route once from the bare centers purely to discover which way the
        // path actually leaves each marker (it has to dodge obstacles, so a
        // straight-line guess between the two centers isn't reliable), then
        // re-route from the matching cardinal point on each marker so the
        // visible line always starts/ends exactly on one of its 4 anchors.
        const previewRoute = simplifyRouteBySight(computeWayfindingPath(fromCenter, toCenter, obstacles), obstacles);
        const startDirection = getRouteDirection(fromCenter, sampleAlongPath(previewRoute, WAYFINDING_DIRECTION_LOOKAHEAD));
        const endDirection = getRouteDirection(toCenter, sampleAlongPath([...previewRoute].reverse(), WAYFINDING_DIRECTION_LOOKAHEAD));
        const a = getCardinalAnchor(fromCenter, startDirection, WAYFINDING_ANCHOR_RADIUS);
        const b = getCardinalAnchor(toCenter, endDirection, WAYFINDING_ANCHOR_RADIUS);
        const routePoints = simplifyRouteBySight(computeWayfindingPath(a, b, obstacles), obstacles);

        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('class', 'wayfinding-arrow-svg');
        svg.setAttribute('viewBox', `0 0 ${WAYFINDING_VIEWBOX_W} ${WAYFINDING_VIEWBOX_H}`);
        svg.setAttribute('preserveAspectRatio', 'none');

        const pointsAttr = routePoints.map((p) => `${p.x},${p.y}`).join(' ');

        const polyline = document.createElementNS(svgNs, 'polyline');
        polyline.setAttribute('points', pointsAttr);
        polyline.setAttribute('class', 'wayfinding-arrow-line');
        svg.appendChild(polyline);

        mapWrap.appendChild(svg);
      }
    }

    fromSelect.addEventListener('change', renderMap);
    toSelect.addEventListener('change', renderMap);

    renderMap();
    return wrap;
  }

  function showSingleGuest(guest) {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="table-number">
        <span class="guest-name">${escapeHtml(guest.name)}</span>
        <span class="table-sep"></span>
        <span class="table-tag">
          <span class="table-label">${escapeHtml(t(currentLang, 'tableLabel'))}</span>
          <span class="table-value">${escapeHtml(guest.table)}</span>
        </span>
      </div>
    `;
    inputEl.blur();

    if (guest.table) {
      const tableGuests = currentWedding.guests.filter((g) => g.table === guest.table);
      if (tableGuests.length > 0) {
        resultEl.appendChild(buildTablePreview(guest, tableGuests));
      }
    }
  }

  function showMatchList(guests) {
    clearResult();
    guests.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'guest-match';
      li.innerHTML = `<span>${escapeHtml(g.name)}</span><span class="match-table">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(g.table)}</span>`;
      li.addEventListener('click', () => showSingleGuest(g));
      matchListEl.appendChild(li);
    });
  }

  function showTableResult(table, tableGuests) {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `
      <div class="table-number">
        <span class="table-tag">
          <span class="table-label">${escapeHtml(t(currentLang, 'tableLabel'))}</span>
          <span class="table-value">${escapeHtml(table.label)}</span>
        </span>
      </div>
    `;
    inputEl.blur();
    resultEl.appendChild(buildTablePreview({ id: null, table: table.label }, tableGuests));
  }

  function showNoMatch() {
    clearResult();
    resultEl.hidden = false;
    resultEl.innerHTML = `<p class="error-msg">${escapeHtml(t(currentLang, 'noMatch'))}</p>`;
  }

  function renderWeddingTitle(name) {
    const parts = name.split(/\s+(?:&|et)\s+/i);
    if (parts.length === 2) {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(parts[0])}</span><span class="title-heart">&#9825;</span><span class="script-word">${escapeHtml(parts[1])}</span>`;
      document.title = `${parts[0]} ♥ ${parts[1]} · TableMe`;
    } else {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(name)}</span>`;
      document.title = `${name} · TableMe`;
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function handleSearch(query, guests) {
    const q = normalize(query);
    if (!q) {
      clearResult();
      return;
    }
    const queryWords = q.split(/\s+/).filter(Boolean);
    const matches = guests.filter((g) => {
      const normalizedName = normalize(g.name);
      return queryWords.every((word) => normalizedName.includes(word));
    });
    if (matches.length > 0) {
      if (matches.length === 1) {
        showSingleGuest(matches[0]);
      } else {
        showMatchList(matches);
      }
      return;
    }

    const table = (currentWedding.tables || []).find((tb) => normalize(tb.label) === q);
    if (table) {
      const tableGuests = guests.filter((g) => g.table === table.label);
      if (tableGuests.some((g) => !g.empty)) {
        showTableResult(table, tableGuests);
        return;
      }
    }

    showNoMatch();
  }

  if (!weddingId) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    document.title = 'TableMe · Find my table';
    showInvalidLink();
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    document.title = 'TableMe · Find my table';
    showInvalidLink();
    return;
  }

  currentWedding = wedding;
  if (!PATH_LANG && !localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }
  applyGuestTheme((wedding.theme && wedding.theme.colors) || getDefaultTheme().colors);
  applyGuestFonts((wedding.theme && wedding.theme.fonts) || getDefaultTheme().fonts);
  applyGuestDecoration((wedding.theme && wedding.theme.decoration) || getDefaultTheme().decoration, decorationEl);
  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);

  renderWeddingTitle(wedding.name);
  searchSectionEl.hidden = false;

  inputEl.addEventListener('input', () => {
    clearBtn.hidden = inputEl.value.length === 0;
    handleSearch(inputEl.value, wedding.guests);
  });

  clearBtn.addEventListener('click', () => {
    inputEl.value = '';
    clearBtn.hidden = true;
    clearResult();
    inputEl.focus();
  });
})();
