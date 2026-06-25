import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { isFeatureEnabled } from './features.js';
import { PARTNER_CATEGORIES, PARTNER_ICONS, matchesLocation } from './partners.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('partners-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const backLinkEl = document.getElementById('back-to-admin-link');
  const partnersGridEl = document.getElementById('partners-grid');
  const partnersEmptyEl = document.getElementById('partners-empty');
  let matchingPartners = [];

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    renderPartners();
  }

  const PHONE_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';

  function renderPartners() {
    partnersEmptyEl.hidden = matchingPartners.length > 0;
    partnersGridEl.innerHTML = matchingPartners.map((partner) => {
      const category = PARTNER_CATEGORIES[partner.category];
      const categoryLabel = category ? t(currentLang, category.labelKey) : '';
      const icon = PARTNER_ICONS.find((i) => i.key === partner.icon);
      const photo = partner.photo
        ? `<div class="partner-card-photo"><img src="${escapeHtml(partner.photo)}" alt="" /></div>`
        : '';
      const websiteLink = partner.website
        ? `<a class="partner-card-link" href="${escapeHtml(partner.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t(currentLang, 'partnerLinkLabel'))} &rarr;</a>`
        : '';
      const phoneLink = partner.phone
        ? `<a class="partner-card-link" href="tel:${escapeHtml(partner.phone)}">${PHONE_ICON} ${escapeHtml(partner.phone)}</a>`
        : '';
      return `
        <div class="partner-card">
          ${photo}
          <span class="partner-card-category">${icon ? icon.svg : ''}${escapeHtml(categoryLabel)}</span>
          <h3 class="partner-card-name">${escapeHtml(partner.name)}</h3>
          <p class="partner-card-desc">${escapeHtml(partner.description)}</p>
          <div class="partner-card-actions">${websiteLink}${phoneLink}</div>
        </div>
      `;
    }).join('');
  }

  if (!weddingId) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  const wedding = await Storage.getWedding(weddingId);
  if (!wedding) {
    notFoundEl.hidden = false;
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }

  if (!isFeatureEnabled(wedding, 'sponsorPartners')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  if (!localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = `TableMe · ${t(currentLang, 'partnersPageTitle')}`;

  const allPartners = await Storage.getPartners();
  matchingPartners = allPartners.filter((partner) => matchesLocation(partner, wedding.location));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  renderPartners();
})();
