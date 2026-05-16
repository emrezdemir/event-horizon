# Haberlerim

Kendi RSS okuyucumu istedim, çıkan iş bu. Telefonda çalışıyor, sunucu yok,
hesap yok. Eklediğin sitelerden haberleri çekiyor, telefonun içinde tutuyor,
yenisi geldiğinde haber veriyor.

Expo (React Native) ile yazılı, Android ve iOS'ta aynı kod.

> **AI-native**: kodun tamamı Claude (Anthropic) ile yazıldı. Sıfırdan iskelet,
> feature'lar, refactor, README, commit mesajları — hepsi konuşa konuşa çıktı.
> Klavyede tek satır JS/TS yazılmadı.

## Nasıl çalışıyor

Bir site URL'si veriyorsun. Uygulama önce RSS feed'i bulmaya çalışıyor,
bulamazsa anasayfayı parse edip linkleri çıkarıyor. Çektiği her şey SQLite'a
yazılıyor, FTS5 ile aranabilir oluyor. Telefon arka plandayken
`expo-background-fetch` belli aralıklarla tekrar yokluyor; yeni bir şey
varsa bildirim atıyor.

Çeviri yok, paylaşım sistem sheet'ini kullanıyor, makaleyi okurken tarayıcıda
açabiliyorsun. Tema sistemi takip ediyor ama el ile de değiştirebilirsin.

## Denemek

```bash
npm install
npx expo start
```

QR kodu Expo Go ile okut, çalışır. Bildirim ve arka plan fetch'i ciddi
test etmek istiyorsan dev build alman lazım, alttaki bölüme bak.

## Dosyalar nerede

```
app/
  _layout.tsx
  index.tsx              feed
  article/[id].tsx       makale okuma
  sources.tsx            kaynak ekle/sil/kapat
  search.tsx             arama
  settings.tsx           ayarlar
src/
  db/                    sqlite, fts5, sorgular
  data/                  rss/html fetcher, refresh
  state/                 async storage settings
  background/            background fetch task
  notifications.ts       expo-notifications wrapper
  theme/                 palet
  utils/                 format yardımcıları
```

## Mağazaya çıkarmak

Expo Go bilgisayarsız hızlı deneme için iyi ama bildirim ve background fetch
orada eksik kalıyor. Gerçek build için EAS:

```bash
npm i -g eas-cli
eas login
eas init
eas build:configure
```

Sonra:

- `eas build --profile development --platform android` — Metro'ya bağlanan
  dev build, native bir şey değişene kadar tekrar build gerekmez
- `eas build --profile preview --platform android` — release modunda APK,
  telefona kurup test
- `eas build --profile production --platform android` — Play Store için AAB
- iOS'ta da aynısı, ama Apple Developer Program ($99/yıl) gerek

Mağazaya yüklemek:

```bash
eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Production'a çıkmadan önce `app.json` içinde `bundleIdentifier` ve `package`
değerlerini değiştir, şu an placeholder. `BGTaskSchedulerPermittedIdentifiers`
de aynı paket adıyla başlamalı.

## Bilinen sınırlar

- iOS arka plan aralıklarını sistem belirler, 15 dakika altı garanti değil
- HTML scraping site yapısı değiştiğinde kırılabilir
- Expo Go'da bildirim ve background fetch tam çalışmaz; dev build şart

## Yazılım nasıl üretildi

Tüm geliştirme süreci [Claude Code](https://claude.com/claude-code) üzerinden
yürütüldü. İlk sürüm Flutter'dı, sonra "Expo Go'da çalışsın, derleme makinem
olmasın" diye Expo (TypeScript) üzerine baştan yazıldı. Sonraki iyileştirmeler
de (çevirinin kaldırılması, bildirimler, pagination düzenlemeleri) aynı
şekilde, IDE'ye geçmeden, Claude ile konuşarak yapıldı.

Commit log'larında `Co-Authored-By: Claude` izini görebilirsin.

## Lisans

MIT — `LICENSE` dosyasına bak.
