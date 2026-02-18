# Copernicus Custom Visualisations

This repository contains a working list of Copernicus / Sentinel Hub custom visualisations I have been developing for OSINT and geospatial analysis.

## fire_detection.js

### Overview

`fire_detection.js` is a Sentinel-2 custom visualisation that highlights likely active fire and strong burn signatures in a single acquisition.

The output is:

- Fire pixels shown as an orange-to-yellow ramp (yellow = strongest signal)
- A greyscale background for contextual interpretation

This script is intended for rapid visual assessment of fire-related events (e.g., urban fires, industrial fires, wildland fires) using Sentinel-2 imagery.

### Example Outputs

Mariupol (2022)

<img width="994" height="522" alt="image" src="https://github.com/user-attachments/assets/87f02d4f-830f-4ade-83d0-259f628718a1" />

Hostomel, Kyiv Oblast (February 2022)

<img width="1072" height="631" alt="image" src="https://github.com/user-attachments/assets/13951d10-d7dd-43a1-a56f-c16783933722" />

### Method

The visualisation is based on the Normalized Burn Ratio (NBR):

\[
NBR = \frac{B08 - B12}{B08 + B12}
\]

NBR is normalised and inverted to produce a burn score in the range \[0, 1\], where higher values indicate more burn-like spectral behaviour.

To reduce false positives, the script applies a set of gates before rendering fire pixels:

- NDVI gate (requires some vegetation context)
- NDWI gate and water exclusion
- SWIR brightness gate (requires elevated SWIR response)
- Two thresholds:
  - a candidate threshold
  - a stricter “hot” threshold (only hot pixels are rendered)

Only pixels that pass the full set of gates are rendered in colour; all other pixels are displayed in greyscale.

### Sentinel-2 Bands Used

| Band | Description | Role |
|------|------------|------|
| B02  | Blue (10 m) | Greyscale background |
| B03  | Green (10 m) | Greyscale background, NDWI |
| B04  | Red (10 m) | Greyscale background, NDVI |
| B08  | NIR (10 m) | NDVI, NBR |
| B11  | SWIR1 (20 m) | SWIR gate |
| B12  | SWIR2 (20 m) | NBR, SWIR gate |

### Parameters You Can Tune

Key thresholds inside the script:

- `ndviMin` (vegetation gate)
- `ndwiMax` and `looksLikeWater` (water / wet surface suppression)
- `burnCandidate` (broad candidate threshold)
- `burnHot` (strict threshold; only these are rendered)
- `hotSwir` (optional strict SWIR gate)

To reduce false positives:
- Increase `burnHot`
- Increase `ndviMin`
- Tighten SWIR gates (`B11`, `B12` thresholds)

To increase sensitivity:
- Decrease `burnHot`
- Reduce `ndviMin`
- Relax SWIR gates

### Limitations

- Sentinel-2 has no thermal band; this is a SWIR/NIR-based proxy, not a temperature measurement.
- Small fires may not be detectable at 10–20 m resolution.
- Some non-fire surfaces (e.g., bare soil, dark rooftops, industrial materials) can
