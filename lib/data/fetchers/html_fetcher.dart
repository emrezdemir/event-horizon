import 'package:dio/dio.dart';
import 'package:html/parser.dart' as html_parser;

import '../../core/db/database.dart';
import '../../core/utils/readability.dart';
import '../models/article_draft.dart';

/// RSS yoksa anasayfayı scrape eder: başlık/link çifti çıkarır,
/// sonra her makale URL'sini fetch edip Readability ile temiz metin ayıklar.
class HtmlFetcher {
  final Dio _dio;
  HtmlFetcher(this._dio, {this.maxArticlesPerSource = 15});

  final int maxArticlesPerSource;

  Future<List<ArticleDraft>> fetch(Source source) async {
    final res = await _dio.get<String>(source.url);
    final body = res.data ?? '';
    final doc = html_parser.parse(body);
    final base = Uri.parse(source.url);

    final candidates = <_LinkCandidate>[];

    final selectors = [
      'article a[href]',
      'h2 a[href]',
      'h3 a[href]',
      '[role="article"] a[href]',
      '.news a[href]',
      '.post a[href]',
      '.card a[href]',
      '.headline a[href]',
    ];
    final seen = <String>{};
    for (final sel in selectors) {
      for (final a in doc.querySelectorAll(sel)) {
        final href = a.attributes['href'];
        final text = a.text.trim();
        if (href == null || href.isEmpty) continue;
        if (text.length < 20) continue;
        final absolute = base.resolve(href).toString();
        if (!seen.add(absolute)) continue;
        if (!_sameHost(base, Uri.tryParse(absolute))) continue;
        candidates.add(_LinkCandidate(absolute, text));
        if (candidates.length >= maxArticlesPerSource) break;
      }
      if (candidates.length >= maxArticlesPerSource) break;
    }

    final drafts = <ArticleDraft>[];
    for (final c in candidates) {
      try {
        final art = await _dio.get<String>(c.url);
        final extracted = extractArticle(art.data ?? '', baseUrl: c.url);
        final title = (extracted.title?.trim().isNotEmpty ?? false)
            ? extracted.title!.trim()
            : c.text;
        drafts.add(ArticleDraft(
          sourceId: source.id,
          url: c.url,
          title: title,
          author: extracted.author,
          publishedAt: null,
          summary: extracted.contentText.length > 400
              ? '${extracted.contentText.substring(0, 400)}…'
              : extracted.contentText,
          contentHtml: extracted.contentHtml,
          contentText: extracted.contentText,
          imageUrl: extracted.imageUrl,
        ));
      } catch (_) {
        drafts.add(ArticleDraft(
          sourceId: source.id,
          url: c.url,
          title: c.text,
        ));
      }
    }
    return drafts;
  }

  bool _sameHost(Uri base, Uri? other) {
    if (other == null) return false;
    return other.host.isEmpty || other.host == base.host;
  }
}

class _LinkCandidate {
  final String url;
  final String text;
  _LinkCandidate(this.url, this.text);
}
