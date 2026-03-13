// // import essentia from cdn in index.html and access via window. why? becase i can't get the WASM to load properly when imported directly in a module, even with Vite's optimizeDeps.exclude. this way we can ensure the global variables are set up correctly by the time we need them.
// const Essentia = (window as any).__Essentia;
// const EssentiaWASM = (window as any).__EssentiaWASM;

// export interface AudioAnalysisResult {
//   // Rhythm
//   bpm: number;
//   bpmConfidence: number;
//   danceability: number;

//   // Tonal
//   key: string;
//   scale: "major" | "minor";
//   keyStrength: number;
//   tuningFrequency: number;

//   // Loudness & Dynamics
//   loudness: number; // LUFS
//   dynamicComplexity: number;

//   // Timbre / Spectral
//   spectralCentroid: number;
//   spectralRolloff: number;
//   zeroCrossingRate: number;
//   mfcc: number[]; // 13 coefficients

//   // High-level descriptors
//   energy: number; // 0–1
//   valence: number; // 0–1 (approximated from brightness + key mode)
// }

// const KEY_LABELS = [
//   "C",
//   "C#",
//   "D",
//   "D#",
//   "E",
//   "F",
//   "F#",
//   "G",
//   "G#",
//   "A",
//   "A#",
//   "B",
// ];

// export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
//   const buffer = await file.arrayBuffer();
//   console.log(buffer);

//   // ── 1. Decode audio ───────────────────────────────────────────────────────
//   const audioCtx = new AudioContext({ sampleRate: 44100 });
//   const audioBuffer = await audioCtx.decodeAudioData(buffer);
//   await audioCtx.close();

//   // Downmix to mono Float32Array
//   const numChannels = audioBuffer.numberOfChannels;
//   const length = audioBuffer.length;
//   const mono = new Float32Array(length);

//   for (let ch = 0; ch < numChannels; ch++) {
//     const channelData = audioBuffer.getChannelData(ch);
//     for (let i = 0; i < length; i++) {
//       mono[i] += channelData[i] / numChannels;
//     }
//   }

//   const sampleRate = audioBuffer.sampleRate;

//   // ── 2. Bootstrap Essentia WASM ────────────────────────────────────────────
//   const wasmModule = await EssentiaWASM();
//   const essentia = new Essentia(wasmModule);

//   // Helper: JS array → Essentia VectorFloat
//   const toVector = (arr: Float32Array | number[]) =>
//     essentia.arrayToVector(arr instanceof Float32Array ? arr : Float32Array.from(arr));

//   const signal = toVector(mono);

//   // ── 3. Rhythm – BPM & Danceability ───────────────────────────────────────
//   const rhythmExtractor = essentia.RhythmExtractor2013(signal, sampleRate);
//   const bpm: number = rhythmExtractor.bpm;
//   const bpmConfidence: number = rhythmExtractor.confidence;

//   const danceabilityResult = essentia.Danceability(signal, sampleRate);
//   const danceability: number = danceabilityResult.danceability;

//   // ── 4. Key & Tonal ────────────────────────────────────────────────────────
//   // Compute HPCP (Harmonic Pitch Class Profile) then Key
//   const frameSize = 4096;
//   const hopSize = 2048;

//   // Collect HPCP frames for key detection
//   const hpcpFrames: number[][] = [];
//   for (let start = 0; start + frameSize <= mono.length; start += hopSize) {
//     const frame = toVector(mono.slice(start, start + frameSize));
//     const windowed = essentia.Windowing(frame, true, 0, "hann", frameSize).frame;
//     const spectrum = essentia.Spectrum(windowed, frameSize).spectrum;
//     const { frequencies, magnitudes } = essentia.SpectralPeaks(
//       spectrum,
//       sampleRate / 2,
//       100,
//       sampleRate,
//       "magnitude",
//       frameSize / 2 + 1,
//       0
//     );
//     const hpcp = essentia.HPCP(frequencies, magnitudes, 12, 500, false, 0, sampleRate, false, 40, 5000).hpcp;
//     hpcpFrames.push(Array.from(essentia.vectorToArray(hpcp)));
//   }

