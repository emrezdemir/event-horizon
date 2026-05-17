import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ArticleWithSource } from '@/db/types';
import { getSettings } from '@/state/settings';

// Expo Go (SDK 53+) Android push token desteğini kaldırdı; modülün import yan etkisi
// `DevicePushTokenAutoRegistration` Expo Go'da yüklenir yüklenmez ERROR basıyor.
// Bu yüzden expo-notifications'ı Expo Go'da hiç require etmiyoruz — fonksiyonlar no-op.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const NOTIFICATIONS_AVAILABLE = !IS_EXPO_GO;

type NotificationsModule = typeof import('expo-notifications');
let _N: NotificationsModule | null = null;
function loadNotifications(): NotificationsModule | null {
  if (!NOTIFICATIONS_AVAILABLE) return null;
  if (_N) return _N;
  _N = require('expo-notifications') as NotificationsModule;
  return _N;
}

let _configured = false;
let _permissionGranted: boolean | null = null;

function configureHandler(N: NotificationsModule): void {
  if (_configured) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  _configured = true;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const N = loadNotifications();
  if (!N) return false;
  configureHandler(N);
  if (_permissionGranted === true) return true;

  const current = await N.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const req = await N.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    status = req.status;
  }

  _permissionGranted = status === 'granted';

  if (_permissionGranted && Platform.OS === 'android') {
    await N.setNotificationChannelAsync('news', {
      name: 'Haberler',
      importance: N.AndroidImportance.DEFAULT,
      sound: undefined,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#1e88e5',
    });
  }

  return _permissionGranted;
}

export async function notifyNewArticles(items: ArticleWithSource[]): Promise<void> {
  if (items.length === 0) return;
  const settings = await getSettings();
  if (!settings.notifyOnNew) return;

  const N = loadNotifications();
  if (!N) return;

  const ok = await ensureNotificationPermission();
  if (!ok) return;

  if (items.length === 1) {
    const a = items[0];
    await N.scheduleNotificationAsync({
      content: {
        title: a.source_title,
        body: a.title,
        data: { articleId: a.id },
        ...(Platform.OS === 'android' ? { channelId: 'news' } : {}),
      },
      trigger: null,
    });
    return;
  }

  const preview = items
    .slice(0, 3)
    .map((a) => `• ${a.title}`)
    .join('\n');
  const more = items.length > 3 ? `\n+${items.length - 3} haber daha` : '';
  await N.scheduleNotificationAsync({
    content: {
      title: `${items.length} yeni haber`,
      body: preview + more,
      ...(Platform.OS === 'android' ? { channelId: 'news' } : {}),
    },
    trigger: null,
  });
}
