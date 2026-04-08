# PRD vs Mevcut Uygulama — UI/UX Karşılaştırması

> Kaynak: `BrewOS_PRD.md` (v1.0) + Phase 6/7 UI-SPEC'leri
> Güncelleme: 2026-04-06

---

## Ekranlar / Sayfalar

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 1 | Brew method seçim ekranı | ✅ Mevcut |
| 2 | Parametre giriş ekranı (Brew Dashboard) | ✅ Mevcut |
| 3 | Sonuç ekranı — TDS%, EY%, SCA chart (Results) | ✅ Mevcut |
| 4 | Detaylı çıktılar ekranı (Extended Output) | ✅ Mevcut |
| 5 | Geçmiş runs listesi ekranı (Run History) | ✅ Mevcut |
| 6 | İki run karşılaştırma ekranı (Compare View) | ✅ Mevcut |

---

## Navigasyon & UX Akışı

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 7 | Tab bar / drawer yok — stack navigator | ✅ Mevcut |
| 8 | Rotary/drum picker ile brew method seçimi | ✅ Mevcut |
| 9 | Özel back butonu (standart ok değil) | ✅ Mevcut |
| 10 | Ekranlar arası geçiş animasyonu (fade + Y translate) | ✅ Mevcut |
| 11 | Accurate mode çalışırken skeleton/loading state | ✅ Mevcut |
| 12 | API hata ekranı (422 + network error) | ✅ Mevcut |
| 13 | Backend cold-start warmup banner (/health ping) | ✅ Mevcut |

---

## Brew Method Seçimi (Ekran 1)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 14 | French Press | ✅ Mevcut |
| 15 | V60 | ✅ Mevcut |
| 16 | Kalita Wave | ✅ Mevcut |
| 17 | Espresso | ✅ Mevcut |
| 18 | Moka Pot | ✅ Mevcut |
| 19 | AeroPress | ✅ Mevcut |

---

## Simülasyon Girdileri — Grinder (Ekran 2)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 20 | Grinder model seçici (preset dropdown) | ✅ Mevcut |
| 21 | Grinder setting / click spinner | ✅ Mevcut |
| 22 | Manuel grind size girişi (μm) | ✅ Mevcut |
| 23 | Comandante C40 MK4 preset | ✅ Mevcut |
| 24 | 1Zpresso preset | ✅ Mevcut |
| 25 | Baratza Encore preset | ✅ Mevcut |
| 26 | Mavo Grinder preset | ❌ PRD'de var, uygulamada yok |
| 27 | Timemore C2/C3 preset | ❌ PRD'de var, uygulamada yok |
| 28 | Niche Zero preset | ❌ PRD'de var, uygulamada yok |
| 29 | DF64 preset | ❌ PRD'de var, uygulamada yok |
| 30 | Eureka Mignon preset | ❌ PRD'de var, uygulamada yok |
| 31 | Fellow Ode preset | ❌ PRD'de var, uygulamada yok |
| 32 | Minimum 20 grinder preset (PRD M3 hedefi) | ❌ PRD'de var, uygulamada yok (mevcut: 3) |

---

## Simülasyon Girdileri — Su (Ekran 2)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 33 | Su miktarı (g) | ✅ Mevcut |
| 34 | Başlangıç su sıcaklığı (°C) | ✅ Mevcut |
| 35 | Su sıcaklığı bozunma modeli (vessel tipi seçimi) | ❌ PRD'de var, uygulamada yok |
| 36 | Su TDS / sertliği (ppm) — ekstraksiyon katsayısını etkiler | ❌ PRD'de var, uygulamada yok |

---

## Simülasyon Girdileri — Demleme Parametreleri (Ekran 2)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 37 | Coffee dose (g) | ✅ Mevcut |
| 38 | Brew time (s) | ✅ Mevcut |
| 39 | Fast / Accurate mode seçimi | ✅ Mevcut |
| 40 | Bloom hacmi (g) — CO2 modeline beslenir | ❌ PRD'de var, uygulamada yok |
| 41 | Bloom süresi (s) — CO2 modeline beslenir | ❌ PRD'de var, uygulamada yok |