//   // Average HPCP across frames
//   const avgHpcp = new Float32Array(12).fill(0);
//   for (const frame of hpcpFrames) {
//     frame.forEach((v, i) => (avgHpcp[i] += v));
//   }
//   avgHpcp.forEach((_, i) => (avgHpcp[i] /= hpcpFrames.length));

//   const keyResult = essentia.Key(toVector(avgHpcp), "temperley", false, 4);
//   const keyIndex: number = KEY_LABELS.indexOf(keyResult.key);
//   const key: string = KEY_LABELS[keyIndex] ?? keyResult.key;
//   const scale = keyResult.scale as "major" | "minor";
//   const keyStrength: number = keyResult.strength;

//   const tuningResult = essentia.TuningFrequency(signal);
//   const tuningFrequency: number = tuningResult.tuningFrequency;

//   // ── 5. Loudness & Dynamics ────────────────────────────────────────────────
//   const loudnessResult = essentia.LoudnessEBUR128(
//     toVector(audioBuffer.getChannelData(0)),
//     numChannels > 1 ? toVector(audioBuffer.getChannelData(1)) : toVector(audioBuffer.getChannelData(0)),
//     sampleRate
//   );
//   const loudness: number = loudnessResult.integratedLoudness;

//   const dynResult = essentia.DynamicComplexity(signal, sampleRate);
//   const dynamicComplexity: number = dynResult.dynamicComplexity;

//   // ── 6. Spectral Features (frame-averaged) ─────────────────────────────────
//   let spectralCentroidAcc = 0;
//   let spectralRolloffAcc = 0;
//   let zeroCrossingRateAcc = 0;
//   const mfccAcc = new Float32Array(13).fill(0);
//   let frameCount = 0;

//   for (let start = 0; start + frameSize <= mono.length; start += hopSize) {
//     const frame = toVector(mono.slice(start, start + frameSize));

//     const windowed = essentia.Windowing(frame, true, 0, "hann", frameSize).frame;
//     const spectrum = essentia.Spectrum(windowed, frameSize).spectrum;

//     spectralCentroidAcc += essentia.SpectralCentroidTime(frame).centroid;
//     spectralRolloffAcc += essentia.RollOff(spectrum, 0.85, sampleRate).rollOff;
//     zeroCrossingRateAcc += essentia.ZeroCrossingRate(frame).zeroCrossingRate;

//     const mfccResult = essentia.MFCC(
//       spectrum,
//       40,
//       -1000,
//       0,
//       sampleRate,
//       "htkMel",
//       13,
//       20,
//       sampleRate / 2,
//       "ssebrekke",
//       "shift",
//       "unit_sum"
//     );
//     const mfccFrame = essentia.vectorToArray(mfccResult.mfcc);
//     mfccFrame.forEach((v: number, i: number) => (mfccAcc[i] += v));

//     frameCount++;
//   }

//   const spectralCentroid: number = spectralCentroidAcc / frameCount;
//   const spectralRolloff: number = spectralRolloffAcc / frameCount;
//   const zeroCrossingRate: number = zeroCrossingRateAcc / frameCount;
//   const mfcc: number[] = Array.from(mfccAcc).map((v) => v / frameCount);

//   // ── 7. High-level descriptors ─────────────────────────────────────────────
//   // Energy: RMS-based 0–1
//   let sumSq = 0;
//   for (let i = 0; i < mono.length; i++) sumSq += mono[i] * mono[i];
//   const rms = Math.sqrt(sumSq / mono.length);
//   const energy: number = Math.min(1, rms * 10); // normalise heuristically

//   // Valence: brightness (spectral centroid normalised) + major key bonus
//   const maxCentroid = sampleRate / 2;
//   const brightness = Math.min(1, spectralCentroid / maxCentroid);
//   const modeBonus = scale === "major" ? 0.15 : 0;
//   const valence: number = Math.min(1, Math.max(0, brightness * 0.7 + energy * 0.15 + modeBonus));

//   // ── 8. Cleanup & return ───────────────────────────────────────────────────
//   essentia.delete();

//   return {
//     bpm,
//     bpmConfidence,
//     danceability,
//     key,
//     scale,
//     keyStrength,
//     tuningFrequency,
//     loudness,
//     dynamicComplexity,
//     spectralCentroid,
//     spectralRolloff,
//     zeroCrossingRate,
//     mfcc,
//     energy,
//     valence,
//   };
// }