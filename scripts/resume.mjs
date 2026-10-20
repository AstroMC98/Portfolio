/**
 * Résumé PDF — renders resume/resume.html to public/resume.pdf (A4) with Playwright's Chromium.
 *
 *   npm run resume
 *
 * Fonts load straight from node_modules, so no dev server is needed. Fails if the
 * page count drifts from two, since a third page usually means an orphaned line.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SRC = path.join(ROOT, 'resume', 'resume.html');
const OUT = path.join(ROOT, 'public', 'resume.pdf');
const EXPECTED_PAGES = 2;

const { chromium } = await import('playwright');
let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: 'chrome' });
}

try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(SRC).href, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({
    path: OUT,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;padding:0 14mm;font:7px Consolas,monospace;color:#5b6660;display:flex;justify-content:space-between">
      <span>Marc Castro · portfolio.marccastro.solutions</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    tagged: true,
  });
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`Wrote ${path.relative(ROOT, OUT)} (${(pdf.length / 1024).toFixed(0)} KB, ${pages} pages)`);
  if (pages !== EXPECTED_PAGES) {
    console.error(`Expected ${EXPECTED_PAGES} pages, got ${pages}. Tighten resume/resume.html.`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
