import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/db/database.dart';
import '../../core/db/providers.dart';
import '../../core/http/http_client.dart';
import '../source_discovery.dart';

class SourcesRepository {
  final AppDatabase _db;
  SourcesRepository(this._db);

  Future<List<Source>> all() =>
      (_db.select(_db.sources)..orderBy([(s) => OrderingTerm.asc(s.title)])).get();

  Future<List<Source>> allEnabled() =>
      (_db.select(_db.sources)..where((s) => s.enabled.equals(true))).get();

  Stream<List<Source>> watchAll() =>
      (_db.select(_db.sources)..orderBy([(s) => OrderingTerm.asc(s.title)])).watch();

  Future<int> insertDiscovered(DiscoveryResult d) async {
    return _db.into(_db.sources).insert(
          SourcesCompanion.insert(
            url: d.url,
            title: d.title,
            type: d.type,
            iconUrl: Value(d.iconUrl),
          ),
          mode: InsertMode.insertOrIgnore,
        );
  }

  Future<void> setEnabled(int id, bool enabled) {
    return (_db.update(_db.sources)..where((s) => s.id.equals(id)))
        .write(SourcesCompanion(enabled: Value(enabled)));
  }

  Future<void> delete(int id) async {
    await (_db.delete(_db.sources)..where((s) => s.id.equals(id))).go();
  }

  Future<void> markFetched(int id) {
    return (_db.update(_db.sources)..where((s) => s.id.equals(id))).write(
      SourcesCompanion(lastFetchedAt: Value(DateTime.now())),
    );
  }
}

final sourcesRepositoryProvider = Provider<SourcesRepository>((ref) {
  return SourcesRepository(ref.watch(databaseProvider));
});

final sourceDiscoveryProvider = Provider<SourceDiscovery>((ref) {
  return SourceDiscovery(ref.watch(httpClientProvider));
});

final sourcesStreamProvider = StreamProvider<List<Source>>((ref) {
  return ref.watch(sourcesRepositoryProvider).watchAll();
});
