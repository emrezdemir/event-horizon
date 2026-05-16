import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchArticles } from '@/db/queries';
import type { ArticleWithSource } from '@/db/types';
import { usePalette } from '@/theme';

export default function SearchScreen() {
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArticleWithSource[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchArticles(query);
        setResults(rows);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View
        style={[
          styles.searchBar,
          {
            borderColor: palette.outline,
            backgroundColor: palette.surfaceMuted,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={palette.textMuted} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Haberlerde ara…"
          placeholderTextColor={palette.textMuted}
          style={[styles.input, { color: palette.text }]}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={palette.textMuted} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ paddingTop: 32 }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : results.length === 0 ? (
        <Text style={[styles.hint, { color: palette.textMuted }]}>
          {query.trim().length < 2 ? 'En az 2 karakter yaz' : 'Sonuç bulunamadı'}
        </Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: palette.border,
              }}
            />
          )}
          renderItem={({ item }) => (
            <Link href={`/article/${item.id}`} asChild>
              <Pressable style={styles.row}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.thumb,
                      {
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: palette.surfaceMuted,
                      },
                    ]}
                  >
                    <Ionicons name="document-text-outline" size={20} color={palette.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={2}
                    style={{ color: palette.text, fontWeight: '600' }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>
                    {item.source_title}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  hint: { textAlign: 'center', marginTop: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  thumb: { width: 56, height: 56, borderRadius: 8 },
});
