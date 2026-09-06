# LibreLab Pico firmware

Firmware for the RP2350-based LibreLab Pico instrument, plus companion firmware
for an ESP32-C3 Wi-Fi bridge. The current build targets Pico 2/RP2350A; a future
LibreLab PCB is planned around the 48-GPIO RP2350B. The RP2350 exposes a SCPI
interface over USB CDC and implements digital capture, analog capture,
mixed-signal acquisition, pattern generation, peripheral-bus gateways, test
outputs, and optional wireless transport.

Features and limits below describe the current build.

## What is included

| Area | Capability | Current state |
| --- | --- | --- |
| Control | SCPI 1999 command parser over USB CDC | Built and usable |
| Logic analyser | 1–8 consecutive GPIO channels, PIO/DMA capture, triggers, finite capture, streaming | Built and usable |
| Oscilloscope | One RP2350 ADC channel, DMA capture, level/edge trigger, finite capture, streaming | Built and usable |
| Mixed-signal | Synchronized digital and analog one-shot capture | Built and usable |
| Pattern generator | 1–8 consecutive GPIO outputs, packed patterns, one-shot/loop modes | Built and usable |
| Bus gateway | UART1 and I2C0/I2C1 access through SCPI | Built; observe pin conflicts |
| Bus gateway | SPI1 access through SCPI | Compiled, but blocked by a known logical bus-number mismatch |
| Test outputs | Digital square wave and PWM-based “analog” waveform | Built and usable |
| Wireless | ESP32-C3 SPI bridge, TCP SCPI, UDP captures, SoftAP provisioning, mDNS | Built and usable with two-board wiring |
| ADC abstraction | ADC frontend registry with RP2350 internal ADC backend | Built and used by DSO/MSO |
| Host integration | Out-of-tree libsigrok/PulseView driver | Source included; integration into libsigrok is manual |

## Quick start

### Requirements

- Raspberry Pi Pico SDK 2.1 or newer
- CMake 3.13 or newer
- Ninja or Make
- Arm GNU toolchain (`arm-none-eabi-gcc`)
- A Pico 2/RP2350A board for the current target

Set `PICO_SDK_PATH` to the SDK checkout, then configure and build:

```bash
export PICO_SDK_PATH=/path/to/pico-sdk
cmake -S . -B build-pico2 -DPICO_BOARD=pico2
cmake --build build-pico2 --target librelab_pico -j
```

The useful outputs are normally:

```text
build-pico2/librelab_pico.elf
build-pico2/librelab_pico.bin
build-pico2/librelab_pico.hex
build-pico2/librelab_pico.uf2
```

Hold BOOTSEL while connecting the Pico, then copy the UF2 file to the mounted
`RPI-RP2` volume. Alternatively, use a debug probe or `picotool`.

After reboot, find the CDC port and query the device:

```bash
python3 -m serial.tools.miniterm /dev/ttyACM0 115200 --raw
```

Then send:

```text
*IDN?
```

Expected identification:

```text
FOSSASIA,LibreLab Pico,1.0,v0.1.0
```

The baud value is conventional for terminal software; USB CDC does not use it
to clock the physical USB connection.

## Feature examples

SCPI keywords are case-insensitive. Uppercase letters in the reference indicate
the required short form; lowercase letters are optional. Terminate commands
with `\n` or `\r\n`.

Logic analyser one-shot capture:

```text
LA:CONF:PINB 16
LA:CONF:PINC 2
LA:CONF:SAMP 1024
LA:CONF:TRIG:MODE AUTO
LA:READ?
```

Oscilloscope capture on ADC0/GPIO26:

```text
DSO:CONF:CHAN 0
DSO:CONF:RATE 100000
DSO:CONF:SAMP 1024
DSO:CONF:TRIG:MODE OFF
DSO:READ?
```

I2C two-byte read:

```text
BUS:I2C:CONF:BUS 1
BUS:I2C:CONF:ADDR 60
BUS:I2C:OPEN
BUS:I2C:READ? 2
```

Binary arguments and responses use SCPI definite-length arbitrary blocks. See
[SCPI command reference](docs/scpi-reference.md) and
[binary data formats](docs/data-formats.md) before writing a host client.

## Hardware resources at a glance

This is the current Pico 2/RP2350A mapping, not the planned RP2350B mapping.

