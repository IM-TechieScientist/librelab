# Digital pattern generator

The pattern generator uses PIO0 state machine 1 and DMA to output packed digital
samples on 1–8 consecutive GPIO pins.

The GPIO ranges below are current RP2350A firmware limits. RP2350B can use an
output bank above GPIO31 only after the range checks are changed and PIO0 is
configured for its GPIO16–47 window. That window is shared with the logic
analyser state machine; see [RP2350B migration](../rp2350b-migration.md).

## Defaults and limits

| Setting | Default | Range |
| --- | --- | --- |
| First GPIO | 16 | 0–29, group must end by GPIO29 |
| Output count | 1 | 1–8 |
| Sample rate | 2,000 samples/s | Requested 1–75,000,000; also constrained by PIO divider |
| Mode | `ONCE` | `ONCE` or `LOOP` |
| Pattern storage | Empty | Up to 16,384 `uint32_t` words / 64 KiB |

The PIO clock divider must remain in `[1, 65536]`. The lowest and highest
achievable rates therefore depend on `clk_sys`; a request inside the application
range can still be rejected by the platform.

## Commands

- `PG:CONFigure:PINS <first_gpio>,<count>` and query form
- `PG:CONFigure:RATE <samples_per_second>` and query form
- `PG:CONFigure:MODE <ONCE|LOOP>` and query form
- `PG:DATA <arbitrary_block>`
- `PG:STARt`, `PG:STOP`, `PG:STATus?`, `PG:UNDerrun?`

Pin, rate, mode, and pattern data cannot be changed while output is running.
`START` fails until a non-empty pattern has been uploaded.

## Packing

`PG:DATA` must contain a whole number of little-endian `uint32_t` words. A word
contains `floor(32 / pin_count)` samples. Within each word:

- sample zero occupies the least-significant `pin_count` bits;
- the bit at offset zero drives `pin_base`;
- successive samples occupy successive groups of `pin_count` bits;
- unused high bits are ignored when 32 is not divisible by the pin count.

The pattern-generator packing is the inverse of the LA unpacking convention.

## Effective upload-size limit

The pattern buffer accepts 64 KiB, but the current SCPI parser has a 1,024-byte
input buffer. A single `PG:DATA` command, including its header, must fit in that
buffer. There is no chunked append command yet, so the current host-visible
limit is roughly 1 KiB rather than the full backing buffer.

## Modes and status

`ONCE` stops after the last word. `LOOP` uses a control DMA channel to restart
the data DMA channel. `PG:STATus?` returns:

```text
running,rate_hz,pin_count,pattern_words
```

`PG:UNDerrun?` returns the observed PIO TX stall count while loop mode is active.

## Python upload example

```python
import struct
import serial

samples = [0, 1, 2, 3] * 8  # two output bits per sample
word = sum((value & 0x3) << (index * 2) for index, value in enumerate(samples[:16]))
payload = struct.pack("<II", word, word)
block = b"#" + str(len(str(len(payload)))).encode() + str(len(payload)).encode() + payload

with serial.Serial("/dev/ttyACM0", 115200, timeout=1) as port:
    port.write(b"PG:CONF:PINS 16,2\n")
    port.write(b"PG:CONF:RATE 10000\n")
    port.write(b"PG:CONF:MODE LOOP\n")
    port.write(b"PG:DATA " + block + b"\n")
    port.write(b"PG:START\n")
```

Stop the output before reconnecting those pins to an external driver or using
them as LA/MSO inputs.
