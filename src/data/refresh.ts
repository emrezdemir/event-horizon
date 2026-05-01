import { listEnabledSources, markSourceFetched, upsertArticle } from '@/db/queries';
import { getSettings } from '@/state/settings';

import { fetchHtml } from './htmlFetcher';
import { fetchRss } from './rssFetcher';
import { translateToTurkish } from './translator';

export interface RefreshResult {
  perSource: Array<{ id: number; url: string; ok: boolean; count: number; error?: string }>;
  totalNew: number;
}

export async function refreshAllSources(): Promise<RefreshResult> {
  const settings = await getSettings();
  const sources = await listEnabledSources();
  const perSource: RefreshResult['perSource'] = [];
  let totalNew = 0;

  for (const s of sources) {
    try {
      const drafts = s.type === 'rss' ? await fetchRss(s) : await fetchHtml(s);
      let savedCount = 0;
      for (const d of drafts) {
        if (!d.title || !d.title.trim()) continue;

        let translatedTitle: string | null = d.translated_title ?? null;
        if (settings.translateTitlesOnRefresh && !translatedTitle) {
          try {
            const r = await translateToTurkish(
              { text: d.title, sourceLang: settings.defaultSourceLang },
              {
                provider: settings.translationProvider,
                apiKey: settings.translationApiKey || undefined,
                endpoint: settings.translationEndpoint || undefined,
              },
            );
            if (r.source !== 'tr') translatedTitle = r.text;
          } catch {
            // ignore
          }
        }

        await upsertArticle({ ...d, translated_title: translatedTitle });
        savedCount++;
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
  return { perSource, totalNew };
}
