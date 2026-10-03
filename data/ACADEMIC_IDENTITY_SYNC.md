# Academic Identity Sync

This repository contains the canonical **public academic identity record** for Dr. Sunilgar L. Gusai.

## Principle

Public surfaces should be synchronized without turning the academic profile into an internal project tracker.

- **Published** and **accepted** work may appear on the CV, portfolio and GitHub profile.
- **Under-review** and **submitted** work may appear on the CV when professionally appropriate, but is not automatically shown on the public portfolio or GitHub profile.
- **Rejected** and **withdrawn** decisions are not stored in this public master record and belong only in the private research tracker.
- Administrative or service roles use explicit per-surface visibility. A role can therefore appear on the portfolio/profile but be intentionally omitted from the CV.
- Repository count is never treated as a CV achievement. Research programmes are curated by relevance and presentation quality.

## Protected visual areas

Automation must not rewrite:
- hero artwork or animated banners;
- custom research-card SVGs;
- the layout/design of the eight-project research showcase;
- manually curated visual storytelling.

Automation updates only marked/generated academic-information blocks.

## Update protocol

When a new academic fact is shared with ChatGPT:
1. Verify the evidence if the fact changes publication/acceptance status.
2. Update `data/academic-profile.json`.
3. Respect the visibility matrix in that record.
4. Let the portfolio workflow regenerate controlled blocks and CV source.
5. Bump the GitHub-profile sync trigger so the profile fetches the same master record.
6. Verify CI, CV build and Pages deployment.
7. Do not expose rejected/withdrawn/private tracker information publicly.

The Research Paper Tracker remains the planning/status source. Editorial/publication evidence supersedes the tracker when a newer verified decision exists.
