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
  runTransaction,
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

// Every list-shaped field below (guests, tables, tasks, customCategories,
// menus, landmarks) can be edited from several pages, and sometimes from two
// tabs/devices at once. A plain updateDoc(fullArray) is a blind overwrite: it
// has no idea what's on the server right now, so two near-simultaneous edits
// can silently stomp each other (the second write wins, the first is lost).
// runTransaction re-reads the field at write time and retries automatically
// if another write landed in between, so `mutate` must be a pure function of
// the current array — it can run more than once per call.
async function mutateField(weddingId, fieldName, mutate, extraFields) {
  const ref = doc(db, 'weddings', weddingId);
  let result;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`wedding ${weddingId} not found`);
    result = mutate(snap.data()[fieldName] || []);
    tx.update(ref, { [fieldName]: result, ...(extraFields || {}) });
  });
  return result;
}

async function mutateGuestsAndTables(weddingId, mutate) {
  const ref = doc(db, 'weddings', weddingId);
  let result;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`wedding ${weddingId} not found`);
    const data = snap.data();
    result = mutate(data.guests || [], data.tables || []);
    tx.update(ref, { guests: result.guests, tables: result.tables });
  });
  return result;
}

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

  // `mutate` receives the *current server* guests array and must return the
  // next array — see the comment on mutateField above for why this can't
  // just be a precomputed array.
  async mutateGuests(weddingId, mutate) {
    return mutateField(weddingId, 'guests', mutate);
  },

  async mutateTables(weddingId, mutate) {
    return mutateField(weddingId, 'tables', mutate);
  },

  async mutateGuestsAndTables(weddingId, mutate) {
    return mutateGuestsAndTables(weddingId, mutate);
  },

  async mutateLandmarks(weddingId, mutate) {
    return mutateField(weddingId, 'landmarks', mutate);
  },

  async mutateTasks(weddingId, mutate) {
    return mutateField(weddingId, 'tasks', mutate);
  },

  async mutateCustomCategories(weddingId, mutate) {
    return mutateField(weddingId, 'customCategories', mutate);
  },

  // Separate from mutateTasks: marks the wedding as having received its
  // one-time default checklist, so an empty list later (the couple cleared
  // everything) is never confused with "never seeded" again.
  async seedTasks(weddingId, tasks) {
    return mutateField(weddingId, 'tasks', () => tasks, { tasksSeeded: true });
  },

  async mutateMenus(weddingId, mutate) {
    return mutateField(weddingId, 'menus', mutate);
  },

  async addGuest(weddingId, name, table, phone) {
    const guest = { id: generateId(), name, table };
    if (phone) guest.phone = phone;
    await this.mutateGuests(weddingId, (guests) => [...guests, guest]);
    return guest;
  },

  async addGuests(weddingId, entries) {
    const newGuests = entries.map((e) => {
      const guest = { id: generateId(), name: e.name, table: e.table };
      if (e.phone) guest.phone = e.phone;
      return guest;
    });
    await this.mutateGuests(weddingId, (guests) => [...guests, ...newGuests]);
    return newGuests;
  },

  async deleteGuest(weddingId, guestId) {
    await this.mutateGuests(weddingId, (guests) => guests.filter((g) => g.id !== guestId));
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
