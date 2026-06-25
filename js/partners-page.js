import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { isFeatureEnabled } from './features.js';
import { PARTNER_CATEGORIES, PARTNER_ICONS, CONTACT_CHANNELS, buildContactHref, matchesLocation } from './partners.js';

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

  function renderPartners() {
    partnersEmptyEl.hidden = matchingPartners.length > 0;
    partnersGridEl.innerHTML = matchingPartners.map((partner) => {
      const category = PARTNER_CATEGORIES[partner.category];
      const categoryLabel = category ? t(currentLang, category.labelKey) : '';
      const icon = PARTNER_ICONS.find((i) => i.key === partner.icon);
      const photo = partner.photo
        ? `<div class="partner-card-photo"><img src="${escapeHtml(partner.photo)}" alt="" /></div>`
        : '';
      const contacts = partner.contacts || {};
      const contactButtons = CONTACT_CHANNELS
        .filter((channel) => contacts[channel.key])
        .map((channel) => {
          const href = buildContactHref(channel.key, contacts[channel.key]);
          const label = escapeHtml(t(currentLang, channel.labelKey));
          const isExternal = channel.key !== 'phone';
          return `<a class="icon-btn partner-card-contact" href="${escapeHtml(href)}" title="${label}" aria-label="${label}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${channel.svg}</a>`;
        })
        .join('');
      return `
        <div class="partner-card">
          ${photo}
          <span class="partner-card-category">${icon ? icon.svg : ''}${escapeHtml(categoryLabel)}</span>
          <h3 class="partner-card-name">${escapeHtml(partner.name)}</h3>
          <p class="partner-card-desc">${escapeHtml(partner.description)}</p>
          <div class="partner-card-actions">${contactButtons}</div>
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
