import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { registerBackgroundFetch } from '@/background/task';
import {
  setSettings,
  useSettings,
  type ThemeMode,
  type TranslationProvider,
} from '@/state/settings';
import { usePalette } from '@/theme';

const FETCH_OPTIONS = [
  { value: 15, label: '15 dk (sistem minimumu)' },
  { value: 30, label: '30 dk' },
  { value: 60, label: '1 saat' },
  { value: 180, label: '3 saat' },
  { value: 360, label: '6 saat' },
];

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'system', label: 'Sistem' },
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
];

const PROVIDERS: Array<{ value: TranslationProvider; label: string; help: string }> = [
  {
    value: 'mymemory',
    label: 'MyMemory',
    help: 'Ücretsiz, anahtarsız, ~5000 karakter/gün IP başına',
  },
  {
    value: 'libretranslate',
    label: 'LibreTranslate',
    help: 'Kendi sunucun veya libretranslate.com (rate-limited)',
  },
  {
    value: 'deepl',
    label: 'DeepL',
    help: 'Kaliteli; ücretsiz tier için API anahtarı (xxx:fx)',
  },
];

const LANGS = ['en', 'de', 'fr', 'es', 'it', 'ar', 'ru', 'pt', 'nl', 'tr'];

export default function SettingsScreen() {
  const palette = usePalette();
  const settings = useSettings();

  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.row, { borderColor: palette.border }]}>{children}</View>
  );

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.section, { color: palette.primary }]}>{title}</Text>
  );

  return (
    <ScrollView style={{ backgroundColor: palette.background }}>
      <Section title="Yenileme" />
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>Arka plan sıklığı</Text>
        <Picker
          options={FETCH_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={settings.fetchMinutes}
          onChange={async (v) => {
            await setSettings({ fetchMinutes: v });
            await registerBackgroundFetch();
          }}
          palette={palette}
        />
      </Row>
      <HelpText palette={palette}>
        iOS arka plan aralıklarını OS belirler; 15 dk altı garanti değil. Uygulama
        açıkken her 5 dk'da bir otomatik yenilenir.
      </HelpText>

      <Section title="Çeviri" />
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>
          Haber açıldığında otomatik çevir
        </Text>
        <Switch
          value={settings.translateOnOpen}
          onValueChange={(v) => setSettings({ translateOnOpen: v })}
        />
      </Row>
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>
          Yenilemede başlıkları da çevir
        </Text>
        <Switch
          value={settings.translateTitlesOnRefresh}
          onValueChange={(v) => setSettings({ translateTitlesOnRefresh: v })}
        />
      </Row>
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>Çeviri sağlayıcı</Text>
        <Picker
          options={PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
          value={settings.translationProvider}
          onChange={(v) => setSettings({ translationProvider: v })}
          palette={palette}
        />
      </Row>
      <HelpText palette={palette}>
        {PROVIDERS.find((p) => p.value === settings.translationProvider)?.help}
      </HelpText>
      {settings.translationProvider !== 'mymemory' && (
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, marginBottom: 6 }}>API anahtarı</Text>
            <TextInput
              value={settings.translationApiKey}
              onChangeText={(v) => setSettings({ translationApiKey: v })}
              placeholder={settings.translationProvider === 'deepl' ? 'xxxx-xxxx:fx' : 'opsiyonel'}
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={[
                styles.text,
                { color: palette.text, borderColor: palette.outline },
              ]}
            />
          </View>
        </Row>
      )}
      {settings.translationProvider === 'libretranslate' && (
        <Row>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, marginBottom: 6 }}>
              LibreTranslate sunucusu
            </Text>
            <TextInput
              value={settings.translationEndpoint}
              onChangeText={(v) => setSettings({ translationEndpoint: v })}
              placeholder="https://libretranslate.com/translate"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.text,
                { color: palette.text, borderColor: palette.outline },
              ]}
            />
          </View>
        </Row>
      )}
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>Varsayılan kaynak dil</Text>
        <Picker
          options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
          value={settings.defaultSourceLang}
          onChange={(v) => setSettings({ defaultSourceLang: v })}
          palette={palette}
        />
      </Row>

      <Section title="Görünüm" />
      <Row>
        <Text style={{ color: palette.text, flex: 1 }}>Tema</Text>
        <Picker
          options={THEME_OPTIONS}
          value={settings.themeMode}
          onChange={(v) => setSettings({ themeMode: v })}
          palette={palette}
        />
      </Row>
      <Row>
        <View style={{ flex: 1 }}>
          <Text style={{ color: palette.text }}>
            Okuma yazı boyutu: {Math.round(settings.readerFontScale * 100)}%
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[0.85, 1, 1.15, 1.3, 1.5].map((s) => (
              <Pill
                key={s}
                label={`${Math.round(s * 100)}%`}
                active={Math.abs(settings.readerFontScale - s) < 0.01}
                onPress={() => setSettings({ readerFontScale: s })}
                palette={palette}
              />
            ))}
          </View>
        </View>
      </Row>

      <View style={{ height: 64 }} />
    </ScrollView>
  );
}

function HelpText({
  children,
  palette,
}: {
  children: React.ReactNode;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Text
      style={{
        color: palette.textMuted,
        fontSize: 12,
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Pill({
  label,
  active,
  onPress,
  palette,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: active ? palette.primary : palette.outline,
        backgroundColor: active ? palette.primary : 'transparent',
      }}
    >
      <Text
        style={{
          color: active ? palette.primaryOn : palette.text,
          fontSize: 12,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Picker<T extends string | number>({
  options,
  value,
  onChange,
  palette,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  palette: ReturnType<typeof usePalette>;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: active ? palette.primary : palette.outline,
              backgroundColor: active ? palette.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: active ? palette.primaryOn : palette.text,
                fontSize: 13,
                fontWeight: active ? '700' : '500',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  text: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
});
