const formatWeight = (value) => {
  if (value === null) {
    return "--.-";
  }
  return value.toFixed(1);
};

export default function StatsPanel({ status, deviceName, weight, battery }) {
  return (
    <section className="panel">
      <div className="stat">
        <span className="label">Status</span>
        <span className="value">{status}</span>
      </div>
      <div className="stat">
        <span className="label">Device</span>
        <span className="value">{deviceName || "--"}</span>
      </div>
      <div className="stat weight">
        <span className="label">Weight (g)</span>
        <span className="value">{formatWeight(weight)}</span>
      </div>
      <div className="stat">
        <span className="label">Battery</span>
        <span className="value">
          {typeof battery === "number" ? `${battery}%` : "--"}
        </span>
      </div>
    </section>
  );
}
