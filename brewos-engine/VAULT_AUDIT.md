# Obsidian Vault Audit Report

**Tarih:** 2026-04-07  
**Kapsam:** Read-only audit — hiçbir şey değiştirilmedi  
**Vault:** `D:\Programs\Obsidian\My_Coffee_App\BrewOS_To-Do_Before_Implementation\`  
**Repo:** `D:\Coding\Keif\brewos-engine\brewos\`

---

## Özet Tablo

| Audit Kalemi | Durum | Not |
|---|---|---|
| 00_Index.md | ⚠️ Stale | Phase 5'te dondurulmuş; Phase 6–7 yok |
| Physics/papers/ | 🟡 18 dosya, hiçbiri tam okunmamış | Equations extracted, manual read yapılmamış |
| Physics/equations/ | 🟢 18 equation dosyası (+ 1 README) | 00_Index ile uyuşuyor |
| PRD/decisions/ | ⚠️ Eksik + stale içerik var | DECISION-005..009 yok; KARAR-001 + DECISION-002 stale |
| PRD/architecture_spec.md | 🟢 DECISION-010 doğru yansıtılmış | Solver mapping güncel |
| Validation/ | ⚠️ Kısmi | phase8_results.md var; CO2 caveat var; Phase 4–7 yok |
| CHECKLIST.md | ⚠️ Stale | Phase 1–5 işaretli; Phase 6–7 yok |
| Grinders/ | 🟡 sources.md only | JSON presets vault'ta değil, repoda |
| Repo cross-check | ⚠️ 4 uyuşmazlık tespit edildi | Detay aşağıda |

---

## 1. 00_Index.md

**Konum:** `BrewOS_To-Do_Before_Implementation/00_Index.md`  
**Son güncelleme:** `2026-03-28 (Phase 5 tamamlandı — vault audit & reconciliation)`

### Maille 2021 eklendi mi?
**EVET** — papers tablosunda ve equations tablosunda açıkça yer alıyor:
- Papers: `Maille et al., 2021.md` → "Fast mode biexponential kinetics"
- Equations: `maille_2021_biexponential_kinetics.md` + `maille_2021_hybrid_bimodal_psd.md`

### Tüm paper'lar listelenmiş mi?
**EVET** — 18 paper listesi eksiksiz. Paper dosyası sayısıyla birebir örtüşüyor.

### Stale içerik
**EVET — Phase 6 ve 7 eksik.** Durum tablosu Phase 5'te dondurulmuş durumda. Gerçekte:
- Phase 6 (mobile app — 7 ekran, Victory charts) tamamlandı
- Phase 7 (run history, SQLite) tamamlandı

Bu iki phase vault'ta hiç yok: ne durum tablosunda ne de implementation phases altında.

---

## 2. Physics/papers/

**Konum:** `Physics/papers/`  
**Dosya sayısı:** 18 dosya (00_Index ile uyuşuyor ✅)

### Dosya listesi ve reading status

Her 18 paper dosyasının `Reading status` alanı identik:

```
[x] equations extracted — not manually read   (18/18)
[ ] in progress
[ ] done
```

| Dosya | Yazar/Yıl | Reading Status |
|---|---|---|
| Moroney et al., 2015.md | Moroney 2015 | equations extracted — not manually read |
| Moroney et al., 2016.md | Moroney 2016 | equations extracted — not manually read |
| Moroney et al., 2019.md | Moroney 2019 | equations extracted — not manually read |
| Maille et al., 2021.md | Maille 2021 | equations extracted — not manually read |
| Liang et al., 2021.md | Liang 2021 | equations extracted — not manually read |
| Lee et al., 2023.md | Lee 2023 | equations extracted — not manually read |
| Grudeva et al., 2025.md | Grudeva 2025 | equations extracted — not manually read |
| Smrke et al., 2024.md | Smrke 2024 | equations extracted — not manually read |
| CO2_Degassing_Weibull.md | Smrke 2018 | equations extracted — not manually read |
| Moka_Pot_Thermo_Fluid_Model.md | Siregar 2026 / Navarini 2009 | equations extracted — not manually read |
| Immersion_Grind_Temp_BrewRatio.md | Wang & Lim 2023 | equations extracted — not manually read |
| Aroma_PTR_ToF_MS_Kinetics.md | Sánchez-López 2016 | equations extracted — not manually read |
| Caffeine_Infusion_Kinetics.md | Spiro et al. | equations extracted — not manually read |
| Caffeine_Infusion_Roasting.md | Spiro & Hunter 1985 | equations extracted — not manually read |
| Caffeine_Kinetics_Rectangular_Model.md | Espinoza-Pérez 2007 | equations extracted — not manually read |
| Kostial et al,. 2014.md | Kostial 2014 | equations extracted — not manually read |
| Uman et al., 2016.md | Uman 2016 | equations extracted — not manually read |
| Reddy et al,. 2020.md | Reddy 2020 | equations extracted — not manually read |

**Sonuç:** Hiçbir paper tam okunmamış. Tümü "equations extracted" aşamasında kalmış. Bu vault'ta bilinçli olarak belgelenmiş (00_Index: "🟡 Denklemler çıkarıldı — tam okuma yapılmadı").

---

## 3. Physics/equations/

**Konum:** `Physics/equations/`  
**Dosya sayısı:** 19 toplam = 18 equation dosyası + 1 README.md (00_Index ile uyuşuyor ✅)

### Equation dosyaları ve kaynak paper'ları

| Dosya | Kaynak Paper | Repo Modülü |
|---|---|---|
| moroney_2016_immersion_ode.md | Moroney 2016 | solvers/immersion.py |
| moroney_2015_double_porosity_pde.md | Moroney 2015 | solvers/percolation.py |
| moroney_2015_parameters.md | Moroney 2015 | solvers/percolation.py |
| maille_2021_biexponential_kinetics.md | Maille 2021 | All solvers (fast mode) |
| maille_2021_hybrid_bimodal_psd.md | Maille 2021 | utils/psd.py |
| liang_2021_equilibrium_desorption.md | Liang 2021 | utils/params.py (K=0.717) |
| lee_2023_channeling_ode.md | Lee 2023 | utils/channeling.py |
| smrke_2018_co2_bloom_biexponential.md | Smrke 2018 | utils/co2_bloom.py |
| co2_degassing_weibull.md | Smrke 2018 | utils/co2_bloom.py (long-term) |
| darcy_flow.md | Standard | solvers/percolation.py, pressure.py |
| kozeny_carman_permeability.md | Standard | solvers/percolation.py, pressure.py |
| fick_diffusion.md | Fick | solvers/percolation.py |
| grudeva_2025_pde_transport.md | Grudeva 2025 | **SKIPPED** — validated params yok |
| newton_cooling_lumped_capacitance.md | Standard | utils/output_helpers.py |
| extraction_yield.md | Standard | All solvers |
| tds_formula.md | Standard | All solvers |
| caffeine_first_order_kinetics.md | Spiro et al. | utils/output_helpers.py |
| flavor_compound_kinetics.md | Standard | utils/output_helpers.py |

---

## 4. PRD/decisions/

**Konum:** `PRD/decisions/`

### Mevcut dosyalar

| Dosya | Durum |
|---|---|
| KARAR-001_physics_model.md | ⚠️ Stale — ⚠️ uyarısı dosya içinde var |
| DECISION-002_co2_degassing_bloom.md | ⚠️ Superseded — dosya içinde belirtilmiş |
| DECISION-003_bean_density.md | ✅ Geçerli |
| DECISION-004_espresso_channeling_validation.md | ✅ Geçerli |
| DECISION-010_espresso_to_percolation.md | ✅ Geçerli |

### Eksik dosyalar

**DECISION-001 yok.** KARAR-001 Turkish dil eşdeğeri olarak davranıyor (standalone İngilizce dosyası yok).

**DECISION-005 through DECISION-009: Standalone dosyaları yok.**
Bu kararlar `PRD/architecture_spec.md` Decisions Log bölümünde sadece bullet olarak özetlenmiş:
- DECISION-005: 3 solver types + 6 method configs + AeroPress standalone
- DECISION-006: Fast/accurate as flag inside solver, not separate files
- DECISION-007: Fast = Maille 2021, Accurate = Moroney 2015/2016, shared Liang anchor
- DECISION-008: All inputs required, grinder lookup preferred with manual micron fallback
- DECISION-009: Auto-detect fast default, user toggles accurate

00_Index bunu kabul ediyor: "Note: DECISION-005 to DECISION-009 standalone dosyaları yok — architecture_spec.md'de özetlendi."

### Son DECISION numarası: DECISION-010

### Stale içerik detayı

**KARAR-001_physics_model.md:**
- Fast mode latency target: dosyada `< 100ms` yazıyor
- Gerçek hedef: `< 1ms` (architecture_spec.md §2 ve README'de)
- Dosya kendi içinde bu tutarsızlığı `⚠️ ARCHITECTURE DISCREPANCIES (updated 2026-03-28)` notu ile işaretlemiş ✅
- Durum: Stale ama self-annotated.

**DECISION-002_co2_degassing_bloom.md:**
- Orijinal karar: Fixed bloom time + Weibull CO2 correction
- Gerçek uygulama: Smrke 2018 bi-exponential kB multiplier
- Dosya kendi içinde `⚠️ SUPERSEDED` notu ile işaretlemiş ✅
- Durum: Superseded ama self-annotated.

---

## 5. PRD/architecture_spec.md

**Konum:** `D:\Programs\Obsidian\My_Coffee_App\PRD\architecture_spec.md`  
**Son güncelleme:** `2026-03-26 (DECISION-010)`

### DECISION-010 (espresso → percolation) yansıtılmış mı?

**EVET, doğru şekilde yansıtılmış.** Spec'te:

```
| solvers/percolation.py | Moroney et al. 2015 | V60, Kalita Wave, Espresso |
| solvers/pressure.py    | Moroney et al. 2016 + Siregar 2026 | Moka Pot only |
```

DECISION-010 inline notu da mevcut: "Espresso moved from pressure.py → percolation.py."

### Solver mapping güncel mi?

**EVET.** 6 method → 3 solver mapping doğru:

| Method | Solver (Spec) | Solver (Repo) | Match |
|---|---|---|---|
| french_press.py | immersion | immersion ✅ | ✅ |
| v60.py | percolation | percolation ✅ | ✅ |
| kalita.py | percolation | percolation ✅ | ✅ |
| espresso.py | percolation | percolation ✅ | ✅ |
| moka_pot.py | pressure | pressure ✅ | ✅ |
| aeropress.py | Standalone (hybrid) | immersion + pressure (hybrid) ✅ | ✅ |

### Discrepancy: `validation/` klasörü

Architecture spec directory structure şunu gösteriyor:
```
brewos-engine/
└── validation/
```

**Repo'da bu klasör yok.** `D:\Coding\Keif\brewos-engine\brewos\validation\` — mevcut değil.
Testler `tests/` altında, validation klasörü hiç oluşturulmamış.

---

## 6. Validation/

**Konum:** `BrewOS_To-Do_Before_Implementation/Validation/`

### Mevcut dosyalar

```
README.md
batali_2020_phase2_results.md
moka_pot_phase3_implementation.md
phase8_results.md
datasets/   (klasör)
test_cases/ (klasör)
```

### phase8_results.md mevcut mu?

**EVET** — `Validation/phase8_results.md` mevcut.

> **⚠️ İsim karışıklığı:** Bu "Phase 8" *implementation* Phase 8 (trash bin) değil. Pre-implementation araştırma sürecinin 8. fazını (PoC Moroney immersion ODE doğrulaması, 2026-03-25) belgeler. İki farklı numbering scheme var: vault'un kendi pre-implementation faz numaraları vs. repo implementation faz numaraları.

İçerik: EY=21.51%, TDS=1.291% PoC doğrulama, kB sign bug fix, phi_c0 hesabı, Liang scaling.

### CO2 caveat eklendi mi?

**EVET.** `phase8_results.md` sonunda:

> "Research described a three-component CO2 model with separate shelf-aging tau (days) and brew-time kinetics tau_fast/tau_slow (3-7s / 20-45s). Implementation simplified to single 15s bloom decay constant. Revisit if CO2 fidelity becomes a priority in v2."

### Eksik validation dosyaları

Vault'ta Phase 4 (extended outputs), Phase 5 (API), Phase 6 (mobile), Phase 7 (run history) için validation dosyası yok. Yalnızca Phase 2 (Batali) ve Phase 3 (moka pot) kapsanmış.

---

## 7. CHECKLIST.md

**Konum:** `BrewOS_To-Do_Before_Implementation/CHECKLIST.md`

### Phase 1–5 durumu

| Phase | Status |
|---|---|
| Phase 1 — Immersion Solver (CO2 Bloom) | ✅ Tümü işaretli |
| Phase 2 — Channeling + Batali Validation | ✅ Tümü işaretli |
| Phase 3 — Moka Pot 6-ODE Thermal Coupling | ✅ Tümü işaretli |
| Phase 4 — Extended Outputs + Grinder Presets | ✅ Tümü işaretli |
| Phase 5 — FastAPI Deployment | ✅ Tümü işaretli |

### Phase 6–9 durumu

**CHECKLIST'te Phase 6 veya Phase 7 satırları yok.**

Phase 6 (mobile app — 7 screens, Victory charts) ve Phase 7 (run history, SQLite) tamamlandı ama CHECKLIST'e hiç eklenmedi.

"Phase 9 — Pre-Implementation" başlığı var ve checked (architecture spec + GitHub repo), ancak bu vault'un kendi pre-impl fazını kastediyor.

### Pre-implementation items

Birçok pre-implementation kutusu hâlâ işaretsiz:
- Zotero setup: ❌
- Python PoC tamamlandı: ❌ (gerçekte tamamlandı — phase8_results.md var)
- Tüm competitor uygulamaları test edildi: ❌
- Minimum 6 P1 grinder JSON: ❌ (yalnızca 3 var)
- Technical environment setup: ❌

Bu kutular retroactive olarak işaretlenmedi — CHECKLIST stale kaldı.

---

## 8. Grinders/

**Konum:** `BrewOS_To-Do_Before_Implementation/Grinders/`

**Tek dosya:** `sources.md`

Vault'ta grinder JSON presetleri yok — bunlar repoda tutulmuş (`brewos/grinders/`).

`sources.md` içeriği:
- Comandante C40 MK4: Official Manual + Home-Barista sieve data (high)
- Mavo Grinder: Official Manual (high) — **repoda JSON yok**
- Timemore C2: Official Manual (high) — **repoda JSON yok**
- 1Zpresso J-Max: Official Spec Sheet (high) — repoda var ✅
- Niche Zero: Prima Coffee Review (medium) — **repoda JSON yok**
- Fellow Ode Gen 2: Fellow Official (high) — **repoda JSON yok**

Vault'un planlanan listesinde 6 grinder var; repoda yalnızca 3 tane (Comandante, 1Zpresso, Baratza Encore). Baratza Encore vault sources.md'de hiç listelenmemiş — doğrudan eklendi.

---

## 9. Cross-Check: Vault vs. Repo Uyuşmazlıkları

### ✅ Doğru ve uyuşan (önemli olanlar)

- Solver mapping (immersion/percolation/pressure → 6 method)
- DECISION-010 uygulaması: espresso.py → percolation ✅, moka_pot.py → pressure ✅
- Channeling post-processing overlay (utils/channeling.py) ✅
- CO2 bloom multiplicative modifier (utils/co2_bloom.py) ✅
- Grinder files: comandante_c40_mk4.json, 1zpresso_j-max.json, baratza_encore.json ✅
- API (brewos/api.py), FastAPI /simulate + /health ✅
- Utils: channeling.py, co2_bloom.py, output_helpers.py, params.py, psd.py — tümü var ✅

### ⚠️ Uyuşmazlıklar

**1. `validation/` klasörü eksik (architecture_spec vs. repo)**
- Spec'te: `brewos-engine/validation/` var
- Repo'da: Yok. `brewos-engine/brewos/validation/` mevcut değil.
- Testler `tests/` altında.
- **Etki:** Düşük — sadece dokümantasyon tutarsızlığı.

**2. 00_Index / CHECKLIST Phase 6–7 eksik**
- Vault: Phase 5'te dondurulmuş (2026-03-28)
- Repo: Phase 6 (mobile), Phase 7 (history) tamamlandı
- **Etki:** Orta — vault'u okuyan biri Keif'in sadece engine + API'den ibaret olduğunu düşünür; mobile app'ten habersiz kalır.

**3. KARAR-001 fast mode latency (<100ms vs. <1ms)**
- Vault: `< 100ms` (pre-impl dönemden kalma)
- Repo + architecture_spec: `< 1ms`
- Dosya kendi içinde bu tutarsızlığı işaretlemiş.
- **Etki:** Düşük — self-annotated.

**4. DECISION-002 superseded content**
- Vault: Fixed bloom time + Weibull correction approach
- Repo: Smrke 2018 bi-exponential kB modifier
- Dosya kendi içinde "SUPERSEDED" olarak işaretlemiş.
- **Etki:** Düşük — self-annotated.

**5. Grinder sources.md ile repo grinder listesi uyuşmuyor**
- Vault sources.md'de: Comandante, Mavo, Timemore, 1Zpresso, Niche, Fellow (6 grinder)
- Repo'da: Comandante, 1Zpresso, **Baratza Encore** (3 grinder)
- Baratza Encore vault'ta hiç belgelenmemiş; Mavo/Timemore/Niche/Fellow repo'da yok.
- **Etki:** Düşük — grinder database yarım kalmış, bilinçli kararla (v2'ye ertelendi).

**6. Phase 8 isim çakışması**
- Vault'ta `phase8_results.md` = pre-implementation PoC doğrulama (2026-03-25)
- Repo'da Phase 8 = run history trash bin (implementation, henüz tamamlanmamış)
- İki farklı "Phase 8" var, biri vault'ta biri repo'da.
- **Etki:** Orta — kafa karıştırıcı. Vault'u okuyan biri trash bin validation'ını aramaya başlayabilir.

---

## Genel Değerlendirme

**Vault'un ana rolü:** Pre-implementation araştırma arşivi — equations, paper notları, kararlar. Bu rol için **hâlâ geçerli ve kullanılabilir.**

**Staleness durumu:** Vault 2026-03-28'de dondurulmuş. O tarihten bu yana:
- Phase 6 (mobile) tamamlandı — vault'ta yok
- Phase 7 (run history) tamamlandı — vault'ta yok
- Phase 8 (trash bin) planlandı / kısmen scaffold — vault'ta yok

**Çelişkili veya hatalı içerik:** Yok (kritik düzeyde). Stale dosyalar self-annotated; superseded kararlar kendi içinde işaretlemiş.

**Vault'u güncellemek gerekiyor mu?** Bağlıdır:
- Vault pre-impl arşiv olarak kalmaya devam edecekse: güncelleme gerekmez, zaten amacına hizmet etti.
- Vault canlı proje dokümantasyonu olarak kullanılacaksa: 00_Index + CHECKLIST'e Phase 6–7 eklenmeli; `validation/` klasörü notu düzeltilmeli.
