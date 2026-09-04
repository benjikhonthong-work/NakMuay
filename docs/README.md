# docs/ — what is in here and what is not

This folder holds the written work for the NakMuay project. It follows the
`starter-kit-v1` layout, so every document links to the others with `[[wikilinks]]`
and every requirement carries an FR / NFR code that the design and test documents
quote back.

## Layout

| Folder | What it holds |
|---|---|
| `01-requirements/` | The requirement spec (FR-01…FR-33, NFR-01…NFR-09) and the product backlog |
| `02-design/` | Feature list, user journeys, the design system (`DESIGN.md`), HTML prototypes, and the technical documents under `02-technical/` |
| `03-testing/` | Acceptance criteria, test plan, and test cases |
| `04-retrospectives/` | Retrospective notes |
| `05-log/` | Daily working log |
| `00-archived/` | Superseded drafts |

## About the Firebase Console screenshot

The Week 6 worksheet asks for a screenshot of the Firebase Console showing the seeded
collections. **That screenshot is deliberately not included here.** This note stands in
its place, as agreed for this submission.

What the screenshot would have shown can be reproduced in under a minute, and the code
that produces it is in the repository:

1. Serve the `app/` folder over a local web server (ES modules do not load over
   `file://`), then open `app/seed.html`.
2. Press **Write sample data**. The page reports each collection as it is written.
3. The Firestore database for project `nakmuay-8f508` then contains:
   - `athletes` — 3 documents (`a001`, `a002`, `a003`)
   - `protocols` — 3 documents (`p001`, `p002`, `p003`)
   - `protocolAssignments` — 5 documents (`pa001`…`pa005`), 3 `pending`, 1 `completed`, 1 `skipped`
   - `attempts` — a subcollection under `pa001` (2 documents) and under `pa002` (1 document)

Every document id is fixed rather than auto-generated, so re-running the seeder rewrites
the same rows instead of piling up duplicates. The seed data itself lives in
`app/js/seed.js`, which is readable as a plain list — it serves as the written record of
what the database holds.

## Where the homework decisions are recorded

- The nine scope decisions — [`../SCOPE.md`](../SCOPE.md)
- The collection-by-collection data model — [`02-design/02-technical/data-model-firestore.md`](02-design/02-technical/data-model-firestore.md)
