# Feature Map

## Capture Workspace

The main workspace shows a channel rail, a timeline canvas, session tabs, capture status, and a right-side inspector. It supports three modes:

- Logic: digital channels only.
- Scope: analog channels only.
- MSO: digital and analog channels together.

![LibreLab Studio capture workspace](assets/studio-workspace.png)

## Waveform Viewer

Implemented interactions:

- mouse wheel zoom around cursor;
- shift-wheel or horizontal wheel pan;
- pointer drag pan;
- click to place A/B markers;
- Fit button to reset the view.

The viewer draws digital transitions as stepped traces and analog signals as per-pixel min/max columns so large captures remain responsive.

## Protocol Analyzers

The analyzer panel currently exposes a simulated I2C decoder lane. The UI consumes generic `DecoderAnnotation` records, so future libsigrokdecode support can add protocols without rewriting the waveform renderer.

![LibreLab Studio analyzer panel](assets/studio-analyzers.png)

## Measurements

The measurement panel computes current-session duration, sample count, edge count, and first-digital-channel frequency estimate. Timeline A/B marker deltas are displayed in the viewport HUD.

## Outputs

The output panel includes simulated controls for:

- pattern generator;
- square-wave output;
- PWM output.

These are UI placeholders wired to local state. The hardware engine should later route them through explicit output-control APIs.

## Bus Console

The bus panel provides simulated UART, I2C, and SPI console modes. The current flow echoes messages locally, which gives us a stable GUI workflow for tests before real bus transport is connected.

![LibreLab Studio bus console](assets/studio-bus-console.png)