---

## Simülasyon Girdileri — Çekirdek (Ekran 2)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 42 | Roast level: Light / Medium / Dark | ✅ Mevcut |
| 43 | Processing method: Washed / Natural / Honey | ❌ PRD'de var, uygulamada yok |
| 44 | Origin / Varietal: Arabica / Robusta / Liberica | ❌ PRD'de var, uygulamada yok |

---

## Sonuç Ekranı — Core Outputs (Ekran 3)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 45 | TDS% büyük callout | ✅ Mevcut |
| 46 | EY% büyük callout | ✅ Mevcut |
| 47 | SCA Brew Chart (Victory Native scatter + ideal zone) | ✅ Mevcut |
| 48 | Zone verdict: Ideal / Under-extracted / Over-extracted | ✅ Mevcut |
| 49 | Brew ratio gösterimi + öneri | ✅ Mevcut |
| 50 | Accurate mode badge ("Detailed simulation") | ✅ Mevcut |

---

## Detaylı Çıktılar (Ekran 4 — Extended Output)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 51 | Zamanla ekstraksiyon eğrisi (EY% vs t) | ✅ Mevcut |
| 52 | Parçacık boyut dağılımı eğrisi (PSD chart) | ✅ Mevcut |
| 53 | Flavor profili: Sour / Sweet / Bitter çubuk grafik | ✅ Mevcut |
| 54 | Extraction Uniformity Index (0–1) | ✅ Mevcut |
| 55 | Channeling Risk Score (espresso) | ✅ Mevcut |
| 56 | CO2 Degassing / Bloom etkisi kartı | ✅ Mevcut |
| 57 | Su sıcaklığı bozunma eğrisi (temp decay chart) | ✅ Mevcut |
| 58 | Puck/bed resistance tahmini (espresso) | ✅ Mevcut |
| 59 | Kafein konsantrasyonu tahmini (mg/mL) | ✅ Mevcut |
| 60 | Accurate mode zaman eğrisinde güven aralığı bantları | ❌ PRD'de var, uygulamada yok |

---

## Run History (Ekran 5)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 61 | Run'ı özel isimle kaydetme | ✅ Mevcut |
| 62 | Kaydedilen run'ları listeleme | ✅ Mevcut |
| 63 | 100 run aşılınca archive uyarısı | ✅ Mevcut |
| 64 | Sola swipe ile run silme (modal confirmation) | ✅ Mevcut |
| 65 | Boş liste empty state | ✅ Mevcut |
| 66 | Long-press ile selection mode | ✅ Mevcut |
| 67 | 2 run seç → "Compare Runs" butonu | ✅ Mevcut |

---

## Compare View (Ekran 6)

| # | PRD Öğesi | Durum |
|---|-----------|-------|
| 68 | TDS% / EY% yan yana callout + fark göstergesi | ✅ Mevcut |
| 69 | İki ekstraksiyon eğrisi üst üste bindirilmiş (overlaid) | ✅ Mevcut |
| 70 | Tek SCA chart üzerinde iki run noktası | ✅ Mevcut |
| 71 | Flavor profili karşılaştırması (Run A vs Run B) | ✅ Mevcut |

---

## Özet

| | Sayı |
|---|---|
| Toplam PRD UI/UX öğesi | 71 |
| ✅ Mevcut | 57 |
| ❌ PRD'de var, uygulamada yok | 14 |

### Eksik Öğeler (14 adet)

| Kategori | Eksik |
|----------|-------|
| Grinder presets | Mavo, Timemore C2/C3, Niche Zero, DF64, Eureka Mignon, Fellow Ode (6 preset) — PRD M3 hedefi: min. 20 |
| Su girdileri | Vessel tipi seçimi, Su TDS/sertliği (ppm) |
| Bloom girdileri | Bloom hacmi (g), Bloom süresi (s) |
| Çekirdek girdileri | Processing method (Washed/Natural/Honey), Origin/Varietal (Arabica/Robusta/Liberica) |
| Grafik | Accurate mode güven aralığı bantları |
