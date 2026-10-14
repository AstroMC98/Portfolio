# Marc Castro — AI Engineering Portfolio

Live: https://portfolio.marccastro.solutions

Static Astro site with GSAP motion, deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Develop

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm run preview
```

## Where things live

| Path | What |
|---|---|
| `src/data/projects.ts` | The 9 case studies, snippet walkthroughs, proof-of-value blocks |
| `src/data/caseMeta.ts` | Featured flag, filter tags, headline KPI, flagship architecture diagrams, `kpiVerified` |
| `src/data/profile.ts` | Name, links, availability, headline metrics |
| `src/data/engagements.ts` | **Fill me in:** per-case engagement facts (sector, employer, dates, team, scale, brief, walkthrough video, incidents) + testimonials — empty fields are hidden |
| `src/data/deploy.ts` | “How I deploy” playbook, integration surface, sectors |
| `src/components/BurstLab.astro` | Interactive rate-limiter simulation on the Document Intelligence case file |
| `src/data/experience.ts` | Roles + swimlane timeline + milestones |
| `src/data/skills.ts` / `recognition.ts` | Capability stack, hackathons, publications, speaking, services |
| `src/components/` | One component per homepage section |
| `src/pages/work/[id].astro` | Full case-file page per project (`/work/<id>/`) |
| `src/components/case/` | `Decision` (one engineering decision chapter), `CodePane` (build-time Shiki highlighting), `ArchModel` (stepped SVG) |
| `src/scripts/casePage.ts` | Walkthrough interactions: scroll/click steps → highlighted code lines + architecture state |
| `src/components/Logo.astro`, `scripts/brand.mjs` | "Signal M" logo; `node scripts/brand.mjs` regenerates favicons + `public/brand/*.svg` |
| `src/scripts/motion.ts` | GSAP choreography (progressive enhancement; skipped for reduced motion) |
| `public/snippets/` | Curated code excerpts, highlighted at build time into the case files |
| `src/pages/og.astro` | Source for `public/og.png` — screenshot at 1200×630 to regenerate |

Before publishing: `grep -rn "TODO(confirm)" src/` should return nothing.

## Blog

Posts are MDX files in `src/content/blog/` (schema in `src/content.config.ts`). Each post can use the exhibit components in `src/components/blog/` — `Exhibit`, `Bars`, `Columns`, `Lines`, `Slope`, `Waffle`, `Stats`, `Matrix`, `Flow`, `Compare`, `Timeline`, `Note` — and gets generative cover art from its `motif`.

- **Scheduling:** a post is public when it is in `blog/`, `draft` is false, it has no review flags, and `date` is today or earlier at build time. The deploy workflow rebuilds daily, so future-dated posts publish themselves.
- **Local drafts:** `src/content/drafts/` is git-ignored. Posts there show up in `npm run dev` but are never committed or published.
- **Previewing unpublished posts:** `npm run dev` shows everything, or build with `SHOW_SCHEDULED=true npm run build`.
- **Review flags:** first-person passages marked `<Note kind="field" review>` and a post-level `review:` field render "TO CONFIRM" badges and block publishing. Resolve them before publishing.
- **Feed:** `/blog/rss.xml`.

### Blog admin (local only)

`npm run admin` starts the dev server and opens `http://localhost:4321/admin`, a password-protected editor for the blog.

- **Needs you** (the landing view) lists every passage that needs the author, across all posts and `src/data/*.ts`, and each one can be fixed in place without opening the file:
  - review flags, which block publishing;
  - `TODO` markers and template placeholders;
  - first-person "your experience" notes (`<Note kind="field">`), each with a **Looks right** check-off;
  - `TODO(confirm)` site facts;
  - missing thesis, takeaways or sources.

  Checked-off passages are stored in the git-ignored `admin/.state.json` and come back if their text changes.
- **Post editor**:
  - *Content* shows the body one `##` section at a time, with an outline giving word count, exhibit count and needs badges per section.
  - *Details & sources* holds the frontmatter, including an optional `updated` date shown as "Updated …" under the byline.
- Preview links, "new post" (created as a local draft), move between `blog/` and `drafts/`, and trash (`src/content/.trash/`, git-ignored).

- Set the password in `.env` (git-ignored): copy `.env.example` and set `ADMIN_PASSWORD`. Without it the admin refuses all logins.
- It exists **only in `astro dev`** (`integrations/blog-admin.mjs`, Vite middleware) and answers only loopback requests. The static build and GitHub Pages never contain it — publishing still happens by committing and pushing.
- Saves edit the YAML in place, so unchanged frontmatter keeps its formatting and line endings; a one-field edit is a one-line diff.

## Model bake-off harness

`scripts/model-bakeoff/` compares Claude, Gemini and OpenAI models on persona, technical and latency tasks.

```bash
ANTHROPIC_API_KEY=… GEMINI_API_KEY=… OPENAI_API_KEY=… node scripts/model-bakeoff/run.mjs --judge
```

It writes `src/data/bakeoff-results.json`. The draft post `gemini-claude-openai-by-task` renders its results exhibits automatically from that file. Edit models, prices and tasks in `scripts/model-bakeoff/config.mjs`.
