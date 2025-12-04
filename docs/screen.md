# Osmosis Mobile App - Screen Specification

This document outlines the key screens and their functionalities for the Osmosis mobile app, designed to facilitate effective study habits through flashcards, active study sessions, and knowledge management.

## Screen List Overview

### Phase 1: Onboarding & Core Navigation

*The goal here is "Time to Value." The user must understand the app's utility within 60 seconds.*

#### 1\. Onboarding / Login

* **Core Requirements:**
  * Social Login (Google/Apple) for 1-tap entry.
  * "Guest Mode" to try the app without an account (data persists locally until signup).
  * **User Personalisation:** Ask 3 quick questions: "What are you studying?", "When is your deadline?", "Daily goal duration?"
* **Delight Factors:**
  * Animated walkthrough of the "Osmosis" concept (absorption of knowledge).
  * Pre-load a "Demo Deck" based on their interest so they can swipe immediately.

#### 2\. Home Dashboard

* **Core Requirements:**
  * **Quick Actions:** "Study Now" (smart suggestion), "Add New", "Search".
  * **Daily Snapshot:** Cards due today, tasks due today.
  * **Streaks/Heatmap:** A visual representation of consistency (similar to GitHub contributions).
* **Delight Factors:**
  * Dynamic greeting: "Good Morning, Hao. You have 45 cards to review."

#### 3\. Global Search

* **Core Requirements:**
  * Unified search across: Decks, Cards (front/back), Notes, and Resources.
  * Filter chips: "Only Cards", "Only Notes", "Tags".
* **Delight Factors:**
  * Highlight search terms within the results.
  * Recent search history.

#### 4\. Notifications (Hub)

* **Core Requirements:**
  * Categorised list: Study Reminders, System Updates, Achievement Unlocks.
  * "Snooze" functionality for study reminders.

-----

### Phase 2: The Flashcard Engine (The Core Loop)

*This is where the user spends 80% of their time. It must be frictionless.*

#### 5\. Flashcard Deck List

* **Core Requirements:**
  * Grid or List view.
  * Visual progress bars: New vs. Learning vs. Review vs. Mastered.
  * Folder/Sub-deck organisation hierarchy.
* **Delight Factors:**
  * Customisable deck covers (icons or uploaded images).
  * Haptic feedback when long-pressing to reorder.

#### 6\. Deck Details

* **Core Requirements:**
  * High-level stats: Retention rate, cards count.
  * Action Buttons: "Study Now", "Custom Study", "Browse Cards".
* **Delight Factors:**
  * "Time Estimate": Show "15 mins remaining" based on average answer speed.

#### 7\. Create/Edit Flashcard (AI Powered)

* **Core Requirements:**
  * **Input Types:** Rich Text, LaTeX (for math), Code Blocks (syntax highlighting), Image/Audio.
  * **AI Integration:** "Generate from Text" or "Scan Document" button.
  * **Cloze Deletion:** Highlight text and tap "Hide" to create fill-in-the-blanks.
* **Delight Factors:**
  * Auto-tagging suggestions based on content.
  * Live preview of how the card looks.

#### 8\. Flashcard Review Session

* **Core Requirements:**
  * **Gestures:** Swipe Left (Hard/Again), Swipe Right (Good/Easy), Tap to flip.
  * **Spaced Repetition Logic:** Invisible engine calculating the next interval.
  * **Accessibility:** Text-to-speech support.
* **Delight Factors:**
  * **Micro-interactions:** Satisfying animations when a card is swiped away.
  * **Haptics:** Subtle vibration on card flip and confidence rating.

#### 9\. Flashcard Review Summary

* **Core Requirements:**
  * Session stats: Time spent, Cards reviewed, Forecast (future workload).
* **Delight Factors:**
  * **Gamification:** "Level Up" or "Streak Extended" animations.
  * Motivational quote or fun fact upon completion.

-----

### Phase 3: Active Study & Planning

*Integrating the "how" with the "when".*

#### 10\. Study Session Setup

* **Core Requirements:**
  * Mode selection: Flashcards, Deep Reading, or Practice Exam.
  * Timer settings: Open-ended or Pomodoro.
  * Background noise selection (White noise, Rain, Lo-fi).

#### 11\. Active Study Session (Focus Mode)

* **Core Requirements:**
  * **Phone Locking:** Prevent navigation away from the app (optional strict mode).
  * **Timer Display:** Unobtrusive countdown.
  * Quick "Jot Down" area for distracting thoughts to handle later.
* **Delight Factors:**
  * Screen "Wake Lock" (screen stays on).
  * Fluid transitions between focus intervals and break intervals.

#### 12\. Study Summary (Post-Session)

* **Core Requirements:**
  * Total focus time logged.
  * Prompt to rate focus level (1-5 stars).

#### 13\. Weekly Timetable / Calendar

* **Core Requirements:**
  * Drag-and-drop time blocking.
  * Colour-coded blocks (Lecture vs. Self-Study vs. Exam).
  * Sync with Google/Apple Calendar.

#### 14\. Task List & Task Detail

* **Core Requirements:**
  * Prioritisation flags (High, Medium, Low).
  * Sub-tasks/Checklists.
  * Link a task to a Deck (e.g., "Review Java Deck").

#### 15\. Exam Tracker

* **Core Requirements:**
  * Countdown timer (Days left).
  * Syllabus coverage tracker (Percentage complete).

-----

### Phase 4: Knowledge Management (Notes & Resources)

*The "Second Brain" aspect of Osmosis.*

#### 16\. Notes List

* **Core Requirements:**
  * Sort by Last Edited, Created, or Alphabetical.
  * Pinned notes at the top.

#### 17\. Note Editor

**Core Requirements:**

* Markdown support.
* **Bi-directional Linking:** Ability to link a Note to a Flashcard (and vice versa).
* Export to PDF.

#### 18\. Resource Library

**Core Requirements:**

* File manager for PDFs, Images, Audio.
* **PDF Viewer:** Highlight text to instantly create a flashcard (AI context menu).

-----

### Phase 5: Analytics & Intelligence

#### 19, 20, 21. Analytics (Study, Flashcard, Planner)

* **Core Requirements:**
  * **Retention Chart:** Forgetting curve visualisation.
  * **Time Distribution:** Where is time being spent? (Subject breakdown).
  * **Heatmaps:** Study habits by hour of the day.

#### 22\. Optional AI Assistant

* **Core Requirements:**
  * Chat interface overlay.
  * Context-aware: "Explain the card I am currently looking at."
  * Socratic Tutor mode: The AI asks the user questions rather than just answering.

-----

### Phase 6: Ecosystem & Settings

#### 23\. Settings / Profile

* **Core Requirements:**
  * **Spaced Repetition Settings:** Allow power users to tweak algorithm parameters (like Anki).
  * Theme Selector (Light/Dark/System/OLED Black).
  * Data Management (Export JSON/CSV).

#### 24\. Optional Community Decks

* **Core Requirements:**
  * Marketplace/Repository UI.
  * Ratings and Reviews for decks.
  * "Preview Cards" before downloading.

#### 25\. Optional Backup & Sync

* **Core Requirements:**
  * Visual indicator of sync status (Green checkmark).
  * Conflict resolution (if edited on two devices).
  * Offline-first architecture (app works perfectly without internet).
