import 'package:html/dom.dart' as dom;
import 'package:html/parser.dart' as html_parser;

import 'html_cleaner.dart';

class ExtractedArticle {
  final String? title;
  final String? imageUrl;
  final String contentHtml;
  final String contentText;
  final String? author;

  ExtractedArticle({
    required this.title,
    required this.imageUrl,
    required this.contentHtml,
    required this.contentText,
    required this.author,
  });
}

/// Basit Readability uyarlaması: en çok metin yoğunluğuna sahip <article>
/// veya <div> adayını seçer. Mükemmel değildir ama çoğu haber sitesinde
/// yeterlidir.
ExtractedArticle extractArticle(String htmlString, {String? baseUrl}) {
  final doc = html_parser.parse(htmlString);

  final title = _findTitle(doc);
  final image = _findImage(doc, baseUrl);
  final author = _findAuthor(doc);

  dom.Element? best;
  int bestScore = 0;

  final candidates = <dom.Element>[
    ...doc.querySelectorAll('article'),
    ...doc.querySelectorAll('[role="article"]'),
    ...doc.querySelectorAll('main'),
    ...doc.querySelectorAll('div.content, div.article, div.post, div.entry, div.story, div#content, div#article, div.news'),
  ];
  candidates.addAll(doc.querySelectorAll('div'));

  for (final el in candidates) {
    final score = _score(el);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  best ??= doc.body;
  if (best == null) {
    return ExtractedArticle(
      title: title,
      imageUrl: image,
      contentHtml: '',
      contentText: '',
      author: author,
    );
  }

  _removeNoise(best);
  final sanitized = sanitizeHtml(best.outerHtml);
  final text = stripHtml(sanitized);

  return ExtractedArticle(
    title: title,
    imageUrl: image,
    contentHtml: sanitized,
    contentText: text,
    author: author,
  );
}

int _score(dom.Element el) {
  final text = el.text;
  if (text.isEmpty) return 0;
  final len = text.length;
  if (len < 200) return 0;
  final pCount = el.querySelectorAll('p').length;
  final commaCount = ','.allMatches(text).length + '،'.allMatches(text).length;
  int score = len ~/ 25 + pCount * 10 + commaCount * 2;
  final cls = (el.className + ' ' + (el.id)).toLowerCase();
  if (RegExp(r'comment|nav|sidebar|share|social|promo|ad-|related|footer|header').hasMatch(cls)) {
    score -= 50;
  }
  if (RegExp(r'article|content|post|entry|story|body').hasMatch(cls)) {
    score += 25;
  }
  return score;
}

void _removeNoise(dom.Element el) {
  final selectors = [
    'script', 'style', 'iframe', 'noscript', 'form', 'svg', 'button',
    'nav', 'aside', 'footer', 'header',
    '.share', '.social', '.comments', '.comment', '.advert', '.ad', '.ads',
    '.related', '.newsletter', '.subscribe', '.promo', '.sidebar'
  ];
  for (final sel in selectors) {
    for (final n in el.querySelectorAll(sel)) {
      n.remove();
    }
  }
}

String? _findTitle(dom.Document doc) {
  final og = doc.querySelector('meta[property="og:title"]')?.attributes['content'];
  if (og != null && og.trim().isNotEmpty) return og.trim();
  final tw = doc.querySelector('meta[name="twitter:title"]')?.attributes['content'];
  if (tw != null && tw.trim().isNotEmpty) return tw.trim();
  final h1 = doc.querySelector('h1')?.text;
  if (h1 != null && h1.trim().isNotEmpty) return h1.trim();
  final t = doc.querySelector('title')?.text;
  return t?.trim();
}

String? _findImage(dom.Document doc, String? baseUrl) {
  final og = doc.querySelector('meta[property="og:image"]')?.attributes['content'];
  if (og != null && og.trim().isNotEmpty) return _resolveUrl(og.trim(), baseUrl);
  final tw = doc.querySelector('meta[name="twitter:image"]')?.attributes['content'];
  if (tw != null && tw.trim().isNotEmpty) return _resolveUrl(tw.trim(), baseUrl);
  final firstImg = doc.querySelector('article img, main img, img');
  final src = firstImg?.attributes['src'];
  return src == null ? null : _resolveUrl(src, baseUrl);
}

String? _findAuthor(dom.Document doc) {
  final selectors = [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[rel="author"]',
    '.author',
    '.byline',
  ];
  for (final s in selectors) {
    final el = doc.querySelector(s);
    if (el == null) continue;
    final v = el.attributes['content'] ?? el.text;
    if (v.trim().isNotEmpty) return v.trim();
  }
  return null;
}

String? _resolveUrl(String url, String? baseUrl) {
  if (url.startsWith('http')) return url;
  if (baseUrl == null) return url;
  try {
    return Uri.parse(baseUrl).resolve(url).toString();
  } catch (_) {
    return url;
  }
}
