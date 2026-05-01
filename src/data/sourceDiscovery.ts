import { parse as parseHtml } from 'node-html-parser';

import { httpGetText } from './http';

export interface Discovered {
  url: string;
  title: string;
  type: 'rss' | 'html';
  iconUrl: string | null;
}

const FALLBACK_FEED_PATHS = [
  '/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml',
  '/feeds/posts/default', '/?feed=rss2',
];

export async function discoverSource(input: string): Promise<Discovered> {
  const normalized = normalize(input);
  const baseHost = new URL(normalized).host;

  if (await isFeedUrl(normalized)) {
    return { url: normalized, title: baseHost, type: 'rss', iconUrl: faviconFor(normalized) };
  }

  const body = await httpGetText(normalized);
  const root = parseHtml(body);

  const links = root.querySelectorAll('link[rel="alternate"]');
  for (const l of links) {
    const t = (l.getAttribute('type') ?? '').toLowerCase();
    const href = l.getAttribute('href');
    if (!href) continue;
    if (t.includes('rss') || t.includes('atom')) {
      const resolved = new URL(href, normalized).toString();
      return {
        url: resolved,
        title:
          l.getAttribute('title') ??
          root.querySelector('title')?.text?.trim() ??
          baseHost,
        type: 'rss',
        iconUrl: faviconFor(normalized),
      };
    }
  }

  for (const path of FALLBACK_FEED_PATHS) {
    const candidate = new URL(path, normalized).toString();
    if (await isFeedUrl(candidate)) {
      return {
        url: candidate,
        title: root.querySelector('title')?.text?.trim() ?? baseHost,
        type: 'rss',
        iconUrl: faviconFor(normalized),
      };
    }
  }

  return {
    url: normalized,
    title: root.querySelector('title')?.text?.trim() ?? baseHost,
    type: 'html',
    iconUrl: faviconFor(normalized),
  };
}

async function isFeedUrl(url: string): Promise<boolean> {
  try {
    const body = await httpGetText(url);
    const head = body.slice(0, 300).toLowerCase();
    return head.includes('<rss') || head.includes('<feed') || head.includes('<rdf');
  } catch {
    return false;
  }
}

function normalize(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith('http://') && !t.startsWith('https://')) return `https://${t}`;
  return t;
}

function faviconFor(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}/favicon.ico`;
}
