import { Storage } from './storage.js';
import { initErrorLogging } from './error-log.js';
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
  initErrorLogging({ page: 'partners-page', weddingId });

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('partners-content');
  const weddingNameEl = document.getElementById('wedding-admin-name');
  const backLinkEl = document.getElementById('back-to-admin-link');
  const partnersGridEl = document.getElementById('partners-grid');
  const partnersEmptyEl = document.getElementById('partners-empty');
  const photoLightbox = document.getElementById('photo-lightbox');
  const photoLightboxImg = document.getElementById('photo-lightbox-img');
  const photoLightboxClose = document.getElementById('photo-lightbox-close');
  let matchingPartners = [];
  let pageViewLogged = false;

  function logEvent(type, partner, contactType) {
    Storage.logPartnerEvent({
      weddingId,
      weddingName: wedding.name,
      partnerId: partner ? partner.id : null,
      partnerName: partner ? partner.name : null,
      type,
      contactType: contactType || null,
    });
  }

  function openPhotoLightbox(src) {
    photoLightboxImg.src = src;
    photoLightbox.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closePhotoLightbox() {
    photoLightbox.hidden = true;
    photoLightboxImg.src = '';
    document.body.classList.remove('modal-open');
  }

  partnersGridEl.addEventListener('click', (e) => {
    const photoBtn = e.target.closest('.partner-card-photo');
    if (photoBtn) {
      openPhotoLightbox(photoBtn.dataset.photo);
      const partner = matchingPartners.find((p) => p.id === photoBtn.dataset.partnerId);
      logEvent('photo', partner);
      return;
    }
    const contactLink = e.target.closest('.partner-card-contact');
    if (contactLink) {
      const partner = matchingPartners.find((p) => p.id === contactLink.dataset.partnerId);
      logEvent('contact', partner, contactLink.dataset.channel);
    }
  });
  photoLightboxClose.addEventListener('click', closePhotoLightbox);
  photoLightbox.addEventListener('click', (e) => {
    if (e.target === photoLightbox) closePhotoLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !photoLightbox.hidden) closePhotoLightbox();
  });

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
      const categoryColorClass = category && category.color ? ` cat-${category.color}` : '';
      const icon = PARTNER_ICONS.find((i) => i.key === partner.icon);
      const photo = partner.photo
        ? `<button type="button" class="partner-card-photo" data-photo="${escapeHtml(partner.photo)}" data-partner-id="${partner.id}"><img src="${escapeHtml(partner.photo)}" alt="" /></button>`
        : '';
      const contacts = partner.contacts || {};
      const contactButtons = CONTACT_CHANNELS
        .filter((channel) => contacts[channel.key])
        .map((channel) => {
          const href = buildContactHref(channel.key, contacts[channel.key]);
          const label = escapeHtml(t(currentLang, channel.labelKey));
          const isExternal = channel.key !== 'phone';
          return `<a class="icon-btn partner-card-contact" data-partner-id="${partner.id}" data-channel="${channel.key}" href="${escapeHtml(href)}" title="${label}" aria-label="${label}"${isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${channel.svg}</a>`;
        })
        .join('');
      return `
        <div class="partner-card">
          <span class="partner-card-category${categoryColorClass}">${icon ? icon.svg : ''}${escapeHtml(categoryLabel)}</span>
          <h3 class="partner-card-name">${escapeHtml(partner.name)}</h3>
          <div class="partner-card-media-row">
            ${photo}
            <p class="partner-card-desc">${escapeHtml(partner.description)}</p>
          </div>
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

  let wedding;
  try {
    wedding = await Storage.getWedding(weddingId);
  } catch (err) {
    console.error('getWedding failed', err);
    document.getElementById('connection-error').hidden = false;
    document.getElementById('connection-error-retry').addEventListener('click', () => location.reload());
    applyTranslations(currentLang);
    langMount.appendChild(buildLangSwitcher(currentLang, setLang));
    return;
  }
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
  document.title = 'TableMe · Partners';

  const allPartners = await Storage.getPartners();
  matchingPartners = allPartners
    .filter((partner) => matchesLocation(partner, wedding.location))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
  renderPartners();

  if (!pageViewLogged) {
    pageViewLogged = true;
    logEvent('view', null);
  }
})();
