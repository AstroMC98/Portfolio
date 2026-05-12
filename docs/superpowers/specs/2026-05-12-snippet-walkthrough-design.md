# Snippet Walkthrough Viewer — Design Spec
**Date:** 2026-05-12  
**Status:** Implemented — scroll-driven redesign

---

## Context

The portfolio's "Selected Case Studies" section shows project cards with "View Snippet" buttons. These open a McKinsey-style full-screen scroll-driven case study overlay. The original button-driven modal was replaced with an IntersectionObserver-driven experience where the right panel updates automatically as the user scrolls through narrative beats on the left — no buttons.

---

## Design Summary

### Overlay layout

A full-screen overlay (not a modal) takes over the viewport:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [×]  [Tab: Rate Limiter] [Tab: Async Pipeline]         [progress bar]  │  ← sticky header
├─────────────────────────────────────────────────────────────────────────┤
│  The Challenge | The Solution | The Impact                               │  ← sticky chapter nav
├──────────────────────────────────┬──────────────────────────────────────┤
│  NARRATIVE (left, scrollable)    │  VISUALIZATION (right, sticky)       │
│                                  │                                       │
│  [Challenge section]             │  code: DUAL CODE PANELS               │
│  - eyebrow / headline / body     │    classic (amber highlights)         │
│  - comparison grid or            │    implementation (indigo highlights)  │
│    numbered process steps        │                                       │
│                                  │  process: SVG ARCHITECTURE DIAGRAM    │
│  [Scroll steps — per step:]      │    nodes activate/pulse/dim           │
│  - tag pill                      │    edges highlight                    │
│  - title (h3)                    │    per scroll step                    │
│  - body (2–3 sentences)          │                                       │
│  - stat callout (big number)     │                                       │
│  - step counter (01 / 03)        │                                       │
│                                  │                                       │
│  [Impact section]                │                                       │
│  - 3 stat cards                  │                                       │
│  - caption                       │                                       │
└──────────────────────────────────┴──────────────────────────────────────┘
```

### Interaction model

- **Scroll-driven** — IntersectionObserver fires when a scroll-step enters the middle 24% band of the overlay viewport (`rootMargin: '-38% 0px -38% 0px'`). No buttons.
- **Code type**: both classic and implementation panels highlight lines simultaneously when a scroll-step activates. Classic uses amber accent; implementation uses indigo.
- **Process type**: SVG architecture nodes activate/pulse/dim per `archStep` index. Active edges swap arrowhead colour via dual `<marker>` elements.
- **Progress bar**: `scrollTop / (scrollHeight - clientHeight)` fills a 2px indigo bar across the sticky header.
- **Chapter nav**: three tabs (The Challenge / The Solution / The Impact) — active state tracks scroll position.
- **Esc key**: closes the overlay.

---

## Data Model

Each snippet entry in `projects.js`:

```js
{
  label: "Rate Limiter",
  file: "d2lt-enhanced/rate_limiter.py",
  type: "code",         // "code" | "process"

  challenge: {
    eyebrow: "Async Systems · Rate Limiting",
    headline: "Short headline — the core problem",
    body: "1–2 sentence context",
    // code type:
    comparison: {
      classic: { label, desc, verdict },
      impl:    { label, desc, verdict }
    },
    // process type instead:
    items: ["Step 1", "Step 2", ...],
    verdict: "Why this was unsustainable"
  },

  // code type only:
  classic: {
    label: "Classic — counter-based",
    note:  "Fails under burst",
    lines: [{ n: 1, t: "import asyncio" }, ...]
  },

  // process type only:
  arch: {
    viewBox, nodes, edges, extras,
    allNodes, allEdges, archSteps
  },

  impact: {
    eyebrow: "The Impact",
    stats: [{ big, bigSuffix, unit, desc }, ...],
    caption: "One-sentence summary"
  },

  steps: [
    {
      tag: "Pattern/Tradeoff/Architecture/Bug Prevention",
      title: "Step title",
      body: "2–3 sentence explanation",
      stat: { num, suffix, unit, desc },
      // code type:
      lc: [1, 2, 3],        // classic line n-values to highlight
      li: [37, 48, 52],     // impl file line numbers to highlight
      // process type:
      archStep: 0            // index into arch.archSteps
    }
  ]
}
```

---

## Snippet Inventory

### Code type (16 snippets across 9 projects)

| Project | Snippet | Steps |
|---------|---------|-------|
| d2lt-enhanced | Rate Limiter | 4 |
| d2lt-enhanced | Async Pipeline | 3 |
| daiso | RAG Engine | 3 |
| wfgpt-prod | Chat Approach | 3 |
| wfgpt-prod | RBAC Middleware | 3 |
| wfgpt-prod | Approach Registry | 3 |
| llmops-platform | Ensemble Scorer | 3 |
| llmops-platform | Drift Detector | 3 |
| elevenow-agents | Journey Tracker | 3 |
| elevenow-agents | Scorecard Generator | 3 |
| elevenow-rag | Hybrid RAG | 3 |
| elevenow-rag | Session Manager | 3 |
| cfmm-papermill | Pipeline Runner | 3 |
| stem-monitoring | Skill Gap Analysis | 3 |
| triage-demo | Triage Classifier | 3 |

### Process type (1 snippet)

| Project | Snippet | Steps | SVG nodes | SVG edges |
|---------|---------|-------|-----------|-----------|
| llmops-platform | Agentic Evaluator | 4 | 6 | 6 |

---

## Implementation

### Files changed

| File | Change |
|------|--------|
| `index.html` | Replaced modal HTML with `<div class="cs-overlay" id="cs-overlay" hidden></div>` |
| `assets/css/components.css` | ~400 lines of scroll overlay CSS appended |
| `assets/js/snippet-viewer.js` | Complete rewrite (~450 lines) |
| `assets/js/data/projects.js` | All 16 snippets expanded with scroll-driven data |

### Key implementation decisions

- **`root: ov` in IntersectionObserver** — the overlay element is the scroll container, not the viewport. Using `root: null` would fire on viewport intersection, not overlay scroll.
- **`align-items: start` on `.cs-wrap`** — required for `position: sticky` to activate on the right panel. Default `stretch` prevents sticky from working.
- **`markerUnits="userSpaceOnUse"` on SVG markers** — prevents arrowheads from scaling with stroke-width changes when edge state changes.
- **Dark theme via CSS custom properties scoped to `.cs-overlay`** — isolates the dark overlay from the site's light theme tokens without global variable conflicts.
- **`_rawCache` deduplication** — file fetches are cached by path so re-opening the same snippet doesn't re-fetch.

---

## Verification Checklist

1. `python -m http.server 8000` in `D:\Portfolio\`
2. Open `http://localhost:8000`
3. Click any project card → "View Snippets"
4. Overlay opens full-screen; background scroll is locked
5. Scroll through Challenge: comparison grid renders, chapter nav "The Challenge" is active
6. Scroll into Solution: chapter nav updates; scroll steps trigger visualization
7. **Rate Limiter**: both code panels highlight simultaneously — amber in classic, indigo in impl
8. **Agentic Evaluator**: SVG nodes activate/pulse/dim per scroll beat
9. Scroll to Impact: stats render, chapter nav updates
10. Progress bar fills as you scroll
11. Esc key closes overlay
12. Tab through multiple snippets in the same project
13. No console errors; file fetch cache works on re-open
