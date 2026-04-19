import 'package:dio/dio.dart';
import 'package:html/parser.dart' as html_parser;

class DiscoveryResult {
  final String url;
  final String title;
  final String type; // 'rss' | 'html'
  final String? iconUrl;

  DiscoveryResult({
    required this.url,
    required this.title,
    required this.type,
    this.iconUrl,
  });
}

class SourceDiscovery {
  final Dio _dio;
  SourceDiscovery(this._dio);

  static const _fallbackFeedPaths = [
    '/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml',
    '/feeds/posts/default', '/?feed=rss2',
  ];

  Future<DiscoveryResult> discover(String rawUrl) async {
    final normalized = _normalize(rawUrl);
    final uri = Uri.parse(normalized);

    if (await _isFeedUrl(normalized)) {
      return DiscoveryResult(
        url: normalized,
        title: uri.host,
        type: 'rss',
        iconUrl: _faviconFor(uri),
      );
    }

    final res = await _dio.get<String>(normalized);
    final body = res.data ?? '';
    final doc = html_parser.parse(body);

    final links = doc.querySelectorAll('link[rel="alternate"]');
    for (final l in links) {
      final t = (l.attributes['type'] ?? '').toLowerCase();
      final href = l.attributes['href'];
      if (href == null || href.isEmpty) continue;
      if (t.contains('rss') || t.contains('atom')) {
        final resolved = Uri.parse(normalized).resolve(href).toString();
        return DiscoveryResult(
          url: resolved,
          title: l.attributes['title'] ??
              doc.querySelector('title')?.text.trim() ??
              uri.host,
          type: 'rss',
          iconUrl: _faviconFor(uri),
        );
      }
    }

    for (final path in _fallbackFeedPaths) {
      final candidate = uri.replace(path: path).toString();
      if (await _isFeedUrl(candidate)) {
        return DiscoveryResult(
          url: candidate,
          title: doc.querySelector('title')?.text.trim() ?? uri.host,
          type: 'rss',
          iconUrl: _faviconFor(uri),
        );
      }
    }

    return DiscoveryResult(
      url: normalized,
      title: doc.querySelector('title')?.text.trim() ?? uri.host,
      type: 'html',
      iconUrl: _faviconFor(uri),
    );
  }

  Future<bool> _isFeedUrl(String url) async {
    try {
      final res = await _dio.get<String>(
        url,
        options: Options(
          validateStatus: (s) => s != null && s < 500,
          headers: {'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'},
        ),
      );
      if (res.statusCode == null || res.statusCode! >= 400) return false;
      final body = (res.data ?? '').trim();
      if (body.isEmpty) return false;
      final prefix = body.substring(0, body.length > 300 ? 300 : body.length).toLowerCase();
      return prefix.contains('<rss') ||
          prefix.contains('<feed') ||
          prefix.contains('<rdf');
    } catch (_) {
      return false;
    }
  }

  String _normalize(String raw) {
    var s = raw.trim();
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
      s = 'https://$s';
    }
    return s;
  }

  String _faviconFor(Uri uri) =>
      '${uri.scheme}://${uri.host}/favicon.ico';
}
