import { Storage } from './storage.js';
import { t } from './i18n.js';
import {
  GUEST_THEME_PRESETS,
  GUEST_THEME_COLOR_KEYS,
  GUEST_FONT_TITLE_OPTIONS,
  GUEST_FONT_BODY_OPTIONS,
  getDefaultTheme,
} from './guest-themes.js';
import { DECORATION_ELEMENTS, DECORATION_POSITIONS, getDefaultDecoration, normalizeDecoration } from './guest-decorations.js';
import { ICONS as TABLE_ICONS } from './table-modal.js';

const UPLOAD_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>';
const NONE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M5 19 19 5"/></svg>';
const ARROW_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="4"/><polyline points="6 10 12 4 18 10"/></svg>';
const MAX_DECORATION_DIMENSION = 480;

function readAndResizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, MAX_DECORATION_DIMENSION / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export const PALETTE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4a3.6 3.6 0 0 0 3.6-3.6C21 6.8 17 2 12 2z"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="11" cy="6.8" r="1.2" fill="currentColor"/><circle cx="15.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="17.5" cy="11.8" r="1.2" fill="currentColor"/></svg>';

const THEME_COLOR_LABEL_KEYS = {
  bg: 'themeColorBg',
  cardBg: 'themeColorCardBg',
  text: 'themeColorText',
  title: 'themeColorTitle',
  accent: 'themeColorAccent',
  inputBg: 'themeColorInputBg',
  inputText: 'themeColorInputText',
  inputBorder: 'themeColorInputBorder',
  tableColor: 'themeColorTableColor',
  chairColor: 'themeColorChairColor',
  canvasBg: 'themeColorCanvasBg',
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

export function createThemeSettings({ weddingId, getLang }) {
  const themeSettingsBtn = document.getElementById('theme-settings-btn');
  const themeModal = document.getElementById('theme-modal');
  const themeModalClose = document.getElementById('theme-modal-close');
  const themePresetGridEl = document.getElementById('theme-preset-grid');
  const themeFontTitleGridEl = document.getElementById('theme-font-title-grid');
  const themeFontBodyGridEl = document.getElementById('theme-font-body-grid');
  const themeCustomToggleBtn = document.getElementById('theme-custom-toggle');
  const themeCustomGridEl = document.getElementById('theme-custom-grid');
  const decorationGridEl = document.getElementById('theme-decoration-grid');
  const decorationUploadEl = document.getElementById('theme-decoration-upload');
  const decorationFileInput = document.getElementById('theme-decoration-file-input');
  const decorationUploadBtn = document.getElementById('theme-decoration-upload-btn');
  const decorationPreviewEl = document.getElementById('theme-decoration-preview');
  const decorationPreviewImgEl = document.getElementById('theme-decoration-preview-img');
  const decorationRemoveBtn = document.getElementById('theme-decoration-remove-btn');
  const decorationPositionFieldEl = document.getElementById('theme-decoration-position-field');
  const decorationPositionGridEl = document.getElementById('theme-decoration-position-grid');

  function updateLabels() {
    const lang = getLang();
    const label = t(lang, 'themeSettingsBtn');
    themeSettingsBtn.title = label;
    themeSettingsBtn.setAttribute('aria-label', label);

    decorationRemoveBtn.innerHTML = TABLE_ICONS.trash;
    const removeLabel = t(lang, 'decorationRemoveBtn');
    decorationRemoveBtn.title = removeLabel;
    decorationRemoveBtn.setAttribute('aria-label', removeLabel);
  }

  async function render() {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const fonts = theme.fonts || getDefaultTheme().fonts;
    const lang = getLang();

    themePresetGridEl.innerHTML = GUEST_THEME_PRESETS.map((preset) => {
      const isActive = theme.preset === preset.id;
      const swatches = ['bg', 'accent', 'title', 'inputBg']
        .map((key) => `<span class="theme-preset-swatch" style="background:${preset.colors[key]}"></span>`)
        .join('');
      return `
        <button type="button" class="theme-preset-option${isActive ? ' active' : ''}" data-preset="${preset.id}">
          <span>${escapeHtml(t(lang, preset.labelKey))}</span>
          <span class="theme-preset-swatches">${swatches}</span>
        </button>
      `;
    }).join('');

    themeFontTitleGridEl.innerHTML = GUEST_FONT_TITLE_OPTIONS.map((opt) => `
      <button type="button" class="theme-font-option${fonts.title === opt.id ? ' active' : ''}" data-font-title="${opt.id}" style="font-family:${opt.family}">
        ${escapeHtml(t(lang, opt.labelKey))}
      </button>
    `).join('');

    themeFontBodyGridEl.innerHTML = GUEST_FONT_BODY_OPTIONS.map((opt) => `
      <button type="button" class="theme-font-option${fonts.body === opt.id ? ' active' : ''}" data-font-body="${opt.id}" style="font-family:${opt.family}">
        ${escapeHtml(t(lang, opt.labelKey))}
      </button>
    `).join('');

    themeCustomGridEl.innerHTML = GUEST_THEME_COLOR_KEYS.map((key) => `
      <div class="theme-color-field">
        <label for="theme-color-${key}">${escapeHtml(t(lang, THEME_COLOR_LABEL_KEYS[key]))}</label>
        <input type="color" id="theme-color-${key}" data-key="${key}" value="${theme.colors[key]}" />
      </div>
    `).join('');

    const decoration = normalizeDecoration(theme.decoration);
    const decorationOptions = [
      { key: 'none', labelKey: 'decorationNone', preview: NONE_ICON },
      ...DECORATION_ELEMENTS.map((opt) => ({ key: opt.key, labelKey: opt.labelKey, preview: opt.svg })),
      { key: 'custom', labelKey: 'decorationCustom', preview: UPLOAD_ICON },
    ];
    decorationGridEl.innerHTML = decorationOptions.map((opt) => `
      <button type="button" class="theme-decoration-option${decoration.element === opt.key ? ' active' : ''}" data-decoration="${opt.key}">
        <span class="theme-decoration-preview-box">${opt.preview}</span>
        <span>${escapeHtml(t(lang, opt.labelKey))}</span>
      </button>
    `).join('');

    decorationUploadEl.hidden = decoration.element !== 'custom';
    if (decoration.element === 'custom' && decoration.customImage) {
      decorationPreviewImgEl.src = decoration.customImage;
      decorationPreviewEl.hidden = false;
      decorationUploadBtn.hidden = true;
    } else {
      decorationPreviewEl.hidden = true;
      decorationUploadBtn.hidden = false;
    }

    decorationPositionFieldEl.hidden = decoration.element === 'none' || decoration.element === 'fireworks';
    decorationPositionGridEl.innerHTML = DECORATION_POSITIONS.map((pos) => `
      <button type="button" class="theme-decoration-position-option${decoration.positions.includes(pos.key) ? ' active' : ''}" data-position="${pos.key}" style="grid-area:${pos.key}" title="${escapeHtml(t(lang, pos.labelKey))}">
        <span class="theme-decoration-position-arrow" style="transform:rotate(${pos.arrowAngle}deg)">${ARROW_ICON}</span>
        <span class="theme-decoration-position-label">${escapeHtml(t(lang, pos.labelKey))}</span>
      </button>
    `).join('');
  }

  function openModal() {
    themeModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    themeModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  themeSettingsBtn.addEventListener('click', openModal);
  themeModalClose.addEventListener('click', closeModal);
  themeModal.addEventListener('click', (e) => {
    if (e.target === themeModal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !themeModal.hidden) closeModal();
  });

  themePresetGridEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.theme-preset-option');
    if (!btn) return;
    const preset = GUEST_THEME_PRESETS.find((p) => p.id === btn.dataset.preset);
    if (!preset) return;
    const wedding = await Storage.getWedding(weddingId);
    const theme = (wedding && wedding.theme) || getDefaultTheme();
    const fonts = theme.fonts || getDefaultTheme().fonts;
    const decoration = theme.decoration || getDefaultDecoration();
    await Storage.setTheme(weddingId, { preset: preset.id, colors: { ...preset.colors }, fonts, decoration });
    await render();
  });

  themeFontTitleGridEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.theme-font-option');
    if (!btn) return;
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const fonts = { ...(theme.fonts || getDefaultTheme().fonts), title: btn.dataset.fontTitle };
    await Storage.setTheme(weddingId, { ...theme, fonts });
    await render();
  });

  themeFontBodyGridEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.theme-font-option');
    if (!btn) return;
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const fonts = { ...(theme.fonts || getDefaultTheme().fonts), body: btn.dataset.fontBody };
    await Storage.setTheme(weddingId, { ...theme, fonts });
    await render();
  });

  themeCustomToggleBtn.addEventListener('click', () => {
    themeCustomGridEl.hidden = !themeCustomGridEl.hidden;
  });

  themeCustomGridEl.addEventListener('change', async (e) => {
    const input = e.target.closest('input[type="color"]');
    if (!input) return;
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const fonts = theme.fonts || getDefaultTheme().fonts;
    const decoration = theme.decoration || getDefaultDecoration();
    const colors = { ...theme.colors, [input.dataset.key]: input.value };
    await Storage.setTheme(weddingId, { preset: 'custom', colors, fonts, decoration });
    themePresetGridEl.querySelectorAll('.theme-preset-option').forEach((b) => b.classList.remove('active'));
  });

  decorationGridEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.theme-decoration-option');
    if (!btn) return;
    const key = btn.dataset.decoration;
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const prevDecoration = normalizeDecoration(theme.decoration);
    const decoration = {
      element: key,
      positions: prevDecoration.positions,
      customImage: key === 'custom' ? prevDecoration.customImage || null : null,
    };
    await Storage.setTheme(weddingId, { ...theme, decoration });
    await render();
  });

  decorationUploadBtn.addEventListener('click', () => decorationFileInput.click());

  decorationFileInput.addEventListener('change', async () => {
    const file = decorationFileInput.files[0];
    decorationFileInput.value = '';
    if (!file) return;
    const dataUrl = await readAndResizeImage(file);
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const prevDecoration = normalizeDecoration(theme.decoration);
    const decoration = { ...prevDecoration, element: 'custom', customImage: dataUrl };
    await Storage.setTheme(weddingId, { ...theme, decoration });
    await render();
  });

  decorationRemoveBtn.addEventListener('click', async () => {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const decoration = { ...getDefaultDecoration() };
    await Storage.setTheme(weddingId, { ...theme, decoration });
    await render();
  });

  decorationPositionGridEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.theme-decoration-position-option');
    if (!btn) return;
    const key = btn.dataset.position;
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
    const prevDecoration = normalizeDecoration(theme.decoration);
    const isActive = prevDecoration.positions.includes(key);
    if (isActive && prevDecoration.positions.length === 1) return;
    const positions = isActive
      ? prevDecoration.positions.filter((p) => p !== key)
      : [...prevDecoration.positions, key];
    const decoration = { ...prevDecoration, positions };
    await Storage.setTheme(weddingId, { ...theme, decoration });
    await render();
  });

  function init() {
    document.getElementById('theme-settings-icon').innerHTML = PALETTE_ICON;
    updateLabels();
    render();
  }

  return { init, updateLabels, render };
}
