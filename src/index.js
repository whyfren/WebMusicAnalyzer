// ─────────────────────────────────────────────
// TRACKREAD — Pure browser audio analysis
// Uses: Web Audio API, custom DSP (no external libs needed for prototype)
// ─────────────────────────────────────────────

const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const fileBar = document.getElementById('fileBar');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const analyzeBtn = document.getElementById('analyzeBtn');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressPct = document.getElementById('progressPct');
const results = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');

let audioFile = null;

// ── File Handling ──────────────────────────────
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

function handleFile(f) {
  audioFile = f;
  fileName.textContent = f.name;
  fileSize.textContent = (f.size / 1024 / 1024).toFixed(2) + ' MB';
  fileBar.classList.add('show');
  analyzeBtn.classList.add('show');
  results.classList.remove('show');
  errorMsg.classList.remove('show');
}

analyzeBtn.addEventListener('click', () => {
  if (!audioFile) return;
  runAnalysis(audioFile);
});

// ── Progress Helper ────────────────────────────
function setProgress(pct, label, step) {
  progressFill.style.width = pct + '%';
  progressLabel.textContent = label;
  progressPct.textContent = pct + '%';
  ['step1','step2','step3','step4'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.className = 'step';
    if (i + 1 < step) el.classList.add('done');
    else if (i + 1 === step) el.classList.add('active');
  });
}

function showError(msg) {
  errorMsg.textContent = '⚠ ' + msg;
  errorMsg.classList.add('show');
  progressWrap.classList.remove('show');
  analyzeBtn.disabled = false;
}

