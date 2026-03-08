// analyze.js
// const { EssentiaWASM } = require('./modules/essentia-wasm.module.js'); 
import EssentiaWASM from './modules/essentia-wasm.module.js';

async function analyzeAudio(audioSignal, options = { analyzeKey: true, analyzeBPM: true }) {
  // Initialize Essentia WASM module
  const module = await EssentiaWASM();
  const essentia = new module.EssentiaJS(false);
  essentia.arrayToVector = module.arrayToVector;

  const vectorSignal = essentia.arrayToVector(audioSignal);
  const results = {};

  if (options.analyzeKey) {
    const key = essentia.KeyExtractor(
      vectorSignal,
      true, 4096, 4096, 12, 3500, 60, 25, 0.2,
      'bgate', 16000, 0.0001, 440, 'cosine', 'hann'
    );
    results.key = key;
  }

  if (options.analyzeBPM) {
    const bpm = essentia.PercivalBpmEstimator(
      vectorSignal,
      1024, 2048, 128, 128, 210, 50, 16000
    ).bpm;
    results.bpm = bpm;
  }

  return results;
}

// --- Example usage ---
// You need a Float32Array of audio samples at 16000 Hz sample rate
// You can decode an audio file using a library like 'web-audio-api' or 'audio-decode'

const audioDecode = require('audio-decode'); // npm install audio-decode
const fs = require('fs');
      
async function main() {
  // Load and decode your audio file to raw PCM samples
  const fileBuffer = fs.readFileSync('src\assets\Hindia - the world is ending all over again.mp3');
  const audioBuffer = await audioDecode(fileBuffer);

  // Essentia expects mono Float32Array at 16000 Hz
  // audioBuffer.getChannelData(0) gives the first channel
  const audioSignal = audioBuffer.getChannelData(0);

  const results = await analyzeAudio(audioSignal, {
    analyzeKey: true,
    analyzeBPM: true
  });

  console.log('Key:', results.key);
  console.log('BPM:', results.bpm);
}

main().catch(console.error);