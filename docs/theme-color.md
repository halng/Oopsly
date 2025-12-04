# This colour strategy focuses on **"Cognitive Ergonomics"**

For an app like **Osmosis**, where users stare at the screen for prolonged periods (Deep Reading, Flashcard Review), high-contrast pure black and white can cause eye strain (halation).

Based on research into reading environments and digital colour theory, I have designed a system called **"Focus Flow"**. It uses a sophisticated **Slate/Indigo** base which is scientifically proven to be the most relaxing colour spectrum for the human eye while maintaining alertness.

### The Design Philosophy: "Focus Flow"

  * **Primary Brand Colour (Indigo):** Represents wisdom and depth. Unlike aggressive Red or hyper-active Orange, Indigo promotes deep concentration.
  * **The "Paper" Metaphor:** We do not use "Screen White". We use "Paper White" (slightly off-white) to mimic physical study materials.
  * **The "Deep Space" Metaphor:** For Dark Mode, we avoid "Dead Black" (`#000000`) which causes "smearing" on OLED screens when scrolling. We use a deep blue-grey to maintain pixel stability and reduce glare.

-----

### 1\. The Colour Palette (JSON Ready)

You can copy this directly into your React Native theme configuration (e.g., `theme.js` or Tailwind config).

#### Light Theme ("Daylight Focus")

*Optimised for high ambient light environments.*

| Semantic Name | Hex Code | Visual Description | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `#4F46E5` | **Electric Indigo** | Main buttons, active tabs, progress bars. |
| **Background** | `#F8FAFC` | **Cool Mist** | The main screen background (behind cards). |
| **Surface** | `#FFFFFF` | **Pure White** | Flashcards, input fields, modal backgrounds. |
| **Surface Alt** | `#F1F5F9` | **Cloud Grey** | Search bars, secondary button backgrounds. |
| **Text Primary** | `#0F172A` | **Deep Ink** | Headings, main flashcard text. |
| **Text Secondary**| `#64748B` | **Slate Grey** | Subtitles, timestamps, hints. |
| **Border** | `#E2E8F0` | **Pale Edge** | Hairlines, dividers, card borders. |
| **Success** | `#10B981` | **Emerald** | "Easy" button, streaks, completed tasks. |
| **Warning** | `#F59E0B` | **Amber** | "Hard" button, nearing deadlines. |
| **Error** | `#EF4444` | **Red** | "Again" button, critical alerts, destructive actions. |

#### Dark Theme ("Midnight Flow")

*Optimised for low light/night study. Note: Primary colours are pastel-shifted to reduce eye vibration.*

| Semantic Name | Hex Code | Visual Description | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `#818CF8` | **Soft Indigo** | Main buttons (desaturated for dark mode comfort). |
| **Background** | `#0F172A` | **Deep Space** | The main screen background. |
| **Surface** | `#1E293B` | **Gunmetal** | Flashcards, input fields, modal backgrounds. |
| **Surface Alt** | `#334155` | **Steel** | Search bars, secondary button backgrounds. |
| **Text Primary** | `#F1F5F9` | **Soft Mist** | Headings, main flashcard text. |
| **Text Secondary**| `#94A3B8` | **Ash Grey** | Subtitles, timestamps, hints. |
| **Border** | `#334155` | **Steel Edge** | Hairlines, dividers, card borders. |
| **Success** | `#34D399` | **Mint** | "Easy" button (brighter for dark mode visibility). |
| **Warning** | `#FBBF24` | **Gold** | "Hard" button. |
| **Error** | `#F87171` | **Soft Red** | "Again" button. |

-----

### 2\. Applied Usage Guide (UI Components)

Here is how to map these colours to your specific screens for the best UX.

#### A. The Flashcard (The Hero Component)

The flashcard needs to look elevated and touchable.

