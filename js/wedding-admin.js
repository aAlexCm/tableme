import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal } from './table-modal.js';
import { createGuestModal } from './guest-modal.js';
import { createShareControls } from './share-controls.js';
import { createThemeSettings } from './theme-settings.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_wedding_admin_lang';
const DEFAULT_SEATS = 8;

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
};

function parseBulkGuests(text) {
  const entries = [];
  let skipped = 0;
  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const idx = trimmed.lastIndexOf(',');
    if (idx === -1) {
      skipped += 1;
      return;
    }
    const name = trimmed.slice(0, idx).trim();
    const table = trimmed.slice(idx + 1).trim();
    if (!name || !table) {
      skipped += 1;
      return;
    }
    entries.push({ name, table });
  });
  return { entries, skipped };
}

function parseSheetRows(rows) {
  const entries = [];
  let skipped = 0;
  rows.slice(1).forEach((row) => {
    const name = (row[0] ?? '').toString().trim();
    const table = (row[1] ?? '').toString().trim();
    if (!name && !table) return;
    if (!name || !table) {
      skipped += 1;
      return;
    }
    entries.push({ name, table });
  });
  return { entries, skipped };
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';
  let draggedRow = null;
  let lastDragTarget = null;
  let cachedWedding = null;

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('wedding-admin-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const floorPlanTabLink = document.getElementById('view-tab-floorplan');
  const countdownEl = document.getElementById('wedding-countdown');
  const countdownCaptionEl = document.getElementById('wedding-countdown-caption');
  const countdownDaysEl = document.getElementById('countdown-days');
  const countdownHoursEl = document.getElementById('countdown-hours');
  const countdownMinutesEl = document.getElementById('countdown-minutes');
  const countdownSecondsEl = document.getElementById('countdown-seconds');

  // Counts down to the wedding date, then keeps running past it counting up
  // elapsed time instead of stopping — the caption underneath flips from
  // "until the big day" to "of happy marriage" once it crosses zero.
  function initCountdown(dateStr) {
    if (!countdownEl || !dateStr) return;
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    if (Number.isNaN(target)) return;

    function tick() {
      const diff = target - Date.now();
      const totalSeconds = Math.floor(Math.abs(diff) / 1000);
      countdownDaysEl.textContent = Math.floor(totalSeconds / 86400);
      countdownHoursEl.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0');
      countdownMinutesEl.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      countdownSecondsEl.textContent = String(totalSeconds % 60).padStart(2, '0');
      countdownCaptionEl.textContent = t(currentLang, diff <= 0 ? 'countdownMarriedCaption' : 'countdownUntilCaption');
    }

    countdownEl.hidden = false;
    tick();
    setInterval(tick, 1000);
  }

  const guestsTitle = document.getElementById('guests-title');
  const guestForm = document.getElementById('guest-form');
  const guestNameInput = document.getElementById('guest-name');
  const guestTableInput = document.getElementById('guest-table');
  const guestListEl = document.getElementById('guest-list');
  const guestEmptyEl = document.getElementById('guest-empty');

  const modeSwitchEl = document.getElementById('add-mode-switch');
  const bulkAddPanel = document.getElementById('bulk-add-panel');
  const bulkAddTextarea = document.getElementById('bulk-add-textarea');
  const bulkAddSubmitBtn = document.getElementById('bulk-add-submit');
  const bulkAddFeedbackEl = document.getElementById('bulk-add-feedback');

  const fileAddPanel = document.getElementById('file-add-panel');
  const downloadTemplateBtn = document.getElementById('download-template-btn');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileImportInput = document.getElementById('file-import-input');
  const fileAddFeedbackEl = document.getElementById('file-add-feedback');

  const tableModalApi = createTableModal({
    weddingId,
    getLang: () => currentLang,
    onChange: renderGuests,
  });

  const guestModalApi = createGuestModal({
    weddingId,
    getLang: () => currentLang,
    onChange: renderGuests,
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

  function updatePageTitle() {
    document.title = 'TableMe · Guests';
  }

  function applyFeatureGating(wedding) {
    const bulkImportEnabled = isFeatureEnabled(wedding, 'bulkImport');
    document.querySelectorAll('#add-mode-switch .mode-btn[data-mode="bulk"], #add-mode-switch .mode-btn[data-mode="file"]')
      .forEach((btn) => { btn.hidden = !bulkImportEnabled; });

    const themeBtn = document.getElementById('theme-settings-btn');
    if (themeBtn) themeBtn.hidden = !isFeatureEnabled(wedding, 'themeCustomization');

    const qrBtn = document.getElementById('qr-code-btn');
    if (qrBtn) qrBtn.hidden = !isFeatureEnabled(wedding, 'qrShare');

    const partnersTile = document.getElementById('partners-tile');
    if (partnersTile) partnersTile.hidden = !isFeatureEnabled(wedding, 'sponsorPartners');

    floorPlanTabLink.hidden = !isFeatureEnabled(wedding, 'floorPlan');

    // Unlike the other gated tiles (which vanish when off), the poster tile
    // stays visible but grayed-out with a contact-us badge — it's a feature
    // the couple can be upsold on, not one that should look like it doesn't exist.
    const posterTile = document.getElementById('poster-tile');
    const posterTileBadge = document.getElementById('poster-tile-badge');
    if (posterTile) {
      const posterEnabled = isFeatureEnabled(wedding, 'poster');
      posterTile.classList.toggle('is-disabled', !posterEnabled);
      posterTile.setAttribute('aria-disabled', String(!posterEnabled));
      if (posterTileBadge) posterTileBadge.hidden = posterEnabled;
      if (posterEnabled) posterTile.href = `poster.html?id=${weddingId}`;
      else posterTile.removeAttribute('href');
    }
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    shareControls.updateLabels();
    tableModalApi.updateLabels();
    updatePageTitle();
    themeSettings.updateLabels();
    renderGuests();
    themeSettings.render();
  }

  function groupGuestsByTable(guests, tableLabels) {
    const groups = new Map();
    guests.forEach((g) => {
      const key = g.table || '';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(g);
    });
    (tableLabels || []).forEach((label) => {
      const key = label || '';
      if (!groups.has(key)) groups.set(key, []);
    });
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return sortedKeys.map((key) => ({ key, guests: groups.get(key) }));
  }

  function buildTableBuckets(guests) {
    const buckets = new Map();
    guests.forEach((g) => {
      const key = g.table || '';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(g);
    });
    return buckets;
  }

  function trimTrailingEmpties(bucket) {
    let end = bucket.length;
    while (end > 0 && bucket[end - 1].empty) end -= 1;
    return bucket.slice(0, end);
  }

  function clearDropHighlight() {
    document.querySelectorAll('.guest-row-drop-target').forEach((el) => el.classList.remove('guest-row-drop-target'));
  }

  function highlightDropTarget(target) {
    if (target === lastDragTarget) return;
    clearDropHighlight();
    if (target) target.classList.add('guest-row-drop-target');
    lastDragTarget = target;
  }

  function getRowUnderPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el && el.closest('.guest-row, .guest-row-empty');
  }

  // Every row — occupied or empty — is a seat "container". Dropping a guest
  // onto another container swaps the two: a real guest swaps tables/positions
  // with whoever was there, an empty container just receives them and their
  // old seat becomes the new gap (or just shrinks away if it was trailing
  // capacity with no one seated after it).
  async function moveGuestToContainer(sourceRow, targetRow) {
    if (!sourceRow || !targetRow || sourceRow === targetRow) return;
    const wedding = cachedWedding || (await Storage.getWedding(weddingId));
    if (!wedding) return;

    const sourceTableKey = sourceRow.closest('.table-guest-list').dataset.table;
    const targetTableKey = targetRow.closest('.table-guest-list').dataset.table;
    const sourceId = sourceRow.dataset.id;
    const targetId = targetRow.dataset.id;
    const targetIsEmpty = targetRow.classList.contains('guest-row-empty');

    const buckets = buildTableBuckets(wedding.guests);
    const sourceBucket = buckets.get(sourceTableKey) || [];
    const sourceIdx = sourceBucket.findIndex((g) => g.id === sourceId);
    if (sourceIdx === -1) return;
    const sourceGuest = sourceBucket[sourceIdx];
    const targetBucket = buckets.get(targetTableKey) || [];
    buckets.set(sourceTableKey, sourceBucket);
    buckets.set(targetTableKey, targetBucket);

    if (!targetIsEmpty) {
      const targetIdx = targetBucket.findIndex((g) => g.id === targetId);
      if (targetIdx === -1) return;
      const targetGuest = targetBucket[targetIdx];
      sourceBucket[sourceIdx] = { ...targetGuest, table: sourceTableKey };
      targetBucket[targetIdx] = { ...sourceGuest, table: targetTableKey };
    } else {
      // A synthetic trailing placeholder (beyond the persisted bucket) has
      // no id to look up — using the row's actual position in its list as
      // the target slot, and padding up to it, makes the guest land exactly
      // where they were dropped instead of always one slot too early.
      const targetSlot = [...targetRow.parentElement.children].indexOf(targetRow);
      while (targetBucket.length <= targetSlot) {
        targetBucket.push({ id: generateId(), table: targetTableKey, empty: true });
      }
      targetBucket[targetSlot] = { ...sourceGuest, table: targetTableKey };
      // Read everything needed from sourceBucket before mutating it — when
      // source and target are the same table this is the same array.
      sourceBucket[sourceIdx] = { id: generateId(), table: sourceTableKey, empty: true };
    }

    const newGuests = [];
    buckets.forEach((bucket) => newGuests.push(...trimTrailingEmpties(bucket)));
    // Render immediately from the locally-computed result instead of waiting
    // on a write + a re-fetch round trip — that double network hop is what
    // made the drop feel like it landed a full second late.
    await renderGuests({ ...wedding, guests: newGuests });
    await Storage.setGuests(weddingId, newGuests);
  }

  async function moveGuest(guestId, direction) {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const groups = groupGuestsByTable(wedding.guests);
    let moved = false;
    for (const group of groups) {
      const idx = group.guests.findIndex((g) => g.id === guestId);
      if (idx === -1) continue;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx >= 0 && swapIdx < group.guests.length) {
        [group.guests[idx], group.guests[swapIdx]] = [group.guests[swapIdx], group.guests[idx]];
        moved = true;
      }
      break;
    }
    if (!moved) return;
    const newGuests = groups.flatMap((g) => g.guests);
    await Storage.setGuests(weddingId, newGuests);
    await renderGuests();
  }

  async function updateGuestTable(guestId, newTable) {
    const table = newTable.trim();
    if (!table) {
      await renderGuests();
      return;
    }
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table } : g));
    await Storage.setGuests(weddingId, guests);
    await renderGuests();
  }

  function attachRowDragEvents(row) {
    let ghostEl = null;

    function startDrag() {
      draggedRow = row;
      lastDragTarget = null;
      row.classList.add('dragging');
      document.body.classList.add('dragging-guest-row');
    }

    async function endDrag() {
      row.classList.remove('dragging');
      document.body.classList.remove('dragging-guest-row');
      const target = lastDragTarget;
      clearDropHighlight();
      const source = draggedRow;
      draggedRow = null;
      if (ghostEl) {
        ghostEl.remove();
        ghostEl = null;
      }
      await moveGuestToContainer(source, target);
    }

    row.addEventListener('dragstart', startDrag);
    // 'dragend' always fires once a drag operation ends, unlike 'drop' which
    // some embedded/webview browsers fail to dispatch reliably — committing
    // here guarantees the move is actually persisted.
    row.addEventListener('dragend', endDrag);

    const handle = row.querySelector('.drag-handle');

    handle.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        startDrag();
        ghostEl = document.createElement('div');
        ghostEl.className = 'guest-row-drag-ghost';
        ghostEl.textContent = row.querySelector('.guest-row-name')?.textContent || '';
        document.body.appendChild(ghostEl);
      },
      { passive: false }
    );

    handle.addEventListener(
      'touchmove',
      (e) => {
        if (!draggedRow) return;
        e.preventDefault();
        const touch = e.touches[0];
        if (ghostEl) {
          ghostEl.style.left = `${touch.clientX}px`;
          ghostEl.style.top = `${touch.clientY}px`;
        }
        const hovered = getRowUnderPoint(touch.clientX, touch.clientY);
        highlightDropTarget(hovered && hovered !== draggedRow ? hovered : null);
      },
      { passive: false }
    );

    handle.addEventListener('touchend', async () => {
      if (!draggedRow) return;
      await endDrag();
    });
  }

  function attachListDropEvents(list) {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      const hovered = getRowUnderPoint(e.clientX, e.clientY);
      highlightDropTarget(hovered && hovered !== draggedRow ? hovered : null);
    });

    list.addEventListener('drop', (e) => {
      // Actual persistence happens in the row's 'dragend' handler, which is
      // guaranteed to fire; this just stops the browser's default drop
      // behavior (e.g. navigating to dropped text/links).
      e.preventDefault();
    });
  }

  async function renderGuests(weddingOverride) {
    const wedding = weddingOverride || (await Storage.getWedding(weddingId));
    if (!wedding) return;
    cachedWedding = wedding;

    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.some((g) => !g.empty);

    const tableLabels = (wedding.tables || []).map((tb) => tb.label).filter(Boolean);
    const tableByLabel = new Map((wedding.tables || []).map((tb) => [tb.label, tb]));

    groupGuestsByTable(wedding.guests, tableLabels).forEach(({ key, guests }) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'table-group';

      const table = tableByLabel.get(key);
      const editLabel = escapeHtml(t(currentLang, 'editTableBtn'));
      const deleteTableLabel = escapeHtml(t(currentLang, 'deleteTableBtn'));

      const titleRow = document.createElement('div');
      titleRow.className = 'table-group-title-row';

      const title = document.createElement('h3');
      title.className = 'table-group-title';
      const realGuestCount = guests.filter((g) => !g.empty).length;
      title.innerHTML = `${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(key || '—')}`
        + (table ? ` <span class="table-group-count">(${realGuestCount}/${table.seats != null ? table.seats : DEFAULT_SEATS})</span>` : '');
      titleRow.appendChild(title);

      if (table) {
        const actions = document.createElement('span');
        actions.className = 'table-group-actions';
        actions.innerHTML = `
          <button type="button" class="icon-btn" data-action="edit-table" data-table-id="${table.id}" title="${editLabel}" aria-label="${editLabel}">${ICONS.pencil}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete-table" data-table-id="${table.id}" title="${deleteTableLabel}" aria-label="${deleteTableLabel}">${ICONS.trash}</button>
        `;
        titleRow.appendChild(actions);
      }

      groupEl.appendChild(titleRow);

      const list = document.createElement('ul');
      list.className = 'table-guest-list';
      list.dataset.table = key;

      function renderGuestRow(g) {
        const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
        const li = document.createElement('li');
        li.className = 'guest-row';
        li.draggable = true;
        li.dataset.id = g.id;
        li.innerHTML = `
          <span class="drag-handle">&#10303;</span>
          <span class="guest-row-name">${escapeHtml(g.name)}</span>
          <span class="guest-row-actions">
            <input type="text" class="guest-table-edit" data-id="${g.id}" value="${escapeHtml(g.table)}" aria-label="${escapeHtml(t(currentLang, 'tableLabel'))}" />
            <span class="row-arrows">
              <button type="button" class="icon-btn" data-action="move-up" data-id="${g.id}" aria-label="up">${ICONS.chevronUp}</button>
              <button type="button" class="icon-btn" data-action="move-down" data-id="${g.id}" aria-label="down">${ICONS.chevronDown}</button>
            </span>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete-guest" data-id="${g.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
          </span>
        `;
        attachRowDragEvents(li);
        return li;
      }

      function renderEmptySeatRow(id) {
        const li = document.createElement('li');
        li.className = 'guest-row-empty';
        li.dataset.id = id || generateId();
        const label = document.createElement('span');
        label.className = 'guest-row-empty-label';
        label.textContent = t(currentLang, 'emptySeatPlaceholder');
        li.appendChild(label);
        if (table) {
          const deleteLabel = escapeHtml(t(currentLang, 'deleteSeatBtn'));
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'icon-btn icon-btn-danger guest-row-empty-delete';
          btn.dataset.action = 'delete-seat';
          btn.dataset.id = li.dataset.id;
          btn.dataset.tableId = table.id;
          btn.title = deleteLabel;
          btn.setAttribute('aria-label', deleteLabel);
          btn.innerHTML = ICONS.trash;
          li.appendChild(btn);
        }
        return li;
      }

      if (table) {
        const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;
        // Render the persisted order as-is (real guests plus any intentional
        // gaps the couple dragged in) then top up with extra placeholder rows
        // to fill the table up to its seat count. Never hide guests beyond
        // the seat count (e.g. a table with more guests than seats) — only
        // expand to show extra rows, never drop anyone.
        guests.forEach((g) => {
          list.appendChild(g.empty ? renderEmptySeatRow(g.id) : renderGuestRow(g));
        });
        for (let i = guests.length; i < seatCount; i += 1) {
          list.appendChild(renderEmptySeatRow());
        }
        const addSeatLabel = escapeHtml(t(currentLang, 'addSeatBtn'));
        const addSeatLi = document.createElement('li');
        addSeatLi.className = 'guest-row-add-seat';
        addSeatLi.innerHTML = `
          <button type="button" class="icon-btn" data-action="add-seat" data-table-id="${table.id}" title="${addSeatLabel}" aria-label="${addSeatLabel}">${ICONS.plus}</button>
        `;
        list.appendChild(addSeatLi);
      } else if (guests.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'table-guest-list-empty';
        emptyLi.textContent = t(currentLang, 'tableGuestsEmpty');
        list.appendChild(emptyLi);
      } else {
        guests.forEach((g) => list.appendChild(renderGuestRow(g)));
      }

      attachListDropEvents(list);
      groupEl.appendChild(list);
      guestListEl.appendChild(groupEl);
    });
  }

  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    if (!name || !table) return;
    await Storage.addGuest(weddingId, name, table);
    guestForm.reset();
    await renderGuests();
  });

  modeSwitchEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    const mode = btn.dataset.mode;
    modeSwitchEl.querySelectorAll('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    guestForm.hidden = mode !== 'single';
    bulkAddPanel.hidden = mode !== 'bulk';
    fileAddPanel.hidden = mode !== 'file';
    bulkAddFeedbackEl.hidden = true;
    fileAddFeedbackEl.hidden = true;
  });

  bulkAddSubmitBtn.addEventListener('click', async () => {
    const { entries, skipped } = parseBulkGuests(bulkAddTextarea.value);
    bulkAddFeedbackEl.hidden = false;
    if (entries.length === 0) {
      bulkAddFeedbackEl.textContent = t(currentLang, 'bulkAddEmpty');
      return;
    }
    await Storage.addGuests(weddingId, entries);
    bulkAddTextarea.value = '';
    bulkAddFeedbackEl.textContent =
      t(currentLang, 'bulkAddSuccess', entries.length) + (skipped > 0 ? t(currentLang, 'bulkAddSkipped', skipped) : '');
    await renderGuests();
  });

  downloadTemplateBtn.addEventListener('click', () => {
    const header = `${t(currentLang, 'guestNameLabel')},${t(currentLang, 'guestTableLabel')}`;
    const examples = t(currentLang, 'bulkAddPlaceholder');
    const csv = `${header}\n${examples}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'modele-invites-tableme.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  async function processImportedFile(file) {
    fileAddFeedbackEl.hidden = false;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = window.XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const { entries, skipped } = parseSheetRows(rows);
      if (entries.length === 0) {
        fileAddFeedbackEl.textContent = t(currentLang, 'bulkAddEmpty');
        return;
      }
      await Storage.addGuests(weddingId, entries);
      fileAddFeedbackEl.textContent =
        t(currentLang, 'bulkAddSuccess', entries.length) + (skipped > 0 ? t(currentLang, 'bulkAddSkipped', skipped) : '');
      await renderGuests();
    } catch {
      fileAddFeedbackEl.textContent = t(currentLang, 'fileImportError');
    } finally {
      fileImportInput.value = '';
    }
  }

  fileDropzone.addEventListener('click', () => fileImportInput.click());
  fileDropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileImportInput.click();
    }
  });

  fileImportInput.addEventListener('change', () => {
    const file = fileImportInput.files[0];
    if (file) processImportedFile(file);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    fileDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    fileDropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
    });
  });

  fileDropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) processImportedFile(file);
  });

  guestListEl.addEventListener('click', async (e) => {
    const titleRow = e.target.closest('.table-group-title-row');
    if (titleRow) {
      const tableBtn = e.target.closest('button');
      if (!tableBtn) {
        document.querySelectorAll('.revealed').forEach((el) => {
          if (el !== titleRow) el.classList.remove('revealed');
        });
        titleRow.classList.toggle('revealed');
        return;
      }
      const { action, tableId } = tableBtn.dataset;
      if (action === 'edit-table') {
        await tableModalApi.open(tableId);
      } else if (action === 'delete-table') {
        const wedding = await Storage.getWedding(weddingId);
        if (!wedding) return;
        const table = (wedding.tables || []).find((tb) => tb.id === tableId);
        if (!table) return;
        const affected = wedding.guests.filter((g) => g.table === table.label && !g.empty).length;
        if (!confirm(t(currentLang, 'confirmDeleteTable', affected))) return;
        const tables = wedding.tables.filter((tb) => tb.id !== table.id);
        const guests = wedding.guests
          .filter((g) => !(g.empty && g.table === table.label))
          .map((g) => (g.table === table.label ? { ...g, table: '' } : g));
        await Storage.setBoard(weddingId, { guests, tables });
        await renderGuests();
      }
      return;
    }

    const addSeatBtn = e.target.closest('button[data-action="add-seat"]');
    if (addSeatBtn) {
      const { tableId } = addSeatBtn.dataset;
      const wedding = cachedWedding || (await Storage.getWedding(weddingId));
      if (!wedding) return;
      const table = (wedding.tables || []).find((tb) => tb.id === tableId);
      if (!table) return;
      const currentSeats = table.seats != null ? table.seats : DEFAULT_SEATS;
      const tables = wedding.tables.map((tb) => (
        tb.id === tableId ? { ...tb, seats: currentSeats + 1 } : tb
      ));
      await renderGuests({ ...wedding, tables });
      await Storage.setTables(weddingId, tables);
      return;
    }

    const emptyRow = e.target.closest('.guest-row-empty');
    if (emptyRow) {
      const deleteBtn = e.target.closest('button[data-action="delete-seat"]');
      if (!deleteBtn) {
        document.querySelectorAll('.guest-row-empty.revealed').forEach((el) => {
          if (el !== emptyRow) el.classList.remove('revealed');
        });
        emptyRow.classList.toggle('revealed');
        return;
      }
      const { id: seatId, tableId } = deleteBtn.dataset;
      const wedding = cachedWedding || (await Storage.getWedding(weddingId));
      if (!wedding) return;
      const table = (wedding.tables || []).find((tb) => tb.id === tableId);
      if (!table) return;
      const currentSeats = table.seats != null ? table.seats : DEFAULT_SEATS;
      const tables = wedding.tables.map((tb) => (
        tb.id === tableId ? { ...tb, seats: Math.max(0, currentSeats - 1) } : tb
      ));
      // A synthetic trailing placeholder has no matching entry in
      // wedding.guests — filtering it out is then simply a no-op, which is
      // exactly right since there's nothing real to remove.
      const guests = wedding.guests.filter((g) => g.id !== seatId);
      await renderGuests({ ...wedding, tables, guests });
      await Storage.setBoard(weddingId, { guests, tables });
      return;
    }

    const row = e.target.closest('.guest-row');
    if (!row) return;

    if (e.target.closest('.guest-row-name')) {
      await guestModalApi.open(row.dataset.id);
      return;
    }

    const interactive = e.target.closest('button, a, input, select');
    if (!interactive) {
      document.querySelectorAll('.guest-row.revealed').forEach((el) => {
        if (el !== row) el.classList.remove('revealed');
      });
      row.classList.toggle('revealed');
      return;
    }

    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'delete-guest') {
      await Storage.deleteGuest(weddingId, id);
      await renderGuests();
    } else if (action === 'move-up' || action === 'move-down') {
      await moveGuest(id, action === 'move-up' ? 'up' : 'down');
    }
  });

  guestListEl.addEventListener('change', async (e) => {
    const input = e.target.closest('.guest-table-edit');
    if (!input) return;
    await updateGuestTable(input.dataset.id, input.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.guest-row')) {
      document.querySelectorAll('.guest-row.revealed').forEach((el) => el.classList.remove('revealed'));
    }
    if (!e.target.closest('.table-group-title-row')) {
      document.querySelectorAll('.table-group-title-row.revealed').forEach((el) => el.classList.remove('revealed'));
    }
  });

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
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
  try {
    initCountdown(wedding.date);
  } catch (err) {
    console.warn('countdown init failed', err);
  }
  floorPlanTabLink.href = `floor-plan.html?id=${weddingId}`;
  const partnersTile = document.getElementById('partners-tile');
  if (partnersTile) partnersTile.href = `partenaires.html?id=${weddingId}`;
  const todoTile = document.getElementById('todo-tile');
  if (todoTile) todoTile.href = `todo.html?id=${weddingId}`;
  shareControls.init(weddingId);
  themeSettings.init();
  updatePageTitle();
  applyFeatureGating(wedding);

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  await renderGuests();
})();
