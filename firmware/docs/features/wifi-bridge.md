# ESP32-C3 Wi-Fi bridge

The optional ESP32-C3 companion turns the RP2350's local USB instrument into a
network instrument. The Pico remains responsible for SCPI parsing and all
measurement functions; the ESP provides Wi-Fi provisioning, TCP/UDP sockets,
mDNS, and a framed SPI link.

```text
SCPI client -- TCP 5006 -- ESP32-C3 == SPI == RP2350 -- instruments
UDP receiver <- UDP 5005 -/              \\-- USB CDC remains available
```

## Wiring

| Signal | RP2350 Pico GPIO | ESP32-C3 default GPIO | Direction relative to Pico |
| --- | ---: | ---: | --- |
| SCLK | 2 | 4 | output |
| MOSI / Pico TX | 3 | 5 | output |
| MISO / Pico RX | 4 | 6 | input |
| CS | 5 | 7 | output |
| READY | 6 | 10 | input |
| GND | GND | GND | common reference |

Both boards use 3.3 V logic. Connect grounds. Do not apply 5 V to signal pins.
The Pico link is SPI0, mode 0, 1 MHz. GPIO4/5 conflicts with the UART gateway,
and GPIO6 conflicts with I2C1.

## Build and flash the ESP

Use an ESP-IDF shell whose target supports the ESP32-C3:

```bash
cd esp_firmware
idf.py set-target esp32c3
idf.py menuconfig       # optional: LibreLab ESP SPI bridge
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

Build and flash the RP2350 image separately as described in
[building](../building.md). The bridge feature is compiled into the normal Pico
target; no Pico CMake switch is required.

## First-time provisioning

Credentials are stored in ESP NVS. With no usable saved network, or after ten
failed station attempts/approximately 15 seconds, the ESP starts a temporary
SoftAP named `LibreLab-Pico-XXXX`. The suffix is derived from the device identity.

1. Connect a phone or computer to that AP.
2. Use the default WPA2 password `librelab-pico`, unless changed in menuconfig.
3. Open `http://192.168.4.1`.
4. Enter the destination Wi-Fi SSID and password.
5. Allow the ESP to restart/connect, then watch its serial monitor for the IP.

The provisioning page is plain HTTP inside the password-protected setup AP.
Stored credentials persist in NVS. Use `idf.py erase-flash` only when you
intentionally want to remove them and all other ESP flash state.

## Enabling wireless operation on the Pico

The Pico boots in `USB` transport mode and does not poll the ESP in that mode.
Bootstrap each Pico boot over USB:

```text
COMM:TRAN AUTO
COMM:TRAN?
COMM:WIFI:STAT?
```

`AUTO` uses Wi-Fi when READY is asserted and otherwise emits stream data over
USB. `WIFI` forces the wireless path. Forced Wi-Fi reports the mode as effective
even if the companion is absent, so use the sent/dropped/timeout counters and
ESP logs when diagnosing the link.

## Network endpoints

| Endpoint | Default | Purpose |
| --- | --- | --- |
| TCP | ESP address, port 5006 | Raw SCPI request/response connection |
| UDP capture | destination port 5005 | Fixed 512-byte bridge frames, up to two per datagram |
| UDP registration | ESP address, port 5006 | Register receiver address with `LIBRELAB_UDP_REGISTER` |
| mDNS | `librelab-pico.local` | Hostname |
| DNS-SD | `_librelab._tcp` | TCP service advertisement |

One straightforward TCP session is:

```bash
printf '*IDN?\n' | nc librelab-pico.local 5006
```

For a wireless one-shot capture, keep the TCP connection open, register the UDP
receiver, then issue `LA:WIFI:READ?`, `DSO:WIFI:READ?`, or `MSO:WIFI:READ?`.
The SCPI response is the capture sequence; metadata and capture data arrive over
UDP. Ordinary `LA:READ?` and `DSO:READ?` return their binary blocks on the SCPI
connection instead.

Continuous `LA:STREAM:START` or `DSO:STREAM:START` uses UDP capture frames when
wireless is effective. See [data formats](../data-formats.md) for reassembly.

## ESP configuration options

Run `idf.py menuconfig` and open **LibreLab ESP SPI bridge**.

| Option | Default |
| --- | --- |
| Provisioning AP password | `librelab-pico` |
| Initial UDP destination | `255.255.255.255` |
| UDP capture destination port | 5005 |
| TCP SCPI / UDP registration port | 5006 |
| SCLK, MOSI, MISO, CS, READY GPIO | 4, 5, 6, 7, 10 |
| Serial statistics interval | 1,000 ms |

Changing ESP pins also requires wiring them to the fixed Pico pins, unless the
Pico platform source is changed and rebuilt.

## Runtime architecture

The ESP queues validated SPI frames between its SPI-slave task and network
tasks. Capture frames are sent by UDP. TCP input is wrapped as type-3 SCPI frames
and returned during a later full-duplex Pico SPI exchange; Pico responses travel
back as the same frame type. READY signals that the ESP has a transaction queued.

The Pico link uses fixed frames with magic, type, sequence, payload length, and
an 8-bit header checksum. Captures add a versioned inner header and separate
metadata/data chunks. This separation lets a receiver interpret a capture
without relying on the preceding SCPI conversation.

## Diagnostics and limitations

- `COMM:WIFI:STATus?` returns `effective,sent,dropped,timeouts` from the Pico.
- The ESP serial monitor periodically reports received frames, queued frames,
  validation failures, queue drops, SCPI frames, and the last sequence.
- `esp_firmware/bridge_receiver.py` is a low-level link diagnostic. Its payload
  check expects deterministic synthetic pattern traffic; it is not a complete
  decoder for the current `LBLB` capture format.
- UDP can lose, duplicate, or reorder frames. Detect this with outer sequence
  numbers and inner capture/chunk fields.
- TCP SCPI and UDP capture traffic have no authentication or encryption. Do not
  expose ports 5005/5006 to an untrusted network or the public Internet.
- Only one pending Pico-side SCPI payload is buffered, with a maximum of 500
  bytes per bridge frame. Keep commands concise and serialize client access.
