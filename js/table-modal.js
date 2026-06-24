import { Storage } from './storage.js';
import { t } from './i18n.js';

const DEFAULT_SEATS = 8;

export const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  rotateToVertical: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="9" width="15" height="6" rx="1.3"/><path d="M15 3a6.5 6.5 0 0 1 6 7"/><path d="M18 8.5 21 10l-1 3"/><path d="M8 21a6.5 6.5 0 0 1-6-7"/><path d="M5 15.5 2 14l1-3"/></svg>',
  rotateToHorizontal: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="4" width="6" height="15" rx="1.3"/><path d="M3 15a6.5 6.5 0 0 0 7 6"/><path d="M8.5 18 10 21l3-1"/><path d="M21 8a6.5 6.5 0 0 0-7-6"/><path d="M15.5 5 14 2l-3 1"/></svg>',
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export function createTableModal({ weddingId, getLang, onChange }) {
  let wedding = null;
  let activeTableId = null;

  const tableModal = document.getElementById('table-modal');
  const tableModalClose = document.getElementById('table-modal-close');
  const tableLabelInput = document.getElementById('table-label-input');
  const tableDeleteBtn = document.getElementById('table-delete-btn');
  const tableSeatsInput = document.getElementById('table-seats-input');
  const shapeRadios = document.querySelectorAll('input[name="table-shape"]');
  const tableRotateBtn = document.getElementById('table-rotate-btn');
  const tableModalGuestList = document.getElementById('table-modal-guest-list');
  const tableModalGuestCount = document.getElementById('table-modal-guest-count');
  const tableModalEmptyEl = document.getElementById('table-modal-empty');
  const tableAddExistingWrap = document.getElementById('table-add-existing-wrap');
  const tableAddExistingSelect = document.getElementById('table-add-existing-select');
  const tableAddExistingBtn = document.getElementById('table-add-existing-btn');
  const tableAddNewInput = document.getElementById('table-add-new-input');
  const tableAddNewBtn = document.getElementById('table-add-new-btn');
  const seatsDecrementBtn = document.getElementById('seats-decrement');
  const seatsIncrementBtn = document.getElementById('seats-increment');

  tableDeleteBtn.innerHTML = ICONS.trash;

  function updateLabels() {
    const lang = getLang();
    const assignLabel = t(lang, 'assignBtn');
    tableAddExistingBtn.innerHTML = ICONS.plus;
    tableAddExistingBtn.title = assignLabel;
    tableAddExistingBtn.setAttribute('aria-label', assignLabel);

    const addLabel = t(lang, 'addBtn');
    tableAddNewBtn.innerHTML = ICONS.plus;
    tableAddNewBtn.title = addLabel;
    tableAddNewBtn.setAttribute('aria-label', addLabel);
  }

  function updateRotateButton(table) {
    const lang = getLang();
    const rotateLabel = table.rotated ? t(lang, 'rotateToHorizontalBtn') : t(lang, 'rotateToVerticalBtn');
    tableRotateBtn.innerHTML = table.rotated ? ICONS.rotateToHorizontal : ICONS.rotateToVertical;
    tableRotateBtn.title = rotateLabel;
    tableRotateBtn.setAttribute('aria-label', rotateLabel);
  }

  function buildMoveSelectHtml(tables, currentLabel) {
    const lang = getLang();
    const unassignedOpt = `<option value="" ${currentLabel === '' ? 'selected' : ''}>${escapeHtml(t(lang, 'unassignedOption'))}</option>`;
    const options = tables
      .map((tb) => `<option value="${escapeHtml(tb.label)}" ${tb.label === currentLabel ? 'selected' : ''}>${escapeHtml(tb.label)}</option>`)
      .join('');
    return unassignedOpt + options;
  }

  async function refreshWedding() {
    wedding = await Storage.getWedding(weddingId);
  }

  function renderModalContent() {
    if (!wedding) return;
    const lang = getLang();
    const table = (wedding.tables || []).find((tb) => tb.id === activeTableId);
    if (!table) {
      close();
      return;
    }

    tableLabelInput.value = table.label;
    const deleteLabelText = t(lang, 'deleteTableBtn');
    tableDeleteBtn.title = deleteLabelText;
    tableDeleteBtn.setAttribute('aria-label', deleteLabelText);
    shapeRadios.forEach((radio) => {
      radio.checked = radio.value === (table.shape || 'round');
    });
    tableRotateBtn.hidden = table.shape !== 'rectangle';
    if (table.shape === 'rectangle') updateRotateButton(table);
    const seatCount = table.seats != null ? table.seats : DEFAULT_SEATS;
    tableSeatsInput.value = seatCount;

    const guests = wedding.guests.filter((g) => g.table === table.label);
    tableModalGuestCount.textContent = `${guests.length}/${seatCount}`;
    tableModalEmptyEl.hidden = guests.length > 0;
    tableModalGuestList.innerHTML = '';
    guests.forEach((g) => {
      const deleteLabel = escapeHtml(t(lang, 'deleteBtn'));
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
    tableAddExistingWrap.hidden = unassigned.length === 0;
    if (unassigned.length > 0) {
      const placeholder = `<option value="" disabled selected>${escapeHtml(t(lang, 'chooseGuestPlaceholder'))}</option>`;
      const options = unassigned.map((g) => `<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
      tableAddExistingSelect.innerHTML = placeholder + options;
    }
  }

  async function notifyChange() {
    await refreshWedding();
    renderModalContent();
    if (onChange) await onChange();
  }

  async function open(tableId) {
    activeTableId = tableId;
    await refreshWedding();
    renderModalContent();
    tableModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function close() {
    tableModal.hidden = true;
    activeTableId = null;
    document.body.classList.remove('modal-open');
  }

  async function setGuestTable(guestId, tableLabel) {
    const guests = wedding.guests.map((g) => (g.id === guestId ? { ...g, table: tableLabel, seat: null } : g));
    await Storage.setGuests(weddingId, guests);
    await notifyChange();
  }

  tableModalClose.addEventListener('click', close);
  tableModal.addEventListener('click', (e) => {
    if (e.target === tableModal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tableModal.hidden) close();
  });

  tableLabelInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tableLabelInput.blur();
  });

  tableLabelInput.addEventListener('change', async () => {
    const lang = getLang();
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    const newLabel = tableLabelInput.value.trim();
    if (!newLabel) {
      alert(t(lang, 'tableLabelEmptyError'));
      tableLabelInput.value = table.label;
      return;
    }
    if (newLabel === table.label) return;
    if (wedding.tables.some((tb) => tb.label === newLabel)) {
      alert(t(lang, 'tableLabelDuplicateError'));
      tableLabelInput.value = table.label;
      return;
    }
    const oldLabel = table.label;
    const tables = wedding.tables.map((tb) => (tb.id === table.id ? { ...tb, label: newLabel } : tb));
    const guests = wedding.guests.map((g) => (g.table === oldLabel ? { ...g, table: newLabel } : g));
    await Storage.setBoard(weddingId, { guests, tables });
    await notifyChange();
  });

  shapeRadios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      const tables = wedding.tables.map((tb) => (tb.id === activeTableId ? { ...tb, shape: radio.value } : tb));
      await Storage.setTables(weddingId, tables);
      await notifyChange();
    });
  });

  tableRotateBtn.addEventListener('click', async () => {
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    const tables = wedding.tables.map((tb) => (tb.id === activeTableId ? { ...tb, rotated: !tb.rotated } : tb));
    await Storage.setTables(weddingId, tables);
    await notifyChange();
  });

  tableSeatsInput.addEventListener('change', async () => {
    const value = tableSeatsInput.value.trim();
    const seats = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    const tables = wedding.tables.map((tb) => (tb.id === activeTableId ? { ...tb, seats } : tb));
    await Storage.setTables(weddingId, tables);
    await notifyChange();
  });

  function stepSeats(delta) {
    const current = parseInt(tableSeatsInput.value, 10) || 0;
    tableSeatsInput.value = Math.max(0, current + delta);
    tableSeatsInput.dispatchEvent(new Event('change'));
  }

  seatsDecrementBtn.addEventListener('click', () => stepSeats(-1));
  seatsIncrementBtn.addEventListener('click', () => stepSeats(1));

  tableDeleteBtn.addEventListener('click', async () => {
    const lang = getLang();
    const table = wedding.tables.find((tb) => tb.id === activeTableId);
    if (!table) return;
    const affected = wedding.guests.filter((g) => g.table === table.label).length;
    if (!confirm(t(lang, 'confirmDeleteTable', affected))) return;
    const tables = wedding.tables.filter((tb) => tb.id !== table.id);
    const guests = wedding.guests.map((g) => (g.table === table.label ? { ...g, table: '', seat: null } : g));
    await Storage.setBoard(weddingId, { guests, tables });
    close();
    if (onChange) await onChange();
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
    await notifyChange();
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
    await notifyChange();
  });

  tableModalGuestList.addEventListener('change', async (e) => {
    const select = e.target.closest('.move-to-table-select');
    if (!select) return;
    await setGuestTable(select.dataset.id, select.value);
  });

  updateLabels();

  return { open, close, updateLabels };
}
