# Testing

The app is testable without LibreLab hardware. The simulator is not just placeholder UI; it implements the same `LibreLabApi` shape that the hardware backend will implement.

## Unit And Component Tests

Run:

```bash
npm test
```

Coverage today includes:

- deterministic capture generation in `src/shared/mockCapture.test.ts`;
- formatter behavior in `src/renderer/src/lib/format.test.ts`;
- a full renderer workflow in `src/renderer/src/App.test.tsx`.

The renderer workflow test connects to a fake simulator, captures data, switches panels, toggles decoder visibility, and changes instrument mode. Canvas and `ResizeObserver` are shimmed in `src/renderer/src/test/setup.ts` so jsdom can execute the waveform component.

## GUI Smoke Test

Run:

```bash
npm run test:e2e
```

On a fresh machine, install the Playwright browser once:

```bash
npx playwright install chromium
```

The smoke test builds the Electron app, starts a Vite renderer server, opens it with Playwright Chromium, connects to the built-in simulator, captures data, verifies the waveform canvas exists, opens analyzers, and sends a bus-console message.

## Documentation Screenshots

Run:

```bash
npm run docs:screenshots
```

The script captures the simulator workspace, analyzer panel, and bus console into `docs/assets/`. It starts the renderer dev server if one is not already reachable at `http://127.0.0.1:5174/`.

## Hardware Testing Plan

When the native device engine lands, keep the current simulator tests and add hardware-facing tests in layers:

- contract tests against recorded capture fixtures;
- device discovery tests behind an opt-in environment variable;
- streaming tests with short captures and clear timeouts;
- decoder fixture tests that compare libsigrokdecode annotations against expected spans.

Do not make ordinary CI require a physical board.
