import { getDb } from './client';
import type { Article, ArticleDraft, ArticleWithSource, Source, SourceType } from './types';

// ───────── Sources ─────────

export async function listSources(): Promise<Source[]> {
  const db = await getDb();
  return db.getAllAsync<Source>('SELECT * FROM sources ORDER BY title COLLATE NOCASE ASC');
}

export async function listEnabledSources(): Promise<Source[]> {
  const db = await getDb();
  return db.getAllAsync<Source>('SELECT * FROM sources WHERE enabled = 1');
}

export async function insertSource(s: {
  url: string;
  title: string;
  type: SourceType;
  icon_url: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO sources (url, title, type, icon_url) VALUES (?, ?, ?, ?)',
    s.url,
    s.title,
    s.type,
    s.icon_url,
  );
}

export async function setSourceEnabled(id: number, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sources SET enabled = ? WHERE id = ?', enabled ? 1 : 0, id);
}

export async function deleteSource(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sources WHERE id = ?', id);
}

export async function markSourceFetched(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sources SET last_fetched_at = ? WHERE id = ?', Date.now(), id);
}

// ───────── Articles ─────────

/** Returns true when a new article row was inserted, false on update. */
export async function upsertArticle(d: ArticleDraft): Promise<boolean> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM articles WHERE url = ?',
    d.url,
  );
  if (existing) {
    await db.runAsync(
      `UPDATE articles SET
         title = ?, author = COALESCE(?, author), published_at = COALESCE(?, published_at),
         summary = COALESCE(?, summary), content_html = COALESCE(?, content_html),
         content_text = COALESCE(?, content_text),
         image_url = COALESCE(?, image_url)
       WHERE id = ?`,
      d.title,
      d.author ?? null,
      d.published_at ?? null,
      d.summary ?? null,
      d.content_html ?? null,
      d.content_text ?? null,
      d.image_url ?? null,
      existing.id,
    );
    return false;
  }
  await db.runAsync(
    `INSERT INTO articles
      (source_id, url, title, author, published_at, summary, content_html, content_text, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.source_id,
    d.url,
    d.title,
    d.author ?? null,
    d.published_at ?? null,
    d.summary ?? null,
    d.content_html ?? null,
    d.content_text ?? null,
    d.image_url ?? null,
  );
  return true;
}

const ARTICLE_JOIN = `
  SELECT a.*,
         s.title AS source_title,
         s.url AS source_url,
         s.icon_url AS source_icon
  FROM articles a
  JOIN sources s ON s.id = a.source_id
`;

export async function pageArticles(limit: number, offset: number): Promise<ArticleWithSource[]> {
  const db = await getDb();
  return db.getAllAsync<ArticleWithSource>(
    `${ARTICLE_JOIN}
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.id DESC
     LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export async function countArticles(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM articles');
  return row?.n ?? 0;
}

export async function getNewArticlesSince(timestamp: number): Promise<ArticleWithSource[]> {
  const db = await getDb();
  return db.getAllAsync<ArticleWithSource>(
    `${ARTICLE_JOIN}
     WHERE a.fetched_at >= ?
     ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.id DESC`,
    timestamp,
  );
}

export async function getArticle(id: number): Promise<ArticleWithSource | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ArticleWithSource>(
    `${ARTICLE_JOIN} WHERE a.id = ?`,
    id,
  );
  return row ?? null;
}

export async function setArticleRead(id: number, read: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE articles SET is_read = ? WHERE id = ?', read ? 1 : 0, id);
}

export async function setArticleFavorite(id: number, fav: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE articles SET is_favorite = ? WHERE id = ?', fav ? 1 : 0, id);
}

export async function searchArticles(query: string, limit = 50): Promise<ArticleWithSource[]> {
  const cleaned = query.replace(/"/g, '').trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];
  const ftsQuery = tokens.map((t) => `"${t}"*`).join(' ');

  const db = await getDb();
  const ids = await db.getAllAsync<{ id: number }>(
    'SELECT rowid AS id FROM articles_fts WHERE articles_fts MATCH ? ORDER BY rank LIMIT ?',
    ftsQuery,
    limit,
  );
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const rows = await db.getAllAsync<ArticleWithSource>(
    `${ARTICLE_JOIN} WHERE a.id IN (${placeholders})`,
    ...ids.map((r) => r.id),
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((r) => byId.get(r.id)).filter((x): x is ArticleWithSource => !!x);
}

export type { Article, ArticleWithSource, Source };
