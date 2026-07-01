import { Storage } from './storage.js';
import { t } from './i18n.js';
import { buildCountryCodeOptionsHtml, combinePhone, splitPhone, DEFAULT_COUNTRY_CODE_BY_LANG } from './phone-codes.js';

const ICONS = {
  trash: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  table: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h18"/><path d="M5 10v9"/><path d="M19 10v9"/></svg>',
  cutlery: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
};

const RSVP_ICONS = { pending: ICONS.clock, confirmed: ICONS.check, declined: ICONS.cross };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function initialsFor(name) {
  const words = (name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export function createGuestModal({ weddingId, getLang, onChange }) {
  let wedding = null;
  let activeGuestId = null;

  const guestModal = document.getElementById('guest-modal');
  const guestModalClose = document.getElementById('guest-modal-close');
  const avatarEl = document.getElementById('guest-modal-avatar');
  const nameInput = document.getElementById('guest-modal-name-input');
  const rsvpGroup = document.getElementById('guest-modal-rsvp-group');
  const phoneCodeSelect = document.getElementById('guest-modal-phone-code');
  const phoneInput = document.getElementById('guest-modal-phone-input');
  const tableSelect = document.getElementById('guest-modal-table-select');
  const menuSelect = document.getElementById('guest-modal-menu-select');
  const deleteBtn = document.getElementById('guest-modal-delete-btn');

  deleteBtn.querySelector('.guest-modal-delete-icon').innerHTML = ICONS.trash;
  document.getElementById('guest-modal-icon-phone').innerHTML = ICONS.phone;
  document.getElementById('guest-modal-icon-table').innerHTML = ICONS.table;
  document.getElementById('guest-modal-icon-menu').innerHTML = ICONS.cutlery;
  ['pending', 'confirmed', 'declined'].forEach((rsvp) => {
    document.getElementById(`guest-modal-rsvp-icon-${rsvp}`).innerHTML = RSVP_ICONS[rsvp];
  });

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
    const deleteLabel = t(getLang(), 'deleteGuestLink');
    deleteBtn.setAttribute('aria-label', deleteLabel);
    avatarEl.textContent = initialsFor(guest.name);
    nameInput.value = guest.name;
    const { code, number } = splitPhone(guest.phone);
    const lang = getLang();
    const defaults = DEFAULT_COUNTRY_CODE_BY_LANG[lang] || DEFAULT_COUNTRY_CODE_BY_LANG.fr;
    const selectedCode = code || defaults.code;
    const preferredIso2 = code ? null : defaults.iso2;
    phoneCodeSelect.innerHTML = buildCountryCodeOptionsHtml(selectedCode, preferredIso2, lang);
    phoneInput.value = number;
    tableSelect.innerHTML = buildTableOptionsHtml(wedding.tables || [], guest.table || '');
    menuSelect.innerHTML = buildMenuOptionsHtml(wedding.menus || [], guest.menuId || '');
    const rsvp = guest.rsvp || 'pending';
    rsvpGroup.querySelectorAll('.guest-modal-rsvp-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.rsvp === rsvp);
    });
  }

  async function notifyChange() {
    await refreshWedding();
    renderModalContent();
    if (onChange) await onChange();
  }

  // `mutate` is applied locally first (against the modal's cached `wedding`,
  // for an instant-feeling edit) and then handed to Storage.mutateGuests,
  // which re-applies it inside a Firestore transaction against whatever's
  // actually on the server — so a near-simultaneous edit from another tab,
  // device, or page never gets silently overwritten by this one.
  async function saveGuests(mutate) {
    try {
      await Storage.mutateGuests(weddingId, mutate);
    } catch (err) {
      console.error('mutateGuests failed', err);
      alert(t(getLang(), 'saveErrorRetry'));
    }
    await notifyChange();
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
    await saveGuests((guests) => guests.map((g) => (g.id === guest.id ? { ...g, name: newName } : g)));
  });

  rsvpGroup.addEventListener('click', async (e) => {
    const btn = e.target.closest('.guest-modal-rsvp-btn');
    if (!btn) return;
    const guest = activeGuest();
    if (!guest) return;
    const rsvp = btn.dataset.rsvp;
    if (rsvp === (guest.rsvp || 'pending')) return;
    await saveGuests((guests) => guests.map((g) => (g.id === guest.id ? { ...g, rsvp } : g)));
  });

  phoneInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') phoneInput.blur();
  });

  async function savePhone() {
    const guest = activeGuest();
    if (!guest) return;
    const newPhone = combinePhone(phoneCodeSelect.value, phoneInput.value);
    if (newPhone === (guest.phone || '')) return;
    await saveGuests((guests) => guests.map((g) => (g.id === guest.id ? { ...g, phone: newPhone } : g)));
  }

  phoneInput.addEventListener('change', savePhone);
  phoneCodeSelect.addEventListener('change', savePhone);

  tableSelect.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    await saveGuests((guests) => guests.map((g) => (g.id === guest.id ? { ...g, table: tableSelect.value } : g)));
  });

  menuSelect.addEventListener('change', async () => {
    const guest = activeGuest();
    if (!guest) return;
    await saveGuests((guests) => guests.map((g) => (g.id === guest.id ? { ...g, menuId: menuSelect.value } : g)));
  });

  deleteBtn.addEventListener('click', async () => {
    const guest = activeGuest();
    if (!guest) return;
    if (!confirm(t(getLang(), 'confirmDeleteGuest', guest.name))) return;
    try {
      await Storage.deleteGuest(weddingId, guest.id);
    } catch (err) {
      console.error('deleteGuest failed', err);
      alert(t(getLang(), 'saveErrorRetry'));
      return;
    }
    close();
    if (onChange) await onChange();
  });

  return { open, close };
}
