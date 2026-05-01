# Haberlerim — Expo (Android + iOS)

Kişisel kullanım için, çoğunlukla cihazda çalışan haber okuyucu. RSS varsa
RSS'ten, yoksa anasayfa scrape ederek haberleri çeker; SQLite + FTS5 ile
yerelde saklar; istenirse haberi online bir sağlayıcıya (MyMemory /
LibreTranslate / DeepL) yollayıp Türkçe çevirisini alır.

## Çalıştırmak (Mac/PC gerekmez)

1. iPhone'una **Expo Go**'yu App Store'dan indir.
2. Bu repoyu Snack veya bir bilgisayar üzerinde aç. Yerelde çalıştırıyorsan:
   ```bash
   npm install
   npx expo start
   ```
3. Çıkan QR kodu **Expo Go** içinden okut → uygulama anında telefonda açılır.
4. Hot reload: kod değişir, telefonda anında güncellenir.

## Özellikler

- Kullanıcının eklediği siteler (RSS auto-discovery + HTML fallback)
- Pull-to-refresh + infinite scroll
- Cihaz açıkken her 5 dk'da otomatik yenileme
- Arka plan fetch (`expo-background-fetch`, iOS ≥15dk OS kararı, Android WorkManager)
- Çeviri sağlayıcı seçilebilir:
  - **MyMemory** (varsayılan, anahtarsız, ücretsiz, ~5000 karakter/gün)
  - **LibreTranslate** (kendi self-hosted ya da public)
  - **DeepL** (ücretsiz/paid, API key)
- SQLite FTS5 ile gerçek arama
- Sistem paylaşım sheet'i (`expo-sharing` + `Share`)
- Açık/koyu tema, ayarlanabilir okuma yazı boyutu, sade/serif okuma görünümü

## Sınırlar

- **Çeviri online**: MyMemory/LibreTranslate/DeepL — internet gerekir. (ML Kit gibi
  cihaz üstü çeviriler Expo Go sandbox'ında çalışmaz; bu uygulama Expo Go ile
  çalışacak şekilde tasarlandı.)
- **Arka plan iOS**: 5 dk garanti değil. iOS aralıkları sistem kararına bağlı.
- **HTML scraping** site yapısı değişirse kırılgan olabilir.

## Yapı

```
app/                   # expo-router ekranları
  _layout.tsx
  index.tsx            # feed (anasayfa)
  article/[id].tsx     # makale okuma
  sources.tsx          # kaynak yönetimi
  search.tsx           # FTS5 arama
  settings.tsx         # ayarlar
src/
  db/                  # SQLite + FTS5 schema, queries
  data/                # rssFetcher, htmlFetcher, readability, translator, refresh
  state/               # AsyncStorage settings store
  background/          # expo-background-fetch task
  theme/               # palette
  utils/               # format helpers
```

## Production Build (sonradan)

Telefona Expo Go olmadan kurmak istersen:
- **Android APK**: `eas build -p android --profile preview` (EAS Build, ücretsiz tier)
- **iOS TestFlight**: `eas build -p ios` + Apple Developer Program ($99/yıl)
