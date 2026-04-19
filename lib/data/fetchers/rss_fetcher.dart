import 'package:dio/dio.dart';
import 'package:webfeed_plus/webfeed_plus.dart';

import '../../core/db/database.dart';
import '../../core/utils/html_cleaner.dart';
import '../models/article_draft.dart';

class RssFetcher {
  final Dio _dio;
  RssFetcher(this._dio);

  Future<List<ArticleDraft>> fetch(Source source) async {
    final res = await _dio.get<String>(source.url);
    final body = res.data ?? '';
    final drafts = <ArticleDraft>[];

    try {
      final feed = RssFeed.parse(body);
      for (final item in feed.items ?? <RssItem>[]) {
        final link = item.link ?? item.guid;
        if (link == null || link.isEmpty) continue;
        final title = (item.title ?? '').trim();
        final description = item.description ?? item.content?.value;
        drafts.add(ArticleDraft(
          sourceId: source.id,
          url: link,
          title: title.isEmpty ? link : title,
          author: item.author ?? item.dc?.creator,
          publishedAt: item.pubDate,
          summary: stripHtml(description).take(400),
          contentHtml: item.content?.value,
          contentText: stripHtml(description),
          imageUrl: _firstEnclosure(item),
        ));
      }
    } catch (_) {
      try {
        final feed = AtomFeed.parse(body);
        for (final item in feed.items ?? <AtomItem>[]) {
          final link = item.links?.firstOrNull?.href ?? item.id;
          if (link == null || link.isEmpty) continue;
          final title = (item.title ?? '').trim();
          final summary = item.summary ?? item.content;
          drafts.add(ArticleDraft(
            sourceId: source.id,
            url: link,
            title: title.isEmpty ? link : title,
            author: item.authors?.firstOrNull?.name,
            publishedAt: item.published ?? item.updated,
            summary: stripHtml(summary).take(400),
            contentHtml: item.content,
            contentText: stripHtml(summary),
          ));
        }
      } catch (_) {
        rethrow;
      }
    }

    return drafts;
  }

  String? _firstEnclosure(RssItem item) {
    final url = item.enclosure?.url;
    if (url != null && url.isNotEmpty) return url;
    final mediaUrl = item.media?.contents?.firstOrNull?.url;
    return mediaUrl;
  }
}

extension _StringLimit on String {
  String take(int n) => length > n ? substring(0, n) : this;
}

extension _FirstOrNull<T> on Iterable<T>? {
  T? get firstOrNull {
    final it = this;
    if (it == null) return null;
    final iter = it.iterator;
    return iter.moveNext() ? iter.current : null;
  }
}
