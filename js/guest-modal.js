import { Storage } from './storage.js';
import { t } from './i18n.js';

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export function createGuestModal({ weddingId, getLang, onChange }) {
  let wedding = null;
  let activeGuestId = null;

  const guestModal = document.getElementById('guest-modal');
  const guestModalClose = document.getElementById('guest-modal-close');
  const nameInput = document.getElementById('guest-modal-name-input');
  const tableSelect = document.getElementById('guest-modal-table-select');
  const deleteBtn = document.getElementById('guest-modal-delete-btn');

  deleteBtn.innerHTML = TRASH_ICON;

  function buildTableOptionsHtml(tables, currentLabel) {
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

  function activeGuest() {
    return wedding ? wedding.guests.find((g) => g.id === activeGuestId) : null;
  }

  function renderModalContent() {
    const guest = activeGuest();
    if (!guest) {
      close();
      return;
    }
    const deleteLabel = t(getLang(), 'deleteBtn');
    deleteBtn.title = deleteLabel;
    deleteBtn.setAttribute('aria-label', deleteLabel);
    nameInput.value = guest.name;
    tableSelect.innerHTML = buildTableOptionsHtml(wedding.tables || [], guest.table || '');
  }

  async function notifyChange() {
    await refreshWedding();
    renderModalContent();
    if (onChange) await onChange();
  }

  async function open(guestId) {
    activeGuestId = guestId;
    await refreshWedding();
    if (!activeGuest()) return;
    renderModalContent();
    guestModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function close() {
    guestModal.hidden = true;
    activeGuestId = null;
    document.body.classList.remove('modal-open');
  }

  guestModalClose.addEventListener('click', close);
  guestModal.addEventListener('click', (e) => {
    if (e.target === guestModal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !guestModal.hidden) close();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
  });

  nameInput.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    const newName = nameInput.value.trim();
    if (!newName) {
      alert(t(getLang(), 'guestNameEmptyError'));
      nameInput.value = guest.name;
      return;
    }
    if (newName === guest.name) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, name: newName } : g));
    await Storage.setGuests(weddingId, guests);
    await notifyChange();
  });

  tableSelect.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, table: tableSelect.value } : g));
    await Storage.setGuests(weddingId, guests);
    await notifyChange();
  });

  deleteBtn.addEventListener('click', async () => {
    const guest = activeGuest();
    if (!guest) return;
    if (!confirm(t(getLang(), 'confirmDeleteGuest', guest.name))) return;
    await Storage.deleteGuest(weddingId, guest.id);
    close();
    if (onChange) await onChange();
  });

  return { open, close };
}
