import './App.css'
import Results from "./components/results"
import Progress_Bar from './components/Progress'
import useFile, { processFile } from './hooks/filehandler'

function App() {
  const { file, handleFile } = useFile();
  console.log("file state:", file)
  return (
    <>
      {/* Header or navbar */}
      <header>
        <div className="logo">TRACK<span>READ</span></div>
        <div className="badge">Local Analysis · No Upload · v0.1</div>
      </header>

      {/* main element here */}
      <main>

      {/* upload zone */}
        <div className="upload-zone">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFile}
          />
          <span className="upload-icon">◈</span>
          <div className="upload-title">Drop Your Track Here</div>
          <div className="upload-sub">
            MP3 · WAV · FLAC · OGG · M4A — processed entirely on your device
          </div>
        </div>

      {/* File info bar */}
        {file && (
          <div className="file-bar">
            <span>▶</span>
            <span className="fname">{file.name}</span>
            <span style={{ color: 'var(--muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          )}

      {/* Analyze button */}
        {file && (
          <button className="analyze-btn" onClick={() => processFile(file)}>
            Analyze Track
          </button>
        )}
      {/* Progress bar */}
        <Progress_Bar />

      {/* Results section */}
        <Results />
      </main>

      {/* Footer */}
      <footer>
        <span>ALL PROCESSING LOCAL · YOUR FILE NEVER LEAVES YOUR DEVICE</span>
        <span>WEB AUDIO API + CUSTOM DSP</span>
      </footer>
    </>
  )
}




export default App
