import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/db/database.dart';
import '../../core/translation/translator.dart';
import '../../data/repositories/articles_repository.dart';

class ArticleState {
  final Article? article;
  final bool translating;
  final bool showTranslation;
  final bool needsModel;
  final Object? error;

  const ArticleState({
    this.article,
    this.translating = false,
    this.showTranslation = true,
    this.needsModel = false,
    this.error,
  });

  ArticleState copyWith({
    Article? article,
    bool? translating,
    bool? showTranslation,
    bool? needsModel,
    Object? error,
  }) =>
      ArticleState(
        article: article ?? this.article,
        translating: translating ?? this.translating,
        showTranslation: showTranslation ?? this.showTranslation,
        needsModel: needsModel ?? this.needsModel,
        error: error,
      );
}

class ArticleController extends FamilyAsyncNotifier<ArticleState, int> {
  @override
  Future<ArticleState> build(int id) async {
    final repo = ref.read(articlesRepositoryProvider);
    final a = await repo.byId(id);
    if (a != null && !a.isRead) {
      await repo.setRead(id, true);
    }
    final showTranslation = a?.translatedContent != null;
    return ArticleState(article: a, showTranslation: showTranslation);
  }

  Future<void> toggleTranslation() async {
    final s = state.value;
    if (s?.article == null) return;
    state = AsyncData(s!.copyWith(showTranslation: !s.showTranslation));
  }

  Future<void> translate({bool downloadIfMissing = false}) async {
    final s = state.value;
    final a = s?.article;
    if (s == null || a == null) return;

    state = AsyncData(s.copyWith(translating: true, error: null, needsModel: false));
    try {
      final translator = ref.read(translatorProvider);
      final repo = ref.read(articlesRepositoryProvider);
      final contentSource = a.contentText ?? a.summary ?? '';
      final titleResult = await translator.translateToTurkish(
        a.title,
        downloadIfMissing: downloadIfMissing,
      );
      if (titleResult.needsModel && !downloadIfMissing) {
        state = AsyncData(s.copyWith(translating: false, needsModel: true));
        return;
      }
      final contentResult = contentSource.trim().isEmpty
          ? const TranslationResult(source: null, text: null)
          : await translator.translateToTurkish(
              contentSource,
              downloadIfMissing: downloadIfMissing,
            );
      await repo.updateTranslation(
        a.id,
        title: titleResult.text,
        content: contentResult.text,
        lang: titleResult.source,
      );
      final updated = await repo.byId(a.id);
      state = AsyncData(
        s.copyWith(article: updated, translating: false, showTranslation: true),
      );
    } catch (e) {
      state = AsyncData(s.copyWith(translating: false, error: e));
    }
  }

  Future<void> toggleFavorite() async {
    final s = state.value;
    final a = s?.article;
    if (s == null || a == null) return;
    final repo = ref.read(articlesRepositoryProvider);
    await repo.setFavorite(a.id, !a.isFavorite);
    final updated = await repo.byId(a.id);
    state = AsyncData(s.copyWith(article: updated));
  }
}

final articleControllerProvider =
    AsyncNotifierProvider.family<ArticleController, ArticleState, int>(
  ArticleController.new,
);