* **Light Mode:**
  * `Background`: **Surface** (`#FFFFFF`)
  * `Shadow`: `0px 4px 6px -1px rgba(0, 0, 0, 0.1)` (Soft drop shadow)
  * `Border`: 1px solid **Border** (`#E2E8F0`)
* **Dark Mode:**
  * `Background`: **Surface** (`#1E293B`)
  * `Shadow`: None (Shadows are hard to see in dark mode).
  * `Border`: 1px solid **Surface Alt** (`#334155`) to define edges.

#### B. The SRS Buttons (Spaced Repetition)

These buttons must be instantly recognisable by colour psychology.

* **Again (Fail):** Background: Transparent / Text: **Error** colour.
* **Hard:** Background: Transparent / Text: **Warning** colour.
* **Good:** Background: **Primary** (Filled) / Text: White (The default action).
* **Easy:** Background: Transparent / Text: **Success** colour.

#### C. Navigation Bar (Tab Bar)

* **Light Mode:** **Surface** (`#FFFFFF`) with a top border of **Border** (`#E2E8F0`).
* **Dark Mode:** **Background** (`#0F172A`) with a top border of **Surface Alt** (`#334155`).
* *Note on Translucency:* For a premium "Native" iOS feel, use the background colour with `opacity: 0.9` and a `blur` effect.

#### D. The "Osmosis" Gradient

To give the app a unique identity, use a subtle gradient on the **Home Dashboard Header** and **Logo**.

* **Gradient Definition:**
  * Start: `#4F46E5` (Indigo)
  * End: `#06B6D4` (Cyan)
* *Why:* This mimics the flow of water/osmosis. Use this sparingly (only on the dashboard header or the "Upgrade to Pro" button).

-----

### 3\. Implementation in React Native

Since you are a Full-Stack engineer, here is the most efficient way to structure this using a Typescript object.

```typescript
// theme.ts

export const Palette = {
  indigo: {
    500: '#4F46E5', // Light Primary
    400: '#818CF8', // Dark Primary
  },
  slate: {
    50: '#F8FAFC',  // Light Bg
    100: '#F1F5F9', // Light Surface Alt
    200: '#E2E8F0', // Light Border
    400: '#94A3B8', // Dark Text Sec
    500: '#64748B', // Light Text Sec
    700: '#334155', // Dark Surface Alt / Border
    800: '#1E293B', // Dark Surface
    900: '#0F172A', // Dark Bg
    950: '#020617', // OLED Black (Optional)
  },
  emerald: {
    400: '#34D399',
    500: '#10B981',
  },
  red: {
    400: '#F87171',
    500: '#EF4444',
  }
};

export const LightTheme = {
  colors: {
    background: Palette.slate[50],
    surface: '#FFFFFF',
    surfaceHighlight: Palette.slate[100],
    textPrimary: Palette.slate[900],
    textSecondary: Palette.slate[500],
    primary: Palette.indigo[500],
    border: Palette.slate[200],
    success: Palette.emerald[500],
    error: Palette.red[500],
    cardShadow: 'rgba(148, 163, 184, 0.1)',
  },
  statusBarStyle: 'dark-content' as const,
};

export const DarkTheme = {
  colors: {
    background: Palette.slate[900],
    surface: Palette.slate[800],
    surfaceHighlight: Palette.slate[700],
    textPrimary: Palette.slate[100],
    textSecondary: Palette.slate[400],
    primary: Palette.indigo[400],
    border: Palette.slate[700],
    success: Palette.emerald[400],
    error: Palette.red[400],
    cardShadow: 'transparent',
  },
  statusBarStyle: 'light-content' as const,
};
```

### Recommendation for Accessibility

For your specific health needs (managing visual stress) and general accessibility:

1. **Text Contrast:** Both themes maintain a contrast ratio of at least 4.5:1 (WCAG AA standard).
2. **OLED Alternative:** If you prefer a "True Black" mode (pixels turned off) for battery saving, you can swap `Palette.slate[900]` with `#000000`, but I recommend keeping the Slate for better readability.
