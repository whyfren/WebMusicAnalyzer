
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  return (
    <>
      <header>
  <div className="logo">TRACK<span>READ</span></div>
  <div className="badge">Local Analysis · No Upload · v0.1</div>
</header>

<main>

  <div className="upload-zone" id="uploadZone">
    <input type="file" id="fileInput" accept="audio/*"/>
    <span className="upload-icon">◈</span>
    <div className="upload-title">Drop Your Track Here</div>
    <div className="upload-sub">MP3 · WAV · FLAC · OGG · M4A — processed entirely on your device</div>
  </div>

  <div className="file-bar" id="fileBar">
    <span>▶</span>
    <span className="fname" id="fileName">—</span>
    <span id="fileSize" style={{ color: 'var(--muted)' }}>—</span>
  </div>

  <button className="analyze-btn" id="analyzeBtn">Analyze Track</button>

  <div className="error-msg" id="errorMsg"></div>

  <div className="progress-wrap" id="progressWrap">
    <div className="progress-label">
      <span id="progressLabel">Decoding audio...</span>
      <span id="progressPct">0%</span>
    </div>
    <div className="progress-bar"><div className="progress-fill" id="progressFill"></div></div>
    <div className="progress-steps">
      <div className="step" id="step1">Decode</div>
      <div className="step" id="step2">BPM</div>
      <div className="step" id="step3">Key</div>
      <div className="step" id="step4">Chords</div>
    </div>
  </div>

  <div className="results" id="results">
    <div className="results-header">Analysis Complete</div>

    <div className="metrics-grid">
      <div className="metric">
        <div className="metric-label">Tempo</div>
        <div className="metric-value" id="resBPM">—</div>
        <div className="metric-unit">BPM</div>
        <div className="metric-confidence" id="confBPM"></div>
      </div>
      <div className="metric">
        <div className="metric-label">Musical Key</div>
        <div className="metric-value" id="resKey">—</div>
        <div className="metric-unit" id="resMode">—</div>
        <div className="metric-confidence" id="confKey"></div>
      </div>
      <div className="metric">
        <div className="metric-label">Time Signature</div>
        <div className="metric-value" id="resTimeSig">—</div>
        <div className="metric-unit">beats per bar</div>
      </div>
    </div>

    <div className="extra-grid">
      <div className="extra-metric">
        <div className="extra-label">Duration</div>
        <div className="extra-value" id="resDuration">—</div>
      </div>
      <div className="extra-metric">
        <div className="extra-label">Energy</div>
        <div className="extra-value" id="resEnergy">—</div>
      </div>
      <div className="extra-metric">
        <div className="extra-label">Dynamic Range</div>
        <div className="extra-value" id="resDynamic">—</div>
      </div>
      <div className="extra-metric">
        <div className="extra-label">Spectral Brightness</div>
        <div className="extra-value" id="resBrightness">—</div>
      </div>
    </div>

    <div className="chord-section">
      <div className="chord-section-title">Detected Chord Progression (estimated)</div>
      <div className="chord-timeline" id="chordTimeline"></div>
    </div>

    <div className="waveform-section">
      <div className="waveform-title">Waveform</div>
      <canvas id="waveform"></canvas>
    </div>

    <div className="performer-note" id="performerNote">
      <div className="performer-note-title">⬡ Performer's Summary</div>
      <p id="performerNoteText">—</p>
    </div>

  </div>

</main>

<footer>
  <span>ALL PROCESSING LOCAL · YOUR FILE NEVER LEAVES YOUR DEVICE</span>
  <span>WEB AUDIO API + CUSTOM DSP</span>
</footer>
    </>
  )
}

export default App
