// // analysisWorker.js
// // Web Worker for audio analysis using Essentia.js (WASM)
// // Analyzes: BPM, Key — runs off the main thread to keep UI responsive

// import EssentiaLib, { EssentiaWASM } from "essentia.js";

// // Derive the instance type from the class
// type Essentia = InstanceType<typeof EssentiaLib>;
// import { readFileSync, writeFileSync } from "fs";
// import { AudioContext } from "node-web-audio-api";

// var EssentiaWASM = Module;
// var essentia = null;

// // Initialize Essentia once
// function initEssentia() {
//   if (!essentia) {
//     essentia = new EssentiaWASM.EssentiaJS(false);
//     essentia.arrayToVector = EssentiaWASM.arrayToVector;
//   }
// }

// onmessage = function listenToMainThread(msg) {
//   try {
//     initEssentia();

//     const { audioSignal, analyzeKey, analyzeBPM } = msg.data;

//     if (!audioSignal || audioSignal.length === 0) {
//       postMessage({ feature: 'error', value: 'No audio signal received.' });
//       return;
//     }

//     var vectorSignal = essentia.arrayToVector(audioSignal);

//     // --- BPM Analysis ---
//     if (analyzeBPM) {
//       try {
//         var bpm = essentia.PercivalBpmEstimator(
//           vectorSignal,
//           1024,   // frameSize
//           2048,   // hopSize
//           128,    // maxBPM
//           128,    // minBPM (Essentia uses 50 internally as floor)
//           210,    // maxBPM ceiling
//           50,     // minBPM floor
//           16000   // sampleRate
//         ).bpm;

//         postMessage({ feature: 'bpm', value: Math.round(bpm) });
//       } catch (e) {
//         postMessage({ feature: 'error', value: 'BPM analysis failed: ' + e.message });
//       }
//     }

//     // --- Key Analysis ---
//     if (analyzeKey) {
//       try {
//         var keyResult = essentia.KeyExtractor(
//           vectorSignal,
//           true,     // averageDetuningCorrection
//           4096,     // frameSize
//           4096,     // hopSize
//           12,       // numHarmonics
//           3500,     // hpcpSize (max frequency)
//           60,       // hpcpSize (min frequency)
//           25,       // spectralPeaksThreshold
//           0.2,      // tuningFrequencyPreset
//           'bgate',  // profileType
//           16000,    // sampleRate
//           0.0001,   // spectralWhitening
//           440,      // tuningFrequency
//           'cosine', // windowType
//           'hann'    // windowType for HPCP
//         );

//         postMessage({
//           feature: 'key',
//           value: {
//             key: keyResult.key,         // e.g. "C"
//             scale: keyResult.scale,     // e.g. "major" or "minor"
//             strength: keyResult.strength // confidence 0–1
//           }
//         });
//       } catch (e) {
//         postMessage({ feature: 'error', value: 'Key analysis failed: ' + e.message });
//       }
//     }

//     // Signal that analysis is complete
//     postMessage({ feature: 'done' });

//   } catch (e) {
//     postMessage({ feature: 'error', value: 'Worker error: ' + e.message });
//   }
// };