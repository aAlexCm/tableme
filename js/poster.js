import { Storage, generateId } from './storage.js';
import { applyTranslations, buildLangSwitcher, t } from './i18n.js';

const LANG_KEY = 'tableme_wedding_admin_lang';

// A4-proportioned (1:1.41421) reference canvas, kept compact on screen —
// html2canvas/jsPDF stretch the rasterized sheet to fill the true A4 page
// size regardless of this pixel size, so shrinking it doesn't affect print
// or PDF fidelity, only how big the editor looks on screen.
const SHEET_WIDTH = 500;
const SHEET_HEIGHT = 707;

const FONT_OPTIONS = [
  { key: 'playfair', label: 'Playfair Display', family: "'Playfair Display', serif" },
  { key: 'cormorant', label: 'Cormorant Garamond', family: "'Cormorant Garamond', serif" },
  { key: 'greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { key: 'parisienne', label: 'Parisienne', family: "'Parisienne', cursive" },
  { key: 'italiana', label: 'Italiana', family: "'Italiana', serif" },
];

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
const DRAG_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>';

function getDefaultPoster() {
  return { elements: [] };
}

function normalizePoster(poster) {
  if (!poster) return getDefaultPoster();
  return {
    elements: Array.isArray(poster.elements)
      ? poster.elements.map((el) => ({
        id: el.id || generateId(),
        text: typeof el.text === 'string' ? el.text : '',
        x: typeof el.x === 'number' ? el.x : 80,
        y: typeof el.y === 'number' ? el.y : 80,
        fontKey: FONT_OPTIONS.some((f) => f.key === el.fontKey) ? el.fontKey : FONT_OPTIONS[0].key,
        fontSize: typeof el.fontSize === 'number' ? el.fontSize : 28,
        bold: !!el.bold,
        italic: !!el.italic,
        color: el.color || '#2c2420',
      }))
      : [],
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
  const sheetEl = document.getElementById('poster-sheet');
  const sheetContentEl = document.getElementById('poster-sheet-content');
  const addTextBtn = document.getElementById('poster-add-text-btn');
  const downloadBtn = document.getElementById('poster-download-btn');
  const printBtn = document.getElementById('poster-print-btn');

  const toolbarEl = document.getElementById('poster-text-toolbar');
  const boldBtn = document.getElementById('poster-bold-btn');
  const italicBtn = document.getElementById('poster-italic-btn');
  const fontSelect = document.getElementById('poster-font-select');
  const sizeInput = document.getElementById('poster-size-input');
  const colorInput = document.getElementById('poster-color-input');
  const deleteBtn = document.getElementById('poster-delete-text-btn');

  let poster = getDefaultPoster();
  let selectedId = null;
  let saveTimer = null;

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

  function getTextWithoutHandle(node) {
    const clone = node.cloneNode(true);
    const handle = clone.querySelector('.poster-text-drag-handle');
    if (handle) handle.remove();
    return clone.textContent;
  }

  function applyTextStyle(node, el) {
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.fontFamily = fontFamilyFor(el.fontKey);
    node.style.fontSize = `${el.fontSize}px`;
    node.style.fontWeight = el.bold ? '700' : '400';
    node.style.fontStyle = el.italic ? 'italic' : 'normal';
    node.style.color = el.color;
  }

  function positionToolbar(node) {
    const rect = node.getBoundingClientRect();
    toolbarEl.style.left = `${Math.max(8, rect.left)}px`;
    toolbarEl.style.top = `${Math.max(8, rect.top - 46)}px`;
  }

  function deselect() {
    selectedId = null;
    sheetContentEl.querySelectorAll('.poster-text-el').forEach((n) => n.classList.remove('selected'));
    toolbarEl.hidden = true;
  }

  function selectElement(id) {
    selectedId = id;
    const el = poster.elements.find((e) => e.id === id);
    if (!el) {
      deselect();
      return;
    }
    sheetContentEl.querySelectorAll('.poster-text-el').forEach((n) => {
      n.classList.toggle('selected', n.dataset.id === id);
    });
    boldBtn.classList.toggle('active', el.bold);
    italicBtn.classList.toggle('active', el.italic);
    fontSelect.value = el.fontKey;
    sizeInput.value = el.fontSize;
    colorInput.value = el.color;
    toolbarEl.hidden = false;
    const node = sheetContentEl.querySelector(`[data-id="${id}"]`);
    if (node) positionToolbar(node);
  }

  function updateSelected(mutator) {
    const el = poster.elements.find((e) => e.id === selectedId);
    if (!el) return;
    mutator(el);
    const node = sheetContentEl.querySelector(`[data-id="${selectedId}"]`);
    if (node) applyTextStyle(node, el);
    boldBtn.classList.toggle('active', el.bold);
    italicBtn.classList.toggle('active', el.italic);
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
        el.x = Math.max(0, startLeft + dx);
        el.y = Math.max(0, startTop + dy);
        node.style.left = `${el.x}px`;
        node.style.top = `${el.y}px`;
        positionToolbar(node);
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

  function createTextNode(el) {
    const node = document.createElement('div');
    node.className = 'poster-text-el';
    node.dataset.id = el.id;
    node.contentEditable = 'true';
    node.spellcheck = false;
    node.textContent = el.text;

    const handle = document.createElement('span');
    handle.className = 'poster-text-drag-handle';
    handle.contentEditable = 'false';
    handle.innerHTML = DRAG_ICON;
    node.appendChild(handle);

    node.addEventListener('mousedown', () => selectElement(el.id));
    node.addEventListener('input', () => {
      el.text = getTextWithoutHandle(node);
      scheduleSave();
    });
    node.addEventListener('blur', () => {
      el.text = getTextWithoutHandle(node);
      scheduleSave();
    });

    wireDrag(handle, node, el);
    applyTextStyle(node, el);
    sheetContentEl.appendChild(node);
    return node;
  }

  document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.poster-text-el') || e.target.closest('.poster-text-toolbar')) return;
    deselect();
  });

  addTextBtn.addEventListener('click', () => {
    const el = {
      id: generateId(),
      text: t(currentLang, 'posterDefaultText'),
      x: 80 + (poster.elements.length % 5) * 14,
      y: 80 + (poster.elements.length % 5) * 28,
      fontKey: FONT_OPTIONS[0].key,
      fontSize: 28,
      bold: false,
      italic: false,
      color: '#2c2420',
    };
    poster.elements.push(el);
    const node = createTextNode(el);
    selectElement(el.id);
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    scheduleSave();
  });

  boldBtn.addEventListener('click', () => updateSelected((el) => { el.bold = !el.bold; }));
  italicBtn.addEventListener('click', () => updateSelected((el) => { el.italic = !el.italic; }));
  fontSelect.addEventListener('change', () => updateSelected((el) => { el.fontKey = fontSelect.value; }));
  sizeInput.addEventListener('input', () => updateSelected((el) => {
    const value = Number(sizeInput.value);
    if (value > 0) el.fontSize = value;
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

  function populateFontSelect() {
    fontSelect.innerHTML = FONT_OPTIONS.map((f) => `<option value="${f.key}" style="font-family:${f.family}">${f.label}</option>`).join('');
  }

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    try {
      const canvas = await window.html2canvas(sheetEl, { scale: 3, useCORS: true });
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
  poster = normalizePoster(wedding.poster);
  applySheetSize();
  poster.elements.forEach((el) => createTextNode(el));

  langMount.appendChild(buildLangSwitcher(currentLang, setLang));
  applyTranslations(currentLang);
})();
