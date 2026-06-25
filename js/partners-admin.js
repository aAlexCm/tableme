import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { PARTNER_CATEGORIES, PARTNER_ICONS } from './partners.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
};

(function () {
  let currentLang = localStorage.getItem(ADMIN_LANG_KEY) || 'fr';
  let editingPartnerId = null;
  let weddingLocations = [];
  let selectedIcon = PARTNER_ICONS[0].key;

  const langMount = document.getElementById('lang-switcher-mount');

  const formTitleEl = document.getElementById('partner-form-title');
  const form = document.getElementById('partner-form');
  const nameInput = document.getElementById('partner-name');
  const categorySelect = document.getElementById('partner-category');
  const iconGridEl = document.getElementById('partner-icon-grid');
  const descriptionInput = document.getElementById('partner-description');
  const linkInput = document.getElementById('partner-link');
  const countryInput = document.getElementById('partner-country');
  const regionInput = document.getElementById('partner-region');
  const cityInput = document.getElementById('partner-city');
  const countryOptionsEl = document.getElementById('partner-country-options');
  const regionOptionsEl = document.getElementById('partner-region-options');
  const cityOptionsEl = document.getElementById('partner-city-options');
  const submitBtn = document.getElementById('partner-form-submit');
  const cancelBtn = document.getElementById('partner-form-cancel');

  const listEl = document.getElementById('partner-list');
  const listEmptyEl = document.getElementById('partner-list-empty');

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
    document.title = `TableMe · ${t(currentLang, 'partnersAdminTitle')}`;
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(ADMIN_LANG_KEY, lang);
    applyTranslations(lang);
    updatePageTitle();
    renderCategoryOptions();
    renderIconGrid();
    renderPartnerList();
  }

  function renderCategoryOptions() {
    const selected = categorySelect.value;
    categorySelect.innerHTML = Object.entries(PARTNER_CATEGORIES)
      .map(([key, cat]) => `<option value="${key}">${escapeHtml(t(currentLang, cat.labelKey))}</option>`)
      .join('');
    if (selected) categorySelect.value = selected;
  }

  function renderIconGrid() {
    iconGridEl.innerHTML = PARTNER_ICONS.map((icon) => {
      const label = escapeHtml(t(currentLang, icon.labelKey));
      return `
        <button type="button" class="partner-icon-option${icon.key === selectedIcon ? ' active' : ''}" data-icon="${icon.key}" title="${label}" aria-label="${label}">
          ${icon.svg}
        </button>
      `;
    }).join('');
  }

  iconGridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.partner-icon-option');
    if (!btn) return;
    selectedIcon = btn.dataset.icon;
    renderIconGrid();
  });

  function distinctValues(values) {
    const seen = new Map();
    values.forEach((v) => {
      const trimmed = (v || '').trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) seen.set(trimmed.toLowerCase(), trimmed);
    });
    return [...seen.values()];
  }

  function refreshGeoOptions() {
    const countryTyped = countryInput.value.trim().toLowerCase();
    const regionTyped = regionInput.value.trim().toLowerCase();

    countryOptionsEl.innerHTML = distinctValues(weddingLocations.map((l) => l.country))
      .map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');

    const regionsForCountry = weddingLocations
      .filter((l) => !countryTyped || (l.country || '').trim().toLowerCase() === countryTyped)
      .map((l) => l.region);
    regionOptionsEl.innerHTML = distinctValues(regionsForCountry)
      .map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');

    const citiesForCountryRegion = weddingLocations
      .filter((l) => !countryTyped || (l.country || '').trim().toLowerCase() === countryTyped)
      .filter((l) => !regionTyped || (l.region || '').trim().toLowerCase() === regionTyped)
      .map((l) => l.city);
    cityOptionsEl.innerHTML = distinctValues(citiesForCountryRegion)
      .map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
  }

  countryInput.addEventListener('input', refreshGeoOptions);
  regionInput.addEventListener('input', refreshGeoOptions);

  function resetForm() {
    editingPartnerId = null;
    form.reset();
    selectedIcon = PARTNER_ICONS[0].key;
    renderIconGrid();
    renderCategoryOptions();
    refreshGeoOptions();
    formTitleEl.textContent = t(currentLang, 'newPartnerTitle');
    submitBtn.textContent = t(currentLang, 'createBtn');
    cancelBtn.hidden = true;
  }

  function startEdit(partner) {
    editingPartnerId = partner.id;
    nameInput.value = partner.name || '';
    categorySelect.value = partner.category || '';
    selectedIcon = partner.icon || PARTNER_ICONS[0].key;
    renderIconGrid();
    descriptionInput.value = partner.description || '';
    linkInput.value = partner.link || '';
    const geo = partner.geo || {};
    countryInput.value = geo.country || '';
    regionInput.value = geo.region || '';
    cityInput.value = geo.city || '';
    refreshGeoOptions();
    formTitleEl.textContent = t(currentLang, 'editPartnerTitle');
    submitBtn.textContent = t(currentLang, 'saveBtn');
    cancelBtn.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  cancelBtn.addEventListener('click', resetForm);

  function formatGeo(geo) {
    if (!geo) return '';
    return [geo.city, geo.region, geo.country].filter(Boolean).join(', ');
  }

  async function renderPartnerList() {
    const partners = await Storage.getPartners();
    listEmptyEl.hidden = partners.length > 0;
    listEl.innerHTML = partners.map((p) => {
      const icon = PARTNER_ICONS.find((i) => i.key === p.icon);
      const categoryLabel = PARTNER_CATEGORIES[p.category] ? t(currentLang, PARTNER_CATEGORIES[p.category].labelKey) : '';
      const editLabel = escapeHtml(t(currentLang, 'editPartnerBtn'));
      const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
      return `
        <li class="wedding-item" data-id="${p.id}">
          <div class="info">
            <strong>${icon ? icon.svg : ''} ${escapeHtml(p.name)}</strong>
            <span class="muted">${escapeHtml(categoryLabel)} &middot; ${escapeHtml(formatGeo(p.geo))}</span>
          </div>
          <div class="actions">
            <button type="button" class="icon-btn" data-action="edit" data-id="${p.id}" title="${editLabel}" aria-label="${editLabel}">${ICONS.edit}</button>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${p.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
          </div>
        </li>
      `;
    }).join('');
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') {
      const partners = await Storage.getPartners();
      const partner = partners.find((p) => p.id === id);
      if (partner) startEdit(partner);
    } else if (action === 'delete') {
      const partners = await Storage.getPartners();
      const partner = partners.find((p) => p.id === id);
      if (partner && confirm(t(currentLang, 'confirmDeletePartner', partner.name))) {
        await Storage.deletePartner(id);
        if (editingPartnerId === id) resetForm();
        await renderPartnerList();
      }
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const partner = {
      name: nameInput.value.trim(),
      category: categorySelect.value,
      icon: selectedIcon,
      description: descriptionInput.value.trim(),
      link: linkInput.value.trim(),
      geo: {
        country: countryInput.value.trim(),
        region: regionInput.value.trim(),
        city: cityInput.value.trim(),
      },
    };
    if (!partner.name || !partner.link || !partner.geo.country) return;

    if (editingPartnerId) {
      await Storage.updatePartner(editingPartnerId, partner);
    } else {
      await Storage.addPartner(partner);
    }
    resetForm();
    await renderPartnerList();
  });

  (async function init() {
    const weddings = await Storage.getWeddings();
    weddingLocations = weddings.map((w) => w.location).filter(Boolean);

    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    updatePageTitle();
    renderCategoryOptions();
    renderIconGrid();
    refreshGeoOptions();
    await renderPartnerList();
  })();
})();
