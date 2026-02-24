# Copernicus Custom Visualisations

This repository contains Sentinel Hub evalscripts for Copernicus Sentinel-2 imagery, focused on rapid OSINT and geospatial interpretation.

## Contents

- `fire_detection.js`: Fire and smoke highlighting over a greyscale contextual background.

## `fire_detection.js`

### Overview

`fire_detection.js` is a Sentinel-2 custom visualisation that highlights:

- Potential active fire / hot burn signatures in orange to yellow
- Potential smoke / haze signatures in blue to cyan
- All other pixels in greyscale for context

It is designed for quick visual triage of events such as wildfires, urban fires, and industrial incidents.

### Outputs

- Fire pixels: orange to yellow ramp (yellow = stronger hot-fire confidence)
- Smoke pixels: blue to cyan ramp (cyan = stronger smoke confidence)
- Background: greyscale

RGBA output is used (`output: { bands: 4 }`), with alpha taken from `dataMask`.

### Method Summary

The script combines spectral indices and threshold gates:

- **NBR** (Normalized Burn Ratio): `(B08 - B12) / (B08 + B12)`
- Inverted burn score: `burn = 1 - ((nbr + 1) / 2)` (clamped to `[0, 1]`)
- **NDVI** vegetation gate
- **NDWI** water/wetness suppression
- SWIR brightness gates (`B11`, `B12`)
- Additional strict hot-fire threshold
- Separate smoke heuristic based on visible/coastal brightness vs SWIR

### Fire Detection Logic

A pixel becomes a fire candidate when all of the following pass:

- `burn > burnCandidate` (default `0.62`)
- `ndvi > ndviMin` (default `0.25`)
- `ndwi < ndwiMax` (default `0.10`)
- `B12 > 0.12` and `B11 > 0.10`
- Not classified as likely water

A candidate is rendered as fire only if it is also "hot":

- `burn > burnHot` (default `0.80`)
- `B12 > 0.20` (`hotSwir`)

Fire color ramps from orange to yellow as burn intensity rises above `burnHot`.

### Smoke Heuristic

A pixel is rendered as smoke when these conditions pass:

- Visible brightness gate (`B02`, `B03`)
- Coastal boost (`B01`)
- Lower vegetation (`ndvi < 0.35`)
- SWIR not cloud-like (`B11`, `B12` below limits)
- Not thick white cloud (`B02`, `B03`, `B04` below limits)
- Blue-ish signature (`B02 > B04 * 1.05`)

Smoke intensity is based on:

- `smokeScore = clamp01((vis - swir) * 3.0)`
- `vis = mean(B01, B02, B03)`
- `swir = mean(B11, B12)`

Color ramps from blue to cyan with higher `smokeScore`.

### Sentinel-2 Bands Used

| Band | Description | Role |
|------|-------------|------|
| B01 | Coastal aerosol (60 m) | Smoke / haze heuristic |
| B02 | Blue (10 m) | Greyscale + smoke heuristic |
| B03 | Green (10 m) | Greyscale, NDWI, smoke heuristic |
| B04 | Red (10 m) | Greyscale, NDVI, smoke heuristic |
| B08 | NIR (10 m) | NDVI, NDWI, NBR |
| B11 | SWIR1 (20 m) | Fire and smoke gates |
| B12 | SWIR2 (20 m) | NBR, fire and smoke gates |
| dataMask | Valid data mask | Alpha output channel |

### Tuning Guide

To reduce fire false positives:

- Increase `burnHot`
- Increase `ndviMin`
- Tighten SWIR gates (`B11`, `B12`)

To increase fire sensitivity:

- Decrease `burnHot`
- Lower `ndviMin`
- Relax SWIR gates

To reduce smoke false positives (cloud/haze confusion):

- Increase visible thresholds (`B02`, `B03`)
- Lower SWIR limits (`B11`, `B12`)
- Tighten blue signature rule (`B02 > B04 * factor`)

### Limitations

- Sentinel-2 has no thermal band; this is a spectral proxy, not direct temperature.
- 10-20 m resolution can miss small or short-lived fires.
- Bright bare soils, roofs, industrial surfaces, and some burn scars may still trigger false positives.
- Smoke and thin cloud can overlap spectrally; heuristic performance varies by scene and atmosphere.
- Thresholds may require local/seasonal retuning.

### How To Use In Sentinel Hub

1. Open Sentinel Hub EO Browser (or Copernicus Browser custom script panel).
2. Select Sentinel-2 L2A imagery.
3. Paste the contents of `fire_detection.js` into the custom script editor.
4. Adjust thresholds in `evaluatePixel()` as needed for your AOI and season.
5. Compare multiple dates to confirm event persistence and reduce one-off false detections.

### Example Outputs

Mariupol (2022)

<img width="994" height="522" alt="Mariupol fire detection example" src="https://github.com/user-attachments/assets/87f02d4f-830f-4ade-83d0-259f628718a1" />

Hostomel, Kyiv Oblast (February 2022)

<img width="1072" height="631" alt="Hostomel fire detection example" src="https://github.com/user-attachments/assets/13951d10-d7dd-43a1-a56f-c16783933722" />
