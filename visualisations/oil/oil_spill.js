//VERSION=3

/*
 * These reproduce the useful Browser appearance:
 * black background with strongly coloured oil anomalies.
 */
var EFFECT_GAIN = 2.4;
var EFFECT_GAMMA = 10.0;

/*
 * Classification controls.
 *
 * Increase these to highlight fewer pixels.
 * Decrease them to highlight more pixels.
 */
var MIN_SIGNAL = 1;
var MIN_CHROMA = 0.99;
var MIN_SATURATION = 0.99;

/*
 * Background brightness.
 *
 * Increase this if the monochrome background is too dark.
 */
var BACKGROUND_GAIN = 6.0;

function setup() {
  return {
    input: [{
      bands: [
        "B02",
        "B03",
        "B04",
        "B05",
        "B06",
        "B07",
        "B08",
        "B11",
        "B12",
        "dataMask"
      ],
      units: "REFLECTANCE"
    }],
    output: {
      bands: 4,
      sampleType: "AUTO"
    }
  };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function safeDivide(numerator, denominator) {
  return numerator / Math.max(denominator, 0.000001);
}

/*
 * Approximate the strong gain/gamma stretch that revealed
 * the rainbow-coloured oil features in the Browser.
 */
function enhance(value) {
  value = clamp(value, 0, 1);

  return clamp(
    EFFECT_GAIN * Math.pow(value, EFFECT_GAMMA),
    0,
    1
  );
}

function evaluatePixel(sample) {
  if (sample.dataMask === 0) {
    return [0, 0, 0, 0];
  }

  /*
   * Original RGB visualisation A from the OSI custom script:
   *
   * R = (B05 + B06) / B07
   * G = (B03 + B04) / B02
   * B = (B11 + B12) / B08
   */
  var rawRed =
    safeDivide(sample.B05 + sample.B06, sample.B07) / 3;

  var rawGreen =
    safeDivide(sample.B03 + sample.B04, sample.B02) / 3;

  var rawBlue =
    safeDivide(sample.B11 + sample.B12, sample.B08) / 3;

  /*
   * Apply the strong contrast transformation separately
   * to each channel.
   */
  var red = enhance(rawRed);
  var green = enhance(rawGreen);
  var blue = enhance(rawBlue);

  /*
   * Measure colour divergence.
   *
   * Ordinary dark water should have very little signal.
   * Rainbow oil pixels should have a stronger maximum channel
   * and a larger difference between their channels.
   */
  var maximumChannel =
    Math.max(red, green, blue);

  var minimumChannel =
    Math.min(red, green, blue);

  var chroma =
    maximumChannel - minimumChannel;

  var saturation =
    maximumChannel > 0.000001
      ? chroma / maximumChannel
      : 0;

  /*
   * Colourful pixels created by the enhanced ratio composite
   * are treated as candidate oil.
   */
  var isOilCandidate =
    maximumChannel >= MIN_SIGNAL &&
    chroma >= MIN_CHROMA &&
    saturation >= MIN_SATURATION;

  if (isOilCandidate) {
    return [1, 1, 0, sample.dataMask];
  }

  /*
   * Convert everything else to monochrome.
   */
  var gray =
    (0.299 * red) +
    (0.587 * green) +
    (0.114 * blue);

  gray = clamp(
    gray * BACKGROUND_GAIN,
    0,
    1
  );

  return [
    gray,
    gray,
    gray,
    sample.dataMask
  ];
}