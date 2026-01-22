export default function HeroHeader({
  onConnect,
  onTare,
  onDisconnect,
  isConnected
}) {
  return (
    <header className="hero">
      <div>
        <p className="eyebrow">Acaia Lunar</p>
        <h1>Bluetooth Scale</h1>
        <p className="subtitle">
          Connect to Acaia Lunar and monitor weight in real time.
        </p>
      </div>
      <div className="actions">
        <button className="primary" onClick={onConnect}>
          Connect
        </button>
        <button className="primary" onClick={onTare} disabled={!isConnected}>
          Tare
        </button>
        <button className="ghost" onClick={onDisconnect} disabled={!isConnected}>
          Disconnect
        </button>
      </div>
    </header>
  );
}
