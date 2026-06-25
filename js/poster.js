import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';
import { wireColorHexPair } from './color-hex.js';

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

const QR_RENDER_SIZE = 256;

const DIVIDER_PRESETS = [
  { key: 'plain', i18nKey: 'dividerPresetPlain', ornament: '' },
  { key: 'heart', i18nKey: 'dividerPresetHeart', ornament: '♥' },
  { key: 'diamond', i18nKey: 'dividerPresetDiamond', ornament: '◆' },
  { key: 'dot', i18nKey: 'dividerPresetDot', ornament: '•' },
  { key: 'flourish', i18nKey: 'dividerPresetFlourish', ornament: '❦' },
];

const ICON_PRESETS = [
  { key: 'heart', i18nKey: 'iconPresetHeart', symbol: '♥' },
  { key: 'rings', i18nKey: 'iconPresetRings', symbol: '⚭' },
  { key: 'flower', i18nKey: 'iconPresetFlower', symbol: '❀' },
  { key: 'star', i18nKey: 'iconPresetStar', symbol: '✦' },
  { key: 'floral', i18nKey: 'iconPresetFloral', symbol: '❦' },
  { key: 'fleur', i18nKey: 'iconPresetFleur', symbol: '⚜' },
];

function getDefaultPoster() {
  return { elements: [], background: '#ffffff' };
}

