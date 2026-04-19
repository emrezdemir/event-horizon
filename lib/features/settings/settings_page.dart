import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/background/background_worker.dart';
import '../../core/settings/settings.dart';
import '../../core/translation/translator.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(settingsControllerProvider);
    final notifier = ref.read(settingsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Ayarlar')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (s) => ListView(
          children: [
            const _SectionHeader('Arka plan fetch'),
            ListTile(
              title: const Text('Yenileme sıklığı'),
              subtitle: Text('${s.fetchMinutes} dakika'),
              trailing: DropdownButton<int>(
                value: _clamp(s.fetchMinutes),
                items: const [
                  DropdownMenuItem(value: 15, child: Text('15 dk')),
                  DropdownMenuItem(value: 30, child: Text('30 dk')),
                  DropdownMenuItem(value: 60, child: Text('1 saat')),
                  DropdownMenuItem(value: 180, child: Text('3 saat')),
                  DropdownMenuItem(value: 360, child: Text('6 saat')),
                ],
                onChanged: (v) async {
                  if (v == null) return;
                  await notifier.setFetchMinutes(v);
                  await schedulePeriodic(frequency: Duration(minutes: v));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Her $v dakikada bir çekilecek')),
                    );
                  }
                },
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                'Not: iOS’ta arka plan aralıkları OS kontrolündedir; 5 dk garanti değildir. '
                'Android’de minimum 15 dk işletim sistemi sınırıdır. Uygulama önde iken 5 dk’da bir yenilenir.',
                style: TextStyle(fontSize: 12),
              ),
            ),
            const Divider(),
            const _SectionHeader('Çeviri'),
            SwitchListTile(
              title: const Text('Haber açıldığında otomatik çevir'),
              value: s.translateOnOpen,
              onChanged: notifier.setTranslateOnOpen,
            ),
            SwitchListTile(
              title: const Text('Model indirmeleri yalnızca Wi-Fi’da'),
              value: s.downloadOverWifiOnly,
              onChanged: notifier.setDownloadOverWifiOnly,
            ),
            ListTile(
              title: const Text('Türkçe modelini şimdi indir'),
              subtitle: const Text('İlk çeviri daha hızlı olsun diye'),
              trailing: const Icon(Icons.download),
              onTap: () async {
                final t = ref.read(translatorProvider);
                final messenger = ScaffoldMessenger.of(context);
                try {
                  await t.ensureTurkishModel(requireWifi: s.downloadOverWifiOnly);
                  messenger.showSnackBar(
                    const SnackBar(content: Text('Model hazır')),
                  );
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(content: Text('İndirilemedi: $e')),
                  );
                }
              },
            ),
            const Divider(),
            const _SectionHeader('Görünüm'),
            ListTile(
              title: const Text('Tema'),
              trailing: DropdownButton<ThemeMode>(
                value: s.themeMode,
                items: const [
                  DropdownMenuItem(
                      value: ThemeMode.system, child: Text('Sistem')),
                  DropdownMenuItem(
                      value: ThemeMode.light, child: Text('Açık')),
                  DropdownMenuItem(
                      value: ThemeMode.dark, child: Text('Koyu')),
                ],
                onChanged: (v) => v == null ? null : notifier.setThemeMode(v),
              ),
            ),
            ListTile(
              title: const Text('Okuma yazı boyutu'),
              subtitle: Slider(
                value: s.readerFontScale,
                min: 0.85,
                max: 1.5,
                divisions: 13,
                label: '${(s.readerFontScale * 100).round()}%',
                onChanged: notifier.setReaderFontScale,
              ),
            ),
            const Divider(),
            const _SectionHeader('Hakkında'),
            const ListTile(
              title: Text('Sunucusuz Haber Okuyucu'),
              subtitle: Text('Tüm veri cihazınızda kalır. Internet sadece kaynakları çekerken kullanılır.'),
            ),
          ],
        ),
      ),
    );
  }

  int _clamp(int v) {
    const options = [15, 30, 60, 180, 360];
    if (options.contains(v)) return v;
    return 15;
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  const _SectionHeader(this.text);
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
      child: Text(
        text,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
      ),
    );
  }
}
