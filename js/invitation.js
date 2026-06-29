import { Storage } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher } from './i18n.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

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
  phoneScreenEl.src = `invitation-page.html?id=${weddingId}`;

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
})();
