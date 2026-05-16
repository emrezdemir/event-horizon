# Changelog

Bu dosya kayda değer kullanıcı görünümü değişiklikleri toplar. Format
[Keep a Changelog](https://keepachangelog.com/) esinli.

## [Unreleased]

### Eklendi
- Yeni haber geldiğinde local notification (`expo-notifications`). Tek haberde
  başlık, çoklu haberde özet bildirim. Ayarlardan kapatılabilir.
- Feed'in sonunda "Hepsi yüklendi" göstergesi.

### Değişti
- Feed sıralamasına stabil tiebreaker eklendi: `COALESCE(published_at, fetched_at) DESC, id DESC`.
- Infinite scroll yeniden yazıldı: ref tabanlı race koruması, ID-set ile dedup,
  boş listede `onEndReached` yok sayılıyor.

### Kaldırıldı
- Çeviri özelliği tamamen kaldırıldı (MyMemory / LibreTranslate / DeepL).
  Makale ekranındaki çeviri butonu, ayarlardaki çeviri bölümü, `translator.ts`
  ve TS tarafındaki ilgili alanlar temizlendi. Veritabanı schema'sındaki
  `translated_*` kolonları geriye dönük uyumluluk için duruyor (yeni satırlarda
  NULL kalır).

## [0.1.0] — Önceki sürümler

- Expo SDK 52 → 54 yükseltmesi (iOS Expo Go uyumluluğu).
- Flutter → Expo (TypeScript) tabanlı yeniden yazım.
- Sunucusuz haber uygulaması iskeleti.
