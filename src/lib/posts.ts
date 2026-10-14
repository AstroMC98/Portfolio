import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * Published = not a draft and dated today or earlier (at build time).
 * Future-dated posts go live automatically on the first build after their date
 * (the deploy workflow rebuilds daily). In `astro dev` everything is visible.
 */
export function isLive(p: Post, now = new Date()) {
  return !isLocalDraft(p) && !p.data.draft && !needsReview(p) && p.data.date.getTime() <= now.getTime();
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
  const words = (p.body ?? '').replace(/<[^>]+>|import .*|\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.round(words / 230));
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
