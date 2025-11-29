### Global UI Elements (The Design System)
* **Background:** Deep OLED Black (`#050505`).
* **Primary Light:** Neon Cyan (`#00F0FF`) for active links.
* **Secondary Light:** Warm Gold (`#FFD700`) for mastered/brilliant links.
* **Warning Light:** Dim Red (`#FF3333`) for fading/decaying links.
* **Font:** A clean, tech-sans font (e.g., *Inter* or *Rajdhani*).

---

### Tab 1: The Web (Home Dashboard)
*The user's "Garden of Knowledge." A 3D graph view.*

* **Header:**
    * **Top Left:** "Lumen: 450" (Currency).
    * **Top Right:** "Spark Energy: 2/3" (Daily AI Limit).
* **Main View (The Canvas):**
    * **Visual:** A pannable, zoomable infinite canvas.
    * **Content:** Floating **Clusters** (Groups of nodes).
        * *Healthy Cluster:* Glowing bright blue with solid connecting lines.
        * *Fading Cluster:* Dim, gray nodes with dotted/flickering lines.
    * **Interaction:** Pinch to zoom. Drag to move. Tap a Cluster to open "Cluster Detail."
* **Bottom Sheet (Mini-Summary):**
    * "3 Clusters are dimming. Recharge required."
    * **Primary Button:** `[ Quick Recharge (15 Sparks) ]`

### Tab 2: Recharge (The Study Interface)
*The core SRS loop. Where the "Connecting" happens.*

* **The Stage:**
    * **Visual:** Two large glowing nodes float in the center.
    * **Left Node:** `[ Java ]`
    * **Right Node:** `[ Bytecode ]`
    * **The Link:** A broken/disconnected line between them with a `?` in the middle.
    * **The Prompt:** "How do they connect?"
* **Interaction (The Reveal):**
    * User taps the screen (or holds).
    * **Animation:** The line "snaps" together with an electric sound. The label appears: **"Compiles into"**.
* **The Grading (Bottom Bar):**
    * Instead of "Again/Good/Easy," use narrative terms:
    * **Button 1 (Red):** `[ Broken ]` (I forgot).
    * **Button 2 (Blue):** `[ Connected ]` (I remembered).
    * **Button 3 (Gold):** `[ Brilliant ]` (Too easy).
* **Feedback:**
    * If "Brilliant": The line bursts with light and thickens.
    * If "Broken": The line flickers and fades.

### Tab 3: Ignite (Center Floating Button)
*The Creation Modal. The "Genesis" engine.*

* **Triggers:** Tapping the center `+` button opens this modal.
* **Input Methods:**
    * **Option A: "Capture" (Camera):** Scan a textbook page.
    * **Option B: "Inject" (File):** Upload PDF/Text.
    * **Option C: "Spark" (Manual):** Type a topic (e.g., "Photosynthesis").
* **The Loading State (The Story):**
    * *Visual:* Particles gathering in a vortex.
    * *Text:* "Synthesizing connections... Identifying Sparks..."
* **The Preview (The Editor):**
    * Shows the generated graph.
    * User can drag nodes to rearrange or swipe to delete bad connections.
* **Final Action:** `[ Ignite ]` -> The sparks fly into "The Web."

### Tab 4: Explore (Community & Social)
*Browsing other users' galaxies.*

* **Search:** "Find Universes..."
* **Categories:**
    * "Trending Galaxies" (Most downloaded decks).
    * "Newborn Stars" (New uploads).
* **Deck Preview Card:**
    * Don't show a list. Show a **mini-thumbnail of their graph**.
    * Stats: "50 Sparks • 120 Links".
    * **Action:** `[ Clone to Web ]` (Downloads the deck).

### Tab 5: Architect (Profile & Stats)
*Long-term progress and settings.*

* **The Heatmap:**
    * A grid of squares showing activity over the last 365 days.
    * *Dark:* No study.
    * *Bright:* High Lumen earned.
* **Stats:**
    * **Total Sparks:** 1,240.
    * **Brilliance Score:** 85% (Avg retention).
    * **Longest Streak:** 14 Days.
* **Focus Settings:**
    * "Focus Flow Duration" (Default: 25m).
    * "Ambient Sound" (On/Off).
* **Subscription:**
    * **Free:** "Apprentice Architect" (Limit 3 AI/day).
    * **Pro:** "Master Builder" (Infinite).

---

### Secondary Screens (Drill-Downs)

**Screen 6: Focus Flow (Pomodoro Mode)**
* *Trigger:* Accessed via "Cluster Detail" or "Recharge."
* **Visual:** Minimalist. No UI chrome.
* **The Timer:** A glowing ring orbiting the current Spark. It slowly completes the circle.
* **Control:** Tap to "Pause Orbit." Long press to "Abort Mission."

**Screen 7: Cluster Detail (The Deck View)**
* *Trigger:* Tapping a Cluster on the Home Web.
* **Visual:** Focuses only on *this* specific group of nodes.
* **List View Toggle:** A button to switch from "Graph View" to "List View" (for bulk editing).
* **Actions:**
    * `[ Rename Cluster ]`
    * `[ Share Universe ]` (Generates a link).
    * `[ Delete ]` (Warning: "The sparks will return to the void").

---

### Implementation Advice (React Native)

For the **Graph Views** (Home & Cluster Detail), do not try to build a physics engine from scratch.

* **Recommended Library:** `react-native-skia` (for the glow effects) + `d3-force` (for the math).
* **Logic:**
    1.  Use `d3-force` to calculate the X/Y coordinates of the nodes based on connections.
    2.  Pass those X/Y coordinates to Skia `Canvas`.
    3.  Draw `<Circle>` for Sparks and `<Path>` for Links.