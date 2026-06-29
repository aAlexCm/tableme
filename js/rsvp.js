import { Storage } from './storage.js';
import { applyTranslations, buildLangSwitcher, t, LANGS } from './i18n.js';
import { applyGuestTheme, applyGuestFonts, getDefaultTheme } from './guest-themes.js';
import { applyGuestDecoration } from './guest-decorations.js';

const LANG_KEY = 'tableme_lang';
// /rsvp/fr, /rsvp/en, /rsvp/ro override everything else — a link shared in
// a specific language must always open in that language, same rule as /guest.
const PATH_LANG_MATCH = location.pathname.match(/^\/rsvp\/(fr|en|ro)\/?$/);
const PATH_LANG = PATH_LANG_MATCH && LANGS.includes(PATH_LANG_MATCH[1]) ? PATH_LANG_MATCH[1] : null;

const ICONS = {
  check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
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
  const guestId = params.get('guest');

  const titleEl = document.getElementById('wedding-title');
  const noWeddingEl = document.getElementById('no-wedding');
  const rsvpSectionEl = document.getElementById('rsvp-section');
  const greetingEl = document.getElementById('rsvp-greeting');
  const choiceGroupEl = document.getElementById('rsvp-choice-group');
  const thanksEl = document.getElementById('rsvp-thanks');
  const langMount = document.getElementById('lang-switcher-mount');
  const decorationEl = document.getElementById('guest-decoration');

  document.getElementById('rsvp-icon-confirmed').innerHTML = ICONS.check;
  document.getElementById('rsvp-icon-declined').innerHTML = ICONS.cross;
  document.getElementById('rsvp-icon-pending').innerHTML = ICONS.clock;

  let currentLang = PATH_LANG || localStorage.getItem(LANG_KEY) || 'fr';
  let wedding = null;
  let guest = null;

  function renderWeddingTitle(name) {
    const parts = name.split(/\s+(?:&|et)\s+/i);
    if (parts.length === 2) {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(parts[0])}</span><span class="title-heart">&#9825;</span><span class="script-word">${escapeHtml(parts[1])}</span>`;
      document.title = `${parts[0]} ♥ ${parts[1]} · TableMe`;
    } else {
      titleEl.innerHTML = `<span class="script-word">${escapeHtml(name)}</span>`;
      document.title = `${name} · TableMe`;
    }
  }

  function renderRsvpState() {
    const rsvp = guest.rsvp || 'pending';
    choiceGroupEl.querySelectorAll('.rsvp-choice-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.rsvp === rsvp);
    });
  }

  function showFallbackTitle() {
    titleEl.textContent = t(currentLang, 'rsvpHeroTitle');
    document.title = 'TableMe · RSVP';
  }

  function showInvalidLink() {
    showFallbackTitle();
    noWeddingEl.hidden = false;
    rsvpSectionEl.hidden = true;
  }

  function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    if (wedding) renderWeddingTitle(wedding.name);
    else showFallbackTitle();
    if (guest) {
      greetingEl.textContent = t(currentLang, 'rsvpGreeting', guest.name);
    }
  }

  if (!weddingId || !guestId) {
    langMount.appendChild(buildLangSwitcher(currentLang, applyLang));
    applyTranslations(currentLang);
    showInvalidLink();
    return;
  }

  try {
    wedding = await Storage.getWedding(weddingId);
  } catch (err) {
    console.error('getWedding failed', err);
    langMount.appendChild(buildLangSwitcher(currentLang, applyLang));
    applyTranslations(currentLang);
    showFallbackTitle();
    const connectionErrorEl = document.getElementById('connection-error');
    connectionErrorEl.hidden = false;
    document.getElementById('connection-error-retry').addEventListener('click', () => location.reload());
    return;
  }

  guest = wedding && wedding.guests.find((g) => g.id === guestId && !g.empty);
  if (!wedding || !guest) {
    langMount.appendChild(buildLangSwitcher(currentLang, applyLang));
    applyTranslations(currentLang);
    showInvalidLink();
    return;
  }

  if (!PATH_LANG && !localStorage.getItem(LANG_KEY)) {
    currentLang = wedding.lang || 'fr';
  }
  applyGuestTheme((wedding.theme && wedding.theme.colors) || getDefaultTheme().colors);
  applyGuestFonts((wedding.theme && wedding.theme.fonts) || getDefaultTheme().fonts);
  applyGuestDecoration((wedding.theme && wedding.theme.decoration) || getDefaultTheme().decoration, decorationEl);
  langMount.appendChild(buildLangSwitcher(currentLang, applyLang));
  applyTranslations(currentLang);

  renderWeddingTitle(wedding.name);
  greetingEl.textContent = t(currentLang, 'rsvpGreeting', guest.name);
  renderRsvpState();
  rsvpSectionEl.hidden = false;

  choiceGroupEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.rsvp-choice-btn');
    if (!btn) return;
    const rsvp = btn.dataset.rsvp;
    if (rsvp === (guest.rsvp || 'pending')) return;
    try {
      await Storage.mutateGuests(weddingId, (guests) => guests.map((g) => (g.id === guest.id ? { ...g, rsvp } : g)));
    } catch (err) {
      console.error('mutateGuests failed', err);
      alert(t(currentLang, 'saveErrorRetry'));
      return;
    }
    guest = { ...guest, rsvp };
    renderRsvpState();
    thanksEl.textContent = t(currentLang, `rsvpThanks${rsvp[0].toUpperCase()}${rsvp.slice(1)}`);
    thanksEl.hidden = false;
  });
})();
