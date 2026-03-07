export default function Progress_Bar() {
  return (
    <div className="progress-wrap" id="progressWrap">
        <div className="progress-label">
            <span id="progressLabel">Decoding audio...</span>
            <span id="progressPct">0%</span>
        </div>
        <div className="progress-bar">
            <div className="progress-fill" id="progressFill"></div>
        </div>
        <div className="progress-steps">
        <div className="step" id="step1">Decode</div>
        <div className="step" id="step2">BPM</div>
        <div className="step" id="step3">Key</div>
        <div className="step" id="step4">Chords</div>
        </div>
    </div>
)};