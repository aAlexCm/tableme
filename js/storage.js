// Couche d'accès aux données, stockées dans localStorage.
const STORAGE_KEY = 'tableme_weddings';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalize(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const Storage = {
  getWeddings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Erreur de lecture du localStorage', e);
      return [];
    }
  },

  saveWeddings(weddings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weddings));
  },

  getWedding(id) {
    return this.getWeddings().find((w) => w.id === id) || null;
  },

  addWedding(name, date) {
    const weddings = this.getWeddings();
    const wedding = { id: generateId(), name, date, guests: [] };
    weddings.push(wedding);
    this.saveWeddings(weddings);
    return wedding;
  },

  deleteWedding(weddingId) {
    const weddings = this.getWeddings().filter((w) => w.id !== weddingId);
    this.saveWeddings(weddings);
  },

  addGuest(weddingId, name, table) {
    const weddings = this.getWeddings();
    const wedding = weddings.find((w) => w.id === weddingId);
    if (!wedding) return null;
    const guest = { id: generateId(), name, table };
    wedding.guests.push(guest);
    this.saveWeddings(weddings);
    return guest;
  },

  deleteGuest(weddingId, guestId) {
    const weddings = this.getWeddings();
    const wedding = weddings.find((w) => w.id === weddingId);
    if (!wedding) return;
    wedding.guests = wedding.guests.filter((g) => g.id !== guestId);
    this.saveWeddings(weddings);
  },

  findGuests(weddingId, query) {
    const wedding = this.getWedding(weddingId);
    if (!wedding) return [];
    const q = normalize(query);
    if (!q) return [];
    return wedding.guests.filter((g) => normalize(g.name).includes(q));
  },
};
