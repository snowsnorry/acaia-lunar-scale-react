import { describe, expect, it, vi } from "vitest";
import { AcaiaClient, buildAcaiaPacket } from "../acaia.js";

const toDataView = (bytes) => {
  return new DataView(Uint8Array.from(bytes).buffer);
};

describe("buildAcaiaPacket", () => {
  it("builds a packet with header and payload", () => {
    const packet = buildAcaiaPacket("04", "010203");
    const bytes = Array.from(packet);
    expect(bytes).toEqual([0xef, 0xdd, 0x04, 0x01, 0x02, 0x03]);
  });
});

describe("AcaiaParser via client", () => {
  it("parses weight messages", () => {
    const client = new AcaiaClient({});
    const payload = [0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    const bytes = [0xef, 0xdd, 0x0c, payload.length, 0x05, ...payload];
    const parsed = client.parser.push(toDataView(bytes));
    expect(parsed.weight).toBe(16);
  });

  it("parses battery status messages", () => {
    const client = new AcaiaClient({});
    const bytes = [0xef, 0xdd, 0x08, 0x01, 0x85, 0x00];
    const parsed = client.parser.push(toDataView(bytes));
    expect(parsed.battery).toBe(0x05);
  });
});

describe("AcaiaClient commands", () => {
  it("writes packets for tare and timer controls when connected", async () => {
    const client = new AcaiaClient({ onLog: vi.fn() });
    client.device = { gatt: { connected: true } };
    client.characteristic = {
      writeValueWithoutResponse: vi.fn().mockResolvedValue(undefined)
    };
    const sendSpy = vi.spyOn(client, "sendPacket");

    await client.tare();
    await client.startTimer();
    await client.stopTimer();
    await client.resetTimer();

    expect(sendSpy).toHaveBeenCalledWith("04", expect.any(String));
    expect(sendSpy).toHaveBeenCalledWith("0D", "00000000");
    expect(sendSpy).toHaveBeenCalledWith("0D", "00020002");
    expect(sendSpy).toHaveBeenCalledWith("0D", "00010001");
  });

  it("logs and skips tare when disconnected", async () => {
    const logs = [];
    const client = new AcaiaClient({ onLog: (entry) => logs.push(entry) });
    await client.tare();
    expect(logs.join(" ")).toContain("Tare skipped");
  });
});
