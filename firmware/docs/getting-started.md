# Getting started

This guide builds the current RP2350A firmware, flashes a Pico 2, opens the USB
CDC interface, and performs a simple digital capture.

## 1. Install prerequisites

You need:

- Git
- CMake 3.13+
- Ninja or Make
- Python 3
- Arm GNU embedded toolchain
- Raspberry Pi Pico SDK 2.1+

On Debian/Ubuntu, the compiler and common build tools can be installed with:

```bash
sudo apt update
sudo apt install cmake ninja-build gcc-arm-none-eabi libnewlib-arm-none-eabi python3-pip
```

Obtain the Pico SDK with its submodules and export its path:

```bash
git clone --recurse-submodules https://github.com/raspberrypi/pico-sdk.git
export PICO_SDK_PATH="$PWD/pico-sdk"
```

## 2. Build the RP2350 image

From the firmware root:

```bash
cmake -S . -B build-pico2 -G Ninja -DPICO_BOARD=pico2
cmake --build build-pico2 --target librelab_pico
```

If `picotool` is not installed, Pico SDK may download and build it during the
first configure. See [building and flashing](building.md) for offline and custom
SDK setups.

## 3. Flash the board

For BOOTSEL flashing:

1. Disconnect the Pico.
2. Hold BOOTSEL while reconnecting USB.
3. Copy `build-pico2/librelab_pico.uf2` to the `RPI-RP2` drive.
4. Wait for the board to reboot.

With `picotool` and a board already in BOOTSEL mode:

```bash
picotool load -f build-pico2/librelab_pico.uf2
picotool reboot
```

## 4. Find the command port

Linux usually exposes the device as `/dev/ttyACM0`. Useful checks are:

```bash
ls -l /dev/ttyACM*
python3 -m serial.tools.list_ports -v
```

If `serial.tools` is unavailable:

```bash
python3 -m pip install pyserial
```

Open a raw terminal:

```bash
python3 -m serial.tools.miniterm /dev/ttyACM0 115200 --raw
```

Send `*IDN?` followed by Enter. The response should identify
`FOSSASIA,LibreLab Pico`.

## 5. Make a first logic capture

Connect a 3.3 V digital signal to GPIO16 and share ground with the signal
source. Never apply 5 V to an RP2350 GPIO.

Configure one channel and 256 samples:

```text
LA:CONF:PINB 16
LA:CONF:PINC 1
LA:CONF:SAMP 256
LA:CONF:DIV 150
LA:CONF:TRIG:MODE AUTO
LA:META?
LA:READ?
```

At a 150 MHz system clock, divider 150 gives approximately 1 MS/s. Always use
`LA:CONF:RATE?` to read the actual rate rather than assuming a system clock.

`LA:READ?` returns a SCPI definite-length binary block. A terminal will display
the header and binary payload poorly; production clients should parse the block
as described in [binary data formats](data-formats.md).

## 6. Exercise a text-only feature

The built-in square-wave generator is easier to inspect in a terminal:

```text
TEST:SQU:CONF 15,1000
TEST:SQU?
TEST:SQU:PIN?
TEST:SQU:FREQ?
TEST:SQU 0
```

The output is a 1 kHz, approximately 50% duty square wave on GPIO15 until it is
disabled.

## 7. Next steps

- Review [hardware resources](hardware.md) before wiring multiple features.
- Use the [complete command reference](scpi-reference.md) for automation.
- Follow [Wi-Fi bridge](features/wifi-bridge.md) to add an ESP32-C3.
- Follow the feature-specific guides for limits, data layouts, and examples.
