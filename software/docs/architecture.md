# LibreLab Studio Architecture

LibreLab Studio is split into four layers:

```text
Renderer UI -> Preload API -> Main process service -> Device/decoder engine
```

## Renderer UI

The renderer is a React application under `src/renderer/src`.

- `App.tsx` owns workspace state: devices, active capture settings, capture sessions, active side panel, progress, and errors.
- `WaveformViewport.tsx` draws digital, analog, marker, and decoder tracks onto a canvas.
- `SidePanel.tsx` contains capture controls, protocol analyzers, measurements, output controls, and the bus console.
- `lib/api.ts` returns the Electron preload API when available and a browser simulator when the renderer is tested outside Electron.

The renderer only consumes typed data from `src/shared/contracts.ts`. It does not import Electron APIs, use Node APIs, or assume hardware is attached.

## Preload API

`src/preload/index.ts` exposes a narrow `window.librelab` bridge through Electron `contextBridge`.

Available methods:

- `listDevices()`
- `connect(deviceId)`
- `disconnect(deviceId)`
- `capture(deviceId, configuration)`
- `onCaptureProgress(callback)`

All future hardware and decoder work should preserve this API unless a workflow genuinely needs a new operation.

## Main Process

`src/main/index.ts` creates the desktop window and registers IPC handlers. It currently routes every call to `MockDeviceService`, which simulates discovery, connection, capture progress, and capture data.

The production hardware implementation should replace or sit beside `MockDeviceService` with a device manager that can:

- discover USB/network LibreLab devices;
- negotiate firmware capabilities;
- stream capture data;
- expose generator and bus operations;
- report recoverable connection errors;
- feed protocol decoder workers.

## Capture Model

The shared capture model is intentionally close to how waveform tools operate:

- `CaptureConfiguration` describes requested mode, sample rate, sample count, channels, and trigger.
- `CaptureSession` stores immutable captured data and annotations.
- Digital samples are `Uint8Array` values.
- Analog samples are `Float32Array` voltage values.
- Decoder output is represented as `DecoderAnnotation` spans over sample indices.

This keeps the UI independent from transport details and lets tests generate stable captures.

## Protocol Decoding

The first slice ships simulated I2C annotations. The planned decoder path is:

```text
CaptureSession samples -> decoder worker -> DecoderAnnotation[] -> waveform annotation lane
```

The worker should wrap libsigrokdecode and convert decoder output into the existing annotation model. That allows the GUI to support libsigrokdecode protocols without coupling React components to Python or native process details.

## PulseView Compatibility

PulseView support should remain a parallel export/integration path. LibreLab Studio should own the first-party experience, while firmware and capture tooling should still produce formats or sigrok driver hooks that PulseView users can consume.

