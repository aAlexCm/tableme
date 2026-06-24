export const GUEST_THEME_COLOR_KEYS = [
  'bg',
  'cardBg',
  'text',
  'title',
  'accent',
  'inputBg',
  'inputText',
  'inputBorder',
  'tableColor',
  'chairColor',
  'canvasBg',
];

export const GUEST_THEME_PRESETS = [
  {
    id: 'classic',
    labelKey: 'themeClassic',
    colors: {
      bg: '#f9f9f7',
      cardBg: '#fffdf9',
      text: '#38362f',
      title: '#5f6b53',
      accent: '#b08d4f',
      inputBg: '#e6ebe0',
      inputText: '#38362f',
      inputBorder: '#e6d6ae',
      tableColor: '#b08d4f',
      chairColor: '#5f6b53',
      canvasBg: '#e6ebe0',
    },
  },
  {
    id: 'turquoise',
    labelKey: 'themeTurquoise',
    colors: {
      bg: '#f0fdfa',
      cardBg: '#ffffff',
      text: '#134e4a',
      title: '#0d9488',
      accent: '#14b8a6',
      inputBg: '#ccfbf1',
      inputText: '#134e4a',
      inputBorder: '#5eead4',
      tableColor: '#14b8a6',
      chairColor: '#0f766e',
      canvasBg: '#ccfbf1',
    },
  },
  {
    id: 'canard',
    labelKey: 'themeCanard',
    colors: {
      bg: '#eef6f8',
      cardBg: '#ffffff',
      text: '#0c2d33',
      title: '#155e75',
      accent: '#0e7490',
      inputBg: '#d7eef2',
      inputText: '#0c2d33',
      inputBorder: '#67c3d6',
      tableColor: '#0e7490',
      chairColor: '#0c4a57',
      canvasBg: '#d7eef2',
    },
  },
  {
    id: 'pink',
    labelKey: 'themePink',
    colors: {
      bg: '#fff1f5',
      cardBg: '#ffffff',
      text: '#4a1d2e',
      title: '#be185d',
      accent: '#db2777',
      inputBg: '#ffe4ec',
      inputText: '#4a1d2e',
      inputBorder: '#f9a8c5',
      tableColor: '#db2777',
      chairColor: '#9d174d',
      canvasBg: '#ffe4ec',
    },
  },
];

export function getPreset(id) {
  return GUEST_THEME_PRESETS.find((p) => p.id === id) || GUEST_THEME_PRESETS[0];
}

export function getDefaultTheme() {
  return { preset: 'classic', colors: { ...GUEST_THEME_PRESETS[0].colors } };
}
