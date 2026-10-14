import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  // blog/ is committed; drafts/ is git-ignored (local-only work in progress). Ids are the file name.
  loader: glob({
    pattern: '{blog,drafts}/*.mdx',
    base: './src/content',
    generateId: ({ entry }) => entry.split(/[\\/]/).pop()!.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    date: z.coerce.date(),
    /** Last substantive revision; shown as "Updated …" next to the publish date. */
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    kicker: z.string().optional(),
    /** Cover motif for the generative cover art (see PostCover.astro). */
    motif: z.string().default('paths'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    /** Short "key takeaways" list rendered in the article header. */
    /** One-sentence thesis, rendered prominently under the header. */
    thesis: z.string().optional(),
    takeaways: z.array(z.string()).default([]),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    /** Shown on the article when the post still contains passages that need the author's review. */
    review: z.string().optional(),
  }),
});

/**
 * ELI5 / "intern" versions of blog posts: src/content/simple/<slug>.mdx, same slug as the in-depth post.
 * Rendered on the post page behind the "In depth | ELI5" toggle (linkable as ?view=eli5).
 */
const simple = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/simple' }),
  schema: z.object({
    /** The whole idea in one plain sentence. Replaces the dek when ELI5 is selected. */
    dek: z.string().optional(),
    /** Three plain-English takeaways. */
    takeaways: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, simple };
