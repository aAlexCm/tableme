// Decorative corner illustrations for the guest page. Each preset is a small
// line-art SVG drawn in the bottom-left quadrant of its own viewBox, using
// `currentColor` so it automatically matches whichever guest theme color is
// active — `applyGuestDecoration` mirrors it in CSS to fit the other corners.
export const DECORATION_ELEMENTS = [
  {
    key: 'branch',
    labelKey: 'decorationBranch',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 148C40 120 55 95 70 70C85 45 100 25 145 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
      <ellipse cx="28" cy="128" rx="13" ry="6" transform="rotate(-35 28 128)" fill="currentColor" opacity="0.85"/>
      <ellipse cx="44" cy="108" rx="14" ry="6.5" transform="rotate(40 44 108)" fill="currentColor" opacity="0.75"/>
      <ellipse cx="58" cy="92" rx="13" ry="6" transform="rotate(-30 58 92)" fill="currentColor" opacity="0.85"/>
      <ellipse cx="76" cy="74" rx="14" ry="6.5" transform="rotate(35 76 74)" fill="currentColor" opacity="0.7"/>
      <ellipse cx="92" cy="56" rx="12" ry="5.5" transform="rotate(-25 92 56)" fill="currentColor" opacity="0.8"/>
      <ellipse cx="110" cy="40" rx="12" ry="5.5" transform="rotate(30 110 40)" fill="currentColor" opacity="0.65"/>
      <ellipse cx="126" cy="26" rx="10" ry="5" transform="rotate(-20 126 26)" fill="currentColor" opacity="0.75"/>
      <circle cx="22" cy="142" r="3.2" fill="currentColor" opacity="0.55"/>
      <circle cx="50" cy="118" r="2.4" fill="currentColor" opacity="0.45"/>
      <circle cx="84" cy="86" r="2.8" fill="currentColor" opacity="0.5"/>
      <circle cx="118" cy="50" r="2.2" fill="currentColor" opacity="0.4"/>
    </svg>`,
  },
  {
    key: 'hearts',
    labelKey: 'decorationHearts',
    noMirrorY: true,
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <path opacity="0.85" transform="translate(20,128) scale(1.1)" d="M0,6 C-6,-2 -16,-2 -16,8 C-16,16 -8,22 0,30 C8,22 16,16 16,8 C16,-2 6,-2 0,6 Z"/>
        <path opacity="0.55" transform="translate(58,108) scale(0.75) rotate(-10)" d="M0,6 C-6,-2 -16,-2 -16,8 C-16,16 -8,22 0,30 C8,22 16,16 16,8 C16,-2 6,-2 0,6 Z"/>
        <path opacity="0.7" transform="translate(40,70) scale(0.55) rotate(12)" d="M0,6 C-6,-2 -16,-2 -16,8 C-16,16 -8,22 0,30 C8,22 16,16 16,8 C16,-2 6,-2 0,6 Z"/>
        <path opacity="0.4" transform="translate(94,42) scale(0.6) rotate(-8)" d="M0,6 C-6,-2 -16,-2 -16,8 C-16,16 -8,22 0,30 C8,22 16,16 16,8 C16,-2 6,-2 0,6 Z"/>
      </g>
    </svg>`,
  },
  {
    key: 'rings',
    labelKey: 'decorationRings',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="118" r="26" stroke="currentColor" stroke-width="5" opacity="0.85"/>
      <circle cx="78" cy="100" r="26" stroke="currentColor" stroke-width="5" opacity="0.6"/>
      <circle cx="118" cy="40" r="3" fill="currentColor" opacity="0.5"/>
      <circle cx="100" cy="58" r="2" fill="currentColor" opacity="0.4"/>
      <circle cx="132" cy="56" r="2.4" fill="currentColor" opacity="0.45"/>
    </svg>`,
  },
  {
    key: 'blossom',
    labelKey: 'decorationBlossom',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 150C36 124 46 100 50 78C54 56 60 38 96 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
      <g transform="translate(40,118)" fill="currentColor">
        <ellipse rx="9" ry="4.5" opacity="0.8"/>
        <ellipse rx="9" ry="4.5" transform="rotate(72)" opacity="0.8"/>
        <ellipse rx="9" ry="4.5" transform="rotate(144)" opacity="0.8"/>
        <ellipse rx="9" ry="4.5" transform="rotate(216)" opacity="0.8"/>
        <ellipse rx="9" ry="4.5" transform="rotate(288)" opacity="0.8"/>
        <circle r="3.5" opacity="0.95"/>
      </g>
      <g transform="translate(86,58) scale(0.7)" fill="currentColor">
        <ellipse rx="9" ry="4.5" opacity="0.6"/>
        <ellipse rx="9" ry="4.5" transform="rotate(72)" opacity="0.6"/>
        <ellipse rx="9" ry="4.5" transform="rotate(144)" opacity="0.6"/>
        <ellipse rx="9" ry="4.5" transform="rotate(216)" opacity="0.6"/>
        <ellipse rx="9" ry="4.5" transform="rotate(288)" opacity="0.6"/>
        <circle r="3.5" opacity="0.85"/>
      </g>
      <ellipse cx="62" cy="94" rx="8" ry="3.5" transform="rotate(-40 62 94)" fill="currentColor" opacity="0.45"/>
    </svg>`,
  },
  {
    key: 'laurel',
    labelKey: 'decorationLaurel',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 150C50 120 70 90 80 60C90 30 100 18 140 14" stroke="currentColor" stroke-width="2" opacity="0.45" stroke-linecap="round"/>
      <g fill="currentColor">
        <ellipse cx="34" cy="134" rx="11" ry="5" transform="rotate(50 34 134)" opacity="0.8"/>
        <ellipse cx="26" cy="124" rx="11" ry="5" transform="rotate(-130 26 124)" opacity="0.8"/>
        <ellipse cx="50" cy="112" rx="11" ry="5" transform="rotate(45 50 112)" opacity="0.75"/>
        <ellipse cx="40" cy="104" rx="11" ry="5" transform="rotate(-135 40 104)" opacity="0.75"/>
        <ellipse cx="64" cy="90" rx="10" ry="4.5" transform="rotate(40 64 90)" opacity="0.7"/>
        <ellipse cx="56" cy="82" rx="10" ry="4.5" transform="rotate(-140 56 82)" opacity="0.7"/>
        <ellipse cx="80" cy="64" rx="10" ry="4.5" transform="rotate(30 80 64)" opacity="0.65"/>
        <ellipse cx="74" cy="56" rx="10" ry="4.5" transform="rotate(-150 74 56)" opacity="0.65"/>
        <ellipse cx="98" cy="40" rx="9" ry="4" transform="rotate(20 98 40)" opacity="0.6"/>
        <ellipse cx="94" cy="32" rx="9" ry="4" transform="rotate(-160 94 32)" opacity="0.6"/>
      </g>
    </svg>`,
  },
  {
    key: 'confetti',
    labelKey: 'decorationConfetti',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="140" r="5" fill="currentColor" opacity="0.85"/>
      <circle cx="48" cy="118" r="3" fill="currentColor" opacity="0.6"/>
      <rect x="60" y="98" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.7" transform="rotate(20 64 102)"/>
      <circle cx="84" cy="80" r="4" fill="currentColor" opacity="0.5"/>
      <rect x="34" y="96" width="6" height="6" rx="1.2" fill="currentColor" opacity="0.55" transform="rotate(-15 37 99)"/>
      <circle cx="106" cy="58" r="3.5" fill="currentColor" opacity="0.65"/>
      <circle cx="120" cy="36" r="5" fill="currentColor" opacity="0.8"/>
      <rect x="96" y="34" width="7" height="7" rx="1.4" fill="currentColor" opacity="0.5" transform="rotate(35 99 37)"/>
      <circle cx="134" cy="60" r="2.5" fill="currentColor" opacity="0.45"/>
      <circle cx="10" cy="116" r="2.5" fill="currentColor" opacity="0.5"/>
    </svg>`,
  },
  {
    key: 'artdeco',
    labelKey: 'decorationArtdeco',
    svg: `<svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" stroke-linecap="round">
        <path d="M0 160 L40 12" stroke-width="2" opacity="0.55"/>
        <path d="M0 160 L60 30" stroke-width="2" opacity="0.7"/>
        <path d="M0 160 L90 50" stroke-width="2" opacity="0.6"/>
        <path d="M0 160 L115 80" stroke-width="2" opacity="0.5"/>
        <path d="M0 160 L130 115" stroke-width="2" opacity="0.4"/>
      </g>
      <path d="M10 150 A130 130 0 0 1 140 60" stroke="currentColor" stroke-width="1.5" opacity="0.35" fill="none"/>
      <path d="M2 130 A150 150 0 0 1 130 8" stroke="currentColor" stroke-width="1.5" opacity="0.25" fill="none"/>
      <circle cx="0" cy="160" r="4" fill="currentColor" opacity="0.6"/>
    </svg>`,
  },
];

