<h1 align="center">Haberlerim</h1>

<p align="center">
  Sunucusuz, tamamen cihazda çalışan bir haber okuyucu.<br/>
  RSS varsa RSS'ten, yoksa anasayfa scrape ederek haberleri çeker.<br/>
  Telefonun içinde tutar, yenisi geldiğinde bildirim atar.
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo%20SDK-54-000020?logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white" />
  <img alt="Built with Claude" src="https://img.shields.io/badge/AI--native-Claude-d97706" />
  <a href="https://github.com/emrezdemir/event-horizon/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/emrezdemir/event-horizon" /></a>
</p>

---

## İçindekiler

- [Hakkında](#hakkında)
- [Özellikler](#özellikler)
- [Yenilikler](#yenilikler)
- [Hızlı başlangıç](#hızlı-başlangıç)
- [Mağaza için build](#mağaza-için-build)
- [Mimari](#mimari)
- [Nasıl yazıldı — AI-native](#nasıl-yazıldı--ai-native)
- [Yol haritası](#yol-haritası)
- [Katkı](#katkı)
- [Lisans](#lisans)
- [İletişim](#i̇letişim)

---

## Hakkında

Kendi RSS okuyucumu istedim, çıkan iş bu. Hesap yok, sunucu yok, takip yok.
Bir site URL'si veriyorsun; uygulama önce RSS feed'i arıyor, yoksa anasayfayı
parse edip haber linklerini çıkarıyor. Çektiği her şey telefonun içindeki
SQLite'a yazılıyor, FTS5 ile aranabilir hale geliyor. Arka plandayken belli
aralıklarla yokluyor, yeni haber varsa bildirim gönderiyor.

Expo (React Native + TypeScript) ile yazılı — Android ve iOS'ta aynı kod.

## Özellikler

- **Kaynak yönetimi** — URL ver, kaynak listene eklensin. RSS auto-discovery,
  yoksa HTML scrape fallback'i (`node-html-parser` + okunabilirlik çıkarımı).
- **Yerel depolama** — `expo-sqlite` + FTS5 sayesinde tam metin arama,
  diakritiksiz Türkçe arama desteği.
- **Sonsuz kaydırma** — Race-safe pagination, ID-set ile dedup, sayfa sonu
  göstergesi.
- **Otomatik yenileme** — Uygulama açıkken her 5 dakikada bir, arka planda
  `expo-background-fetch` ile (iOS aralıklarını sistem belirler, Android'de
  WorkManager).
- **Bildirim** — Yeni haber geldiğinde local notification. Tek haberse başlığı,
  çoklu haberse özet listeyi gösterir. Ayarlardan kapatılabilir.
- **Okuma deneyimi** — Serif gövde fontu, ayarlanabilir yazı boyutu, açık/koyu
  tema (sistemi takip eder).
- **Paylaşım** — Sistem paylaşım sheet'i, makaleyi tarayıcıda açma,
  favorilere ekleme, okundu/okunmadı durumu.

## Yenilikler

Tam liste için bkz. [CHANGELOG.md](CHANGELOG.md).

**[Unreleased]**
- Yeni haber geldiğinde local notification (`expo-notifications`).
- Feed sıralamasına stabil tiebreaker (`id DESC`) eklendi.
- Sonsuz kaydırma yeniden yazıldı — race koruması, dedup, "Hepsi yüklendi"
  göstergesi.
- Çeviri özelliği kaldırıldı (MyMemory / LibreTranslate / DeepL).

## Hızlı başlangıç

Bilgisayardan Expo Go ile denemek:

```bash
git clone https://github.com/emrezdemir/event-horizon.git
cd event-horizon
npm install
npx expo start
```

Çıkan QR'ı telefonundaki **Expo Go** ile okut. Hot reload aktif.

> ⚠️ Expo Go'da bildirim ve arka plan fetch tam çalışmaz. Bunları gerçek
> anlamda test etmek için dev build alman gerek — aşağıya bak.

### Komutlar

| Komut                | Ne yapar                                  |
| -------------------- | ----------------------------------------- |
| `npm start`          | Expo dev server                           |
| `npm run android`    | Expo + Android cihaz/emulator             |
| `npm run ios`        | Expo + iOS simulator                      |
| `npm run typecheck`  | TypeScript kontrolü                       |
| `npm run lint`       | `expo lint`                               |

## Mağaza için build

[EAS Build](https://docs.expo.dev/build/introduction/) ile. Tek seferlik
kurulum:

```bash
npm i -g eas-cli
eas login
eas init
eas build:configure
```

Üç profille çalışıyoruz:

| Profil        | Ne için                                                  |
| ------------- | -------------------------------------------------------- |
| `development` | Metro'ya bağlanan dev build; native değişene kadar yeter |
| `preview`     | Release modunda APK, telefona kur ve dene                |
| `production`  | Mağaza için AAB / IPA, build number otomatik artar       |

Build & submit:

```bash
eas build --profile production --platform android
eas build --profile production --platform ios

eas submit --profile production --platform android
eas submit --profile production --platform ios
```

Mağazaya çıkmadan önce `app.json` içindeki placeholder değerleri değiştir:

- `ios.bundleIdentifier` → kendi domain'inin ters notasyonu
- `android.package` → aynısı
- `ios.infoPlist.BGTaskSchedulerPermittedIdentifiers` → aynı paket adıyla
  başlamalı

Apple Developer Program $99/yıl, Google Play Console tek seferlik $25.

## Mimari

```
app/                       # expo-router ekranları (file-based routing)
├── _layout.tsx            # root stack + tema + arka plan zamanlayıcı
├── index.tsx              # feed (anasayfa)
├── article/[id].tsx       # makale okuma ekranı
├── sources.tsx            # kaynak ekle / sil / aç-kapa
├── search.tsx             # FTS5 arama
└── settings.tsx           # ayarlar

src/
├── db/
│   ├── client.ts          # sqlite open + migrate + FTS5 trigger'lar
│   ├── queries.ts         # tipli sorgular (page, search, upsert, ...)
│   └── types.ts           # Article / Source / Draft tipleri
├── data/
│   ├── rssFetcher.ts      # fast-xml-parser ile RSS/Atom
│   ├── htmlFetcher.ts     # node-html-parser ile anasayfa scrape
│   ├── readability.ts     # makale içeriği ayıklama
│   ├── sourceDiscovery.ts # RSS auto-discovery + favicon
│   ├── http.ts            # ortak fetch katmanı
│   └── refresh.ts         # tüm kaynakları yenile, yenileri döndür
├── state/
│   └── settings.ts        # AsyncStorage + useSyncExternalStore
├── background/
│   └── task.ts            # expo-background-fetch task'ı
├── notifications.ts       # expo-notifications wrapper (izin + tetik)
├── theme/                 # palet, koyu/açık tema
└── utils/                 # tarih, format
```

Her şey cihazda, dış servis sadece doğrudan haber sitesine yapılan HTTP
istekleri. Telemetri yok, analytics yok, kimlik doğrulama yok.

## Nasıl yazıldı — AI-native

Bu projenin **tek bir satırı bile elle yazılmadı**. Hepsi
[Claude Code](https://claude.com/claude-code) (Anthropic) üzerinden,
konuşa konuşa, doğal dilde istekler verilerek üretildi.

- İlk sürüm Flutter'dı; "derleme makinem olmasın, Expo Go ile çalışsın"
  ihtiyacına göre Expo + TypeScript'e baştan yazıldı.
- Çevirinin kaldırılması, bildirim altyapısının eklenmesi, pagination'ın
  race-safe hale getirilmesi gibi iyileştirmeler de aynı şekilde — IDE
  açılmadan, kod düzenleyiciye dokunulmadan yapıldı.
- Bu README dahil tüm dokümanlar Claude tarafından yazıldı.

Commit log'unda `Co-Authored-By: Claude` izini görebilirsin. Bu proje aynı
zamanda "AI-native development" pratiğinin bir vitrini: planlama, kodlama,
review, refactor, dokümantasyon — hepsi tek bir konuşma akışında.

## Yol haritası

- [ ] Bildirime tıklayınca ilgili makaleye açılış (deep link)
- [ ] Favoriler ekranı
- [ ] Kategori / etiket bazlı filtreleme
- [ ] OPML import/export
- [ ] Offline okuma (içeriği prefetch)
- [ ] Widget desteği (iOS / Android)

## Katkı

Issue ve PR'lar açık. Geliştirme yapacaksan:

1. Fork al, branch aç (`feat/...` veya `fix/...`)
2. `npm run typecheck` ve `npm run lint` temiz olsun
3. Türkçe veya İngilizce commit yazabilirsin, conventional commit prefix
   tercih edilir (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
4. PR'da neyi neden yaptığını kısaca yaz

Büyük değişiklik düşünüyorsan önce bir issue aç, üzerine konuşalım.

## Lisans

[MIT](LICENSE) — özgürce kullan, kopyala, değiştir, dağıt. Sadece copyright
bildirimini koru.

## İletişim

- **Repo & issues:** [github.com/emrezdemir/event-horizon](https://github.com/emrezdemir/event-horizon)
- **Geliştirici:** Emre Özdemir — [@emrezdemir](https://github.com/emrezdemir)

<p align="center">
  <sub>Türkiye'den, Claude ile birlikte.</sub>
</p>
