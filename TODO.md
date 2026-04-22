# Market Research TODO – Education App Benchmark

## Scope
- Platforms reviewed: **Quizlet**, **Anki**, **Khan Academy**
- Objective: Identify baseline feature parity and differentiation opportunities for Oopsly

## Cross-Platform Feature Comparison

| Feature | Quizlet | Anki | Khan Academy | Priority | Notes / Insight |
| --- | --- | --- | --- | --- | --- |
| Account & sync | ✅ | ✅ (AnkiWeb) | ✅ | High | Mandatory for continuity across devices and retention. |
| Flashcard/deck creation | ✅ | ✅ | ❌ | High | Core for Oopsly’s learning workflows. |
| Spaced repetition scheduling | ✅ (limited controls) | ✅ (advanced controls) | ❌ | High | Oopsly should support configurable SRS levels for power users. |
| Practice/test mode | ✅ | ✅ (via add-ons/templates) | ✅ (quizzes/exercises) | High | Must include measurable outcomes, not just passive review. |
| Progress analytics | ✅ basic | ⚠️ limited built-in | ✅ strong learning progress | High | Oopsly can differentiate with clearer mastery + trend analytics. |
| Multi-device offline support | ✅ | ✅ | ⚠️ partial | Medium | Useful for students with unstable connectivity. |
| Content import (PDF/doc/csv) | ✅ (paid tiers/features vary) | ✅ (community tools) | ❌ | Medium | Strong fit with Oopsly’s AI/document-driven creation story. |
| AI-assisted study generation | ✅ (Q-Chat, AI tools) | ❌ | ⚠️ guided but not generative-first | Medium | AI must be accurate and scoped to verified content. |
| Gamification (streaks/badges) | ✅ | ❌ | ✅ | Medium | Helpful for daily habit loops, especially beginner users. |
| Classroom/collaboration sharing | ✅ | ⚠️ limited | ✅ | Medium | Important for teacher/student and peer-learning scenarios. |
| Adaptive recommendations | ⚠️ limited | ❌ | ✅ (path recommendations) | Low | Future optimization once core loops are stable. |
| Accessibility/localization depth | ⚠️ | ⚠️ | ✅ | High | Critical for broad adoption in education settings. |

Legend: ✅ supported, ⚠️ partially supported, ❌ not a primary capability

## Core/Common Features (Must-Have)

1. **Identity + Cloud Sync** — **High**  
   Ensure email/social sign-in, session management, and real-time/deferred sync conflict handling.

2. **Deck/Collection + Card Management** — **High**  
   Support create/edit/delete, tagging, search, and bulk operations for scalable study libraries.

3. **Spaced Repetition Engine** — **High**  
   Implement robust scheduling with configurable review intervals and overdue handling.

4. **Practice & Assessment Modes** — **High**  
   Include flashcard review, quiz mode, and immediate feedback loop with score history.

5. **Progress Tracking Dashboard** — **High**  
   Provide mastery status, retention trend lines, and completion tracking by subject/deck.

6. **Sharing & Collaboration Basics** — **Medium**  
   At minimum: shareable decks, permissions (view/edit), and classroom/group assignment flow.

7. **Offline-first Study Experience** — **Medium**  
   Cache active study content locally and queue changes for sync.

## Differentiating Features (Competitive Edge)

1. **Document-to-Deck AI Pipeline** — **High**  
   Turn uploaded notes/slides/PDFs into draft cards with confidence indicators and citation snippets.

2. **Explain-Why Feedback for Wrong Answers** — **High**  
   Add pedagogical explanation and remediation suggestions, not just correct/incorrect marking.

3. **Goal-Driven Study Plans** — **Medium**  
   Weekly objective planning with adaptive workload pacing and milestone nudges.

4. **Collaboration Layer for Peer Review** — **Medium**  
   Commenting, suggested edits, and quality voting for shared decks to improve content quality.

5. **Teacher/Parent Visibility Mode** — **Low**  
   Optional progress summary view and alerts for missed goals or declining retention.

## Gaps Observed and Opportunities for Oopsly

- **Gap: Explainability is weak in flashcard-first apps**  
  Opportunity: add concise explanation/rationale after each response and targeted next-step review.

- **Gap: AI generation often lacks trust signals**  
  Opportunity: require source references, confidence labels, and one-click “flag/regenerate” actions.

- **Gap: Collaboration quality control is inconsistent**  
  Opportunity: build moderation/versioning flow for shared decks and classroom-safe publishing.

- **Gap: Cross-app study outcomes are hard to compare**  
  Opportunity: define a unified “learning health” score (accuracy + consistency + retention decay).

## Actionable Backlog for Product + Engineering

- [ ] **P0 (High):** Define MVP data model for deck/card/SRS/progress entities and sync states.
- [ ] **P0 (High):** Implement review session APIs with SRS update strategy and telemetry events.
- [ ] **P0 (High):** Build analytics schema for mastery, streak, and retention trend reporting.
- [ ] **P1 (Medium):** Deliver sharing permissions and collaborative deck workflows.
- [ ] **P1 (Medium):** Ship document import pipeline with AI-generated card drafts.
- [ ] **P2 (Low):** Prototype adaptive recommendations and guardian/teacher insight mode.
