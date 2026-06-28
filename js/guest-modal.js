import { Storage } from './storage.js';
import { t } from './i18n.js';
import { buildCountryCodeOptionsHtml, combinePhone, splitPhone, DEFAULT_COUNTRY_CODE_BY_LANG } from './phone-codes.js';

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
  const phoneCodeSelect = document.getElementById('guest-modal-phone-code');
  const phoneInput = document.getElementById('guest-modal-phone-input');
  const emailInput = document.getElementById('guest-modal-email-input');
  const tableSelect = document.getElementById('guest-modal-table-select');
  const menuSelect = document.getElementById('guest-modal-menu-select');
  const rsvpSelect = document.getElementById('guest-modal-rsvp-select');
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

  function buildMenuOptionsHtml(menus, currentMenuId) {
    const lang = getLang();
    const unassignedOpt = `<option value="" ${currentMenuId === '' ? 'selected' : ''}>${escapeHtml(t(lang, 'unassignedOption'))}</option>`;
    const options = menus
      .map((menu) => `<option value="${escapeHtml(menu.id)}" ${menu.id === currentMenuId ? 'selected' : ''}>${escapeHtml(menu.title)}</option>`)
      .join('');
    return unassignedOpt + options;
  }

  function buildRsvpOptionsHtml(currentStatus) {
    const lang = getLang();
    const status = currentStatus || 'pending';
    return ['pending', 'confirmed', 'declined']
      .map((value) => `<option value="${value}" ${value === status ? 'selected' : ''}>${escapeHtml(t(lang, `guestRsvp${value[0].toUpperCase()}${value.slice(1)}`))}</option>`)
      .join('');
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
    const { code, number } = splitPhone(guest.phone);
    phoneCodeSelect.innerHTML = buildCountryCodeOptionsHtml(code || DEFAULT_COUNTRY_CODE_BY_LANG[getLang()] || '33');
    phoneInput.value = number;
    emailInput.value = guest.email || '';
    tableSelect.innerHTML = buildTableOptionsHtml(wedding.tables || [], guest.table || '');
    menuSelect.innerHTML = buildMenuOptionsHtml(wedding.menus || [], guest.menuId || '');
    rsvpSelect.innerHTML = buildRsvpOptionsHtml(guest.rsvp);
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

  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') phoneInput.blur();
  });

  async function savePhone() {
    const guest = activeGuest();
    if (!guest) return;
    const newPhone = combinePhone(phoneCodeSelect.value, phoneInput.value);
    if (newPhone === (guest.phone || '')) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, phone: newPhone } : g));
    await Storage.setGuests(weddingId, guests);
    await notifyChange();
  }

  phoneInput.addEventListener('change', savePhone);
  phoneCodeSelect.addEventListener('change', savePhone);

  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') emailInput.blur();
  });

  emailInput.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    const newEmail = emailInput.value.trim();
    if (newEmail === (guest.email || '')) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, email: newEmail } : g));
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

  menuSelect.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, menuId: menuSelect.value } : g));
    await Storage.setGuests(weddingId, guests);
    await notifyChange();
  });

  rsvpSelect.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    const guests = wedding.guests.map((g) => (g.id === guest.id ? { ...g, rsvp: rsvpSelect.value } : g));
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