// `arrowAngle` rotates a single up-pointing arrow icon to face each corner,
// so the position picker shows visually where the decoration will land.
export const DECORATION_POSITIONS = [
  { key: 'top-left', labelKey: 'positionTopLeft', arrowAngle: -45 },
  { key: 'top-center', labelKey: 'positionTopCenter', arrowAngle: 0 },
  { key: 'top-right', labelKey: 'positionTopRight', arrowAngle: 45 },
  { key: 'bottom-left', labelKey: 'positionBottomLeft', arrowAngle: -135 },
  { key: 'bottom-right', labelKey: 'positionBottomRight', arrowAngle: 135 },
];

// Each preset is drawn assuming it emerges from the bottom-left corner —
// mirroring it horizontally/vertically reuses the same artwork for every
// corner. A custom uploaded image is never mirrored, since it's the
// couple's own picture and should appear exactly as given.
const POSITION_LAYOUT = {
  'top-left': { top: '0', left: '0', mirrorX: false, mirrorY: true },
  'top-center': { top: '0', left: '50%', centerX: true, mirrorX: false, mirrorY: true },
  'top-right': { top: '0', right: '0', mirrorX: true, mirrorY: true },
  'bottom-left': { bottom: '0', left: '0', mirrorX: false, mirrorY: false },
  'bottom-right': { bottom: '0', right: '0', mirrorX: true, mirrorY: false },
};

