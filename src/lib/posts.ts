import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * Published = not a draft and dated today or earlier (at build time).
 * Future-dated posts go live automatically on the first build after their date
 * (the deploy workflow rebuilds daily). In `astro dev` everything is visible.
 */
export function isLive(p: Post, now = new Date()) {
  return !isLocalDraft(p) && !p.data.draft && !needsReview(p) && publishTime(p.data.date) <= now.getTime();
}

/**
 * A post dated YYYY-MM-DD goes live at 00:00 Manila time (UTC+8) that day, so the 06:00-Manila
 * daily rebuild publishes it on its own date rather than a day late.
 */
export const PUBLISH_UTC_OFFSET_H = 8;
export function publishTime(date: Date) {
  return date.getTime() - PUBLISH_UTC_OFFSET_H * 3600_000;
}

/** Posts in src/content/drafts/ are local-only (git-ignored) and never publish. */
export function isLocalDraft(p: Post) {
  return /(^|[\\/])drafts[\\/]/.test(p.filePath ?? '');
}

/**
 * A post with unresolved author-review flags never publishes: remove the frontmatter `review`
 * field and every `<Note … review>` flag once the passages are confirmed or edited.
 */
export function needsReview(p: Post) {
  return Boolean(p.data.review) || /<Note[^>]*\sreview[\s>]/.test(p.body ?? '');
}

export async function getPosts({
  includeUnpublished = import.meta.env.DEV || import.meta.env.SHOW_SCHEDULED === 'true',
} = {}) {
  const all = await getCollection('blog');
  return all
    .filter((p) => includeUnpublished || isLive(p))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function readingMinutes(p: Post) {
  return minutesFor(p.body);
}

/** Reading time for any MDX body (also used for the ELI5 versions). */
export function minutesFor(body = '') {
  const words = body.replace(/<[^>]+>|import .*|\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 230));
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
