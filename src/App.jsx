import { useEffect, useRef, useState } from "react";
import { AcaiaClient } from "./acaia.js";
import ChartPanel from "./components/ChartPanel.jsx";
import DiagnosticsPanel from "./components/DiagnosticsPanel.jsx";
import HeroHeader from "./components/HeroHeader.jsx";
import StatsPanel from "./components/StatsPanel.jsx";

export default function App() {
  const [status, setStatus] = useState("Disconnected");
  const [weight, setWeight] = useState(null);
  const [rawPacket, setRawPacket] = useState("--");
  const [deviceName, setDeviceName] = useState("");
  const [battery, setBattery] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const clientRef = useRef(null);
  const isConnected = status === "Connected";

  useEffect(() => {
    clientRef.current = new AcaiaClient({
      onStatus: setStatus,
      onRawPacket: setRawPacket,
      onWeight: setWeight,
      onBattery: setBattery,
      onDevice: setDeviceName,
      onLog: (entry) =>
        setLogs((current) => [...current, entry].slice(-250))
    });
    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const connect = () => clientRef.current?.connect();
  const disconnect = () => clientRef.current?.disconnect();
  const tare = () => clientRef.current?.tare();
  const startTimer = () => clientRef.current?.startTimer();
  const stopTimer = () => clientRef.current?.stopTimer();
  const resetTimer = () => clientRef.current?.resetTimer();

  return (
    <div className="app">
      <HeroHeader
        onConnect={connect}
        onTare={tare}
        onDisconnect={disconnect}
        isConnected={isConnected}
      />
      <StatsPanel
        status={status}
        deviceName={deviceName}
        weight={weight}
        battery={battery}
      />
      <ChartPanel
        weight={weight}
        status={status}
        isConnected={isConnected}
        onStartTimer={startTimer}
        onStopTimer={stopTimer}
        onResetTimer={resetTimer}
      />
      <DiagnosticsPanel
        showDiagnostics={showDiagnostics}
        onToggleDiagnostics={setShowDiagnostics}
        rawPacket={rawPacket}
        logs={logs}
        onClearLogs={() => setLogs([])}
      />
    </div>
  );
}
