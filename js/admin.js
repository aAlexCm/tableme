import { Storage } from './storage.js';
import { LANGS, LANG_LABELS, applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { FEATURE_FLAGS, isFeatureEnabled } from './features.js';
import { getCountries, getRegions, getCities } from './geo.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 1 0-7.07-7.07L11.5 4.5"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07l1.39-1.39"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>',
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

  const featuresModal = document.getElementById('features-modal');
  const featuresModalClose = document.getElementById('features-modal-close');
  const featureToggleListEl = document.getElementById('feature-toggle-list');
  let activeFeaturesWeddingId = null;

  const locationModal = document.getElementById('location-modal');
  const locationModalClose = document.getElementById('location-modal-close');
  const locationForm = document.getElementById('location-form');
  const locationCountrySelect = document.getElementById('location-country');
  const locationRegionSelect = document.getElementById('location-region');
  const locationCitySelect = document.getElementById('location-city');
  let activeLocationWeddingId = null;
  let currentRegions = [];

  const dateModal = document.getElementById('date-modal');
  const dateModalClose = document.getElementById('date-modal-close');
  const dateForm = document.getElementById('date-form');
  const dateModalInput = document.getElementById('date-modal-input');
  let activeDateWeddingId = null;

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

  function formatLocation(location) {
    if (!location) return '';
    return [location.city, location.region, location.country].filter(Boolean).join(', ');
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
      const featuresLabel = escapeHtml(t(currentLang, 'manageFeaturesBtn'));
      const locationLabel = escapeHtml(t(currentLang, 'manageLocationBtn'));
      const dateBtnLabel = escapeHtml(t(currentLang, 'manageDateBtn'));
      const locationText = formatLocation(w.location);
      li.innerHTML = `
        <div class="info">
          <strong>${escapeHtml(w.name)}</strong>
          <span class="muted">${escapeHtml(dateLabel)} &middot; ${w.guests.filter((g) => !g.empty).length} ${escapeHtml(t(currentLang, 'guestCountSuffix'))}</span>
          ${locationText ? `<span class="muted wedding-item-location">${ICONS.pin}${escapeHtml(locationText)}</span>` : ''}
        </div>
        <div class="actions">
          <select class="mini-lang-select" data-id="${w.id}">${langOptions}</select>
          <a class="icon-btn" href="wedding-admin.html?id=${w.id}" title="${manageLabel}" aria-label="${manageLabel}">${ICONS.edit}</a>
          <button type="button" class="icon-btn" data-action="copy-admin-link" data-id="${w.id}" title="${copyLabel}" aria-label="${copyLabel}">${ICONS.link}</button>
          <button type="button" class="icon-btn" data-action="manage-date" data-id="${w.id}" title="${dateBtnLabel}" aria-label="${dateBtnLabel}">${ICONS.calendar}</button>
          <button type="button" class="icon-btn" data-action="manage-location" data-id="${w.id}" title="${locationLabel}" aria-label="${locationLabel}">${ICONS.pin}</button>
          <button type="button" class="icon-btn" data-action="manage-features" data-id="${w.id}" title="${featuresLabel}" aria-label="${featuresLabel}">${ICONS.settings}</button>
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
    } else if (action === 'manage-features') {
      await openFeaturesModal(id);
    } else if (action === 'manage-location') {
      await openLocationModal(id);
    } else if (action === 'manage-date') {
      await openDateModal(id);
    }
  });

  weddingListEl.addEventListener('change', async (e) => {
    const select = e.target.closest('.mini-lang-select');
    if (!select) return;
    await Storage.updateWeddingLang(select.dataset.id, select.value);
  });

  async function openFeaturesModal(weddingId) {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    activeFeaturesWeddingId = weddingId;
    renderFeatureToggleList(wedding);
    featuresModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeFeaturesModal() {
    featuresModal.hidden = true;
    activeFeaturesWeddingId = null;
    document.body.classList.remove('modal-open');
  }

  function renderFeatureToggleList(wedding) {
    featureToggleListEl.innerHTML = '';
    FEATURE_FLAGS.forEach((flag) => {
      const enabled = isFeatureEnabled(wedding, flag.key);
      const li = document.createElement('li');
      li.className = 'feature-toggle-item';
      li.innerHTML = `
        <span class="feature-toggle-label">${escapeHtml(t(currentLang, flag.labelKey))}</span>
        <label class="toggle-switch">
          <input type="checkbox" data-feature-key="${flag.key}" ${enabled ? 'checked' : ''} />
          <span class="toggle-switch-track"></span>
        </label>
      `;
      featureToggleListEl.appendChild(li);
    });
  }

  featuresModalClose.addEventListener('click', closeFeaturesModal);
  featuresModal.addEventListener('click', (e) => {
    if (e.target === featuresModal) closeFeaturesModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !featuresModal.hidden) closeFeaturesModal();
  });

  featureToggleListEl.addEventListener('change', async (e) => {
    const checkbox = e.target.closest('input[data-feature-key]');
    if (!checkbox || !activeFeaturesWeddingId) return;
    const wedding = await Storage.getWedding(activeFeaturesWeddingId);
    if (!wedding) return;
    const features = { ...(wedding.features || {}), [checkbox.dataset.featureKey]: checkbox.checked };
    await Storage.setFeatures(activeFeaturesWeddingId, features);
  });

  function populateSelect(select, items, selectedName, placeholderText) {
    const options = [`<option value="">${escapeHtml(placeholderText)}</option>`].concat(
      items.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    );
    if (selectedName && !items.some((item) => item.name === selectedName)) {
      options.push(`<option value="${escapeHtml(selectedName)}">${escapeHtml(selectedName)}</option>`);
    }
    select.innerHTML = options.join('');
    select.value = selectedName || '';
  }

  function resetSelect(select) {
    select.innerHTML = `<option value="">${escapeHtml(t(currentLang, 'locationChoosePlaceholder'))}</option>`;
    select.value = '';
    select.disabled = true;
  }

  async function loadCountryOptions(selectedCountry) {
    locationCountrySelect.disabled = true;
    const countries = await getCountries();
    populateSelect(locationCountrySelect, countries, selectedCountry, t(currentLang, 'locationChoosePlaceholder'));
    locationCountrySelect.disabled = false;
  }

  async function loadRegionOptions(country, selectedRegion) {
    resetSelect(locationCitySelect);
    if (!country) {
      resetSelect(locationRegionSelect);
      currentRegions = [];
      return;
    }
    locationRegionSelect.disabled = true;
    currentRegions = await getRegions(country);
    populateSelect(locationRegionSelect, currentRegions, selectedRegion, t(currentLang, 'locationChoosePlaceholder'));
    locationRegionSelect.disabled = false;
  }

  async function loadCityOptions(country, regionName, selectedCity) {
    if (!regionName) {
      resetSelect(locationCitySelect);
      return;
    }
    locationCitySelect.disabled = true;
    const region = currentRegions.find((r) => r.name === regionName) || { name: regionName };
    const cities = await getCities(country, region);
    populateSelect(locationCitySelect, cities, selectedCity, t(currentLang, 'locationChoosePlaceholder'));
    locationCitySelect.disabled = false;
  }

  locationCountrySelect.addEventListener('change', () => {
    loadRegionOptions(locationCountrySelect.value, '');
  });

  locationRegionSelect.addEventListener('change', () => {
    loadCityOptions(locationCountrySelect.value, locationRegionSelect.value, '');
  });

  async function openLocationModal(weddingId) {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    activeLocationWeddingId = weddingId;
    const location = wedding.location || {};
    locationModal.hidden = false;
    document.body.classList.add('modal-open');

    resetSelect(locationRegionSelect);
    resetSelect(locationCitySelect);
    await loadCountryOptions(location.country);
    if (location.country) {
      await loadRegionOptions(location.country, location.region);
      if (location.region) {
        await loadCityOptions(location.country, location.region, location.city);
      }
    }
  }

  function closeLocationModal() {
    locationModal.hidden = true;
    activeLocationWeddingId = null;
    document.body.classList.remove('modal-open');
  }

  locationModalClose.addEventListener('click', closeLocationModal);
  locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) closeLocationModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !locationModal.hidden) closeLocationModal();
  });

  locationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeLocationWeddingId) return;
    const location = {
      country: locationCountrySelect.value,
      region: locationRegionSelect.value,
      city: locationCitySelect.value,
    };
    await Storage.setLocation(activeLocationWeddingId, location);
    closeLocationModal();
    await renderWeddings();
  });

  async function openDateModal(weddingId) {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    activeDateWeddingId = weddingId;
    dateModalInput.value = wedding.date || '';
    dateModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeDateModal() {
    dateModal.hidden = true;
    activeDateWeddingId = null;
    document.body.classList.remove('modal-open');
  }

  dateModalClose.addEventListener('click', closeDateModal);
  dateModal.addEventListener('click', (e) => {
    if (e.target === dateModal) closeDateModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dateModal.hidden) closeDateModal();
  });

  dateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeDateWeddingId) return;
    await Storage.updateWeddingDate(activeDateWeddingId, dateModalInput.value);
    closeDateModal();
    await renderWeddings();
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
