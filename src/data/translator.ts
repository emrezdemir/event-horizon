import type { TranslationProvider } from '@/state/settings';

const TR_CHARS = /[şŞğĞıİçÇüÜöÖ]/;
const TR_STOPWORDS =
  /\b(ve|bir|bu|şu|için|ile|de|da|ki|mi|mu|mı|olarak|ama|ancak|çünkü|gibi|daha|kadar|sonra|önce)\b/i;

const MAX_CHUNK = 480; // MyMemory free tier safe size

export interface TranslateInput {
  text: string;
  /** ISO 639-1, ör. 'en', 'de'. */
  sourceLang: string;
}

export interface TranslateResult {
  text: string;
  provider: TranslationProvider;
  source: string;
}

export function looksTurkish(s: string): boolean {
  if (!s) return false;
  if (TR_CHARS.test(s)) return true;
  return TR_STOPWORDS.test(s);
}

export async function translateToTurkish(
  input: TranslateInput,
  config: { provider: TranslationProvider; apiKey?: string; endpoint?: string },
): Promise<TranslateResult> {
  const trimmed = input.text.trim();
  if (!trimmed) return { text: '', provider: config.provider, source: input.sourceLang };

  if (looksTurkish(trimmed)) {
    return { text: trimmed, provider: config.provider, source: 'tr' };
  }

  const chunks = chunkText(trimmed, MAX_CHUNK);
  const out: string[] = [];
  for (const chunk of chunks) {
    out.push(await translateChunk(chunk, input.sourceLang, config));
  }
  return { text: out.join(' '), provider: config.provider, source: input.sourceLang };
}

async function translateChunk(
  text: string,
  sourceLang: string,
  config: { provider: TranslationProvider; apiKey?: string; endpoint?: string },
): Promise<string> {
  switch (config.provider) {
    case 'mymemory':
      return mymemoryTranslate(text, sourceLang);
    case 'libretranslate':
      return libreTranslate(text, sourceLang, config.endpoint, config.apiKey);
    case 'deepl':
      if (!config.apiKey) throw new Error('DeepL için API key gerekli');
      return deeplTranslate(text, sourceLang, config.apiKey);
  }
}

async function mymemoryTranslate(text: string, sourceLang: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text,
  )}&langpair=${encodeURIComponent(sourceLang)}|tr`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  return data.responseData?.translatedText ?? text;
}

async function libreTranslate(
  text: string,
  sourceLang: string,
  endpoint = 'https://libretranslate.com/translate',
  apiKey?: string,
): Promise<string> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: 'tr',
      format: 'text',
      ...(apiKey ? { api_key: apiKey } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LibreTranslate ${res.status}`);
  const data = (await res.json()) as { translatedText?: string };
  return data.translatedText ?? text;
}

async function deeplTranslate(text: string, sourceLang: string, apiKey: string): Promise<string> {
  // DeepL free endpoint: api-free.deepl.com, paid: api.deepl.com
  const endpoint = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
  const params = new URLSearchParams();
  params.append('text', text);
  params.append('source_lang', sourceLang.toUpperCase());
  params.append('target_lang', 'TR');
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}`);
  const data = (await res.json()) as { translations?: Array<{ text: string }> };
  return data.translations?.[0]?.text ?? text;
}

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let buf = '';
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if ((buf + ' ' + sentence).length > max) {
      if (buf) out.push(buf.trim());
      if (sentence.length > max) {
        // hard split
        for (let i = 0; i < sentence.length; i += max) {
          out.push(sentence.slice(i, i + max));
        }
        buf = '';
      } else {
        buf = sentence;
      }
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}
