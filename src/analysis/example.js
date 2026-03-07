
import { EssentiaWASM } from "./essentia.js-wasm.js";
import { EssentiaTFInputExtractor, TensorflowMusicNN } from "./essentia.js-model.js";
import * as tf from "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs";

// URL to a mono audio file
const audioURL = "https://freesound.org/data/previews/328/328857_230356-1q.mp3"; // Web Audio API AudioContext
const audioContext = new AudioContext();
// Create a essentia feature extractor for the "musicnn" model
const extractor = new EssentiaTFInputExtractor (EssentiaWASM, "musicnn");
// Load a mono audio file as a AudioBuffer from a given URL using Web Audio API 
const audioBuffer = await extractor.getAudioBufferFromURL(audioURL, audioContext);
// Downsample audio to 16KHz
const audioData = extractor.downsampleAudioBuffer(audioBuffer);
// Feature input extraction for the confirgured model
let featureInput = extractor.computeFramewise(audioData, 256); // hopSize
// Path to the model weights. Can be also a CDN url.
const modelPath = "file://./autotagging/msd/msd-musicnn-1/model.json"
// Create an instance of MusiCNN tf model
const musicNN = new TensorflowMusicNN(tf, modelPath);
// Promise for loading the model
await musicNN.initialize();
// Run inference for the given feature input
let predictions = await musicNN.predict(featureInput, true);
// Print the predictions to the console
console.log(predictions);
