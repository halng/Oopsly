# Osmosis Project

## 1. The Initiative: "Osmosis"

**Mission:** To build a cross-platform Flashcard & Spaced Repetition (SRS) application that focuses on **relationships between concepts** rather than isolated facts.

**Key Constraints & Goals:**

* **Target Audience:** Students and lifelong learners who find traditional flashcards boring.
* **Budget:** Strictly under **$100/month** for infrastructure.
* **Developer Resource:** Solo
* **Performance:** Must support 1,000+ active users with instant load times and AI integration.

---

## 2. The Architecture: "The Java Monolith"

We rejected Microservices (Java + Python) in favor of a **Unified Containerized Monolith** to maximize budget efficiency and security while minimizing maintenance overhead.

### The Tech Stack

| Component | Technology | Reasoning |
| :--- | :--- | :--- |
| **Frontend** | **React Native (Expo)** | Cross-platform (iOS/Android/Web). Uses **Skia** for the glowing graph UI. |
| **Backend** | **Java 21 (Spring Boot)** | Robust file handling (PDFBox), strong typing, and excellent ecosystem. |
| **Runtime** | **Google Cloud Run** | Serverless. **GraalVM Native Image** ensures <0.3s startup, allowing "Scale to Zero" to save costs. |
| **Database** | **PostgreSQL** | Handles structured data (Users), AI embeddings (`pgvector`), and JSONB flexibility. |
| **AI Engine** | **Gemini 1.5 Flash** | Integrated via **Spring AI**. High speed, low cost text-to-graph generation. |

### Cost Strategy (~$21.50 / Month)

1. **Compute:** Java Native Image allows the server to sleep when unused (Paying $0).
2. **Database:** Smallest Cloud SQL instance is sufficient for text/vectors.
3. **AI Limits:** Free users are capped at 3 "Spark Generations" per day to control API costs.

---

## 3. The Data Model: "The Knowledge Graph"

We moved away from the traditional "Flashcard" model (Front/Back) to a **Graph Model** (Node/Edge). This supports the "Connect the Dots" UI.

* **Sparks (Nodes):** The concepts (e.g., "Java").
* **Links (Edges):** The relationships (e.g., "Runs on") connecting two Sparks.
* **Vectors:** Stored in Postgres to allow "Semantic Search" (finding related Sparks automatically).

---

## 4. The Design & Story: "The Living Light"

We pivoted from a "Medical/Neuron" theme to a friendly **"Bioluminescent Web"** theme. The story makes the user feel like an architect of light.

**The Visual Vibe:** Dark background (OLED), Neon Blue/Gold lines, glowing particles.

### The "Friendly" Terminology Map

| Feature | Old Term | **Osmosis Term** | The User Experience |
| :--- | :--- | :--- | :--- |
| **Card/Concept** | Neuron | **Spark** | A glowing dot on the screen. |
| **Connection** | Synapse | **Link** | A line connecting two Sparks. |
| **Deck** | Ganglia | **Cluster** | A group of connected Sparks. |
| **Study** | Potentiation | **Recharge** | Reviewing a Link sends a pulse of light through it. |
| **Forgetting** | Pruning | **Dimming** | Unused Links fade to gray/dotted lines. |
| **Pomodoro** | Timer | **Focus Flow** | A circular energy bar that fills up over 25 mins. |
| **Currency** | Points | **Lumen** | Gather light by keeping your network bright. |

---

## 5. The User Journey

1. **Ignition (Creation):** The user uploads a PDF. The AI scatters **Sparks** (dots) onto the canvas.
2. **Connection (Learning):** The user draws lines between Sparks. The AI suggests the **Link** label (e.g., "Causes," "Is part of"). *Snap!* The line glows.
3. **Maintenance (Daily Loop):** The user sees their web is "Dimming." They play the "Recharge" mode. Correct answers send pulses of electricity through the web, restoring the brightness.

### Next Steps

1. **Backend:** Initialize the Spring Boot project with `spring-ai` and `spring-boot-docker-compose` (for local Postgres).
2. **Database:** Execute the SQL Schema we designed (Sparks/Links tables).
3. **Frontend:** Initialize Expo and install `react-native-skia` to prototype the "Glowing Spark" component.
