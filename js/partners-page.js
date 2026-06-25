import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { isFeatureEnabled } from './features.js';
import { PARTNERS, PARTNER_CATEGORIES } from './partners.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const CATEGORY_ICONS = {
  transport: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M5 17a2 2 0 0 1-2-2v-2l2-5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 1l2 5v2a2 2 0 0 1-2 2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/></svg>',
  animation: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/><path d="M8 15c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5"/></svg>',
  decoration: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v6"/><path d="M12 9c-2 0-4 1.5-4 4s2 4 4 4 4-1.5 4-4-2-4-4-4z"/><path d="M9 21h6"/><path d="M12 17v4"/></svg>',
};

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

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    renderPartners();
  }

  function renderPartners() {
    partnersEmptyEl.hidden = PARTNERS.length > 0;
    partnersGridEl.innerHTML = PARTNERS.map((partner) => {
      const category = PARTNER_CATEGORIES[partner.category];
      const categoryLabel = category ? t(currentLang, category.labelKey) : '';
      const icon = CATEGORY_ICONS[partner.category] || '';
      return `
        <div class="partner-card">
          <span class="partner-card-category">${icon}${escapeHtml(categoryLabel)}</span>
          <h3 class="partner-card-name">${escapeHtml(partner.name)}</h3>
          <p class="partner-card-desc">${escapeHtml(partner.description)}</p>
          <a class="partner-card-link" href="${escapeHtml(partner.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t(currentLang, 'partnerLinkLabel'))} &rarr;</a>
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

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  renderPartners();
})();
