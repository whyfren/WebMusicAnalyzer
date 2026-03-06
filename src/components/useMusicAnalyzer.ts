// src/components/useMusicAnalyzer.ts
import Essentia from "essentia.js";
import EssentiaWASM from "essentia.js/dist/essentia-wasm.module.js";

// declare module 'essentia.js';
const essentia = new Essentia(EssentiaWASM);

export async function analyzeMusicFile(file: File) {
  const ctx = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  const audioData = audioBuffer.getChannelData(0); // mono
  const vectorSignal = essentia.arrayToVector(audioData);
  return { vectorSignal };
}

analyzeMusicFile(new File([], "dummy.mp3src\assets\Hindia - the world is ending all over again.mp3"))
    .then((vectorSignal) => {
        console.log("Success:", vectorSignal); // Output: Success: Data successfully fetched!
        return { vectorSignal };
    }, (error) => {
        console.error("Error:", error);
    });

const bpm = essentia.PercivalBpmEstimator(
  vectorSignal,
  1024,
  2048,
  128,
  128,
  210,
  50,
  16000
).bpm;

console.log("BPM:", bpm);

const key = essentia.Key(
    vectorSignal,
    true,
    1024,
    2048, 
    12,
    3500,
    60,
    25,
    0.2,
    "bgate",
    16000,
    0.0001,
    440,
    "cosine",
    "hann"
);

console.log("Key:", key.key);
console.log("Scale:", key.scale);