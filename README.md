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
- **Feed:** `/blog/rss.xml` (linked from every page's `<head>`).
- **Search & sharing:**
  - Each post has a short `seoTitle` of 46 characters or fewer, rendered as "<seoTitle> | Marc Castro" within 60 characters. The admin shows a live length check.
  - Posts carry `og:type=article`, article times and tags, and BlogPosting + BreadcrumbList JSON-LD linked to the site's Person (`/#person`).
  - The sitemap gets `lastmod` from each post's `updated` or `date` field.
  - `public/robots.txt` points crawlers at the sitemap.
- **Share images:**
  - Every post needs `public/images/og/<slug>.png` (1200×630), rendered from the dev-only card page `/og-card/<slug>/`. Without it, the post falls back to the site card `/og.png`.
  - With the dev server running, `npm run og` creates the missing images (`--all` regenerates everything; set `BASE_URL` if the server isn't on port 4321).
  - The admin flags missing images and has a "Generate share image" button.
  - Commit the PNG with the post.

### Blog admin (local only)

`npm run admin` starts the dev server and opens `http://localhost:4321/admin`, a password-protected editor for the blog.

- **Needs you** (the landing view) lists every passage that needs the author, across all posts, their ELI5 versions (tagged "ELI5") and `src/data/*.ts`, and each one can be fixed in place without opening the file:
  - review flags, which block publishing;
  - `TODO` markers and template placeholders;
  - first-person "your experience" notes (`<Note kind="field">`), each with a **Looks right** check-off;
  - `TODO(confirm)` site facts;
  - missing thesis, takeaways or sources.

  Checked-off passages are stored in the git-ignored `admin/.state.json` and come back if their text changes.
- **Post editor**:
  - *In depth* shows the body one `##` section at a time, with an outline giving word count, exhibit count and needs badges per section.
  - *ELI5* edits the plain-English version (`src/content/simple/<slug>.mdx`) the same way, plus its own dek and takeaways. Posts without one get a **Create ELI5 version** button that starts from a short template (lede, "Jargon decoder", "If you remember one thing"); posts that have one show an "ELI5" marker in the sidebar.
  - *Details & sources* holds the frontmatter, including an optional `updated` date shown as "Updated …" under the byline.
  - One Save (Ctrl+S) writes whichever versions have unsaved changes.
- Preview links (`?view=eli5` from the ELI5 tab), "new post" (created as a local draft), move between `blog/` and `drafts/` (the ELI5 file stays in `src/content/simple/` either way), and trash (`src/content/.trash/`, git-ignored; the ELI5 file goes with the post, suffixed `.eli5`).

- Set the password in `.env` (git-ignored): copy `.env.example` and set `ADMIN_PASSWORD`. Without it the admin refuses all logins.
- It exists **only in `astro dev`** (`integrations/blog-admin.mjs`, Vite middleware) and answers only loopback requests. The static build and GitHub Pages never contain it — publishing still happens by committing and pushing.
- Saves edit the YAML in place, so unchanged frontmatter keeps its formatting and line endings; a one-field edit is a one-line diff.

## Model bake-off harness

`scripts/model-bakeoff/` compares Claude, Gemini and OpenAI models on persona, technical and latency tasks.

```bash
ANTHROPIC_API_KEY=… GEMINI_API_KEY=… OPENAI_API_KEY=… node scripts/model-bakeoff/run.mjs --judge
```

It writes `src/data/bakeoff-results.json`. The draft post `gemini-claude-openai-by-task` renders its results exhibits automatically from that file. Edit models, prices and tasks in `scripts/model-bakeoff/config.mjs`.
