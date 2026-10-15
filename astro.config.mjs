import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { mcTheme } from './src/lib/shikiTheme.ts';
// Local-only blog editor at /admin (dev server only; never part of the static build).
import blogAdmin from './integrations/blog-admin.mjs';

const SITE = 'https://portfolio.marccastro.solutions';

/** Last-modified date per blog URL (`updated`, else `date`), read from the posts' frontmatter. */
function postDates() {
  const dir = './src/content/blog';
  const dates = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.mdx'))) {
    const fm = readFileSync(`${dir}/${f}`, 'utf8').split(/^---\s*$/m)[1] ?? '';
    const pick = (k) => fm.match(new RegExp(`^${k}:\\s*["']?(\\d{4}-\\d{2}-\\d{2})`, 'm'))?.[1];
    const d = pick('updated') ?? pick('date');
    if (d) dates[`${SITE}/blog/${f.replace(/\.mdx$/, '')}/`] = d;
  }
  return dates;
}
const lastmod = postDates();
// "Today" in Manila (UTC+8), matching when posts go live (src/lib/posts.ts).
const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
// The home page and blog index change whenever the newest live post does.
const newest = Object.values(lastmod).filter((d) => d <= today).sort().pop();

export default defineConfig({
  site: SITE,
  markdown: {
    shikiConfig: { theme: mcTheme, wrap: false },
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og'),
      serialize(item) {
        const d = lastmod[item.url] ?? (item.url === `${SITE}/` || item.url === `${SITE}/blog/` ? newest : undefined);
        return d ? { ...item, lastmod: new Date(`${d}T00:00:00Z`).toISOString() } : item;
      },
    }),
    blogAdmin(),
  ],
});