// ── Main Analysis ──────────────────────────────
async function runAnalysis(file) {
  analyzeBtn.disabled = true;
  progressWrap.classList.add('show');
  results.classList.remove('show');
  errorMsg.classList.remove('show');

  try {
    // STEP 1: Decode
    setProgress(10, 'Decoding audio buffer...', 1);
    await sleep(100);
    const arrayBuffer = await file.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    await ctx.close();

    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    // Use mono (mix channels)
    const rawL = audioBuffer.getChannelData(0);
    const rawR = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : rawL;
    const samples = new Float32Array(rawL.length);
    for (let i = 0; i < samples.length; i++) samples[i] = (rawL[i] + rawR[i]) * 0.5;

    setProgress(25, 'Detecting tempo (BPM)...', 2);
    await sleep(50);
    const { bpm, confidence: bpmConf } = detectBPM(samples, sampleRate);

    setProgress(50, 'Identifying musical key...', 3);
    await sleep(50);
    const { key, mode, confidence: keyConf } = detectKey(samples, sampleRate);

    setProgress(75, 'Estimating chord progression...', 4);
    await sleep(50);
    const chords = detectChords(samples, sampleRate, key, mode);

    setProgress(90, 'Computing audio features...', 4);
    await sleep(50);
    const features = computeFeatures(samples, sampleRate);

    setProgress(100, 'Done!', 5);
    await sleep(200);

    displayResults({ bpm, bpmConf, key, mode, keyConf, chords, features, duration, samples, sampleRate });

    progressWrap.classList.remove('show');
    analyzeBtn.disabled = false;

  } catch (e) {
    showError('Could not decode audio. Try a different file format (WAV works best). ' + e.message);
    analyzeBtn.disabled = false;
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ──────────────────────────────────────────────
// BPM DETECTION — Energy-based beat tracking
// ──────────────────────────────────────────────
function detectBPM(samples, sampleRate) {
  const hopSize = Math.round(sampleRate * 0.01); // 10ms hops
  const windowSize = Math.round(sampleRate * 0.05);

  // Compute RMS energy envelope
  const energy = [];
  for (let i = 0; i + windowSize < samples.length; i += hopSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) sum += samples[j] * samples[j];
    energy.push(Math.sqrt(sum / windowSize));
  }

  // Onset detection: look for sudden energy increases
  const onsets = [];
  const threshold = 1.4;
  for (let i = 2; i < energy.length - 1; i++) {
    const localAvg = (energy[i-2] + energy[i-1]) / 2;
    if (energy[i] > localAvg * threshold && energy[i] > energy[i+1]) {
      onsets.push(i * hopSize / sampleRate);
    }
  }

  if (onsets.length < 4) return { bpm: 120, confidence: 'low' };

  // Compute inter-onset intervals and find dominant period
  const intervals = [];
  for (let i = 1; i < Math.min(onsets.length, 64); i++) {
    const diff = onsets[i] - onsets[i-1];
    if (diff > 0.25 && diff < 2.0) intervals.push(diff);
  }

  if (intervals.length < 2) return { bpm: 120, confidence: 'low' };

  // Histogram of IOIs
  const bins = {};
  intervals.forEach(iv => {
    const k = Math.round(iv * 10) / 10;
    bins[k] = (bins[k] || 0) + 1;
  });

  let bestKey = 0.5, bestCount = 0;
  Object.entries(bins).forEach(([k, v]) => {
    if (v > bestCount) { bestCount = v; bestKey = parseFloat(k); }
  });

  let bpm = Math.round(60 / bestKey);
  // Normalize to 60-180 range
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  bpm = Math.round(bpm);

  const confidence = bestCount >= 4 ? 'high' : bestCount >= 2 ? 'medium' : 'low';
  return { bpm, confidence };
}

// ──────────────────────────────────────────────
// KEY DETECTION — Chroma + Krumhansl–Schmuckler
// ──────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Key profiles (Krumhansl-Schmuckler)
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function detectKey(samples, sampleRate) {
  const chroma = computeChroma(samples, sampleRate);

  let bestKey = 0, bestMode = 'major', bestCorr = -Infinity;

  for (let k = 0; k < 12; k++) {
    const majorCorr = pearsonCorr(rotateProfile(MAJOR_PROFILE, k), chroma);
    const minorCorr = pearsonCorr(rotateProfile(MINOR_PROFILE, k), chroma);
    if (majorCorr > bestCorr) { bestCorr = majorCorr; bestKey = k; bestMode = 'major'; }
    if (minorCorr > bestCorr) { bestCorr = minorCorr; bestKey = k; bestMode = 'minor'; }
  }

  const confidence = bestCorr > 0.8 ? 'high' : bestCorr > 0.5 ? 'medium' : 'low';
  return { key: NOTE_NAMES[bestKey], mode: bestMode, confidence };
}

function computeChroma(samples, sampleRate) {
  // Sample a portion for speed
  const maxLen = Math.min(samples.length, sampleRate * 30);
  const step = Math.max(1, Math.floor(maxLen / 8192));
  const downsampled = [];
  for (let i = 0; i < maxLen; i += step) downsampled.push(samples[i]);

  const fftSize = 4096;
  const chroma = new Float32Array(12).fill(0);

  for (let start = 0; start + fftSize < downsampled.length; start += fftSize) {
    const frame = downsampled.slice(start, start + fftSize);
    // Apply Hann window
    for (let i = 0; i < frame.length; i++) {
      frame[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
    }
    const spectrum = dft(frame);
    // Map each frequency bin to chroma
    for (let bin = 1; bin < spectrum.length / 2; bin++) {
      const freq = bin * (sampleRate / step) / fftSize;
      if (freq < 60 || freq > 5000) continue;
      const chromaIdx = Math.round(12 * Math.log2(freq / 16.352)) % 12;
      if (chromaIdx >= 0) chroma[chromaIdx] += spectrum[bin];
    }
  }

  // Normalize
  const max = Math.max(...chroma);
  if (max > 0) for (let i = 0; i < 12; i++) chroma[i] /= max;
  return chroma;
}

function dft(frame) {
  // Simplified DFT using magnitude approximation
  const N = frame.length;
  const result = new Float32Array(N);
  // Use autocorrelation-based approach for speed
  for (let k = 0; k < N / 2; k += 4) {
    let re = 0, im = 0;
    for (let n = 0; n < N; n += 8) {
      const angle = 2 * Math.PI * k * n / N;
      re += frame[n] * Math.cos(angle);
      im -= frame[n] * Math.sin(angle);
    }
    result[k] = Math.sqrt(re * re + im * im);
  }
  return result;
}

function rotateProfile(profile, shift) {
  return [...profile.slice(shift), ...profile.slice(0, shift)];
}

function pearsonCorr(a, b) {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - meanA, y = b[i] - meanB;
    num += x * y; da += x * x; db += y * y;
  }
  return num / (Math.sqrt(da) * Math.sqrt(db) + 1e-9);
}

// ──────────────────────────────────────────────
// CHORD DETECTION — Simplified chroma-based
// ──────────────────────────────────────────────
const CHORD_TEMPLATES = {
  'maj':  [1,0,0,0,1,0,0,1,0,0,0,0],
  'min':  [1,0,0,1,0,0,0,1,0,0,0,0],
  'dom7': [1,0,0,0,1,0,0,1,0,0,1,0],
  'maj7': [1,0,0,0,1,0,0,1,0,0,0,1],
  'min7': [1,0,0,1,0,0,0,1,0,0,1,0],
  'dim':  [1,0,0,1,0,0,1,0,0,0,0,0],
  'sus2': [1,0,1,0,0,0,0,1,0,0,0,0],
  'sus4': [1,0,0,0,0,1,0,1,0,0,0,0],
};

function detectChords(samples, sampleRate, key, mode) {
  const segmentSecs = 4;
  const segmentLen = Math.round(sampleRate * segmentSecs);
  const maxSegments = 12;
  const chords = [];

  const step = Math.max(1, Math.floor(segmentLen / 512));

  for (let seg = 0; seg < maxSegments; seg++) {
    const start = seg * segmentLen;
    if (start + segmentLen > samples.length) break;

    const slice = samples.slice(start, start + segmentLen);
    const chroma = computeChromaSimple(slice, sampleRate, step);

    let bestChord = 'C', bestScore = -Infinity;

    for (let root = 0; root < 12; root++) {
      for (const [type, tmpl] of Object.entries(CHORD_TEMPLATES)) {
        const rotated = rotateProfile(tmpl, root);
        let score = 0;
        for (let i = 0; i < 12; i++) score += rotated[i] * chroma[i];
        if (score > bestScore) {
          bestScore = score;
          const suffix = type === 'maj' ? '' : type === 'min' ? 'm' : type === 'dom7' ? '7' : type === 'maj7' ? 'maj7' : type === 'min7' ? 'm7' : type === 'dim' ? 'dim' : type === 'sus2' ? 'sus2' : 'sus4';
          bestChord = NOTE_NAMES[root] + suffix;
        }
      }
    }

    chords.push(bestChord);
  }

  // Deduplicate consecutive same chords
  const deduped = chords.filter((c, i) => i === 0 || c !== chords[i-1]);
  return deduped;
}

function computeChromaSimple(samples, sampleRate, step) {
  const chroma = new Float32Array(12).fill(0);
  for (let i = 0; i < samples.length; i += step * 4) {
    const freq = estimateLocalFreq(samples, i, Math.min(2048, samples.length - i), sampleRate);
    if (freq > 60 && freq < 5000) {
      const semitone = ((Math.round(12 * Math.log2(freq / 16.352)) % 12) + 12) % 12;
      chroma[semitone] += Math.abs(samples[i]);
    }
  }
  const max = Math.max(...chroma, 0.001);
  return chroma.map(v => v / max);
}

function estimateLocalFreq(samples, start, len, sampleRate) {
  // Zero-crossing rate to estimate frequency
  let crossings = 0;
  for (let i = start + 1; i < start + len; i++) {
    if (samples[i-1] >= 0 && samples[i] < 0) crossings++;
  }
  return crossings * sampleRate / len;
}

// ──────────────────────────────────────────────
// AUDIO FEATURES
// ──────────────────────────────────────────────
function computeFeatures(samples, sampleRate) {
  const rmsArr = [];
  const frameSize = 2048;
  for (let i = 0; i + frameSize < samples.length; i += frameSize) {
    let sum = 0;
    for (let j = i; j < i + frameSize; j++) sum += samples[j] * samples[j];
    rmsArr.push(Math.sqrt(sum / frameSize));
  }
  const avgRMS = rmsArr.reduce((a,b)=>a+b,0) / rmsArr.length;
  const maxRMS = Math.max(...rmsArr);
  const minRMS = Math.min(...rmsArr.filter(v=>v>0.001));

  // Spectral centroid estimate (using ZCR as proxy)
  let zcr = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i-1] >= 0) !== (samples[i] >= 0)) zcr++;
  }
  const zcrRate = zcr / (samples.length / sampleRate);
  const brightness = zcrRate > 3000 ? 'Bright' : zcrRate > 1500 ? 'Mid' : 'Warm';

  const energy = avgRMS > 0.15 ? 'High' : avgRMS > 0.06 ? 'Med' : 'Low';
  const dynamic = (maxRMS / (minRMS + 0.001)) > 6 ? 'Wide' : (maxRMS / (minRMS + 0.001)) > 3 ? 'Moderate' : 'Compressed';

  return { energy, dynamic, brightness };
}

