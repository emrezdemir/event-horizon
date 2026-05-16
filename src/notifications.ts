import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { ArticleWithSource } from '@/db/types';
import { getSettings } from '@/state/settings';

let _configured = false;
let _permissionGranted: boolean | null = null;

function configureHandler(): void {
  if (_configured) return;
  Notifications.setNotificationHandler({
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
  configureHandler();
  if (_permissionGranted === true) return true;

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    status = req.status;
  }

  _permissionGranted = status === 'granted';

  if (_permissionGranted && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('news', {
      name: 'Haberler',
      importance: Notifications.AndroidImportance.DEFAULT,
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

  const ok = await ensureNotificationPermission();
  if (!ok) return;

  if (items.length === 1) {
    const a = items[0];
    await Notifications.scheduleNotificationAsync({
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${items.length} yeni haber`,
      body: preview + more,
      ...(Platform.OS === 'android' ? { channelId: 'news' } : {}),
    },
    trigger: null,
  });
}
