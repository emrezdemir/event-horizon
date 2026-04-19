import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/sources_repository.dart';

class SourcesPage extends ConsumerWidget {
  const SourcesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(sourcesStreamProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Kaynaklar')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddDialog(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Kaynak ekle'),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (sources) {
          if (sources.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'Henüz kaynak yok. Sağ alttan bir URL ekleyin. '
                  'RSS varsa otomatik bulunur; yoksa anasayfa taranır.',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }
          return ListView.separated(
            itemCount: sources.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final s = sources[i];
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor:
                      Theme.of(context).colorScheme.surfaceContainerHighest,
                  child: Icon(s.type == 'rss' ? Icons.rss_feed : Icons.public),
                ),
                title: Text(s.title),
                subtitle: Text(s.url, maxLines: 1, overflow: TextOverflow.ellipsis),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Switch(
                      value: s.enabled,
                      onChanged: (v) => ref
                          .read(sourcesRepositoryProvider)
                          .setEnabled(s.id, v),
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () async {
                        final ok = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Kaynağı sil'),
                            content: Text('${s.title} silinsin mi?'),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx, false),
                                child: const Text('Vazgeç'),
                              ),
                              FilledButton(
                                onPressed: () => Navigator.pop(ctx, true),
                                child: const Text('Sil'),
                              ),
                            ],
                          ),
                        );
                        if (ok == true) {
                          await ref.read(sourcesRepositoryProvider).delete(s.id);
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showAddDialog(BuildContext context, WidgetRef ref) async {
    final controller = TextEditingController();
    await showDialog<void>(
      context: context,
      builder: (ctx) {
        final discovering = ValueNotifier<bool>(false);
        final error = ValueNotifier<String?>(null);
        return ValueListenableBuilder<bool>(
          valueListenable: discovering,
          builder: (_, busy, __) => AlertDialog(
            title: const Text('Yeni kaynak'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: controller,
                  autofocus: true,
                  keyboardType: TextInputType.url,
                  decoration: const InputDecoration(
                    labelText: 'URL',
                    hintText: 'https://ornek.com',
                  ),
                ),
                const SizedBox(height: 8),
                ValueListenableBuilder<String?>(
                  valueListenable: error,
                  builder: (_, err, __) => err == null
                      ? const SizedBox.shrink()
                      : Text(err,
                          style: TextStyle(
                              color: Theme.of(ctx).colorScheme.error)),
                ),
                if (busy) const Padding(
                  padding: EdgeInsets.only(top: 12),
                  child: LinearProgressIndicator(),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: busy ? null : () => Navigator.pop(ctx),
                child: const Text('Vazgeç'),
              ),
              FilledButton(
                onPressed: busy
                    ? null
                    : () async {
                        final url = controller.text.trim();
                        if (url.isEmpty) return;
                        discovering.value = true;
                        error.value = null;
                        try {
                          final discovery = ref.read(sourceDiscoveryProvider);
                          final result = await discovery.discover(url);
                          await ref
                              .read(sourcesRepositoryProvider)
                              .insertDiscovered(result);
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          error.value = 'Kaynak bulunamadı: $e';
                        } finally {
                          discovering.value = false;
                        }
                      },
                child: const Text('Ekle'),
              ),
            ],
          ),
        );
      },
    );
  }
}
