# UART, I2C, and SPI gateways

The gateway commands let a USB or Wi-Fi host use RP2350 peripheral controllers
as binary-safe SCPI buses. Transfers use SCPI arbitrary blocks and are limited
to 512 bytes.

## UART gateway

The gateway exposes UART1 on GPIO4 TX and GPIO5 RX in fixed 8N1 format. UART0 is
reserved for logs.

| Setting | Default | Range |
| --- | --- | --- |
| Bus | 1 | Only 1 |
| Baud | 115,200 | 1,200–3,000,000 |
| Read/flush timeout | 100 ms | 0–60,000 ms; zero disables transact wait timeout |
| Buffers | 512 bytes RX + 512 bytes TX | Fixed |

Set bus and baud only while closed. The timeout may be changed while open.
`TRANsact?` clears RX, writes and flushes, then reads until 512 bytes, 5 ms of RX
inactivity, or the configured timeout.

```text
BUS:UART:CONF:BUS 1
BUS:UART:CONF:BAUD 115200
BUS:UART:CONF:TIME 250
BUS:UART:OPEN
BUS:UART:WRIT #15hello
BUS:UART:READ? 64
BUS:UART:CLOSE
```

GPIO4/5 conflicts with the default ESP bridge connection.

## I2C gateway

The gateway is a 7-bit I2C master. Internal pull-ups are enabled.

| Setting | Default | Range |
| --- | --- | --- |
| Bus | 0 | 0 or 1 |
| Pins | Bus 0: GPIO0/1; bus 1: GPIO6/7 | Fixed by bus |
| Address | `0x3C` | `0x08`–`0x77` |
| Rate | 100 kHz | 1 kHz–1 MHz |
| Timeout | 100 ms | 1–60,000 ms |

Set bus and rate only while closed. Address and timeout may be changed while
open. `SCAN?` probes non-reserved addresses and returns uppercase two-digit hex
addresses separated by commas. `TRANsact?` performs a no-stop write followed by
a repeated-start read.

```text
BUS:I2C:CONF:BUS 1
BUS:I2C:CONF:RATE 400000
BUS:I2C:CONF:ADDR 60
BUS:I2C:OPEN
BUS:I2C:SCAN?
BUS:I2C:READ? 16
BUS:I2C:CLOSE
```

I2C0 conflicts with logging UART0. I2C1 conflicts with the ESP READY pin.

## SPI gateway

The intended hardware backend is SPI1, mode 0, MSB-first, active-low CS:

| Signal | GPIO |
| --- | --- |
| SCK | 10 |
| MOSI/TX | 11 |
| MISO/RX | 12 |
| CS | 13 |

The intended configurable rate is 1 kHz–50 MHz, mode 0–3, and dummy byte
0–255. Write, read, full-duplex exchange, and write-then-read transaction
operations are implemented.

### Current integration defect

The SCPI gateway defaults to and only accepts bus number `1`, while the system
SPI layer exposes one logical bus numbered `0` and maps it to hardware SPI1.
Consequently `BUS:SPI:OPEN` currently returns an execution error. The command
set is compiled but should be considered unavailable until the two numbering
conventions are aligned.

GPIO13 also conflicts with the default PWM “analog” test output.

## Arbitrary-block example

A definite-length block is `#<digit-count><payload-length><payload>`. For three
bytes `0x9F 0x00 0x01`, send the bytes:

```text
#13\x9f\x00\x01
```

The `\xNN` notation above describes bytes; do not send the four literal ASCII
characters. A Python transaction looks like:

```python
def block(payload: bytes) -> bytes:
    length = str(len(payload)).encode()
    return b"#" + str(len(length)).encode() + length + payload

port.write(b"BUS:I2C:TRAN? " + block(b"\x00") + b",2\n")
```

All binary query results are returned as definite-length blocks.
