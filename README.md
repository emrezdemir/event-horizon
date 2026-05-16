# Haberlerim — Expo (Android + iOS)

Sunucusuz, tamamen cihazda çalışan bir haber okuyucu. Kullanıcının eklediği
sitelerden — varsa RSS'ten, yoksa anasayfa scrape ederek — haberleri çeker;
SQLite + FTS5 ile yerelde saklar; yeni haber geldiğinde bildirim gönderir.

## Çalıştırmak

Expo Go ile hızlı deneme (üretim için değil — bildirimler tam çalışmaz):

```bash
npm install
npx expo start
```

Çıkan QR kodu **Expo Go** ile okut. Hot reload aktif.

> Bildirimleri ve arka plan fetch'i gerçek anlamda test etmek için dev build
> almak gerekir. Aşağıdaki **Build & Release** bölümüne bak.

## Özellikler

- Kullanıcının eklediği siteler (RSS auto-discovery + HTML fallback)
- Yayın tarihine göre stabil sıralama (`published_at DESC, id DESC`)
- Pull-to-refresh + infinite scroll (dedup'lı, race-safe)
- Cihaz açıkken her 5 dk'da otomatik yenileme
- Arka plan fetch (`expo-background-fetch` — iOS ≥15 dk OS kararı, Android WorkManager)
- Yeni haber geldiğinde local notification (tek/çoklu özet)
- SQLite FTS5 ile gerçek arama
- Sistem paylaşım sheet'i (`expo-sharing` + `Share`)
- Açık/koyu tema, ayarlanabilir okuma yazı boyutu, serif okuma görünümü

## Sınırlar

- **Arka plan iOS**: 5 dk garanti değil; sistem aralık verir.
- **HTML scraping** site yapısı değişirse kırılgan.
- **Expo Go**'da bildirim ve arka plan fetch sınırlıdır; production için
  EAS dev/preview/production build gerekir.

## Proje yapısı

```
app/                   # expo-router ekranları
  _layout.tsx
  index.tsx            # feed
  article/[id].tsx     # makale okuma
  sources.tsx          # kaynak yönetimi
  search.tsx           # FTS5 arama
  settings.tsx         # ayarlar
src/
  db/                  # SQLite + FTS5 schema, queries
  data/                # rssFetcher, htmlFetcher, readability, refresh
  state/               # AsyncStorage settings store
  background/          # expo-background-fetch task
  notifications.ts     # expo-notifications helper
  theme/               # palette
  utils/               # format helpers
```

## Build & Release

Tek sefer:

```bash
npm i -g eas-cli
eas login
eas init
eas build:configure
```

Profiller (`eas.json`):

| Profil        | Ne için                                      |
| ------------- | -------------------------------------------- |
| `development` | Dev menü açık, Metro'ya bağlanan build       |
| `preview`     | Internal/APK, release modunda telefona kur   |
| `production`  | Mağaza için AAB/IPA, build number otomatik   |

Build:

```bash
eas build --profile development --platform android   # ya da ios
eas build --profile production  --platform android
eas build --profile production  --platform ios
```

Submit:

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

> Mağazaya çıkmadan önce `app.json` içinde `bundleIdentifier` ve `package`
> değerlerini kendi domain'ine göre güncelle. `BGTaskSchedulerPermittedIdentifiers`
> aynı paket adıyla başlamak zorunda.

## Lisans

Belirtilmemiş — kullanmadan önce sahibine danış.
