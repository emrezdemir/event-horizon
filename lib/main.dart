import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'core/background/background_worker.dart';
import 'core/settings/settings.dart';
import 'features/feed/feed_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('tr', null);
  await initBackground();

  final container = ProviderContainer();
  final settings = await container.read(settingsControllerProvider.future);
  await schedulePeriodic(frequency: Duration(minutes: settings.fetchMinutes));

  // Foreground periodic refresh (5 dk) — arka plan kısıtlarına karşı
  // garanti bir yenileme sağlar.
  Timer.periodic(const Duration(minutes: 5), (_) {
    container.read(feedControllerProvider.notifier).refresh();
  });

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const NewsApp(),
    ),
  );
}
