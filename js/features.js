// Central registry of toggleable features. To add a new toggleable feature
// later, just add an entry here (with its i18n label key) and call
// `isFeatureEnabled(wedding, key)` wherever that feature is gated — the
// super-admin features modal in admin.js picks up new entries automatically.
export const FEATURE_FLAGS = [
  { key: 'bulkImport', labelKey: 'featureBulkImport', default: true },
  { key: 'floorPlan', labelKey: 'featureFloorPlan', default: true },
  { key: 'themeCustomization', labelKey: 'featureThemeCustomization', default: true },
  { key: 'qrShare', labelKey: 'featureQrShare', default: true },
  { key: 'wayfindingGps', labelKey: 'featureWayfindingGps', default: true },
  { key: 'sponsorPartners', labelKey: 'featureSponsorPartners', default: true },
];

export function isFeatureEnabled(wedding, key) {
  const flag = FEATURE_FLAGS.find((f) => f.key === key);
  const fallback = flag ? flag.default : true;
  if (!wedding || !wedding.features || wedding.features[key] === undefined) return fallback;
  return !!wedding.features[key];
}
