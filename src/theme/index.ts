import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryOn: string;
  border: string;
  outline: string;
  danger: string;
}

const light: Palette = {
  background: '#FCFAF6',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EEE7',
  text: '#1A1B1A',
  textMuted: '#5C5F5A',
  primary: '#1B5E20',
  primaryOn: '#FFFFFF',
  border: '#E5E2DA',
  outline: '#C8C6BE',
  danger: '#B3261E',
};

const dark: Palette = {
  background: '#0F1411',
  surface: '#171C19',
  surfaceMuted: '#1F2521',
  text: '#E9ECE7',
  textMuted: '#A0A6A0',
  primary: '#7CCB87',
  primaryOn: '#0F1411',
  border: '#2A302C',
  outline: '#3A413C',
  danger: '#F2B8B5',
};

export function usePalette(): Palette {
  const sys = useColorScheme();
  const settings = useSettings();
  const mode = settings.themeMode === 'system' ? sys : settings.themeMode;
  return mode === 'dark' ? dark : light;
}

export const fonts = {
  // Sistem font'unu kullanıyoruz; iOS'ta SF, Android'de Roboto.
  // Okuma ekranında serif istersen 'Georgia' / 'serif' dene.
  body: undefined as string | undefined,
  serif: 'Georgia',
};
