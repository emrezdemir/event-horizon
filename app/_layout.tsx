import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerBackgroundFetch } from '@/background/task';
import { getDb } from '@/db/client';
import { refreshAllSources } from '@/data/refresh';
import { initSettings, useSettings } from '@/state/settings';
import { usePalette } from '@/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initSettings();
      await getDb();
      registerBackgroundFetch().catch(() => {});
      setReady(true);
    })();
  }, []);

  // foreground 5dk yenileme — bg fetch garantisinden bağımsız
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      refreshAllSources().catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [ready]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemedShell ready={ready} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedShell({ ready }: { ready: boolean }) {
  const palette = usePalette();
  const settings = useSettings();
  const sys = useColorScheme();
  const mode = settings.themeMode === 'system' ? sys : settings.themeMode;

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: palette.background }} />;
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: palette.background },
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Haberlerim' }} />
        <Stack.Screen name="article/[id]" options={{ title: '' }} />
        <Stack.Screen name="sources" options={{ title: 'Kaynaklar' }} />
        <Stack.Screen name="search" options={{ title: 'Ara' }} />
        <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
      </Stack>
    </>
  );
}
