# Troubleshooting

## CMake cannot find the Pico SDK

Set `PICO_SDK_PATH` to a complete Pico SDK checkout before the first configure,
or pass `-DPICO_SDK_PATH=/path/to/pico-sdk`. If a build directory cached the
wrong path or board, configure a new build directory.

```bash
cmake -S . -B build-pico2 -G Ninja \
  -DPICO_BOARD=pico2 \
  -DPICO_SDK_PATH=/path/to/pico-sdk
```

Use Pico SDK 2.1 or newer for the current RP2350A/Pico 2 target and ensure SDK
submodules are initialized.

## The UF2 or expected artifact is missing

Build the explicit target and inspect the top of the build directory:

```bash
cmake --build build-pico2 --target librelab_pico
find build-pico2 -maxdepth 1 -name 'librelab_pico.*' -print
```

The active target is `librelab_pico`, not the older artifact name used by the
existing workflow.

## No USB serial device appears

- Confirm that the flashed image is `librelab_pico.uf2` for Pico 2/RP2350A.
- Try a known data-capable USB cable and another port.
- On Linux, inspect `dmesg` and `/dev/ttyACM*`; add your user to the distribution's
  serial-device group if access is denied.
- Close other terminal, IDE, ModemManager, or sigrok sessions that hold the CDC
  port.
- The USB descriptor uses VID `0xCAFE`, PID `0x4010`, product `LibreLab Pico`,
  and interface name `SCPI CDC`.

## The device does not answer a command

Send a newline-terminated command. USB CDC ignores the terminal baud setting,
but raw mode avoids unwanted local echo and line conversion.

```bash
python3 -m serial.tools.miniterm /dev/ttyACM0 115200 --raw
```

Try `*IDN?`, then `*CLS` and `SYST:ERR?`. If a triggered LA or finite DSO command
was sent without a reachable trigger, the synchronous command handler may be
waiting indefinitely; provide the trigger or reset the board.

## Binary output looks like garbage

`LA:READ?`, `DSO:READ?`, MSO fetches, and bus reads return SCPI arbitrary blocks,
not printable text. Read the `#` header and exact payload length in a binary-safe
program. Do not use `readline()` for the payload because sample bytes can contain
LF. See [data formats](data-formats.md).

## Capture length or pattern upload is rejected

- LA finite captures allow 1–65,536 samples; LA streaming allows at most 4,096.
- DSO and MSO allow 1–4,096 samples.
- Gateway transfers allow at most 512 bytes.
- Although the pattern buffer holds 64 KiB, `PG:DATA` shares a 1,024-byte SCPI
  input buffer. There is currently no chunked pattern-upload command.

Read `SYST:ERR?` immediately after the rejected command to distinguish an
illegal parameter from an execution failure.

## A signal or peripheral stops when another feature starts

Check [hardware resources](hardware.md). Several defaults overlap and the
firmware has no central pin arbiter. Common collisions are:

- UART1 and the Wi-Fi bridge on GPIO4/5;
- I2C0 and log UART0 on GPIO0/1;
- I2C1 and Wi-Fi READY on GPIO6;
- SPI CS and PWM test output on GPIO13;
- LA, MSO digital, and pattern output beginning at GPIO16;
- PWM outputs that use the same PWM slice even when their GPIO numbers differ.

Stop one feature and move configurable capture/test pins before enabling the
other. Gateway and Wi-Fi pins are fixed in the current Pico build.

## SPI gateway OPEN always fails

This is a known firmware integration defect. The SCPI layer permits bus `1`,
while the system layer exposes logical bus `0` mapped to hardware SPI1. The
commands are compiled but the gateway cannot currently be opened. This is not a
wiring or client syntax problem.

## I2C devices are absent from SCAN

- Confirm the correct bus/pins: bus 0 is GPIO0/1, bus 1 is GPIO6/7.
- Make sure both devices share ground and use 3.3 V-compatible levels.
- Internal pull-ups are enabled but may be too weak for the bus capacitance;
  use suitable external pull-ups when required.
- Lower the configured rate and verify the target uses a non-reserved 7-bit
  address between `0x08` and `0x77`.
- Disconnect UART logging from GPIO0/1 when using I2C0, and disconnect ESP READY
  from GPIO6 when using I2C1.

## ESP provisioning AP does not appear

Watch the ESP serial monitor. It first tries saved credentials up to ten times
and waits roughly 15 seconds before entering provisioning. If stale credentials
must be removed, `idf.py erase-flash` followed by a reflash is effective but
destructive to all ESP flash state.

The default AP is `LibreLab-Pico-XXXX`, password `librelab-pico`, and setup page
`http://192.168.4.1`. Menuconfig can change the password.

## TCP SCPI does not reach the Pico

1. Verify the ESP joined Wi-Fi and port 5006 is reachable by IP; mDNS may not
   cross VLANs, so try the numeric address instead of `librelab-pico.local`.
2. Verify shared ground and all five SPI/READY wires.
3. After every Pico reboot, send `COMM:TRAN AUTO` or `COMM:TRAN WIFI` over USB.
   The default `USB` mode does not poll wireless commands.
4. Check `COMM:WIFI:STAT?` counters over USB and the ESP's periodic serial
   statistics.
5. Avoid simultaneous TCP clients; commands share a small queued bridge path.

## UDP captures do not arrive or are incomplete

- Bind a receiver to UDP 5005 and send `LIBRELAB_UDP_REGISTER` to the ESP's UDP
  port 5006 so it learns the receiver address.
- Permit UDP 5005/5006 in the host firewall and keep both endpoints on a network
  that allows the traffic.
- Split datagrams into 512-byte frames; a datagram may contain two frames.
- Validate outer sequence/checksum and inner capture/chunk fields. UDP provides
  no retransmission, so missing chunks make that capture incomplete.
- The bundled `bridge_receiver.py` expects synthetic diagnostic patterns and is
  not a complete current capture decoder.

## Logs interfere with I2C0 or appear missing

Firmware diagnostics use UART0 GPIO0 TX/GPIO1 RX at 115200 8N1, not USB CDC.
Using I2C0 reconfigures the same pins. Choose I2C1 only when its GPIO6 conflict
with the Wi-Fi bridge is also acceptable, or disable/move one subsystem in code.

## The analog test output is not an analog waveform

`TEST:ANALog` is PWM on GPIO13. It is not a DAC and its raw output switches
between logic levels. Add an appropriate low-pass filter if a smoothed voltage
is required, and account for load impedance and ripple.
