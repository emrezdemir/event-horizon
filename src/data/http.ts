const UA =
  'Mozilla/5.0 (Mobile; NewsApp/0.1) AppleWebKit/605.1.15 (KHTML, like Gecko)';

export async function httpGetText(url: string, init?: RequestInit): Promise<string> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'User-Agent': UA,
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*;q=0.5',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function httpHead(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
