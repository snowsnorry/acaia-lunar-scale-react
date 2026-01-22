import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChartPanel from "../components/ChartPanel.jsx";

const renderChart = (overrides = {}) => {
  const props = {
    weight: 10,
    status: "Disconnected",
    isConnected: true,
    onStartTimer: vi.fn(),
    onStopTimer: vi.fn(),
    onResetTimer: vi.fn(),
    ...overrides
  };
  return render(<ChartPanel {...props} />);
};

const getStartButton = () =>
  screen.getAllByRole("button", { name: "Start" })[0];

describe("ChartPanel", () => {
  it("toggles Start/Pause and calls timer handlers", async () => {
    const user = userEvent.setup();
    const onStartTimer = vi.fn();
    const onStopTimer = vi.fn();

    renderChart({ onStartTimer, onStopTimer });

    const toggle = getStartButton();
    await user.click(toggle);
    expect(onStartTimer).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveTextContent("Pause");

    await user.click(toggle);
    expect(onStopTimer).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveTextContent("Start");
  });

  it("disables controls when disconnected", () => {
    renderChart({ isConnected: false });
    expect(getStartButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
  });

  it("keeps graph empty when weight is missing", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderChart({ weight: null });

    await user.click(getStartButton());
    vi.advanceTimersByTime(1000);

    expect(screen.getByText("No data yet")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("resets series on status change to Connected", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender } = renderChart({ status: "Disconnected", weight: 8 });

    await user.click(getStartButton());
    await vi.advanceTimersByTimeAsync(1000);
    expect(screen.queryByText("No data yet")).not.toBeInTheDocument();

    rerender(
      <ChartPanel
        weight={8}
        status="Connected"
        isConnected
        onStartTimer={vi.fn()}
        onStopTimer={vi.fn()}
        onResetTimer={vi.fn()}
      />
    );

    expect(screen.getByText("No data yet")).toBeInTheDocument();
    expect(getStartButton()).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows mm:ss labels on the x-axis", () => {
    renderChart();
    expect(screen.getByText("TIME (MM:SS)")).toBeInTheDocument();
    expect(screen.getAllByText("0:00").length).toBeGreaterThan(0);
  });
});
