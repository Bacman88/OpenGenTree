# OpenGenTree — development roadmap

**Working specification:** v0.3 · 2026-11-03  
**Status:** planning and early integration. The milestones below are goals, not shipped features.

## Principles

1. Build on Strom; do not rewrite its genealogy editor.
2. Preserve GEDCOM, local storage, exports, visualization, sources, and ability to work offline where supported.
3. Preserve attribution and AGPL-3.0-or-later licensing.
4. Keep updates from [upstream Strom](https://github.com/ACiDekCZ/strom) feasible with minimal changes to upstream-owned files.
5. No automatic merging of independent users' trees.
6. Protect living persons in server responses, search, notes, family relations, and attachments.
7. No advertisements, subscriptions, or paid genealogy functionality planned.
8. The large shared/global tree concept is **deferred indefinitely**.

## Stage 0 — foundation

- **OGT-001** Fork and project repository.
- **OGT-002** License, credits and attribution.
- **OGT-003** Project documentation and scope.
- **OGT-004** Strom code audit (report delivered; code read, tests not executed at audit time).
- **OGT-005** Compile and test original Strom.
- **OGT-007** Document integration points and upstream changes.
- **OGT-008** Contact original author about a potential remote-storage adapter.
- **OGT-009** Set up safe Joton build/publish process and validate the entry point.

**Exit:** usable Strom-based development build and documented release workflow.

## Stage 1A — local Smart Matches (can proceed alongside Stage 1B)

- **OGT-040A-01** Review existing `src/cross-tree.ts` and `src/merge/matching.ts`.
- **OGT-040A-02** Exercise matching between two local trees.
- **OGT-040A-03** Assess results using test datasets relevant to Upper Silesia.
- **OGT-040A-04** Add missing Polish and historical given-name variants.
- **OGT-040A-05** Add appropriate historical place-name aliases.
- **OGT-040A-06** Present candidate matches, evidence and contradictions.
- **OGT-040A-07** Persist accept/reject decisions without changing source records.
- **OGT-040A-08** Regression and performance tests.

**Exit:** useful local comparisons without a server account.

## Stage 1B — online MVP

- **OGT-020** Minimal MySQL/MariaDB schema: users, trees, access and revisions.
- **OGT-021** Registration, authentication and sessions.
- **OGT-022** Multi-tree management.
- **OGT-023** Store/retrieve versioned StromData documents via PHP API.
- **OGT-024** Optimistic concurrency and conflict-safe synchronization.
- **OGT-025** Backup and recovery strategy.
- **OGT-026** Integrate the frontend with the API while retaining local copies.
- **OGT-027** Authorization and security tests.
- **OGT-028** Pilot deployment on Joton.

**Exit:** create an account, import GEDCOM, edit and synchronize a tree, access it on a second device, and recover from conflicts without silently losing data.

## Stage 2 — collaboration and privacy

- **OGT-030** Invitations.
- **OGT-031** Roles and permissions.
- **OGT-032** Private, community and public modes per tree.
- **OGT-033** Conservative server-side living-person filtering.
- **OGT-034** Public historical tree view.
- **OGT-035** Private media and source protection.
- **OGT-036** Privacy and indirect-disclosure tests.

**Exit:** authorized sharing, with living people's data protected across all interfaces.

## Stage 3 — community Smart Matches

- **OGT-040B-01** Search index of eligible historical records from opt-in community/public trees.
- **OGT-040B-02** Incremental index updates.
- **OGT-040B-03** Candidate search and bounded matching batches.
- **OGT-040B-04** Reuse Stage 1A comparison logic.
- **OGT-040B-05** Show only authorized match details.
- **OGT-040B-06** Record match decisions without changing other users' trees.
- **OGT-040B-07** Withdrawal/removal from community index.
- **OGT-040B-08** Security and performance tests.

**Exit:** useful cross-user suggestions for historical records without a centralized editable global person.

## Not in scope for now

- One universal shared family graph / global person IDs.
- Automatic irreversible person merging between different users.
- Real-time collaborative editing.
- Commercial monetization or advertising.
- Replacing WordPress or the existing webtrees installation.

## Deployment notes

Initial environment: Joton hosting, test address `opengentree.smart-ant.pl`. It is a development/pilot environment, not a promise of production availability. Keep server secrets outside public web directories. Use a separate publish artifact and configure HTTPS and access control before testing with non-public genealogy data.

## Working agreements

- GitHub issues for tasks, feature branches for code changes, PR review before `main`.
- One canonical repository for decisions and implementation; ChatGPT and Claude coordinate via code and documented interfaces.
- Protect `main` from unrelated experimental changes.
- No unredacted family datasets or credentials in the public repository.
- Maintain license notices and provide corresponding source for network-facing modifications.

This roadmap can change as actual test results and hosting limits become known.
