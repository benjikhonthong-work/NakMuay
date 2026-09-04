// Single place where the app talks to Firestore.
// Every page imports from here so the collection names exist once only.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection names live here. Firestore is case sensitive — a typo fails silently.
export const COL = {
  athletes: "athletes",
  protocols: "protocols",
  assignments: "protocolAssignments",
  attempts: "attempts"           // subcollection under one assignment
};

export const STATUSES = ["pending", "completed", "skipped"];

export const STATUS_LABEL = {
  pending: "Pending",
  completed: "Completed",
  skipped: "Skipped"
};

/** All assignments, newest first (FR-28). */
export async function listAssignments() {
  const q = query(collection(db, COL.assignments), orderBy("assignedOn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAssignment(id) {
  const snap = await getDoc(doc(db, COL.assignments, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Attempts recorded under one assignment (FR-29). */
export async function listAttempts(assignmentId) {
  const q = query(
    collection(db, COL.assignments, assignmentId, COL.attempts),
    orderBy("startedAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listSimple(name, orderField) {
  const ref = collection(db, name);
  const snap = await getDocs(orderField ? query(ref, orderBy(orderField)) : ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createAssignment(data) {
  return addDoc(collection(db, COL.assignments), {
    ...data,
    createdAt: serverTimestamp()
  });
}

/** The athlete changes the status themselves. No approver exists in this system. */
export async function setStatus(id, status, extra = {}) {
  if (!STATUSES.includes(status)) throw new Error("Unknown status: " + status);
  return updateDoc(doc(db, COL.assignments, id), {
    status,
    statusChangedBy: "athlete",
    statusChangedAt: serverTimestamp(),
    ...extra
  });
}

export async function addAttempt(assignmentId, data) {
  return addDoc(collection(db, COL.assignments, assignmentId, COL.attempts), data);
}

export { collection, doc, setDoc, writeBatch, serverTimestamp };

/** Formats a Firestore timestamp or a yyyy-mm-dd string for display. */
export function fmtDate(v) {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v + "T00:00:00") : (v.toDate ? v.toDate() : v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function mins(sec) {
  if (sec == null) return "—";
  const m = Math.round(sec / 60);
  return m + (m === 1 ? " min" : " min");
}
