import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { discoverSource } from '@/data/sourceDiscovery';
import {
  deleteSource,
  insertSource,
  listSources,
  setSourceEnabled,
} from '@/db/queries';
import type { Source } from '@/db/types';
import { usePalette } from '@/theme';

export default function SourcesScreen() {
  const palette = usePalette();
  const [items, setItems] = useState<Source[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setItems(await listSources());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onAdd = useCallback(async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const found = await discoverSource(url.trim());
      await insertSource({
        url: found.url,
        title: found.title,
        type: found.type,
        icon_url: found.iconUrl,
      });
      setUrl('');
      setShowModal(false);
      reload();
    } catch (e) {
      Alert.alert('Eklenemedi', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [reload, url]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <FlatList
        data={items}
        keyExtractor={(s) => String(s.id)}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="globe-outline"
              size={56}
              color={palette.outline}
            />
            <Text style={{ color: palette.text, marginTop: 12, fontSize: 16 }}>
              Henüz kaynak yok
            </Text>
            <Text
              style={{
                color: palette.textMuted,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              Sağ alttan + ile bir URL ekle. RSS varsa bulunur, yoksa anasayfa
              taranır.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: palette.surfaceMuted },
              ]}
            >
              {item.icon_url ? (
                <Image
                  source={{ uri: item.icon_url }}
                  style={{ width: 24, height: 24 }}
                  contentFit="contain"
                />
              ) : (
                <Ionicons
                  name={item.type === 'rss' ? 'logo-rss' : 'globe-outline'}
                  size={20}
                  color={palette.text}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: '600' }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text
                style={{ color: palette.textMuted, fontSize: 12, marginTop: 2 }}
                numberOfLines={1}
              >
                {item.url}
              </Text>
            </View>
            <Switch
              value={!!item.enabled}
              onValueChange={(v) => setSourceEnabled(item.id, v).then(reload)}
            />
            <Pressable
              onPress={() =>
                Alert.alert('Sil', `${item.title} silinsin mi?`, [
                  { text: 'Vazgeç', style: 'cancel' },
                  {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: () => deleteSource(item.id).then(reload),
                  },
                ])
              }
              style={{ padding: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color={palette.danger} />
            </Pressable>
          </View>
        )}
      />

      <Pressable
        onPress={() => setShowModal(true)}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      >
        <Ionicons name="add" size={28} color={palette.primaryOn} />
      </Pressable>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowModal(false)}>
          <Pressable
            style={[
              styles.modal,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              Yeni kaynak ekle
            </Text>
            <Text style={{ color: palette.textMuted, marginBottom: 8 }}>
              Site adresini gir. RSS otomatik bulunur, yoksa anasayfa taranır.
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              keyboardType="url"
              placeholder="https://ornek.com"
              placeholderTextColor={palette.textMuted}
              value={url}
              onChangeText={setUrl}
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.outline,
                  backgroundColor: palette.background,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowModal(false)}
                style={styles.modalBtn}
                disabled={busy}
              >
                <Text style={{ color: palette.textMuted }}>Vazgeç</Text>
              </Pressable>
              <Pressable
                onPress={onAdd}
                disabled={busy}
                style={[
                  styles.modalBtn,
                  { backgroundColor: palette.primary, borderRadius: 8 },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={palette.primaryOn} />
                ) : (
                  <Text style={{ color: palette.primaryOn, fontWeight: '700' }}>
                    Ekle
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10 },
});
