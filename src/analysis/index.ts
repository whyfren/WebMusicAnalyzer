// import essentia from cdn in index.html and access via window. why? becase i can't get the WASM to load properly when imported directly in a module, even with Vite's optimizeDeps.exclude. this way we can ensure the global variables are set up correctly by the time we need them.
const Essentia = (window as any).__Essentia;
const EssentiaWASM = (window as any).__EssentiaWASM;

export interface AudioAnalysisResult {
  // Rhythm
  bpm: number;
  // Tonal
  key: string; 
}
// musical key, iykyk
const KEY_LABELS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  const buffer = await file.arrayBuffer();
  console.log(buffer);

  // ── 1. Decode audio ───────────────────────────────────────────────────────
  const audioCtx = new AudioContext({ sampleRate: 44100 });
  const audioBuffer = await audioCtx.decodeAudioData(buffer);
  await audioCtx.close();

  // this isnt working
  var essentia = new EssentiaWASM.EssentiaJS(false);
  essentia.arrayToVector = EssentiaWASM.arrayToVector;
  var vectorSignal = essentia.arrayToVector(audioBuffer.getChannelData(0));

  var key = essentia.KeyExtractor(vectorSignal, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'bgate', 16000, 0.0001, 440, 'cosine', 'hann');

  var bpm = essentia.PercivalBpmEstimator(vectorSignal, 1024, 2048, 128, 128, 210, 50, 16000).bpm;
  // ── 8. Cleanup & return ───────────────────────────────────────────────────
  essentia.delete();

  var bpmConfidence = bpm > 0 ? 0.9 : 0.2; // Placeholder confidence
  var danceability = Math.min(1, bpm / 180); // Simple heuristic
  var scale = "major"
  var keyStrength = key.strength;
  var tuningFrequency = key.tuningFrequency;
  var loudness = -20; // Placeholder
  var dynamicComplexity = 0.5; // Placeholder
  var spectralCentroid = 3000;

  return {
    bpm,
    key,
  };
}