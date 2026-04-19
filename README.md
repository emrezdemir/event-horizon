# News App — Sunucusuz Haber Okuyucu

Android ve iOS için Flutter ile yazılmış, kişisel kullanıma yönelik bir haber uygulaması. Tüm işler telefonda çalışır — sunucu yoktur.

## Özellikler

- RSS/Atom varsa RSS, yoksa HTML scrape ile haber çeker
- Kullanıcı kaynakları ekleyip çıkarabilir
- 5 dakikada bir (ayarlanabilir) arka plan fetch
- Yabancı dilde haberleri cihaz üstünde (Google ML Kit) Türkçeye çevirir; internet gerekmez
- Tam metin arama (SQLite FTS5)
- Paylaş, favori, okundu işaretleme
- Sade okuma ekranı, açık/koyu tema, ayarlanabilir yazı tipi

## Kurulum

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

### Gereklilikler
- Flutter 3.24+
- Android: minSdk 23 (Android 6.0+)
- iOS: 13+ (build için macOS + Xcode gerekir)

## Mimari

Katmanlar:
- `lib/core/` — DB (drift), HTTP (dio), background worker (workmanager), translation (MLKit), tema, router
- `lib/data/` — kaynak keşfi, RSS/HTML fetcher'ları, repository'ler
- `lib/features/` — feed, article, sources, search, settings ekranları

## Kısıtlar

- **iOS arka plan:** Apple BGTaskScheduler ile arka plan fetch ~15dk ve OS kararına bağlıdır. 5dk garanti değildir; uygulama önde iken tam 5dk çalışır.
- **Android 15+:** Foreground service izni gerekir (manifest'te tanımlı).
- **ML Kit çeviri modeli:** Dil başına ~30MB, ilk çeviride indirilir.
- **HTML scraping** site yapısı değişirse kırılabilir; Readability genel bir çözümdür.
