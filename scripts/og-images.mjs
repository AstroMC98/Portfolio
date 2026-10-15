/**
 * Social share images for blog posts — public/images/og/<slug>.png (1200×630).
 *
 * Screenshots the dev-only card page /og-card/<slug>/ (src/pages/og-card/[slug].astro), so the
 * cards use the real site fonts and each post's own cover art. Needs the dev server running.
 *
 *   npm run og                 # every post that has no image yet
 *   npm run og -- --all        # regenerate all
 *   npm run og -- my-slug      # specific posts
 *   BASE_URL=http://localhost:4400 npm run og
 *
 * The blog admin calls generateOgImages() for its "Generate share image" button.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const OG_DIR = path.join(ROOT, 'public', 'images', 'og');

export const ogImagePath = (slug) => path.join(OG_DIR, `${slug}.png`);

/** Launch bundled Chromium, falling back to the locally installed Chrome. */
async function launch() {
  const { chromium } = await import('playwright');
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: 'chrome' });
  }
}

export async function generateOgImages({ baseUrl = 'http://localhost:4321', slugs }) {
  mkdirSync(OG_DIR, { recursive: true });
  const browser = await launch();
  const done = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    for (const slug of slugs) {
      const res = await page.goto(`${baseUrl}/og-card/${slug}/`, { waitUntil: 'load', timeout: 120_000 });
      if (!res || !res.ok()) throw new Error(`Card page for "${slug}" returned ${res?.status()}`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.querySelector('astro-dev-toolbar')?.remove(); // dev-server overlay, not part of the card
      });
      const shot = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 }, animations: 'disabled', timeout: 120_000 });
      // Palette PNG keeps text crisp at roughly a third of the size (social crawlers fetch these a lot).
      const { default: sharp } = await import('sharp');
      await sharp(shot).png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 }).toFile(ogImagePath(slug));
      done.push(slug);
    }
  } finally {
    await browser.close();
  }
  return done;
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const named = args.filter((a) => !a.startsWith('--'));
  const posts = readdirSync(path.join(ROOT, 'src', 'content', 'blog'))
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => f.replace(/\.mdx$/, ''));
  const slugs = named.length ? named : all ? posts : posts.filter((s) => !existsSync(ogImagePath(s)));
  if (!slugs.length) {
    console.log('Every post already has a share image (use --all to regenerate).');
  } else {
    const baseUrl = process.env.BASE_URL || 'http://localhost:4321';
    const done = await generateOgImages({ baseUrl, slugs });
    console.log(`Wrote ${done.length} share image(s) to public/images/og/: ${done.join(', ')}`);
  }
}
