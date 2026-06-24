import { Storage } from './storage.js';
import { t } from './i18n.js';
import { GUEST_THEME_PRESETS, GUEST_THEME_COLOR_KEYS, getDefaultTheme } from './guest-themes.js';

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
  const themeCustomToggleBtn = document.getElementById('theme-custom-toggle');
  const themeCustomGridEl = document.getElementById('theme-custom-grid');

  function updateLabels() {
    const label = t(getLang(), 'themeSettingsBtn');
    themeSettingsBtn.title = label;
    themeSettingsBtn.setAttribute('aria-label', label);
  }

  async function render() {
    const wedding = await Storage.getWedding(weddingId);
    if (!wedding) return;
    const theme = wedding.theme || getDefaultTheme();
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

    themeCustomGridEl.innerHTML = GUEST_THEME_COLOR_KEYS.map((key) => `
      <div class="theme-color-field">
        <label for="theme-color-${key}">${escapeHtml(t(lang, THEME_COLOR_LABEL_KEYS[key]))}</label>
        <input type="color" id="theme-color-${key}" data-key="${key}" value="${theme.colors[key]}" />
      </div>
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
    await Storage.setTheme(weddingId, { preset: preset.id, colors: { ...preset.colors } });
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
    const colors = { ...theme.colors, [input.dataset.key]: input.value };
    await Storage.setTheme(weddingId, { preset: 'custom', colors });
    themePresetGridEl.querySelectorAll('.theme-preset-option').forEach((b) => b.classList.remove('active'));
  });

  function init() {
    themeSettingsBtn.innerHTML = PALETTE_ICON;
    updateLabels();
    render();
  }

  return { init, updateLabels, render };
}
