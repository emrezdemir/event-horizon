import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  const db = await SQLite.openDatabaseAsync('news.db');
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  _db = db;
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      icon_url TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_fetched_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      published_at INTEGER,
      summary TEXT,
      content_html TEXT,
      content_text TEXT,
      original_lang TEXT,
      translated_title TEXT,
      translated_content TEXT,
      image_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      fetched_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
      title, summary, content_text, translated_title, translated_content,
      content='articles', content_rowid='id',
      tokenize='unicode61 remove_diacritics 2'
    );

    CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, summary, content_text, translated_title, translated_content)
      VALUES (new.id, new.title, COALESCE(new.summary,''), COALESCE(new.content_text,''),
              COALESCE(new.translated_title,''), COALESCE(new.translated_content,''));
    END;

    CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_text, translated_title, translated_content)
      VALUES('delete', old.id, old.title, COALESCE(old.summary,''), COALESCE(old.content_text,''),
             COALESCE(old.translated_title,''), COALESCE(old.translated_content,''));
    END;

    CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_text, translated_title, translated_content)
      VALUES('delete', old.id, old.title, COALESCE(old.summary,''), COALESCE(old.content_text,''),
             COALESCE(old.translated_title,''), COALESCE(old.translated_content,''));
      INSERT INTO articles_fts(rowid, title, summary, content_text, translated_title, translated_content)
      VALUES (new.id, new.title, COALESCE(new.summary,''), COALESCE(new.content_text,''),
              COALESCE(new.translated_title,''), COALESCE(new.translated_content,''));
    END;
  `);
}
