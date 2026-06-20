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

function generateId() {
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

  async addWedding(name, date) {
    const ref = await addDoc(weddingsCol, { name, date, guests: [] });
    return { id: ref.id, name, date, guests: [] };
  },

  async deleteWedding(weddingId) {
    await deleteDoc(doc(db, 'weddings', weddingId));
  },

  async addGuest(weddingId, name, table) {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return null;
    const guest = { id: generateId(), name, table };
    const guests = [...wedding.guests, guest];
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
    return guest;
  },

  async deleteGuest(weddingId, guestId) {
    const wedding = await this.getWedding(weddingId);
    if (!wedding) return;
    const guests = wedding.guests.filter((g) => g.id !== guestId);
    await updateDoc(doc(db, 'weddings', weddingId), { guests });
  },
};
