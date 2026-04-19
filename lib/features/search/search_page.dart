import 'dart:async';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/repositories/articles_repository.dart';

class SearchPage extends ConsumerStatefulWidget {
  const SearchPage({super.key});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<ArticleWithSource> _results = const [];
  bool _loading = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _run(q));
  }

  Future<void> _run(String q) async {
    if (q.trim().length < 2) {
      setState(() {
        _results = const [];
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    try {
      final repo = ref.read(articlesRepositoryProvider);
      final rows = await repo.search(q);
      if (!mounted) return;
      setState(() {
        _results = rows;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Haberlerde ara…',
            border: InputBorder.none,
          ),
          onChanged: _onChanged,
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _results.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      _controller.text.isEmpty
                          ? 'Bir kelime yazın'
                          : 'Sonuç bulunamadı',
                      style: theme.textTheme.titleMedium,
                    ),
                  ),
                )
              : ListView.separated(
                  itemCount: _results.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, i) {
                    final row = _results[i];
                    final a = row.article;
                    return ListTile(
                      onTap: () => context.push('/article/${a.id}'),
                      leading: a.imageUrl == null
                          ? CircleAvatar(
                              backgroundColor:
                                  theme.colorScheme.surfaceContainerHighest,
                              child: const Icon(Icons.article_outlined),
                            )
                          : ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: CachedNetworkImage(
                                imageUrl: a.imageUrl!,
                                width: 48,
                                height: 48,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) =>
                                    const SizedBox(width: 48, height: 48),
                              ),
                            ),
                      title: Text(a.translatedTitle ?? a.title, maxLines: 2),
                      subtitle: Text(row.source.title),
                    );
                  },
                ),
    );
  }
}
