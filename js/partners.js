// Sponsor/partner listings shown to couples on the "Nos partenaires" page.
// This content is curated by TableMe itself (not per-wedding), so there's no
// Firestore collection for it — this array is the only thing to edit to add,
// remove, or update a partner. Replace the example entries below with real
// contacts whenever you're ready.
export const PARTNER_CATEGORIES = {
  transport: { labelKey: 'partnerCategoryTransport' },
  animation: { labelKey: 'partnerCategoryAnimation' },
  decoration: { labelKey: 'partnerCategoryDecoration' },
};

export const PARTNERS = [
  {
    id: 'example-car-rental',
    category: 'transport',
    name: 'Prestige Wedding Cars',
    description: 'Location de voitures de luxe avec chauffeur pour le jour J.',
    link: 'https://example.com',
  },
  {
    id: 'example-animation',
    category: 'animation',
    name: "Les Copains d'Abord",
    description: 'Animations, jeux et photobooth pour dynamiser votre soirée.',
    link: 'https://example.com',
  },
  {
    id: 'example-decoration',
    category: 'decoration',
    name: 'Fleurs & Cie',
    description: 'Décoration florale sur-mesure pour votre cérémonie et votre salle.',
    link: 'https://example.com',
  },
];
