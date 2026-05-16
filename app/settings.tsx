import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { registerBackgroundFetch } from '@/background/task';
import {
  ensureNotificationPermission,
} from '@/notifications';
import {
  setSettings,
  useSettings,
  type ThemeMode,
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

export default function SettingsScreen() {
  const palette = usePalette();
  const settings = useSettings();

  return (
    <ScrollView style={{ backgroundColor: palette.background }}>
      <Section title="Yenileme" palette={palette} />
      <Row palette={palette}>
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

      <Section title="Bildirimler" palette={palette} />
      <Row palette={palette}>
        <Text style={{ color: palette.text, flex: 1 }}>
          Yeni haber geldiğinde bildirim göster
        </Text>
        <Switch
          value={settings.notifyOnNew}
          onValueChange={async (v) => {
            if (v) await ensureNotificationPermission();
            await setSettings({ notifyOnNew: v });
          }}
        />
      </Row>

      <Section title="Görünüm" palette={palette} />
      <Row palette={palette}>
        <Text style={{ color: palette.text, flex: 1 }}>Tema</Text>
        <Picker
          options={THEME_OPTIONS}
          value={settings.themeMode}
          onChange={(v) => setSettings({ themeMode: v })}
          palette={palette}
        />
      </Row>
      <Row palette={palette}>
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

function Section({
  title,
  palette,
}: {
  title: string;
  palette: ReturnType<typeof usePalette>;
}) {
  return <Text style={[styles.section, { color: palette.primary }]}>{title}</Text>;
}

function Row({
  children,
  palette,
}: {
  children: React.ReactNode;
  palette: ReturnType<typeof usePalette>;
}) {
  return <View style={[styles.row, { borderColor: palette.border }]}>{children}</View>;
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
});
