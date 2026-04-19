import 'package:go_router/go_router.dart';

import 'features/article/article_page.dart';
import 'features/feed/feed_page.dart';
import 'features/search/search_page.dart';
import 'features/settings/settings_page.dart';
import 'features/sources/sources_page.dart';

final appRouter = GoRouter(
  routes: [
    GoRoute(
      path: '/',
      builder: (_, __) => const FeedPage(),
    ),
    GoRoute(
      path: '/article/:id',
      builder: (_, state) =>
          ArticlePage(articleId: int.parse(state.pathParameters['id']!)),
    ),
    GoRoute(
      path: '/sources',
      builder: (_, __) => const SourcesPage(),
    ),
    GoRoute(
      path: '/search',
      builder: (_, __) => const SearchPage(),
    ),
    GoRoute(
      path: '/settings',
      builder: (_, __) => const SettingsPage(),
    ),
  ],
);
