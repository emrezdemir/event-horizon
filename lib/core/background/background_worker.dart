import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';

import '../db/database.dart';
import '../http/http_client.dart';
import '../translation/translator.dart';
import '../../data/fetchers/rss_fetcher.dart';
import '../../data/fetchers/html_fetcher.dart';
import '../../data/repositories/articles_repository.dart';
import '../../data/repositories/sources_repository.dart';

const kPeriodicFetchTask = 'news_app.periodic_fetch';
const kOneOffFetchTask = 'news_app.one_off_fetch';

@pragma('vm:entry-point')
void backgroundCallback() {
  Workmanager().executeTask((task, inputData) async {
    try {
      final db = AppDatabase();
      final dio = buildDio();
      final sourcesRepo = SourcesRepository(db);
      final articlesRepo = ArticlesRepository(db);
      final translator = Translator();

      final rss = RssFetcher(dio);
      final html = HtmlFetcher(dio);

      final sources = await sourcesRepo.allEnabled();
      for (final s in sources) {
        try {
          final items = s.type == 'rss'
              ? await rss.fetch(s)
              : await html.fetch(s);
          for (final it in items) {
            if (it.title.isEmpty) continue;
            var translatedTitle = it.translatedTitle;
            if (translatedTitle == null && it.title.isNotEmpty) {
              final r = await translator.translateToTurkish(
                it.title,
                downloadIfMissing: false,
              );
              if (r.text != null && r.source != 'tr') {
                translatedTitle = r.text;
              }
            }
            await articlesRepo.upsert(
              it.copyWith(translatedTitle: translatedTitle),
            );
          }
          await sourcesRepo.markFetched(s.id);
        } catch (e) {
          debugPrint('[bg] source ${s.url} failed: $e');
        }
      }

      await translator.dispose();
      await db.close();
      return true;
    } catch (e, st) {
      debugPrint('[bg] task failed: $e\n$st');
      return false;
    }
  });
}

Future<void> initBackground({bool debug = kDebugMode}) async {
  await Workmanager().initialize(backgroundCallback, isInDebugMode: debug);
}

Future<void> schedulePeriodic({required Duration frequency}) async {
  await Workmanager().cancelByUniqueName(kPeriodicFetchTask);
  await Workmanager().registerPeriodicTask(
    kPeriodicFetchTask,
    kPeriodicFetchTask,
    frequency: frequency,
    constraints: Constraints(
      networkType: NetworkType.connected,
      requiresBatteryNotLow: false,
    ),
    existingWorkPolicy: ExistingWorkPolicy.replace,
    backoffPolicy: BackoffPolicy.exponential,
    backoffPolicyDelay: const Duration(minutes: 1),
  );
}

Future<void> cancelPeriodic() async {
  await Workmanager().cancelByUniqueName(kPeriodicFetchTask);
}

Future<void> runOneOffFetch() async {
  await Workmanager().registerOneOffTask(
    kOneOffFetchTask,
    kOneOffFetchTask,
    constraints: Constraints(networkType: NetworkType.connected),
    existingWorkPolicy: ExistingWorkPolicy.replace,
  );
}
