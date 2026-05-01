import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { translateToTurkish } from '@/data/translator';
import {
  getArticle,
  setArticleFavorite,
  setArticleRead,
  updateTranslation,
} from '@/db/queries';
import type { ArticleWithSource } from '@/db/types';
import { useSettings } from '@/state/settings';
import { fonts, usePalette } from '@/theme';
import { formatDate } from '@/utils/format';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = Number(id);
  const palette = usePalette();
  const settings = useSettings();
  const navigation = useNavigation();

  const [article, setArticle] = useState<ArticleWithSource | null>(null);
  const [showTranslation, setShowTranslation] = useState(true);
  const [translating, setTranslating] = useState(false);

  const reload = useCallback(async () => {
    const a = await getArticle(articleId);
    setArticle(a);
    if (a && !a.is_read) await setArticleRead(a.id, true);
    setShowTranslation(!!a?.translated_content || !!a?.translated_title);
  }, [articleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const ensureTranslated = useCallback(async () => {
    if (!article) return;
    if (article.translated_title || article.translated_content) return;
    setTranslating(true);
    try {
      const cfg = {
        provider: settings.translationProvider,
        apiKey: settings.translationApiKey || undefined,
        endpoint: settings.translationEndpoint || undefined,
      };
      const titleR = await translateToTurkish(
        { text: article.title, sourceLang: settings.defaultSourceLang },
        cfg,
      );
      const body = article.content_text ?? article.summary ?? '';
      const bodyR = body
        ? await translateToTurkish(
            { text: body, sourceLang: settings.defaultSourceLang },
            cfg,
          )
        : { text: null, source: settings.defaultSourceLang };
      await updateTranslation(article.id, {
        translated_title: titleR.source === 'tr' ? null : titleR.text,
        translated_content: bodyR.text ?? null,
        original_lang: titleR.source,
      });
      await reload();
    } catch (e) {
      Alert.alert('Çeviri başarısız', e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  }, [article, reload, settings]);

  useEffect(() => {
    if (settings.translateOnOpen && article) {
      ensureTranslated();
    }
  }, [article?.id, settings.translateOnOpen]);

  const onShare = useCallback(async () => {
    if (!article) return;
    const title = article.translated_title ?? article.title;
    const url = article.url;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Share.share({ message: `${title}\n\n${url}`, url, title });
      } else {
        await Share.share({ message: `${title}\n\n${url}` });
      }
    } catch {
      // ignore cancel
    }
  }, [article]);

  const onToggleFav = useCallback(async () => {
    if (!article) return;
    await setArticleFavorite(article.id, !article.is_favorite);
    await reload();
  }, [article, reload]);

  const onOpenBrowser = useCallback(() => {
    if (!article) return;
    Linking.openURL(article.url);
  }, [article]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {article ? (
            <>
              {(article.translated_title || article.translated_content) && (
                <IconBtn
                  name={showTranslation ? 'language' : 'language-outline'}
                  onPress={() => setShowTranslation((v) => !v)}
                  color={palette.text}
                />
              )}
              <IconBtn
                name={article.is_favorite ? 'bookmark' : 'bookmark-outline'}
                onPress={onToggleFav}
                color={palette.text}
              />
              <IconBtn name="share-outline" onPress={onShare} color={palette.text} />
              <IconBtn
                name="open-outline"
                onPress={onOpenBrowser}
                color={palette.text}
              />
            </>
          ) : null}
        </View>
      ),
    });
  }, [article, palette.text, showTranslation, onShare, onToggleFav, onOpenBrowser, navigation]);

  if (!article) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  const title = (showTranslation ? article.translated_title : null) ?? article.title;
  const body =
    (showTranslation ? article.translated_content : null) ??
    article.content_text ??
    article.summary ??
    '';

  const fontScale = settings.readerFontScale;

  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.maxWidth}>
        {article.image_url ? (
          <Image
            source={{ uri: article.image_url }}
            style={styles.hero}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <Text
          style={[
            styles.title,
            {
              color: palette.text,
              fontSize: 26 * fontScale,
              lineHeight: 32 * fontScale,
              fontFamily: fonts.serif,
            },
          ]}
        >
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: palette.primary }]}>
            {article.source_title}
          </Text>
          {article.author ? (
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              · {article.author}
            </Text>
          ) : null}
          {article.published_at ? (
            <Text style={[styles.metaText, { color: palette.textMuted }]}>
              · {formatDate(article.published_at)}
            </Text>
          ) : null}
        </View>

        {!article.translated_title && !article.translated_content ? (
          <Pressable
            onPress={ensureTranslated}
            style={[
              styles.translateBtn,
              { borderColor: palette.outline, backgroundColor: palette.surfaceMuted },
            ]}
          >
            <Ionicons name="language" size={18} color={palette.primary} />
            <Text style={{ color: palette.text, marginLeft: 8 }}>
              {translating ? 'Çevriliyor…' : 'Türkçeye çevir'}
            </Text>
          </Pressable>
        ) : null}

        <Text
          selectable
          style={[
            styles.body,
            {
              color: palette.text,
              fontSize: 17 * fontScale,
              lineHeight: 28 * fontScale,
              fontFamily: fonts.serif,
            },
          ]}
        >
          {body}
        </Text>
      </View>
    </ScrollView>
  );
}

function IconBtn({
  name,
  onPress,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ padding: 8 }}>
      <Ionicons name={name} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 64, alignItems: 'center' },
  maxWidth: { width: '100%', maxWidth: 680 },
  hero: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginTop: 8 },
  title: { marginTop: 16, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 8 },
  metaText: { fontSize: 13 },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { marginTop: 16 },
});
