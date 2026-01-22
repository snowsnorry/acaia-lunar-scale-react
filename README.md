# Acaia Lunar Web Monitor

Lightweight React + Vite app that connects to the Acaia Lunar scale over Web
Bluetooth, shows live weight/battery, and plots a real-time weight chart with a
scale timer. The chart can be exported to PNG.

## Features

- Web Bluetooth connection to Acaia Lunar
- Live weight, device, battery, and status display
- Weight-over-time chart with timer controls
- PNG export of the chart (axes and grid included)
- Diagnostics log and raw packet viewer

## Requirements

- Chromium-based browser with Web Bluetooth enabled (Chrome, Edge)
- HTTPS or localhost (required by Web Bluetooth)
- Acaia Lunar scale

## Quick start

```bash
npm install
npm run dev
```

Open the app in the browser, click Connect, and select your scale.

## Build

```bash
npm run build
npm run preview
```

## Notes

- Web Bluetooth is not supported in Safari or Firefox.
- If weight parsing looks incorrect, adjust the parser in `src/acaia.js`.

## License

MIT
