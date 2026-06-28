// Central registry of toggleable features. To add a new toggleable feature
// later, just add an entry here (with its i18n label key and a small icon)
// and call `isFeatureEnabled(wedding, key)` wherever that feature is gated —
// the super-admin features modal in admin.js picks up new entries automatically.
export const FEATURE_FLAGS = [
  {
    key: 'bulkImport',
    labelKey: 'featureBulkImport',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>',
  },
  {
    key: 'floorPlan',
    labelKey: 'featureFloorPlan',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
  },
  {
    key: 'themeCustomization',
    labelKey: 'featureThemeCustomization',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.4 0-1.1.9-2 2-2h2.4a3.6 3.6 0 0 0 3.6-3.6C21 6.8 17 2 12 2z"/><circle cx="7.5" cy="10.5" r="1.2" fill="currentColor"/><circle cx="11" cy="6.8" r="1.2" fill="currentColor"/><circle cx="15.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="17.5" cy="11.8" r="1.2" fill="currentColor"/></svg>',
  },
  {
    key: 'qrShare',
    labelKey: 'featureQrShare',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 17h3v3h-3z"/><path d="M21 14v3"/><path d="M14 21h3"/></svg>',
  },
  {
    key: 'wayfindingGps',
    labelKey: 'featureWayfindingGps',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  },
  {
    key: 'sponsorPartners',
    labelKey: 'featureSponsorPartners',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="8" r="3.2"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5"/><path d="M11 20c0-3 2.5-5 5-5s5 2 5 5"/></svg>',
  },
  {
    key: 'poster',
    labelKey: 'featurePoster',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="16" rx="1"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>',
  },
  {
    key: 'menuManagement',
    labelKey: 'featureMenuManagement',
    default: true,
    icon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
  },
];

export function isFeatureEnabled(wedding, key) {
  const flag = FEATURE_FLAGS.find((f) => f.key === key);
  const fallback = flag ? flag.default : true;
  if (!wedding || !wedding.features || wedding.features[key] === undefined) return fallback;
  return !!wedding.features[key];
}
