const ACAIA_SERVICE_UUID = "00001820-0000-1000-8000-00805f9b34fb";
const ACAIA_WEIGHT_UUID = "00002a80-0000-1000-8000-00805f9b34fb";
const ACAIA_METADATA_LEN = 5;

const HEARTBEAT_INTERVAL_MS = 2000;

const PACKET_HEADER_BYTE_1 = 0xef;
const PACKET_HEADER_BYTE_2 = 0xdd;

const MSG_TYPE_STATUS = 0x08;

const MSG_TYPE_WEIGHT = 0x0c;
const EVENT_TYPE_WEIGHT = 0x05;
const EVENT_TYPE_WEIGHT_STABLE = 0x0b;
const BATTERY_MASK = 0x7f;
const MAX_WEIGHT_MESSAGE_LENGTH = 64;

const MSG_TYPE_HEARTBEAT = "00";
const MSG_TYPE_IDENT = "0B";
const MSG_TYPE_CONFIG = "0C";
const MSG_TYPE_TARE = "04";
const MSG_TYPE_TIMER = "0D";

const PAYLOAD_HEARTBEAT = "02000200";
const PAYLOAD_IDENT = "3031323334353637383930313233349A6D";
const PAYLOAD_CONFIG = "0900010102020103041106";
const PAYLOAD_TARE = "0000000000000000000000000000000000";
const PAYLOAD_TIMER_START = "00000000";
const PAYLOAD_TIMER_STOP = "00020002";
const PAYLOAD_TIMER_RESET = "00010001";

export function getAcaiaUuids() {
  return {
    service: ACAIA_SERVICE_UUID,
    characteristic: ACAIA_WEIGHT_UUID
  };
}

export function buildAcaiaPacket(msgTypeHex, payloadHex) {
  const header = [PACKET_HEADER_BYTE_1, PACKET_HEADER_BYTE_2];
  const type = parseInt(msgTypeHex, 16);
  const payload =
    payloadHex && payloadHex.length
      ? payloadHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      : [];
  const bytes = new Uint8Array([...header, type, ...payload]);
  return bytes;
}

class AcaiaParser {
  constructor() {
    this.buffer = [];
  }

  reset() {
    this.buffer = [];
  }

  push(dataView) {
    const bytes = new Uint8Array(
      dataView.buffer,
      dataView.byteOffset,
      dataView.byteLength
    );
    for (const byte of bytes) {
      this.buffer.push(byte);
    }

    return this.parse();
  }

  parse() {
    for (let i = 0; i < this.buffer.length - 1; i += 1) {
      if (
        this.buffer[i] !== PACKET_HEADER_BYTE_1 ||
        this.buffer[i + 1] !== PACKET_HEADER_BYTE_2
      ) {
        continue;
      }

      if (this.buffer.length - i < ACAIA_METADATA_LEN) {
        break;
      }

      const msgType = this.buffer[i + 2];
      const length = this.buffer[i + 3];
      const eventType = this.buffer[i + 4];
      const totalLength = ACAIA_METADATA_LEN + length;

      if (this.buffer.length - i < totalLength) {
        break;
      }

      let weight = null;
      let battery = null;
      const messageBytes = this.buffer.slice(i, i + totalLength);

      if (msgType === MSG_TYPE_STATUS) {
        const rawBattery = messageBytes[4];
        if (typeof rawBattery === "number") {
          battery = rawBattery & BATTERY_MASK;
        }
      }

      if (
        msgType === MSG_TYPE_WEIGHT &&
        (eventType === EVENT_TYPE_WEIGHT ||
          eventType === EVENT_TYPE_WEIGHT_STABLE) &&
        length <= MAX_WEIGHT_MESSAGE_LENGTH
      ) {
        const payloadOffset =
          eventType === EVENT_TYPE_WEIGHT_STABLE
            ? ACAIA_METADATA_LEN + 3
            : ACAIA_METADATA_LEN;
        const payload = messageBytes.slice(payloadOffset);
        const value =
          ((payload[2] & 0xff) << 16) |
          ((payload[1] & 0xff) << 8) |
          (payload[0] & 0xff);
        const unit = payload[4] & 0xff;
        const isNegative = payload[5] > 1;
        let calculated = value / Math.pow(10, unit);
        if (isNegative) {
          calculated *= -1;
        }
        weight = calculated;
      }

      this.buffer = this.buffer.slice(i + totalLength);
      return { weight, battery };
    }

    return null;
  }
}

export function bytesToHex(dataView) {
  const bytes = new Uint8Array(
    dataView.buffer,
    dataView.byteOffset,
    dataView.byteLength
  );
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join(" ");
}

export class AcaiaClient {
  constructor({ onStatus, onLog, onRawPacket, onWeight, onBattery, onDevice }) {
    this.onStatus = onStatus;
    this.onLog = onLog;
    this.onRawPacket = onRawPacket;
    this.onWeight = onWeight;
    this.onBattery = onBattery;
    this.onDevice = onDevice;
    this.device = null;
    this.characteristic = null;
    this.parser = new AcaiaParser();
    this.heartbeat = null;
  }

