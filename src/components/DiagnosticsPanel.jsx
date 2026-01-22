export default function DiagnosticsPanel({
  showDiagnostics,
  onToggleDiagnostics,
  rawPacket,
  logs,
  onClearLogs
}) {
  return (
    <>
      <section className="panel controls">
        <label className="toggle">
          <input
            type="checkbox"
            checked={showDiagnostics}
            onChange={(event) => onToggleDiagnostics(event.target.checked)}
          />
          Show diagnostics and connection log
        </label>
      </section>

      {showDiagnostics ? (
        <>
          <section className="panel info">
            <div>
              <h2>Diagnostics</h2>
              <p>
                Web Bluetooth works only over HTTPS or localhost. If weight
                looks incorrect, adjust the parser in <code>src/acaia.js</code>.
              </p>
            </div>
            <div className="raw">
              <span className="label">Raw packet</span>
              <span className="mono">{rawPacket}</span>
            </div>
          </section>

          <section className="panel log">
            <div className="log-header">
              <span className="label">Connection log</span>
              <button className="ghost" onClick={onClearLogs}>
                Clear
              </button>
            </div>
            <div className="log-body">
              {logs.length === 0 ? (
                <span className="value">Log is empty.</span>
              ) : (
                logs.map((entry, index) => (
                  <span key={`${entry}-${index}`} className="mono">
                    {entry}
                  </span>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
