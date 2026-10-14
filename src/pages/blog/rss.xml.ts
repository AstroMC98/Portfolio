import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts({ includeUnpublished: false });
  return rss({
    title: 'Marc Castro — Writing',
    description: 'Field notes on forward-deployed AI engineering and production LLM systems.',
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.dek,
      pubDate: p.data.date,
      link: `/blog/${p.id}/`,
      categories: p.data.tags,
    })),
  });
}
