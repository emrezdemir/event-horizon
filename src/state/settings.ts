import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  fetchMinutes: number;
  themeMode: ThemeMode;
  readerFontScale: number;
  notifyOnNew: boolean;
}

const DEFAULTS: Settings = {
  fetchMinutes: 15,
  themeMode: 'system',
  readerFontScale: 1.0,
  notifyOnNew: true,
};

const KEY = 'settings.v1';

let _settings: Settings = { ...DEFAULTS };
let _loaded = false;
const listeners = new Set<() => void>();

async function load(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      _settings = { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {
    // keep defaults
  } finally {
    _loaded = true;
    listeners.forEach((l) => l());
  }
}

async function persist(): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(_settings));
}

export async function initSettings(): Promise<Settings> {
  if (!_loaded) await load();
  return _settings;
}

export async function getSettings(): Promise<Settings> {
  if (!_loaded) await load();
  return _settings;
}

export async function setSettings(patch: Partial<Settings>): Promise<void> {
  if (!_loaded) await load();
  _settings = { ..._settings, ...patch };
  await persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Settings {
  return _settings;
}

export function useSettings(): Settings {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [, force] = useState(0);
  useEffect(() => {
    if (!_loaded) {
      load().then(() => force((n) => n + 1));
    }
  }, []);
  return snap;
}