// ──────────────────────────────────────────────
// DISPLAY RESULTS
// ──────────────────────────────────────────────
function displayResults({ bpm, bpmConf, key, mode, keyConf, chords, features, duration, samples, sampleRate }) {
  document.getElementById('resBPM').textContent = bpm;
  document.getElementById('confBPM').textContent = `conf: ${bpmConf}`;

  document.getElementById('resKey').textContent = key;
  document.getElementById('resMode').textContent = mode.toUpperCase();
  document.getElementById('confKey').textContent = `conf: ${keyConf}`;

  // Estimate time signature from BPM feel
  const timeSig = bpm % 3 === 0 ? '3/4' : '4/4';
  document.getElementById('resTimeSig').textContent = timeSig === '4/4' ? '4' : '3';

  const mins = Math.floor(duration / 60);
  const secs = Math.round(duration % 60);
  document.getElementById('resDuration').textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
  document.getElementById('resEnergy').textContent = features.energy;
  document.getElementById('resDynamic').textContent = features.dynamic;
  document.getElementById('resBrightness').textContent = features.brightness;

  // Chord timeline
  const timeline = document.getElementById('chordTimeline');
  timeline.innerHTML = '';
  const rootNote = key;
  chords.forEach(chord => {
    const chip = document.createElement('div');
    chip.className = 'chord-chip' + (chord.startsWith(rootNote) ? ' root' : '');
    chip.textContent = chord;
    timeline.appendChild(chip);
  });

  // Waveform
  drawWaveform(samples);

  // Performer note
  const relativeMinor = NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 9) % 12];
  const relMaj = NOTE_NAMES[(NOTE_NAMES.indexOf(key) + 3) % 12];
  const noteText = mode === 'major'
    ? `This track is in <strong>${key} Major</strong> — the relative minor is <strong>${relativeMinor} minor</strong>. ` +
      `At <strong>${bpm} BPM</strong>, it's ${bpm < 90 ? 'a slow, ballad-like tempo' : bpm < 120 ? 'a moderate groove' : bpm < 150 ? 'an upbeat feel' : 'a fast, energetic tempo'}. ` +
      `If you want to transpose to a more comfortable key, try <strong>${relMaj} Major</strong>. ` +
      `Energy level is <strong>${features.energy.toLowerCase()}</strong> with a <strong>${features.dynamic.toLowerCase()}</strong> dynamic range — ` +
      `${features.dynamic === 'Compressed' ? 'great for live performance as it won\'t need much dynamic adjustment.' : 'pay attention to quiet/loud transitions when performing live.'}`
    : `This track is in <strong>${key} minor</strong> — the relative major is <strong>${relMaj} Major</strong>. ` +
      `At <strong>${bpm} BPM</strong>, it's ${bpm < 90 ? 'a brooding, slow tempo' : bpm < 120 ? 'a mid-tempo groove' : bpm < 150 ? 'a driving, energetic minor feel' : 'a very fast, intense tempo'}. ` +
      `For capo/transposition, try shifting to <strong>${relMaj} Major</strong> (same notes, brighter feel). ` +
      `Energy is <strong>${features.energy.toLowerCase()}</strong> and tone is <strong>${features.brightness.toLowerCase()}</strong>.`;

  document.getElementById('performerNoteText').innerHTML = noteText;

  results.classList.add('show');
}

function drawWaveform(samples) {
  const canvas = document.getElementById('waveform');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = 80;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);
  const step = Math.ceil(samples.length / w);
  const mid = h / 2;

  ctx.strokeStyle = '#c8ff00';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();

  for (let x = 0; x < w; x++) {
    let min = 0, max = 0;
    for (let j = 0; j < step; j++) {
      const s = samples[x * step + j] || 0;
      if (s < min) min = s;
      if (s > max) max = s;
    }
    ctx.moveTo(x, mid + min * mid * 0.95);
    ctx.lineTo(x, mid + max * mid * 0.95);
  }
  ctx.stroke();
}