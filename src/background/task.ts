import * as BackgroundTask from 'expo-background-task';
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
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('[bg] refresh failed', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundFetch(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status === BackgroundTask.BackgroundTaskStatus.Restricted) {
    console.info('[bg] disabled by OS / user');
    return;
  }
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REFRESH_TASK);
  const settings = await getSettings();
  // expo-background-task `minimumInterval`'i dakika cinsinden alır (iOS min 15 dk).
  const intervalMinutes = Math.max(15, settings.fetchMinutes);
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(REFRESH_TASK).catch(() => {});
  }
  await BackgroundTask.registerTaskAsync(REFRESH_TASK, {
    minimumInterval: intervalMinutes,
  });
}

export async function unregisterBackgroundFetch(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REFRESH_TASK);
  if (isRegistered) {
    await BackgroundTask.unregisterTaskAsync(REFRESH_TASK);
  }
}
