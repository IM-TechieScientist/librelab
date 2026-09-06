# Binary and transport data formats

All multi-byte integer fields defined by LibreLab are little-endian. SCPI block
lengths and USB stream headers are ASCII. No capture format currently carries
voltage calibration or timestamps per sample.

## SCPI definite-length arbitrary blocks

Binary command arguments and finite-capture responses use the SCPI form:

```text
#<number-of-length-digits><decimal-payload-length><payload>
```

For a three-byte payload, the encoded bytes begin `#13`. For 1,024 bytes they
begin `#41024`. Read the length header first and then read exactly the declared
payload length; the payload may contain any byte, including newline.

```python
def encode_block(payload: bytes) -> bytes:
    length = str(len(payload)).encode("ascii")
    return b"#" + str(len(length)).encode("ascii") + length + payload

def read_exact(port, length: int) -> bytes:
    out = bytearray()
    while len(out) < length:
        chunk = port.read(length - len(out))
        if not chunk:
            raise TimeoutError("short SCPI block")
        out.extend(chunk)
    return bytes(out)

def read_block(port) -> bytes:
    if read_exact(port, 1) != b"#":
        raise ValueError("not a definite-length block")
    digits = int(read_exact(port, 1))
    length = int(read_exact(port, digits))
    return read_exact(port, length)
```

## Logic-analyser samples

Logic-analyser and MSO digital data is an array of little-endian `uint32_t`
words. Samples are packed consecutively, least-significant group first:

```text
bits_per_word    = 32 - (32 % pin_count)
samples_per_word = bits_per_word / pin_count
word_index       = sample_index / samples_per_word
group_index      = sample_index % samples_per_word
sample_mask      = (1 << pin_count) - 1
sample           = (word[word_index] >> (group_index * pin_count)) & sample_mask
channel_n        = (sample >> n) & 1
GPIO             = pin_base + n
```

Pin count is restricted to 1–8. When it does not divide 32, the unused most
significant bits of each word are padding; for example, three channels carry ten
samples in bits 0–29. Unused groups in the last word should also be ignored using
the configured sample count. `LA:METadata?` reports the sample count, word count,
and bits per word needed to decode a finite capture.

## Pattern-generator samples

`PG:DATA` uses the same group arrangement as the logic analyser: an arbitrary
block containing little-endian `uint32_t` words, with earliest samples in the
least-significant bits. For `pin_count` outputs, each group is one simultaneous
sample and bit `n` drives `pin_base + n`. The top `32 % pin_count` bits of each
word are padding.

The application buffer holds 16,384 words (64 KiB), but the shared 1,024-byte
SCPI input buffer makes a single command substantially smaller than that. The
current protocol has no chunked upload or append command.

## Analog samples

DSO and MSO analog captures are contiguous little-endian `uint16_t` values.
Each value contains an unscaled RP2350 12-bit ADC result in bits 11:0. Bits
15:12 are not measurement data. Convert raw codes to voltage using the actual
analog reference and any external front-end gain/offset; the firmware does not
currently transmit calibration coefficients.

```python
import struct

samples = struct.unpack("<" + "H" * (len(payload) // 2), payload)
samples = tuple(value & 0x0FFF for value in samples)
```

## USB continuous-stream frames

LA and DSO streaming writes an ASCII line, a SCPI arbitrary block, and one
trailing newline:

```text
LA:STREAM:FRAME <sequence> <payload_length>\n
#<digits><length><payload>\n
```

or:

```text
DSO:STREAM:FRAME <sequence> <payload_length>\n
#<digits><length><payload>\n
```

`sequence` is an unsigned frame counter. The length in the ASCII line and the
block length should agree. Stream output is unsolicited, so stop streaming
before sending commands from a simple request/response client.

## Pico-to-ESP SPI frame

The bridge exchanges a fixed 512-byte frame over SPI. The outer header is 12
bytes and the payload area is 500 bytes.

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 1 | Magic `0xA5` |
| 1 | 1 | Frame type: `0x00` poll, `0x02` capture data, `0x03` SCPI |
| 2 | 4 | Transport sequence, little-endian `uint32_t` |
| 6 | 2 | Valid outer payload length, little-endian `uint16_t`, maximum 500 |
| 8 | 1 | Sum of bytes 0–7 modulo 256 |
| 9 | 3 | Reserved, currently zero |
| 12 | 500 | Payload followed by zero padding |

SPI is mode 0 at 1 MHz. READY tells the Pico when the ESP slave has queued a
transaction. The ESP validates magic, type, length, and checksum before using a
frame.

SCPI frame payloads contain command or response bytes directly. Capture frame
payloads contain the inner format below. Poll frames have no payload and clock
an ESP-to-Pico SCPI command back to the Pico when one is queued.

## Wireless capture payload

Every 500-byte outer capture payload begins with a 32-byte inner header:

| Offset | Size | Field |
| ---: | ---: | --- |
| 0 | 4 | Magic bytes `LBLB` (`0x424C424C` interpreted little-endian) |
| 4 | 1 | Format version, currently `1` |
| 5 | 1 | Instrument ID |
| 6 | 1 | Subtype: `1` metadata, `2` data |
| 7 | 1 | Reserved, zero |
| 8 | 4 | Capture sequence, little-endian `uint32_t` |
| 12 | 2 | Zero-based chunk index |
| 14 | 2 | Chunk count |
| 16 | 2 | Valid bytes following the header |
| 18 | 14 | Reserved, zero |
| 32 | 468 | Metadata/data followed by zero padding |

Instrument IDs are:

| ID | Instrument |
| ---: | --- |
| 1 | Logic analyser |
| 2 | Oscilloscope |
| 3 | MSO digital side |
| 4 | MSO analog side |

Each capture begins with one metadata frame. Its chunk index and count are zero,
and its 24-byte body consists of six little-endian `uint32_t` values:

| Body offset | Field |
| ---: | --- |
| 0 | Sample rate in Hz |
| 4 | Sample count |
| 8 | Channel count |
| 12 | Digital pin base or ADC channel |
| 16 | Trigger mode: `0` auto/off, `1` edge, `2` level |
| 20 | Data format: `1` packed LA `uint32_t`, `2` analog `uint16_t` |

Data follows in subtype-2 chunks of at most 468 bytes. Reassemble frames with
the same instrument ID and capture sequence in ascending chunk-index order,
using only `payload_len` bytes from each. An MSO wireless acquisition uses the
same capture sequence for its instrument-3 and instrument-4 series.

The ESP forwards complete 512-byte outer frames by UDP and may batch two frames
into a single 1,024-byte datagram. A receiver must therefore split datagrams in
512-byte units, validate each outer frame, then decode the inner payload.

## Network messages

- TCP port 5006 carries raw newline-terminated SCPI commands and their raw SCPI
  responses. It does not add a length wrapper around ordinary text responses.
- UDP port 5005 carries the outer capture frames described above.
- Send the ASCII datagram `LIBRELAB_UDP_REGISTER` to UDP port 5006 to register
  the sender as the unicast capture destination. Before registration, the ESP
  uses its configured destination, which defaults to broadcast.

There is no authentication, encryption, retransmission, or ordering layer on
the SCPI TCP/capture UDP services. Use sequence/chunk fields to detect loss or
reordering and operate the bridge only on a trusted network.
