import { Storage } from './storage.js';
import { LANGS, LANG_LABELS, applyTranslations, buildLangSwitcher, t } from './i18n.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.39-1.39"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
};

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

  function updatePageTitle() {
    document.title = `TableMe · ${t(currentLang, 'adminTitle')}`;
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(ADMIN_LANG_KEY, lang);
    applyTranslations(lang);
    updatePageTitle();
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
      const manageLabel = escapeHtml(t(currentLang, 'manageBtn'));
      const copyLabel = escapeHtml(t(currentLang, 'copyAdminLinkBtn'));
      const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(w.name)}</strong>
          <span class="muted">${escapeHtml(dateLabel)} &middot; ${w.guests.filter((g) => !g.empty).length} ${escapeHtml(t(currentLang, 'guestCountSuffix'))}</span>
        </div>
        <div class="actions">
          <select class="mini-lang-select" data-id="${w.id}">${langOptions}</select>
          <a class="icon-btn" href="wedding-admin.html?id=${w.id}" title="${manageLabel}" aria-label="${manageLabel}">${ICONS.edit}</a>
          <button type="button" class="icon-btn" data-action="copy-admin-link" data-id="${w.id}" title="${copyLabel}" aria-label="${copyLabel}">${ICONS.link}</button>
          <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${w.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
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
    const item = e.target.closest('.wedding-item');
    if (!item) return;

    const interactive = e.target.closest('button, a, select');
    if (!interactive) {
      document.querySelectorAll('.wedding-item.revealed').forEach((el) => {
        if (el !== item) el.classList.remove('revealed');
      });
      item.classList.toggle('revealed');
      return;
    }

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
      const original = btn.innerHTML;
      btn.innerHTML = ICONS.check;
      setTimeout(() => (btn.innerHTML = original), 1200);
    }
  });

  weddingListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.mini-lang-select');
    if (!select) return;
    await Storage.updateWeddingLang(select.dataset.id, select.value);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.wedding-item')) {
      document.querySelectorAll('.wedding-item.revealed').forEach((el) => el.classList.remove('revealed'));
    }
  });

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  updatePageTitle();
  populateWeddingLangSelect();
  renderWeddings();
})();
