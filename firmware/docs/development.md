# Development guide

## Source ownership

The active RP2350 target follows a three-layer structure:

| Layer | Directory | Responsibility |
| --- | --- | --- |
| Application | `src/application/` | SCPI command table, argument validation, response formatting, feature-facing state |
| System | `src/system/` | Hardware-independent instruments, buses, capture orchestration, transport policy |
| Platform | `src/platform/` | Pico SDK, GPIO, ADC, PIO, DMA, UART/I2C/SPI, USB, LED, and ESP-link details |
| Utilities | `src/util/` | Logging, errors, SI-prefix constants, and circular buffer |

The ESP32-C3 is a separate ESP-IDF application under `esp_firmware/`. The
libsigrok adapter under `tools/sigrok/` is host software and is not linked into
either embedded image.

## Adding or changing a SCPI feature

1. Put portable state and operations in the system layer when the feature has a
   meaningful hardware-independent boundary.
2. Put Pico SDK calls in the platform layer. Do not make application command
   handlers own DMA channels, PIO state machines, or SDK peripheral handles.
3. Add small command adapters in `src/application/` or
   `src/application/protocol/`. Validate every required parameter and translate
   failures to the appropriate SCPI error.
4. Register commands in `g_SCPI_COMMANDS` in
   `src/application/protocol/common.c`.
5. Add new `.c` files and required Pico SDK libraries to the root
   `CMakeLists.txt`.
6. Reset new instrument state from `protocol_reset()` when `*RST` should affect
   it.
7. Add tests, update `docs/scpi-reference.md`, and update the corresponding
   feature/data-format documentation.

Keep query results stable and machine-readable. Use decimal integers or
documented CSV for small metadata and SCPI arbitrary blocks for binary data.
Do not mix diagnostic logging into the CDC SCPI channel.

## Runtime constraints

The firmware uses a cooperative main loop, not an RTOS. `protocol_task()`
services TinyUSB, polls wireless SCPI, advances the pattern generator, and emits
capture stream frames. Long waits inside a command handler stop all of those
activities. New trigger or peripheral waits should therefore be bounded and
should report an execution error on timeout.

Static buffers are deliberately used for deterministic embedded memory. Check
both element capacity and transport-message capacity before increasing a limit.
For example, the pattern store is much larger than the 1,024-byte SCPI input
buffer, and the ESP bridge carries only 500 payload bytes per SPI frame.

## Hardware resource rules

There is no central GPIO, DMA, PIO, PWM-slice, ADC, or peripheral ownership
manager. Before adding a resource:

- compare it with the table in [hardware resources](hardware.md);
- reject incompatible concurrent use when practical;
- release DMA channels and PIO state machines on stop/error paths;
- restore pins to a safe input state when an output feature stops;
- document fixed pins and conflicts;
- ensure an input is 3.3 V-safe and analog inputs remain within their range.

PIO0 state machine 0 is currently used by the logic analyser and state machine
1 by the pattern generator. Captures and output also consume DMA channels.
The ADC engine is shared by DSO and MSO.

## Changing the wireless protocol

The 512-byte outer frame exists in both `src/platform/esp_spi_bridge.*` and
`esp_firmware/main/main.c`. The versioned inner capture payload is produced in
`src/system/transport.c`. When changing it:

1. Preserve explicit byte offsets and little-endian encoding; do not transmit a
   native C struct whose padding depends on a compiler.
2. Increment the inner version for incompatible changes.
3. Update validation on the ESP and receiver tooling.
4. Build both firmware projects.
5. Update [data formats](data-formats.md) with every changed field.
6. Test lost, duplicate, reordered, maximum-size, and malformed frames.

## Naming and public identity

Use `LibreLab` for user-facing prose and `librelab` for targets, paths, protocol
tokens, and identifiers. The current USB/SCPI identity is intentionally
documented and should be changed only as a coordinated compatibility decision.
Do not rename vendored upstream projects or their license notices.

## Style and static analysis

The RP2350 code is C11; the project also enables C++17 for Pico SDK compatibility.
Follow `src/.clang-format` and `src/.clang-tidy` for changed first-party source.
Useful local checks, when the tools are installed, are:

```bash
clang-format --dry-run --Werror path/to/changed.c path/to/changed.h
cmake --build build-pico2 --target librelab_pico
make -C tools/sigrok/librelab-pico test
```

Avoid formatting or mechanically rewriting vendored code under `lib/`.

## Generated and vendored files

- `build*` directories, ESP `sdkconfig`, binary outputs, and Python caches are
  generated and should not be hand-edited.
- `lib/` contains third-party source with its own licenses.
- `esp_firmware/dependencies.lock` records the resolved ESP component graph and
  should change only when dependencies are intentionally updated.

## Review checklist

- Both success and failure paths release hardware resources.
- Bounds account for bytes versus words and include transport overhead.
- SCPI setters reject changes that are unsafe while a feature is active.
- A query documents its exact field order and units.
- Binary formats state endianness, packing, and valid length.
- Trigger waits and bus waits have intentional timeout behavior.
- Default pins do not silently conflict, or the conflict is rejected/documented.
- `*RST`, disconnect, stop, and repeated initialization are safe.
- Root README, command reference, feature guide, and tests agree with source.
