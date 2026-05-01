import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { refreshAllSources } from '@/data/refresh';
import { pageArticles } from '@/db/queries';
import type { ArticleWithSource } from '@/db/types';
import { usePalette } from '@/theme';
import { timeAgo } from '@/utils/format';

const PAGE_SIZE = 20;

export default function FeedScreen() {
  const palette = usePalette();
  const router = useRouter();
  const [items, setItems] = useState<ArticleWithSource[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  const loadFirst = useCallback(async () => {
    const rows = await pageArticles(PAGE_SIZE, 0);
    setItems(rows);
    setReachedEnd(rows.length < PAGE_SIZE);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirst();
    }, [loadFirst]),
  );

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllSources();
      await loadFirst();
    } finally {
      setRefreshing(false);
    }
  }, [loadFirst]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const more = await pageArticles(PAGE_SIZE, items.length);
      setItems((prev) => [...prev, ...more]);
      setReachedEnd(more.length < PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [items.length, loadingMore, reachedEnd]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={[styles.actionBar, { borderColor: palette.border }]}>
        <HeaderButton
          icon="search"
          label="Ara"
          onPress={() => router.push('/search')}
          palette={palette}
        />
        <HeaderButton
          icon="newspaper-outline"
          label="Kaynaklar"
          onPress={() => router.push('/sources')}
          palette={palette}
        />
        <HeaderButton
          icon="settings-outline"
          label="Ayarlar"
          onPress={() => router.push('/settings')}
          palette={palette}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => (
          <View style={[styles.sep, { backgroundColor: palette.border }]} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={onEndReached}
        ListEmptyComponent={
          <Empty palette={palette} refreshing={refreshing} />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={{ padding: 24 }}>
              <ActivityIndicator color={palette.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <ArticleRow item={item} palette={palette} />
        )}
      />
    </View>
  );
}

function HeaderButton({
  icon,
  label,
  onPress,
  palette,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.headerBtn}>
      <Ionicons name={icon} size={18} color={palette.text} />
      <Text style={{ color: palette.text, marginLeft: 6 }}>{label}</Text>
    </Pressable>
  );
}

function ArticleRow({
  item,
  palette,
}: {
  item: ArticleWithSource;
  palette: ReturnType<typeof usePalette>;
}) {
  const title = item.translated_title ?? item.title;
  return (
    <Link href={`/article/${item.id}`} asChild>
      <Pressable style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}>
            <Text style={[styles.source, { color: palette.primary }]} numberOfLines={1}>
              {item.source_title}
            </Text>
            {item.published_at != null && (
              <Text style={[styles.meta, { color: palette.textMuted }]}>
                ·  {timeAgo(item.published_at)}
              </Text>
            )}
          </View>
          <Text
            numberOfLines={3}
            style={[
              styles.title,
              {
                color: palette.text,
                fontWeight: item.is_read ? '500' : '700',
              },
            ]}
          >
            {title}
          </Text>
          {item.summary ? (
            <Text
              numberOfLines={2}
              style={[styles.summary, { color: palette.textMuted }]}
            >
              {item.summary}
            </Text>
          ) : null}
        </View>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.thumb}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </Pressable>
    </Link>
  );
}

function Empty({
  palette,
  refreshing,
}: {
  palette: ReturnType<typeof usePalette>;
  refreshing: boolean;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons
        name="newspaper-outline"
        size={64}
        color={palette.outline}
      />
      <Text style={[styles.emptyTitle, { color: palette.text }]}>
        {refreshing ? 'Yükleniyor…' : 'Henüz haber yok'}
      </Text>
      <Text style={[styles.emptyHint, { color: palette.textMuted }]}>
        Üstten <Text style={{ fontWeight: '700' }}>Kaynaklar</Text>'a girip bir
        site URL'i ekle. RSS otomatik bulunur, yoksa anasayfa taranır.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sep: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  source: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  meta: { fontSize: 12, marginLeft: 6 },
  title: { fontSize: 17, lineHeight: 22 },
  summary: { fontSize: 14, marginTop: 6, lineHeight: 19 },
  thumb: { width: 88, height: 88, borderRadius: 8 },
  empty: { alignItems: 'center', paddingTop: 96, paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '700' },
  emptyHint: { marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
