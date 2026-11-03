# OpenGenTree 🌳

**Twoje drzewo. Nasza wspólna historia.**  
*Your tree. Our shared history.*

[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue)](LICENSE)
[![Project status: early development](https://img.shields.io/badge/status-early%20development-orange)](docs/ROADMAP.md)
[![Based on Strom](https://img.shields.io/badge/based%20on-Strom-green)](https://github.com/ACiDekCZ/strom)

> [!IMPORTANT]
> **OpenGenTree is in early development.** This repository currently contains a fork of **Strom**. User accounts, online storage, permissions and community Smart Matches are **planned**, not available features. Please do not upload sensitive genealogy data to the test deployment.

## What is OpenGenTree?

OpenGenTree is a planned **free, open-source genealogy platform**, built on [Strom](https://github.com/ACiDekCZ/strom) by Milan Víšek. Our goal is to keep Strom's approachable family-tree editor and optional offline workflow while gradually adding:

- **User accounts and server-side tree storage**, with export and backups.
- **Family collaboration:** invite others to view or edit a tree, with explicit permissions.
- **Privacy by design:** protect living people and their identifying information in public/community views.
- **Smart Matches**, in two stages: first between your own local trees, later between participating users' historical records.
- **Independent trees:** matches are suggestions, **never automatic cross-user merges**.

The project is **non-commercial in intent**: no ads, subscriptions or paid genealogy features are planned. Infrastructure support may be considered if hosting costs grow.

A single shared/global family tree is **not part of the current implementation plan**. It is a possible long-term idea, not a promised feature.

## Current status

| Capability | Status |
| --- | --- |
| Family-tree editor, visualizations, GEDCOM, sources, exports | Available in upstream Strom |
| Browser-based local trees and offline-capable workflows | Available in upstream Strom (deployment-dependent) |
| Local cross-tree matching | Exists in upstream Strom; OpenGenTree improvements planned |
| OpenGenTree-specific branding and deployment packaging | In preparation |
| User registration, server storage and synchronization | Planned |
| Invitations, roles and public historical views | Planned |
| Smart Matches between different users' trees | Planned for a later phase |

**Live test address:** [opengentree.smart-ant.pl](https://opengentree.smart-ant.pl) — experimental deployment; availability and functionality may change. It is **not** a production genealogy service.

See the [development roadmap](docs/ROADMAP.md) for the agreed scope and stages.

## Our approach to privacy

Three modes are planned **per tree**, not per account:

| Mode | Who can view the tree? | Community matching |
| --- | --- | --- |
| **Private** | Owner and authorized invitees | No |
| **Community** | Owner and authorized invitees; selected historical records may be shared for matches | Yes, opt-in |
| **Public** | Public historical view; full view only for authorized users | Yes, opt-in |

Living people's records must never be exposed to unauthorized users through APIs, search, media, notes or family relationships. An explicit “living” status takes precedence; for a person with unknown status, an age of 120 years may support **probable death**, but is not proof. Server-side filtering and conservative defaults are required **before** any public/community sharing launches.

For community matching, private trees do not contribute records and do not gain community matching access through those trees. Local matching between trees under the same owner's control remains available.

## Build the current code

Requirements: a compatible Node.js/npm environment (see the repository's tooling).

```bash
git clone https://github.com/Bacman88/OpenGenTree.git
cd OpenGenTree
npm ci
npm run build
```

The upstream build generates `strom.html` (standalone HTML) and `dist/bundle.js`; the repository also contains an `index.html` template. **A successful build is not by itself a configured web deployment.** The Joton deployment output directory is being standardized separately.

Useful commands:

```bash
npm run typecheck
npm test
npm run test:e2e:smoke
```

The build and test commands above describe how to run checks; they are **not** a claim that this fork currently passes all checks.

## Development and contributions

OpenGenTree is developed as a fork to make it possible to incorporate future improvements from Strom:

- Keep OpenGenTree features in separate modules wherever possible (for example `src/ogt/` and `server/` when introduced).
- Prefer small, documented integration points over changing the original editor.
- Develop changes in feature branches and review them through pull requests.
- Keep `main` suitable for tested releases; production deployment should not automatically follow unreviewed feature branches.
- Never commit credentials, private family trees or sensitive media.

For now, issues and pull requests can be discussed in the [OpenGenTree repository](https://github.com/Bacman88/OpenGenTree/issues).

## Credits, upstream and licensing

OpenGenTree is **based on [Strom](https://github.com/ACiDekCZ/strom)**, originally created by **Milan Víšek**, with **Claude (Anthropic)** credited as a contributor in the upstream project.

Strom and this derivative project are distributed under the **GNU Affero General Public License, version 3 or later (AGPL-3.0-or-later)**. See [LICENSE](LICENSE). Source code for modifications made available as a network service must be offered in accordance with the AGPL, including its network-use provisions.

Original Strom notices and the upstream project's description, including third-party components and attributions, are preserved in [the upstream README](docs/STROM-UPSTREAM-README.md). Third-party materials retain their applicable licenses.

**OpenGenTree is an independent derivative project, not an official release of Strom.** The name and links of the original project remain credited; OpenGenTree has its own identity.

---

*OpenGenTree — open genealogy, with respect for both family history and living people's privacy.*
