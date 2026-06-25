import { normalize } from './storage.js';

// Static taxonomies for the partners feature. The actual partner records
// live in Firestore (managed from partners-admin.html) — this file only
// holds the fixed lists of categories/icons an admin can pick from, plus the
// geo-matching rule shared by the admin page and the couple-facing page.
export const PARTNER_CATEGORIES = {
  transport: { labelKey: 'partnerCategoryTransport' },
  animation: { labelKey: 'partnerCategoryAnimation' },
  decoration: { labelKey: 'partnerCategoryDecoration' },
  catering: { labelKey: 'partnerCategoryCatering' },
  photography: { labelKey: 'partnerCategoryPhotography' },
  music: { labelKey: 'partnerCategoryMusic' },
  beauty: { labelKey: 'partnerCategoryBeauty' },
  other: { labelKey: 'partnerCategoryOther' },
};

export const PARTNER_ICONS = [
  {
    key: 'car',
    labelKey: 'partnerIconCar',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M5 17a2 2 0 0 1-2-2v-2l2-5a2 2 0 0 1 2-1h6a2 2 0 0 1 2 1l2 5v2a2 2 0 0 1-2 2"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/></svg>',
  },
  {
    key: 'music',
    labelKey: 'partnerIconMusic',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  },
  {
    key: 'camera',
    labelKey: 'partnerIconCamera',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="4"/></svg>',
  },
  {
    key: 'flower',
    labelKey: 'partnerIconFlower',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v6"/><path d="M12 9c-2 0-4 1.5-4 4s2 4 4 4 4-1.5 4-4-2-4-4-4z"/><path d="M9 21h6"/><path d="M12 17v4"/></svg>',
  },
  {
    key: 'cake',
    labelKey: 'partnerIconCake',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 14a3 3 0 0 0 3-2 3 3 0 0 0 3 2 3 3 0 0 0 3-2 3 3 0 0 0 3 2"/><path d="M12 8V5"/><path d="M12 5c-1 0-1.5-.6-1.5-1.3S11.3 2 12 2s1.5.4 1.5 1.2S13 5 12 5z"/></svg>',
  },
  {
    key: 'ring',
    labelKey: 'partnerIconRing',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="15" r="5"/><circle cx="17" cy="13" r="5"/><path d="M9 10 12 4l3 6"/></svg>',
  },
  {
    key: 'sparkle',
    labelKey: 'partnerIconSparkle',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="M5.5 5.5l2.8 2.8"/><path d="M15.7 15.7l2.8 2.8"/><path d="M18.5 5.5l-2.8 2.8"/><path d="M8.3 15.7l-2.8 2.8"/></svg>',
  },
  {
    key: 'building',
    labelKey: 'partnerIconBuilding',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 21v-4h6v4"/><path d="M8 7h.01"/><path d="M12 7h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M12 11h.01"/><path d="M16 11h.01"/></svg>',
  },
  {
    key: 'gift',
    labelKey: 'partnerIconGift',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7"/><path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 1 0 0-5C14 3 12 8 12 8"/></svg>',
  },
  {
    key: 'megaphone',
    labelKey: 'partnerIconMegaphone',
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 4.5a1 1 0 0 0 1.5-.8V6.3a1 1 0 0 0-1.5-.8L6 10H4a1 1 0 0 0-1 1Z"/><path d="M15 8a3 3 0 0 1 0 8"/><path d="M18 5a7 7 0 0 1 0 14"/></svg>',
  },
];

export function getPartnerIcon(key) {
  return PARTNER_ICONS.find((icon) => icon.key === key) || null;
}

// A partner targets a country (always), optionally narrowed to a region,
// optionally narrowed further to a city — so it only ever matches weddings
// at or below the specificity level the admin chose.
export function matchesLocation(partner, location) {
  const geo = partner && partner.geo;
  if (!geo || !geo.country || !location || !location.country) return false;
  if (normalize(geo.country) !== normalize(location.country)) return false;
  if (geo.region && normalize(geo.region) !== normalize(location.region)) return false;
  if (geo.city && normalize(geo.city) !== normalize(location.city)) return false;
  return true;
}