export function getDecorationElement(key) {
  return DECORATION_ELEMENTS.find((d) => d.key === key) || null;
}

export function getDefaultDecoration() {
  return { element: 'none', positions: ['top-right'], customImage: null };
}

// Older saved themes stored a single `position` string — fold that into the
// new `positions` array so existing weddings keep their chosen corner.
export function normalizeDecoration(decoration) {
  const deco = decoration || {};
  let positions = Array.isArray(deco.positions) && deco.positions.length
    ? deco.positions
    : (deco.position ? [deco.position] : getDefaultDecoration().positions);
  positions = positions.filter((key) => POSITION_LAYOUT[key]);
  if (positions.length === 0) positions = getDefaultDecoration().positions;
  return {
    element: deco.element || 'none',
    positions,
    customImage: deco.customImage || null,
  };
}

export function applyGuestDecoration(decoration, mountEl) {
  if (!mountEl) return;
  const deco = normalizeDecoration(decoration);
  mountEl.innerHTML = '';

  if (!deco.element || deco.element === 'none') return;

  const isCustom = deco.element === 'custom' && deco.customImage;
  if (!isCustom && deco.element !== 'custom' && !getDecorationElement(deco.element)) return;
  if (deco.element === 'custom' && !deco.customImage) return;

  const preset = !isCustom ? getDecorationElement(deco.element) : null;

  deco.positions.forEach((positionKey) => {
    const layout = POSITION_LAYOUT[positionKey] || POSITION_LAYOUT['top-right'];
    const item = document.createElement('div');
    item.className = 'guest-decoration-item';
    if (layout.top != null) item.style.top = layout.top;
    if (layout.bottom != null) item.style.bottom = layout.bottom;
    if (layout.left != null) item.style.left = layout.left;
    if (layout.right != null) item.style.right = layout.right;

    const transforms = [];
    if (layout.centerX) transforms.push('translateX(-50%)');
    if (!isCustom) {
      if (layout.mirrorX) transforms.push('scaleX(-1)');
      if (layout.mirrorY && !(preset && preset.noMirrorY)) transforms.push('scaleY(-1)');
    }
    item.style.transform = transforms.join(' ');

    if (isCustom) {
      const img = document.createElement('img');
      img.src = deco.customImage;
      img.alt = '';
      item.appendChild(img);
    } else {
      item.innerHTML = preset.svg;
    }
    mountEl.appendChild(item);
  });
}
