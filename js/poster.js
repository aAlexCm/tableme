import { Storage, generateId } from './storage.js';
import { initErrorLogging } from './error-log.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { wireColorHexPair } from './color-hex.js';
import { isFeatureEnabled } from './features.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

// A4-proportioned (1:1.41421) reference canvas, kept compact on screen —
// html2canvas/jsPDF stretch the rasterized sheet to fill the true A4 page
// size regardless of this pixel size, so shrinking it doesn't affect print
// or PDF fidelity, only how big the editor looks on screen.
const SHEET_WIDTH = 396;
const SHEET_HEIGHT = 560;
const SNAP_THRESHOLD = 6;

const FONT_OPTIONS = [
  { key: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", group: 'heading' },
  { key: 'parisienne', label: 'Parisienne', family: "'Parisienne', cursive", group: 'heading' },
  { key: 'monsieurladoulaise', label: 'Monsieur La Doulaise', family: "'Monsieur La Doulaise', cursive", group: 'heading' },
  { key: 'pinyonscript', label: 'Pinyon Script', family: "'Pinyon Script', cursive", group: 'heading' },
  { key: 'luxuriousscript', label: 'Luxurious Script', family: "'Luxurious Script', cursive", group: 'heading' },
  { key: 'raleway', label: 'Raleway', family: "'Raleway', sans-serif", group: 'paragraph' },
  { key: 'montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", group: 'paragraph' },
  { key: 'jost', label: 'Jost', family: "'Jost', sans-serif", group: 'paragraph' },
  { key: 'nunito', label: 'Nunito', family: "'Nunito', sans-serif", group: 'paragraph' },
];

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const DRAG_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>';
const ROTATE_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5a8 8 0 0 1 11 2"/><polyline points="17 3 18 8 13 7"/><path d="M18 19a8 8 0 0 1-11-2"/><polyline points="7 21 6 16 11 17"/></svg>';

const QR_RENDER_SIZE = 256;
const MAX_IMAGE_DIMENSION = 640;

const QR_BODY_PRESETS = [
  { key: 'square', i18nKey: 'qrBodySquare', type: 'square' },
  { key: 'dots', i18nKey: 'qrBodyDots', type: 'dots' },
  { key: 'rounded', i18nKey: 'qrBodyRounded', type: 'rounded' },
];

const QR_CORNER_PRESETS = [
  { key: 'square', i18nKey: 'qrCornerSquare', squareType: 'square', dotType: 'square' },
  { key: 'rounded', i18nKey: 'qrCornerRounded', squareType: 'extra-rounded', dotType: 'square' },
  { key: 'circle', i18nKey: 'qrCornerCircle', squareType: 'dot', dotType: 'dot' },
];

// SVG, not the ♥ character: a color-emoji glyph is drawn from the system's
// own baked-in bitmap/font data, which CSS color can't touch — and Apple's
// emoji font is known to render hearts in color regardless of the U+FE0E
// text-presentation selector that works fine for the other dingbats below.
// An actual vector path sidesteps the whole class of font-substitution
// quirks. Shared between the divider's "heart" ornament and the icon tool's
// heart preset below.
const HEART_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

const DIVIDER_PRESETS = [
  { key: 'plain', i18nKey: 'dividerPresetPlain', ornament: '' },
  { key: 'heart', i18nKey: 'dividerPresetHeart', ornament: '♥︎', svg: HEART_SVG },
  { key: 'diamond', i18nKey: 'dividerPresetDiamond', ornament: '◆︎' },
  { key: 'dot', i18nKey: 'dividerPresetDot', ornament: '•' },
  { key: 'flourish', i18nKey: 'dividerPresetFlourish', ornament: '❦︎' },
];

// U+FE0E (text presentation selector) forces the plain, monochrome glyph on
// every platform. Without it, some of these render as a colorful emoji on
// mobile — ignoring the CSS color entirely — even though the same character
// shows as a plain recolorable symbol on desktop.
const ICON_PRESETS = [
  // The heart specifically still rendered as a colorful, uncolorable emoji
  // on at least one real mobile browser even with the U+FE0E text-
  // presentation selector below (Apple's emoji font is known to override
  // VS15 for heart glyphs in particular) — an actual SVG path sidesteps
  // the whole class of platform font-substitution quirks for good.
  { key: 'heart', i18nKey: 'iconPresetHeart', symbol: '♥︎', svg: HEART_SVG },
  { key: 'rings', i18nKey: 'iconPresetRings', symbol: '⚭︎' },
  { key: 'flower', i18nKey: 'iconPresetFlower', symbol: '❀︎' },
  { key: 'star', i18nKey: 'iconPresetStar', symbol: '✦︎' },
  { key: 'floral', i18nKey: 'iconPresetFloral', symbol: '❦︎' },
  { key: 'fleur', i18nKey: 'iconPresetFleur', symbol: '⚜︎' },
];

function getDefaultPoster() {
  return { elements: [], background: '#ffffff' };
}

function normalizeElement(el) {
  const type = ['qr', 'divider', 'icon', 'image'].includes(el.type) ? el.type : 'text';
  const base = {
    id: el.id || generateId(),
    type,
    x: typeof el.x === 'number' ? el.x : 80,
    y: typeof el.y === 'number' ? el.y : 80,
    rotation: typeof el.rotation === 'number' ? el.rotation : 0,
  };
  if (type === 'qr') {
    return {
      ...base,
      size: typeof el.size === 'number' ? el.size : 140,
      color: el.color || '#2c2420',
      bodyShape: QR_BODY_PRESETS.some((p) => p.key === el.bodyShape) ? el.bodyShape : QR_BODY_PRESETS[0].key,
      cornerShape: QR_CORNER_PRESETS.some((p) => p.key === el.cornerShape) ? el.cornerShape : QR_CORNER_PRESETS[0].key,
    };
  }
  if (type === 'divider') {
    return {
      ...base,
      width: typeof el.width === 'number' ? el.width : 200,
      thickness: typeof el.thickness === 'number' ? el.thickness : 1,
      ornamentSize: typeof el.ornamentSize === 'number' ? el.ornamentSize : 16,
      color: el.color || '#2c2420',
      style: DIVIDER_PRESETS.some((p) => p.key === el.style) ? el.style : DIVIDER_PRESETS[0].key,
    };
  }
  if (type === 'icon') {
    return {
      ...base,
      size: typeof el.size === 'number' ? el.size : 48,
      color: el.color || '#2c2420',
      symbol: ICON_PRESETS.some((p) => p.key === el.symbol) ? el.symbol : ICON_PRESETS[0].key,
    };
  }
  if (type === 'image') {
    return {
      ...base,
      src: typeof el.src === 'string' ? el.src : '',
      width: typeof el.width === 'number' ? el.width : 160,
      aspectRatio: typeof el.aspectRatio === 'number' && el.aspectRatio > 0 ? el.aspectRatio : 1,
    };
  }
  return {
    ...base,
    text: typeof el.text === 'string' ? el.text : '',
    fontKey: FONT_OPTIONS.some((f) => f.key === el.fontKey) ? el.fontKey : FONT_OPTIONS[0].key,
    fontSize: typeof el.fontSize === 'number' ? el.fontSize : 28,
    // No default on purpose: undefined means "shrink-wrap the text", same as
    // before this field existed. Only set once the couple drags
    // poster-text-width-handle, which is also what makes the align buttons
    // visibly do anything.
    width: typeof el.width === 'number' ? el.width : undefined,
    bold: !!el.bold,
    italic: !!el.italic,
    align: ['left', 'center', 'right'].includes(el.align) ? el.align : 'left',
    color: el.color || '#2c2420',
  };
}

function normalizePoster(poster) {
  if (!poster) return getDefaultPoster();
  return {
    elements: Array.isArray(poster.elements) ? poster.elements.map(normalizeElement) : [],
    background: typeof poster.background === 'string' ? poster.background : '#ffffff',
  };
}

function fontFamilyFor(fontKey) {
  const opt = FONT_OPTIONS.find((f) => f.key === fontKey);
  return opt ? opt.family : "'Inter', sans-serif";
}

(async function () {
  const params = new URLSearchParams(window.location.search);
  const weddingId = params.get('id');
  initErrorLogging({ page: 'poster', weddingId });

  let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

  const langMount = document.getElementById('lang-switcher-mount');
  const notFoundEl = document.getElementById('not-found');
  const contentEl = document.getElementById('poster-content');
  const weddingNameEl = document.getElementById('poster-wedding-name');
  const backLinkEl = document.getElementById('poster-back-link');
  const workspaceEl = document.querySelector('.poster-workspace');
  const toolboxEl = document.querySelector('.poster-toolbox');
  const sheetEl = document.getElementById('poster-sheet');
  const sheetContentEl = document.getElementById('poster-sheet-content');
  const bgSwatchFillEl = document.getElementById('poster-bg-swatch-fill');

  const guideV = document.createElement('div');
  guideV.className = 'poster-guide poster-guide-v';
  guideV.style.left = `${SHEET_WIDTH / 2}px`;
  guideV.hidden = true;
  const guideH = document.createElement('div');
  guideH.className = 'poster-guide poster-guide-h';
  guideH.style.top = `${SHEET_HEIGHT / 2}px`;
  guideH.hidden = true;
  sheetContentEl.appendChild(guideV);
  sheetContentEl.appendChild(guideH);
  const addTextBtn = document.getElementById('poster-add-text-btn');
  const addQrBtn = document.getElementById('poster-add-qr-btn');
  const addDividerBtn = document.getElementById('poster-add-divider-btn');
  const addIconBtn = document.getElementById('poster-add-icon-btn');
  const addImageBtn = document.getElementById('poster-add-image-btn');
  const downloadBtn = document.getElementById('poster-download-btn');

  const imageMenuEl = document.getElementById('poster-image-menu');
  const imageUploadBtn = document.getElementById('poster-image-upload-btn');
  const imagePasteBtn = document.getElementById('poster-image-paste-btn');
  const imageUrlInput = document.getElementById('poster-image-url-input');
  const imageUrlBtn = document.getElementById('poster-image-url-btn');
  const imageFileInput = document.getElementById('poster-image-file-input');

  const toolbarEl = document.getElementById('poster-text-toolbar');
  const boldBtn = document.getElementById('poster-bold-btn');
  const italicBtn = document.getElementById('poster-italic-btn');
  const alignLeftBtn = document.getElementById('poster-align-left-btn');
  const alignCenterBtn = document.getElementById('poster-align-center-btn');
  const alignRightBtn = document.getElementById('poster-align-right-btn');
  const fontSelect = document.getElementById('poster-font-select');
  const dividerStyleSelect = document.getElementById('poster-divider-style-select');
  const iconSymbolSelect = document.getElementById('poster-icon-symbol-select');
  const qrBodySelect = document.getElementById('poster-qr-body-select');
  const qrCornerSelect = document.getElementById('poster-qr-corner-select');
  const sizeInput = document.getElementById('poster-size-input');
  const dividerThicknessInput = document.getElementById('poster-divider-thickness-input');
  const dividerOrnamentSizeInput = document.getElementById('poster-divider-ornament-size-input');
  const colorInput = document.getElementById('poster-color-input');
  const hexInput = document.getElementById('poster-hex-input');
  const duplicateBtn = document.getElementById('poster-duplicate-btn');
  const deleteBtn = document.getElementById('poster-delete-text-btn');
  const bgColorInput = document.getElementById('poster-bg-color-input');
  const bgHexInput = document.getElementById('poster-bg-hex-input');
  wireColorHexPair(colorInput, hexInput);
  wireColorHexPair(bgColorInput, bgHexInput);

  let poster = getDefaultPoster();
  let selectedId = null;
  let saveTimer = null;
  let guestUrl = '';
  // Remembers the most recently used text style so the next "Add text"
  // click starts from it instead of fixed defaults — duplicating an
  // existing widget remains the way to copy its text/position too.
  let lastTextStyle = {
    fontKey: FONT_OPTIONS[0].key,
    fontSize: 28,
    bold: false,
    italic: false,
    align: 'left',
    color: '#2c2420',
  };

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Storage.setPoster(weddingId, poster).catch((err) => {
        console.error('setPoster failed', err);
        alert(t(currentLang, 'saveErrorRetry'));
      });
    }, 500);
  }

  function applySheetSize() {
    sheetEl.style.width = `${SHEET_WIDTH}px`;
    sheetEl.style.height = `${SHEET_HEIGHT}px`;
  }

  function applyBackground() {
    sheetEl.style.background = poster.background;
    if (bgSwatchFillEl) bgSwatchFillEl.setAttribute('fill', poster.background);
  }

  // The bg-color field's rendered height varies with font/label length, so
  // rather than guessing a fixed margin we measure where the sheet actually
  // ends up and align the toolbox to match, once layout has settled.
  function syncToolboxAlignment() {
    if (!toolboxEl || !workspaceEl) return;
    if (!window.matchMedia('(min-width: 761px)').matches) {
      toolboxEl.style.marginTop = '';
      return;
    }
    const sheetTop = sheetEl.getBoundingClientRect().top;
    const workspaceTop = workspaceEl.getBoundingClientRect().top;
    toolboxEl.style.marginTop = `${Math.max(0, sheetTop - workspaceTop)}px`;
  }

  function applyRotation(node, el) {
    node.style.transform = `rotate(${el.rotation || 0}deg)`;
  }

  function applyTextStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    // Left unset (auto width, shrink-to-fit the text) until the couple drags
    // poster-text-width-handle — only once the box is wider than its content
    // does the align-left/center/right choice have any visible effect.
    node.style.width = el.width ? `${el.width}px` : '';
    applyRotation(node, el);
    const content = node.querySelector('.poster-text-content');
    if (!content) return;
    // body.admin-theme * matches .poster-text-content directly (it's a `*`
    // rule) and wins over a value merely inherited from the outer node, even
    // an !important one — so font-family must be set on this element itself,
    // also with !important, to actually beat that blanket rule.
    content.style.setProperty('font-family', fontFamilyFor(el.fontKey), 'important');
    content.style.fontSize = `${el.fontSize}px`;
    content.style.textAlign = el.align;
    content.style.color = el.color;
  }

  function renderQrCanvas(node, el) {
    const wrap = node.querySelector('.poster-qr-canvas');
    if (!wrap) return;
    wrap.innerHTML = '';
    const bodyPreset = QR_BODY_PRESETS.find((p) => p.key === el.bodyShape) || QR_BODY_PRESETS[0];
    const cornerPreset = QR_CORNER_PRESETS.find((p) => p.key === el.cornerShape) || QR_CORNER_PRESETS[0];
    new window.QRCodeStyling({
      width: QR_RENDER_SIZE,
      height: QR_RENDER_SIZE,
      data: guestUrl,
      margin: 0,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { color: el.color, type: bodyPreset.type },
      cornersSquareOptions: { color: el.color, type: cornerPreset.squareType },
      cornersDotOptions: { color: el.color, type: cornerPreset.dotType },
      backgroundOptions: { color: 'transparent' },
    }).append(wrap);
  }

  function applyQrStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    applyRotation(node, el);
    node.style.width = `${el.size}px`;
    node.style.height = `${el.size}px`;
    renderQrCanvas(node, el);
  }

  function applyDividerStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    applyRotation(node, el);
    node.style.width = `${el.width}px`;
    node.style.color = el.color;
    node.querySelectorAll('.poster-divider-line').forEach((line) => {
      line.style.height = `${el.thickness}px`;
    });
    const ornamentEl = node.querySelector('.poster-divider-ornament');
    if (ornamentEl) {
      const preset = DIVIDER_PRESETS.find((p) => p.key === el.style) || DIVIDER_PRESETS[0];
      ornamentEl.hidden = !preset.ornament;
      if (preset.svg) {
        ornamentEl.innerHTML = preset.svg;
        ornamentEl.style.fontSize = '';
        const svg = ornamentEl.querySelector('svg');
        if (svg) {
          svg.style.width = `${el.ornamentSize}px`;
          svg.style.height = `${el.ornamentSize}px`;
        }
      } else {
        ornamentEl.textContent = preset.ornament;
        ornamentEl.style.fontSize = `${el.ornamentSize}px`;
      }
    }
  }

  function applyIconStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    applyRotation(node, el);
    node.style.width = `${el.size}px`;
    node.style.height = `${el.size}px`;
    node.style.color = el.color;
    const glyph = node.querySelector('.poster-icon-glyph');
    if (glyph) {
      const preset = ICON_PRESETS.find((p) => p.key === el.symbol) || ICON_PRESETS[0];
      if (preset.svg) {
        glyph.innerHTML = preset.svg;
      } else {
        glyph.textContent = preset.symbol;
        glyph.style.fontSize = `${Math.round(el.size * 0.8)}px`;
      }
    }
  }

  function applyImageStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    applyRotation(node, el);
    node.style.width = `${el.width}px`;
    node.style.height = `${el.width / (el.aspectRatio || 1)}px`;
    const img = node.querySelector('.poster-image-img');
    if (img && img.getAttribute('src') !== el.src) img.src = el.src;
  }

  function applyElementStyle(node, el) {
    if (el.type === 'qr') applyQrStyle(node, el);
    else if (el.type === 'divider') applyDividerStyle(node, el);
    else if (el.type === 'icon') applyIconStyle(node, el);
    else if (el.type === 'image') applyImageStyle(node, el);
    else applyTextStyle(node, el);
  }

  function positionToolbar(node) {
    const rect = node.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - toolbarEl.offsetWidth - 8);
    toolbarEl.style.left = `${Math.min(maxLeft, Math.max(8, rect.left))}px`;
    toolbarEl.style.top = `${Math.max(8, rect.top - toolbarEl.offsetHeight - 10)}px`;
  }

  function deselect() {
    selectedId = null;
    sheetContentEl.querySelectorAll('.poster-el').forEach((n) => n.classList.remove('selected'));
    toolbarEl.hidden = true;
  }

  function selectElement(id) {
    selectedId = id;
    const el = poster.elements.find((e) => e.id === id);
    if (!el) {
      deselect();
      return;
    }
    sheetContentEl.querySelectorAll('.poster-el').forEach((n) => {
      n.classList.toggle('selected', n.dataset.id === id);
    });

    const isText = el.type === 'text';
    const isDivider = el.type === 'divider';
    const isIcon = el.type === 'icon';
    const isQr = el.type === 'qr';
    const isImage = el.type === 'image';

    boldBtn.hidden = !isText;
    italicBtn.hidden = !isText;
    alignLeftBtn.hidden = !isText;
    alignCenterBtn.hidden = !isText;
    alignRightBtn.hidden = !isText;
    fontSelect.hidden = !isText;
    dividerStyleSelect.hidden = !isDivider;
    iconSymbolSelect.hidden = !isIcon;
    qrBodySelect.hidden = !isQr;
    qrCornerSelect.hidden = !isQr;
    dividerThicknessInput.hidden = !isDivider;
    dividerOrnamentSizeInput.hidden = !isDivider;
    // Images keep their own colors — no tint control for them.
    colorInput.hidden = isImage;
    hexInput.hidden = isImage;
    if (!isImage) {
      colorInput.value = el.color;
      hexInput.value = el.color.toUpperCase();
    }

    dividerThicknessInput.title = t(currentLang, 'posterThicknessTooltip');
    dividerOrnamentSizeInput.title = t(currentLang, 'posterOrnamentSizeTooltip');

    if (isText) {
      boldBtn.classList.toggle('active', document.queryCommandState('bold'));
      italicBtn.classList.toggle('active', document.queryCommandState('italic'));
      alignLeftBtn.classList.toggle('active', el.align === 'left');
      alignCenterBtn.classList.toggle('active', el.align === 'center');
      alignRightBtn.classList.toggle('active', el.align === 'right');
      fontSelect.value = el.fontKey;
      sizeInput.title = t(currentLang, 'posterFontSizeTooltip');
      sizeInput.min = '8';
      sizeInput.max = '200';
      sizeInput.value = el.fontSize;
    } else if (isDivider) {
      dividerStyleSelect.value = el.style;
      sizeInput.title = t(currentLang, 'posterWidthTooltip');
      sizeInput.min = '60';
      sizeInput.max = '320';
      sizeInput.value = el.width;
      dividerThicknessInput.value = el.thickness;
      dividerOrnamentSizeInput.value = el.ornamentSize;
    } else if (isIcon) {
      iconSymbolSelect.value = el.symbol;
      sizeInput.title = t(currentLang, 'posterSizeTooltip');
      sizeInput.min = '20';
      sizeInput.max = '200';
      sizeInput.value = el.size;
    } else if (isQr) {
      qrBodySelect.value = el.bodyShape;
      qrCornerSelect.value = el.cornerShape;
      sizeInput.title = t(currentLang, 'posterSizeTooltip');
      sizeInput.min = '60';
      sizeInput.max = '320';
      sizeInput.value = el.size;
    } else if (isImage) {
      sizeInput.title = t(currentLang, 'posterWidthTooltip');
      sizeInput.min = '40';
      sizeInput.max = '500';
      sizeInput.value = el.width;
    } else {
      sizeInput.title = t(currentLang, 'posterSizeTooltip');
      sizeInput.min = '60';
      sizeInput.max = '320';
      sizeInput.value = el.size;
    }
    toolbarEl.hidden = false;
    const node = sheetContentEl.querySelector(`[data-id="${id}"]`);
    if (node) positionToolbar(node);
  }

  function updateSelected(mutator) {
    const el = poster.elements.find((e) => e.id === selectedId);
    if (!el) return;
    mutator(el);
    const node = sheetContentEl.querySelector(`[data-id="${selectedId}"]`);
    if (node) applyElementStyle(node, el);
    if (el.type === 'text') {
      boldBtn.classList.toggle('active', document.queryCommandState('bold'));
      italicBtn.classList.toggle('active', document.queryCommandState('italic'));
      alignLeftBtn.classList.toggle('active', el.align === 'left');
      alignCenterBtn.classList.toggle('active', el.align === 'center');
      alignRightBtn.classList.toggle('active', el.align === 'right');
      lastTextStyle = {
        fontKey: el.fontKey,
        fontSize: el.fontSize,
        align: el.align,
        color: el.color,
      };
    }
    scheduleSave();
  }

  // Pointer Events (not mouse events) so dragging/resizing/rotating works
  // with touch input too — plain mousemove/mouseup never fire during a
  // touch-drag on mobile, only the initial tap-equivalent mousedown does.
  function wirePointerDrag(handle, onStart) {
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pointerId = e.pointerId;
      const { onMove, onEnd } = onStart(e);

      function cleanup() {
        try {
          handle.releasePointerCapture(pointerId);
        } catch (_) {
          // pointer capture may already be lost (e.g. after a cancel) — ignore
        }
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);
      }
      function onPointerMove(ev) {
        if (ev.pointerId !== pointerId) return;
        onMove(ev);
      }
      function onPointerUp(ev) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        onEnd();
      }
      function onPointerCancel(ev) {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        onEnd();
      }

      try {
        handle.setPointerCapture(pointerId);
      } catch (_) {
        // best-effort only — move/up/cancel are tracked via document below
        // regardless, so a flaky capture implementation can't strand the drag
      }
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerCancel);
    });
  }

  function wireDrag(handle, node, el) {
    wirePointerDrag(handle, (e) => {
      selectElement(el.id);
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = el.x;
      const startTop = el.y;

      return {
        onMove(ev) {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let nextX = Math.max(0, startLeft + dx);
          let nextY = Math.max(0, startTop + dy);

          const width = node.offsetWidth;
          const height = node.offsetHeight;
          const centerX = nextX + width / 2;
          const centerY = nextY + height / 2;
          const snapV = Math.abs(centerX - SHEET_WIDTH / 2) < SNAP_THRESHOLD;
          const snapH = Math.abs(centerY - SHEET_HEIGHT / 2) < SNAP_THRESHOLD;
          if (snapV) nextX = SHEET_WIDTH / 2 - width / 2;
          if (snapH) nextY = SHEET_HEIGHT / 2 - height / 2;
          guideV.hidden = !snapV;
          guideH.hidden = !snapH;

          el.x = nextX;
          el.y = nextY;
          node.style.left = `${el.x}px`;
          node.style.top = `${el.y}px`;
          positionToolbar(node);
        },
        onEnd() {
          guideV.hidden = true;
          guideH.hidden = true;
          scheduleSave();
        },
      };
    });
  }

  // Generic corner/edge resize: `get`/`set` read and write the element's
  // size-like property, `onChange` re-applies the visual consequence (qr and
  // icon resize a square box, divider resizes a line's width, text resizes
  // its font size) without needing a full applyElementStyle() pass per move.
  function wireResize(handle, node, el, { get, set, min, max, onChange, syncSizeInput = true }) {
    wirePointerDrag(handle, (e) => {
      selectElement(el.id);
      const startX = e.clientX;
      const startValue = get(el);

      return {
        onMove(ev) {
          const dx = ev.clientX - startX;
          const value = Math.min(max, Math.max(min, startValue + dx));
          set(el, value);
          onChange(node, el);
          positionToolbar(node);
          if (syncSizeInput && selectedId === el.id) sizeInput.value = value;
        },
        onEnd() {
          scheduleSave();
        },
      };
    });
  }

  function wireRotate(handle, node, el) {
    wirePointerDrag(handle, (e) => {
      selectElement(el.id);
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      const startRotation = el.rotation || 0;

      return {
        onMove(ev) {
          const angle = Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * (180 / Math.PI);
          el.rotation = Math.round(startRotation + (angle - startAngle));
          node.style.transform = `rotate(${el.rotation}deg)`;
          positionToolbar(node);
        },
        onEnd() {
          scheduleSave();
        },
      };
    });
  }

  function createQrNode(el) {
    const node = document.createElement('div');
    node.className = 'poster-el poster-qr-el';
    node.dataset.id = el.id;

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'poster-qr-canvas';
    node.appendChild(canvasWrap);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-resize-handle';
    node.appendChild(resizeHandle);

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'poster-rotate-handle';
    rotateHandle.innerHTML = ROTATE_ICON;
    node.appendChild(rotateHandle);

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
    wireRotate(rotateHandle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.size,
      set: (e, v) => { e.size = v; },
      min: 60,
      max: 320,
      onChange: (n, e) => {
        n.style.width = `${e.size}px`;
        n.style.height = `${e.size}px`;
      },
    });
    applyQrStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createDividerNode(el) {
    const node = document.createElement('div');
    node.className = 'poster-el poster-divider-el';
    node.dataset.id = el.id;

    const lineBefore = document.createElement('span');
    lineBefore.className = 'poster-divider-line';
    const ornament = document.createElement('span');
    ornament.className = 'poster-divider-ornament';
    const lineAfter = document.createElement('span');
    lineAfter.className = 'poster-divider-line';
    node.appendChild(lineBefore);
    node.appendChild(ornament);
    node.appendChild(lineAfter);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-divider-resize-handle';
    node.appendChild(resizeHandle);

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'poster-rotate-handle';
    rotateHandle.innerHTML = ROTATE_ICON;
    node.appendChild(rotateHandle);

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
    wireRotate(rotateHandle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.width,
      set: (e, v) => { e.width = v; },
      min: 60,
      max: 320,
      onChange: (n, e) => { n.style.width = `${e.width}px`; },
    });
    applyDividerStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createIconNode(el) {
    const node = document.createElement('div');
    node.className = 'poster-el poster-icon-el';
    node.dataset.id = el.id;

    const glyph = document.createElement('span');
    glyph.className = 'poster-icon-glyph';
    node.appendChild(glyph);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-resize-handle';
    node.appendChild(resizeHandle);

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'poster-rotate-handle';
    rotateHandle.innerHTML = ROTATE_ICON;
    node.appendChild(rotateHandle);

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
    wireRotate(rotateHandle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.size,
      set: (e, v) => { e.size = v; },
      min: 20,
      max: 200,
      onChange: (n, e) => {
        n.style.width = `${e.size}px`;
        n.style.height = `${e.size}px`;
        const g = n.querySelector('.poster-icon-glyph');
        if (g) g.style.fontSize = `${Math.round(e.size * 0.8)}px`;
      },
    });
    applyIconStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createTextNode(el) {
    // The editable text lives in its own inner element, structurally
    // separate from the drag/resize handles below — selecting all (Cmd+A)
    // or typing inside the text can then never reach (and delete) the
    // handles, since they live outside the contenteditable subtree entirely.
    const node = document.createElement('div');
    node.className = 'poster-el poster-text-el';
    node.dataset.id = el.id;

    const textContentEl = document.createElement('div');
    textContentEl.className = 'poster-text-content';
    textContentEl.contentEditable = 'true';
    textContentEl.spellcheck = false;
    // Migration: old format stored plain text + el.bold/el.italic booleans.
    // New format stores innerHTML with <strong>/<em>/<br> inline.
    {
      let html = el.text || '';
      if (!/<[^>]/.test(html)) {
        html = html
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        if (el.italic) html = `<em>${html}</em>`;
        if (el.bold)   html = `<strong>${html}</strong>`;
        el.text = html;
      }
      textContentEl.innerHTML = html;
    }
    node.appendChild(textContentEl);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-resize-handle';
    node.appendChild(resizeHandle);

    // Separate from resizeHandle (which scales the font size): without an
    // independent box width, a single-line text element always shrinks to
    // fit its content exactly, leaving no extra space for the align-left/
    // center/right buttons to actually do anything visible.
    const widthHandle = document.createElement('span');
    widthHandle.className = 'poster-text-width-handle';
    node.appendChild(widthHandle);

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'poster-rotate-handle';
    rotateHandle.innerHTML = ROTATE_ICON;
    node.appendChild(rotateHandle);

    node.addEventListener('pointerdown', () => selectElement(el.id));
    // Intercept Enter: insert <br> instead of letting the browser create a
    // <div> child, which inherits styles differently and looks heavier/bolder.
    textContentEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      document.execCommand('insertLineBreak');
    });
    textContentEl.addEventListener('input', () => {
      el.text = textContentEl.innerHTML;
      scheduleSave();
    });
    textContentEl.addEventListener('blur', () => {
      el.text = textContentEl.innerHTML;
      scheduleSave();
    });

    wireDrag(handle, node, el);
    wireRotate(rotateHandle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.fontSize,
      set: (e, v) => { e.fontSize = v; },
      min: 8,
      max: 200,
      // Must target .poster-text-content, not the wrapper node: applyTextStyle
      // sets font-size on that child element directly (an inline style, so it
      // always wins over whatever the wrapper's font-size is), which is why
      // setting it on the wrapper here had no visible effect at all.
      onChange: (n, e) => {
        const content = n.querySelector('.poster-text-content');
        if (content) content.style.fontSize = `${e.fontSize}px`;
      },
    });
    wireResize(widthHandle, node, el, {
      get: (e) => e.width || node.offsetWidth,
      set: (e, v) => { e.width = v; },
      min: 40,
      max: 380,
      onChange: (n, e) => { n.style.width = `${e.width}px`; },
      syncSizeInput: false,
    });
    applyTextStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createImageNode(el) {
    const node = document.createElement('div');
    node.className = 'poster-el poster-image-el';
    node.dataset.id = el.id;

    const img = document.createElement('img');
    img.className = 'poster-image-img';
    img.draggable = false;
    img.alt = '';
    node.appendChild(img);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-resize-handle';
    node.appendChild(resizeHandle);

    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'poster-rotate-handle';
    rotateHandle.innerHTML = ROTATE_ICON;
    node.appendChild(rotateHandle);

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
    wireRotate(rotateHandle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.width,
      set: (e, v) => { e.width = v; },
      min: 40,
      max: 500,
      onChange: (n, e) => {
        n.style.width = `${e.width}px`;
        n.style.height = `${e.width / (e.aspectRatio || 1)}px`;
      },
    });
    applyImageStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createElementNode(el) {
    if (el.type === 'qr') return createQrNode(el);
    if (el.type === 'divider') return createDividerNode(el);
    if (el.type === 'icon') return createIconNode(el);
    if (el.type === 'image') return createImageNode(el);
    return createTextNode(el);
  }

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.poster-el') || e.target.closest('.poster-text-toolbar')) return;
    deselect();
  });

  addTextBtn.addEventListener('click', () => {
    const el = {
      id: generateId(),
      type: 'text',
      text: t(currentLang, 'posterDefaultText'),
      x: 80 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      ...lastTextStyle,
    };
    poster.elements.push(el);
    const node = createTextNode(el);
    selectElement(el.id);
    const textContentEl = node.querySelector('.poster-text-content');
    textContentEl.focus();
    const range = document.createRange();
    range.selectNodeContents(textContentEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    scheduleSave();
  });

  addQrBtn.addEventListener('click', () => {
    const el = {
      id: generateId(),
      type: 'qr',
      x: 80 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      size: 140,
      color: '#2c2420',
      bodyShape: QR_BODY_PRESETS[0].key,
      cornerShape: QR_CORNER_PRESETS[0].key,
    };
    poster.elements.push(el);
    createQrNode(el);
    selectElement(el.id);
    scheduleSave();
  });

  addDividerBtn.addEventListener('click', () => {
    const el = {
      id: generateId(),
      type: 'divider',
      x: 60 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      width: 200,
      thickness: 1,
      ornamentSize: 16,
      color: '#2c2420',
      style: DIVIDER_PRESETS[0].key,
    };
    poster.elements.push(el);
    createDividerNode(el);
    selectElement(el.id);
    scheduleSave();
  });

  addIconBtn.addEventListener('click', () => {
    const el = {
      id: generateId(),
      type: 'icon',
      x: 80 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      size: 48,
      color: '#2c2420',
      symbol: ICON_PRESETS[0].key,
    };
    poster.elements.push(el);
    createIconNode(el);
    selectElement(el.id);
    scheduleSave();
  });

  function addImageElement(src, aspectRatio) {
    const width = Math.min(200, SHEET_WIDTH - 40);
    const el = {
      id: generateId(),
      type: 'image',
      x: 60 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      width,
      aspectRatio: aspectRatio > 0 ? aspectRatio : 1,
      src,
    };
    poster.elements.push(el);
    createImageNode(el);
    selectElement(el.id);
    scheduleSave();
  }

  // Downscales the source image before it ever becomes a base64 string —
  // posters are stored as a Firestore field, which has a 1MB document cap,
  // so a few uncompressed phone photos could blow through that easily.
  function readAndResizeImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
          const width = Math.round(img.width * scale);
          const height = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), aspectRatio: img.width / img.height });
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function openImageMenu() {
    imageMenuEl.hidden = false;
    if (window.matchMedia('(min-width: 761px)').matches) {
      const toolboxRect = toolboxEl.getBoundingClientRect();
      const btnRect = addImageBtn.getBoundingClientRect();
      imageMenuEl.style.left = `${toolboxRect.right + 10}px`;
      imageMenuEl.style.top = `${btnRect.top}px`;
    } else {
      const btnRect = addImageBtn.getBoundingClientRect();
      imageMenuEl.style.left = `${Math.max(8, Math.min(btnRect.left, window.innerWidth - imageMenuEl.offsetWidth - 8))}px`;
      imageMenuEl.style.top = `${btnRect.bottom + 8}px`;
    }
  }

  function closeImageMenu() {
    imageMenuEl.hidden = true;
  }

  addImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (imageMenuEl.hidden) openImageMenu();
    else closeImageMenu();
  });
  imageMenuEl.addEventListener('mousedown', (e) => e.stopPropagation());
  document.addEventListener('mousedown', (e) => {
    if (imageMenuEl.hidden) return;
    if (e.target.closest('.poster-image-menu') || e.target === addImageBtn || addImageBtn.contains(e.target)) return;
    closeImageMenu();
  });

  imageUploadBtn.addEventListener('click', () => {
    closeImageMenu();
    imageFileInput.click();
  });

  imageFileInput.addEventListener('change', async () => {
    const file = imageFileInput.files[0];
    imageFileInput.value = '';
    if (!file) return;
    try {
      const { dataUrl, aspectRatio } = await readAndResizeImageFile(file);
      addImageElement(dataUrl, aspectRatio);
    } catch (err) {
      console.warn('poster image upload failed', err);
    }
  });

  imagePasteBtn.addEventListener('click', async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((ty) => ty.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        const { dataUrl, aspectRatio } = await readAndResizeImageFile(blob);
        addImageElement(dataUrl, aspectRatio);
        closeImageMenu();
        return;
      }
      alert(t(currentLang, 'posterImagePasteEmpty'));
    } catch (err) {
      alert(t(currentLang, 'posterImagePasteUnsupported'));
    }
  });

  function addImageFromUrl(url) {
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      addImageElement(url, img.naturalWidth / img.naturalHeight);
      imageUrlInput.value = '';
      closeImageMenu();
    };
    img.onerror = () => {
      alert(t(currentLang, 'posterImageUrlError'));
    };
    img.src = url;
  }

  imageUrlBtn.addEventListener('click', () => addImageFromUrl(imageUrlInput.value.trim()));
  imageUrlInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addImageFromUrl(imageUrlInput.value.trim());
  });
  imageUrlInput.addEventListener('mousedown', (e) => e.stopPropagation());

  // A plain Ctrl/Cmd+V anywhere on the page (not while typing elsewhere)
  // also adds a pasted image directly — no need to open the image menu first.
  document.addEventListener('paste', async (e) => {
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type || !item.type.startsWith('image/')) continue;
      const blob = item.getAsFile();
      if (!blob) continue;
      e.preventDefault();
      try {
        const { dataUrl, aspectRatio } = await readAndResizeImageFile(blob);
        addImageElement(dataUrl, aspectRatio);
      } catch (err) {
        console.warn('poster paste image failed', err);
      }
      return;
    }
  });

  // Prevent mousedown on B/I from blurring the contenteditable (which would
  // clear the selection before execCommand runs).
  boldBtn.addEventListener('mousedown', (e) => e.preventDefault());
  italicBtn.addEventListener('mousedown', (e) => e.preventDefault());
  boldBtn.addEventListener('click', () => {
    document.execCommand('bold');
    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    const el = poster.elements.find((e) => e.id === selectedId);
    if (el?.type === 'text') {
      const content = sheetContentEl.querySelector(`[data-id="${selectedId}"] .poster-text-content`);
      if (content) { el.text = content.innerHTML; scheduleSave(); }
    }
  });
  italicBtn.addEventListener('click', () => {
    document.execCommand('italic');
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
    const el = poster.elements.find((e) => e.id === selectedId);
    if (el?.type === 'text') {
      const content = sheetContentEl.querySelector(`[data-id="${selectedId}"] .poster-text-content`);
      if (content) { el.text = content.innerHTML; scheduleSave(); }
    }
  });
  alignLeftBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'left'; }));
  alignCenterBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'center'; }));
  alignRightBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'right'; }));
  fontSelect.addEventListener('change', () => updateSelected((el) => { el.fontKey = fontSelect.value; }));
  dividerStyleSelect.addEventListener('change', () => updateSelected((el) => { el.style = dividerStyleSelect.value; }));
  dividerThicknessInput.addEventListener('input', () => updateSelected((el) => {
    const value = Number(dividerThicknessInput.value);
    if (value > 0) el.thickness = value;
  }));
  dividerOrnamentSizeInput.addEventListener('input', () => updateSelected((el) => {
    const value = Number(dividerOrnamentSizeInput.value);
    if (value > 0) el.ornamentSize = value;
  }));
  iconSymbolSelect.addEventListener('change', () => updateSelected((el) => { el.symbol = iconSymbolSelect.value; }));
  qrBodySelect.addEventListener('change', () => updateSelected((el) => { el.bodyShape = qrBodySelect.value; }));
  qrCornerSelect.addEventListener('change', () => updateSelected((el) => { el.cornerShape = qrCornerSelect.value; }));
  sizeInput.addEventListener('input', () => updateSelected((el) => {
    const value = Number(sizeInput.value);
    if (!(value > 0)) return;
    if (el.type === 'qr' || el.type === 'icon') el.size = value;
    else if (el.type === 'divider' || el.type === 'image') el.width = value;
    else el.fontSize = value;
  }));
  colorInput.addEventListener('input', () => updateSelected((el) => { el.color = colorInput.value; }));

  // When the cursor moves inside a text element, reflect the inline formatting
  // state (bold/italic at the cursor position) in the toolbar buttons.
  document.addEventListener('selectionchange', () => {
    const el = poster.elements.find((e) => e.id === selectedId);
    if (!el || el.type !== 'text') return;
    boldBtn.classList.toggle('active', document.queryCommandState('bold'));
    italicBtn.classList.toggle('active', document.queryCommandState('italic'));
  });

  function deleteSelected() {
    if (!selectedId) return;
    poster.elements = poster.elements.filter((e) => e.id !== selectedId);
    const node = sheetContentEl.querySelector(`[data-id="${selectedId}"]`);
    if (node) node.remove();
    deselect();
    scheduleSave();
  }

  deleteBtn.addEventListener('click', deleteSelected);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (!selectedId) return;
    // Don't hijack Backspace/Delete while the user is typing — only delete
    // the whole widget when focus isn't inside a text/contenteditable field.
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    deleteSelected();
  });

  duplicateBtn.addEventListener('click', () => {
    const el = poster.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const copy = { ...el, id: generateId(), x: el.x + 16, y: el.y + 16 };
    poster.elements.push(copy);
    createElementNode(copy);
    selectElement(copy.id);
    scheduleSave();
  });

  bgColorInput.addEventListener('input', () => {
    poster.background = bgColorInput.value;
    applyBackground();
    scheduleSave();
  });

  function populateFontSelect() {
    const renderOptions = (list) => list
      .map((f) => `<option value="${f.key}" style="font-family:${f.family}">${f.label}</option>`)
      .join('');
    const headingOptions = FONT_OPTIONS.filter((f) => f.group === 'heading');
    const paragraphOptions = FONT_OPTIONS.filter((f) => f.group === 'paragraph');
    fontSelect.innerHTML = `
      <optgroup label="${t(currentLang, 'posterFontGroupHeading')}">${renderOptions(headingOptions)}</optgroup>
      <optgroup label="${t(currentLang, 'posterFontGroupParagraph')}">${renderOptions(paragraphOptions)}</optgroup>
    `;
  }

  function populateDividerStyleSelect() {
    dividerStyleSelect.innerHTML = DIVIDER_PRESETS.map((p) => `<option value="${p.key}">${t(currentLang, p.i18nKey)}</option>`).join('');
  }

  function populateIconSymbolSelect() {
    iconSymbolSelect.innerHTML = ICON_PRESETS.map((p) => `<option value="${p.key}">${p.symbol} ${t(currentLang, p.i18nKey)}</option>`).join('');
  }

  function populateQrBodySelect() {
    qrBodySelect.innerHTML = QR_BODY_PRESETS.map((p) => `<option value="${p.key}">${t(currentLang, p.i18nKey)}</option>`).join('');
  }

  function populateQrCornerSelect() {
    qrCornerSelect.innerHTML = QR_CORNER_PRESETS.map((p) => `<option value="${p.key}">${t(currentLang, p.i18nKey)}</option>`).join('');
  }

  async function capturePosterPng() {
    const canvas = await window.html2canvas(sheetEl, { scale: 4, useCORS: true });
    return canvas.toDataURL('image/png');
  }

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    try {
      const imgData = await capturePosterPng();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(`affiche-${weddingId}.pdf`);
    } finally {
      downloadBtn.disabled = false;
    }
  });

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    populateFontSelect();
    populateDividerStyleSelect();
    populateIconSymbolSelect();
    populateQrBodySelect();
    populateQrCornerSelect();
    if (selectedId) selectElement(selectedId);
    requestAnimationFrame(syncToolboxAlignment);
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

  if (!isFeatureEnabled(wedding, 'poster')) {
    window.location.replace(`wedding-admin.html?id=${weddingId}`);
    return;
  }

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = 'TableMe · Printable poster';

  deleteBtn.innerHTML = TRASH_ICON;
  populateFontSelect();
  populateDividerStyleSelect();
  populateIconSymbolSelect();
  populateQrBodySelect();
  populateQrCornerSelect();
  guestUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}guest/${wedding.lang || 'fr'}?id=${weddingId}`;
  poster = normalizePoster(wedding.poster);
  applySheetSize();
  applyBackground();
  bgColorInput.value = poster.background;
  bgHexInput.value = poster.background.toUpperCase();
  poster.elements.forEach((el) => createElementNode(el));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);

  requestAnimationFrame(syncToolboxAlignment);
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      syncToolboxAlignment();
      if (!imageMenuEl.hidden) openImageMenu();
    }, 150);
  });
})();
