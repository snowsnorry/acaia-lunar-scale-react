import { useEffect, useRef, useState } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export default function ChartPanel({
  weight,
  status,
  isConnected,
  onStartTimer,
  onStopTimer,
  onResetTimer
}) {
  const [series, setSeries] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const weightRef = useRef(null);
  const sessionStartRef = useRef(null);
  const prevStatusRef = useRef(status);
  const svgRef = useRef(null);

  useEffect(() => {
    weightRef.current = weight;
  }, [weight]);

  const resetTimerLocal = () => {
    sessionStartRef.current = null;
    setElapsedMs(0);
    setIsRunning(false);
    setSeries([]);
  };

  useEffect(() => {
    if (status === "Connected" && prevStatusRef.current !== "Connected") {
      resetTimerLocal();
    }
    prevStatusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }
    const interval = setInterval(() => {
      const currentWeight = weightRef.current;
      if (typeof currentWeight !== "number") {
        return;
      }
      const now = Date.now();
      const start = sessionStartRef.current ?? now;
      const point = { t: now - start, w: currentWeight };
      setSeries((current) => {
        const next = [...current, point];
        if (next.length > 600) {
          return next.slice(-600);
        }
        return next;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [isRunning]);

  const startTimer = () => {
    if (isRunning) {
      return;
    }
    const now = Date.now();
    sessionStartRef.current = now - elapsedMs;
    setIsRunning(true);
    onStartTimer();
  };

  const pauseTimer = () => {
    if (!isRunning) {
      return;
    }
    const now = Date.now();
    const start = sessionStartRef.current ?? now;
    setElapsedMs(now - start);
    setIsRunning(false);
    onStopTimer();
  };

  const toggleTimer = () => {
    if (isRunning) {
      pauseTimer();
      return;
    }
    startTimer();
  };

  const resetTimer = () => {
    resetTimerLocal();
    onResetTimer();
  };

  const chartHeight = 240;
  const chartWidth = 900;
  const chartPadding = { top: 16, right: 16, bottom: 36, left: 56 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const timeMax =
    series.length > 0 ? Math.max(series[series.length - 1].t, 1000) : 1000;
  const weights = series.map((point) => point.w);
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 1;
  const weightRange = Math.max(maxWeight - minWeight, 0.5);
  const xTicks = 5;
  const yTicks = 4;
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const xTickValues = Array.from({ length: xTicks + 1 }, (_, index) => {
    return (index / xTicks) * timeMax;
  });
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, index) => {
    return minWeight + (index / yTicks) * weightRange;
  });
  const chartPoints = series
    .map((point) => {
      const x = chartPadding.left + (point.t / timeMax) * plotWidth;
      const y =
        chartPadding.top +
        (1 - (point.w - minWeight) / weightRange) * plotHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const hasSeries = series.length > 0;

  const downloadChart = async () => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // Ignore font readiness errors and continue export.
      }
    }
    const clone = svg.cloneNode(true);
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    clone.setAttribute(
      "font-family",
      "\"DM Sans\", \"Helvetica Neue\", Arial, sans-serif"
    );
    const background = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    background.setAttribute("width", chartWidth);
    background.setAttribute("height", chartHeight);
    background.setAttribute("fill", "#f8efe6");
    clone.insertBefore(background, clone.firstChild);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8"
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = chartWidth;
      canvas.height = chartHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return;
      }
      context.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          URL.revokeObjectURL(url);
          return;
        }
        const link = document.createElement("a");
        const filename = `weight-chart-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.png`;
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <section className="panel chart-panel">
      <div className="chart-header">
        <div>
          <span className="label">Weight over time</span>
          <div className="value">Live trace</div>
        </div>
        <div className="chart-actions">
          <div className="chart-meta">
            <span className="mono">
              {hasSeries
                ? `${(timeMax / 1000).toFixed(1)}s · ${series.length} pts`
                : "No data yet"}
            </span>
          </div>
          <button
            className="ghost icon-button"
            onClick={downloadChart}
            aria-label="Download chart"
          >
            <FileDownloadIcon fontSize="small" />
          </button>
        </div>
      </div>
      <div className="chart-viewport">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          fontFamily='"DM Sans", "Helvetica Neue", Arial, sans-serif'
        >
          <defs>
            <linearGradient id="weightLine" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#1d1a17" />
              <stop offset="100%" stopColor="#a66c3b" />
            </linearGradient>
          </defs>
          <g className="chart-grid">
            {xTickValues.map((value) => {
              const x = chartPadding.left + (value / timeMax) * plotWidth;
              return (
                <line
                  key={`x-${value}`}
                  x1={x}
                  x2={x}
                  y1={chartPadding.top}
                  y2={chartPadding.top + plotHeight}
                  stroke="rgba(120, 90, 60, 0.2)"
                  strokeDasharray="4 6"
                />
              );
            })}
            {yTickValues.map((value) => {
              const y =
                chartPadding.top +
                (1 - (value - minWeight) / weightRange) * plotHeight;
              return (
                <line
                  key={`y-${value}`}
                  x1={chartPadding.left}
                  x2={chartPadding.left + plotWidth}
                  y1={y}
                  y2={y}
                  stroke="rgba(120, 90, 60, 0.2)"
                  strokeDasharray="4 6"
                />
              );
            })}
          </g>
          <g className="chart-axis">
            <line
              x1={chartPadding.left}
              x2={chartPadding.left}
              y1={chartPadding.top}
              y2={chartPadding.top + plotHeight}
              stroke="rgba(90, 60, 30, 0.5)"
              strokeWidth="1.2"
            />
            <line
              x1={chartPadding.left}
              x2={chartPadding.left + plotWidth}
              y1={chartPadding.top + plotHeight}
              y2={chartPadding.top + plotHeight}
              stroke="rgba(90, 60, 30, 0.5)"
              strokeWidth="1.2"
            />
          </g>
          <g className="chart-labels">
            {yTickValues.map((value) => {
              const y =
                chartPadding.top +
                (1 - (value - minWeight) / weightRange) * plotHeight;
              return (
                <text
                  key={`yl-${value}`}
                  x={chartPadding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#6a5240"
                  fontSize="10"
                  fontFamily='"JetBrains Mono", "Courier New", monospace'
                >
                  {value.toFixed(1)}
                </text>
              );
            })}
            {xTickValues.map((value) => {
              const x = chartPadding.left + (value / timeMax) * plotWidth;
              return (
                <text
                  key={`xl-${value}`}
                  x={x}
                  y={chartPadding.top + plotHeight + 20}
                  textAnchor="middle"
                  fill="#6a5240"
                  fontSize="10"
                  fontFamily='"JetBrains Mono", "Courier New", monospace'
                >
                  {formatTime(value)}
                </text>
              );
            })}
            <text
              className="chart-axis-label"
              x={chartPadding.left + plotWidth / 2}
              y={chartHeight - 6}
              textAnchor="middle"
              fill="#5a4634"
              fontSize="11"
              letterSpacing="0.18em"
              fontFamily='"DM Sans", "Helvetica Neue", Arial, sans-serif'
            >
              TIME (MM:SS)
            </text>
            <text
              className="chart-axis-label"
              x={14}
              y={chartPadding.top + plotHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 14 ${chartPadding.top + plotHeight / 2})`}
              fill="#5a4634"
              fontSize="11"
              letterSpacing="0.18em"
              fontFamily='"DM Sans", "Helvetica Neue", Arial, sans-serif'
            >
              WEIGHT (G)
            </text>
          </g>
          {hasSeries ? (
            <polyline
              points={chartPoints}
              fill="none"
              stroke="url(#weightLine)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        {!hasSeries ? (
          <div className="chart-empty">Start to see the live trace.</div>
        ) : null}
      </div>
      <div className="chart-controls">
        <button
          className="primary"
          onClick={toggleTimer}
          disabled={!isConnected}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button className="ghost" onClick={resetTimer} disabled={!isConnected}>
          Reset
        </button>
      </div>
    </section>
  );
}
