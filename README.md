# Marc Castro — AI Engineering Portfolio

> Live site: https://astromc98.github.io/Portfolio

Portfolio of 9 production ML/AI projects spanning LLM pipelines, RAG architectures,
MLOps platforms, and data analytics systems.

## About This Repo

This repository contains the static portfolio site only — HTML, CSS, JavaScript,
and curated code snippets that demonstrate architectural patterns from each project.
The full project codebases are private.

## Tech

Built with vanilla HTML/CSS/JS — no framework, no build step.
Syntax highlighting via [highlight.js](https://highlightjs.org/).
Hosted on GitHub Pages.

## Local Preview

```bash
python -m http.server 8000
# open http://localhost:8000
```

> Note: snippets load via `fetch()` and require a local server — `file://` won't work.

## Structure

```
index.html          — single-page portfolio
assets/css/         — design tokens, components, animations
assets/js/          — nav, card renderer, snippet modal, project data
assets/images/      — profile photo
snippets/           — curated code excerpts (one per project)
```
