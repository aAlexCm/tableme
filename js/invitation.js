import { Storage } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
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

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
  }

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);

  if (!weddingId) {
    notFoundEl.hidden = false;
    return;
  }

  let wedding;
  try {
    wedding = await Storage.getWedding(weddingId);
  } catch (err) {
    console.error('getWedding failed', err);
    connectionErrorEl.hidden = false;
    document.getElementById('connection-error-retry').addEventListener('click', () => location.reload());
    return;
  }
  if (!wedding) {
    notFoundEl.hidden = false;
    return;
  }

  if (!isFeatureEnabled(wedding, 'digitalInvitation')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = `TableMe · ${t(currentLang, 'invitationToolTitle')}`;
})();
