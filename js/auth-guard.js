// Shared Firebase Auth helper for the superadmin-only pages (admin.html,
// partners-admin.html). There is no per-couple login in this app — weddings
// are accessed via their link/id — so this is the only thing that can tell
// "the app owner" apart from anyone else, and it gates the Firestore
// operations that the rules require auth for (listing/creating/deleting
// weddings, managing partners, reading click stats).
import { app } from './firebase-config.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

export const auth = getAuth(app);

// Resolves once with the current user (or null) on the first auth check —
// callers await this before deciding whether to show the login form or the
// real page content.
export function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function signIn(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (err) {
    return { ok: false, code: err.code || '' };
  }
}

export function signOutUser() {
  return signOut(auth);
}
