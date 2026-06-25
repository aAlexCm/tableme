// Pairs a native `<input type="color">` swatch with a plain text hex field,
// so users can type/paste an exact hex code instead of only using the
// browser's RGB/HSL picker UI.
export function normalizeHex(value) {
  let v = (value || '').trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return v;
}

export function isValidHex(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function wireColorHexPair(colorInput, hexInput) {
  hexInput.value = colorInput.value.toUpperCase();

  colorInput.addEventListener('input', () => {
    hexInput.value = colorInput.value.toUpperCase();
  });

  hexInput.addEventListener('input', () => {
    const normalized = normalizeHex(hexInput.value);
    if (isValidHex(normalized) && normalized.toLowerCase() !== colorInput.value.toLowerCase()) {
      colorInput.value = normalized;
      colorInput.dispatchEvent(new Event('input', { bubbles: true }));
      colorInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  hexInput.addEventListener('blur', () => {
    hexInput.value = colorInput.value.toUpperCase();
  });
}
