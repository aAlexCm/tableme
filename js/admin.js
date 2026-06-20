import { Storage } from './storage.js';
import { LANGS, LANG_LABELS, applyTranslations, buildLangSwitcher, t } from './i18n.js';

const ADMIN_PASSWORD_HASH = 'fd2eb3f297cddf665a7518d12b3e5781ef56522f16878241949efbfffcfaf439';
const AUTH_SESSION_KEY = 'tableme_admin_auth';
const ADMIN_LANG_KEY = 'tableme_admin_lang';

async function hashPassword(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

(function () {
  let selectedWeddingId = null;
  let currentLang = localStorage.getItem(ADMIN_LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');

  const authGate = document.getElementById('auth-gate');
  const authForm = document.getElementById('auth-form');
  const authPasswordInput = document.getElementById('auth-password');
  const authErrorEl = document.getElementById('auth-error');
  const adminContent = document.getElementById('admin-content');

  const weddingForm = document.getElementById('wedding-form');
  const weddingNameInput = document.getElementById('wedding-name');
  const weddingDateInput = document.getElementById('wedding-date');
  const weddingLangSelect = document.getElementById('wedding-lang');
  const weddingListEl = document.getElementById('wedding-list');
  const weddingEmptyEl = document.getElementById('wedding-empty');

  const guestsCard = document.getElementById('guests-card');
  const guestsTitle = document.getElementById('guests-title');
  const guestLinkInput = document.getElementById('guest-link');
  const copyLinkBtn = document.getElementById('copy-link');
  const guestForm = document.getElementById('guest-form');
  const guestNameInput = document.getElementById('guest-name');
  const guestTableInput = document.getElementById('guest-table');
  const guestListEl = document.getElementById('guest-list');
  const guestEmptyEl = document.getElementById('guest-empty');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function populateWeddingLangSelect() {
    weddingLangSelect.innerHTML = '';
    LANGS.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = LANG_LABELS[code];
      if (code === 'fr') option.selected = true;
      weddingLangSelect.appendChild(option);
    });
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(ADMIN_LANG_KEY, lang);
    applyTranslations(lang);
    renderWeddings();
    if (selectedWeddingId) renderGuests();
  }

  async function renderWeddings() {
    const weddings = await Storage.getWeddings();
    weddingListEl.innerHTML = '';
    weddingEmptyEl.hidden = weddings.length > 0;

    weddings.forEach((w) => {
      const li = document.createElement('li');
      li.className = 'wedding-item';
      const dateLabel = w.date ? new Date(w.date).toLocaleDateString('fr-FR') : t(currentLang, 'dateUnset');
      const langOptions = LANGS.map(
        (code) => `<option value="${code}" ${(w.lang || 'fr') === code ? 'selected' : ''}>${LANG_LABELS[code]}</option>`
      ).join('');
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(w.name)}</strong>
          <span class="muted">${escapeHtml(dateLabel)} &middot; ${w.guests.length} ${escapeHtml(t(currentLang, 'guestCountSuffix'))}</span>
        </div>
        <div class="actions">
          <select class="mini-lang-select" data-id="${w.id}">${langOptions}</select>
          <button type="button" class="secondary" data-action="manage" data-id="${w.id}">${escapeHtml(t(currentLang, 'manageBtn'))}</button>
          <button type="button" class="danger" data-action="delete" data-id="${w.id}">${escapeHtml(t(currentLang, 'deleteBtn'))}</button>
        </div>
      `;
      weddingListEl.appendChild(li);
    });

    if (selectedWeddingId && !weddings.some((w) => w.id === selectedWeddingId)) {
      selectedWeddingId = null;
      guestsCard.hidden = true;
    }
  }

  async function renderGuests() {
    const wedding = await Storage.getWedding(selectedWeddingId);
    if (!wedding) {
      guestsCard.hidden = true;
      return;
    }

    guestsCard.hidden = false;
    guestsTitle.textContent = `${t(currentLang, 'guestsTitlePrefix')}${wedding.name}`;
    guestLinkInput.value = `${window.location.origin}${window.location.pathname.replace('admin.html', '')}index.html?id=${wedding.id}`;

    guestListEl.innerHTML = '';
    guestEmptyEl.hidden = wedding.guests.length > 0;

    wedding.guests.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'guest-item';
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(g.name)}</strong>
          <span class="muted">${escapeHtml(t(currentLang, 'tableLabel'))} ${escapeHtml(g.table)}</span>
        </div>
        <div class="actions">
          <button type="button" class="danger" data-action="delete-guest" data-id="${g.id}">${escapeHtml(t(currentLang, 'deleteBtn'))}</button>
        </div>
      `;
      guestListEl.appendChild(li);
    });
  }

  weddingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = weddingNameInput.value.trim();
    if (!name) return;
    await Storage.addWedding(name, weddingDateInput.value, weddingLangSelect.value);
    weddingForm.reset();
    populateWeddingLangSelect();
    await renderWeddings();
  });

  weddingListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;

    if (action === 'manage') {
      selectedWeddingId = id;
      await renderGuests();
    } else if (action === 'delete') {
      const wedding = await Storage.getWedding(id);
      if (wedding && confirm(t(currentLang, 'confirmDeleteWedding', wedding.name))) {
        await Storage.deleteWedding(id);
        await renderWeddings();
      }
    }
  });

  weddingListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.mini-lang-select');
    if (!select) return;
    await Storage.updateWeddingLang(select.dataset.id, select.value);
  });

  guestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedWeddingId) return;
    const name = guestNameInput.value.trim();
    const table = guestTableInput.value.trim();
    if (!name || !table) return;
    await Storage.addGuest(selectedWeddingId, name, table);
    guestForm.reset();
    await renderGuests();
    await renderWeddings();
  });

  guestListEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'delete-guest' && selectedWeddingId) {
      await Storage.deleteGuest(selectedWeddingId, id);
      await renderGuests();
      await renderWeddings();
    }
  });

  copyLinkBtn.addEventListener('click', () => {
    guestLinkInput.select();
    navigator.clipboard?.writeText(guestLinkInput.value).catch(() => {});
    copyLinkBtn.textContent = t(currentLang, 'copiedBtn');
    setTimeout(() => (copyLinkBtn.textContent = t(currentLang, 'copyBtn')), 1500);
  });

  function unlockAdmin() {
    authGate.hidden = true;
    adminContent.hidden = false;
    renderWeddings();
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hash = await hashPassword(authPasswordInput.value);
    if (hash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      authErrorEl.hidden = true;
      authForm.reset();
      unlockAdmin();
    } else {
      authErrorEl.hidden = false;
    }
  });

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  populateWeddingLangSelect();

  if (sessionStorage.getItem(AUTH_SESSION_KEY) === 'true') {
    unlockAdmin();
  }
})();
