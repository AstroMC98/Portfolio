# Portfolio — ML/AI Engineer

Static GitHub Pages site showcasing 9 ML/AI projects.

## Local Development

Snippets are fetched via `fetch()` — you **must** use a local server, not `file://`:

```bash
cd D:\Portfolio
python -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Push `main` branch → GitHub → Settings → Pages → Source: `main` branch, root folder.

The site goes live at `https://your-username.github.io/your-repo/`.

## Personalisation Checklist

Before publishing:
- [ ] Replace contact links in `index.html` (GitHub, LinkedIn, email)
- [ ] Add `assets/images/avatar.jpg` (your photo) and update `index.html` to use `<img>` instead of the placeholder div
- [ ] Add `assets/resume.pdf`
- [ ] Update hero description and About section text
- [ ] Update stat numbers in the About section
- [ ] Review all 9 project descriptions in `assets/js/data/projects.js`

## Structure

```
index.html                   — single-page site
assets/
  css/main.css               — tokens, reset, layout
  css/components.css         — nav, cards, modal, contact
  css/animations.css         — scroll-reveal (IntersectionObserver)
  js/main.js                 — nav scroll, mobile menu, reveal observer
  js/projects.js             — renders project cards from data
  js/snippet-viewer.js       — fetch + highlight.js modal
  js/data/projects.js        — all 9 project metadata objects
  images/avatar.jpg          — (add your photo here)
  resume.pdf                 — (add your resume here)
snippets/
  d2lt-enhanced/             — Document Intelligence Pipeline
  daiso/                     — Local RAG
  wfgpt-prod/                — Enterprise RAG Chat
  llmops-platform/           — LLMOps Evaluation Platform
  elevenow-agents/           — Customer Service Copilot
  elevenow-rag/              — Hybrid RAG
  cfmm-papermill/            — Notebook Pipeline
  stem-monitoring/           — Skill Gap Dashboard
  triage-demo/               — AI Triage System
```

## Privacy

All 9 private project directories are listed in `.gitignore` and will **never** be committed.
The snippets in `/snippets/` are manually curated excerpts — no client names,
no internal paths, no proprietary identifiers.
