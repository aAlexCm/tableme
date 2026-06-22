export const LANDMARK_TYPES = [
  {
    type: 'entrance',
    labelKey: 'landmarkEntrance',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M10 12h11"/><path d="M17 9l3 3-3 3"/></svg>',
  },
  {
    type: 'restrooms',
    labelKey: 'landmarkRestrooms',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="3"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/></svg>',
  },
  {
    type: 'bar',
    labelKey: 'landmarkBar',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16l-8 9z"/><path d="M12 13v7"/><path d="M8 20h8"/></svg>',
  },
  {
    type: 'candyBar',
    labelKey: 'landmarkCandyBar',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M12 13v8"/></svg>',
  },
  {
    type: 'photobooth',
    labelKey: 'landmarkPhotobooth',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.3-2.4A1 1 0 0 1 10.2 4h3.6a1 1 0 0 1 .9.6L16 7"/></svg>',
  },
  {
    type: 'coatCheck',
    labelKey: 'landmarkCoatCheck',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="1.5"/><path d="M12 6v2"/><path d="M3 18l9-7 9 7"/><path d="M5 18h14"/></svg>',
  },
  {
    type: 'danceFloor',
    labelKey: 'landmarkDanceFloor',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  },
  {
    type: 'gifts',
    labelKey: 'landmarkGifts',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18"/><path d="M12 8v13"/><path d="M7.5 8a2.5 2.5 0 1 1 4.5-2c0 1.1-2 2-4.5 2z"/><path d="M16.5 8a2.5 2.5 0 1 0-4.5-2c0 1.1 2 2 4.5 2z"/></svg>',
  },
  {
    type: 'parking',
    labelKey: 'landmarkParking',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h3.5a3 3 0 0 1 0 6H9"/></svg>',
  },
];

export function getLandmarkType(type) {
  return LANDMARK_TYPES.find((lt) => lt.type === type) || LANDMARK_TYPES[0];
}