| Function | Default RP2350 resources |
| --- | --- |
| Logging | UART0 TX GPIO0, RX GPIO1, 115200 8N1 |
| Wi-Fi bridge | SPI0 GPIO2–5, READY GPIO6 |
| UART gateway | UART1 TX GPIO4, RX GPIO5 |
| I2C gateway | I2C0 GPIO0/1 or I2C1 GPIO6/7 |
| SPI gateway | SPI1 SCK GPIO10, MOSI GPIO11, MISO GPIO12, CS GPIO13 |
| Square test output | GPIO15, 1 kHz, 50% duty |
| PWM “analog” test output | GPIO13, 1 kHz, 50% duty |
| Logic analyser | GPIO16 onward; 2 channels by default |
| Pattern generator | GPIO16 onward; 1 channel by default |
| Mixed-signal digital | GPIO16 onward; 1 channel by default |
| Internal ADC | ADC0–ADC3 on GPIO26–GPIO29 |

These defaults overlap. In particular, UART1 overlaps the Wi-Fi bridge, I2C0
overlaps the logging UART, I2C1 overlaps the Wi-Fi READY pin, GPIO13 is shared by
the default SPI chip-select and PWM test output, and the default LA/MSO/pattern
generator all begin at GPIO16. There is no central pin-ownership manager yet.
Read [hardware resources](docs/hardware.md) before enabling features together.

RP2350B provides 48 rather than 30 GPIOs, so a new PCB can assign all of these
functions to different pads. That makes the present pad conflicts avoidable,
but it is not a drop-in firmware change: RP2350B analog inputs are GPIO40–47,
PIO access to GPIO32–47 uses the GPIO16–47 window, and this source currently
contains A-specific pin limits and mappings. See the verified
[RP2350B PCB and firmware migration plan](docs/rp2350b-migration.md).

## Documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/getting-started.md)
- [Building and flashing](docs/building.md)
- [Hardware resources and wiring](docs/hardware.md)
- [RP2350B PCB and firmware migration](docs/rp2350b-migration.md)
- [Firmware architecture](docs/architecture.md)
- [Complete SCPI command reference](docs/scpi-reference.md)
- [Binary and transport data formats](docs/data-formats.md)
- [Testing](docs/testing.md)
- [Development guide](docs/development.md)
- [Troubleshooting](docs/troubleshooting.md)

Feature guides:

- [Logic analyser](docs/features/logic-analyser.md)
- [Oscilloscope](docs/features/oscilloscope.md)
- [Mixed-signal capture](docs/features/mixed-signal.md)
- [Digital pattern generator](docs/features/pattern-generator.md)
- [UART, I2C, and SPI gateways](docs/features/bus-gateways.md)
- [Test-signal outputs](docs/features/test-signals.md)
- [Wi-Fi bridge](docs/features/wifi-bridge.md)
- [Internal ADC frontend](docs/features/adc-frontends.md)

## Repository layout

```text
src/application/        SCPI parser integration and feature command adapters
src/system/             Hardware-independent instruments, buses, transport, logging setup
src/platform/           RP2350/Pico SDK drivers
src/util/               Circular buffer, error, and logging utilities
esp_firmware/           ESP-IDF project for the ESP32-C3 bridge
tools/sigrok/           Out-of-tree libsigrok driver
lib/                    Vendored firmware dependencies
docs/                   User, protocol, architecture, and developer documentation
```

The runtime starts in `src/application/main.c`, initializes system services,
initializes the SCPI protocol, then repeatedly services USB, Wi-Fi command
polling, instrument streams, the pattern generator, and buffered logs.

## Known limitations

- The SPI SCPI gateway uses external bus number `1`, while its system layer
  currently exposes one logical bus numbered `0`; `BUS:SPI:OPEN` therefore
  fails until those conventions are aligned.
- Non-automatic finite LA triggers and triggered finite DSO captures can wait
  indefinitely if the trigger never arrives. MSO uses a one-second timeout;
  streaming DSO uses a 10 ms trigger timeout per frame.
- LA and DSO streaming are mutually exclusive. MSO has no streaming mode.
- The 1024-byte SCPI input buffer limits the effective size of a single
  `PG:DATA` upload even though the pattern buffer itself is 64 KiB.
- Wi-Fi command polling is disabled in the default USB transport mode. Select
  `COMM:TRAN WIFI` or `COMM:TRAN AUTO` over USB before controlling a newly
  booted Pico only through Wi-Fi.

## License

LibreLab firmware sources are licensed under Apache-2.0. Vendored components
retain their own licenses; see [LICENSE.md](LICENSE.md) and the license files in
`lib/`.
