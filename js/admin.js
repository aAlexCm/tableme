import { Storage } from './storage.js';
import { LANGS, LANG_LABELS, applyTranslations, buildLangSwitcher, t } from './i18n.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';

(function () {
  let currentLang = localStorage.getItem(ADMIN_LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');

  const weddingForm = document.getElementById('wedding-form');
  const weddingNameInput = document.getElementById('wedding-name');
  const weddingDateInput = document.getElementById('wedding-date');
  const weddingLangSelect = document.getElementById('wedding-lang');
  const weddingListEl = document.getElementById('wedding-list');
  const weddingEmptyEl = document.getElementById('wedding-empty');

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  function weddingAdminUrl(id) {
    return `${window.location.origin}${window.location.pathname.replace('admin.html', '')}wedding-admin.html?id=${id}`;
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
          <a class="secondary" href="wedding-admin.html?id=${w.id}">${escapeHtml(t(currentLang, 'manageBtn'))}</a>
          <button type="button" class="secondary" data-action="copy-admin-link" data-id="${w.id}">${escapeHtml(t(currentLang, 'copyAdminLinkBtn'))}</button>
          <button type="button" class="danger" data-action="delete" data-id="${w.id}">${escapeHtml(t(currentLang, 'deleteBtn'))}</button>
        </div>
      `;
      weddingListEl.appendChild(li);
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

    if (action === 'delete') {
      const wedding = await Storage.getWedding(id);
      if (wedding && confirm(t(currentLang, 'confirmDeleteWedding', wedding.name))) {
        await Storage.deleteWedding(id);
        await renderWeddings();
      }
    } else if (action === 'copy-admin-link') {
      navigator.clipboard?.writeText(weddingAdminUrl(id)).catch(() => {});
      const original = btn.textContent;
      btn.textContent = t(currentLang, 'copiedBtn');
      setTimeout(() => (btn.textContent = original), 1500);
    }
  });

  weddingListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.mini-lang-select');
    if (!select) return;
    await Storage.updateWeddingLang(select.dataset.id, select.value);
  });

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  populateWeddingLangSelect();
  renderWeddings();
})();
