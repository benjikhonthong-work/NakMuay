// One-button sample data loader for the NakMuay homework database.
//
// Every document uses a FIXED id (a001, p001, pa001 ...). Firestore setDoc
// overwrites a document with the same id, so pressing the button twice does
// NOT create duplicates — it just rewrites the same rows. That is why the
// seeder uses setDoc and never addDoc.
//
// Field names here match app/js/*.js exactly. If you rename a field, rename it
// in docs/02-design/02-technical/data-model-firestore.md too.
import { db, COL, collection, doc, setDoc, writeBatch, serverTimestamp } from "./db.js";

/* ---------------------------------------------------------------- athletes */
// The person the data belongs to. The owner field elsewhere is athleteId.
const ATHLETES = [
  { id: "a001", name: "Somchai Wongsa",    weightClass: "Super lightweight (63.5 kg)", stance: "Orthodox", campPhase: "Build",      fightDate: "2026-10-08", yearsPro: 7 },
  { id: "a002", name: "Anan Petchdam",     weightClass: "Bantamweight (53.5 kg)",      stance: "Southpaw", campPhase: "Weight cut", fightDate: "2026-09-19", yearsPro: 4 },
  { id: "a003", name: "Kiattisak Rungroj", weightClass: "Welterweight (66.7 kg)",      stance: "Orthodox", campPhase: "Off-camp",   fightDate: null,        yearsPro: 11 }
];

/* --------------------------------------------------------------- protocols */
// The category / lookup collection. One protocol targets exactly one domain,
// because the app never averages domains (FR-23) — it works on the lowest one.
const PROTOCOLS = [
  { id: "p001", name: "Neuro deload",    targetDomain: "Brain",         defaultDurationSec: 1200, load: "Very light",
    summary: "No sparring, no head contact. Shadow boxing at 50% and ten minutes of quiet breathing.",
    useWhen: "Brain is the limiting factor after sparring in the last 72 hours." },
  { id: "p002", name: "Sleep extension", targetDomain: "Sleep & Heart", defaultDurationSec: 2700, load: "Rest",
    summary: "Lights out 45 minutes earlier, screens off one hour before, room under 24 degrees.",
    useWhen: "Sleep & Heart is the limiting factor two days in a row." },
  { id: "p003", name: "Fuel top-up",     targetDomain: "Fuel & Weight", defaultDurationSec: 900,  load: "Rest",
    summary: "Carbohydrate and fluid top-up spread across the day. Never used to cut weight faster.",
    useWhen: "Fuel & Weight is the limiting factor and the athlete is not inside a weigh-in window." }
];

/* ----------------------------------------------------- protocol assignments */
// The MAIN collection of the homework: one protocol given to one athlete on
// one day (FR-28). The athlete moves it pending -> completed / skipped
// themselves; there is no approver anywhere in this system.
const ASSIGNMENTS = [
  { id: "pa001", athleteId: "a001", athleteName: "Somchai Wongsa",
    protocolId: "p001", protocolName: "Neuro deload",    title: "Neuro deload",
    targetDomain: "Brain",         assignedOn: "2026-09-04", plannedDurationSec: 1200,
    status: "pending",   limitingFactorLevel: 2, howItFelt: "" },

  { id: "pa002", athleteId: "a002", athleteName: "Anan Petchdam",
    protocolId: "p003", protocolName: "Fuel top-up",     title: "Fuel top-up",
    targetDomain: "Fuel & Weight", assignedOn: "2026-09-03", plannedDurationSec: 900,
    status: "pending",   limitingFactorLevel: 2, howItFelt: "" },

  { id: "pa003", athleteId: "a003", athleteName: "Kiattisak Rungroj",
    protocolId: "p002", protocolName: "Sleep extension", title: "Sleep extension",
    targetDomain: "Sleep & Heart", assignedOn: "2026-09-02", plannedDurationSec: 2700,
    status: "pending",   limitingFactorLevel: 3, howItFelt: "" },

  { id: "pa004", athleteId: "a001", athleteName: "Somchai Wongsa",
    protocolId: "p002", protocolName: "Sleep extension", title: "Sleep extension",
    targetDomain: "Sleep & Heart", assignedOn: "2026-09-01", plannedDurationSec: 2700,
    status: "completed", limitingFactorLevel: 2,
    howItFelt: "Went to bed at 22:15 instead of 23:00. Woke up once instead of three times. Legs were still heavy on the first round of pads, but the head felt clear, which is the part that was missing last week." },

  { id: "pa005", athleteId: "a002", athleteName: "Anan Petchdam",
    protocolId: "p001", protocolName: "Neuro deload",    title: "Neuro deload",
    targetDomain: "Brain",         assignedOn: "2026-08-31", plannedDurationSec: 1200,
    status: "skipped",   limitingFactorLevel: 1,
    howItFelt: "Skipped it. The promoter moved media day to the same afternoon and I kept the shadow boxing session with the coach instead. Writing it down so the pattern shows up if it happens again." }
];

/* --------------------------------------------------------------- attempts */
// Subcollection under one assignment: each time the athlete actually did part
// of the protocol. Two under pa001, one under pa002.
const ATTEMPTS = {
  pa001: [
    { id: "at001", startedAt: "2026-09-04", elapsedSec: 720,  outcome: "stopped early",
      note: "Breathing only. The gym was loud, so the quiet part never really happened." },
    { id: "at002", startedAt: "2026-09-04", elapsedSec: 1200, outcome: "finished the timer",
      note: "Second try at home. Full twenty minutes, no screens." }
  ],
  pa002: [
    { id: "at003", startedAt: "2026-09-03", elapsedSec: 900,  outcome: "finished the timer",
      note: "Rice and electrolytes with lunch. Weight unchanged at the evening check." }
  ]
};

const log = [];
function say(el, msg, cls) {
  log.push(msg);
  el.innerHTML = log.map(l => "<div>" + l + "</div>").join("");
  el.className = "status " + (cls || "busy");
}

export async function seed(statusEl, btn) {
  log.length = 0;
  btn.disabled = true;
  try {
    say(statusEl, "Writing to project nakmuay-8f508 …");

    const batch = writeBatch(db);

    ATHLETES.forEach(({ id, ...rest }) => {
      batch.set(doc(db, COL.athletes, id), rest);
    });

    PROTOCOLS.forEach(({ id, ...rest }) => {
      batch.set(doc(db, COL.protocols, id), rest);
    });

    ASSIGNMENTS.forEach(({ id, ...rest }) => {
      batch.set(doc(db, COL.assignments, id), {
        ...rest,
        createdBy: "athlete",
        statusChangedBy: rest.status === "pending" ? null : "athlete",
        createdAt: serverTimestamp()
      });
    });

    Object.entries(ATTEMPTS).forEach(([assignmentId, rows]) => {
      rows.forEach(({ id, ...rest }) => {
        batch.set(doc(collection(db, COL.assignments, assignmentId, COL.attempts), id), rest);
      });
    });

    await batch.commit();

    say(statusEl, "athletes — " + ATHLETES.length + " documents");
    say(statusEl, "protocols — " + PROTOCOLS.length + " documents");
    say(statusEl, "protocolAssignments — " + ASSIGNMENTS.length + " documents (3 pending · 1 completed · 1 skipped)");
    say(statusEl, "attempts — 2 under pa001, 1 under pa002");
    say(statusEl, "Done. Open the Protocols page to see them.", "ok");
  } catch (err) {
    console.error(err);
    say(statusEl, "Failed: " + err.message, "err");
  } finally {
    btn.disabled = false;
  }
}
