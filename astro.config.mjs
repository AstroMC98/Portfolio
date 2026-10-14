import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { mcTheme } from './src/lib/shikiTheme.ts';
// Local-only blog editor at /admin (dev server only; never part of the static build).
import blogAdmin from './integrations/blog-admin.mjs';

export default defineConfig({
  site: 'https://portfolio.marccastro.solutions',
  markdown: {
    shikiConfig: { theme: mcTheme, wrap: false },
  },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/og') }), blogAdmin()],
});
