export default function Results() {
  return (
    <div className="results" id="results">
        <div className="results-header">Analysis Complete</div>

        <div className="metrics-grid">
        {/* Tempo */}
        <div className="metric">
            <div className="metric-label">Tempo</div>
            <div className="metric-value" id="resBPM">—</div>
            <div className="metric-unit">BPM</div>
            <div className="metric-confidence" id="confBPM"></div>
        </div>
        {/* Musical Key */}
        <div className="metric">
            <div className="metric-label">Musical Key</div>
            <div className="metric-value" id="resKey">—</div>
            <div className="metric-unit" id="resMode">—</div>
            <div className="metric-confidence" id="confKey"></div>
        </div>
        {/* Time Signature */}
        <div className="metric">
            <div className="metric-label">Time Signature</div>
            <div className="metric-value" id="resTimeSig">—</div>
            <div className="metric-unit">beats per bar</div>
        </div>
        </div>
        
        <div className="extra-grid">
        {/* Duration */}
        <div className="extra-metric">
            <div className="extra-label">Duration</div>
            <div className="extra-value" id="resDuration">—</div>
        </div>
        {/* Energy */}
        <div className="extra-metric">
            <div className="extra-label">Energy</div>
            <div className="extra-value" id="resEnergy">—</div>
        </div>
        {/* Dynamic Range */}
        <div className="extra-metric">
            <div className="extra-label">Dynamic Range</div>
            <div className="extra-value" id="resDynamic">—</div>
        </div>
        {/* Spectral Brightness */}
        <div className="extra-metric">
            <div className="extra-label">Spectral Brightness</div>
            <div className="extra-value" id="resBrightness">—</div>
        </div>
        </div>

        <div className="chord-section">
        {/* Chord Progression */}
        <div className="chord-section-title">Detected Chord Progression (estimated)</div>
        <div className="chord-timeline" id="chordTimeline"></div>
        </div>
        {/* Waveform */}
        <div className="waveform-section">
        <div className="waveform-title">Waveform</div>
        <canvas id="waveform"></canvas>
        </div>
        {/* Performer's Summary */}
        <div className="performer-note" id="performerNote">
        <div className="performer-note-title">⬡ Performer's Summary</div>
        <p id="performerNoteText">—</p>
        </div>
    </div>
)};