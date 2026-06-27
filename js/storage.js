// Couche d'accès aux données, stockées dans Firestore.
import { db } from './firebase-config.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function normalize(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const weddingsCol = collection(db, 'weddings');
const partnersCol = collection(db, 'partners');
const partnerClicksCol = collection(db, 'partnerClicks');

export const Storage = {
  async getWeddings() {
    const snap = await getDocs(weddingsCol);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getWedding(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, 'weddings', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async addWedding(name, date, lang = 'fr') {
    const ref = await addDoc(weddingsCol, { name, date, lang, guests: [] });
    return { id: ref.id, name, date, lang, guests: [] };
  },

  async deleteWedding(weddingId) {
    await deleteDoc(doc(db, 'weddings', weddingId));
  },

  async updateWeddingLang(weddingId, lang) {
    await updateDoc(doc(db, 'weddings', weddingId), { lang });
  },

  async updateWeddingDate(weddingId, date) {
    await updateDoc(doc(db, 'weddings', weddingId), { date });
  },

  async setPoster(weddingId, poster) {
    await updateDoc(doc(db, 'weddings', weddingId), { poster });
  },

  async addGuest(weddingId, name, table) {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;
    const guest = { id: generateId(), name, table };
    const guests = [...wedding.guests, guest];
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
    return guest;
  },

  async addGuests(weddingId, entries) {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return [];
    const newGuests = entries.map((e) => ({ id: generateId(), name: e.name, table: e.table }));
    const guests = [...wedding.guests, ...newGuests];
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
    return newGuests;
  },

  async deleteGuest(weddingId, guestId) {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return;
    const guests = wedding.guests.filter((g) => g.id !== guestId);
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
  },

  async setGuests(weddingId, guests) {
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
  },

  async setTables(weddingId, tables) {
    await updateDoc(doc(db, 'weddings', weddingId), { tables });
  },

  async setLandmarks(weddingId, landmarks) {
    await updateDoc(doc(db, 'weddings', weddingId), { landmarks });
  },

  async setTasks(weddingId, tasks) {
    await updateDoc(doc(db, 'weddings', weddingId), { tasks });
  },

  // Separate from setTasks: marks the wedding as having received its
  // one-time default checklist, so an empty list later (the couple cleared
  // everything) is never confused with "never seeded" again.
  async seedTasks(weddingId, tasks) {
    await updateDoc(doc(db, 'weddings', weddingId), { tasks, tasksSeeded: true });
  },

  async setTheme(weddingId, theme) {
    await updateDoc(doc(db, 'weddings', weddingId), { theme });
  },

  async setFeatures(weddingId, features) {
    await updateDoc(doc(db, 'weddings', weddingId), { features });
  },

  async setLocation(weddingId, location) {
    await updateDoc(doc(db, 'weddings', weddingId), { location });
  },

  async setBoard(weddingId, { guests, tables }) {
    await updateDoc(doc(db, 'weddings', weddingId), { guests, tables });
  },

  async getPartners() {
    const snap = await getDocs(partnersCol);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async addPartner(partner) {
    const ref = await addDoc(partnersCol, partner);
    return { id: ref.id, ...partner };
  },

  async updatePartner(partnerId, partner) {
    await updateDoc(doc(db, 'partners', partnerId), partner);
  },

  async deletePartner(partnerId) {
    await deleteDoc(doc(db, 'partners', partnerId));
  },

  // Best-effort analytics: a logging failure should never break the guest's
  // browsing experience, so this swallows its own errors instead of throwing.
  async logPartnerEvent(event) {
    try {
      await addDoc(partnerClicksCol, { ...event, createdAt: Date.now() });
    } catch (err) {
      console.warn('logPartnerEvent failed', err);
    }
  },

  async getPartnerClicks() {
    const snap = await getDocs(partnerClicksCol);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};
