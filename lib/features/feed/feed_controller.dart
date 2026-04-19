import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/http/http_client.dart';
import '../../core/translation/translator.dart';
import '../../data/fetchers/html_fetcher.dart';
import '../../data/fetchers/rss_fetcher.dart';
import '../../data/repositories/articles_repository.dart';
import '../../data/repositories/sources_repository.dart';

class FeedState {
  final List<ArticleWithSource> items;
  final bool loadingMore;
  final bool refreshing;
  final bool reachedEnd;
  final Object? error;

  const FeedState({
    this.items = const [],
    this.loadingMore = false,
    this.refreshing = false,
    this.reachedEnd = false,
    this.error,
  });

  FeedState copyWith({
    List<ArticleWithSource>? items,
    bool? loadingMore,
    bool? refreshing,
    bool? reachedEnd,
    Object? error,
  }) =>
      FeedState(
        items: items ?? this.items,
        loadingMore: loadingMore ?? this.loadingMore,
        refreshing: refreshing ?? this.refreshing,
        reachedEnd: reachedEnd ?? this.reachedEnd,
        error: error,
      );
}

class FeedController extends Notifier<FeedState> {
  static const _pageSize = 20;

  @override
  FeedState build() {
    // initial load
    Future.microtask(loadFirstPage);
    return const FeedState();
  }

  ArticlesRepository get _articles => ref.read(articlesRepositoryProvider);

  Future<void> loadFirstPage() async {
    try {
      final rows = await _articles.page(limit: _pageSize, offset: 0);
      state = state.copyWith(
        items: rows,
        reachedEnd: rows.length < _pageSize,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(error: e);
    }
  }

  Future<void> loadMore() async {
    if (state.loadingMore || state.reachedEnd) return;
    state = state.copyWith(loadingMore: true);
    try {
      final rows =
          await _articles.page(limit: _pageSize, offset: state.items.length);
      state = state.copyWith(
        items: [...state.items, ...rows],
        reachedEnd: rows.length < _pageSize,
        loadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(loadingMore: false, error: e);
    }
  }

  Future<void> refresh() async {
    state = state.copyWith(refreshing: true);
    try {
      final dio = ref.read(httpClientProvider);
      final sourcesRepo = ref.read(sourcesRepositoryProvider);
      final translator = ref.read(translatorProvider);
      final rss = RssFetcher(dio);
      final html = HtmlFetcher(dio);

      final sources = await sourcesRepo.allEnabled();
      for (final s in sources) {
        try {
          final drafts =
              s.type == 'rss' ? await rss.fetch(s) : await html.fetch(s);
          for (final d in drafts) {
            if (d.title.trim().isEmpty) continue;
            String? translatedTitle = d.translatedTitle;
            if (translatedTitle == null) {
              try {
                final r = await translator.translateToTurkish(
                  d.title,
                  downloadIfMissing: false,
                );
                if (r.source != null && r.source != 'tr' && r.text != null) {
                  translatedTitle = r.text;
                }
              } catch (_) {}
            }
            await _articles.upsert(d.copyWith(translatedTitle: translatedTitle));
          }
          await sourcesRepo.markFetched(s.id);
        } catch (_) {
          // continue with next source
        }
      }
      await loadFirstPage();
    } finally {
      state = state.copyWith(refreshing: false);
    }
  }
}

final feedControllerProvider =
    NotifierProvider<FeedController, FeedState>(FeedController.new);
