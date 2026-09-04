// Create one protocol assignment. Enforces FR-28: one protocol per athlete per day.
import { listSimple, listAssignments, createAssignment, COL } from "./db.js";

const el = id => document.getElementById(id);
const statusEl = el("status");
let status = "pending";
let protocols = [];
let existing = [];

el("assignedOn").value = new Date().toISOString().slice(0, 10);

el("statusChips").addEventListener("click", e => {
  const b = e.target.closest(".chip");
  if (!b) return;
  document.querySelectorAll("#statusChips .chip").forEach(c => c.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
  status = b.dataset.s;
});

// Picking a protocol fills in its default duration and target domain.
el("protocol").addEventListener("change", () => {
  const p = protocols.find(x => x.id === el("protocol").value);
  if (p && p.defaultDurationSec) el("duration").value = Math.round(p.defaultDurationSec / 60);
});

try {
  statusEl.textContent = "Loading athletes and protocols…";
  statusEl.className = "status busy";
  const [athletes, protos, assigns] = await Promise.all([
    listSimple(COL.athletes, "name"),
    listSimple(COL.protocols, "name"),
    listAssignments()
  ]);
  protocols = protos;
  existing = assigns;

  if (!athletes.length || !protos.length) {
    statusEl.textContent = "No athletes or protocols found. Open the Seed data page first.";
    statusEl.className = "status err";
    el("save").disabled = true;
  } else {
    el("athlete").innerHTML = athletes
      .map(a => '<option value="' + a.id + '">' + a.name + "</option>").join("");
    el("protocol").innerHTML = protos
      .map(p => '<option value="' + p.id + '">' + p.name + " · " + p.targetDomain + "</option>").join("");
    el("protocol").dispatchEvent(new Event("change"));
    statusEl.textContent = "";
    statusEl.className = "status";
  }
} catch (e) {
  statusEl.textContent = "Could not load reference data: " + e.message;
  statusEl.className = "status err";
  el("save").disabled = true;
}

el("form").addEventListener("submit", async ev => {
  ev.preventDefault();
  const athleteId = el("athlete").value;
  const athleteName = el("athlete").selectedOptions[0].textContent;
  const protocolId = el("protocol").value;
  const proto = protocols.find(p => p.id === protocolId);
  const assignedOn = el("assignedOn").value;

  // FR-28: refuse a second protocol for the same athlete on the same day.
  const clash = existing.find(a => a.athleteId === athleteId && a.assignedOn === assignedOn);
  if (clash) {
    statusEl.textContent = 'That athlete already has a protocol on ' + assignedOn +
      ' ("' + (clash.title || clash.protocolName) + '"). One per day is the rule — pick another date.';
    statusEl.className = "status err";
    return;
  }

  el("save").disabled = true;
  statusEl.textContent = "Writing to Firestore…";
  statusEl.className = "status busy";
  try {
    const ref = await createAssignment({
      title: proto.name,
      protocolId,
      protocolName: proto.name,
      targetDomain: proto.targetDomain,
      athleteId,
      athleteName,
      assignedOn,
      plannedDurationSec: Number(el("duration").value) * 60,
      status,
      statusChangedBy: "athlete",
      howItFelt: el("howItFelt").value.trim()
    });
    statusEl.textContent = "Saved as " + ref.id + ". Opening it now…";
    statusEl.className = "status ok";
    setTimeout(() => { location.href = "assignment-detail.html?id=" + encodeURIComponent(ref.id); }, 700);
  } catch (e) {
    el("save").disabled = false;
    statusEl.textContent = "Write failed: " + e.message;
    statusEl.className = "status err";
  }
});