function normalizeElement(el) {
  const type = ['qr', 'divider', 'icon'].includes(el.type) ? el.type : 'text';
  const base = {
    id: el.id || generateId(),
    type,
    x: typeof el.x === 'number' ? el.x : 80,
    y: typeof el.y === 'number' ? el.y : 80,
  };
  if (type === 'qr') {
    return { ...base, size: typeof el.size === 'number' ? el.size : 140, color: el.color || '#2c2420' };
  }
  if (type === 'divider') {
    return {
      ...base,
      width: typeof el.width === 'number' ? el.width : 200,
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
  return {
    ...base,
    text: typeof el.text === 'string' ? el.text : '',
    fontKey: FONT_OPTIONS.some((f) => f.key === el.fontKey) ? el.fontKey : FONT_OPTIONS[0].key,
    fontSize: typeof el.fontSize === 'number' ? el.fontSize : 28,
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
  const downloadBtn = document.getElementById('poster-download-btn');
  const printBtn = document.getElementById('poster-print-btn');

  const toolbarEl = document.getElementById('poster-text-toolbar');
  const boldBtn = document.getElementById('poster-bold-btn');
  const italicBtn = document.getElementById('poster-italic-btn');
  const alignLeftBtn = document.getElementById('poster-align-left-btn');
  const alignCenterBtn = document.getElementById('poster-align-center-btn');
  const alignRightBtn = document.getElementById('poster-align-right-btn');
  const fontSelect = document.getElementById('poster-font-select');
  const dividerStyleSelect = document.getElementById('poster-divider-style-select');
  const iconSymbolSelect = document.getElementById('poster-icon-symbol-select');
  const sizeInput = document.getElementById('poster-size-input');
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

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Storage.setPoster(weddingId, poster);
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

  function applyTextStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    // body.admin-theme * forces Inter with !important; only an inline
    // !important on this element can win against that rule.
    node.style.setProperty('font-family', fontFamilyFor(el.fontKey), 'important');
    node.style.fontSize = `${el.fontSize}px`;
    node.style.fontWeight = el.bold ? '700' : '400';
    node.style.fontStyle = el.italic ? 'italic' : 'normal';
    node.style.textAlign = el.align;
    node.style.color = el.color;
  }

  function renderQrCanvas(node, el) {
    const wrap = node.querySelector('.poster-qr-canvas');
    if (!wrap) return;
    wrap.innerHTML = '';
    new window.QRCode(wrap, {
      text: guestUrl,
      width: QR_RENDER_SIZE,
      height: QR_RENDER_SIZE,
      colorDark: el.color,
      colorLight: 'rgba(0,0,0,0)',
    });
  }

  function applyQrStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.size}px`;
    node.style.height = `${el.size}px`;
    renderQrCanvas(node, el);
  }

  function applyDividerStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.width}px`;
    node.style.color = el.color;
    const ornamentEl = node.querySelector('.poster-divider-ornament');
    if (ornamentEl) {
      const preset = DIVIDER_PRESETS.find((p) => p.key === el.style) || DIVIDER_PRESETS[0];
      ornamentEl.textContent = preset.ornament;
      ornamentEl.hidden = !preset.ornament;
    }
  }

  function applyIconStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.size}px`;
    node.style.height = `${el.size}px`;
    node.style.color = el.color;
    const glyph = node.querySelector('.poster-icon-glyph');
    if (glyph) {
      const preset = ICON_PRESETS.find((p) => p.key === el.symbol) || ICON_PRESETS[0];
      glyph.textContent = preset.symbol;
      glyph.style.fontSize = `${Math.round(el.size * 0.8)}px`;
    }
  }

  function applyElementStyle(node, el) {
    if (el.type === 'qr') applyQrStyle(node, el);
    else if (el.type === 'divider') applyDividerStyle(node, el);
    else if (el.type === 'icon') applyIconStyle(node, el);
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

    boldBtn.hidden = !isText;
    italicBtn.hidden = !isText;
    alignLeftBtn.hidden = !isText;
    alignCenterBtn.hidden = !isText;
    alignRightBtn.hidden = !isText;
    fontSelect.hidden = !isText;
    dividerStyleSelect.hidden = !isDivider;
    iconSymbolSelect.hidden = !isIcon;
    colorInput.value = el.color;
    hexInput.value = el.color.toUpperCase();

    if (isText) {
      boldBtn.classList.toggle('active', el.bold);
      italicBtn.classList.toggle('active', el.italic);
      alignLeftBtn.classList.toggle('active', el.align === 'left');
      alignCenterBtn.classList.toggle('active', el.align === 'center');
      alignRightBtn.classList.toggle('active', el.align === 'right');
      fontSelect.value = el.fontKey;
      sizeInput.min = '8';
      sizeInput.max = '200';
      sizeInput.value = el.fontSize;
    } else if (isDivider) {
      dividerStyleSelect.value = el.style;
      sizeInput.min = '60';
      sizeInput.max = '320';
      sizeInput.value = el.width;
    } else if (isIcon) {
      iconSymbolSelect.value = el.symbol;
      sizeInput.min = '20';
      sizeInput.max = '200';
      sizeInput.value = el.size;
    } else {
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
      boldBtn.classList.toggle('active', el.bold);
      italicBtn.classList.toggle('active', el.italic);
      alignLeftBtn.classList.toggle('active', el.align === 'left');
      alignCenterBtn.classList.toggle('active', el.align === 'center');
      alignRightBtn.classList.toggle('active', el.align === 'right');
    }
    scheduleSave();
  }

  function wireDrag(handle, node, el) {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectElement(el.id);
      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = el.x;
      const startTop = el.y;

      function onMove(ev) {
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
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        guideV.hidden = true;
        guideH.hidden = true;
        scheduleSave();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // Generic corner/edge resize: `get`/`set` read and write the element's
  // size-like property, `onChange` re-applies the visual consequence (qr and
  // icon resize a square box, divider resizes a line's width, text resizes
  // its font size) without needing a full applyElementStyle() pass per move.
  function wireResize(handle, node, el, { get, set, min, max, onChange }) {
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectElement(el.id);
      const startX = e.clientX;
      const startValue = get(el);

      function onMove(ev) {
        const dx = ev.clientX - startX;
        const value = Math.min(max, Math.max(min, startValue + dx));
        set(el, value);
        onChange(node, el);
        positionToolbar(node);
        if (selectedId === el.id) sizeInput.value = value;
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        scheduleSave();
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
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

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
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

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
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

    wireDrag(node, node, el);
    wireDrag(handle, node, el);
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
    textContentEl.textContent = el.text;
    node.appendChild(textContentEl);

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    const resizeHandle = document.createElement('span');
    resizeHandle.className = 'poster-resize-handle';
    node.appendChild(resizeHandle);

    node.addEventListener('mousedown', () => selectElement(el.id));
    textContentEl.addEventListener('input', () => {
      el.text = textContentEl.textContent;
      scheduleSave();
    });
    textContentEl.addEventListener('blur', () => {
      el.text = textContentEl.textContent;
      scheduleSave();
    });

    wireDrag(handle, node, el);
    wireResize(resizeHandle, node, el, {
      get: (e) => e.fontSize,
      set: (e, v) => { e.fontSize = v; },
      min: 8,
      max: 200,
      onChange: (n, e) => { n.style.fontSize = `${e.fontSize}px`; },
    });
    applyTextStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  function createElementNode(el) {
    if (el.type === 'qr') return createQrNode(el);
    if (el.type === 'divider') return createDividerNode(el);
    if (el.type === 'icon') return createIconNode(el);
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
      fontKey: FONT_OPTIONS[0].key,
      fontSize: 28,
      bold: false,
      italic: false,
      align: 'left',
      color: '#2c2420',
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

  boldBtn.addEventListener('click', () => updateSelected((el) => { el.bold = !el.bold; }));
  italicBtn.addEventListener('click', () => updateSelected((el) => { el.italic = !el.italic; }));
  alignLeftBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'left'; }));
  alignCenterBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'center'; }));
  alignRightBtn.addEventListener('click', () => updateSelected((el) => { el.align = 'right'; }));
  fontSelect.addEventListener('change', () => updateSelected((el) => { el.fontKey = fontSelect.value; }));
  dividerStyleSelect.addEventListener('change', () => updateSelected((el) => { el.style = dividerStyleSelect.value; }));
  iconSymbolSelect.addEventListener('change', () => updateSelected((el) => { el.symbol = iconSymbolSelect.value; }));
  sizeInput.addEventListener('input', () => updateSelected((el) => {
    const value = Number(sizeInput.value);
    if (!(value > 0)) return;
    if (el.type === 'qr' || el.type === 'icon') el.size = value;
    else if (el.type === 'divider') el.width = value;
    else el.fontSize = value;
  }));
  colorInput.addEventListener('input', () => updateSelected((el) => { el.color = colorInput.value; }));

  deleteBtn.addEventListener('click', () => {
    if (!selectedId) return;
    poster.elements = poster.elements.filter((e) => e.id !== selectedId);
    const node = sheetContentEl.querySelector(`[data-id="${selectedId}"]`);
    if (node) node.remove();
    deselect();
    scheduleSave();
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

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    try {
      const canvas = await window.html2canvas(sheetEl, { scale: 4, useCORS: true });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(`affiche-${weddingId}.pdf`);
    } finally {
      downloadBtn.disabled = false;
    }
  });

  printBtn.addEventListener('click', () => {
    let styleTag = document.getElementById('poster-print-size-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'poster-print-size-style';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = '@page { size: A4; margin: 0; }';
    window.print();
  });

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    populateFontSelect();
    populateDividerStyleSelect();
    populateIconSymbolSelect();
    if (selectedId) selectElement(selectedId);
    requestAnimationFrame(syncToolboxAlignment);
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

  contentEl.hidden = false;
  weddingNameEl.textContent = wedding.name;
  backLinkEl.href = `wedding-admin.html?id=${weddingId}`;
  document.title = `TableMe · ${t(currentLang, 'posterToolTitle')}`;

  deleteBtn.innerHTML = TRASH_ICON;
  populateFontSelect();
  populateDividerStyleSelect();
  populateIconSymbolSelect();
  guestUrl = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, '')}index.html?id=${weddingId}`;
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
    resizeTimer = setTimeout(syncToolboxAlignment, 150);
  });
})();
