import { parse as parseHtml } from 'node-html-parser';

import type { ArticleDraft } from '@/db/types';

import { httpGetText, resolveUrl } from './http';
import { extractArticle } from './readability';

const SELECTORS = [
  'article a[href]',
  'h2 a[href]',
  'h3 a[href]',
  '[role="article"] a[href]',
  '.news a[href]',
  '.post a[href]',
  '.card a[href]',
  '.headline a[href]',
];

export async function fetchHtml(
  source: { id: number; url: string },
  maxArticles = 12,
): Promise<ArticleDraft[]> {
  const homeHtml = await httpGetText(source.url);
  const root = parseHtml(homeHtml);
  const baseHost = new URL(source.url).host;

  const seen = new Set<string>();
  const candidates: Array<{ url: string; text: string }> = [];

  outer: for (const sel of SELECTORS) {
    for (const a of root.querySelectorAll(sel)) {
      const href = a.getAttribute('href');
      const text = a.text.trim();
      if (!href) continue;
      if (text.length < 20) continue;
      const absolute = resolveUrl(href, source.url);
      try {
        if (new URL(absolute).host !== baseHost) continue;
      } catch {
        continue;
      }
      if (!seen.add(absolute)) continue;
      candidates.push({ url: absolute, text });
      if (candidates.length >= maxArticles) break outer;
    }
  }

  const drafts: ArticleDraft[] = [];
  for (const c of candidates) {
    try {
      const html = await httpGetText(c.url);
      const ext = extractArticle(html, c.url);
      const title = ext.title?.trim() || c.text;
      drafts.push({
        source_id: source.id,
        url: c.url,
        title,
        author: ext.author,
        published_at: null,
        summary:
          ext.contentText.length > 400 ? `${ext.contentText.slice(0, 400)}…` : ext.contentText,
        content_html: ext.contentHtml,
        content_text: ext.contentText,
        image_url: ext.imageUrl,
      });
    } catch {
      drafts.push({
        source_id: source.id,
        url: c.url,
        title: c.text,
      });
    }
  }
  return drafts;
}
