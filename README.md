# Oopsly

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=Oopsly%3A%3AAPI)](https://sonarcloud.io/summary/new_code?id=Oopsly%3A%3AAPI)

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=Oopsly%3A%3AUI)](https://sonarcloud.io/summary/new_code?id=Oopsly%3A%3AUI)

[![CodeQL - Snyk](https://github.com/halng/Oopsly/actions/workflows/codeql-snyk.yaml/badge.svg?branch=main)](https://github.com/halng/Oopsly/actions/workflows/codeql-snyk.yaml)



## 🎯 1. PRODUCT VISION & POSITIONING

| Attribute | Detail |
|---|---|
| **App Name (concept)** | Oopsly |
| **Tagline** | *"Study Smart. Remember Forever."* |
| **Core Philosophy** | Science-backed learning + Social engagement = Maximum retention |
| **Target Users** | Students (K-12, University), Professionals, Language Learners, Self-learners |
| **Platform** | iOS, Android, Web (PWA) |

## 🏗️ 2. INFORMATION ARCHITECTURE (IA)

```
Oopsly
├── 🏠 Home (Dashboard)
│   ├── Daily Study Queue (Due cards + streaks)
│   ├── Quick Stats (streak, cards due, XP)
│   └── Continue Where You Left Off
│
├── 📚 Library
│   ├── My Decks (personal)
│   ├── Shared Decks (collaborative)
│   ├── Explore (public marketplace)
│   └── Folders / Collections
│
├── ✏️ Create
│   ├── New Flashcard
│   ├── New Deck
│   ├── AI Card Generator
│   └── Import (PDF, CSV, Notion, Anki .apkg)
│
├── 🎮 Study Modes
│   ├── Smart Review (SRS)
│   ├── Learn (first-time pass)
│   ├── Quiz Mode
│   ├── Match Game
│   ├── Write Mode
│   └── Blitz Mode (timed)
│
├── 📊 Analytics
│   ├── Retention Heatmap
│   ├── Weak Spots Report
│   ├── Study Streaks
│   └── Forgetting Curve Graph
│
├── 👥 Community
│   ├── Public Deck Browser
│   ├── Study Groups
│   ├── Leaderboards
│   └── Deck Reviews & Ratings
│
└── ⚙️ Settings
    ├── Study Schedule & Notifications
    ├── Algorithm Settings (beginner/expert)
    ├── Themes & Accessibility
    └── Subscription & Account
```

---

## 🃏 3. CORE FEATURES BREAKDOWN

### 🔁 A. Smart Spaced Repetition System (SRS+)
> *The Brain of the App — Evolved from Anki's SM-2 Algorithm*

- **Algorithm**: Use **FSRS (Free Spaced Repetition Scheduler)** — the modern, open-source upgrade to SM-2 (what Anki now uses internally)
- **Rating System**: Simplified 4-button rating → `❌ Forgot` | `😕 Hard` | `✅ Good` | `⚡ Easy`
- **Transparent Scheduling**: Show users *when* they'll next see a card and *why* ("You'll forget this in ~3 days based on your history")
- **Adaptive Load**: Auto-limits daily new cards based on user's study pace to prevent burnout
- **Leech Detection**: Flag cards that are consistently failed → suggest card rewrite or mnemonics

---

### 🎮 B. Study Modes (Best of Both Worlds)

| Mode | Inspired By | Description |
|---|---|---|
| **Smart Review** | Anki | SRS-powered flashcard flipping with rating buttons |
| **Learn Mode** | Quizlet Learn | Adapts question types as you improve (MC → Write → Flash) |
| **Quiz Mode** | Quizlet Test | Auto-generates tests: MCQ, True/False, Fill-in-the-blank |
| **Match** | Quizlet Match | Drag-and-drop card matching game with a timer |
| **Blitz Mode** | Original | 60-second rapid-fire recall challenge |
| **Write Mode** | Both | Type the answer, fuzzy matching grades spelling tolerance |
| **Cram Mode** | Anki | Study all cards ignoring SRS (before an exam) |
| **Spaced Story** | Original | Cards embedded in a narrative/context for language learners |

---

### ✏️ C. Rich Card Editor

```
Card Types:
┌─────────────────────────────────────┐
│  📝 Basic (Front / Back)            │
│  🖼️  Image + Text                   │
│  🎵  Audio Card (language learning) │
│  📐 Cloze Deletion (fill-in-blank)  │
│  🔀 Multiple Choice (custom options)│
│  📊 Diagram / Image Occlusion       │
│  💻 Code Card (syntax highlighted)  │
│  🔢 Math Card (LaTeX support)       │
└─────────────────────────────────────┘
```

**Editor Features:**
- Rich text (Bold, Italic, Highlight, Code)
- Drag-and-drop image upload + sketch pad
- Voice recording for pronunciation cards
- **AI Hint Generator** — auto-creates a memory hint/mnemonic
- Card tagging system (e.g., `#biology`, `#ch3`, `#exam-week`)

---

### 🤖 D. AI Features (The Game Changer)

| Feature | How it Works |
|---|---|
| **AI Deck Generator** | Upload a PDF/doc/URL → AI creates a full deck of flashcards |
| **Smart Mnemonic Suggestions** | AI suggests memory tricks for hard cards |
| **Answer Explanations** | AI explains *why* an answer is correct on reveal |
| **Difficulty Predictor** | AI pre-tags cards as Easy/Medium/Hard before first study |
| **Weak Spot Coach** | Weekly AI summary: "You struggle with mitosis — here's a tip" |
| **Auto-Cloze** | Paste text → AI highlights key terms for cloze deletion |
| **Chatbot Q&A** | Ask questions about your deck content mid-session |

---

### 📊 E. Analytics Dashboard

```
📈 Your Learning Intelligence

┌──────────────────────────────────────────┐
│  🔥 Streak: 14 days                      │
│  📅 Cards Due Today: 42                  │
│  🧠 Retention Rate: 87%                  │
│  ⏱️  Avg Study Time: 22 min/day           │
└──────────────────────────────────────────┘

📉 Forgetting Curve Graph
   (shows predicted memory decay per deck)

🗺️ Heatmap Calendar
   (GitHub-style daily study activity)

🎯 Weak Cards Report
   (cards failed 3+ times — ranked by priority)

📚 Deck Health Score
   (% of cards in "mature" memory state)
```

---

### 👥 F. Social & Community Features

- **Public Deck Marketplace** — browse, rate, and clone decks (like Quizlet Discover)
- **Study Groups** — invite friends to share a deck and see each other's progress
- **Group Leaderboards** — weekly XP rankings within your group
- **Deck Reviews** — star ratings + written reviews for public decks
- **Challenge Mode** — challenge a friend to the same quiz, compare scores live
- **Creator Profiles** — educators can build a following and publish deck series

---

## 🔔 4. ENGAGEMENT & RETENTION MECHANICS

| Mechanic | Description |
|---|---|
| 🔥 **Daily Streaks** | Study every day to maintain your streak (like Duolingo) |
| ⚡ **XP System** | Earn XP for cards reviewed, modes completed, streaks held |
| 🏆 **Badges & Milestones** | "First 100 cards mastered", "7-day streak", "Speed Demon" |
| 📬 **Smart Notifications** | AI-timed push alerts: *"3 cards are about to be forgotten!"* |
| 🎯 **Daily Goals** | Set a daily card target (e.g., 20 cards/day) with progress ring |
| 👥 **Social Accountability** | See friends' streaks; get nudged if yours breaks |
| 🗓️ **Exam Countdown Mode** | Set an exam date → app auto-plans your study schedule |

---

## 💰 5. MONETIZATION STRATEGY

| Tier | Price | Features |
|---|---|---|
| **Free** | $0 | Up to 5 decks, 200 cards, basic study modes, ads |
| **Pro** | $7.99/mo | Unlimited decks & cards, AI features, all study modes, no ads, analytics |
| **Pro+** | $12.99/mo | Everything + offline mode, collaborative decks, priority AI, export |
| **Teams/EDU** | Custom | Admin dashboard, class management, LMS integration (Google Classroom, Canvas) |

---

## 🛠️ 6. TECHNICAL ARCHITECTURE

### Frontend
```
Mobile:  React Native (cross-platform iOS + Android) - Implement later
Web:     Next.js (PWA with offline support via Service Workers)
State:   Zustand + React Query
Animations: Reanimated 3 + Framer Motion (web)
```

### Backend
```
Runtime:    Java 21 + Spring Boot 3.5.8
Framework:  Spring Boot + Spring Security + Spring Data JPA
Database:   PostgreSQL (user data) + Redis (session/cache)
SRS Engine: FSRS algorithm (open-source implementation)
Search:     Meilisearch (deck discovery)
```

### AI Stack
```
LLM:         OpenAI GPT-4o / Claude 3.5 (card generation, explanations)
Embeddings:  OpenAI text-embedding-3 (semantic search within decks)
OCR:         Google Vision API (image-to-card)
TTS:         ElevenLabs or AWS Polly (audio cards)
```

### Infrastructure
```
Hosting:   AWS / Railway
CDN:       Cloudflare
Auth:      Email OTP + JWT (access + refresh tokens)
Storage:   S3 (images, audio)
Analytics: PostHog (product analytics) + Mixpanel
```

---

## 🗺️ 7. DEVELOPMENT ROADMAP

```
Phase 1 — MVP (0–3 months) -- in progress
  ✅ User auth & onboarding
  ✅ Basic card creation (text + image)
  ✅ Smart Review with FSRS algorithm
  ✅ Learn Mode + Quiz Mode
  ✅ Basic analytics (streak, cards due)

Phase 2 — Growth (3–6 months)
  🚀 AI card generator (PDF upload)
  🚀 Public deck marketplace
  🚀 Match & Blitz game modes
  🚀 Mobile apps (iOS + Android)
  🚀 Cloze + Image occlusion cards

Phase 3 — Scale (6–12 months)
  🌟 Study Groups & Leaderboards
  🌟 Exam Countdown Planner
  🌟 Advanced analytics (forgetting curve)
  🌟 EDU/Teams tier + LMS integration
  🌟 Offline mode
  🌟 Browser extension (clip-to-card)
```

---

## ✅ 10. KEY DIFFERENTIATORS SUMMARY

| Feature | Anki | Quizlet | **Oopsly** |
|---|---|---|---|
| SRS Algorithm | ✅ FSRS | ❌ Weak | ✅ **FSRS + AI-Adaptive** |
| Modern UI/UX | ❌ | ✅ | ✅ **Best-in-class** |
| AI Card Gen | ❌ | ⚠️ Basic | ✅ **Full AI suite** |
| Game Modes | ❌ | ✅ | ✅ **More + better** |
| Analytics | ⚠️ Complex | ❌ | ✅ **Visual + actionable** |
| Social/Community | ❌ | ✅ | ✅ **Enhanced** |
| Image Occlusion | ✅ Plugin | ❌ | ✅ **Native** |
| Code/Math Cards | ✅ Plugin | ❌ | ✅ **Native** |
| Free Tier | ✅ Generous | ⚠️ Limited | ✅ **Generous** |
| Offline Mode | ✅ | ❌ | ✅ **Pro feature** |

---

## Quick start

Folder structure:

```
app
├── api
│   ├── src/main/java/... (Spring Boot backend)
│   ├── src/test/java/... (unit + integration tests)
│   └── build.gradle
├── web
│   ├── app/ (Next.js frontend)   
│   ├── component/ (React components)
│   ├── hooks/ (custom React hooks)
│   ├── services/ (API service calls)
│   ├── stores/ (Zustand state management)
│   ├── types/ (TypeScript types)
│   ├── utils/ (utility functions)
│   └── package.json
```

Note: the backend folder with path `app/api` contains the Spring Boot backend. The backend is organized as a modern spring boot project with DDD (Domain Driven Design) structure.
The frontend folder with path `app/web` contains the Next.js frontend.

### Infrastructure + API

```bash
cd app/api
./gradlew composeUp
./gradlew bootRun -Pprofile=test
```

- Base URL: `http://localhost:9009/api/v1/oopsly`
- Swagger: `http://localhost:9009/api/v1/oopsly/swagger-ui/index.html`

### UI

```bash
cd app/web
pnpm install
pnpm dev
```

## Development checks

```bash
# API
cd app/api && ./gradlew spotlessApply test

# UI
cd app/web && pnpm lint && pnpm format
```

Contributing: [docs/how-to/contribute.md](./docs/how-to/contribute.md)  
Conventions: [docs/reference/conventions.md](./docs/reference/conventions.md)

---

## License

Licensed under the Apache License 2.0. See source file headers (author: Hao Nguyen Tan).
