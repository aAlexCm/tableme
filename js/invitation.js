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

// The Text Settings panel lives here (not inside the phone-frame iframe —
// there's no room for a real side panel in a 320px mockup). invitation-page.js
// calls window.onInvitationWidgetSelected/Deselected on us when a widget is
// (de)selected; we call back into its exposed window functions to apply
// changes. Both pages are same-origin, so direct calls work fine.
function wireTextSettingsPanel(phoneScreenEl) {
  const panel = document.getElementById('invitation-text-settings');
  const fontSelect = document.getElementById('invitation-font-select');
  const sizeRange = document.getElementById('invitation-size-range');
  const sizeNumber = document.getElementById('invitation-size-number');
  const boldBtn = document.getElementById('invitation-bold-btn');
  const italicBtn = document.getElementById('invitation-italic-btn');
  const underlineBtn = document.getElementById('invitation-underline-btn');
  const colorInput = document.getElementById('invitation-color-input');
  const alignLeftBtn = document.getElementById('invitation-align-left-btn');
  const alignCenterBtn = document.getElementById('invitation-align-center-btn');
  const alignRightBtn = document.getElementById('invitation-align-right-btn');
  const deleteBtn = document.getElementById('invitation-delete-widget-btn');
  const closeBtn = document.getElementById('invitation-settings-close-btn');

  let currentWidget = null;

  function applyProps(props) {
    phoneScreenEl.contentWindow?.updateSelectedWidgetProps?.(props);
  }

  // Positions the panel like a popover next to the selected text instead of
  // a permanent sidebar — it must never push the phone frame layout around,
  // which is why the CSS makes it position:fixed (out of the flex flow).
  // `rect` is the widget's bounding box in the IFRAME's own viewport; adding
  // the iframe's own offset converts it to the parent page's coordinates.
  function positionPanel(rect) {
    if (!rect) return;
    const iframeRect = phoneScreenEl.getBoundingClientRect();
    const margin = 12;
    const panelWidth = panel.offsetWidth || 240;
    const panelHeight = panel.offsetHeight || 420;

    let left = iframeRect.left + rect.right + margin;
    if (left + panelWidth + margin > window.innerWidth) {
      left = iframeRect.left + rect.left - panelWidth - margin;
    }
    left = Math.min(Math.max(margin, left), window.innerWidth - panelWidth - margin);

    let top = iframeRect.top + rect.top;
    top = Math.min(Math.max(margin, top), window.innerHeight - panelHeight - margin);

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  window.onInvitationWidgetSelected = (widget, rect) => {
    currentWidget = widget;
    panel.hidden = false;
    fontSelect.value = widget.fontFamily;
    sizeRange.value = widget.fontSize;
    sizeNumber.value = widget.fontSize;
    colorInput.value = widget.color;
    boldBtn.classList.toggle('active', widget.bold);
    italicBtn.classList.toggle('active', widget.italic);
    underlineBtn.classList.toggle('active', widget.underline);
    alignLeftBtn.classList.toggle('active', widget.align === 'left');
    alignCenterBtn.classList.toggle('active', widget.align === 'center');
    alignRightBtn.classList.toggle('active', widget.align === 'right');
    if (window.innerWidth > 760) positionPanel(rect);
  };

  window.onInvitationWidgetDeselected = () => {
    currentWidget = null;
    panel.hidden = true;
  };

  fontSelect.addEventListener('change', () => applyProps({ fontFamily: fontSelect.value }));

  sizeRange.addEventListener('input', () => {
    sizeNumber.value = sizeRange.value;
    applyProps({ fontSize: Number(sizeRange.value) });
  });
  sizeNumber.addEventListener('input', () => {
    const value = Number(sizeNumber.value);
    if (value > 0) {
      sizeRange.value = value;
      applyProps({ fontSize: value });
    }
  });

  boldBtn.addEventListener('click', () => applyProps({ bold: !currentWidget?.bold }));
  italicBtn.addEventListener('click', () => applyProps({ italic: !currentWidget?.italic }));
  underlineBtn.addEventListener('click', () => applyProps({ underline: !currentWidget?.underline }));
  colorInput.addEventListener('input', () => applyProps({ color: colorInput.value }));

  alignLeftBtn.addEventListener('click', () => applyProps({ align: 'left' }));
  alignCenterBtn.addEventListener('click', () => applyProps({ align: 'center' }));
  alignRightBtn.addEventListener('click', () => applyProps({ align: 'right' }));

  deleteBtn.addEventListener('click', () => {
    phoneScreenEl.contentWindow?.deleteSelectedWidget?.();
  });

  closeBtn.addEventListener('click', () => {
    phoneScreenEl.contentWindow?.deselectInvitationWidget?.();
  });
}

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

  const basePath = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}`;
  const invitationUrl = `${basePath}invitation-page.html?id=${weddingId}`;
  // The iframe gets its own ?edit=1 flag so invitation-page.js knows to load
  // its drag/resize/contenteditable widget chrome — the public link above
  // must stay edit-chrome-free, since any guest who opens it could otherwise
  // rearrange or delete the couple's content.
  phoneScreenEl.src = `${basePath}invitation-page.html?id=${weddingId}&edit=1`;
  linkDisplayEl.href = invitationUrl;
  linkDisplayEl.textContent = invitationUrl;

  const addTextBtn = document.getElementById('invitation-add-text-btn');
  addTextBtn.addEventListener('click', () => {
    phoneScreenEl.contentWindow?.addTextWidget?.();
  });

  wireTextSettingsPanel(phoneScreenEl);

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
