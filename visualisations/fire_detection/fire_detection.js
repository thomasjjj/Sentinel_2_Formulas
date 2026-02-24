//VERSION=3
function setup() {
  return {
    input: [
      "B01","B02","B03","B04",   // coastal, blue, green, red
      "B08","B11","B12",         // NIR, SWIR1, SWIR2
      "dataMask"
    ],
    output: { bands: 4 }
  };
}

function clamp01(x) {
  return Math.max(0.0, Math.min(1.0, x));
}

function evaluatePixel(s) {

  // --- Greyscale background (true colour -> grey)
  let grey = (0.3 * s.B04 + 0.59 * s.B03 + 0.11 * s.B02) * 2.5;
  grey = clamp01(grey);

  // --- Indices
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let nbr  = (s.B08 - s.B12) / (s.B08 + s.B12);
  let ndwi = (s.B03 - s.B08) / (s.B03 + s.B08);

  // Inverted burn score in [0,1] (higher = more burn-like)
  let burn = 1.0 - ((nbr + 1.0) / 2.0);
  burn = clamp01(burn);

  // --- Fire gates (same idea you’re using)
  let ndviMin  = 0.25;
  let ndwiMax  = 0.10;
  let swirGate = (s.B12 > 0.12) && (s.B11 > 0.10);

  let looksLikeWater = (ndwi > 0.15) && (s.B08 < 0.08);
  if (looksLikeWater) {
    return [grey, grey, grey, s.dataMask];
  }

  // Two thresholds: only "hot" draws
  let burnCandidate = 0.62;
  let burnHot       = 0.80;  // tune 0.78–0.88

  let isFireCandidate = (burn > burnCandidate) && (ndvi > ndviMin) && (ndwi < ndwiMax) && swirGate;

  // Optional: makes it even stricter for active flaming / very hot targets
  let hotSwir = (s.B12 > 0.20);

  let isFireHot = isFireCandidate && (burn > burnHot) && hotSwir;

  if (isFireHot) {
    // small orange -> yellow ramp within the hot zone
    let intensity = clamp01((burn - burnHot) / (1.0 - burnHot));
    let r = 1.0;
    let g = 0.6 + 0.4 * intensity; // 0.6..1.0
    let b = 0.0;
    return [r, g, b, s.dataMask];
  }

  // --- Smoke heuristic (blue/cyan)
  // Idea:
  //  - smoke/haze tends to brighten B01/B02/B03
  //  - but is typically LESS bright in SWIR than cloud
  //  - avoid vegetation (NDVI low-ish) and avoid very bright "cloud-white" pixels
  //
  // Tunable thresholds:
  let visBright   = (s.B02 > 0.18) && (s.B03 > 0.16);  // visible brightness
  let coastalBoost = (s.B01 > 0.16);                   // aerosol/coastal often elevated in haze/smoke
  let lowVeg      = (ndvi < 0.35);                     // smoke often sits over mixed land; avoids pure healthy vegetation
  let swirNotCloud = (s.B11 < 0.20) && (s.B12 < 0.18); // clouds tend to be bright in SWIR too
  let notWhiteCloud = (s.B02 < 0.55) && (s.B03 < 0.55) && (s.B04 < 0.55); // avoid thick cloud

  // Optional: require a "bluish" signature (smoke often boosts blue relative to red)
  let bluish = (s.B02 > s.B04 * 1.05);

  let isSmoke = visBright && coastalBoost && lowVeg && swirNotCloud && notWhiteCloud && bluish;

  if (isSmoke) {
    // Intensity based on visible brightness vs SWIR
    let vis = (s.B01 + s.B02 + s.B03) / 3.0;
    let swir = (s.B11 + s.B12) / 2.0;

    // Higher when visible is high but SWIR is low
    let smokeScore = clamp01((vis - swir) * 3.0);

    // Blue -> cyan ramp
    let r = 0.0;
    let g = 0.3 + 0.7 * smokeScore;  // 0.3..1.0
    let b = 1.0;

    return [r, g, b, s.dataMask];
  }

  // Default: greyscale
  return [grey, grey, grey, s.dataMask];
}
