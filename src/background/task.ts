import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { refreshAllSources } from '@/data/refresh';
import { notifyNewArticles } from '@/notifications';
import { getSettings } from '@/state/settings';

export const REFRESH_TASK = 'news-app.refresh';

TaskManager.defineTask(REFRESH_TASK, async () => {
  try {
    const result = await refreshAllSources();
    if (result.newArticles.length > 0) {
      await notifyNewArticles(result.newArticles).catch(() => {});
    }
    return result.totalNew > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (e) {
    console.warn('[bg] refresh failed', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied) {
    console.info('[bg] disabled by OS / user');
    return;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REFRESH_TASK);
  const settings = await getSettings();
  const intervalSeconds = Math.max(15, settings.fetchMinutes) * 60;
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(REFRESH_TASK).catch(() => {});
  }
  await BackgroundFetch.registerTaskAsync(REFRESH_TASK, {
    minimumInterval: intervalSeconds,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundFetch(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REFRESH_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(REFRESH_TASK);
  }
}
