// One protocol assignment: its fields, its attempts subcollection, and the
// status change the athlete makes themselves (FR-29).
import { getAssignment, listAttempts, setStatus, addAttempt,
         STATUS_LABEL, fmtDate, mins, doc, db, COL } from "./db.js";
import { updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const el = id => document.getElementById(id);
const statusEl = el("status");
const id = new URLSearchParams(location.search).get("id");

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

if (!id) {
  el("head").innerHTML = '<h1>No record chosen</h1><p class="muted">Open this page from the list.</p>';
} else {
  await load();
}

async function load() {
  try {
    const a = await getAssignment(id);
    if (!a) {
      el("head").innerHTML = '<h1>Not found</h1><p class="muted">No document with id <code>' +
        esc(id) + "</code> exists in protocolAssignments.</p>";
      return;
    }
    el("head").innerHTML =
      '<span class="camp">' + esc(a.targetDomain || "—") + " · " + fmtDate(a.assignedOn) + "</span>" +
      '<h1 style="margin-top:16px">' + esc(a.title || a.protocolName) + "</h1>" +
      '<p><span class="pill ' + esc(a.status) + '">' +
        esc(STATUS_LABEL[a.status] || a.status) + "</span></p>";

    el("fields").innerHTML = [
      ["Athlete", esc(a.athleteName) + ' <small class="muted">' + esc(a.athleteId) + "</small>"],
      ["Protocol", esc(a.protocolName) + ' <small class="muted">' + esc(a.protocolId) + "</small>"],
      ["Target domain", esc(a.targetDomain)],
      ["Date assigned", fmtDate(a.assignedOn)],
      ["Planned duration", mins(a.plannedDurationSec)],
      ["Status", esc(STATUS_LABEL[a.status] || a.status)],
      ["Status changed by", esc(a.statusChangedBy || "\u2014 nobody yet, it is still pending")],
      ["Document id", "<code>" + esc(a.id) + "</code>"]
    ].map(([k, v]) => '<div class="kv"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>").join("");

    el("howItFelt").value = a.howItFelt || "";
    el("body").hidden = false;

    const attempts = await listAttempts(id);
    el("attempts").innerHTML = attempts.length
      ? attempts.map((t, i) =>
          '<div class="kv"><span class="k">Attempt ' + (i + 1) + " · " + fmtDate(t.startedAt) +
          '</span><span class="v">' + Math.round((t.elapsedSec || 0) / 60) + " min · " +
          esc(t.outcome || "—") + "</span></div>").join("")
      : '<p class="muted" style="margin:0">No attempt recorded yet.</p>';
  } catch (e) {
    statusEl.textContent = "Firestore error: " + e.message;
    statusEl.className = "status err";
  }
}

async function change(newStatus, outcome) {
  statusEl.textContent = "Updating…";
  statusEl.className = "status busy";
  try {
    await setStatus(id, newStatus);
    await addAttempt(id, {
      startedAt: new Date().toISOString().slice(0, 10),
      elapsedSec: newStatus === "completed" ? 300 : 0,
      outcome,
      note: "Recorded from the detail page"
    });
    statusEl.textContent = "Status is now " + newStatus + ".";
    statusEl.className = "status ok";
    await load();
  } catch (e) {
    statusEl.textContent = "Update failed: " + e.message;
    statusEl.className = "status err";
  }
}

el("mkDone").addEventListener("click", () => change("completed", "finished the timer"));
el("mkSkip").addEventListener("click", () => change("skipped", "skipped tonight"));

el("saveNote").addEventListener("click", async () => {
  statusEl.textContent = "Saving note…";
  statusEl.className = "status busy";
  try {
    await updateDoc(doc(db, COL.assignments, id), {
      howItFelt: el("howItFelt").value.trim(),
      noteUpdatedAt: serverTimestamp()
    });
    statusEl.textContent = "Note saved.";
    statusEl.className = "status ok";
  } catch (e) {
    statusEl.textContent = "Save failed: " + e.message;
    statusEl.className = "status err";
  }
});
