import { parse as parseHtml, type HTMLElement } from 'node-html-parser';

export interface Extracted {
  title: string | null;
  imageUrl: string | null;
  contentHtml: string;
  contentText: string;
  author: string | null;
}

const NOISE = [
  'script', 'style', 'iframe', 'noscript', 'form', 'svg', 'button',
  'nav', 'aside', 'footer', 'header',
];

const NOISE_CLASSES =
  /comment|nav|sidebar|share|social|promo|ad-|related|footer|header|newsletter|subscribe/i;
const POS_CLASSES = /article|content|post|entry|story|body|news/i;

export function extractArticle(html: string, baseUrl?: string): Extracted {
  const root = parseHtml(html);

  const title =
    root.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
    root.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ??
    root.querySelector('h1')?.text?.trim() ??
    root.querySelector('title')?.text?.trim() ??
    null;

  const imageUrlRaw =
    root.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
    root.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ??
    root.querySelector('article img, main img, img')?.getAttribute('src') ??
    null;
  const imageUrl = imageUrlRaw ? resolveUrl(imageUrlRaw, baseUrl) : null;

  const author =
    root.querySelector('meta[name="author"]')?.getAttribute('content') ??
    root.querySelector('meta[property="article:author"]')?.getAttribute('content') ??
    root.querySelector('[rel="author"]')?.text?.trim() ??
    root.querySelector('.author, .byline')?.text?.trim() ??
    null;

  const candidates: HTMLElement[] = [
    ...root.querySelectorAll('article'),
    ...root.querySelectorAll('[role="article"]'),
    ...root.querySelectorAll('main'),
    ...root.querySelectorAll(
      'div.content, div.article, div.post, div.entry, div.story, div#content, div#article, div.news',
    ),
    ...root.querySelectorAll('div'),
  ];

  let best: HTMLElement | null = null;
  let bestScore = 0;
  for (const el of candidates) {
    const s = score(el);
    if (s > bestScore) {
      bestScore = s;
      best = el;
    }
  }

  const target = best ?? root;

  for (const sel of NOISE) {
    target.querySelectorAll(sel).forEach((n) => n.remove());
  }
  for (const sel of [
    '.share', '.social', '.comments', '.comment', '.advert', '.ad', '.ads',
    '.related', '.newsletter', '.subscribe', '.promo', '.sidebar',
  ]) {
    target.querySelectorAll(sel).forEach((n) => n.remove());
  }

  const contentHtml = target.innerHTML ?? '';
  const contentText = target.text.replace(/\s+/g, ' ').trim();

  return {
    title: title?.trim() ?? null,
    imageUrl,
    contentHtml,
    contentText,
    author: author?.trim() ?? null,
  };
}

function score(el: HTMLElement): number {
  const text = el.text;
  if (text.length < 200) return 0;
  const pCount = el.querySelectorAll('p').length;
  const commaCount = (text.match(/[,،]/g) ?? []).length;
  let s = Math.floor(text.length / 25) + pCount * 10 + commaCount * 2;
  const cls = `${el.classNames ?? ''} ${el.id ?? ''}`.toLowerCase();
  if (NOISE_CLASSES.test(cls)) s -= 50;
  if (POS_CLASSES.test(cls)) s += 25;
  return s;
}

function resolveUrl(href: string, base?: string): string {
  if (!base) return href;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const root = parseHtml(html);
  return root.text.replace(/\s+/g, ' ').trim();
}
