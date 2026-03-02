# Try-On Modelio Tyrimas ir Rekomendacijos

**Data**: 2026-03-01
**Statusas**: Dabartinis modelis tinkamas, keitimas nereikalingas

---

## Dabartine implementacija

- **Modelis**: `fal-ai/fashn/tryon/v1.6` (sinchroninis `fal.run` endpoint)
- **Kaina**: $0.075 / paveiksleklis
- **Rezoliucija**: 864x1296
- **Greitis**: <5 sek
- **Failai**: `supabase/functions/generate-image/index.ts` (eil. 305-320), `src/services/generationService.ts`
- **Kreditu kaina**: 3 kreditai per generavima
- **Zinoma problema**: Sinchroninis `fal.run` gali timeout'inti (150s Supabase edge fn limitas) su didesnemis nuotraukomis

---

## Rinkos palyginimas

| Tiekejas | Modelis | Kaina/img | Greitis | Komercine licencija | Kokybe |
|----------|---------|-----------|---------|---------------------|--------|
| **fal.ai** | FASHN v1.6 (dabartinis) | $0.075 | <5s | Yes | 4/5 |
| **fal.ai** | Kling Kolors Try-On | $0.07 | kintamas | Yes | 4/5 |
| **fal.ai** | CatVTON | MP billing | ~11s | No (NC-SA) | 5/5 |
| **Segmind** | IDM-VTON | $0.04 | ~26s | Research only | 5/5 |
| **Segmind** | Try-On Diffusion (SegFit) | $0.01 | greitas | Yes | 3/5 |
| **Replicate** | FLUX Try-On | $0.022 | 30-45s | Yes | 3/5 |
| **PiAPI** | Kling Kolors | $0.07 | kintamas | Yes | 4/5 |
| **Pixelcut** | Try-On API | ~$0.08-0.17 | greitas | Yes | 3/5 |
| **Google** | Vertex AI Try-On | enterprise | kintamas | Yes | 4/5 |
| **HuggingFace** | IDM-VTON/Kolors (spaces) | $0 | letas | misri | 4/5 |

---

## Isvados

### 1. Dabartinis FASHN v1.6 yra geras pasirinkimas
- Greiciausias komercinis sprendimas (<5s)
- Auksta kokybe (864x1296)
- Automatinis drabuzio tipo atpazinimas
- Komercine licencija
- Jau integruotas ir veikia

### 2. Keisti modeli dabar NEVERTA
- FASHN v1.6 yra vienas geriausia komercinia try-on modeliu
- Perejimas prie kito modelio reikalautu edge function perrasymo, testavimo, ir rizikos
- Kokybes skirtumas tarp top modeliu yra minimalus

### 3. Galimos optimizacijos ATEICIAI (be modelio keitimo)

| Optimizacija | Nauda |
|-------------|-------|
| Queue API fix | Leistu asinchronini generavima, isvengtumem 150s timeout |
| Segmind IDM-VTON backup | Fallback modelis jei FASHN nepasiekiamas ($0.04/img) |
| Try-On Diffusion (Segmind) | 7.5x pigiau ($0.01 vs $0.075) - verta testuoti kokybe |

### 4. Kada VERTA keisti modeli
- Jei FASHN v1.6 kokybe netenkina konkrečiais use case'ais
- Jei kainos tampa per dideles (>1000 generavimu/men -> $75 vs $10 su Segmind)
- Jei atsiras naujas modelis su aiskiai geresne kokybe

---

## Rekomenduojamas veiksmas

**Trumpalaikis**: Nieko nekeisti. FASHN v1.6 yra tinkamas.

**Vidutinis terminas** (kai bus daugiau vartotoju):
1. Istestuoti Segmind Try-On Diffusion ($0.01/img) kokybe
2. Implementuoti queue-based generavima (isvengti timeout problemu)
3. Prideti fallback modeli (IDM-VTON per Segmind) jei FASHN neveikia

---

## Saltiniai
- FASHN AI Blog - Model Comparison: https://fashn.ai/blog/comparing-the-top-4-open-source-virtual-try-on-viton-models
- fal.ai FASHN v1.6: https://fal.ai/models/fal-ai/fashn/tryon/v1.6
- Segmind IDM-VTON: https://www.segmind.com/models/idm-vton
- Segmind Try-On Diffusion: https://www.segmind.com/models/try-on-diffusion
- CLAID 2026 Virtual Try-On Guide: https://claid.ai/blog/article/virtual-try-on-tools
