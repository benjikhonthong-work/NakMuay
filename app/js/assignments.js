// Protocol list page — reads protocolAssignments from Firestore, newest first.
import { listAssignments, STATUS_LABEL, fmtDate, mins } from "./db.js";

const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
let rows = [];
let filter = "all";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render() {
  const shown = filter === "all" ? rows : rows.filter(r => r.status === filter);
  if (!shown.length) {
    listEl.innerHTML = '<div class="empty"><p style="margin:0">Nothing here yet.</p>' +
      '<p class="muted" style="margin:8px 0 0">Open <a href="seed.html">Seed data</a> to load the sample records.</p></div>';
    return;
  }
  listEl.innerHTML = shown.map(r => {
    const felt = r.howItFelt
      ? '<p class="felt">' + esc(r.howItFelt) + "</p>"
      : '<p class="felt" style="color:var(--text-3)">No note written yet.</p>';
    return '<a class="row" href="assignment-detail.html?id=' + encodeURIComponent(r.id) + '">' +
      '<div class="head">' +
        '<span class="t">' + esc(r.title || r.protocolName || "Untitled") + "</span>" +
        '<span class="pill ' + esc(r.status) + '">' + esc(STATUS_LABEL[r.status] || r.status) + "</span>" +
      "</div>" +
      '<div class="meta">' +
        "<span>" + esc(r.athleteName || "—") + "</span>" +
        "<span>" + esc(r.targetDomain || "—") + "</span>" +
        "<span>" + fmtDate(r.assignedOn) + "</span>" +
        "<span>" + mins(r.plannedDurationSec) + "</span>" +
      "</div>" + felt + "</a>";
  }).join("");
}

document.getElementById("filters").addEventListener("click", e => {
  const b = e.target.closest(".chip");
  if (!b) return;
  document.querySelectorAll("#filters .chip").forEach(c => c.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  filter = b.dataset.f;
  render();
});

statusEl.textContent = "Loading from Firestore…";
statusEl.className = "status busy";
try {
  rows = await listAssignments();
  render();
  statusEl.textContent = "Read " + rows.length + " documents from protocolAssignments.";
  statusEl.className = "status ok";
} catch (e) {
  listEl.innerHTML = '<p class="muted" style="margin:0">Could not load the list.</p>';
  statusEl.textContent = "Firestore error: " + e.message +
    " — check that the database exists and the collection is spelled protocolAssignments.";
  statusEl.className = "status err";
}
