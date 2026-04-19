import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../data/repositories/articles_repository.dart';
import 'feed_controller.dart';

class FeedPage extends ConsumerStatefulWidget {
  const FeedPage({super.key});

  @override
  ConsumerState<FeedPage> createState() => _FeedPageState();
}

class _FeedPageState extends ConsumerState<FeedPage> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 600) {
      ref.read(feedControllerProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(feedControllerProvider);
    final notifier = ref.read(feedControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Haberlerim'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            tooltip: 'Ara',
            onPressed: () => context.push('/search'),
          ),
          IconButton(
            icon: const Icon(Icons.rss_feed),
            tooltip: 'Kaynaklar',
            onPressed: () => context.push('/sources'),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Ayarlar',
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: notifier.refresh,
        child: state.items.isEmpty
            ? _Empty(refreshing: state.refreshing)
            : ListView.separated(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: state.items.length + (state.loadingMore ? 1 : 0),
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, i) {
                  if (i >= state.items.length) {
                    return const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  final row = state.items[i];
                  return _FeedTile(row: row);
                },
              ),
      ),
    );
  }
}

class _FeedTile extends StatelessWidget {
  final ArticleWithSource row;
  const _FeedTile({required this.row});

  @override
  Widget build(BuildContext context) {
    final a = row.article;
    final title = a.translatedTitle ?? a.title;
    final theme = Theme.of(context);

    return InkWell(
      onTap: () => context.push('/article/${a.id}'),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        row.source.title,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (a.publishedAt != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '·  ${_timeAgo(a.publishedAt!)}',
                          style: theme.textTheme.labelSmall,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight:
                          a.isRead ? FontWeight.w400 : FontWeight.w700,
                      height: 1.3,
                    ),
                  ),
                  if (a.summary != null && a.summary!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      a.summary!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (a.imageUrl != null) ...[
              const SizedBox(width: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: a.imageUrl!,
                  width: 88,
                  height: 88,
                  fit: BoxFit.cover,
                  errorWidget: (_, __, ___) => Container(
                    width: 88,
                    height: 88,
                    color: theme.colorScheme.surfaceContainer,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} dk';
    if (diff.inHours < 24) return '${diff.inHours} sa';
    if (diff.inDays < 7) return '${diff.inDays} gün';
    return DateFormat('d MMM', 'tr').format(dt);
  }
}

class _Empty extends StatelessWidget {
  final bool refreshing;
  const _Empty({required this.refreshing});
  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        Icon(
          Icons.article_outlined,
          size: 72,
          color: Theme.of(context).colorScheme.outline,
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            refreshing ? 'Yükleniyor…' : 'Henüz haber yok',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        const SizedBox(height: 8),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 32),
          child: Text(
            'Ayarlar > Kaynaklar üzerinden bir site ekleyin, aşağı çekerek yenileyin.',
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}
