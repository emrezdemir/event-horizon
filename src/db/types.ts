export type SourceType = 'rss' | 'html';

export interface Source {
  id: number;
  url: string;
  title: string;
  type: SourceType;
  icon_url: string | null;
  enabled: number; // 0/1
  last_fetched_at: number | null; // epoch ms
  created_at: number;
}

export interface Article {
  id: number;
  source_id: number;
  url: string;
  title: string;
  author: string | null;
  published_at: number | null;
  summary: string | null;
  content_html: string | null;
  content_text: string | null;
  original_lang: string | null;
  translated_title: string | null;
  translated_content: string | null;
  image_url: string | null;
  is_read: number;
  is_favorite: number;
  fetched_at: number;
}

export interface ArticleWithSource extends Article {
  source_title: string;
  source_url: string;
  source_icon: string | null;
}

export interface ArticleDraft {
  source_id: number;
  url: string;
  title: string;
  author?: string | null;
  published_at?: number | null;
  summary?: string | null;
  content_html?: string | null;
  content_text?: string | null;
  original_lang?: string | null;
  translated_title?: string | null;
  translated_content?: string | null;
  image_url?: string | null;
}
