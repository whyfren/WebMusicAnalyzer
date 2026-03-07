/**
 * Music Analyzer — TypeScript + Essentia.js
 * ==========================================
 * Extracts: BPM, Key/Scale, Loudness, Energy,
 *           Danceability, Spectral features, MFCCs, Onset rate
 *
 * Install:
 *   npm install essentia.js @tensorflow/tfjs node-web-audio-api
 *   npm install -D tsx typescript @types/node
 *
 * Usage:
 *   npx tsx music_analyzer.ts path/to/audio.wav
 */

import EssentiaLib, { EssentiaWASM } from "essentia.js";

// Derive the instance type from the class
type Essentia = InstanceType<typeof EssentiaLib>;
import { readFileSync, writeFileSync } from "fs";
import { AudioContext } from "node-web-audio-api";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface TempoResult {
  bpm: number;
  beatsConfidence: number;
  numBeats: number;
}

interface KeyResult {
  key: string;
  scale: string;
  strength: number;
}

interface LoudnessResult {
  loudnessDb: number;
  rms: number;
}

interface EnergyResult {
  energy: number;
  danceability: number;
}

interface SpectralResult {
  spectralCentroidMean: number;
  spectralRolloffMean: number;
  spectralFluxMean: number;
  mfccMean: number[];
}

interface OnsetResult {
  onsetRate: number;
  numOnsets: number;
}

interface AnalysisResult
  extends TempoResult,
    KeyResult,
    LoudnessResult,
    EnergyResult,
    SpectralResult,
    OnsetResult {
  file: string;
  durationSec: number;
}

// ─────────────────────────────────────────────
// 1. LOAD AUDIO → Float32Array (mono, 44100 Hz)
// ─────────────────────────────────────────────
async function loadAudio(filepath: string): Promise<Float32Array> {
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  const buffer = readFileSync(filepath);
  const decoded = await audioCtx.decodeAudioData(buffer.buffer as ArrayBuffer);

  // Downmix to mono by averaging all channels
  const mono = new Float32Array(decoded.length);
  for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
    const channel = decoded.getChannelData(ch);
    for (let i = 0; i < channel.length; i++) mono[i] += channel[i];
  }
  for (let i = 0; i < mono.length; i++) mono[i] /= decoded.numberOfChannels;

  console.log(
    `[✓] Loaded: ${filepath}  (${(decoded.duration).toFixed(2)}s @ ${decoded.sampleRate}Hz)`
  );
  return mono;
}

// ─────────────────────────────────────────────
// 2. TEMPO / BPM
// ─────────────────────────────────────────────
function analyzeTempo(essentia: Essentia, audio: Float32Array): TempoResult {
  const audioVector = essentia.arrayToVector(audio);
  const result = essentia.RhythmExtractor2013(audioVector, 208, "multifeature", 40);
  return {
    bpm: parseFloat(result.bpm.toFixed(2)),
    beatsConfidence: parseFloat(result.confidence.toFixed(3)),
    numBeats: essentia.vectorToArray(result.ticks).length,
  };
}

// ─────────────────────────────────────────────
// 3. KEY & SCALE
// ─────────────────────────────────────────────
function analyzeKey(essentia: Essentia, audio: Float32Array): KeyResult {
  const audioVector = essentia.arrayToVector(audio);
  const result = essentia.KeyExtractor(audioVector);
  return {
    key: result.key,
    scale: result.scale,
    strength: parseFloat(result.strength.toFixed(3)),
  };
}

// ─────────────────────────────────────────────
// 4. LOUDNESS
// ─────────────────────────────────────────────
function analyzeLoudness(essentia: Essentia, audio: Float32Array): LoudnessResult {
  const audioVector = essentia.arrayToVector(audio);
  const loudness = essentia.Loudness(audioVector);
  const rms = essentia.RMS(audioVector);
  return {
    loudnessDb: parseFloat(loudness.loudness.toFixed(3)),
    rms: parseFloat(rms.rms.toFixed(6)),
  };
}

// ─────────────────────────────────────────────
// 5. ENERGY & DANCEABILITY
// ─────────────────────────────────────────────
function analyzeEnergyDanceability(
  essentia: Essentia,
  audio: Float32Array
): EnergyResult {
  const audioVector = essentia.arrayToVector(audio);
  const energy = essentia.Energy(audioVector);
  const dance = essentia.Danceability(audioVector);
  return {
    energy: parseFloat(energy.energy.toFixed(6)),
    danceability: parseFloat(dance.danceability.toFixed(3)),
  };
}

