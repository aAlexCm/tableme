import { normalize } from './storage.js';

// Static taxonomies for the partners feature. The actual partner records
// live in Firestore (managed from partners-admin.html) — this file only
// holds the fixed lists of categories/icons an admin can pick from, plus the
// geo-matching rule shared by the admin page and the couple-facing page.
export const PARTNER_CATEGORIES = {
  transport: { labelKey: 'partnerCategoryTransport', color: 'violet' },
  animation: { labelKey: 'partnerCategoryAnimation', color: 'blue' },
  decoration: { labelKey: 'partnerCategoryDecoration', color: 'teal' },
  catering: { labelKey: 'partnerCategoryCatering', color: 'violet' },
  photography: { labelKey: 'partnerCategoryPhotography', color: 'blue' },
  music: { labelKey: 'partnerCategoryMusic', color: 'teal' },
  beauty: { labelKey: 'partnerCategoryBeauty', color: 'violet' },
  other: { labelKey: 'partnerCategoryOther', color: null },
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
    svg: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  },
];

export function getPartnerIcon(key) {
  return PARTNER_ICONS.find((icon) => icon.key === key) || null;
}

// Contact channels a partner can fill in — each renders as a small round
// icon button (linking out) on the couple-facing card when non-empty.
// `hrefPrefix` turns a raw phone number into a tel: link; the rest are
// expected to be full URLs pasted as-is.
export const CONTACT_CHANNELS = [
  {
    key: 'website',
    labelKey: 'partnerWebsiteLabel',
    placeholder: 'https://...',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>',
  },
  {
    key: 'phone',
    labelKey: 'partnerPhoneLabel',
    placeholder: '+33 6 12 34 56 78',
    hrefPrefix: 'tel:',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  },
  {
    key: 'whatsapp',
    labelKey: 'contactWhatsappLabel',
    placeholder: 'https://wa.me/33612345678',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  },
  {
    key: 'facebook',
    labelKey: 'contactFacebookLabel',
    placeholder: 'https://facebook.com/...',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M14 8h-2a2 2 0 0 0-2 2v2H8v3h2v6h3v-6h2l1-3h-3v-1a1 1 0 0 1 1-1h2z"/></svg>',
  },
  {
    key: 'instagram',
    labelKey: 'contactInstagramLabel',
    placeholder: 'https://instagram.com/...',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor"/></svg>',
  },
  {
    key: 'tiktok',
    labelKey: 'contactTiktokLabel',
    placeholder: 'https://tiktok.com/@...',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v9"/><circle cx="9" cy="14" r="3"/><path d="M12 8a4 4 0 0 0 4 4"/></svg>',
  },
  {
    key: 'youtube',
    labelKey: 'contactYoutubeLabel',
    placeholder: 'https://youtube.com/@...',
    hrefPrefix: '',
    svg: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
  },
];

export function buildContactHref(channelKey, value) {
  const channel = CONTACT_CHANNELS.find((c) => c.key === channelKey);
  if (!channel || !value) return '';
  return `${channel.hrefPrefix}${value}`;
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
