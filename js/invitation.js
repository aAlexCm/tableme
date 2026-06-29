import { Storage } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher } from './i18n.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
};

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');
  initErrorLogging({ page: 'invitation', weddingId });

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const connectionErrorEl = document.getElementById('connection-error');
  const contentEl = document.getElementById('invitation-content');
  const weddingNameEl = document.getElementById('invitation-wedding-name');
  const backLinkEl = document.getElementById('invitation-back-link');
  const phoneScreenEl = document.getElementById('invitation-phone-screen');
  const linkDisplayEl = document.getElementById('invitation-link-display');
  const copyLinkBtn = document.getElementById('invitation-copy-link-btn');
  const shareLinkBtn = document.getElementById('invitation-share-link-btn');

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
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
    connectionErrorEl.hidden = false;
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

  if (!isFeatureEnabled(wedding, 'digitalInvitation')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Digital invitation';

  const invitationUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}invitation-page.html?id=${weddingId}`;
  phoneScreenEl.src = invitationUrl;
  linkDisplayEl.href = invitationUrl;
  linkDisplayEl.textContent = invitationUrl;

  copyLinkBtn.innerHTML = ICONS.copy;
  copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText(invitationUrl).catch(() => {});
    copyLinkBtn.innerHTML = ICONS.check;
    setTimeout(() => (copyLinkBtn.innerHTML = ICONS.copy), 1200);
  });

  shareLinkBtn.innerHTML = ICONS.share;
  shareLinkBtn.hidden = !navigator.share;
  shareLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.share({ title: wedding.name, url: invitationUrl });
    } catch {
      // user cancelled the share sheet
    }
  });

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
})();
