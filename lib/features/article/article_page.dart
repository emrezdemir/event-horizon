import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/settings/settings.dart';
import 'article_controller.dart';

class ArticlePage extends ConsumerStatefulWidget {
  final int articleId;
  const ArticlePage({super.key, required this.articleId});

  @override
  ConsumerState<ArticlePage> createState() => _ArticlePageState();
}

class _ArticlePageState extends ConsumerState<ArticlePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAutoTranslate());
  }

  void _maybeAutoTranslate() {
    final settings = ref.read(settingsControllerProvider).valueOrNull;
    if (settings?.translateOnOpen != true) return;
    final state = ref.read(articleControllerProvider(widget.articleId)).valueOrNull;
    final a = state?.article;
    if (a == null) return;
    if (a.translatedTitle != null || a.translatedContent != null) return;
    ref.read(articleControllerProvider(widget.articleId).notifier).translate();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(articleControllerProvider(widget.articleId));
    final notifier =
        ref.read(articleControllerProvider(widget.articleId).notifier);
    final settings = ref.watch(settingsControllerProvider).valueOrNull;
    final fontScale = settings?.readerFontScale ?? 1.0;

    return Scaffold(
      appBar: AppBar(
        actions: [
          async.maybeWhen(
            data: (s) => s.article == null
                ? const SizedBox.shrink()
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (s.article!.translatedContent != null ||
                          s.article!.translatedTitle != null)
                        IconButton(
                          tooltip: s.showTranslation
                              ? 'Orijinali göster'
                              : 'Çeviriyi göster',
                          icon: Icon(s.showTranslation
                              ? Icons.translate
                              : Icons.translate_outlined),
                          onPressed: notifier.toggleTranslation,
                        ),
                      IconButton(
                        tooltip: 'Favori',
                        icon: Icon(s.article!.isFavorite
                            ? Icons.bookmark
                            : Icons.bookmark_outline),
                        onPressed: notifier.toggleFavorite,
                      ),
                      IconButton(
                        tooltip: 'Paylaş',
                        icon: const Icon(Icons.share),
                        onPressed: () => Share.share(
                          '${s.article!.translatedTitle ?? s.article!.title}\n\n${s.article!.url}',
                        ),
                      ),
                      IconButton(
                        tooltip: 'Tarayıcıda aç',
                        icon: const Icon(Icons.open_in_browser),
                        onPressed: () => launchUrl(
                          Uri.parse(s.article!.url),
                          mode: LaunchMode.externalApplication,
                        ),
                      ),
                    ],
                  ),
            orElse: () => const SizedBox.shrink(),
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Hata: $e')),
        data: (s) {
          final a = s.article;
          if (a == null) return const Center(child: Text('Bulunamadı'));
          final showT = s.showTranslation;
          final title = (showT ? a.translatedTitle : null) ?? a.title;
          final contentText = (showT ? a.translatedContent : null) ??
              a.contentText ??
              a.summary ??
              '';
          final theme = Theme.of(context);
          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 680),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (a.imageUrl != null) ...[
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: a.imageUrl!,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => const SizedBox.shrink(),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    Text(
                      title,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontSize: (theme.textTheme.headlineSmall?.fontSize ??
                                26) *
                            fontScale,
                        height: 1.25,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      children: [
                        if (a.author != null && a.author!.isNotEmpty)
                          Text(a.author!,
                              style: theme.textTheme.labelMedium),
                        if (a.publishedAt != null)
                          Text(
                            DateFormat('d MMMM y, HH:mm', 'tr')
                                .format(a.publishedAt!),
                            style: theme.textTheme.labelMedium,
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (s.translating)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: LinearProgressIndicator(),
                      ),
                    if (s.needsModel) _ModelDownloadCard(
                      onDownload: () => notifier.translate(downloadIfMissing: true),
                    ),
                    SelectableText(
                      contentText,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontSize:
                            (theme.textTheme.bodyLarge?.fontSize ?? 16) *
                                fontScale,
                        height: 1.7,
                      ),
                    ),
                    const SizedBox(height: 48),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ModelDownloadCard extends StatelessWidget {
  final VoidCallback onDownload;
  const _ModelDownloadCard({required this.onDownload});
  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bu dil için çeviri modeli indirilmemiş.',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 6),
            const Text(
                'Yaklaşık 30 MB. Wi-Fi bağlıyken indirmeniz önerilir; sonrasında çeviri tamamen çevrimdışı çalışır.'),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: onDownload,
              icon: const Icon(Icons.download),
              label: const Text('İndir ve çevir'),
            ),
          ],
        ),
      ),
    );
  }
}
