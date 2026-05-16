import { XMLParser } from 'fast-xml-parser';

import type { ArticleDraft } from '@/db/types';

import { httpGetText } from './http';
import { stripHtml } from './readability';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
});

export async function fetchRss(source: { id: number; url: string }): Promise<ArticleDraft[]> {
  const xml = await httpGetText(source.url);
  const data = parser.parse(xml);

  if (data.rss?.channel) {
    return parseRss(data.rss.channel, source.id);
  }
  if (data.feed) {
    return parseAtom(data.feed, source.id);
  }
  if (data['rdf:RDF']) {
    return parseRdf(data['rdf:RDF'], source.id);
  }
  return [];
}

function parseRss(channel: any, sourceId: number): ArticleDraft[] {
  const items = toArray(channel.item);
  return items
    .map((item: any): ArticleDraft | null => {
      const link = textOf(item.link) ?? textOf(item.guid);
      if (!link) return null;
      const title = textOf(item.title) ?? link;
      const description = textOf(item.description) ?? textOf(item['content:encoded']);
      const pubDate = textOf(item.pubDate);
      const author = textOf(item.author) ?? textOf(item['dc:creator']);
      const enclosureUrl =
        item.enclosure?.['@_url'] ??
        item['media:content']?.['@_url'] ??
        item['media:thumbnail']?.['@_url'] ??
        null;
      const summary = stripHtml(description ?? '').slice(0, 400);
      return {
        source_id: sourceId,
        url: link,
        title: title.trim(),
        author: author ?? null,
        published_at: pubDate ? Date.parse(pubDate) || null : null,
        summary: summary || null,
        content_html: textOf(item['content:encoded']) ?? description ?? null,
        content_text: stripHtml(description ?? null),
        image_url: enclosureUrl,
      } satisfies ArticleDraft;
    })
    .filter((x: ArticleDraft | null): x is ArticleDraft => x !== null);
}

function parseAtom(feed: any, sourceId: number): ArticleDraft[] {
  const entries = toArray(feed.entry);
  return entries
    .map((entry: any): ArticleDraft | null => {
      const links = toArray(entry.link);
      const link =
        links.find((l: any) => l['@_rel'] === 'alternate' || !l['@_rel'])?.['@_href'] ??
        textOf(entry.id);
      if (!link) return null;
      const title = textOf(entry.title) ?? link;
      const summary = textOf(entry.summary);
      const content = textOf(entry.content);
      const published = textOf(entry.published) ?? textOf(entry.updated);
      const author = textOf(entry.author?.name);
      return {
        source_id: sourceId,
        url: link,
        title: title.trim(),
        author: author ?? null,
        published_at: published ? Date.parse(published) || null : null,
        summary: stripHtml(summary ?? '').slice(0, 400) || null,
        content_html: content ?? summary ?? null,
        content_text: stripHtml(content ?? summary ?? null),
        image_url: null,
      };
    })
    .filter((x): x is ArticleDraft => x !== null);
}

function parseRdf(rdf: any, sourceId: number): ArticleDraft[] {
  const items = toArray(rdf.item);
  return items
    .map((item: any): ArticleDraft | null => {
      const link = textOf(item.link);
      if (!link) return null;
      const title = textOf(item.title) ?? link;
      const description = textOf(item.description);
      return {
        source_id: sourceId,
        url: link,
        title: title.trim(),
        summary: stripHtml(description ?? '').slice(0, 400) || null,
        content_html: description ?? null,
        content_text: stripHtml(description ?? null),
        image_url: null,
      };
    })
    .filter((x): x is ArticleDraft => x !== null);
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    if (typeof v['#text'] === 'string') return v['#text'];
    if (typeof v['@_href'] === 'string') return v['@_href'];
  }
  return undefined;
}
