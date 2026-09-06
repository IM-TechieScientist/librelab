# Firmware architecture

## System overview

LibreLab is split across one required MCU and one optional bridge MCU:

```text
                         USB CDC
Host <------------------------------------------------> RP2350
  ^                                                       |
  | TCP SCPI + UDP captures                               | SPI0 + READY
  +------------------------ ESP32-C3 <--------------------+
```

The RP2350 owns instrument state, capture/generation hardware, SCPI parsing, and
binary formatting. The ESP32-C3 is a transport bridge; it does not interpret
instrument commands or samples.

The current platform implementation is specialized for Pico 2/RP2350A. The
future RP2350B PCB needs a package-aware board configuration and pin map; see
[RP2350B migration](rp2350b-migration.md).

## RP2350 layers

```text
Application
  SCPI command tree, parser callbacks, feature adapters
        |
System
  Instruments, bus handles, transport policy, initialization, logging/syscalls
        |
Platform
  Pico SDK, PIO, DMA, ADC, UART, I2C, SPI, PWM, TinyUSB, GPIO
        |
RP2350 hardware
```

### Application layer

`src/application/protocol/common.c` owns the SCPI context, command table, input
buffers, output routing, and stream dispatch. Feature protocol files parse SCPI
parameters and translate failures into SCPI errors. Command-adapter files retain
application state where appropriate and call the system layer.

### System layer

The system layer defines hardware-independent handles and instrument behavior:

- `system/logic_analyser.*` — packed digital capture model.
- `system/instrument/dso.*` — one-channel analog acquisition and triggering.
- `system/instrument/mixed_signal.*` — coordinated PIO + ADC capture.
- `system/pattern_generator.*` — output lifecycle and modes.
- `system/instrument/adc_frontend.*` — selectable ADC backend registry.
- `system/bus/*` — handle ownership for UART/I2C/SPI.
- `system/transport.*` — USB/Wi-Fi policy and wireless capture framing.
- `system/system.*` — startup, reset, logging UART, and exception handling.

### Platform layer

Only platform modules should call Pico SDK hardware APIs. They implement
TinyUSB CDC, PIO state machines, DMA setup, internal ADC capture, UART IRQs,
I2C/SPI controllers, the Pico-to-ESP link, PWM outputs, clocks, watchdog reset,
and the status LED.

### Utility layer

`src/util` contains the circular buffer, logging queue, SI-prefix constants,
and the CException-based error model.

## Startup sequence

```text
main
  -> SYSTEM_init
       -> LOG_init
       -> PLATFORM_init
            -> register internal ADC frontend
       -> initialize UART0 logging and newlib syscalls
       -> status LED
       -> test-signal state
       -> TinyUSB CDC
       -> transport defaults (USB)
  -> protocol_init
       -> SCPI parser/context and command table
  -> forever
       -> protocol_task
       -> drain buffered logs
```

`protocol_task()` is cooperative, not an RTOS task. It services the pattern
generator, TinyUSB, up to 64 bytes of USB input, up to 256 bytes of wireless
input, then advances LA and DSO streams.

## Command flow

```text
USB CDC bytes or ESP SPI SCPI frame
  -> SCPI_Input
  -> command callback
  -> application adapter
  -> system instrument/bus
  -> platform driver
  -> response callback
  -> originating USB or Wi-Fi path
```

The active response destination is selected per command source. USB remains the
default after a wireless command finishes.

## Capture flow

### Logic analyser

PIO0 SM0 samples consecutive GPIO bits. RX FIFO requests drive a DMA channel
into a packed `uint32_t` buffer. The application supports finite capture and a
double-buffered stream.

### Oscilloscope

The ADC frontend selects the internal backend. ADC FIFO requests drive DMA into
a `uint16_t` buffer. Trigger detection is performed with single ADC reads before
the DMA acquisition begins.

### Mixed-signal

The ADC and logical analyser are configured and armed first. The logic trigger
is awaited, then ADC and PIO capture are started in sequence. Reported start
offsets are currently zero placeholders rather than measured skew.

### Pattern generation

PIO0 SM1 shifts packed samples to consecutive GPIO pins. A data DMA channel
feeds the TX FIFO; loop mode uses a control DMA channel to restart the transfer.

## Transport architecture

USB responses and finite captures use normal SCPI text or arbitrary blocks.
USB streams add a textual frame header before each arbitrary block. Wireless
captures are wrapped in an inner LibreLab capture frame, then a fixed 512-byte
Pico/ESP bridge frame. See [binary data formats](data-formats.md).

Transport policy is:

- `USB`: no Pico polling of the ESP command path; capture streams use USB.
- `WIFI`: initialize/use the ESP path and route capture streams through it.
- `AUTO`: use Wi-Fi when READY is asserted, otherwise USB.

## Errors and logging

SCPI errors and firmware logs are separate:

- Parse/command failures enter a 16-entry SCPI error queue read with
  `SYST:ERR?`.
- Internal logs enter a circular buffer and are drained to stdout/stderr.
- Newlib stdout/stderr is routed through UART0 at 115200 baud.
- An uncaught CException logs a fatal message, flushes logs with a bounded
  timeout, and resets through the watchdog.

## State and reset behavior

`*RST` resets LA, DSO, MSO, and pattern-generator state. It does not erase ESP
NVS, alter build-time pin mapping, or reboot either MCU. Bus gateway handles are
not explicitly reset by the SCPI reset callback in the current implementation.

## Concurrency and ownership constraints

- The RP2350 main loop is cooperative; long blocking captures delay other SCPI
  and log processing.
- Finite triggered LA/DSO operations may wait indefinitely.
- LA and DSO streams explicitly stop one another.
- MSO shares both LA and ADC resources but does not coordinate with an already
  active stream; clients should stop streams first.
- GPIO ownership is implicit. See [hardware resources](hardware.md).
- DMA channels are claimed dynamically, so initialization can fail when the
  pool is exhausted.

## Package boundary

RP2350A and RP2350B share the firmware layers and peripheral-controller model,
but the package is an explicit platform concern. Board-specific code must own:

- valid GPIO count and fixed peripheral pin routes;
- ADC channel count and channel-to-GPIO mapping;
- the PIO GPIO window shared by state machines on each PIO instance;
- LED, flash, ESP-link, gateway, and test-output assignments.

Those values are currently distributed as constants in platform, system, and
application modules. Consolidating them into a board profile is a prerequisite
for maintaining both A and B targets without silently applying A mappings to B.
