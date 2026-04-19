import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/db/database.dart';
import '../../core/db/providers.dart';
import '../models/article_draft.dart';

class ArticleWithSource {
  final Article article;
  final Source source;
  ArticleWithSource(this.article, this.source);
}

class ArticlesRepository {
  final AppDatabase _db;
  ArticlesRepository(this._db);

  Future<void> upsert(ArticleDraft d) async {
    final existing = await (_db.select(_db.articles)
          ..where((a) => a.url.equals(d.url)))
        .getSingleOrNull();
    if (existing != null) {
      await (_db.update(_db.articles)..where((a) => a.id.equals(existing.id))).write(
        ArticlesCompanion(
          title: Value(d.title),
          author: Value(d.author ?? existing.author),
          publishedAt: Value(d.publishedAt ?? existing.publishedAt),
          summary: Value(d.summary ?? existing.summary),
          contentHtml: Value(d.contentHtml ?? existing.contentHtml),
          contentText: Value(d.contentText ?? existing.contentText),
          originalLang: Value(d.originalLang ?? existing.originalLang),
          translatedTitle: Value(d.translatedTitle ?? existing.translatedTitle),
          translatedContent: Value(d.translatedContent ?? existing.translatedContent),
          imageUrl: Value(d.imageUrl ?? existing.imageUrl),
        ),
      );
      return;
    }
    await _db.into(_db.articles).insert(
          ArticlesCompanion.insert(
            sourceId: d.sourceId,
            url: d.url,
            title: d.title,
            author: Value(d.author),
            publishedAt: Value(d.publishedAt),
            summary: Value(d.summary),
            contentHtml: Value(d.contentHtml),
            contentText: Value(d.contentText),
            originalLang: Value(d.originalLang),
            translatedTitle: Value(d.translatedTitle),
            translatedContent: Value(d.translatedContent),
            imageUrl: Value(d.imageUrl),
          ),
        );
  }

  Stream<List<ArticleWithSource>> watchPage({int limit = 20, int offset = 0}) {
    final query = _db.select(_db.articles).join([
      leftOuterJoin(_db.sources, _db.sources.id.equalsExp(_db.articles.sourceId)),
    ])
      ..orderBy([
        OrderingTerm(expression: _db.articles.publishedAt, mode: OrderingMode.desc),
        OrderingTerm(expression: _db.articles.fetchedAt, mode: OrderingMode.desc),
      ])
      ..limit(limit, offset: offset);
    return query.watch().map((rows) => rows
        .map((r) => ArticleWithSource(
              r.readTable(_db.articles),
              r.readTable(_db.sources),
            ))
        .toList());
  }

  Future<List<ArticleWithSource>> page({int limit = 20, int offset = 0}) async {
    final rows = await (_db.select(_db.articles).join([
      leftOuterJoin(_db.sources, _db.sources.id.equalsExp(_db.articles.sourceId)),
    ])
          ..orderBy([
            OrderingTerm(expression: _db.articles.publishedAt, mode: OrderingMode.desc),
            OrderingTerm(expression: _db.articles.fetchedAt, mode: OrderingMode.desc),
          ])
          ..limit(limit, offset: offset))
        .get();
    return rows
        .map((r) => ArticleWithSource(
              r.readTable(_db.articles),
              r.readTable(_db.sources),
            ))
        .toList();
  }

  Future<Article?> byId(int id) =>
      (_db.select(_db.articles)..where((a) => a.id.equals(id))).getSingleOrNull();

  Future<void> setRead(int id, bool read) =>
      (_db.update(_db.articles)..where((a) => a.id.equals(id)))
          .write(ArticlesCompanion(isRead: Value(read)));

  Future<void> setFavorite(int id, bool fav) =>
      (_db.update(_db.articles)..where((a) => a.id.equals(id)))
          .write(ArticlesCompanion(isFavorite: Value(fav)));

  Future<void> updateTranslation(int id, {String? title, String? content, String? lang}) =>
      (_db.update(_db.articles)..where((a) => a.id.equals(id))).write(
        ArticlesCompanion(
          translatedTitle: Value(title),
          translatedContent: Value(content),
          originalLang: Value(lang),
        ),
      );

  Future<List<ArticleWithSource>> search(String query,
      {int limit = 50, int offset = 0}) async {
    final safe = _escapeFtsQuery(query);
    if (safe.isEmpty) return const [];
    final ids = await _db.customSelect(
      '''
      SELECT rowid AS id FROM articles_fts
      WHERE articles_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?;
      ''',
      variables: [
        Variable.withString(safe),
        Variable.withInt(limit),
        Variable.withInt(offset),
      ],
    ).map((r) => r.read<int>('id')).get();

    if (ids.isEmpty) return const [];

    final rows = await (_db.select(_db.articles).join([
      leftOuterJoin(_db.sources, _db.sources.id.equalsExp(_db.articles.sourceId)),
    ])..where(_db.articles.id.isIn(ids))).get();

    final byId = {
      for (final r in rows)
        r.readTable(_db.articles).id:
            ArticleWithSource(r.readTable(_db.articles), r.readTable(_db.sources)),
    };
    return [
      for (final id in ids)
        if (byId[id] != null) byId[id]!,
    ];
  }

  String _escapeFtsQuery(String q) {
    final cleaned = q.replaceAll('"', '').trim();
    if (cleaned.isEmpty) return '';
    final tokens = cleaned.split(RegExp(r'\s+')).where((t) => t.length >= 2);
    if (tokens.isEmpty) return '';
    return tokens.map((t) => '"$t"*').join(' ');
  }
}

final articlesRepositoryProvider = Provider<ArticlesRepository>((ref) {
  return ArticlesRepository(ref.watch(databaseProvider));
});
