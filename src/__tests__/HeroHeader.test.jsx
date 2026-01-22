import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HeroHeader from "../components/HeroHeader.jsx";

describe("HeroHeader", () => {
  it("disables Tare and Disconnect when disconnected", () => {
    render(
      <HeroHeader
        onConnect={vi.fn()}
        onTare={vi.fn()}
        onDisconnect={vi.fn()}
        isConnected={false}
      />
    );

    expect(screen.getByRole("button", { name: "Tare" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeDisabled();
  });
});
