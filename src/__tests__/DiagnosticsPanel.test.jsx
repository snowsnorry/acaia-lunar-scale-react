import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DiagnosticsPanel from "../components/DiagnosticsPanel.jsx";

describe("DiagnosticsPanel", () => {
  it("renders diagnostics content when enabled", () => {
    render(
      <DiagnosticsPanel
        showDiagnostics
        onToggleDiagnostics={vi.fn()}
        rawPacket="aa bb"
        logs={[]}
        onClearLogs={vi.fn()}
      />
    );

    expect(screen.getByText("Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("aa bb")).toBeInTheDocument();
  });

  it("calls onClearLogs when Clear is clicked", async () => {
    const user = userEvent.setup();
    const onClearLogs = vi.fn();
    render(
      <DiagnosticsPanel
        showDiagnostics
        onToggleDiagnostics={vi.fn()}
        rawPacket="aa bb"
        logs={["log entry"]}
        onClearLogs={onClearLogs}
      />
    );

    await user.click(screen.getAllByRole("button", { name: "Clear" })[0]);
    expect(onClearLogs).toHaveBeenCalledTimes(1);
  });
});
