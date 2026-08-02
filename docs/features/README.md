# Features

> Part of the [documentation library](../README.md). This directory contains feature packs (OKRs, TODOs, BDD-style specs) organized by milestone. Use these for product planning; for shipped behavior see [Product overview](../product/overview.md) and [Milestone 1](../architecture/MILESTONE_1.md).

## Structure

Under this directory, you will find various milestone folder named with XXX organized by functionality or module. Each milestone folder typically includes:

- **TODO file**: A file that lists the tasks or features that need to be implemented for that milestone.
- **OKR file**: A file that outlines the Objectives and Key Results (OKRs) for the milestone, providing a clear set of goals and measurable outcomes to track progress.
- **Feature files**: These are the actual feature files that describe the specific behaviors and functionalities to be implemented. Each feature file is written in a clear and concise manner, following the Given-When-Then format to specify the conditions, actions, and expected results.

Example structure:

```plain
features/
├── 001/
│   ├── TODO.md
│   ├── OKR.md
│   ├── OOPS-001.md
│   └── OOPS-002.md
├── 002/
│   ├── TODO.md
│   ├── OKR.md
│   ├── OOPS-003.md
│   └── OOPS-004.md
└── ...
```