// ─────────────────────────────────────────────
// 6. SPECTRAL FEATURES  (frame-level → averaged)
// ─────────────────────────────────────────────
function analyzeSpectral(essentia: Essentia, audio: Float32Array): SpectralResult {
  const FRAME_SIZE = 2048;
  const HOP_SIZE = 512;
  const NUM_MFCC = 13;

  const centroids: number[] = [];
  const rolloffs: number[] = [];
  const fluxes: number[] = [];
  const mfccFrames: number[][] = [];

  for (let start = 0; start + FRAME_SIZE <= audio.length; start += HOP_SIZE) {
    const frame = audio.slice(start, start + FRAME_SIZE);
    const frameVec = essentia.arrayToVector(frame);

    const windowed = essentia.Windowing(frameVec, true, FRAME_SIZE, 0, "hann", 0, false);
    const spec = essentia.Spectrum(windowed.frame, FRAME_SIZE);

    centroids.push(essentia.SpectralCentroidNormalized(spec.spectrum).spectralCentroid);
    rolloffs.push(essentia.RollOff(spec.spectrum).rollOff);
    fluxes.push(essentia.Flux(spec.spectrum).flux);

    const mfccResult = essentia.MFCC(
      spec.spectrum,
      -1000,
      essentia.arrayToVector(new Float32Array(40)), // unused filterbank
      NUM_MFCC,
      40,
      0,
      22050,
      FRAME_SIZE,
      "htkMel",
      0,
      22050,
      false,
      22050,
      22050,
      "magnitude",
      1,
      false,
      1,
      40,
      false,
      0
    );
    mfccFrames.push(Array.from(essentia.vectorToArray(mfccResult.mfcc)));
  }

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const mfccMean = Array.from({ length: NUM_MFCC }, (_, i) =>
    parseFloat(mean(mfccFrames.map((f) => f[i])).toFixed(4))
  );

  return {
    spectralCentroidMean: parseFloat(mean(centroids).toFixed(4)),
    spectralRolloffMean: parseFloat(mean(rolloffs).toFixed(4)),
    spectralFluxMean: parseFloat(mean(fluxes).toFixed(4)),
    mfccMean,
  };
}

// ─────────────────────────────────────────────
// 7. ONSET RATE
// ─────────────────────────────────────────────
function analyzeOnsets(essentia: Essentia, audio: Float32Array): OnsetResult {
  const audioVector = essentia.arrayToVector(audio);
  const result = essentia.OnsetRate(audioVector);
  return {
    onsetRate: parseFloat(result.onsetRate.toFixed(3)),
    numOnsets: essentia.vectorToArray(result.onsets).length,
  };
}

// ─────────────────────────────────────────────
// 8. PRINT RESULTS
// ─────────────────────────────────────────────
function printResults(results: AnalysisResult): void {
  const line = "═".repeat(50);
  console.log(`\n${line}`);
  console.log("  MUSIC ANALYSIS RESULTS");
  console.log(line);

  const entries = Object.entries(results) as [string, unknown][];
  for (const [key, value] of entries) {
    if (key === "mfccMean") {
      const arr = value as number[];
      console.log(`  ${"mfccMean".padEnd(28)} [${arr.slice(0, 4).join(", ")} ...]  (13 coeffs)`);
    } else {
      console.log(`  ${key.padEnd(28)} ${value}`);
    }
  }
  console.log(line);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  const filepath = process.argv[2];
  if (!filepath) {
    console.error("Usage: npx tsx music_analyzer.ts <audio_file>");
    process.exit(1);
  }

  // Init Essentia WASM
  const EssentiaWasmModule = await EssentiaWASM();
  const essentia = new Essentia(EssentiaWasmModule);
  console.log(`[✓] Essentia.js v${essentia.version} ready`);

  const audio = await loadAudio(filepath);
  const durationSec = parseFloat((audio.length / 44100).toFixed(2));

  const results: AnalysisResult = {
    file: filepath,
    durationSec,
    ...analyzeTempo(essentia, audio),
    ...analyzeKey(essentia, audio),
    ...analyzeLoudness(essentia, audio),
    ...analyzeEnergyDanceability(essentia, audio),
    ...analyzeSpectral(essentia, audio),
    ...analyzeOnsets(essentia, audio),
  };

  printResults(results);

  const outPath = "analysis_result.json";
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n[✓] Full results saved to ${outPath}`);
}

main().catch(console.error);