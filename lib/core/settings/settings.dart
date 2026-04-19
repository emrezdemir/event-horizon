import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppSettings {
  final int fetchMinutes;
  final ThemeMode themeMode;
  final bool translateOnOpen;
  final bool downloadOverWifiOnly;
  final double readerFontScale;

  const AppSettings({
    this.fetchMinutes = 15,
    this.themeMode = ThemeMode.system,
    this.translateOnOpen = true,
    this.downloadOverWifiOnly = true,
    this.readerFontScale = 1.0,
  });

  AppSettings copyWith({
    int? fetchMinutes,
    ThemeMode? themeMode,
    bool? translateOnOpen,
    bool? downloadOverWifiOnly,
    double? readerFontScale,
  }) =>
      AppSettings(
        fetchMinutes: fetchMinutes ?? this.fetchMinutes,
        themeMode: themeMode ?? this.themeMode,
        translateOnOpen: translateOnOpen ?? this.translateOnOpen,
        downloadOverWifiOnly: downloadOverWifiOnly ?? this.downloadOverWifiOnly,
        readerFontScale: readerFontScale ?? this.readerFontScale,
      );
}

class SettingsController extends AsyncNotifier<AppSettings> {
  static const _kFetch = 'fetchMinutes';
  static const _kTheme = 'themeMode';
  static const _kTranslate = 'translateOnOpen';
  static const _kWifi = 'downloadOverWifiOnly';
  static const _kFont = 'readerFontScale';

  @override
  Future<AppSettings> build() async {
    final prefs = await SharedPreferences.getInstance();
    return AppSettings(
      fetchMinutes: prefs.getInt(_kFetch) ?? 15,
      themeMode: ThemeMode.values[prefs.getInt(_kTheme) ?? 0],
      translateOnOpen: prefs.getBool(_kTranslate) ?? true,
      downloadOverWifiOnly: prefs.getBool(_kWifi) ?? true,
      readerFontScale: prefs.getDouble(_kFont) ?? 1.0,
    );
  }

  Future<void> setFetchMinutes(int minutes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kFetch, minutes);
    state = AsyncData(state.value!.copyWith(fetchMinutes: minutes));
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kTheme, mode.index);
    state = AsyncData(state.value!.copyWith(themeMode: mode));
  }

  Future<void> setTranslateOnOpen(bool v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kTranslate, v);
    state = AsyncData(state.value!.copyWith(translateOnOpen: v));
  }

  Future<void> setDownloadOverWifiOnly(bool v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kWifi, v);
    state = AsyncData(state.value!.copyWith(downloadOverWifiOnly: v));
  }

  Future<void> setReaderFontScale(double v) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble(_kFont, v);
    state = AsyncData(state.value!.copyWith(readerFontScale: v));
  }
}

final settingsControllerProvider =
    AsyncNotifierProvider<SettingsController, AppSettings>(SettingsController.new);
