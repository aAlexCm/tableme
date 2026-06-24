import { Storage, normalize } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { DEFAULT_SEATS, getRectShapeSize, buildChairs } from './table-shape.js';
import { getLandmarkType } from './landmarks.js';
import { applyGuestTheme, getDefaultTheme } from './guest-themes.js';

const LANG_KEY = 'tableme_lang';
const WAYFINDING_VIEWBOX_W = 100;
const WAYFINDING_VIEWBOX_H = 60;
const WAYFINDING_OBSTACLE_HALF_W = 8;
const WAYFINDING_OBSTACLE_HALF_H = 6;
const WAYFINDING_GRID_COLS = 50;
const WAYFINDING_GRID_ROWS = 30;
const WAYFINDING_START_RETREAT = 4;
const WAYFINDING_END_RETREAT = 4.5;
const WAYFINDING_MAP_INSET_PCT = 13;

function toWayfindingMapPct(rawPct) {
  return WAYFINDING_MAP_INSET_PCT + (rawPct / 100) * (100 - 2 * WAYFINDING_MAP_INSET_PCT);
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
  while (qi < queue.length) {
    const cur = queue[qi];
    qi += 1;
    if (cur.row === end.row && cur.col === end.col) {
      found = true;
      break;
    }
    const neighbors = [
      { row: cur.row - 1, col: cur.col },
      { row: cur.row + 1, col: cur.col },
      { row: cur.row, col: cur.col - 1 },
      { row: cur.row, col: cur.col + 1 },
    ];
    for (const n of neighbors) {
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

function simplifyRouteBySight(points, obstacles) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  let anchor = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    if (!segmentClearsObstacles(points[anchor], points[i + 1], obstacles)) {
      result.push(points[i]);
      anchor = i;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function trimRouteEnds(points, startRetreat, endRetreat) {
  if (points.length < 2) return points;
  const trim = (p0, p1, retreat) => {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len <= 0.001) return p0;
    const r = Math.min(retreat, len * 0.4);
    return { x: p0.x + (dx / len) * r, y: p0.y + (dy / len) * r };
  };
  const result = points.map((p) => ({ ...p }));
  const lastIdx = result.length - 1;
  result[0] = trim(result[0], result[1], startRetreat);
  result[lastIdx] = trim(result[lastIdx], result[lastIdx - 1], endRetreat);
  return result;
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

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
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
      document.title = `TableMe · ${t(lang, 'guestHeroTitle')}`;
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

    const wayfindingPanel = buildWayfindingPanel(table ? `table:${table.id}` : null);

    const switchEl = document.createElement('div');
    switchEl.className = 'mode-switch table-preview-switch';
    switchEl.innerHTML = `
      <button type="button" class="mode-btn active" data-view="table">${escapeHtml(t(currentLang, 'tablePreviewViewTable'))}</button>
      <button type="button" class="mode-btn" data-view="list">${escapeHtml(t(currentLang, 'tablePreviewViewList'))}</button>
      ${wayfindingPanel ? `<button type="button" class="mode-btn" data-view="gps">${escapeHtml(t(currentLang, 'tablePreviewViewGps'))}</button>` : ''}
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

    switchEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (!btn) return;
      switchEl.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
      const view = btn.dataset.view;
      canvas.hidden = view !== 'table';
      namesWrap.hidden = view !== 'list';
      if (wayfindingPanel) wayfindingPanel.hidden = view !== 'gps';
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

    function renderMap() {
      mapWrap.innerHTML = '';
      const currentFrom = fromSelect.value;
      const currentTo = toSelect.value;

      points.forEach((p) => {
        const marker = document.createElement('div');
        marker.className = `wayfinding-marker wayfinding-marker-${p.kind}${p.kind === 'table' ? ` ${p.shape}${p.rotated ? ' rotated' : ''}` : ''}`;
        marker.style.left = `${toWayfindingMapPct(p.x)}%`;
        marker.style.top = `${toWayfindingMapPct(p.y)}%`;
        marker.classList.toggle('active-from', p.id === currentFrom);
        marker.classList.toggle('active-to', p.id === currentTo);
        marker.innerHTML = p.kind === 'landmark'
          ? `<span class="wayfinding-marker-icon">${p.icon}</span><span class="wayfinding-marker-label">${escapeHtml(p.label)}</span>`
          : `<span class="wayfinding-marker-shape"></span><span class="wayfinding-marker-label">${escapeHtml(p.label)}</span>`;
        mapWrap.appendChild(marker);
      });

      const fromPoint = points.find((p) => p.id === currentFrom);
      const toPoint = points.find((p) => p.id === currentTo);
      if (fromPoint && toPoint && fromPoint.id !== toPoint.id) {
        const a = { x: toWayfindingMapPct(fromPoint.x), y: toWayfindingMapPct(fromPoint.y) * (WAYFINDING_VIEWBOX_H / 100) };
        const b = { x: toWayfindingMapPct(toPoint.x), y: toWayfindingMapPct(toPoint.y) * (WAYFINDING_VIEWBOX_H / 100) };
        const obstacles = points
          .filter((p) => p.id !== currentFrom && p.id !== currentTo)
          .map((p) => {
            const cx = toWayfindingMapPct(p.x);
            const cy = toWayfindingMapPct(p.y) * (WAYFINDING_VIEWBOX_H / 100);
            return {
              x0: cx - WAYFINDING_OBSTACLE_HALF_W,
              x1: cx + WAYFINDING_OBSTACLE_HALF_W,
              y0: cy - WAYFINDING_OBSTACLE_HALF_H,
              y1: cy + WAYFINDING_OBSTACLE_HALF_H,
            };
          });
        const rawRoutePoints = computeWayfindingPath(a, b, obstacles);
        const sightRoutePoints = simplifyRouteBySight(rawRoutePoints, obstacles);
        const routePoints = trimRouteEnds(sightRoutePoints, WAYFINDING_START_RETREAT, WAYFINDING_END_RETREAT);

        const svgNs = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('class', 'wayfinding-arrow-svg');
        svg.setAttribute('viewBox', `0 0 ${WAYFINDING_VIEWBOX_W} ${WAYFINDING_VIEWBOX_H}`);
        svg.setAttribute('preserveAspectRatio', 'none');

        const pointsAttr = routePoints.map((p) => `${p.x},${p.y}`).join(' ');

        const halo = document.createElementNS(svgNs, 'polyline');
        halo.setAttribute('points', pointsAttr);
        halo.setAttribute('class', 'wayfinding-arrow-halo');
        svg.appendChild(halo);

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
      if (tableGuests.length > 0) {
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
    document.title = `TableMe · ${t(currentLang, 'guestHeroTitle')}`;
    showInvalidLink();
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    titleEl.textContent = t(currentLang, 'guestHeroTitle');
    document.title = `TableMe · ${t(currentLang, 'guestHeroTitle')}`;
    showInvalidLink();
    return;
  }

  currentWedding = wedding;
  if (!localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }
  applyGuestTheme((wedding.theme && wedding.theme.colors) || getDefaultTheme().colors);
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
