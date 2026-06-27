import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { PARTNER_CATEGORIES, PARTNER_ICONS, CONTACT_CHANNELS } from './partners.js';
import { getCountries, getRegions, getCities } from './geo.js';
import { waitForAuthUser, signInWithGoogle, signOutUser } from './auth-guard.js';

const ADMIN_LANG_KEY = 'tableme_admin_lang';
const MAX_PHOTO_DIMENSION = 640;

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
};

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

(function () {
  let currentLang = localStorage.getItem(ADMIN_LANG_KEY) || 'fr';
  let editingPartnerId = null;
  let editingPartnerOrder = null;
  let currentRegions = [];
  let partnersCache = [];
  let selectedIcon = PARTNER_ICONS[0].key;

  const langMount = document.getElementById('lang-switcher-mount');

  const loginEl = document.getElementById('partners-admin-login');
  const loginGoogleBtn = document.getElementById('partners-admin-login-google-btn');
  const loginErrorEl = document.getElementById('partners-admin-login-error');
  const contentEl = document.getElementById('partners-admin-content');
  const logoutBtn = document.getElementById('partners-admin-logout-btn');

  const formTitleEl = document.getElementById('partner-form-title');
  const form = document.getElementById('partner-form');
  const nameInput = document.getElementById('partner-name');
  const categorySelect = document.getElementById('partner-category');
  const iconGridEl = document.getElementById('partner-icon-grid');
  const descriptionInput = document.getElementById('partner-description');
  const contactsGridEl = document.getElementById('partner-contacts-grid');
  const photoPreviewEl = document.getElementById('partner-photo-preview');
  const photoPreviewImgEl = document.getElementById('partner-photo-preview-img');
  const photoRemoveBtn = document.getElementById('partner-photo-remove-btn');
  const photoFileInput = document.getElementById('partner-photo-file-input');
  const photoUploadBtn = document.getElementById('partner-photo-upload-btn');
  const photoUrlInput = document.getElementById('partner-photo-url-input');
  const countrySelect = document.getElementById('partner-country');
  const regionSelect = document.getElementById('partner-region');
  const citySelect = document.getElementById('partner-city');
  const submitBtn = document.getElementById('partner-form-submit');
  const cancelBtn = document.getElementById('partner-form-cancel');

  const listEl = document.getElementById('partner-list');
  const listEmptyEl = document.getElementById('partner-list-empty');
  const seedExamplesBtn = document.getElementById('seed-examples-btn');

  const statsSummaryEl = document.getElementById('partner-stats-summary');
  const statsBarsEl = document.getElementById('partner-stats-bars');
  const statsByWeddingBodyEl = document.getElementById('partner-stats-by-wedding-body');
  const statsRecentBodyEl = document.getElementById('partner-stats-recent-body');
  const statsEmptyEl = document.getElementById('partner-stats-empty');

  const EXAMPLE_PARTNERS = [
    {
      name: 'Prestige Wedding Cars',
      category: 'transport',
      icon: 'car',
      description: 'Location de voitures de luxe avec chauffeur pour le jour J.',
      contacts: { website: 'https://example.com' },
      photo: '',
      geo: { country: 'France', region: '', city: '' },
    },
    {
      name: "Les Copains d'Abord",
      category: 'animation',
      icon: 'music',
      description: 'Animations, jeux et photobooth pour dynamiser votre soirée.',
      contacts: { website: 'https://example.com' },
      photo: '',
      geo: { country: 'France', region: '', city: '' },
    },
    {
      name: 'Fleurs & Cie',
      category: 'decoration',
      icon: 'flower',
      description: 'Décoration florale sur-mesure pour votre cérémonie et votre salle.',
      contacts: { website: 'https://example.com' },
      photo: '',
      geo: { country: 'France', region: '', city: '' },
    },
  ];

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
    document.title = 'TableMe · Manage partners';
  }

  async function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(ADMIN_LANG_KEY, lang);
    applyTranslations(lang);
    updatePageTitle();
    // Logged-out visitors only see the login form (already translated above
    // via applyTranslations) — the rest below touches the gated content.
    if (contentEl.hidden) return;
    renderCategoryOptions();
    renderIconGrid();
    renderContactsFields();
    const { value: country } = countrySelect;
    const { value: region } = regionSelect;
    const { value: city } = citySelect;
    await loadCountryOptions(country);
    if (country) await loadRegionOptions(country, region);
    if (country && region) await loadCityOptions(country, region, city);
    await renderPartnerList();
    await renderPartnerStats();
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

  function renderContactsFields() {
    const values = {};
    CONTACT_CHANNELS.forEach((channel) => {
      const existing = document.getElementById(`partner-contact-${channel.key}`);
      values[channel.key] = existing ? existing.value : '';
    });
    contactsGridEl.innerHTML = CONTACT_CHANNELS.map((channel) => `
      <div class="field">
        <label for="partner-contact-${channel.key}">${channel.svg}${escapeHtml(t(currentLang, channel.labelKey))}</label>
        <input type="text" id="partner-contact-${channel.key}" data-channel="${channel.key}" placeholder="${escapeHtml(channel.placeholder)}" />
      </div>
    `).join('');
    CONTACT_CHANNELS.forEach((channel) => {
      document.getElementById(`partner-contact-${channel.key}`).value = values[channel.key] || '';
    });
  }

  function getContactsFromForm() {
    const contacts = {};
    CONTACT_CHANNELS.forEach((channel) => {
      contacts[channel.key] = document.getElementById(`partner-contact-${channel.key}`).value.trim();
    });
    return contacts;
  }

  function setContactsInForm(contacts) {
    CONTACT_CHANNELS.forEach((channel) => {
      document.getElementById(`partner-contact-${channel.key}`).value = (contacts && contacts[channel.key]) || '';
    });
  }

  function populateGeoSelect(select, items, selectedName, placeholderText) {
    const options = [`<option value="">${escapeHtml(placeholderText)}</option>`].concat(
      items.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
    );
    if (selectedName && !items.some((item) => item.name === selectedName)) {
      options.push(`<option value="${escapeHtml(selectedName)}">${escapeHtml(selectedName)}</option>`);
    }
    select.innerHTML = options.join('');
    select.value = selectedName || '';
  }

  function resetGeoSelect(select, placeholderText) {
    select.innerHTML = `<option value="">${escapeHtml(placeholderText)}</option>`;
    select.value = '';
    select.disabled = true;
  }

  async function loadCountryOptions(selectedCountry) {
    countrySelect.disabled = true;
    const countries = await getCountries();
    populateGeoSelect(countrySelect, countries, selectedCountry, t(currentLang, 'locationChoosePlaceholder'));
    countrySelect.disabled = false;
  }

  async function loadRegionOptions(country, selectedRegion) {
    resetGeoSelect(citySelect, t(currentLang, 'partnerGeoAnyCity'));
    if (!country) {
      resetGeoSelect(regionSelect, t(currentLang, 'partnerGeoAnyRegion'));
      currentRegions = [];
      return;
    }
    regionSelect.disabled = true;
    currentRegions = await getRegions(country);
    populateGeoSelect(regionSelect, currentRegions, selectedRegion, t(currentLang, 'partnerGeoAnyRegion'));
    regionSelect.disabled = false;
  }

  async function loadCityOptions(country, regionName, selectedCity) {
    if (!regionName) {
      resetGeoSelect(citySelect, t(currentLang, 'partnerGeoAnyCity'));
      return;
    }
    citySelect.disabled = true;
    const region = currentRegions.find((r) => r.name === regionName) || { name: regionName };
    const cities = await getCities(country, region);
    populateGeoSelect(citySelect, cities, selectedCity, t(currentLang, 'partnerGeoAnyCity'));
    citySelect.disabled = false;
  }

  countrySelect.addEventListener('change', () => {
    loadRegionOptions(countrySelect.value, '');
  });

  regionSelect.addEventListener('change', () => {
    loadCityOptions(countrySelect.value, regionSelect.value, '');
  });

  function renderPhotoPreview() {
    const url = photoUrlInput.value.trim();
    if (url) {
      photoPreviewImgEl.src = url;
      photoPreviewEl.hidden = false;
    } else {
      photoPreviewEl.hidden = true;
    }
  }

  photoUploadBtn.addEventListener('click', () => photoFileInput.click());

  photoFileInput.addEventListener('change', async () => {
    const file = photoFileInput.files[0];
    photoFileInput.value = '';
    if (!file) return;
    photoUrlInput.value = await readAndResizeImage(file);
    renderPhotoPreview();
  });

  photoUrlInput.addEventListener('input', renderPhotoPreview);

  photoRemoveBtn.addEventListener('click', () => {
    photoUrlInput.value = '';
    renderPhotoPreview();
  });

  function resetForm() {
    editingPartnerId = null;
    editingPartnerOrder = null;
    form.reset();
    selectedIcon = PARTNER_ICONS[0].key;
    renderIconGrid();
    renderCategoryOptions();
    setContactsInForm({});
    loadCountryOptions('');
    resetGeoSelect(regionSelect, t(currentLang, 'partnerGeoAnyRegion'));
    resetGeoSelect(citySelect, t(currentLang, 'partnerGeoAnyCity'));
    renderPhotoPreview();
    formTitleEl.textContent = t(currentLang, 'newPartnerTitle');
    submitBtn.textContent = t(currentLang, 'createBtn');
    cancelBtn.hidden = true;
  }

  async function startEdit(partner) {
    editingPartnerId = partner.id;
    editingPartnerOrder = typeof partner.order === 'number' ? partner.order : 0;
    nameInput.value = partner.name || '';
    categorySelect.value = partner.category || '';
    selectedIcon = partner.icon || PARTNER_ICONS[0].key;
    renderIconGrid();
    descriptionInput.value = partner.description || '';
    setContactsInForm(partner.contacts);
    photoUrlInput.value = partner.photo || '';
    renderPhotoPreview();
    const geo = partner.geo || {};
    await loadCountryOptions(geo.country || '');
    if (geo.country) {
      await loadRegionOptions(geo.country, geo.region || '');
      if (geo.region) {
        await loadCityOptions(geo.country, geo.region, geo.city || '');
      }
    }
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
    let partners = await Storage.getPartners();
    partners.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name));
    if (partners.some((p) => typeof p.order !== 'number')) {
      await Promise.all(partners.map((p, i) => (p.order === i ? null : Storage.updatePartner(p.id, { order: i }))));
      partners = partners.map((p, i) => ({ ...p, order: i }));
    }
    partnersCache = partners;

    listEmptyEl.hidden = partners.length > 0;
    seedExamplesBtn.hidden = partners.length > 0;
    listEl.innerHTML = partners.map((p, index) => {
      const icon = PARTNER_ICONS.find((i) => i.key === p.icon);
      const categoryLabel = PARTNER_CATEGORIES[p.category] ? t(currentLang, PARTNER_CATEGORIES[p.category].labelKey) : '';
      const editLabel = escapeHtml(t(currentLang, 'editPartnerBtn'));
      const deleteLabel = escapeHtml(t(currentLang, 'deleteBtn'));
      const upLabel = escapeHtml(t(currentLang, 'movePartnerUpBtn'));
      const downLabel = escapeHtml(t(currentLang, 'movePartnerDownBtn'));
      return `
        <li class="wedding-item" data-id="${p.id}">
          <div class="info">
            <strong>${icon ? icon.svg : ''} ${escapeHtml(p.name)}</strong>
            <span class="muted">${escapeHtml(categoryLabel)} &middot; ${escapeHtml(formatGeo(p.geo))}</span>
          </div>
          <div class="actions">
            <button type="button" class="icon-btn" data-action="move-up" data-id="${p.id}" title="${upLabel}" aria-label="${upLabel}" ${index === 0 ? 'disabled' : ''}>${ICONS.up}</button>
            <button type="button" class="icon-btn" data-action="move-down" data-id="${p.id}" title="${downLabel}" aria-label="${downLabel}" ${index === partners.length - 1 ? 'disabled' : ''}>${ICONS.down}</button>
            <button type="button" class="icon-btn" data-action="edit" data-id="${p.id}" title="${editLabel}" aria-label="${editLabel}">${ICONS.edit}</button>
            <button type="button" class="icon-btn icon-btn-danger" data-action="delete" data-id="${p.id}" title="${deleteLabel}" aria-label="${deleteLabel}">${ICONS.trash}</button>
          </div>
        </li>
      `;
    }).join('');
  }

  function formatDateTime(ms) {
    if (!ms) return '';
    const locale = currentLang === 'en' ? 'en-GB' : currentLang === 'ro' ? 'ro-RO' : 'fr-FR';
    return new Date(ms).toLocaleString(locale, {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  function describePartnerEvent(event) {
    if (event.type === 'view') return t(currentLang, 'partnerStatsEventView');
    if (event.type === 'photo') return t(currentLang, 'partnerStatsEventPhoto', event.partnerName || '');
    const channel = CONTACT_CHANNELS.find((c) => c.key === event.contactType);
    const channelLabel = channel ? t(currentLang, channel.labelKey) : (event.contactType || '');
    return t(currentLang, 'partnerStatsEventContact', event.partnerName || '', channelLabel);
  }

  async function renderPartnerStats() {
    let clicks;
    try {
      clicks = await Storage.getPartnerClicks();
    } catch (err) {
      console.warn('getPartnerClicks failed (check Firestore rules for the partnerClicks collection)', err);
      statsEmptyEl.hidden = false;
      return;
    }
    clicks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const totalViews = clicks.filter((c) => c.type === 'view').length;
    const totalPhoto = clicks.filter((c) => c.type === 'photo').length;
    const totalContact = clicks.filter((c) => c.type === 'contact').length;

    statsSummaryEl.innerHTML = [
      [t(currentLang, 'partnerStatsViewsLabel'), totalViews],
      [t(currentLang, 'partnerStatsPhotoLabel'), totalPhoto],
      [t(currentLang, 'partnerStatsContactLabel'), totalContact],
    ].map(([label, value]) => `
      <div class="partner-stat-tile">
        <span class="partner-stat-value">${value}</span>
        <span class="partner-stat-label">${escapeHtml(label)}</span>
      </div>
    `).join('');

    const partnerCounts = new Map();
    clicks.forEach((c) => {
      if (!c.partnerId || c.type === 'view') return;
      partnerCounts.set(c.partnerId, (partnerCounts.get(c.partnerId) || 0) + 1);
    });
    const topPartners = [...partnerCounts.entries()]
      .map(([id, count]) => ({ name: (partnersCache.find((p) => p.id === id) || {}).name || id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const maxCount = topPartners.length ? topPartners[0].count : 0;
    statsBarsEl.innerHTML = topPartners.map(({ name, count }) => `
      <div class="partner-stats-bar-row">
        <span class="partner-stats-bar-label">${escapeHtml(name)}</span>
        <div class="partner-stats-bar-track">
          <div class="partner-stats-bar-fill" style="width:${maxCount ? Math.max(6, (count / maxCount) * 100) : 0}%"></div>
        </div>
        <span class="partner-stats-bar-count">${count}</span>
      </div>
    `).join('');

    const weddingStats = new Map();
    clicks.forEach((c) => {
      if (!c.weddingId) return;
      const entry = weddingStats.get(c.weddingId) || { name: c.weddingName || c.weddingId, views: 0, clicks: 0, last: 0 };
      if (c.type === 'view') entry.views += 1;
      else entry.clicks += 1;
      entry.last = Math.max(entry.last, c.createdAt || 0);
      weddingStats.set(c.weddingId, entry);
    });
    const weddingRows = [...weddingStats.values()].sort((a, b) => b.last - a.last);
    statsByWeddingBodyEl.innerHTML = weddingRows.map((w) => `
      <tr>
        <td>${escapeHtml(w.name)}</td>
        <td>${w.views}</td>
        <td>${w.clicks}</td>
        <td>${formatDateTime(w.last)}</td>
      </tr>
    `).join('');

    statsRecentBodyEl.innerHTML = clicks.slice(0, 30).map((c) => `
      <tr>
        <td>${formatDateTime(c.createdAt)}</td>
        <td>${escapeHtml(c.weddingName || '')}</td>
        <td>${escapeHtml(describePartnerEvent(c))}</td>
      </tr>
    `).join('');

    statsEmptyEl.hidden = clicks.length > 0;
  }

  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit') {
      const partner = partnersCache.find((p) => p.id === id);
      if (partner) startEdit(partner);
    } else if (action === 'delete') {
      const partner = partnersCache.find((p) => p.id === id);
      if (partner && confirm(t(currentLang, 'confirmDeletePartner', partner.name))) {
        await Storage.deletePartner(id);
        if (editingPartnerId === id) resetForm();
        await renderPartnerList();
      }
    } else if (action === 'move-up' || action === 'move-down') {
      const idx = partnersCache.findIndex((p) => p.id === id);
      const swapIdx = action === 'move-up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= partnersCache.length) return;
      const a = partnersCache[idx];
      const b = partnersCache[swapIdx];
      await Storage.updatePartner(a.id, { order: b.order });
      await Storage.updatePartner(b.id, { order: a.order });
      await renderPartnerList();
    }
  });

  seedExamplesBtn.addEventListener('click', async () => {
    for (let i = 0; i < EXAMPLE_PARTNERS.length; i++) {
      await Storage.addPartner({ ...EXAMPLE_PARTNERS[i], order: i });
    }
    await renderPartnerList();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const contacts = getContactsFromForm();
    const partner = {
      name: nameInput.value.trim(),
      category: categorySelect.value,
      icon: selectedIcon,
      description: descriptionInput.value.trim(),
      contacts,
      photo: photoUrlInput.value.trim(),
      geo: {
        country: countrySelect.value,
        region: regionSelect.value,
        city: citySelect.value,
      },
    };
    const hasContact = Object.values(contacts).some(Boolean);
    if (!partner.name || !partner.geo.country || !hasContact) return;

    if (editingPartnerId) {
      partner.order = editingPartnerOrder ?? 0;
      await Storage.updatePartner(editingPartnerId, partner);
    } else {
      const maxOrder = partnersCache.reduce((max, p) => Math.max(max, typeof p.order === 'number' ? p.order : -1), -1);
      partner.order = maxOrder + 1;
      await Storage.addPartner(partner);
    }
    resetForm();
    await renderPartnerList();
  });

  function showLogin() {
    loginEl.hidden = false;
    contentEl.hidden = true;
  }

  async function showContent() {
    loginEl.hidden = true;
    contentEl.hidden = false;
    renderCategoryOptions();
    renderIconGrid();
    renderContactsFields();
    await loadCountryOptions('');
    resetGeoSelect(regionSelect, t(currentLang, 'partnerGeoAnyRegion'));
    resetGeoSelect(citySelect, t(currentLang, 'partnerGeoAnyCity'));
    await renderPartnerList();
    await renderPartnerStats();
  }

  loginGoogleBtn.addEventListener('click', async () => {
    loginErrorEl.hidden = true;
    // Redirects to Google immediately on success, so there is nothing to
    // chain after it here — the post-login flow resumes in init() once the
    // user is redirected back to this page.
    const result = await signInWithGoogle();
    if (!result.ok) {
      console.warn('Google sign-in failed', result.code);
      loginErrorEl.textContent = `${t(currentLang, 'adminLoginError')} (${result.code})`;
      loginErrorEl.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', async () => {
    await signOutUser();
    showLogin();
  });

  (async function init() {
    photoRemoveBtn.innerHTML = ICONS.trash;
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    applyTranslations(currentLang);
    updatePageTitle();
    const user = await waitForAuthUser();
    if (!user) {
      showLogin();
      return;
    }
    try {
      await showContent();
    } catch (err) {
      // Signing in with Google only proves it's *a* Google account — the
      // Firestore rules' email allow-list is what actually gates access, so
      // a successful sign-in can still be rejected at the data layer.
      await signOutUser();
      showLogin();
      loginErrorEl.textContent = t(currentLang, 'adminLoginUnauthorized');
      loginErrorEl.hidden = false;
    }
  })();
})();
