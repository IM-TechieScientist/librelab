# LibreLab firmware documentation

This directory is the authoritative documentation for the integrated RP2350
firmware and ESP32-C3 bridge. Unless a section is explicitly marked as a future
RP2350B design, values and limitations describe the current Pico 2/RP2350A
source tree.

## Start here

1. [Getting started](getting-started.md) — build, flash, connect, and run a first capture.
2. [Hardware resources](hardware.md) — pin mapping, wiring, voltage rules, and conflicts.
3. [RP2350B migration](rp2350b-migration.md) — verified package differences,
   conflict-free routing example, and required firmware work.
4. [SCPI command reference](scpi-reference.md) — every command registered by the firmware.
5. [Binary data formats](data-formats.md) — arbitrary blocks, packed samples, USB streams, and Wi-Fi frames.

## Build and maintenance

- [Building and flashing](building.md) — RP2350 and ESP32-C3 toolchains and artifacts.
- [Testing](testing.md) — build verification, sigrok tests, and current test-suite status.
- [Development guide](development.md) — source ownership, adding features, style, and review checklist.
- [Troubleshooting](troubleshooting.md) — common build, USB, capture, bus, and wireless failures.

## Architecture

- [Firmware architecture](architecture.md) — layer boundaries, boot flow,
  runtime scheduling, errors, and resource ownership.
- [RP2350B migration](rp2350b-migration.md) — future PCB pin planning and
  package-aware architecture changes.
- [Binary data formats](data-formats.md) — application and bridge protocol layouts.
- [Wi-Fi bridge](features/wifi-bridge.md) — two-MCU architecture, provisioning, TCP, UDP, SPI, and mDNS.

## Feature guides

| Feature | Guide |
| --- | --- |
| PIO/DMA logic analyser | [Logic analyser](features/logic-analyser.md) |
| Internal-ADC oscilloscope | [Oscilloscope](features/oscilloscope.md) |
| Synchronized analog + digital capture | [Mixed-signal capture](features/mixed-signal.md) |
| PIO/DMA digital output | [Pattern generator](features/pattern-generator.md) |
| UART, I2C, and SPI host gateways | [Bus gateways](features/bus-gateways.md) |
| Digital and PWM test outputs | [Test signals](features/test-signals.md) |
| USB/TCP/UDP wireless transport | [Wi-Fi bridge](features/wifi-bridge.md) |
| Internal ADC abstraction | [ADC frontend](features/adc-frontends.md) |

## Documentation conventions

- GPIO numbers are RP2350 GPIO numbers, not physical header pin numbers.
- Rates are in hertz unless explicitly labelled otherwise.
- Timeouts exposed by SCPI are in milliseconds; lower layers commonly store
  them in microseconds.
- `uint16_t` and `uint32_t` payloads are little-endian.
- In SCPI command spellings, uppercase characters form the legal short form and
  lowercase characters are optional.
- “Built” means the file is listed in the root `CMakeLists.txt`; it does not
  imply that every combination of features is electrically conflict-free.
