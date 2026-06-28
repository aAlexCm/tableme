export const COUNTRY_CODES = [
  { code: '33', flag: '🇫🇷', label: 'France' },
  { code: '40', flag: '🇷🇴', label: 'România' },
  { code: '32', flag: '🇧🇪', label: 'Belgique' },
  { code: '41', flag: '🇨🇭', label: 'Suisse' },
  { code: '352', flag: '🇱🇺', label: 'Luxembourg' },
  { code: '49', flag: '🇩🇪', label: 'Deutschland' },
  { code: '39', flag: '🇮🇹', label: 'Italia' },
  { code: '34', flag: '🇪🇸', label: 'España' },
  { code: '351', flag: '🇵🇹', label: 'Portugal' },
  { code: '44', flag: '🇬🇧', label: 'United Kingdom' },
  { code: '1', flag: '🇺🇸', label: 'US/Canada' },
];

export const DEFAULT_COUNTRY_CODE_BY_LANG = { fr: '33', ro: '40', en: '44' };

export function buildCountryCodeOptionsHtml(selectedCode) {
  return COUNTRY_CODES
    .map(({ code, flag }) => `<option value="${code}" ${code === selectedCode ? 'selected' : ''}>${flag} +${code}</option>`)
    .join('');
}

// Combines a country code with a locally-formatted number into a single
// stored string (e.g. "33" + "06 12 34 56 78" -> "+33612345678"), dropping
// the leading trunk zero that's implicit once a country code is present.
export function combinePhone(code, number) {
  const digits = (number || '').replace(/\D/g, '');
  if (!digits) return '';
  const national = digits.replace(/^0+/, '') || digits;
  return `+${code}${national}`;
}

// Splits a stored "+<code><number>" string back into its parts for editing.
// Falls back to putting the raw value in the number field when it doesn't
// start with a known country code, so unrecognised/legacy values aren't lost.
export function splitPhone(stored) {
  const value = (stored || '').trim();
  if (!value.startsWith('+')) return { code: '', number: value };
  const digits = value.slice(1);
  const match = COUNTRY_CODES
    .filter(({ code }) => digits.startsWith(code))
    .sort((a, b) => b.code.length - a.code.length)[0];
  if (!match) return { code: '', number: digits };
  return { code: match.code, number: digits.slice(match.code.length) };
}
