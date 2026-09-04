# SCOPE — NakMuay recovery protocol tracker

**What the system stores:** one recovery protocol given to one professional boxer on one
day, together with the status the boxer sets on it themselves and the attempts they
actually made at it.

This file is the Week 6 homework scope. It replaces the LeaveEasy lab's leave-request
domain with the NakMuay project, and it keeps the same nine decisions the lab asks for.

## The nine decisions

| # | Decision | This project | Why |
|---|---|---|---|
| 1 | Main collection | `protocolAssignments` | One document = one protocol assigned to one boxer for one date. This is the thing the app is about, so it is the collection every page reads from. |
| 2 | Category / lookup collection | `protocols` | The library of recovery protocols (Neuro deload, Sleep extension, Fuel top-up). An assignment points at one of these instead of repeating its text. |
| 3 | Subcollection | `attempts` under a `protocolAssignments` document | A boxer often does a protocol in pieces — 12 minutes in the morning, the rest at night. Each try is one document under the assignment it belongs to. |
| 4 | Owner field | `athleteId` (with `athleteName` denormalised beside it) | Firestore has no JOIN, so the list page needs the name in the same document. `athleteId` is the real link to `athletes`. |
| 5 | Statuses | `pending` · `completed` · `skipped` | Exactly the three values already defined in FR-28 / FR-29 of the requirement spec, so the homework adds no new vocabulary to the project. |
| 6 | Who creates a record | The boxer (นักมวย) | The app is for professional boxers using it on themselves. Section 2.2 of the spec has one role only. |
| 7 | Who changes the status | The same boxer | **There is no approver in this system.** A skipped protocol is information, not a request that someone grants. The lab's IoT example works the same way — the device owner moves its own record along. |
| 8 | Long text field | `howItFelt` on the assignment | Free text the boxer writes after finishing or skipping. It is the one field that carries a reason a number cannot, and it is the only field the homework adds to the documented data model. |
| 9 | Week 8 AI task | Read the `howItFelt` text across recent assignments and name the pattern that keeps blocking recovery | The app already knows *which* domain is the limiting factor from the numbers. The text is where the *why* is — "media day moved", "gym was loud", "slept badly before travel". That is a language problem, not an arithmetic one. |

## What is deliberately out of scope

- **No coach, no manager, no approval step.** Adding one would change the role model in
  section 2.2 of the requirement spec, and the whole product is built around the boxer
  reading their own body.
- **No diagnosis.** NFR-04. The app names a limiting factor; it never names an injury.
- **No help cutting weight faster.** NFR-05. `Fuel top-up` is explicitly the opposite.
- **No single overall score.** FR-23. The limiting factor is the *lowest* domain, never an
  average of the six.

## Related documents

- Requirement spec — `docs/01-requirements/01-spec/20260828-01-boxer-recovery-tracking.md`
- Data model for this build — `docs/02-design/02-technical/data-model-firestore.md`
- Existing database spec — `docs/02-design/02-technical/db-spec.md`
- Notes on the `docs/` folder for this homework — `docs/README.md`
