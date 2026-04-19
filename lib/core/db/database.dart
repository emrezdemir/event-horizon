import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'database.g.dart';

class Sources extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get url => text().unique()();
  TextColumn get title => text()();
  TextColumn get type => text()(); // 'rss' | 'html'
  TextColumn get iconUrl => text().nullable()();
  BoolColumn get enabled => boolean().withDefault(const Constant(true))();
  DateTimeColumn get lastFetchedAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class Articles extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get sourceId =>
      integer().references(Sources, #id, onDelete: KeyAction.cascade)();
  TextColumn get url => text().unique()();
  TextColumn get title => text()();
  TextColumn get author => text().nullable()();
  DateTimeColumn get publishedAt => dateTime().nullable()();
  TextColumn get summary => text().nullable()();
  TextColumn get contentHtml => text().nullable()();
  TextColumn get contentText => text().nullable()();
  TextColumn get originalLang => text().nullable()();
  TextColumn get translatedTitle => text().nullable()();
  TextColumn get translatedContent => text().nullable()();
  TextColumn get imageUrl => text().nullable()();
  BoolColumn get isRead => boolean().withDefault(const Constant(false))();
  BoolColumn get isFavorite => boolean().withDefault(const Constant(false))();
  DateTimeColumn get fetchedAt => dateTime().withDefault(currentDateAndTime)();
}

@DriftDatabase(tables: [Sources, Articles])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          await customStatement(
            'CREATE VIRTUAL TABLE articles_fts USING fts5('
            'title, summary, content_text, translated_title, translated_content, '
            'content=\'articles\', content_rowid=\'id\', tokenize=\'unicode61 remove_diacritics 2\'); ',
          );
          await customStatement('''
            CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
              INSERT INTO articles_fts(rowid, title, summary, content_text, translated_title, translated_content)
              VALUES (new.id, new.title, coalesce(new.summary,''), coalesce(new.content_text,''),
                      coalesce(new.translated_title,''), coalesce(new.translated_content,''));
            END;
          ''');
          await customStatement('''
            CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
              INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_text, translated_title, translated_content)
              VALUES('delete', old.id, old.title, coalesce(old.summary,''), coalesce(old.content_text,''),
                     coalesce(old.translated_title,''), coalesce(old.translated_content,''));
            END;
          ''');
          await customStatement('''
            CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
              INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_text, translated_title, translated_content)
              VALUES('delete', old.id, old.title, coalesce(old.summary,''), coalesce(old.content_text,''),
                     coalesce(old.translated_title,''), coalesce(old.translated_content,''));
              INSERT INTO articles_fts(rowid, title, summary, content_text, translated_title, translated_content)
              VALUES (new.id, new.title, coalesce(new.summary,''), coalesce(new.content_text,''),
                      coalesce(new.translated_title,''), coalesce(new.translated_content,''));
            END;
          ''');
          await customStatement(
              'CREATE INDEX idx_articles_published ON articles(published_at DESC);');
          await customStatement(
              'CREATE INDEX idx_articles_source ON articles(source_id);');
        },
      );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'news_app.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
