import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { createTableModal } from './table-modal.js';
import { createShareControls } from './share-controls.js';
import { createThemeSettings } from './theme-settings.js';
import { assignSeats } from './table-shape.js';

const LANG_KEY = 'tableme_wedding_admin_lang';
const DEFAULT_SEATS = 8;

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  chevronUp: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
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

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('wedding-admin-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const floorPlanTabLink = document.getElementById('view-tab-floorplan');

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
    document.title = `TableMe · ${t(currentLang, 'weddingAdminPageTitle')}`;
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

  function getDragAfterElement(container, y) {
    const rows = [...container.querySelectorAll('.guest-row:not(.dragging)')];
    return rows.reduce(
      (closest, row) => {
        const box = row.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: row };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  async function commitGuestOrder() {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const guestMap = new Map(wedding.guests.map((g) => [g.id, g]));
    const newGuests = [];
    guestListEl.querySelectorAll('.guest-row').forEach((row) => {
      const guest = guestMap.get(row.dataset.id);
      if (!guest) return;
      const table = row.closest('.table-guest-list').dataset.table;
      const seat = table === guest.table ? guest.seat : null;
      newGuests.push({ ...guest, table, seat });
    });
    await Storage.setGuests(weddingId, newGuests);
    await renderGuests();
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
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table, seat: null } : g));
    await Storage.setGuests(weddingId, guests);
    await renderGuests();
  }

  function attachRowDragEvents(row) {
    row.addEventListener('dragstart', () => {
      draggedRow = row;
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      draggedRow = null;
    });

    const handle = row.querySelector('.drag-handle');

    handle.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        draggedRow = row;
        row.classList.add('dragging');
      },
      { passive: false }
    );

    handle.addEventListener(
      'touchmove',
      (e) => {
        if (!draggedRow) return;
        e.preventDefault();
        const touch = e.touches[0];
        const elAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
        const list = elAtPoint && elAtPoint.closest('.table-guest-list');
        if (!list) return;
        const afterEl = getDragAfterElement(list, touch.clientY);
        if (afterEl == null) {
          list.appendChild(draggedRow);
        } else {
          list.insertBefore(draggedRow, afterEl);
        }
      },
      { passive: false }
    );

    handle.addEventListener('touchend', async () => {
      if (!draggedRow) return;
      const affectedTable = draggedRow.closest('.table-guest-list')?.dataset.table;
      row.classList.remove('dragging');
      draggedRow = null;
      await commitGuestOrder(affectedTable);
    });
  }

  function attachListDropEvents(list) {
    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      const afterEl = getDragAfterElement(list, e.clientY);
      if (afterEl == null) {
        list.appendChild(draggedRow);
      } else {
        list.insertBefore(draggedRow, afterEl);
      }
    });

    list.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!draggedRow) return;
      await commitGuestOrder(list.dataset.table);
    });
  }

  async function renderGuests() {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;

    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.length > 0;

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
      title.innerHTML = `${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(key || '—')}`
        + (table ? ` <span class="table-group-count">(${guests.length}/${table.seats != null ? table.seats : DEFAULT_SEATS})</span>` : '');
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

      function renderEmptySeatRow() {
        const li = document.createElement('li');
        li.className = 'guest-row-empty';
        li.textContent = t(currentLang, 'emptySeatPlaceholder');
        return li;
      }

      if (table) {
        const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;
        // Never hide guests beyond the seat count (e.g. a table with more guests
        // than seats) — only expand to show extra rows, never drop anyone.
        const slots = assignSeats(guests, Math.max(seatCount, guests.length));
        slots.forEach((guest) => {
          list.appendChild(guest ? renderGuestRow(guest) : renderEmptySeatRow());
        });
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
        const affected = wedding.guests.filter((g) => g.table === table.label).length;
        if (!confirm(t(currentLang, 'confirmDeleteTable', affected))) return;
        const tables = wedding.tables.filter((tb) => tb.id !== table.id);
        const guests = wedding.guests.map((g) => (g.table === table.label ? { ...g, table: '', seat: null } : g));
        await Storage.setBoard(weddingId, { guests, tables });
        await renderGuests();
      }
      return;
    }

    const row = e.target.closest('.guest-row');
    if (!row) return;

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
  floorPlanTabLink.href = `floor-plan.html?id=${weddingId}`;
  shareControls.init(weddingId);
  themeSettings.init();
  updatePageTitle();

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  await renderGuests();
})();
