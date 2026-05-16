import { getNewArticlesSince, listEnabledSources, markSourceFetched, upsertArticle } from '@/db/queries';
import type { ArticleWithSource } from '@/db/types';

import { fetchHtml } from './htmlFetcher';
import { fetchRss } from './rssFetcher';

export interface RefreshResult {
  perSource: Array<{ id: number; url: string; ok: boolean; count: number; error?: string }>;
  totalNew: number;
  newArticles: ArticleWithSource[];
}

export async function refreshAllSources(): Promise<RefreshResult> {
  const since = Date.now();
  const sources = await listEnabledSources();
  const perSource: RefreshResult['perSource'] = [];
  let totalNew = 0;

  for (const s of sources) {
    try {
      const drafts = s.type === 'rss' ? await fetchRss(s) : await fetchHtml(s);
      let savedCount = 0;
      for (const d of drafts) {
        if (!d.title || !d.title.trim()) continue;
        const inserted = await upsertArticle(d);
        if (inserted) savedCount++;
      }
      await markSourceFetched(s.id);
      perSource.push({ id: s.id, url: s.url, ok: true, count: savedCount });
      totalNew += savedCount;
    } catch (err) {
      perSource.push({
        id: s.id,
        url: s.url,
        ok: false,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const newArticles = totalNew > 0 ? await getNewArticlesSince(since) : [];
  return { perSource, totalNew, newArticles };
}