  supportsBluetooth() {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  appendLog(message) {
    if (!this.onLog) {
      return;
    }
    const timestamp = new Date().toLocaleTimeString("en-US");
    this.onLog(`${timestamp} ${message}`);
  }

  handleDisconnect = () => {
    this.appendLog("Disconnected from device.");
    if (this.onStatus) {
      this.onStatus("Disconnected");
    }
    if (this.onDevice) {
      this.onDevice("");
    }
    if (this.onWeight) {
      this.onWeight(null);
    }
    if (this.onBattery) {
      this.onBattery(null);
    }
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  };

  async sendPacket(msgType, payload) {
    if (!this.characteristic) {
      return;
    }
    const packet = buildAcaiaPacket(msgType, payload);
    const writer = this.characteristic.writeValueWithoutResponse
      ? this.characteristic.writeValueWithoutResponse.bind(this.characteristic)
      : this.characteristic.writeValue.bind(this.characteristic);
    await writer(packet);
    this.appendLog(`Write ${msgType}: ${payload}`);
  }

  async connect() {
    if (!this.supportsBluetooth()) {
      if (this.onStatus) {
        this.onStatus("Web Bluetooth is not supported by this browser.");
      }
      return;
    }

    if (this.onStatus) {
      this.onStatus("Searching for device...");
    }
    this.appendLog("Starting connection...");
    this.parser.reset();

    try {
      const { service, characteristic } = getAcaiaUuids();
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "ACAIA" }, { namePrefix: "LUNAR" }],
        optionalServices: [service]
      });

      this.device = device;
      device.addEventListener("gattserverdisconnected", this.handleDisconnect);
      this.appendLog(`Selected device: ${device.name || "Acaia Lunar"}`);

      const server = await device.gatt.connect();
      this.appendLog("GATT connected.");
      const acaiaService = await server.getPrimaryService(service);
      this.appendLog(`Service found: ${service}`);

      const weightCharacteristic = await acaiaService.getCharacteristic(
        characteristic
      );

      this.characteristic = weightCharacteristic;
      await weightCharacteristic.startNotifications();
      this.appendLog(`Notifications enabled for ${characteristic}.`);

      weightCharacteristic.addEventListener(
        "characteristicvaluechanged",
        (event) => {
          const value = event.target.value;
          const hex = bytesToHex(value);
          const parsed = this.parser.push(value);
          if (this.onRawPacket) {
            this.onRawPacket(hex);
          }
          this.appendLog(`Notify ${characteristic}: ${hex}`);
          if (parsed?.weight !== null && typeof parsed?.weight === "number") {
            if (this.onWeight) {
              this.onWeight(parsed.weight);
            }
          }
          if (parsed?.battery !== null && typeof parsed?.battery === "number") {
            if (this.onBattery) {
              this.onBattery(parsed.battery);
            }
          }
        }
      );

      if (this.onDevice) {
        this.onDevice(device.name || "Acaia Lunar");
      }
      if (this.onStatus) {
        this.onStatus("Connected");
      }
      this.appendLog("Status: connected.");

      setTimeout(() => {
        this.sendPacket(MSG_TYPE_HEARTBEAT, PAYLOAD_HEARTBEAT).catch(() => {});
      }, 200);
      setTimeout(() => {
        this.sendPacket(MSG_TYPE_IDENT, PAYLOAD_IDENT).catch(() => {});
      }, 500);
      setTimeout(() => {
        this.sendPacket(MSG_TYPE_CONFIG, PAYLOAD_CONFIG).catch(() => {});
      }, 1000);

      this.heartbeat = setInterval(() => {
        this.sendPacket(MSG_TYPE_HEARTBEAT, PAYLOAD_HEARTBEAT).catch(() => {});
      }, HEARTBEAT_INTERVAL_MS);
    } catch (error) {
      if (this.onStatus) {
        this.onStatus(`Error: ${error.message || "Failed to connect"}`);
      }
      this.appendLog(`Connection error: ${error.message || "unknown"}`);
    }
  }

  disconnect() {
    this.appendLog("Disconnect requested by user...");
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.handleDisconnect();
  }

  async tare() {
    if (!this.device?.gatt?.connected) {
      this.appendLog("Tare skipped: no active connection.");
      return;
    }
    try {
      await this.sendPacket(MSG_TYPE_TARE, PAYLOAD_TARE);
    } catch (error) {
      this.appendLog(`Tare error: ${error.message || "unknown"}`);
    }
  }

  async startTimer() {
    if (!this.device?.gatt?.connected) {
      this.appendLog("Timer start skipped: no active connection.");
      return;
    }
    try {
      await this.sendPacket(MSG_TYPE_TIMER, PAYLOAD_TIMER_START);
    } catch (error) {
      this.appendLog(`Timer start error: ${error.message || "unknown"}`);
    }
  }

  async stopTimer() {
    if (!this.device?.gatt?.connected) {
      this.appendLog("Timer stop skipped: no active connection.");
      return;
    }
    try {
      await this.sendPacket(MSG_TYPE_TIMER, PAYLOAD_TIMER_STOP);
    } catch (error) {
      this.appendLog(`Timer stop error: ${error.message || "unknown"}`);
    }
  }

  async resetTimer() {
    if (!this.device?.gatt?.connected) {
      this.appendLog("Timer reset skipped: no active connection.");
      return;
    }
    try {
      await this.sendPacket(MSG_TYPE_TIMER, PAYLOAD_TIMER_RESET);
    } catch (error) {
      this.appendLog(`Timer reset error: ${error.message || "unknown"}`);
    }
  }
}
